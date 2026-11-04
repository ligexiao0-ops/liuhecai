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
    await page.goto(live ? 'https://ligexiao0-ops.github.io/liuhecai/?v=10101082' : 'http://127.0.0.1:' + server.address().port, {waitUntil: 'domcontentloaded',timeout:60000});
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

    const revision=await page.evaluate(()=>{
      activeTab='te';UP.practice_forecasts=[];render();
      const wide=()=>UP.practice_forecasts.filter(r=>r.arm==='fixed'&&r.strategy==='wide24'&&r.modelVersion==='10101080');
      const original=wide().at(-1),count=wide().length;render();const stable=wide().length===count;
      const before=DR.at(-1).t;DR.at(-1).t=A49.find(n=>n!==before&&!DR.at(-1).n.includes(n));calcDerived();render();
      const corrected=wide().at(-1),correctionCount=wide().length;
      DR.push({p:DR.at(-1).p+1,d:'11/02',n:[4,9,16,22,36,45],t:48});calcDerived();render();
      const next=wide().at(-1),text=document.getElementById('practice-panel').textContent;
      DR.pop();DR.at(-1).t=before;calcDerived();render();
      return {count,stable,correctionCount,original,corrected,next,text:text.includes('对比第'+original.targetPeriod+'期原存范围'),preserved:wide().some(r=>r.recordId===original.recordId)};
    });
    assert(revision.stable&&revision.count===1&&revision.correctionCount===2&&revision.preserved&&revision.text);
    assert(revision.original.sourceFingerprint!==revision.corrected.sourceFingerprint);
    assert(revision.next.sourcePeriod===revision.original.sourcePeriod+1&&revision.next.targetPeriod===revision.original.targetPeriod+1);
    assert(revision.original.pool.length===24&&revision.next.pool.length===24);
    console.log('PASS independent 24: same-period stable, corrected same-period data creates a revision, new period recalculates with visible comparison; original records preserved');
    const range=await page.evaluate(()=>{
      for(const key of Object.keys(UP).filter(k=>k.startsWith('lx_')))UP[key]=Array.isArray(UP[key])?[]:typeof UP[key]==='boolean'?false:typeof UP[key]==='number'?0:'';
      activeTab='lx';render();
      const input=document.getElementById('lx-grp-input');input.value='【鼠牛虎兔龙蛇】选2-4个\n【马羊猴鸡狗猪】选2-4个';
      document.querySelector('[data-action="saveGrpLimits"]').click();
      const rules=JSON.parse(JSON.stringify(UP.lx_grp_limits)),p5=planReasonLx(DR,5,{window:30,dir:'hot'}),p4=planReasonLx(DR,4,{window:30,dir:'hot'}),p3=planReasonLx(DR,3,{window:30,dir:'hot'});
      const ctx=getPracticeContext(),saved=(UP.practice_forecasts||[]).filter(r=>r.sourcePeriod===DR.at(-1).p&&r.arm==='filtered'&&r.game==='lx'&&ComboLimits.allowed(r.pool,rules));
      const now=PracticeEngine.build(ctx).groups.filter(g=>g.game==='lx');
      UP.lx_force_zods=['鼠','牛','虎','兔','龙'];render();const forcedText=document.getElementById('tabContent').innerText,error=window.__lastRenderError;
      UP.lx_force_zods=[];UP.lx_grp_limits=[];render();
      return {rules,best5:p5.best?.zs,best4:p4.best?.zs,best3:p3.best?.zs,valid:now.every(g=>ComboLimits.allowed(g.pool,rules)),saved: saved.map(r=>r.pool),error,forceRejected:!getPracticeContext().lxValid(['鼠','牛','虎','兔','龙'])};
    });
    assert.equal(range.rules.length,2);assert(range.rules.every(r=>r.min===2&&r.max===4));assert(range.best5&&range.best4&&!range.best3&&range.valid);assert(!range.error);
    console.log('PASS real LX UI saves multiple lower/upper bounds; 5/4-link candidates valid and impossible 3-link has no fallback',JSON.stringify(range));

    const copies=await page.evaluate(()=>{activeTab='lx';render();return [...document.querySelectorAll('#zodiac-copy75 [data-zodiac-copy75]')].map(b=>b.dataset.zodiacCopy75);});assert.equal(copies.length,24);assert(copies.every(t=>/^\d{1,2},\d{1,2}$/.test(t)));

    const natural=await page.evaluate(()=>{
      for(const k of Object.keys(UP).filter(k=>/^te_|^zm3_/.test(k)))UP[k]=Array.isArray(UP[k])?[]:typeof UP[k]==='object'?{}:typeof UP[k]==='boolean'?false:'';
      activeTab='te';render();document.getElementById('nl-te').value='不要红波；只选虎；头数124';applyTeNL();
      const excluded=UP.te_excl_nums.slice(),chosen=UP.te_pick_zods.slice(),pool=UP.te_pick_pool.slice();
      const tePanel=document.createElement('div');tePanel.innerHTML=commonZodiacNumbers('te');const tePayload=JSON.parse(tePanel.querySelector('[data-action-payload]').dataset.actionPayload);
      const zPanel=document.createElement('div');zPanel.innerHTML=commonZodiacNumbers('zm');const zPayload=JSON.parse(zPanel.querySelector('[data-action-payload]').dataset.actionPayload);
      UP.te_excl_nums=[];UP.te_pick_zods=[];UP.te_pick_pool=[];tePanel.querySelector('[data-practical="pick"]').click();
      // Detached nodes don't reach document listeners: attach a test host before clicking.
      tePanel.id='test-bulk76';document.body.appendChild(tePanel);tePanel.querySelector('[data-practical="pick"]').click();const teSelected=UP.te_pick_pool.slice();tePanel.remove();
      activeTab='zm3';render();zPanel.id='test-bulk-z76';document.body.appendChild(zPanel);zPanel.querySelector('[data-practical="pick"]').click();const zSelected=UP.zm3_pick_pool.slice();zPanel.remove();
      const ids=[...document.querySelectorAll('[id]')].map(x=>x.id),duplicateNL=ids.filter((id,i)=>id.startsWith('nl-')&&ids.indexOf(id)!==i);
      const before=JSON.stringify(UP.zm3_excl_zods);parseNLInput('排除鼠；无法识别的玄学条件','zm3');const atomic=before===JSON.stringify(UP.zm3_excl_zods);
      UP.zm3_pick_pool=[];UP.zm3_excl_zods=[];UP.te_pick_pool=[];render();
      return {excluded,red:A49.filter(n=>gwv(n)==='红'),chosen,pool,tePayload,zPayload,teSelected,zSelected,duplicateNL,atomic};
    });
    assert.deepEqual(natural.excluded,natural.red);assert.deepEqual(natural.chosen,['虎']);assert(natural.pool.every(n=>[1,2,4].includes(Math.floor(n/10))));assert.equal(natural.tePayload.pool.length,24);assert.equal(natural.zPayload.pool.length,24);assert.deepEqual(natural.teSelected,natural.tePayload.pool);assert.deepEqual(natural.zSelected,natural.zPayload.pool);assert(!natural.duplicateNL.length&&natural.atomic);console.log('PASS real Chinese input, no negative-selection inversion, all-24 bulk TE/normal application, unique input IDs and atomic unknown-text handling');


    const historyCheck=await page.evaluate(()=>{activeTab='te';render();const before=UP.practice_forecasts.length,source=UP.practice_forecasts.find(r=>r.arm==='fixed'&&r.strategy==='attribute-波色');if(!source)throw Error('No wave forecast');const old={...source,recordId:'test-old79',sourcePeriod:DR.at(-2).p,targetPeriod:DR.at(-1).p,modelVersion:'test-old-model',pool:[DR.at(-1).t]};UP.practice_forecasts.push(old);render();const text=document.getElementById('practice-panel').textContent;return {kept:UP.practice_forecasts.some(r=>r.recordId==='test-old79'),text:text.includes('test-old-model · 1项：准1/1组'),baseline:text.includes('均匀随机覆盖基准')&&text.includes('当前算法历史逐期试算')&&text.includes('历史试算')&&text.includes('查看本属性／范围最近10期试算准错'),noBackfill:UP.practice_forecasts.filter(r=>r.recordId==='test-old79').length===1};});assert(historyCheck.kept&&historyCheck.text&&historyCheck.baseline&&historyCheck.noBackfill);console.log('PASS original saved legacy-version/width outcomes remain visible, not backfilled or mixed; current attribute widths labeled');


    const required=await page.evaluate(()=>{for(const k of Object.keys(UP).filter(k=>k.startsWith('lx_')))UP[k]=Array.isArray(UP[k])?[]:typeof UP[k]==='boolean'?false:typeof UP[k]==='number'?0:'';activeTab='lx';render();document.getElementById('lx-any82').value='鼠牛';document.querySelector('[data-any82="atleast"]').click();const rule=JSON.parse(JSON.stringify(UP.lx_grp_limits.at(-1))),best=planReasonLx(DR,5,{window:30,dir:'hot'}).best?.zs;document.getElementById('lx-any82').value='鼠牛';document.querySelector('[data-any82="exact"]').click();const exact=JSON.parse(JSON.stringify(UP.lx_grp_limits.at(-1))),exactBest=planReasonLx(DR,5,{window:30,dir:'hot'}).best?.zs;UP.lx_grp_limits=[];render();return {rule,best,exact,exactBest};});assert.equal(required.rule.min,1);assert.equal(required.rule.max,2);assert(required.best.some(z=>['鼠','牛'].includes(z)));assert.equal(required.exact.max,1);assert.equal(required.exactBest.filter(z=>['鼠','牛'].includes(z)).length,1);console.log('PASS actual LX required-choice buttons constrain generated five-zodiac combinations correctly');

    const navigation=await page.evaluate(async()=>{
      const pause=()=>new Promise(r=>setTimeout(r,400));activeTab='te';render();await pause();
      const fold=document.querySelector('#practice-panel details'),title=fold.querySelector('summary').textContent;
      const find=()=>[...document.querySelectorAll('#practice-panel details')].find(d=>d.querySelector('summary')?.textContent===title);
      if(!fold.open){fold.querySelector('summary').click();await pause();}fold.querySelector('summary').click();await pause();const closedByUser=!find().open;
      render();await pause();const afterRender=!find().open;
      window.scrollTo(0,1250);await pause();const savedY=scrollY;
      activeTab='zm3';render();await pause();activeTab='te';render();await pause();const afterTabs=!find().open,tabY=scrollY;
      const b=document.querySelector('#practice-panel [data-practical="save"]');b.click();await pause();const afterSave=!find().open,actionY=scrollY;
      activeTab='zm3';Object.keys(UP).filter(k=>k.startsWith('zm3_')).forEach(k=>{UP[k]=Array.isArray(UP[k])?[]:UP[k]&&typeof UP[k]==='object'?{}:typeof UP[k]==='boolean'?false:'';});UP.exactTailOnly=false;UP.tailStudyMode='all';render();await pause();
      document.querySelector('[data-one-zodiac70]').click();await pause();const pool=(UP.practice_forecasts||[]).filter(r=>r.strategy==='one-zodiac-pool').at(-1)?.pool;
      const triples=(UP.practice_forecasts||[]).filter(r=>r.strategy.startsWith('one-zodiac-triple-')).slice(-3).map(r=>r.pool);
      const openAfterGenerate=document.getElementById('one-zodiac70').open;render();await pause();const openAfterRender=document.getElementById('one-zodiac70').open;
      UP.zm3_excl_zods=['鼠'];render();await pause();document.querySelector('[data-one-zodiac70]').click();await pause();const restricted=(UP.practice_forecasts||[]).filter(r=>r.strategy==='one-zodiac-pool').at(-1)?.pool,restrictedOk=restricted?.every(n=>gz(n)!=='鼠');
      UP.zm3_excl_zods=[];render();await pause();const textarea=document.getElementById('z3-random-custom70');textarea.value='01，07，13，20，25，32';document.getElementById('z3-random-count').value=6;z3RandomPick('custom');await pause();const custom=(UP.practice_forecasts||[]).filter(r=>r.strategy==='random-triples-batch').slice(-6).map(r=>r.pool);
      return {title,closedByUser,afterRender,afterTabs,afterSave,savedY,tabY,actionY,pool,uniqueZodiacs:new Set(pool.map(gz)).size,triples,openAfterGenerate,openAfterRender,restricted,restrictedOk,custom,sourceButtons:[...document.querySelectorAll('#random-triples69-panel button[onclick]')].map(b=>b.textContent)};
    });
    assert(navigation.closedByUser&&navigation.afterRender&&navigation.afterTabs&&navigation.afterSave,'Late-built forecast fold reopened');
    assert(Math.abs(navigation.savedY-navigation.tabY)<6&&Math.abs(navigation.savedY-navigation.actionY)<6,'Scroll position changed on tab return or save');
    assert.equal(navigation.pool.length,12);assert.equal(navigation.uniqueZodiacs,12);assert.equal(navigation.triples.length,3);assert(navigation.triples.every(ns=>ns.length===3&&ns.every(n=>navigation.pool.includes(n))));
    assert(navigation.openAfterGenerate&&navigation.openAfterRender);assert.equal(navigation.restricted.length,11);assert(navigation.restrictedOk);
    assert.equal(navigation.custom.length,6);assert(navigation.custom.every(ns=>ns.every(n=>[1,7,13,20,25,32].includes(n))));assert.equal(navigation.sourceButtons.length,4);
    console.log('PASS late-panel folds, page scroll memory, one-per-zodiac predictions and all four random sources',JSON.stringify(navigation));
    console.log(JSON.stringify({live, diagnose, result, errors}, null, 2));
    if (!diagnose) {
      const nums = text => (text.match(/\d+/g) || []).map(Number).filter(n => n > 0 && n < 50);
      assert(result.titles.every(t => t.includes('v10.1010.82')), 'Rendered title reverted to an older release');
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
      assert((await page.locator('#appTitle').innerText()).includes('v10.1010.82'), 'Desktop title mismatch');
      await page.evaluate(()=>{activeTab='zm3';render();document.getElementById('random-triples69-panel').scrollIntoView();});await page.screenshot({path: path.join(overlay, 'tools/release76-regression.png')});
      await page.reload({waitUntil:'domcontentloaded',timeout:60000});
      const persisted=await page.evaluate(async title=>{document.getElementById('loginOverlay').style.display='none';activeTab='te';render();await new Promise(r=>setTimeout(r,400));const d=[...document.querySelectorAll('#practice-panel details')].find(d=>d.querySelector('summary')?.textContent===title);return d&&!d.open;},navigation.title);
      assert(persisted,'Collapsed forecast panel reopened after page reload');console.log('PASS fold preference survives full page reload');

      console.log('PASS: mobile and desktop final title; low-score candidates retained; explicit exclusions and candidate pool enforced; cloud/source data calls blocked.');
    }
  } finally {if (browser) await browser.close(); server.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
