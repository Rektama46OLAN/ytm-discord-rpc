const HEARTBEAT_MS = 15000;
const SEEK_DRIFT_S = 3;
const TAG = '[ytm-discord]';

let last = null;
let lastSentAt = 0;
let lastWhy = '';
let lastKey = '';
let stableTicks = 0;

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

function toSeconds(s) {
  return s.split(':').reduce((acc, n) => acc * 60 + Number(n), 0);
}

// The player bar shows "1:23 / 4:56" - the times the listener actually sees. The <video> element can
// report a different length (music-video cut, previous track still loaded while switching).
function fromTimeInfo() {
  const text = document.querySelector('ytmusic-player-bar .time-info')?.textContent || '';
  const m = text.match(/(\d+(?::\d+)+)\s*\/\s*(\d+(?::\d+)+)/);
  if (!m) return null;
  const position = toSeconds(m[1]);
  const duration = toSeconds(m[2]);
  return duration > 0 && position <= duration + 1 ? { position, duration } : null;
}

function read() {
  const video = document.querySelector('video');
  const videoId =
    new URL(location.href).searchParams.get('v') || document.documentElement.dataset.ytmVid;
  if (!video) return why('video elementi yok');
  if (!videoId) return why('video kimligi bulunamadi (sarki calmiyor olabilir)');
  const info = fromMediaSession() || fromDom();
  if (!info) return why('sarki bilgisi okunamadi');

  const times = fromTimeInfo();
  return {
    ...info,
    videoId,
    paused: video.paused,
    position: times ? times.position : video.currentTime,
    duration: times ? times.duration : Number.isFinite(video.duration) ? video.duration : 0,
  };
}

function changed(cur) {
  if (!last) return true;
  if (cur.videoId !== last.videoId || cur.title !== last.title) return true;
  if (cur.paused !== last.paused) return true;
  if (Math.abs(cur.duration - last.duration) > 1) return true;
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
  // When the track switches, the title, video id, duration and position don't all update in the same
  // instant. Wait until the track identity has been the same for two ticks before announcing it.
  const key = `${cur.videoId}|${cur.title}`;
  stableTicks = key === lastKey ? stableTicks + 1 : 0;
  lastKey = key;
  if (last && key !== `${last.videoId}|${last.title}` && stableTicks < 2) return;

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
