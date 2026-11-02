import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await readFile(path.join(root, 'dist/server/index.js'), 'utf8');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(bundle).toString('base64'))).default;
const port = Number(process.env.PORT || 4173);

class MemoryStatement {
  constructor(db, sql) { this.db = db; this.sql = sql.replace(/\s+/g, ' ').trim().toUpperCase(); this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() {
    const a = this.args, rooms = this.db.rooms;
    if (this.sql.startsWith('SELECT CODE FROM ROOMS')) {
      return rooms.has(a[0]) ? { code: a[0] } : null;
    }
    if (this.sql.startsWith('SELECT HOST_ID, STATE, HOST_SEEN FROM ROOMS')) {
      const r = rooms.get(a[0]); return r ? { host_id: r.host_id, state: r.state, host_seen: r.host_seen } : null;
    }
    if (this.sql.startsWith('UPDATE ROOMS SET HOST_SEEN')) {
      const [seen, code, host] = a, r = rooms.get(code);
      if (!r || r.host_id !== host) return null;
      r.host_seen = seen; return { code };
    }
    if (this.sql.startsWith('SELECT STATE FROM ROOMS')) {
      const r = rooms.get(a[0]); return r ? { state: r.state } : null;
    }
    if (this.sql.startsWith('SELECT STATE, REVISION')) {
      const r = rooms.get(a[0]); return r ? { ...r } : null;
    }
    return null;
  }
  async all() {
    if (this.sql.startsWith('SELECT ID, PLAYER_ID, BODY FROM ACTIONS')) {
      const [code, after] = this.args;
      return { results: this.db.actions.filter(x => x.code === code && x.id > after).sort((x,y)=>x.id-y.id).slice(0,100) };
    }
    return { results: [] };
  }
  async run() {
    const a = this.args, db = this.db;
    if (this.sql.startsWith('DELETE FROM ACTIONS')) {
      db.actions = db.actions.filter(x => x.created_at >= a[0]); return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('DELETE FROM ROOMS')) {
      for (const [code, r] of db.rooms) if (r.created_at < a[0]) db.rooms.delete(code);
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO ROOMS')) {
      const [code, host_id, state, host_seen, created_at] = a;
      db.rooms.set(code, { code, host_id, state, revision: 0, host_seen, created_at });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO ACTIONS')) {
      const [code, player_id, body, created_at] = a;
      db.actions.push({ id: db.nextAction++, code, player_id, body, created_at });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('UPDATE ROOMS SET STATE')) {
      const [state, host_seen, code, revision] = a, r = db.rooms.get(code);
      if (!r || r.revision !== revision) return { meta: { changes: 0 } };
      r.state = state; r.revision++; r.host_seen = host_seen;
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
}
const DB = { rooms: new Map(), actions: [], nextAction: 1, prepare(sql) { return new MemoryStatement(this, sql); } };

createServer(async (incoming, outgoing) => {
  try {
    if(incoming.url==='/__qa/devices'){outgoing.writeHead(200,{'content-type':'text/html'});outgoing.end(await readFile(path.join(root,'tests/manual/devices.html')));return}
    if(incoming.url?.startsWith('/__qa/frozen')){outgoing.writeHead(200,{'content-type':'text/html'});outgoing.end(await readFile(path.join(root,'tests/manual/scene.html')));return}
    const assetPath=new URL(incoming.url,'http://local').pathname;
    if(assetPath==='/app-v18.js'||/^\/v\d+\/style-v51\.css$/.test(assetPath)){const css=assetPath.endsWith('.css');outgoing.writeHead(200,{'content-type':css?'text/css':'application/javascript','cache-control':'no-store'});outgoing.end(await readFile(path.join(root,'public',css?'style-v51.css':'app-v18.js')));return}
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const request = new Request('http://' + (incoming.headers.host || 'localhost') + incoming.url, {
      method: incoming.method,
      headers: incoming.headers,
      body: raw || undefined
    });
    const response = await worker.fetch(request, { DB });
    const body = Buffer.from(await response.arrayBuffer());
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(body);
  } catch (error) {
    outgoing.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    outgoing.end('Local preview error: ' + error.message);
  }
}).listen(port, process.env.HOST || '0.0.0.0', () => console.log('TRAPBOUND local preview at http://localhost:' + port));
