// Server-side results fetcher (runs in GitHub Actions, no browser/CORS limits).
// Pulls 2026 World Cup results from TheSportsDB and writes them, accumulated,
// into Firebase at pools/_feedcache so every player's app reads reliable scores.
// No secrets needed: the Firebase rules allow writes under /pools.

const KEY = '123';
const LEAGUE = '4429';
const DB = 'https://ribosmundial2026-default-rtdb.firebaseio.com';
const FEED = DB + '/pools/_feedcache.json';
const base = 'https://www.thesportsdb.com/api/v1/json/' + KEY + '/';

const FIN = new Set(['FT', 'AET', 'PEN', 'AP', 'FT_PEN', 'AWARDED', 'WO']);
const isFin = s => { s = String(s || '').toUpperCase().trim(); return FIN.has(s) || s.includes('FINISH'); };
function koStage(s) { s = String(s || '').toLowerCase(); if (s.includes('third') || s.includes('3rd')) return '3P'; if (s.includes('quarter')) return 'QF'; if (s.includes('semi')) return 'SF'; if (s.includes('16')) return 'R16'; if (s.includes('32')) return 'R32'; if (s.includes('final')) return 'F'; if (s.includes('group')) return 'GROUP'; return null; }
function koMs(e) { let ts = e.strTimestamp || ''; if (ts) { ts = ts.replace(' ', 'T'); if (!/[zZ]|[+]\d\d:?\d\d$/.test(ts)) ts += 'Z'; const t = Date.parse(ts); if (!isNaN(t)) return t; } if (e.dateEvent) { const t = Date.parse(e.dateEvent + 'T' + (e.strTime || '00:00:00') + 'Z'); if (!isNaN(t)) return t; } return null; }
function mapEv(e) {
  let st = koStage(e.strStage || e.strRound || e.strDescriptionEN || '') || 'GROUP'; // client validates vs real fixtures
  const rawH = e.intHomeScore, rawA = e.intAwayScore;
  const has = !(rawH === '' || rawH == null) && !(rawA === '' || rawA == null);
  const ms = koMs(e); const ended = ms != null && Date.now() > ms + 150 * 60000;
  const fin = isFin(e.strStatus) || (ended && has);
  const n = v => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v);
  return { home: e.strHomeTeam, away: e.strAwayTeam, hs: fin ? n(rawH) : null, as: fin ? n(rawA) : null, stage: st, fin, status: e.strStatus || null };
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const key = e => [norm(e.home), norm(e.away)].sort().join('|');

async function getJSON(url) { const r = await fetch(url, { headers: { 'User-Agent': 'wc26-pool' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const raw = []; const seen = new Set();
  const add = j => { let n = 0; (j && j.events || []).forEach(e => { if (String(e.idLeague) !== LEAGUE) return; n++; const k = e.idEvent || (e.strHomeTeam + e.strAwayTeam + e.dateEvent); if (!seen.has(k)) { seen.add(k); raw.push(e); } }); return n; };
  const endpoints = ['eventspastleague.php?id=' + LEAGUE, 'eventsnextleague.php?id=' + LEAGUE, 'eventsseason.php?id=' + LEAGUE + '&s=2026', 'eventsseason.php?id=' + LEAGUE + '&s=2025-2026'];
  const day = 86400000;
  for (let off = -3; off <= 1; off++) endpoints.push('eventsday.php?d=' + new Date(Date.now() + off * day).toISOString().slice(0, 10) + '&l=' + encodeURIComponent('FIFA World Cup'));
  for (const ep of endpoints) {
    try { const j = await getJSON(base + ep); const n = add(j); console.log('  ' + ep + ' -> ' + (j && j.events ? j.events.length : 0) + ' events (' + n + ' WC)'); }
    catch (e) { console.log('  FAIL ' + ep + ' : ' + e.message); }
    await sleep(400);   // be gentle on the shared key
  }

  const mapped = raw.map(mapEv).filter(e => e.home && e.away);
  const scoredNow = mapped.filter(e => Number.isFinite(e.hs) && Number.isFinite(e.as));
  console.log('Fetched ' + raw.length + ' WC events, ' + scoredNow.length + ' with scores. Recent scored:');
  scoredNow.slice(-8).forEach(e => console.log('   ' + e.home + ' ' + e.hs + '-' + e.as + ' ' + e.away));

  // accumulate: merge with whatever is already cached so finished results never disappear
  let prev = [];
  try { const c = await getJSON(FEED); if (c && c.events) prev = Array.isArray(c.events) ? c.events : Object.values(c.events); } catch (e) {}
  const m = {};
  prev.forEach(e => { if (e && e.home) m[key(e)] = e; });
  mapped.forEach(e => { const k = key(e); const old = m[k]; const ns = Number.isFinite(e.hs) && Number.isFinite(e.as), os = old && Number.isFinite(old.hs) && Number.isFinite(old.as); if (!old || ns || !os) m[k] = e; });
  const events = Object.values(m);

  const put = await fetch(FEED, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events, at: Date.now(), source: 'github-action' }) });
  if (!put.ok) throw new Error('Firebase PUT failed ' + put.status + ' ' + (await put.text()));
  const scored = events.filter(e => Number.isFinite(e.hs)).length;
  console.log('Wrote ' + events.length + ' events (' + scored + ' with scores) to Firebase.');
})().catch(e => { console.error(e); process.exit(1); });
