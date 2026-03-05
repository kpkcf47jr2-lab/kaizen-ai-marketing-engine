import { Worker, Queue, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import http from 'node:http';
import { processContentJob } from './processors/content.processor.js';
import { processPublishJob } from './processors/publishing.processor.js';
import { processPaymentJob } from './processors/payment.processor.js';
import { startScheduler } from './scheduler.js';

if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  throw new Error('REDIS_URL is required in production');
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '8080', 10);
const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const connection = redis as unknown as ConnectionOptions;

console.log('🚀 Kaizen AI Worker starting...');
console.log(`   Redis: ${REDIS_URL}`);

// ── Content Generation Worker ──────────────────────────
const contentWorker = new Worker(
  'content-generation',
  async (job) => {
    console.log(`[content] Processing job ${job.id}: ${job.name}`);
    return processContentJob(job.data);
  },
  { connection, concurrency: 2 }
);

contentWorker.on('completed', (job) => console.log(`[content] ✅ Job ${job.id} completed`));
contentWorker.on('failed', (job, err) => console.error(`[content] ❌ Job ${job?.id} failed:`, err.message));

// ── Social Publishing Worker ───────────────────────────
const publishWorker = new Worker(
  'social-publishing',
  async (job) => {
    console.log(`[publish] Processing job ${job.id}: ${job.name}`);
    return processPublishJob(job.data);
  },
  { connection, concurrency: 3 }
);

publishWorker.on('completed', (job) => console.log(`[publish] ✅ Job ${job.id} completed`));
publishWorker.on('failed', (job, err) => console.error(`[publish] ❌ Job ${job?.id} failed:`, err.message));

// ── Payment Verification Worker ────────────────────────
const paymentWorker = new Worker(
  'payment-verification',
  async (job) => {
    console.log(`[payment] Processing job ${job.id}: ${job.name}`);
    return processPaymentJob(job.data);
  },
  { connection, concurrency: 1 }
);

paymentWorker.on('completed', (job) => console.log(`[payment] ✅ Job ${job.id} completed`));
paymentWorker.on('failed', (job, err) => console.error(`[payment] ❌ Job ${job?.id} failed:`, err.message));

// ── Cron Scheduler ─────────────────────────────────────
startScheduler(connection);

// ── Health Check HTTP Server ───────────────────────────
// Render and other PaaS use this to verify the worker is alive
const healthServer = http.createServer((_req, res) => {
  const isHealthy =
    contentWorker.isRunning() &&
    publishWorker.isRunning() &&
    paymentWorker.isRunning();

  res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: isHealthy ? 'ok' : 'degraded',
    workers: {
      content: contentWorker.isRunning(),
      publish: publishWorker.isRunning(),
      payment: paymentWorker.isRunning(),
    },
    uptime: process.uptime(),
  }));
});

healthServer.listen(HEALTH_PORT, () => {
  console.log(`🏥 Health check listening on :${HEALTH_PORT}/`);
});

// ── Graceful Shutdown ──────────────────────────────────
async function shutdown() {
  console.log('\n🛑 Shutting down workers...');
  healthServer.close();
  await Promise.all([
    contentWorker.close(),
    publishWorker.close(),
    paymentWorker.close(),
  ]);
  await redis.quit();
  console.log('👋 Worker shutdown complete');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('✅ All workers running. Waiting for jobs...');
