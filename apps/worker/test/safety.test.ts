import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/lib/prisma.js';
import {processContentJob} from '../src/processors/content.processor.js';
import {processPublishJob} from '../src/processors/publishing.processor.js';

// Exercise the real processors with isolated database operations. No DB, keys,
// network, publication or credit transfer is used in this test harness.
test('content processor rejects another owner before writes or providers',async()=>{
  const oldFind=prisma.contentJob.findUnique, oldUpdate=prisma.contentJob.update;
  let writes=0;
  prisma.contentJob.findUnique=(async()=>({id:'job-a',userId:'alice',status:'QUEUED'})) as any;
  prisma.contentJob.update=(async()=>{writes++;throw new Error('unexpected write');}) as any;
  try {await assert.rejects(processContentJob({contentJobId:'job-a',userId:'bob'}),/OWNER_MISMATCH/);assert.equal(writes,0);}
  finally {prisma.contentJob.findUnique=oldFind;prisma.contentJob.update=oldUpdate;}
});
test('native-only processor fails visibly before accessing external providers',async()=>{
  const oldFind=prisma.contentJob.findUnique, oldUpdate=prisma.contentJob.update,oldFetch=globalThis.fetch;
  const oldMode=process.env.KAME_ALLOW_EXTERNAL_MODELS;delete process.env.KAME_ALLOW_EXTERNAL_MODELS;
  const statuses:string[]=[];let network=0;
  globalThis.fetch=(async()=>{network++;throw new Error('network forbidden');}) as any;
  prisma.contentJob.findUnique=(async()=>({id:'job-a',userId:'alice',status:'QUEUED',videoTier:'PRO'})) as any;
  prisma.contentJob.update=(async(args:any)=>{statuses.push(args.data.status);return {};}) as any;
  try {
    await assert.rejects(processContentJob({contentJobId:'job-a',userId:'alice'}),/NATIVE_PIPELINE_REQUIRED/);
    assert.deepEqual(statuses,['RUNNING','FAILED']);assert.equal(network,0);
  } finally {
    prisma.contentJob.findUnique=oldFind;prisma.contentJob.update=oldUpdate;globalThis.fetch=oldFetch;
    if(oldMode===undefined)delete process.env.KAME_ALLOW_EXTERNAL_MODELS;else process.env.KAME_ALLOW_EXTERNAL_MODELS=oldMode;
  }
});
test('publisher rejects crossed assets, preserves ambiguous state, deduplicates success',async()=>{
  const originals={postFind:prisma.post.findUnique,accountFind:prisma.socialAccount.findUnique,assetFind:prisma.asset.findUnique,update:prisma.post.update,updateMany:prisma.post.updateMany};
  let writes=0, assetOwner='bob',state='SCHEDULED';
  prisma.post.findUnique=(async()=>({id:'p',userId:'alice',socialAccountId:'s',assetId:'a',provider:'ELITE',status:state,remotePostId:'confirmed-remote'})) as any;
  prisma.socialAccount.findUnique=(async()=>({id:'s',userId:'alice',provider:'ELITE',status:'ACTIVE'})) as any;
  prisma.asset.findUnique=(async()=>({id:'a',userId:assetOwner,url:'https://media.example/a.mp4'})) as any;
  prisma.post.update=prisma.post.updateMany=(async()=>{writes++;throw new Error('unexpected write');}) as any;
  try {
    await assert.rejects(processPublishJob({postId:'p',socialAccountId:'s',assetId:'a'}),/BINDING_MISMATCH/);
    assert.equal(writes,0);
    assetOwner='alice';state='PUBLISHING';
    await assert.rejects(processPublishJob({postId:'p',socialAccountId:'s',assetId:'a'}),/RECONCILIATION_REQUIRED/);
    assert.equal(writes,0);
    state='DRAFT';
    await assert.rejects(processPublishJob({postId:'p',socialAccountId:'s',assetId:'a'}),/NOT_SCHEDULED/);
    assert.equal(writes,0);
    state='PUBLISHED';
    assert.deepEqual(await processPublishJob({postId:'p',socialAccountId:'s',assetId:'a'}),{success:true,remotePostId:'confirmed-remote'});
    assert.equal(writes,0);
  } finally {
    prisma.post.findUnique=originals.postFind;prisma.socialAccount.findUnique=originals.accountFind;
    prisma.asset.findUnique=originals.assetFind;prisma.post.update=originals.update;prisma.post.updateMany=originals.updateMany;
  }
});
