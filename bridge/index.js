import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@xhayper/discord-rpc';

const PORT = 17463;
const STALE_MS = 30_000;
const LISTENING = 2;

const dir = dirname(fileURLToPath(import.meta.url));
const configPath = join(dir, 'config.json');
const fileCfg = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
const clientId = process.env.DISCORD_CLIENT_ID || fileCfg.clientId;

if (!clientId || clientId === 'YOUR_DISCORD_APPLICATION_ID') {
  console.error('Discord Client ID missing. Copy config.example.json to config.json and set "clientId".');
  process.exit(1);
}

const rpc = new Client({ clientId });
let ready = false;
let lastSeen = 0;
let lastKey = '';

rpc.on('ready', () => {
  ready = true;
  console.log('Discord baglandi.');
});
rpc.on('disconnected', () => {
  ready = false;
  console.log('Discord baglantisi koptu, yeniden denenecek.');
});

async function connect() {
  while (!ready) {
    try {
      await rpc.login();
    } catch {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
connect();

const pad = (s) => (s && s.length >= 2 ? s : `${s || ''}  `).slice(0, 128);

async function applyPresence(p) {
  if (!ready) return;
  if (p.paused) return clearPresence();

  const start = Date.now() - Math.round((p.position ?? 0) * 1000);
  const activity = {
    type: LISTENING,
    details: pad(p.title),
    state: pad(p.artist),
    largeImageKey: p.cover || undefined,
    largeImageText: p.album ? pad(p.album) : undefined,
    startTimestamp: start,
    endTimestamp: p.duration ? start + Math.round(p.duration * 1000) : undefined,
    instance: false,
    buttons: p.videoId
      ? [{ label: "YouTube Music'te dinle", url: `https://music.youtube.com/watch?v=${p.videoId}` }]
      : undefined,
  };
  lastKey = p.videoId || 'active';
  await rpc.user?.setActivity(activity);
}

async function clearPresence() {
  lastKey = '';
  if (ready) await rpc.user?.clearActivity().catch(() => {});
}

setInterval(() => {
  if (lastKey && Date.now() - lastSeen > STALE_MS) clearPresence();
}, 5000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST') return res.writeHead(404).end();

  let body = '';
  req.on('data', (c) => {
    body += c;
    if (body.length > 20_000) req.destroy();
  });
  req.on('end', async () => {
    try {
      const data = body ? JSON.parse(body) : {};
      lastSeen = Date.now();
      console.log(req.url, data.title ?? '', data.paused ? '(duraklatildi)' : '');
      if (req.url === '/clear') await clearPresence();
      else if (req.url === '/presence') await applyPresence(data);
      else return res.writeHead(404).end();
      res.writeHead(200).end('ok');
    } catch (e) {
      console.error(e.message);
      res.writeHead(400).end('bad');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`Kopru 127.0.0.1:${PORT} uzerinde dinliyor.`));

process.on('SIGINT', async () => {
  await clearPresence();
  process.exit(0);
});
