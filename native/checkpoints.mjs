// Private, bounded, per-queue-job checkpoints. Never accepts a model path/URL.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
function privateDir(p){const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)||s.uid!==process.getuid())throw Error('unsafe_checkpoint_directory');}
function readFile(p,max){const fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const st=fs.fstatSync(fd);if(!st.isFile()||st.size>max||st.nlink!==1)throw Error('invalid_checkpoint_file');return fs.readFileSync(fd);}finally{fs.closeSync(fd);}}
export function openCheckpoints(root,key,fingerprint,shots){
 if(!path.isAbsolute(root)||fs.realpathSync(root)!==root)throw Error('unsafe_checkpoint_root');privateDir(root);
 if(!/^kn_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key)||! /^[a-f0-9]{64}$/.test(fingerprint)||!Number.isSafeInteger(shots)||shots<1||shots>8)throw Error('invalid_checkpoint_identity');
 const dir=path.join(root,sha(key));
 if(!fs.existsSync(dir)){if(fs.readdirSync(root).length>=4)throw Error('checkpoint_capacity_exceeded');fs.mkdirSync(dir,{mode:0o700});}privateDir(dir);
 // Same job cannot render twice. A dead local worker may be recovered; a live
 // or unverifiable PID remains locked, including PID reuse (safe false block).
 const lock=path.join(dir,'lock');
 if(fs.existsSync(lock)){const p=JSON.parse(readFile(lock,256));if(!Number.isSafeInteger(p.pid)||p.pid<1)throw Error('invalid_checkpoint_lock');try{process.kill(p.pid,0);throw Error('checkpoint_busy');}catch(e){if(e.code!=='ESRCH')throw e;}fs.unlinkSync(lock);}
 const fd=fs.openSync(lock,'wx',0o600);fs.writeSync(fd,JSON.stringify({pid:process.pid}));fs.fsyncSync(fd);fs.closeSync(fd);
 let closed=false,manifest;
 const manifestPath=path.join(dir,'manifest.json');
 const save=()=>{const tmp=path.join(dir,'manifest.next');if(fs.existsSync(tmp))fs.unlinkSync(tmp);const f=fs.openSync(tmp,'wx',0o600);try{fs.writeSync(f,JSON.stringify(manifest));fs.fsyncSync(f);}finally{fs.closeSync(f);}fs.renameSync(tmp,manifestPath);};
 try{
  if(fs.existsSync(manifestPath)){manifest=JSON.parse(readFile(manifestPath,16384));if(manifest.version!==1||manifest.key!==key||manifest.fingerprint!==fingerprint||manifest.shots!==shots||!Array.isArray(manifest.clips)||manifest.clips.length!==shots)throw Error('checkpoint_identity_mismatch');}
  else{manifest={version:1,key,fingerprint,shots,clips:Array(shots).fill(null)};save();}
 }catch(e){fs.unlinkSync(lock);throw e;}
 function check(i){if(closed||!Number.isSafeInteger(i)||i<0||i>=shots)throw Error('invalid_checkpoint_index');}
 return {
  get(i){check(i);const entry=manifest.clips[i];if(!entry)return null;if(!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.size)||entry.size<1024||entry.size>50*1024*1024)throw Error('invalid_checkpoint_entry');const b=readFile(path.join(dir,`clip-${i}.mp4`),50*1024*1024);if(b.length!==entry.size||sha(b)!==entry.sha256)throw Error('checkpoint_integrity_failed');return b;},
  put(i,bytes){check(i);if(manifest.clips[i])throw Error('checkpoint_already_committed');if(!Buffer.isBuffer(bytes)||bytes.length<1024||bytes.length+manifest.clips.reduce((n,c)=>n+(c?.size||0),0)>50*1024*1024)throw Error('checkpoint_size_exceeded');const target=path.join(dir,`clip-${i}.mp4`),temp=path.join(dir,`clip-${i}.next`);for(const f of [target,temp])if(fs.existsSync(f))fs.unlinkSync(f);const fd=fs.openSync(temp,'wx',0o600);try{fs.writeSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,target);manifest.clips[i]={sha256:sha(bytes),size:bytes.length};save();},
  close(){if(!closed){closed=true;fs.unlinkSync(lock);}},
  remove(){if(!closed)throw Error('checkpoint_still_open');privateDir(dir);fs.rmSync(dir,{recursive:true});}
 };
}
