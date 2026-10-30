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
    await page.goto(live ? 'https://ligexiao0-ops.github.io/liuhecai/?v=10101069' : 'http://127.0.0.1:' + server.address().port, {waitUntil: 'domcontentloaded',timeout:60000});
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
    const exact = await page.evaluate(() => {
      activeTab='zm3';
      Object.keys(UP).filter(k=>k.startsWith('zm3_')).forEach(k=>{UP[k]=Array.isArray(UP[k])?[]:UP[k]&&typeof UP[k]==='object'?{}:typeof UP[k]==='boolean'?false:'';});
      UP.tailStudyMode='all'; UP.exactTripleMode='auto'; UP.exactTailOnly=false;
      render();
      const read=()=>[...document.querySelectorAll('[data-exact-group="z3"]')].map(el=>el.dataset.exactPool.split(',').map(Number));
      const full=read(),panel=document.getElementById('exact-combo-panel');
      const last=DR.at(-1), outside=A49.filter(n=>{const d=(n%10-last.t%10+10)%10;return d>3&&d<7;}).slice(0,5);
      UP.zm3_pick_pool=outside;render();const outsideGroups=read();
      UP.exactTailOnly=true;render();const hardTail=read();
      UP.exactTailOnly=false;UP.zm3_pick_pool=[];render();
      const recs=(UP.practice_forecasts||[]).filter(r=>r.modelVersion==='10101068'&&r.game==='z3'&&r.strategy.startsWith('exact-'));
      const count=recs.length;render();const countAfter=(UP.practice_forecasts||[]).filter(r=>r.modelVersion==='10101068'&&r.game==='z3'&&r.strategy.startsWith('exact-')).length;
      return {full,outside,outsideGroups,hardTail,count,countAfter,states:recs.every(r=>r.sourcePeriod===last.p&&r.targetPeriod===last.p+1),text:panel?.innerText.includes('三路整组观察')};
    });
    assert.equal(exact.full.length,3);assert(exact.full.every(ns=>ns.length===3));
    assert(exact.text);assert(exact.outsideGroups.length>0);assert(exact.outsideGroups.every(ns=>ns.every(n=>exact.outside.includes(n))));
    assert.equal(exact.hardTail.length,0);assert(exact.states&&exact.count>0);assert.equal(exact.count,exact.countAfter);
    console.log('PASS exact triple UI: three routes; outside-tail user pool retained; explicit tail-only gives no solution; forecast periods and redraw dedupe',JSON.stringify(exact));
    const batch=await page.evaluate(async()=>{
      activeTab='zm3'; UP.exactTailOnly=false;UP.tailStudyMode='all';UP.zm3_pick_pool=[1,2,3,4,5];UP.zm3_excl_nums=[];UP.zm3_group_limits=[{pool:[1,2,3],max:2}];render();
      document.getElementById('z3-random-count').value='6';
      const el=document.getElementById('z3-random-result');el.scrollIntoView({block:'center'});const beforeY=scrollY;
      z3RandomPick('pool'); const afterY=scrollY;
      let records=(UP.practice_forecasts||[]).filter(r=>r.strategy==='random-triples-batch');const generated=records.slice(-6).map(r=>r.pool),firstTarget=records.at(-1)?.targetPeriod;
      render();const retained=document.querySelectorAll('[data-random69-group]').length,limit=UP.zm3_group_limits.slice();
      const button=document.querySelector('#z3-random-result [data-practical="exclude-combination"]');window.scrollTo(0,1300);const y=scrollY;button.click();await new Promise(r=>setTimeout(r,350));const afterAction=scrollY,groupCap=UP.zm3_group_limits.length,excluded=UP.zm3_excl_nums.slice();
      UP.zm3_group_limits=limit;activeTab='stats';render();const stat=document.getElementById('draw-frequency69');const statsText=stat?.innerText||'';const monthCount=document.querySelectorAll('[data-frequency69-month] option').length;
      const original=DR;const last=DR.at(-1);DR=DR.concat({p:firstTarget,d:'10/30',n:[1,2,3,4,5,6],t:7});activeTab='zm3';calcDerived();render();const historyText=document.getElementById('z3-random-result')?.innerText;const oldCount=(UP.practice_forecasts||[]).filter(r=>r.strategy==='random-triples-batch').length;
      DR=original;calcDerived();activeTab='zm3';render();const countAfterReturn=(UP.practice_forecasts||[]).filter(r=>r.strategy==='random-triples-batch').length;
      return {generated,beforeY,afterY,retained,y,afterAction,groupCap,excluded,monthCount,statsText:statsText.slice(0,600),historyText:historyText?.slice(0,500),oldCount,countAfterReturn};
    });
    assert.equal(batch.generated.length,6);assert.equal(new Set(batch.generated.map(ns=>ns.join(','))).size,6);
    assert(batch.generated.every(ns=>ns.length===3&&ns.every(n=>n>=1&&n<=5)&&ns.join(',')!=='1,2,3'));
    assert.equal(batch.retained,6);assert.equal(batch.excluded.length,0);assert(batch.groupCap>=2);
    assert(Math.abs(batch.y-batch.afterAction)<6);assert.equal(batch.oldCount,batch.countAfterReturn);
    assert(batch.monthCount>0);assert(batch.statsText.includes('重复出现次数')&&batch.statsText.includes('正码＋特码'));assert(batch.historyText.includes('中3个'));
    console.log('PASS batch persistence, constraints, whole-group action, scroll position, outcome review and monthly/recent statistics',JSON.stringify(batch));
    console.log(JSON.stringify({live, diagnose, result, errors}, null, 2));
    if (!diagnose) {
      const nums = text => (text.match(/\d+/g) || []).map(Number).filter(n => n > 0 && n < 50);
      assert(result.titles.every(t => t.includes('v10.1010.69')), 'Rendered title reverted to an older release');
      assert.deepStrictEqual(nums(result.lowScores.copy), [41,29,17], 'Low automatic scores removed valid candidates or lost score priority');
      assert.deepStrictEqual(nums(result.explicitExclusion.copy), [41,29], 'User exclusion of 17 was not enforced');
      assert.deepStrictEqual(nums(result.narrow.copy), [17], 'Single candidate pool was not respected');
      assert.deepStrictEqual(result.restrictions.pickCombo, result.restrictions.expected, 'Explicit selected combo was ignored');
      assert.deepStrictEqual(result.restrictions.excludeCombo, result.restrictions.opposite, 'Explicit excluded combo was ignored');
      assert.deepStrictEqual(result.restrictions.omission, result.restrictions.cold10, 'Explicit omission restriction was ignored');
      assert(!errors.length, errors.join('\n'));
      assert(!result.normal.renderError, JSON.stringify(result.normal.renderError));
      await page.setViewportSize({width: 1440, height: 900});
      await page.evaluate(() => {activeTab = 'zm3'; render();});
      assert((await page.locator('#appTitle').innerText()).includes('v10.1010.69'), 'Desktop title mismatch');
      await page.evaluate(()=>{activeTab='stats';render();document.getElementById('draw-frequency69').scrollIntoView();});await page.screenshot({path: path.join(overlay, 'tools/release69-browser.png')});
      console.log('PASS: mobile and desktop final title; low-score candidates retained; explicit exclusions and candidate pool enforced; cloud/source data calls blocked.');
    }
  } finally {if (browser) await browser.close(); server.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
