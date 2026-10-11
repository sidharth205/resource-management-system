const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), 'chrome-pwd-test-' + Date.now());

const proc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  '--window-size=1280,800',
  'about:blank'
]);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://localhost:9222/json/version', res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });
      return data.webSocketDebuggerUrl;
    } catch (e) {
      await sleep(200);
    }
  }
  throw new Error('Could not get WS url');
}

async function run() {
  try {
    const wsUrl = await getWsUrl();
    console.log('WS URL:', wsUrl);

    // Get existing page target
    const pages = await new Promise((resolve, reject) => {
      http.get('http://localhost:9222/json/list', res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    const target = pages.find(p => p.type === 'page') || pages[0];
    console.log('Target found:', target.id);
    const pageWsUrl = target.webSocketDebuggerUrl;

    const ws = new WebSocket(pageWsUrl);

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('PAGE CONSOLE:', msg.params.type, msg.params.args.map(a => a.value || a.description));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('PAGE EXCEPTION:', msg.params.exceptionDetails);
      }
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, res => {
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result);
        });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    if (ws.readyState !== 1) {
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    await send('Page.navigate', { url: 'http://localhost:5500/admin/login/index.html' });
    await sleep(2000); // Wait for page to load

    // Evaluate script on page:
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const pwd = document.getElementById('password');
          const btn = document.getElementById('togglePasswordBtn');
          return {
            pwdExists: !!pwd,
            pwdType: pwd ? pwd.type : null,
            pwdValue: pwd ? pwd.value : null,
            btnExists: !!btn,
            btnOnclick: btn ? !!btn.onclick : false,
            hasGlobalToggle: typeof window.togglePasswordVisibility === 'function',
            computedColor: pwd ? getComputedStyle(pwd).color : null,
            computedFont: pwd ? getComputedStyle(pwd).fontFamily : null,
            computedSecurity: pwd ? getComputedStyle(pwd).webkitTextSecurity : null,
            svgContent: btn ? btn.innerHTML : null
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Initial page state:', JSON.stringify(evalRes.result.value, null, 2));

    // Fill password and click toggle button (show)
    const click1Res = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const pwd = document.getElementById('password');
          const btn = document.getElementById('togglePasswordBtn');
          pwd.value = 'SecretPass123';

          // Simulate user click on button
          btn.click();

          return {
            afterClick1Type: pwd.type,
            afterClick1Value: pwd.value,
            buttonAriaLabel: btn.getAttribute('aria-label')
          };
        })()
      `,
      returnByValue: true
    });

    console.log('After first click (show):', JSON.stringify(click1Res.result.value, null, 2));

    await sleep(400); // Wait beyond debounce window

    // Click again (hide)
    const click2Res = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const pwd = document.getElementById('password');
          const btn = document.getElementById('togglePasswordBtn');
          btn.click();
          return {
            afterClick2Type: pwd.type,
            afterClick2Value: pwd.value,
            buttonAriaLabel: btn.getAttribute('aria-label')
          };
        })()
      `,
      returnByValue: true
    });

    console.log('After second click (hide):', JSON.stringify(click2Res.result.value, null, 2));

    // Take screenshot of password area
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\072b78c1-71e5-4096-aaf1-a60fd018f755\\scratch\\login_after_toggle.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshot to login_after_toggle.png');

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    proc.kill();
  }
}

run();
