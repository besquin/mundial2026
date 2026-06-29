// One-shot diagnostic: dumps the stage breakdown the football-data feed returns
// and what's currently stored in Firebase, so we can see how knockout rounds are
// labeled. Run via the "Diagnose results" workflow.

const DB = 'https://ribosmundial2026-default-rtdb.firebaseio.com';
const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN || '';
const get = async (u, h) => { const r = await fetch(u, { headers: h || {} }); return r.ok ? r.json() : null; };
const evs = o => { if (!o || !o.events) return []; return Array.isArray(o.events) ? o.events : Object.values(o.events); };

(async () => {
  // 1) Raw football-data stage breakdown
  if (FD_TOKEN) {
    const j = await get('https://api.football-data.org/v4/competitions/WC/matches?season=2026', { 'X-Auth-Token': FD_TOKEN });
    const ms = (j && j.matches) || [];
    const byStage = {};
    ms.forEach(m => { byStage[m.stage] = (byStage[m.stage] || 0) + 1; });
    console.log('=== football-data RAW stage counts (' + ms.length + ' matches) ===');
    Object.entries(byStage).forEach(([s, n]) => console.log('  ' + s + ': ' + n));
    console.log('\n=== sample non-group matches ===');
    ms.filter(m => m.stage !== 'GROUP_STAGE').slice(0, 12).forEach(m => {
      const h = m.homeTeam && (m.homeTeam.name || m.homeTeam.shortName);
      const a = m.awayTeam && (m.awayTeam.name || m.awayTeam.shortName);
      console.log('  [' + m.stage + '] ' + (h || 'TBD') + ' vs ' + (a || 'TBD') + ' | ' + m.status + ' | ' + m.utcDate);
    });
  } else console.log('No FOOTBALL_DATA_TOKEN');

  // 2) What's stored in Firebase _results
  const res = await get(DB + '/pools/_results.json');
  const e = evs(res);
  const st = {};
  e.forEach(x => { st[x.stage] = (st[x.stage] || 0) + 1; });
  console.log('\n=== _results stored stage counts (' + e.length + ' events) ===');
  Object.entries(st).forEach(([s, n]) => console.log('  ' + s + ': ' + n));
  console.log('sample stored non-group:', JSON.stringify(e.filter(x => x.stage !== 'GROUP').slice(0, 6)));
})().catch(e => { console.error(e); process.exit(1); });
