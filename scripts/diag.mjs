// One-shot diagnostic: list every knockout match football-data returns and what
// we've stored, so we can see whether later rounds (incl. the Final) already carry
// real teams/scores — which would make the entry bracket mark them as played.

const DB = 'https://ribosmundial2026-default-rtdb.firebaseio.com';
const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN || '';
const get = async (u, h) => { const r = await fetch(u, { headers: h || {} }); return r.ok ? r.json() : null; };
const evs = o => { if (!o || !o.events) return []; return Array.isArray(o.events) ? o.events : Object.values(o.events); };

(async () => {
  if (FD_TOKEN) {
    const j = await get('https://api.football-data.org/v4/competitions/WC/matches?season=2026', { 'X-Auth-Token': FD_TOKEN });
    const ms = (j && j.matches) || [];
    console.log('=== football-data knockout rounds (raw) ===');
    ms.filter(m => m.stage !== 'GROUP_STAGE').forEach(m => {
      const h = (m.homeTeam && (m.homeTeam.name || m.homeTeam.shortName)) || 'TBD';
      const a = (m.awayTeam && (m.awayTeam.name || m.awayTeam.shortName)) || 'TBD';
      const ft = (m.score && m.score.fullTime) || {};
      console.log('  [' + m.stage + '] ' + h + ' ' + (ft.home ?? '-') + ' v ' + (ft.away ?? '-') + ' ' + a + ' | ' + m.status);
    });
  }
  const res = await get(DB + '/pools/_results.json');
  const e = evs(res);
  console.log('\n=== stored non-group events (stage | pair | scores | status) ===');
  e.filter(x => x.stage !== 'GROUP').forEach(x => console.log('  ' + x.stage + ' | ' + x.home + ' ' + (x.hs ?? '-') + '-' + (x.as ?? '-') + ' ' + x.away + ' | ' + x.status));
})().catch(e => { console.error(e); process.exit(1); });
