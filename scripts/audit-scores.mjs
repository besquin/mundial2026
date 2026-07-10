// One-shot AUDIT: reads the real entries + results from Firebase and recomputes
// every player's score using the SAME logic as index.html (ported verbatim), so
// we can spot mis-scored entries. Read-only. Run via the "Audit scores" workflow.

const DB = 'https://ribosmundial2026-default-rtdb.firebaseio.com';
const get = async p => { const r = await fetch(DB + p + '.json'); return r.ok ? r.json() : null; };

/* ---- ported constants/logic from index.html ---- */
const CONFIG = { scoring: { match:1, exactScore:2, first:2, second:1, wildcard:2, r16:2, qf:4, sf:8, finalist:12, champion:20, third:8, matchupBonus:3 } };
const GROUPS = {
  A:[["MEX","Mexico"],["RSA","South Africa"],["KOR","South Korea"],["CZE","Czechia"]],
  B:[["CAN","Canada"],["BIH","Bosnia & Herz."],["QAT","Qatar"],["SUI","Switzerland"]],
  C:[["BRA","Brazil"],["HAI","Haiti"],["MAR","Morocco"],["SCO","Scotland"]],
  D:[["USA","United States"],["AUS","Australia"],["PAR","Paraguay"],["TUR","Türkiye"]],
  E:[["GER","Germany"],["CIV","Ivory Coast"],["ECU","Ecuador"],["CUW","Curaçao"]],
  F:[["NED","Netherlands"],["JPN","Japan"],["SWE","Sweden"],["TUN","Tunisia"]],
  G:[["BEL","Belgium"],["EGY","Egypt"],["IRN","Iran"],["NZL","New Zealand"]],
  H:[["ESP","Spain"],["URU","Uruguay"],["CPV","Cape Verde"],["SAU","Saudi Arabia"]],
  I:[["FRA","France"],["SEN","Senegal"],["NOR","Norway"],["IRQ","Iraq"]],
  J:[["ARG","Argentina"],["AUT","Austria"],["ALG","Algeria"],["JOR","Jordan"]],
  K:[["POR","Portugal"],["COL","Colombia"],["COD","DR Congo"],["UZB","Uzbekistan"]],
  L:[["ENG","England"],["CRO","Croatia"],["GHA","Ghana"],["PAN","Panama"]]
};
const RR=[[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
const MATCHES=[]; const TEAM={}; const TEAMGROUP={}; const PAIR2MATCH={};
for(const g of Object.keys(GROUPS)){ GROUPS[g].forEach(t=>{TEAM[t[0]]=t;TEAMGROUP[t[0]]=g;});
  RR.forEach((p,i)=>{const home=GROUPS[g][p[0]][0],away=GROUPS[g][p[1]][0],id=g+(i+1); MATCHES.push({id,group:g,home,away});PAIR2MATCH[[home,away].sort().join("|")]={id,home,away};}); }
const ALL_TEAMS=Object.values(TEAM); const GLETTERS=Object.keys(GROUPS);
const THIRD_GROUPS={'3a':'ABCDF','3b':'CDFGH','3c':'CEFHI','3d':'EHIJK','3e':'BEFIJ','3f':'AEHIJ','3g':'EFGIJ','3h':'DEIJL'};
const THIRD_SLOTS=Object.keys(THIRD_GROUPS).map(tok=>({tok,groups:THIRD_GROUPS[tok]}));
const KO=[];
[['M74','1E','3a'],['M77','1I','3b'],['M73','2A','2B'],['M75','1F','2C'],['M83','2K','2L'],['M84','1H','2J'],['M81','1D','3e'],['M82','1G','3f'],
 ['M76','1C','2F'],['M78','2E','2I'],['M79','1A','3c'],['M80','1L','3d'],['M86','1J','2H'],['M88','2D','2G'],['M85','1B','3g'],['M87','1K','3h']].forEach(([id,a,b])=>KO.push({id,round:'R32',a:{seed:a},b:{seed:b}}));
[['M89','M74','M77'],['M90','M73','M75'],['M93','M83','M84'],['M94','M81','M82'],['M91','M76','M78'],['M92','M79','M80'],['M95','M86','M88'],['M96','M85','M87']].forEach(([id,a,b])=>KO.push({id,round:'R16',a:{match:a},b:{match:b}}));
[['M97','M89','M90'],['M98','M93','M94'],['M99','M91','M92'],['M100','M95','M96']].forEach(([id,a,b])=>KO.push({id,round:'QF',a:{match:a},b:{match:b}}));
[['M101','M97','M98'],['M102','M99','M100']].forEach(([id,a,b])=>KO.push({id,round:'SF',a:{match:a},b:{match:b}}));
KO.push({id:'M104',round:'F',a:{match:'M101'},b:{match:'M102'}});
KO.push({id:'M103',round:'3P',a:{loser:'M101'},b:{loser:'M102'}});
const R32IDS=['M74','M77','M73','M75','M83','M84','M81','M82','M76','M78','M79','M80','M86','M88','M85','M87'];
const R16IDS=['M89','M90','M93','M94','M91','M92','M95','M96']; const QFIDS=['M97','M98','M99','M100']; const SFIDS=['M101','M102']; const FINID='M104'; const BRONZEID='M103';
const KOBYID={}; KO.forEach(m=>KOBYID[m.id]=m);
function assignThirds(wc){ wc=(wc||[]).filter(Boolean); const grp=wc.map(c=>TEAMGROUP[c]||'');
  const n=THIRD_SLOTS.length, ms=new Array(n).fill(-1), mw=new Array(wc.length).fill(-1);
  const ok=(s,j)=>grp[j] && THIRD_SLOTS[s].groups.indexOf(grp[j])>=0;
  function aug(s,seen){for(let j=0;j<wc.length;j++){if(ok(s,j)&&!seen[j]){seen[j]=true;if(mw[j]<0||aug(mw[j],seen)){ms[s]=j;mw[j]=s;return true;}}}return false;}
  for(let s=0;s<n;s++)aug(s,new Array(wc.length).fill(false));
  const map={}; THIRD_SLOTS.forEach((s,i)=>{map[s.tok]=ms[i]>=0?wc[ms[i]]:null;}); return map; }
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"");
const NAMEMAP={}; ALL_TEAMS.forEach(t=>NAMEMAP[norm(t[1])]=t[0]);
Object.assign(NAMEMAP,{southkorea:"KOR",korearepublic:"KOR",korea:"KOR",unitedstates:"USA",usa:"USA",us:"USA",iran:"IRN",iriran:"IRN",islamicrepublicofiran:"IRN",ivorycoast:"CIV",cotedivoire:"CIV",turkiye:"TUR",turkey:"TUR",czechia:"CZE",czechrepublic:"CZE",capeverde:"CPV",caboverde:"CPV",curacao:"CUW",drcongo:"COD",congodr:"COD",democraticrepublicofthecongo:"COD",congodemocraticrepublic:"COD",bosniaherz:"BIH",bosniaandherzegovina:"BIH",bosniaherzegovina:"BIH",saudiarabia:"SAU",southafrica:"RSA",newzealand:"NZL"});
const codeOf=name=>{ const n=norm(name);if(!n)return null; if(NAMEMAP[n])return NAMEMAP[n];
  if(n.includes('iran')&&!n.includes('iraq'))return 'IRN'; if(n.includes('iraq'))return 'IRQ';
  if(n.includes('korea'))return n.includes('north')||n.includes('dpr')?null:'KOR'; if(n.includes('turk'))return 'TUR';
  if(n.includes('ivoir')||n.includes('ivory'))return 'CIV'; if(n.includes('curac'))return 'CUW';
  if(n.includes('caboverde')||n.includes('capeverde'))return 'CPV'; if(n.includes('bosnia'))return 'BIH';
  if(n.includes('czech'))return 'CZE'; if(n.includes('saudi'))return 'SAU'; if(n.includes('southafrica'))return 'RSA';
  if(n.includes('newzealand'))return 'NZL'; if(n.includes('unitedstates')||n==='usa'||n==='us')return 'USA'; if(n.includes('congo'))return 'COD';
  for(const t of ALL_TEAMS){const tn=norm(t[1]);if(tn.length>=5&&n.includes(tn))return t[0];} return null; };

const state={ results:{matches:{},scores:{}}, actual:{groups:{},wildcards:[],ko:{R16:[],QF:[],SF:[],F:[]},koMatches:[],champion:null,third:null} };

function tableFromScores(scores){ const t={}; GLETTERS.forEach(g=>{
  const rows=GROUPS[g].map((tm,idx)=>({code:tm[0],idx,pts:0,gf:0,ga:0,gd:0})); const by={}; rows.forEach(r=>by[r.code]=r);
  MATCHES.filter(m=>m.group===g).forEach(m=>{const sc=scores[m.id];if(!sc)return; const H=by[m.home],A=by[m.away];H.gf+=sc.h;H.ga+=sc.a;A.gf+=sc.a;A.ga+=sc.h;
    if(sc.h>sc.a)H.pts+=3;else if(sc.a>sc.h)A.pts+=3;else{H.pts++;A.pts++;}});
  rows.forEach(r=>r.gd=r.gf-r.ga); rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.idx-b.idx); t[g]=rows; }); return t; }

