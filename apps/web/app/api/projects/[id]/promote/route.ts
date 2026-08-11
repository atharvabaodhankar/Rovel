import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getSessionUser } from '@/lib/auth';
import { getDeploymentQueue } from '@/lib/queue';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { deploymentId } = await request.json();

    if (!deploymentId) {
      return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: {
        deployments: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const targetDeployment = project.deployments.find((d) => d.id === deploymentId);
    if (!targetDeployment) {
      return NextResponse.json({ error: 'Target deployment not found' }, { status: 404 });
    }

    if (targetDeployment.status !== 'READY') {
      return NextResponse.json({ error: 'Cannot promote a failed or non-ready deployment' }, { status: 400 });
    }

    // 1. Unset any current production deployments for this project
    await prisma.deployment.updateMany({
      where: {
        projectId: project.id,
        isProduction: true,
      },
      data: {
        isProduction: false,
      },
    });

    // 2. Mark this target deployment as production
    await prisma.deployment.update({
      where: { id: targetDeployment.id },
      data: {
        isProduction: true,
        environment: 'production',
      },
    });

    // 3. Update project pointer
    await prisma.project.update({
      where: { id: project.id },
      data: {
        activeDeploymentId: targetDeployment.id,
        status: 'READY',
        containerStatus: 'RUNNING',
        lastActiveAt: new Date(),
      },
    });

    // 4. Try fast container switch if the image still exists locally
    const targetImageName = `rovel-${project.id.toLowerCase()}:${targetDeployment.id.toLowerCase()}`;
    const containerName = `rovel-${project.slug}`;
    let fastSwitched = false;

    try {
      // Check if image exists in docker
      const { stdout: imagesOutput } = await execAsync(`docker images -q ${targetImageName}`);
      if (imagesOutput.trim()) {
        console.log(`[Promote] Fast image swap for ${targetImageName}...`);
        try {
          await execAsync(`docker stop ${containerName}`);
        } catch (e) {}
        try {
          await execAsync(`docker rm ${containerName}`);
        } catch (e) {}

        const hostPort = project.assignedPort || 3001;
        await execAsync(`docker run -d --name ${containerName} --memory=512m --cpus=0.5 -p ${hostPort}:80 -e PORT=80 ${targetImageName}`);
        fastSwitched = true;
      }
    } catch (e) {
      console.log('[Promote] Fast switch unavailable, triggering redeployment build...');
    }

    // If fast switch wasn't possible (e.g. image was pruned), trigger a fresh build for this commit
    if (!fastSwitched) {
      const rollbackDeployment = await prisma.deployment.create({
        data: {
          projectId: project.id,
          commitHash: targetDeployment.commitHash,
          branch: targetDeployment.branch || project.defaultBranch || 'main',
          isProduction: true,
          environment: 'production',
          status: 'PENDING',
          logs: `Promoted deployment ${targetDeployment.id.slice(0, 8)} to production. Rebuilding container from commit ${targetDeployment.commitHash || 'latest'}...\n`,
        },
      });

      await getDeploymentQueue().add('build', { deploymentId: rollbackDeployment.id });

      return NextResponse.json({
        success: true,
        message: `Deployment promoted to production. Rebuild enqueued.`,
        deploymentId: rollbackDeployment.id,
        fastSwitched: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Deployment ${targetDeployment.id.slice(0, 8)} is now the active live Production build!`,
      deploymentId: targetDeployment.id,
      fastSwitched: true,
    });
  } catch (error: any) {
    console.error('Promotion error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
