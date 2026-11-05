// Run a Python script inside the *open* Blender (the "Blender (MCP)" window) through the add-on's socket on :9876.
// Usage: node tools/blender/live.mjs script.py [--set KEY=VALUE ...]
//        node tools/blender/live.mjs --cmd <add-on command> '<json params>'   (e.g. create_rodin_job)
// Variables passed with --set are available in the script as ARGS['KEY'].
import net from 'net';
import fs from 'fs';

const [file, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) if (rest[i] === '--set') { const [k, ...v] = rest[++i].split('='); args[k] = v.join('='); }
const isCmd = file === '--cmd';
const payload = isCmd ? { type: rest[0], params: JSON.parse(rest[1] || '{}') } : { type: 'execute_code', params: { code: `ARGS = ${JSON.stringify(args)}\n` + fs.readFileSync(file, 'utf8') } };

const sock = net.createConnection({ host: '127.0.0.1', port: 9876 });
let buf = '';
sock.on('connect', () => sock.write(JSON.stringify(payload)));
sock.on('data', (d) => {
  buf += d.toString('utf8');
  try {
    const res = JSON.parse(buf);
    if (res.status === 'error') { console.error('BLENDER ERROR:', res.message); process.exitCode = 1; }
    else process.stdout.write(isCmd ? JSON.stringify(res.result) + '\n' : (res.result && res.result.result) || JSON.stringify(res.result) + '\n');
    sock.end();
  } catch (e) { /* wait for the rest */ }
});
sock.on('error', (e) => { console.error('cannot reach Blender on :9876 –', e.message); process.exitCode = 2; });
sock.setTimeout(600000, () => { console.error('timeout'); sock.destroy(); process.exitCode = 3; });