function ingestActual(events,propagateNext){
  events=Array.isArray(events)?events:(events&&typeof events==='object'?Object.values(events):[]);
  {const _m={};events.forEach(e=>{if(!e||!e.home)return;const hc=codeOf(e.home),ac=codeOf(e.away);const k=(hc&&ac)?[hc,ac].sort().join('|'):(e.home+'|'+e.away);const old=_m[k];const sc=Number.isFinite(e.hs)&&Number.isFinite(e.as);const os=old&&Number.isFinite(old.hs)&&Number.isFinite(old.as);if(!old||(sc&&!os))_m[k]=e;});events=Object.values(_m);}
  const matches={},scores={},tbl={};GLETTERS.forEach(g=>{tbl[g]={};GROUPS[g].forEach(t=>tbl[g][t[0]]={code:t[0],p:0,w:0,d:0,gf:0,ga:0});});
  const ko={R16:[],QF:[],SF:[],F:[]};const koMatches=[];let champion=null,third=null;
  (events||[]).forEach(ev=>{ const hc=codeOf(ev.home),ac=codeOf(ev.away);if(!hc||!ac)return; const mm0=PAIR2MATCH[[hc,ac].sort().join('|')];
    if(ev.stage==='GROUP'){ const hs=ev.hs,as=ev.as;if(!Number.isFinite(hs)||!Number.isFinite(as))return;
      const mm=mm0;if(mm){const win=hs>as?hc:as>hs?ac:null;matches[mm.id]=win===null?'draw':(win===mm.home?'home':'away');scores[mm.id]=(hc===mm.home)?{h:hs,a:as}:{h:as,a:hs};}
      const g=TEAMGROUP[hc];if(g&&TEAMGROUP[ac]===g){const H=tbl[g][hc],A=tbl[g][ac];H.p++;A.p++;H.gf+=hs;H.ga+=as;A.gf+=as;A.ga+=hs;if(hs>as){H.w++;}else if(as>hs){A.w++;}else{H.d++;A.d++;}}
    } else if(ev.stage==='R32'){ let win=null;if(Number.isFinite(ev.hs)&&Number.isFinite(ev.as)&&ev.hs!==ev.as)win=ev.hs>ev.as?hc:ac; if(win&&!ko.R16.includes(win))ko.R16.push(win);
      koMatches.push({pair:[hc,ac].sort().join('|'),winner:win,round:'R32',g:{[hc]:ev.hs,[ac]:ev.as}});
    } else if(['R16','QF','SF','F'].includes(ev.stage)){ if(!ko[ev.stage].includes(hc))ko[ev.stage].push(hc); if(!ko[ev.stage].includes(ac))ko[ev.stage].push(ac);
      let win=null;if(Number.isFinite(ev.hs)&&Number.isFinite(ev.as)&&ev.hs!==ev.as)win=ev.hs>ev.as?hc:ac;
      const NEXT={R16:'QF',QF:'SF',SF:'F'}[ev.stage]; if(propagateNext&&win&&NEXT&&!ko[NEXT].includes(win))ko[NEXT].push(win);
      koMatches.push({pair:[hc,ac].sort().join('|'),winner:win,round:ev.stage,g:{[hc]:ev.hs,[ac]:ev.as}}); if(ev.stage==='F'&&win)champion=win;
    } else if(ev.stage==='3P'){ let win=null;if(Number.isFinite(ev.hs)&&Number.isFinite(ev.as)&&ev.hs!==ev.as)win=ev.hs>ev.as?hc:ac; koMatches.push({pair:[hc,ac].sort().join('|'),winner:win,round:'3P',g:{[hc]:ev.hs,[ac]:ev.as}}); if(win)third=win; }
  });
  const groups={}; GLETTERS.forEach(g=>{ const arr=Object.values(tbl[g]).map(t=>({...t,gd:t.gf-t.ga,pts:t.w*3+t.d}));
    arr.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||TEAM[a.code][1].localeCompare(TEAM[b.code][1]));
    const played=Object.keys(matches).filter(id=>id[0]===g).length; if(played>=6)groups[g]={first:arr[0].code,second:arr[1].code}; tbl[g]._arr=arr; });
  const thirds=GLETTERS.map(g=>tbl[g]._arr[2]).filter(Boolean); thirds.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
  const proj=thirds.slice(0,8).map(t=>t.code);
  return {matches,scores,groups,wildcards:(Object.keys(groups).length===12?proj:[]),ko,koMatches,champion,third};
}

