// One-shot diagnostic: reports the current state of the results nodes and tests
// whether the Firebase rules actually reject an UNMARKED write (the clobber that
// stale old-build browser tabs perform). Run via the "Diagnose results" workflow.

const DB = 'https://ribosmundial2026-default-rtdb.firebaseio.com';
const get = async p => { const r = await fetch(DB + p + '.json'); return r.ok ? r.json() : null; };
const evs = o => { if (!o || !o.events) return []; return Array.isArray(o.events) ? o.events : Object.values(o.events); };
const scored = a => a.filter(e => e && Number.isFinite(e.hs) && Number.isFinite(e.as)).length;

(async () => {
  const res = await get('/pools/_results');
  const fc = await get('/pools/_feedcache');
  const rE = evs(res), fE = evs(fc);
  console.log('=== CURRENT STATE ===');
  console.log('_results  : ' + rE.length + ' events, ' + scored(rE) + ' scored, marker w=' + (res && res.w) + ', at=' + (res && new Date(res.at).toISOString()));
  console.log('_feedcache: ' + fE.length + ' events, ' + scored(fE) + ' scored, marker w=' + (fc && fc.w) + ', at=' + (fc && new Date(fc.at).toISOString()));

  // Simulate the stale old-build clobber: an UNMARKED write (no w field).
  // Body carries the CORRECT events so that IF it somehow succeeds, no harm is done.
  const body = JSON.stringify({ events: rE, at: Date.now(), source: 'diag-unmarked-test' });
  const put = await fetch(DB + '/pools/_feedcache.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
  console.log('\n=== RULE TEST (unmarked write to _feedcache) ===');
  console.log('HTTP ' + put.status + ' ' + (put.ok ? 'ACCEPTED  <-- RULES NOT BLOCKING (cascade bug: remove .write:true from the pools node)' : 'REJECTED  <-- rules are working; old tabs can no longer clobber'));
  if (!put.ok) console.log('  body: ' + (await put.text()).slice(0, 200));
})().catch(e => { console.error(e); process.exit(1); });
