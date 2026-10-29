const HEARTBEAT_MS = 15000;
const SEEK_DRIFT_S = 3;
const TAG = '[ytm-discord]';

let last = null;
let lastSentAt = 0;
let lastWhy = '';

function fromDom() {
  const bar = document.querySelector('ytmusic-player-bar');
  if (!bar) return null;
  const title = bar.querySelector('.title')?.textContent.trim();
  const parts = (bar.querySelector('.byline')?.textContent || '')
    .split('•')
    .map((s) => s.trim())
    .filter(Boolean);
  const cover = bar.querySelector('img.image, #song-image img')?.src || '';
  if (!title) return null;
  return { title, artist: parts[0] || '', album: parts[1] || '', cover };
}

function fromMediaSession() {
  const meta = navigator.mediaSession && navigator.mediaSession.metadata;
  if (!meta || !meta.title) return null;
  const art = meta.artwork || [];
  return {
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    cover: art.length ? art[art.length - 1].src : '',
  };
}

function why(msg) {
  if (msg !== lastWhy) console.log(TAG, msg);
  lastWhy = msg;
  return null;
}

function read() {
  const video = document.querySelector('video');
  const videoId =
    new URL(location.href).searchParams.get('v') || document.documentElement.dataset.ytmVid;
  if (!video) return why('video elementi yok');
  if (!videoId) return why('video kimligi bulunamadi (sarki calmiyor olabilir)');
  const info = fromMediaSession() || fromDom();
  if (!info) return why('sarki bilgisi okunamadi');

  return {
    ...info,
    videoId,
    paused: video.paused,
    position: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : 0,
  };
}

function changed(cur) {
  if (!last) return true;
  if (cur.videoId !== last.videoId || cur.title !== last.title) return true;
  if (cur.paused !== last.paused) return true;
  const expected = last.position + (last.paused ? 0 : (Date.now() - lastSentAt) / 1000);
  return Math.abs(cur.position - expected) > SEEK_DRIFT_S;
}

function send(msg) {
  try {
    chrome.runtime.sendMessage(msg);
  } catch (e) {
    console.warn(TAG, 'mesaj yollanamadi (eklentiyi yenile, sayfayi F5):', e.message);
  }
}

function tick() {
  const cur = read();
  if (!cur) {
    if (last) send({ type: 'clear' });
    last = null;
    return;
  }
  const heartbeat = Date.now() - lastSentAt > HEARTBEAT_MS;
  if (changed(cur) || (heartbeat && !cur.paused)) {
    console.log(TAG, 'yolluyor:', cur.title, '-', cur.artist, cur.paused ? '(duraklatildi)' : '');
    send({ type: 'presence', data: cur });
    last = cur;
    lastSentAt = Date.now();
  }
}

console.log(TAG, 'content script yuklendi');
setInterval(tick, 1000);
window.addEventListener('pagehide', () => send({ type: 'clear' }));
