// Reused from KairosCoin fa2d975a; bounded process runner, no network or GPU device mounts.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
export function executable(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('absolute_renderer_path_required');
  const resolved = fs.realpathSync(value);
  fs.accessSync(resolved, fs.constants.X_OK);
  return resolved;
}
export function sandboxCommand(binary, args, job, roots, platform = process.platform, bwrapPath = '/usr/bin/bwrap') {
  if (platform === 'darwin') {
    const quote = value => JSON.stringify(value);
    const readRoots = ['/System', '/usr', '/Library/Apple', '/private/preboot/Cryptexes/OS', '/private/var/db/dyld', '/dev', ...roots, job];
    const profile = `(version 1)(deny default)(allow process*)(allow sysctl-read)(allow mach-lookup)
      (allow file-read-metadata)(allow file-read* ${readRoots.map(p => `(subpath ${quote(p)})`).join(' ')})
      (allow file-write* (subpath ${quote(job)})(literal "/dev/null"))`;
    return ['/usr/bin/sandbox-exec', ['-p', profile, binary, ...args]];
  }
  if (platform === 'linux') {
    const mounts = [...new Set(['/usr', '/lib', '/lib64', '/etc/ld.so.cache', '/etc/alternatives', ...roots])].filter(p => fs.existsSync(p));
    return [bwrapPath, ['--unshare-all', '--die-with-parent', '--new-session',
      ...mounts.flatMap(p => ['--ro-bind', p, p]), '--proc', '/proc', '--dev', '/dev',
      '--tmpfs', '/tmp', '--bind', job, job, '--chdir', job, '--', binary, ...args]];
  }
  throw new Error('render_sandbox_unavailable');
}
export async function run(binary, args, { job, roots, signal, bwrapPath, onDiagnostic, maxBytes = 512 * 1024 }) {
  signal.throwIfAborted();
  const [command, commandArgs] = sandboxCommand(binary, args, job, roots, process.platform, bwrapPath);
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: job, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: '/usr/bin:/bin', HOME: job, TMPDIR: job, XDG_CACHE_HOME: job,
        OMP_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '2', LC_ALL: 'C' } });
    let output = '', stderr = '', size = 0, failure;
    const kill = error => {
      failure = error;
      // bubblewrap may create its own session; kill the tracked supervisor too.
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
      child.kill('SIGKILL');
    };
    const abort = () => kill(new Error('render_cancelled'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    child.stdout.on('data', chunk => { size += chunk.length; if (size <= maxBytes) output += chunk; else kill(new Error('render_output_limit')); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2048); size += chunk.length; if (size > maxBytes) kill(new Error('render_output_limit')); });
    child.once('error', () => { signal.removeEventListener('abort', abort); reject(new Error('render_process_unavailable')); });
    child.once('close', code => {
      signal.removeEventListener('abort', abort);
      if (failure || code !== 0) {
        // Optional trusted test harness only; worker never exposes renderer logs.
        onDiagnostic?.({ executable: path.basename(binary), code, stderr });
        reject(failure || new Error('render_process_failed'));
      }
      else resolve(output);
    });
  });
}
