import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { executable, run } from './sandbox.mjs';
import { scenePlan } from './scene-plan.mjs';

export function createNativeRenderer({blenderPath,ffmpegPath,ffprobePath,bwrapPath='/usr/bin/bwrap',timeoutMs=600000,onDiagnostic}={}) {
  const blender=executable(blenderPath), ffmpeg=executable(ffmpegPath), ffprobe=executable(ffprobePath);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs<1000 || timeoutMs>600000) throw new Error('invalid_timeout');
  const sandboxBinary=process.platform==='linux'?executable(bwrapPath):undefined;
  const roots=[process.platform==='darwin'?path.resolve(blender,'../../..'):path.dirname(blender),process.platform==='darwin'?'/opt/homebrew':'/usr'];
  if (roots.some(r=>r==='/' || r===os.homedir())) throw new Error('unsafe_renderer_root');
  let busy=false;
  return async (input,{signal=new AbortController().signal}={}) => {
    const plan=scenePlan(input); signal.throwIfAborted();
    if(busy) throw new Error('native_renderer_busy');
    busy=true; let job;
    try {
      job=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kame-native-')));
      fs.chmodSync(job,0o700);
      const opts={job,roots,bwrapPath:sandboxBinary,onDiagnostic,signal:AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]),maxBytes:2*1024*1024};
      fs.writeFileSync(path.join(job,'scene.json'),JSON.stringify(plan),{mode:0o600});
      fs.copyFileSync(fileURLToPath(new URL('./render-scene.py',import.meta.url)),path.join(job,'render.py'));
      await run(blender,['--background','--factory-startup','--disable-autoexec','--threads','2','--python-exit-code','1','--python',path.join(job,'render.py'),'--',path.join(job,'scene.json')],opts);
      const frames=plan.shots.reduce((n,s)=>n+s.frames,0);
      await run(ffmpeg,['-v','error','-nostdin','-framerate',String(plan.fps),'-i','frame-%04d.png','-frames:v',String(frames),'-c:v','libx264','-threads','2','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','video.mp4'],opts);
      const info=JSON.parse(await run(ffprobe,['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,nb_read_frames,avg_frame_rate','-of','json','video.mp4'],opts));
      const v=info.streams?.[0];
      if(info.streams?.length!==1 || v.codec_type!=='video' || v.codec_name!=='h264' || v.width!==plan.width || v.height!==plan.height || Number(v.nb_read_frames)!==frames || v.avg_frame_rate!==`${plan.fps}/1`) throw new Error('native_output_contract_failed');
      const output=path.join(job,'video.mp4'),size=fs.statSync(output).size;
      if(size<1024 || size>50*1024*1024) throw new Error('native_output_size');
      const bytes=fs.readFileSync(output);
      return {bytes,metadata:{engine:'kame-procedural-blender',externalModels:false,device:'CPU',width:plan.width,height:plan.height,fps:plan.fps,frames,durationMs:frames*1000/plan.fps,sha256:createHash('sha256').update(bytes).digest('hex'),planSha256:createHash('sha256').update(JSON.stringify(plan)).digest('hex')}};
    } finally { if(job)fs.rmSync(job,{recursive:true,force:true});busy=false; }
  };
}
