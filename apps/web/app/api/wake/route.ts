import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        containerStatus: true,
        assignedPort: true,
        status: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const hostPort = project.assignedPort;
    let isReachable = false;

    // Check if the container port is actively answering
    if (hostPort) {
      try {
        const checkRes = await fetch(`http://127.0.0.1:${hostPort}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(1200),
        });
        isReachable = checkRes.status < 500;
      } catch (e) {
        isReachable = false;
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        name: project.name,
        slug: project.slug,
        containerStatus: project.containerStatus,
        isReachable,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let slug = '';
    try {
      const body = await request.json();
      slug = body.slug;
    } catch (e) {
      const { searchParams } = new URL(request.url);
      slug = searchParams.get('slug') || '';
    }

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { slug },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const containerName = `rovel-${project.slug}`;

    try {
      console.log(`[Auto-Wake Gateway] Waking up sleeping container ${containerName}...`);
      await execAsync(`docker start ${containerName}`);
    } catch (e: any) {
      console.log(`[Auto-Wake Gateway] Docker start result for ${containerName}: ${e.message}`);
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
      message: `Container ${project.name} is waking up.`,
      status: 'RUNNING',
    });
  } catch (error: any) {
    console.error('Auto-wake failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
