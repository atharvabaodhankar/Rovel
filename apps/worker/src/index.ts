import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from root .env or .env.production
const envPath = fs.existsSync(path.resolve(process.cwd(), '../../.env.production'))
  ? path.resolve(process.cwd(), '../../.env.production')
  : path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: envPath });

import { Worker, Job } from 'bullmq';
import { buildAndDeploy } from './builder.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const queueName = 'deployments';

console.log('----------------------------------------------------');
console.log('Rovel Deployment Worker Initializing...');
console.log(`Connecting to Redis at: ${REDIS_URL}`);
console.log(`Listening on Queue: '${queueName}'`);
console.log('----------------------------------------------------');

// Parse Redis URL for BullMQ connection options
const parseRedisUrl = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    return {
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port, 10) : 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
    };
  } catch (e) {
    console.error('Failed to parse REDIS_URL, falling back to localhost options:', e);
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

const connectionOptions = parseRedisUrl(REDIS_URL);

// Define worker
const worker = new Worker(
  queueName,
  async (job: Job<{ deploymentId: string }>) => {
    const { deploymentId } = job.data;
    console.log(`[Job ${job.id}] Received deployment job for ID: ${deploymentId}`);
    
    try {
      await buildAndDeploy(deploymentId);
      console.log(`[Job ${job.id}] Finished build and deploy process.`);
    } catch (err: any) {
      console.error(`[Job ${job.id}] Build and deploy failed with error:`, err);
      throw err; // Fail the job in BullMQ
    }
  },
  {
    connection: connectionOptions,
    concurrency: 1, // Process 1 deployment at a time to avoid CPU overload
  }
);

worker.on('active', (job) => {
  console.log(`[Job ${job?.id}] Job is now active.`);
});

worker.on('completed', (job) => {
  console.log(`[Job ${job?.id}] Job completed successfully.`);
});

import { prisma } from '@rovel/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Scale-to-Zero (Auto-Sleeping) Daemon Sweeper
const runScaleToZeroSweeper = async () => {
  try {
    const now = new Date();
    const activeProjects = await prisma.project.findMany({
      where: {
        autoSleep: true,
        status: 'READY',
        containerStatus: 'RUNNING',
        containerId: { not: null },
      },
    });

    for (const project of activeProjects) {
      const idleLimitMs = (project.idleTimeoutMinutes || 15) * 60 * 1000;
      const lastActive = project.lastActiveAt ? new Date(project.lastActiveAt).getTime() : 0;
      const elapsedMs = now.getTime() - lastActive;

      if (elapsedMs >= idleLimitMs) {
        const containerName = `rovel-${project.slug}`;
        console.log(`[Scale-to-Zero] Project '${project.name}' is idle (${Math.round(elapsedMs / 60000)}m >= ${project.idleTimeoutMinutes}m). Suspending container: ${containerName}...`);
        
        try {
          await execAsync(`docker stop ${containerName}`);
          await prisma.project.update({
            where: { id: project.id },
            data: { containerStatus: 'SLEEPING' },
          });
          console.log(`[Scale-to-Zero] Container ${containerName} successfully put to SLEEP to save VPS RAM.`);
        } catch (e: any) {
          console.error(`[Scale-to-Zero] Failed to stop container ${containerName}:`, e.message);
        }
      }
    }
  } catch (err) {
    // Ignore sweeper loop errors to prevent worker crash
  }
};

// Run sweeper every 60 seconds
setInterval(runScaleToZeroSweeper, 60 * 1000);

console.log('Scale-to-Zero (Auto-Sleeping) reaper daemon initialized (60s check interval).');
console.log('Rovel background worker is running and waiting for jobs...');
