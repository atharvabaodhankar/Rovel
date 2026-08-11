import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getSessionUser } from '@/lib/auth';
import { getDeploymentQueue } from '@/lib/queue';

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
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let branch = project.defaultBranch || 'main';
    let isProduction = true;

    try {
      const body = await request.json();
      if (body.branch && typeof body.branch === 'string' && body.branch.trim()) {
        branch = body.branch.trim();
        // If branch matches default branch, it's production. Otherwise preview.
        isProduction = body.isProduction !== undefined ? Boolean(body.isProduction) : (branch === (project.defaultBranch || 'main'));
      }
    } catch (e) {
      // Body may be empty on simple POST triggers
    }

    // Create new deployment record
    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        branch,
        isProduction,
        environment: isProduction ? 'production' : 'preview',
        status: 'PENDING',
        logs: `Deployment triggered manually for branch: ${branch} (${isProduction ? 'Production' : 'Preview'}). Waiting in queue...\n`,
      },
    });

    // Enqueue the build job in BullMQ
    await getDeploymentQueue().add('build', { deploymentId: deployment.id });

    return NextResponse.json({ deployment }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to trigger manual deployment:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
