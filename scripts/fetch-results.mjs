// Server-side results fetcher (GitHub Actions). Writes accumulated results to
// Firebase (pools/_results, mirrored to pools/_feedcache) so every player's app
// reads reliable scores.
//
// Source: football-data.org (free tier covers the World Cup, needs a free API
//   token, provided via the FOOTBALL_DATA_TOKEN repo secret).

const DB = 'https://ribosmundial2026-default-rtdb.firebaseio.com';
const FEED = DB + '/pools/_results.json';
const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN || '';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const key = e => [norm(e.home), norm(e.away)].sort().join('|');
async function getJSON(url, headers) { const r = await fetch(url, { headers: headers || {} }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }

// ---- football-data.org (primary) ----
async function fromFootballData() {
  if (!FD_TOKEN) { console.log('No FOOTBALL_DATA_TOKEN set — skipping football-data.org'); return []; }
  const stageMap = { GROUP_STAGE: 'GROUP', LAST_32: 'R32', LAST_16: 'R16', QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', THIRD_PLACE: '3P', FINAL: 'F' };
  const j = await getJSON('https://api.football-data.org/v4/competitions/WC/matches?season=2026', { 'X-Auth-Token': FD_TOKEN });
  const out = (j.matches || []).map(m => {
    const fin = m.status === 'FINISHED';
    const ft = (m.score && m.score.fullTime) || {};
    return { home: m.homeTeam && (m.homeTeam.name || m.homeTeam.shortName), away: m.awayTeam && (m.awayTeam.name || m.awayTeam.shortName), hs: fin && ft.home != null ? ft.home : null, as: fin && ft.away != null ? ft.away : null, stage: stageMap[m.stage] || 'GROUP', fin, status: m.status, date: m.utcDate || null };
  }).filter(e => e.home && e.away);
  console.log('football-data.org -> ' + out.length + ' matches (' + out.filter(e => Number.isFinite(e.hs)).length + ' finished)');
  return out;
}

(async () => {
  let fresh = [];
  try { fresh = fresh.concat(await fromFootballData()); } catch (e) { console.log('football-data FAILED:', e.message); }

  // accumulate with whatever is already cached, so finished results never disappear
  let prev = [];
  try { const c = await getJSON(FEED); if (c && c.events) prev = Array.isArray(c.events) ? c.events : Object.values(c.events); } catch (e) {}
  const m = {};
  prev.forEach(e => { if (e && e.home) m[key(e)] = e; });
  fresh.forEach(e => { const k = key(e); const old = m[k]; const ns = Number.isFinite(e.hs) && Number.isFinite(e.as), os = old && Number.isFinite(old.hs) && Number.isFinite(old.as); if (!old || ns || !os) m[k] = e; });
  const events = Object.values(m);

  // `w:'srv'` marks this as a server (GitHub Action) write. Firebase rules require
  // this marker to write _results/_feedcache, so stale old-build browser tabs can
  // still read these nodes but can no longer clobber them with capped data.
  const body = JSON.stringify({ events, at: Date.now(), source: FD_TOKEN ? 'football-data' : 'thesportsdb', w: 'srv' });
  const put = await fetch(FEED, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
  if (!put.ok) throw new Error('Firebase PUT failed ' + put.status + ' ' + (await put.text()));
  console.log('Wrote ' + events.length + ' events (' + events.filter(e => Number.isFinite(e.hs)).length + ' with scores) to Firebase.');
  // Mirror to the legacy path so tabs still on the old build show correct scores too.
  try { await fetch(DB + '/pools/_feedcache.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
