const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    baseURL: 'http://localhost:3399',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  let errors = [];
  let networkLogs = [];
  let pageErrors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.length < 500) {
      console.log(`[CONSOLE ${msg.type()}] ${text}`);
    } else {
      console.log(`[CONSOLE ${msg.type()}] ${text.substring(0, 200)}...`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR] ${err.message}`);
    pageErrors.push(err.message);
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('/static/') || url.includes('/configs/')) {
      console.log(`[REQ] ${req.method()} ${url}`);
      networkLogs.push({ url, method: req.method() });
    }
  });

  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/static/') || url.includes('/configs/')) {
      const status = resp.status();
      console.log(`[RES] ${url} -> ${status}`);
      if (status >= 400 && status < 500) {
        console.error(`[HTTP ERROR] ${url} -> ${status}`);
      }
    }
  });

  try {
    console.log('=== Loading IDE with basic auth ===');
    
    await page.authenticate({ username: 'c9sdk', password: 'password' });
    
    await page.goto('http://localhost:3399/', { 
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log(`\nPage URL: ${page.url()}`);
    
    await page.waitForTimeout(3000);
    
    console.log(`\n=== NETWORK LOGS (${networkLogs.length} requests) ===`);
    networkLogs.forEach(({url, method}) => console.log(`  ${method} ${url}`));
    
    console.log(`\n=== PAGE ERRORS (${pageErrors.length}) ===`);
    if (pageErrors.length > 0) {
      pageErrors.forEach(e => console.log(`  - ${e}`));
    } else {
      console.log('  No errors!');
    }
    
    try {
      const state = await page.evaluate(() => {
        let loadedKeys = [];
        try { loadedKeys = Object.keys(window.define?.loaded || {}); } catch(e) {}
        let modulesKeys = [];
        try { modulesKeys = Object.keys(window.define?.modules || {}); } catch(e) {}
        return {
          url: window.location.href,
          hasDefine: typeof define !== 'undefined',
          hasRequire: typeof window.require !== 'undefined',
          loadedKeys: loadedKeys.slice(0, 30),
          hasArchitect: typeof architect !== 'undefined',
          modulesKeys: modulesKeys.slice(0, 20),
          errorCount: pageErrors.length
        };
      });
      
      console.log(`\n=== PAGE STATE ===`);
      console.log(JSON.stringify(state, null, 2));
      
    } catch(e) {
      console.error(`[EVAL ERROR] ${e.message}`);
    }
    
  } catch (e) {
    console.error(`[CRASH] ${e.message}`);
  } finally {
    await browser.close();
  }
})();
