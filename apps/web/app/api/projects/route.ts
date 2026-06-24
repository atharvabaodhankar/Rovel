import { NextResponse } from 'next/server';
import { prisma } from '@codeship/db';
import { getSessionUser } from '@/lib/auth';
import { getDeploymentQueue } from '@/lib/queue';

// URL-friendly slug generator with uniqueness guarantee
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  let slug = baseSlug || 'app';
  let counter = 0;
  
  while (true) {
    const existing = await prisma.project.findUnique({
      where: { slug },
    });
    if (!existing) {
      return slug;
    }
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, githubRepo, framework } = body;

    if (!name || !githubRepo || !framework) {
      return NextResponse.json({ error: 'Missing required fields: name, githubRepo, framework' }, { status: 400 });
    }

    const slug = await generateUniqueSlug(name);

    // Create the project and the initial deployment in a single transaction
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        slug,
        githubRepo,
        framework,
        status: 'PENDING',
      },
    });

    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        status: 'PENDING',
        logs: 'Deployment initialized. Waiting in queue...\n',
      },
    });

    // Enqueue the build job in BullMQ
    await getDeploymentQueue().add('build', { deploymentId: deployment.id });

    return NextResponse.json({ project, deployment }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
