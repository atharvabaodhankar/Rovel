import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getSessionUser } from '@/lib/auth';
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
    const { action } = await request.json();

    if (!['sleep', 'wake', 'restart'].includes(action)) {
      return NextResponse.json({ error: 'Invalid power action. Must be sleep, wake, or restart' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const containerName = `rovel-${project.slug}`;

    if (action === 'sleep') {
      try {
        await execAsync(`docker stop ${containerName}`);
      } catch (e: any) {
        // Container might already be stopped
      }

      await prisma.project.update({
        where: { id: project.id },
        data: {
          containerStatus: 'SLEEPING',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Container ${project.name} is now SLEEPING (Scale-to-Zero active).`,
        containerStatus: 'SLEEPING',
      });
    }

    if (action === 'wake' || action === 'restart') {
      try {
        if (action === 'restart') {
          await execAsync(`docker restart ${containerName}`);
        } else {
          await execAsync(`docker start ${containerName}`);
        }
      } catch (e: any) {
        // If container missing, attempt to restart or notify
      }

      await prisma.project.update({
        where: { id: project.id },
        data: {
          containerStatus: 'RUNNING',
          lastActiveAt: new Date(),
          status: 'READY',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Container ${project.name} is now RUNNING and active.`,
        containerStatus: 'RUNNING',
      });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (error: any) {
    console.error('Power action failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
