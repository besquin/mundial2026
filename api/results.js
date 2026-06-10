// /api/results  —  Vercel serverless function
// Pulls FINISHED 2026 World Cup group-stage matches (with scores) so the client
// can score everyone automatically. No manual data entry anywhere.
//
//  • If env var FOOTBALL_DATA_TOKEN is set  -> uses football-data.org (most reliable)
//  • Otherwise                             -> falls back to TheSportsDB (keyless)
//
// Returns: { source, lastUpdated, matches:[{home,away,hs,as}] }   (scores as numbers)

const SEASON = "2026";

function grpOk() { return true; } // group is recomputed client-side from the official draw

async function fromFootballData(token) {
  const base = "https://api.football-data.org/v4/competitions/WC/matches?season=" + SEASON;
  const r = await fetch(base, { headers: { "X-Auth-Token": token } });
  if (!r.ok) throw new Error("football-data " + r.status);
  const j = await r.json();
  const matches = (j.matches || [])
    .filter(m => m.stage === "GROUP_STAGE" && m.status === "FINISHED" && m.score && m.score.fullTime)
    .map(m => ({
      home: m.homeTeam && (m.homeTeam.name || m.homeTeam.shortName),
      away: m.awayTeam && (m.awayTeam.name || m.awayTeam.shortName),
      hs: m.score.fullTime.home,
      as: m.score.fullTime.away
    }))
    .filter(m => m.home && m.away && m.hs != null && m.as != null);
  return { source: "football-data", matches };
}

async function fromSportsDB() {
  // FIFA World Cup league id on TheSportsDB = 4429
  const base = "https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=" + SEASON;
  const r = await fetch(base);
  if (!r.ok) throw new Error("thesportsdb " + r.status);
  const j = await r.json();
  const matches = (j.events || [])
    .filter(e => {
      const stage = (e.strStage || e.strGroup || e.strDescriptionEN || "");
      const isGroup = /group/i.test(stage) || (e.strGroup && e.strGroup.trim() !== "");
      return isGroup && e.intHomeScore != null && e.intAwayScore != null && e.intHomeScore !== "" && e.intAwayScore !== "";
    })
    .map(e => ({ home: e.strHomeTeam, away: e.strAwayTeam, hs: Number(e.intHomeScore), as: Number(e.intAwayScore) }))
    .filter(m => m.home && m.away && Number.isFinite(m.hs) && Number.isFinite(m.as));
  return { source: "thesportsdb", matches };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // cache at the edge so we never hammer the upstream API
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  let data = null;
  try {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (token) { try { data = await fromFootballData(token); } catch (e) { data = null; } }
    if (!data || !data.matches.length) {
      try { const sdb = await fromSportsDB(); if (sdb.matches.length || !data) data = sdb; } catch (e) { /* keep prior */ }
    }
    if (!data) data = { source: "none", matches: [] };
    data.lastUpdated = new Date().toISOString();
    res.status(200).json(data);
  } catch (e) {
    res.status(200).json({ source: "error", error: String(e), matches: [], lastUpdated: new Date().toISOString() });
  }
};
