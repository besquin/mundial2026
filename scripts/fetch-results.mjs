// Server-side results fetcher (GitHub Actions). Writes accumulated results to
// Firebase at pools/_feedcache so every player's app reads reliable scores.
//
// Primary source: football-data.org (free tier covers the World Cup, but needs a
//   free API token, provided via the FOOTBALL_DATA_TOKEN repo secret).
// Supplementary: TheSportsDB free key (only serves ~Matchday 1, used as backup).

const DB = 'https://ribosmundial2026-default-rtdb.firebaseio.com';
const FEED = DB + '/pools/_results.json';
const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const key = e => [norm(e.home), norm(e.away)].sort().join('|');
async function getJSON(url, headers) { const r = await fetch(url, { headers: headers || {} }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }

// ---- football-data.org (primary) ----
async function fromFootballData() {
  if (!FD_TOKEN) { console.log('No FOOTBALL_DATA_TOKEN set — skipping football-data.org'); return []; }
  const stageMap = { GROUP_STAGE: 'GROUP', LAST_16: 'R16', QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', THIRD_PLACE: '3P', FINAL: 'F' };
  const j = await getJSON('https://api.football-data.org/v4/competitions/WC/matches?season=2026', { 'X-Auth-Token': FD_TOKEN });
  const out = (j.matches || []).map(m => {
    const fin = m.status === 'FINISHED';
    const ft = (m.score && m.score.fullTime) || {};
    return { home: m.homeTeam && (m.homeTeam.name || m.homeTeam.shortName), away: m.awayTeam && (m.awayTeam.name || m.awayTeam.shortName), hs: fin && ft.home != null ? ft.home : null, as: fin && ft.away != null ? ft.away : null, stage: stageMap[m.stage] || 'GROUP', fin, status: m.status };
  }).filter(e => e.home && e.away);
  console.log('football-data.org -> ' + out.length + ' matches (' + out.filter(e => Number.isFinite(e.hs)).length + ' finished)');
  return out;
}

// ---- TheSportsDB (supplementary backup) ----
const SDB_KEY = '123', LEAGUE = '4429';
const FIN = new Set(['FT', 'AET', 'PEN', 'AP', 'FT_PEN', 'AWARDED', 'WO']);
const isFin = s => { s = String(s || '').toUpperCase().trim(); return FIN.has(s) || s.includes('FINISH'); };
function koStage(s) { s = String(s || '').toLowerCase(); if (s.includes('third') || s.includes('3rd')) return '3P'; if (s.includes('quarter')) return 'QF'; if (s.includes('semi')) return 'SF'; if (s.includes('16')) return 'R16'; if (s.includes('32')) return 'R32'; if (s.includes('final')) return 'F'; if (s.includes('group')) return 'GROUP'; return null; }
function koMs(e) { let ts = e.strTimestamp || ''; if (ts) { ts = ts.replace(' ', 'T'); if (!/[zZ]|[+]\d\d:?\d\d$/.test(ts)) ts += 'Z'; const t = Date.parse(ts); if (!isNaN(t)) return t; } return null; }
function mapSdb(e) {
  const st = koStage(e.strStage || e.strRound || e.strDescriptionEN || '') || 'GROUP';
  const rawH = e.intHomeScore, rawA = e.intAwayScore;
  const has = !(rawH === '' || rawH == null) && !(rawA === '' || rawA == null);
  const ms = koMs(e); const ended = ms != null && Date.now() > ms + 150 * 60000;
  const fin = isFin(e.strStatus) || (ended && has);
  const n = v => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v);
  return { home: e.strHomeTeam, away: e.strAwayTeam, hs: fin ? n(rawH) : null, as: fin ? n(rawA) : null, stage: st, fin, status: e.strStatus || null };
}
async function fromSportsDB() {
  const base = 'https://www.thesportsdb.com/api/v1/json/' + SDB_KEY + '/';
  const raw = []; const seen = new Set();
  for (const ep of ['eventspastleague.php?id=' + LEAGUE, 'eventsseason.php?id=' + LEAGUE + '&s=2026']) {
    try { const j = await getJSON(base + ep); (j && j.events || []).forEach(e => { if (String(e.idLeague) !== LEAGUE) return; const k = e.idEvent || (e.strHomeTeam + e.dateEvent); if (!seen.has(k)) { seen.add(k); raw.push(e); } }); } catch (e) { console.log('  sdb warn', ep, e.message); }
    await sleep(300);
  }
  const out = raw.map(mapSdb).filter(e => e.home && e.away);
  console.log('thesportsdb -> ' + out.length + ' matches (' + out.filter(e => Number.isFinite(e.hs)).length + ' finished)');
  return out;
}

(async () => {
  let fresh = [];
  try { fresh = fresh.concat(await fromFootballData()); } catch (e) { console.log('football-data FAILED:', e.message); }
  try { fresh = fresh.concat(await fromSportsDB()); } catch (e) { console.log('thesportsdb FAILED:', e.message); }

  // accumulate with whatever is already cached, so finished results never disappear
  let prev = [];
  try { const c = await getJSON(FEED); if (c && c.events) prev = Array.isArray(c.events) ? c.events : Object.values(c.events); } catch (e) {}
  const m = {};
  prev.forEach(e => { if (e && e.home) m[key(e)] = e; });
  fresh.forEach(e => { const k = key(e); const old = m[k]; const ns = Number.isFinite(e.hs) && Number.isFinite(e.as), os = old && Number.isFinite(old.hs) && Number.isFinite(old.as); if (!old || ns || !os) m[k] = e; });
  const events = Object.values(m);

  const body = JSON.stringify({ events, at: Date.now(), source: FD_TOKEN ? 'football-data' : 'thesportsdb' });
  const put = await fetch(FEED, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
  if (!put.ok) throw new Error('Firebase PUT failed ' + put.status + ' ' + (await put.text()));
  console.log('Wrote ' + events.length + ' events (' + events.filter(e => Number.isFinite(e.hs)).length + ' with scores) to Firebase.');
  // Mirror to the legacy path so tabs still on the old build show correct scores too.
  try { await fetch(DB + '/pools/_feedcache.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
