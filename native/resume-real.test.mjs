import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';import {createNativeRenderer} from './render.mjs';
test('real Blender resumes completed shot after cancellation without rendering it twice',{skip:!process.env.KAME_NATIVE_TEST_BLENDER,timeout:600000},async()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kame-resume-proof-'))),key='kn_'+randomUUID();
 const plan=JSON.parse(fs.readFileSync(new URL('./demo.json',import.meta.url)));plan.width=128;plan.height=128;
 const render=createNativeRenderer({blenderPath:process.env.KAME_NATIVE_TEST_BLENDER,ffmpegPath:'/usr/bin/ffmpeg',ffprobePath:'/usr/bin/ffprobe',bwrapPath:process.env.KAME_NATIVE_TEST_BWRAP,checkpointRoot:root,onDiagnostic:d=>console.error(JSON.stringify(d))});
 const abort=new AbortController();let captured;
 const timer=setInterval(()=>{for(const dir of fs.readdirSync(root)){const f=path.join(root,dir,'manifest.json');if(!fs.existsSync(f))continue;try{const m=JSON.parse(fs.readFileSync(f));if(m.clips?.[0]&&!m.clips[1]){captured=m.clips[0].sha256;abort.abort();}}catch{}}},25);
 try{
  await assert.rejects(render(plan,{signal:abort.signal,checkpointKey:key}),/cancel/);clearInterval(timer);assert.ok(captured);
  const result=await render(plan,{checkpointKey:key});assert.equal(result.metadata.resumedShots,1);assert.equal(result.metadata.frames,24);assert.equal(result.metadata.durationMs,2000);assert.equal(result.metadata.externalModels,false);
  assert.equal(fs.readdirSync(root).length,0);
  if(process.env.KAME_NATIVE_TEST_OUTPUT){fs.writeFileSync(process.env.KAME_NATIVE_TEST_OUTPUT,result.bytes,{mode:0o600});fs.writeFileSync(process.env.KAME_NATIVE_TEST_OUTPUT+'.json',JSON.stringify({...result.metadata,firstShotHash:captured,recoveryVerified:true},null,2),{mode:0o600});}
 }finally{clearInterval(timer);fs.rmSync(root,{recursive:true,force:true});}
});
