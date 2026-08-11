import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all user projects to reconcile any unassigned activeDeploymentId
    const userProjects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        deployments: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    for (const proj of userProjects) {
      if (!proj.activeDeploymentId && proj.deployments.length > 0) {
        const latestReady = proj.deployments.find((d) => d.status === 'READY') || proj.deployments[0];
        if (latestReady) {
          await prisma.project.update({
            where: { id: proj.id },
            data: { activeDeploymentId: latestReady.id },
          });
          await prisma.deployment.update({
            where: { id: latestReady.id },
            data: { isProduction: true, environment: 'production' },
          });
        }
      }
    }

    // Fetch recent deployments across all user projects
    const deployments = await prisma.deployment.findMany({
      where: {
        project: {
          userId: user.id,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            defaultBranch: true,
            activeDeploymentId: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({ success: true, deployments });
  } catch (error: any) {
    console.error('Failed to fetch global deployments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
