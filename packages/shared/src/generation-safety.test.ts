import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node's strip-types test runner requires the source extension.
import {requireRealProviders,requireLegacyGenerationOptIn,requireContentOwner,requirePublishBinding} from './generation-safety.ts';
test('no external model calls by default',()=>{
  assert.throws(()=>requireLegacyGenerationOptIn({}),/NATIVE_PIPELINE/);
  assert.throws(()=>requireLegacyGenerationOptIn({KAME_ALLOW_EXTERNAL_MODELS:'true'}));
});
test('mock content cannot be billed or published as real',()=>{
  for(const name of ['mock-video','mock-tts','mock-llm','mock-thumbnail'])assert.throws(()=>requireRealProviders(['real',name]));
  requireRealProviders(['kame-procedural-blender']);
});
test('content job ownership and terminal states',()=>{
  assert.throws(()=>requireContentOwner({userId:'alice',status:'QUEUED'},'bob'));
  for(const status of ['CANCELLED','SUCCESS']) assert.throws(()=>requireContentOwner({userId:'alice',status},'alice'));
  requireContentOwner({userId:'alice',status:'QUEUED'},'alice');
});
test('post account and media must belong to same owner and exact IDs',()=>{
  const post={userId:'alice',socialAccountId:'social-a',assetId:'asset-a',provider:'ELITE'};
  const account={id:'social-a',userId:'alice',provider:'ELITE'};
  const asset={id:'asset-a',userId:'alice',url:'https://media.example/a.mp4'};
  requirePublishBinding(post,account,asset);
  assert.throws(()=>requirePublishBinding(post,{...account,userId:'bob'},asset));
  assert.throws(()=>requirePublishBinding(post,account,{...asset,userId:'bob'}));
  assert.throws(()=>requirePublishBinding(post,account,{...asset,id:'asset-b'}));
  assert.throws(()=>requirePublishBinding(post,{...account,provider:'TIKTOK'},asset));
  assert.throws(()=>requirePublishBinding(post,account,{...asset,url:'https://placeholder.kaizen.ai/video/mock.mp4'}));
  assert.throws(()=>requirePublishBinding(post,account,{...asset,url:'http://media.example/a.mp4'}));
});
