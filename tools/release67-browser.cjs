const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const {chromium} = require('C:/Users/吴付城/Documents/Codex/2026-09-28/sv/work/site/tools/local-collector/node_modules/playwright-core');
const overlay = path.resolve(__dirname, '..'), original = 'C:/Users/吴付城/Documents/Codex/2026-09-28/sv/work/site';
const diagnose = process.argv.includes('--diagnose'), live = process.argv.includes('--live');
(async () => {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
    if (name.includes('..')) {res.writeHead(400); res.end(); return;}
    const file = [overlay, original].map(root => path.join(root, name)).find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!file) {res.writeHead(404); res.end(); return;}
    res.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript; charset=utf-8' : name.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
    res.end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({channel: 'msedge', headless: true});
    const page = await browser.newPage({viewport: {width: 390, height: 844}}), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      const u = new URL(route.request().url());
      const app = live ? u.hostname === 'ligexiao0-ops.github.io' : u.hostname === '127.0.0.1';
      const library = route.request().resourceType() === 'script' && ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'].includes(u.hostname);
      return app || library ? route.continue() : route.abort();
    });
    await page.goto(live ? 'https://ligexiao0-ops.github.io/liuhecai/?v=10101067' : 'http://127.0.0.1:' + server.address().port, {waitUntil: 'networkidle'});
    const result = await page.evaluate(() => {
      document.getElementById('loginOverlay').style.display = 'none';
      Object.keys(UP).filter(k => k.startsWith('te_')).forEach(k => {UP[k] = Array.isArray(UP[k]) ? [] : UP[k] && typeof UP[k] === 'object' ? {} : typeof UP[k] === 'boolean' ? false : '';});
      UP.te_pick_zods = ['虎']; UP.te_pick_heads = [1, 2, 4]; activeTab = 'te'; render();
      const copy = () => document.getElementById('copy-te')?.value || document.getElementById('copy-te')?.textContent || '';
      const snapshot = () => ({title: document.getElementById('appTitle').innerText, copy: copy(), scores: [17, 29, 41].map(n => ({n, s: scoreTE_full(n, calcTmOm(), calcT100()).s})), renderError: window.__lastRenderError});
      const normal = snapshot(), evidence = mathEvidenceNumber;
      // Force all three valid candidates below the old UI cutoff. Low scores must retain candidates.
      mathEvidenceNumber = (n, kind) => kind === 'te' ? {score: ({17:-3,29:-2,41:-1})[n] ?? -4, notes: []} : evidence(n, kind);
      render(); const lowScores = snapshot();
      UP.te_excl_nums = [17]; render(); const explicitExclusion = snapshot();
      UP.te_excl_nums = []; UP.te_pick_pool = [17]; render(); const narrow = snapshot();
      mathEvidenceNumber = evidence;
      const titles = [];
      for (const tab of ['rec', 'te', 'zm3', 'lx', 'rev']) {activeTab = tab; render(); titles.push(document.getElementById('appTitle').innerText);}
      let restrictions;
      if (window.APP_BUILD) {
        Object.keys(UP).filter(k => k.startsWith('te_')).forEach(k => {UP[k] = Array.isArray(UP[k]) ? [] : UP[k] && typeof UP[k] === 'object' ? {} : typeof UP[k] === 'boolean' ? false : '';});
        const combo = COMBOS.find(c => A49.some(c.fn) && A49.some(n => !c.fn(n)));
        const allowed = () => A49.filter(n => !scoreTE_full(n, calcTmOm(), calcT100()).hardExcluded);
        UP.te_pick_combos = [combo.k]; const pickCombo = allowed(), expected = A49.filter(combo.fn);
        UP.te_pick_combos = []; UP.te_excl_combos = [combo.k]; const excludeCombo = allowed();
        UP.te_excl_combos = []; UP.te_om10 = true; const omission = allowed(), counts = calcT100();
        restrictions = {pickCombo, expected, excludeCombo, opposite: A49.filter(n => !combo.fn(n)), omission, cold10: A49.slice().sort((a,b)=>(counts[a]||0)-(counts[b]||0)).slice(0,10).sort((a,b)=>a-b)};
        UP.te_om10 = false; UP.te_pick_zods = ['虎']; UP.te_pick_heads = [1,2,4]; activeTab = 'te'; render();
      }
      return {normal, lowScores, explicitExclusion, narrow, titles, restrictions, tracker: typeof ManualConstraintTracker, build: window.APP_BUILD};
    });
    console.log(JSON.stringify({live, diagnose, result, errors}, null, 2));
    if (!diagnose) {
      const nums = text => (text.match(/\d+/g) || []).map(Number).filter(n => n > 0 && n < 50);
      assert(result.titles.every(t => t.includes('v10.1010.67')), 'Rendered title reverted to an older release');
      assert.deepStrictEqual(nums(result.lowScores.copy), [41,29,17], 'Low automatic scores removed valid candidates or lost score priority');
      assert.deepStrictEqual(nums(result.explicitExclusion.copy), [41,29], 'User exclusion of 17 was not enforced');
      assert.deepStrictEqual(nums(result.narrow.copy), [17], 'Single candidate pool was not respected');
      assert.deepStrictEqual(result.restrictions.pickCombo, result.restrictions.expected, 'Explicit selected combo was ignored');
      assert.deepStrictEqual(result.restrictions.excludeCombo, result.restrictions.opposite, 'Explicit excluded combo was ignored');
      assert.deepStrictEqual(result.restrictions.omission, result.restrictions.cold10, 'Explicit omission restriction was ignored');
      assert(!errors.length, errors.join('\n'));
      assert(!result.normal.renderError, JSON.stringify(result.normal.renderError));
      await page.setViewportSize({width: 1440, height: 900});
      await page.evaluate(() => {activeTab = 'te'; render();});
      assert((await page.locator('#appTitle').innerText()).includes('v10.1010.67'), 'Desktop title mismatch');
      await page.screenshot({path: path.join(overlay, 'tools/release67-browser.png')});
      console.log('PASS: mobile and desktop final title; low-score candidates retained; explicit exclusions and candidate pool enforced; cloud/source data calls blocked.');
    }
  } finally {if (browser) await browser.close(); server.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
