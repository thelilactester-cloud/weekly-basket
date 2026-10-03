// Prints the visible text of the app's page, read through the WebView's DevTools connection
// (debug builds only). Used by android-smoke.sh after: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
const port = process.argv[2] || '9222';
const fail = (msg) => { console.error(msg); process.exit(1); };
setTimeout(() => fail('timed out reading the page'), 15000);
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json().catch((e) => fail('no DevTools: ' + e.message));
const page = targets.find((t) => t.type === 'page') || targets[0];
if (!page) fail('no page in the WebView');
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.onerror = () => fail('could not connect to the page');
ws.onopen = () => ws.send(JSON.stringify({
  id: 1, method: 'Runtime.evaluate',
  params: { expression: 'document.title + "\\n" + document.body.innerText.slice(0, 600)', returnByValue: true },
}));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id !== 1) return;
  console.log(m.result && m.result.result ? m.result.result.value : JSON.stringify(m));
  process.exit(0);
};