function seedMapFor(e){const m={};GLETTERS.forEach(g=>{const gp=(e.groupPicks&&e.groupPicks[g])||{};m['1'+g]=gp.first||null;m['2'+g]=gp.second||null;});Object.assign(m,assignThirds(e.wildcards||[]));return m;}
function koCodeFor(e,side,sm){if(side.seed)return sm[side.seed]||null;if(side.loser)return koLoserFor(e,side.loser,sm);return (e.bracket||{})[side.match]||null;}
function koLoserFor(e,mid,sm){const m=KOBYID[mid];const a=koCodeFor(e,m.a,sm),b=koCodeFor(e,m.b,sm),w=(e.bracket||{})[mid];if(!a||!b||!w)return null;return w===a?b:a;}
function bracketAdvancers(entry){const w=entry.bracket||{};const win=ids=>ids.map(id=>w[id]).filter(Boolean);return{R16:win(R32IDS),QF:win(R16IDS),SF:win(QFIDS),F:win(SFIDS),champion:w[FINID]||null};}
function predictedTies(e){const sm=seedMapFor(e);const ties=[];for(const m of KO){const a=koCodeFor(e,m.a,sm),b=koCodeFor(e,m.b,sm);const w=(e.bracket||{})[m.id];if(a&&b&&w)ties.push({pair:[a,b].sort().join('|'),winner:w,round:m.round});}return ties;}
function scoreEntry(e,roundAware){ const S=CONFIG.scoring;let gPts=0,kPts=0; const K=(r,p)=>roundAware?(r+'|'+p):p;
  let mC=0,eC=0; for(const m of MATCHES){const r=state.results.matches[m.id];if(r&&e.picks&&e.picks[m.id]===r){gPts+=S.match;mC++;}const ps=e.scores&&e.scores[m.id],as=state.results.scores&&state.results.scores[m.id];if(ps&&as&&ps.h===as.h&&ps.a===as.a){gPts+=S.exactScore;eC++;}}
  let gC=0; GLETTERS.forEach(g=>{const act=state.actual.groups[g];const gp=e.groupPicks&&e.groupPicks[g];if(act&&gp){if(gp.first&&gp.first===act.first){gPts+=S.first;gC++;}if(gp.second&&gp.second===act.second){gPts+=S.second;gC++;}}});
  let wC=0; (e.wildcards||[]).forEach(c=>{if((state.actual.wildcards||[]).includes(c)){gPts+=S.wildcard;wC++;}});
  let kC=0; const adv=bracketAdvancers(e);
  [['R16',S.r16],['QF',S.qf],['SF',S.sf],['F',S.finalist]].forEach(([rd,p])=>{const set=state.actual.ko[rd]||[];(adv[rd]||[]).forEach(c=>{if(set.includes(c)){kPts+=p;kC++;}});});
  if(adv.champion&&state.actual.champion&&adv.champion===state.actual.champion){kPts+=S.champion;kC++;}
  const myThird=e.bracket&&(e.bracket[BRONZEID]||e.bracket['B']);if(myThird&&state.actual.third&&myThird===state.actual.third){kPts+=S.third;kC++;}
  let bC=0; const actM={}; (state.actual.koMatches||[]).forEach(am=>{if(am.winner)actM[K(am.round,am.pair)]=am.winner;});
  predictedTies(e).forEach(t=>{const k=K(t.round,t.pair);if(actM[k]&&actM[k]===t.winner){kPts+=S.matchupBonus;bC++;}});
  let kxC=0; const actG={}; (state.actual.koMatches||[]).forEach(am=>{if(am.g)actG[K(am.round,am.pair)]=am.g;});
  const smE=seedMapFor(e);
  for(const m of KO){const a=koCodeFor(e,m.a,smE),b=koCodeFor(e,m.b,smE);const sc=e.koScores&&e.koScores[m.id];if(!a||!b||!sc||!Number.isFinite(sc.h)||!Number.isFinite(sc.a))continue;let h=sc.h,aa=sc.a;if(h===aa){const p=e.koPens&&e.koPens[m.id];if(p==='h')h++;else if(p==='a')aa++;else continue;}const ag=actG[K(m.round,[a,b].sort().join('|'))];if(!ag)continue;if(ag[a]===h&&ag[b]===aa){kPts+=S.exactScore;kxC++;}}
  return{total:gPts+kPts,groupPts:gPts,koPts:kPts,matchCorrect:mC,exactScores:eC+kxC,groupCorrect:gC,wcCorrect:wC,koCorrect:kC,matchupHits:bC};
}

