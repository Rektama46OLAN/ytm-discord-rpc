const BRIDGE = 'http://127.0.0.1:17463';

chrome.runtime.onMessage.addListener((msg) => {
  const path = msg.type === 'clear' ? '/clear' : '/presence';
  fetch(BRIDGE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg.data || {}),
  }).catch(() => {});
});
