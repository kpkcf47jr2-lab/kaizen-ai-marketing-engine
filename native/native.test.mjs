import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenePlan} from './scene-plan.mjs';
import {sandboxCommand} from './sandbox.mjs';
import {createNativeRenderer} from './render.mjs';
import {directScene} from './director.mjs';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('./demo.json',import.meta.url)));
test('director uses injected owned model and validates every response',async()=>{
  let calls=0;
  const p=await directScene('Two simple objects',async args=>{calls++;assert.equal(args.messages[1].content,'Two simple objects');return {content:JSON.stringify(fixture())};});
  assert.equal(p.shots.length,2);assert.equal(calls,1);
  await assert.rejects(directScene('x',async()=>({content:'not json'})),/invalid_director_json/);
  await assert.rejects(directScene('x',async()=>({content:'{"python":"bad"}'})),/invalid_native_scene/);
  await assert.rejects(directScene('x',async()=>({content:'{"unsupported":true}'})),/unsupported/);
  await assert.rejects(directScene('x'.repeat(2001),async()=>{throw new Error('must not call');}),/invalid_native_prompt/);
});
test('render validated real Qwen plan with own Blender engine',{skip:!process.env.KAME_NATIVE_QWEN_PLAN},async()=>{
  const plan=scenePlan(JSON.parse(fs.readFileSync(process.env.KAME_NATIVE_QWEN_PLAN,'utf8')));
  const render=createNativeRenderer({blenderPath:process.env.KAME_NATIVE_TEST_BLENDER,ffmpegPath:'/usr/bin/ffmpeg',ffprobePath:'/usr/bin/ffprobe',bwrapPath:process.env.KAME_NATIVE_TEST_BWRAP});
  const result=await render(plan);
  assert.equal(result.metadata.device,'CPU');assert.equal(result.metadata.externalModels,false);
  assert.ok(result.bytes.length>1024);
  if(process.env.KAME_NATIVE_TEST_OUTPUT){
    fs.writeFileSync(process.env.KAME_NATIVE_TEST_OUTPUT+'.qwen.mp4',result.bytes,{mode:0o600});
    fs.writeFileSync(process.env.KAME_NATIVE_TEST_OUTPUT+'.qwen.json',JSON.stringify(result.metadata,null,2),{mode:0o600});
  }
});
test('shared immutable assets across shots and exact duration',()=>{
  const p=scenePlan(fixture());assert.equal(p.shots.reduce((n,s)=>n+s.frames,0)/p.fps,2);
  assert.equal(p.shots[0].objects[0].asset,p.shots[1].objects[0].asset);
});
const badCases=[
  p=>p.python='import os', p=>p.assets[0].url='https://example.com/model.blend',
  p=>p.shots[0].objects[0].asset='../../other-user', p=>p.shots[0].frames=100000,
  p=>p.shots[0].objects[0].from=[NaN,0,0], p=>p.assets[0].color=[2,0,0],
  p=>p.assets.push(p.assets[0]),p=>p.shots[0].objects.push(p.shots[0].objects[0]),
  p=>p.width=321, p=>p.shots[0].camera=p.shots[0].target,
  p=>p.assets[0].shape='python',p=>p.samples=100000,p=>p.shots[0].id='../../escape',
];
for(const [i,mutate] of badCases.entries())test(`reject untrusted scene ${i}`,()=>{
  const p=fixture();mutate(p);assert.throws(()=>scenePlan(p));
});
test('aggregate work cap accounts for samples',()=>{
  const p=fixture();p.width=1920;p.height=1080;p.samples=64;
  assert.throws(()=>scenePlan(p),/budget/);
});
test('Linux renderer has no network, home, credentials or GPU device binds',()=>{
  const [cmd,args]=sandboxCommand('/usr/bin/blender',[],'/tmp/kame-test',['/usr'],'linux');
  assert.equal(cmd,'/usr/bin/bwrap'); assert.ok(args.includes('--unshare-all'));
  assert.ok(!args.includes('--share-net')); assert.ok(!args.includes('/home'));
  assert.ok(!args.some(a=>a.includes('nvidia') || a.includes('/dev/dri')));
  assert.deepEqual(args.slice(args.indexOf('--dev'),args.indexOf('--dev')+2),['--dev','/dev']);
});
test('real Blender native rendering and cancellation',{skip:!process.env.KAME_NATIVE_TEST_BLENDER},async()=>{
  const render=createNativeRenderer({blenderPath:process.env.KAME_NATIVE_TEST_BLENDER,ffmpegPath:'/usr/bin/ffmpeg',ffprobePath:'/usr/bin/ffprobe',bwrapPath:process.env.KAME_NATIVE_TEST_BWRAP});
  const cancelled=new AbortController();cancelled.abort();
  await assert.rejects(render(fixture(),{signal:cancelled.signal}));
  const promise=render(fixture());await assert.rejects(render(fixture()),/busy/);
  const result=await promise;
  assert.equal(result.metadata.frames,24); assert.equal(result.metadata.externalModels,false);
  assert.equal(result.metadata.durationMs,2000);assert.equal(result.metadata.device,'CPU');
  assert.ok(result.bytes.length>1024);
  if(process.env.KAME_NATIVE_TEST_OUTPUT){
    fs.writeFileSync(process.env.KAME_NATIVE_TEST_OUTPUT,result.bytes,{mode:0o600});
    fs.writeFileSync(process.env.KAME_NATIVE_TEST_OUTPUT+'.json',JSON.stringify(result.metadata,null,2),{mode:0o600});
  }
});