function loadState(events, propagateNext){
  const A = ingestActual(events, propagateNext);
  state.results.matches = A.matches; state.results.scores = A.scores;
  state.actual = { groups:A.groups, wildcards:A.wildcards, ko:A.ko, koMatches:A.koMatches, champion:A.champion, third:A.third };
  return A;
}

(async () => {
  const res = await get('/pools/_results');
  const events = res && res.events;
  const entries = (await get('/entries')) || {};
  const ids = Object.keys(entries);

  // NEW (deployed) logic: winner propagation + round-aware bonuses
  const A = loadState(events, true);
  console.log('ACTUAL — group scored:', Object.keys(A.matches).length, '| SF teams:', A.ko.SF.join(',')||'(none)', '| F:', A.ko.F.join(',')||'(none)', 'champ:', A.champion);
  const NEW = {}; ids.forEach(id => NEW[id] = scoreEntry(entries[id], true).total);

  // OLD logic (what players saw before today's two fixes): no SF/F winner
  // propagation, and bonuses matched by pairing only (ignoring round).
  loadState(events, false);
  const OLD = {}; ids.forEach(id => OLD[id] = scoreEntry(entries[id], false).total);

  // reload NEW for detail section
  loadState(events, true);
  const rank = obj => { const s=ids.slice().sort((a,b)=>obj[b]-obj[a]); const r={}; s.forEach((id,i)=>r[id]=i+1); return r; };
  const oldRank = rank(OLD), newRank = rank(NEW);
  const rows = ids.map(id => ({ id, name:(entries[id]||{}).name||'Anon', old:OLD[id], neu:NEW[id], or:oldRank[id], nr:newRank[id] }));
  rows.sort((a,b)=>a.nr-b.nr);
  console.log('\n=== BEFORE (pre-fix) vs AFTER (fixed) ===');
  console.log('  rank  player                 before -> after   Δpts   rankΔ');
  rows.forEach(r=>{
    const dp=(r.neu-r.old>=0?'+':'')+(r.neu-r.old);
    const dr=r.or===r.nr?'—':(r.nr<r.or?('▲'+(r.or-r.nr)):('▼'+(r.nr-r.or)));
    console.log(`  #${String(r.nr).padEnd(4)} ${r.name.padEnd(20)} ${String(r.old).padStart(4)} -> ${String(r.neu).padStart(4)}   ${dp.padStart(4)}   was#${r.or} ${dr}`);
  });

  const want = ['capi','keller'];
  rows.filter(r=>want.some(w=>r.name.toLowerCase().includes(w))).forEach(r=>{
    const e=entries[r.id]; const adv=bracketAdvancers(e);
    console.log(`\n=== DETAIL: ${r.name} — predicted semifinalists: ${adv.SF.join(',')} → actual SF hits: ${adv.SF.filter(c=>A.ko.SF.includes(c)).join(',')||'(none)'} ===`);
  });
  // who gained the most from the SF fix (predicted both actual semifinalists)
  console.log('\nActual semifinalists so far:', A.ko.SF.join(','));
  rows.forEach(r=>{ const adv=bracketAdvancers(entries[r.id]); const hits=adv.SF.filter(c=>A.ko.SF.includes(c)); if(hits.length) console.log('  '+r.name.padEnd(20)+' correctly had in SF: '+hits.join(',')+'  (+'+(hits.length*CONFIG.scoring.sf)+')'); });
})().catch(e => { console.error(e); process.exit(1); });
