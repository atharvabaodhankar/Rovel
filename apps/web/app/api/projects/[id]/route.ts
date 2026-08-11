import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getSessionUser } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: {
        deployments: {
          orderBy: { startedAt: 'desc' },
        },
        envVars: true, // We will return them, but in a real system we might mask or decrypt them
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Auto-reconcile legacy project if activeDeploymentId is missing
    if (!project.activeDeploymentId && project.deployments.length > 0) {
      const latestReady = project.deployments.find((d) => d.status === 'READY') || project.deployments[0];
      if (latestReady) {
        await prisma.project.update({
          where: { id: project.id },
          data: { activeDeploymentId: latestReady.id },
        });
        await prisma.deployment.update({
          where: { id: latestReady.id },
          data: { isProduction: true, environment: 'production' },
        });
        project.activeDeploymentId = latestReady.id;
        latestReady.isProduction = true;
        latestReady.environment = 'production';
      }
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, defaultBranch, autoSleep, idleTimeoutMinutes, rootDirectory } = body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(defaultBranch !== undefined && { defaultBranch: defaultBranch.trim() || 'main' }),
        ...(autoSleep !== undefined && { autoSleep: Boolean(autoSleep) }),
        ...(idleTimeoutMinutes !== undefined && { idleTimeoutMinutes: Math.max(1, parseInt(idleTimeoutMinutes, 10) || 15) }),
        ...(rootDirectory !== undefined && { rootDirectory: rootDirectory.trim() }),
      },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Attempt to stop and remove the Docker container if it exists
    const containerName = `rovel-${project.slug}`;
    try {
      console.log(`[Dashboard] Cleaning up container ${containerName} due to project deletion...`);
      await execAsync(`docker stop ${containerName} && docker rm ${containerName}`);
      console.log(`[Dashboard] Successfully removed container ${containerName}`);
    } catch (e) {
      // Ignore if container is not running or docker is unavailable
      console.log(`[Dashboard] Container cleanup skipped or failed (perhaps not running): ${(e as any).message}`);
    }

    // Delete project from database (cascades to deployments and envVars)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
