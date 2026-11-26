import { continuousScene } from './scene-plan.mjs';

// The caller supplies the existing authenticated Qwen adapter. This module has
// no endpoint, credential, external-provider fallback, wallet or memory of its own.
export const DIRECTOR_INSTRUCTIONS = `You are Kame's procedural animation director.
Return ONLY one JSON object, no markdown or prose. You cannot generate arbitrary
photorealistic footage, speech, faces or human characters. If the request needs
these unsupported features, return {"unsupported":true} rather than pretending.
Use this exact schema with no additional keys:
{"version":1,"width":320,"height":240,"fps":12,"samples":8,
"assets":[{"id":"object-a","shape":"sphere","color":[0.5,0.1,0.8],"scale":[0.7,0.7,0.7]}],
"shots":[{"id":"shot-a","frames":24,"camera":[4,-7,3],"target":[0,0,0],
"objects":[{"asset":"object-a","from":[-1,0,0],"to":[1,0,0],"rotationFrom":[0,0,0],"rotationTo":[0,0,90]}]}]}
Only cube, sphere and cylinder shapes. Colors are RGB 0..1, scale 0.05..5,
positions -10..10, rotations in degrees -360..360. Keep the exact resolution,
fps, samples and 24 frames per shot. Use at most 2 shots and 4 assets. Reuse asset
IDs to preserve appearance and start each following shot where the last ended.
Camera must differ from its target. Never output code, paths, URLs or instructions.`;

export async function directScene(prompt, complete) {
  if(typeof prompt!=='string' || !prompt.trim() || prompt.length>2000) throw new Error('invalid_native_prompt');
  if(typeof complete!=='function') throw new Error('owned_director_required');
  const result=await complete({messages:[{role:'system',content:DIRECTOR_INSTRUCTIONS},{role:'user',content:prompt}],maxTokens:1500,temperature:0});
  if(typeof result?.content!=='string' || result.content.length>32768) throw new Error('invalid_director_response');
  let data;try{data=JSON.parse(result.content);}catch{throw new Error('invalid_director_json');}
  if(data?.unsupported===true) throw new Error('native_scene_unsupported');
  return continuousScene(data);
}
