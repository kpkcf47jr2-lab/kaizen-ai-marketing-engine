// Declarative native animation, not a trained text-to-video model.
// No URLs, filesystem paths, Python, expressions, shaders or .blend files.
const fail = () => { throw new Error('invalid_native_scene'); };
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(k => !allowed.includes(k))) fail();
}
function num(v, lo, hi, integer = false) {
  if (!Number.isFinite(v) || v < lo || v > hi || (integer && !Number.isSafeInteger(v))) fail();
  return v;
}
function vector(v, lo, hi) {
  if (!Array.isArray(v) || v.length !== 3) fail();
  return v.map(n => num(n, lo, hi));
}
function id(v) { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,48}$/.test(v)) fail(); return v; }
export function scenePlan(input) {
  keys(input, ['version','width','height','fps','samples','assets','shots']);
  if (input.version !== 1) fail();
  const width = num(input.width,128,1920,true), height = num(input.height,128,1920,true);
  const fps = num(input.fps,12,30,true), samples = num(input.samples,4,64,true);
  if (width % 2 || height % 2) fail();
  if (!Array.isArray(input.assets) || input.assets.length < 1 || input.assets.length > 32) fail();
  const ids = new Set();
  const assets = input.assets.map(a => {
    keys(a,['id','shape','color','scale']);
    const name = id(a.id);
    if (ids.has(name) || !['cube','sphere','cylinder'].includes(a.shape)) fail();
    ids.add(name);
    return { id:name, shape:a.shape, color:vector(a.color,0,1), scale:vector(a.scale,0.05,5) };
  });
  if (!Array.isArray(input.shots) || input.shots.length < 1 || input.shots.length > 8) fail();
  let frames = 0; const shotIds = new Set();
  const shots = input.shots.map(s => {
    keys(s,['id','frames','camera','target','objects']);
    const name = id(s.id); if (shotIds.has(name)) fail(); shotIds.add(name);
    const count = num(s.frames,12,120,true); frames += count;
    const camera = vector(s.camera,-30,30), target = vector(s.target,-10,10);
    if (Math.hypot(...camera.map((v,i) => v-target[i])) < 0.5) fail();
    if (!Array.isArray(s.objects) || s.objects.length < 1 || s.objects.length > 16) fail();
    const instances = new Set();
    const objects = s.objects.map(o => {
      keys(o,['asset','from','to','rotationFrom','rotationTo']);
      if (!ids.has(o.asset) || instances.has(o.asset)) fail(); instances.add(o.asset);
      return { asset:o.asset, from:vector(o.from,-10,10), to:vector(o.to,-10,10),
        rotationFrom:vector(o.rotationFrom,-360,360), rotationTo:vector(o.rotationTo,-360,360) };
    });
    return {id:name,frames:count,camera,target,objects};
  });
  // Bound CPU, image working set and output. Feature films require persisted
  // chapter jobs, quotas and recovery, not raising this per-job budget blindly.
  if (frames/fps > 30 || width*height*frames*samples/4 > 64_000_000) throw new Error('native_render_budget_exceeded');
  return {version:1,width,height,fps,samples,assets,shots};
}
