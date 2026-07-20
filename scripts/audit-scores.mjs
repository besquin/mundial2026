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

// Independent itemized breakdown — recomputes each scoring component with its own
// loop, so summing the parts is a cross-check on scoreEntry's total.
function breakdown(e){
  const S=CONFIG.scoring,A=state.actual,R=state.results;
  let grpM=0,grpE=0; for(const m of MATCHES){ if(R.matches[m.id]&&e.picks&&e.picks[m.id]===R.matches[m.id])grpM+=S.match; const ps=e.scores&&e.scores[m.id],as=R.scores[m.id]; if(ps&&as&&ps.h===as.h&&ps.a===as.a)grpE+=S.exactScore; }
  let g1=0,g2=0; GLETTERS.forEach(g=>{const act=A.groups[g],gp=e.groupPicks&&e.groupPicks[g]; if(act&&gp){ if(gp.first&&gp.first===act.first)g1+=S.first; if(gp.second&&gp.second===act.second)g2+=S.second; }});
  let wild=0; (e.wildcards||[]).forEach(c=>{ if((A.wildcards||[]).includes(c))wild+=S.wildcard; });
  const adv=bracketAdvancers(e),ap={};
  [['R16',S.r16],['QF',S.qf],['SF',S.sf],['F',S.finalist]].forEach(([rd,p])=>{ let s=0; (adv[rd]||[]).forEach(c=>{ if((A.ko[rd]||[]).includes(c))s+=p; }); ap[rd]=s; });
  const champ=(adv.champion&&A.champion&&adv.champion===A.champion)?S.champion:0;
  const myThird=e.bracket&&(e.bracket[BRONZEID]||e.bracket.B); const third=(myThird&&A.third&&myThird===A.third)?S.third:0;
  const actM={}; (A.koMatches||[]).forEach(am=>{if(am.winner)actM[am.round+'|'+am.pair]=am.winner;});
  let matchup=0; predictedTies(e).forEach(t=>{ if(actM[t.round+'|'+t.pair]===t.winner)matchup+=S.matchupBonus; });
  const actG={}; (A.koMatches||[]).forEach(am=>{if(am.g)actG[am.round+'|'+am.pair]=am.g;});
  let exKO=0; const sm=seedMapFor(e);
  for(const m of KO){const a=koCodeFor(e,m.a,sm),b=koCodeFor(e,m.b,sm);const sc=e.koScores&&e.koScores[m.id];if(!a||!b||!sc||!Number.isFinite(sc.h)||!Number.isFinite(sc.a))continue;let h=sc.h,aa=sc.a;if(h===aa){const p=e.koPens&&e.koPens[m.id];if(p==='h')h++;else if(p==='a')aa++;else continue;}const ag=actG[m.round+'|'+[a,b].sort().join('|')];if(!ag)continue;if(ag[a]===h&&ag[b]===aa)exKO+=S.exactScore;}
  const total=grpM+grpE+g1+g2+wild+ap.R16+ap.QF+ap.SF+ap.F+champ+third+matchup+exKO;
  return {grpM,grpE,g1,g2,wild,R16:ap.R16,QF:ap.QF,SF:ap.SF,F:ap.F,champ,third,matchup,exKO,total};
}

// Previous snapshot (2026-07-16, after both semifinals — before the Final & 3rd-place) for delta.
const BASELINE = { 'Jerry':207, 'Fred Mayweather':187, 'Besquin 🏆':183, 'El Capi Keller':174, 'Jaime Duende':173, 'Rebo Golf':160, 'Omi':145, 'KNO':131 };

(async () => {
  const res = await get('/pools/_results');
  const events = res && res.events;
  const entries = (await get('/entries')) || {};
  const ids = Object.keys(entries);
  const A = loadState(events, true);

  // 1) VERIFY the actual derived results against reality (eyeball these).
  console.log('=== ACTUAL RESULTS DERIVED FROM FEED ===');
  console.log('Group matches scored:', Object.keys(A.matches).length, '/ 72');
  console.log('Group winners/runners-up:');
  GLETTERS.forEach(g=>console.log('  '+g+': 1st '+(A.groups[g]?A.groups[g].first:'—')+'  2nd '+(A.groups[g]?A.groups[g].second:'—')));
  console.log('Wild cards (8 best 3rd):', A.wildcards.join(',')||'(none)');
  console.log('Reached R16('+A.ko.R16.length+'):', A.ko.R16.join(','));
  console.log('Reached QF('+A.ko.QF.length+'): ', A.ko.QF.join(','));
  console.log('Reached SF('+A.ko.SF.length+'): ', A.ko.SF.join(','));
  console.log('Finalists('+A.ko.F.length+'):   ', A.ko.F.join(',')||'(none)', '| champ:', A.champion||'—', '| 3rd:', A.third||'—');
  console.log('\nActual knockout results (round | teams | winner):');
  (A.koMatches||[]).slice().sort((x,y)=>x.round.localeCompare(y.round)).forEach(m=>{const[x,y]=m.pair.split('|');console.log('  '+m.round.padEnd(4)+' '+x+' '+(m.g[x]??'-')+'-'+(m.g[y]??'-')+' '+y+'  → '+(m.winner||'(tbd)'));});

  // 2) ITEMIZED per-player breakdown + internal consistency check.
  const rows = ids.map(id=>({id,name:(entries[id]||{}).name||'Anon',b:breakdown(entries[id]),full:scoreEntry(entries[id],true)}));
  rows.sort((a,b)=>b.b.total-a.b.total);
  console.log('\n=== ITEMIZED POINTS (grpW+grpExact | 1st 2nd wild | R16 QF SF F | champ 3rd | matchup exactKO = total) ===');
  let allOk=true;
  rows.forEach((r,i)=>{
    const b=r.b; const chk=b.total===r.full.total?'OK':('❌ MISMATCH scoreEntry='+r.full.total);
    if(b.total!==r.full.total)allOk=false;
    console.log(`#${i+1} ${r.name.padEnd(18)} ${String(b.grpM).padStart(2)}+${String(b.grpE).padStart(2)} | ${b.g1} ${b.g2} ${String(b.wild).padStart(2)} | ${String(b.R16).padStart(2)} ${String(b.QF).padStart(2)} ${String(b.SF).padStart(2)} ${b.F} | ${b.champ} ${b.third} | ${b.matchup} ${b.exKO} = ${String(b.total).padStart(3)}  [${chk}]`);
  });
  console.log('\nInternal consistency (sum of components == scoreEntry total for every player):', allOk?'PASS ✅':'FAIL ❌');

  // Day-over-day delta vs the previous reported snapshot.
  console.log('\n=== DELTA vs previous (BASELINE 2026-07-15) ===');
  console.log('Finalists known: '+A.ko.F.length+'/2  (both known = 2nd semifinal decided)  Finalists: '+(A.ko.F.join(',')||'(none)')+'  champ: '+(A.champion||'—')+'  3rd: '+(A.third||'—'));
  rows.forEach((r,i)=>{ const base=BASELINE[r.name]; const d=base==null?'(new)':((r.b.total-base>=0?'+':'')+(r.b.total-base)); console.log(`#${i+1} ${r.name.padEnd(18)} ${String(base==null?'—':base).padStart(4)} -> ${String(r.b.total).padStart(4)}   ${String(d).padStart(5)}`); });

  // ===== REMAINING-GAMES SCENARIO ANALYSIS =====
  // Only the Final (M104) and 3rd-place (M103) are left. Compute each player's
  // remaining points under every outcome (champion ∈ finalists, 3rd ∈ SF losers).
  const S=CONFIG.scoring;
  const finalists=A.ko.F.slice();                 // [ESP, ARG]
  const sfLosers=(()=>{const w=new Set(A.ko.F);return A.ko.SF.filter(t=>!w.has(t));})(); // [FRA, ENG]
  console.log('\n=== REMAINING GAMES ===');
  console.log('Final:', finalists.join(' vs ')||'?', '| 3rd-place:', sfLosers.join(' vs ')||'?');
  const info=e=>{const sm=seedMapFor(e);
    const fA=koCodeFor(e,KOBYID[FINID].a,sm),fB=koCodeFor(e,KOBYID[FINID].b,sm);
    const bA=koCodeFor(e,KOBYID[BRONZEID].a,sm),bB=koCodeFor(e,KOBYID[BRONZEID].b,sm);
    return {champ:(e.bracket||{})[FINID]||null,finalPair:[fA,fB].filter(Boolean).sort().join('|'),fScore:(e.koScores&&e.koScores[FINID])||null,
            third:(e.bracket||{})[BRONZEID]||null,bronzePair:[bA,bB].filter(Boolean).sort().join('|'),bScore:(e.koScores&&e.koScores[BRONZEID])||null};};
  const finalKey=finalists.slice().sort().join('|'), bronzeKey=sfLosers.slice().sort().join('|');
  // best-case remaining points for a player given champion=C, third=T (assumes exact
  // scorelines land in their favour — the true ceiling).
  const gain=(e,C,T)=>{const x=info(e);let g=0;
    if(x.champ===C)g+=S.champion;
    if(x.finalPair===finalKey&&x.champ===C){g+=S.matchupBonus;if(x.fScore&&Number.isFinite(x.fScore.h)&&Number.isFinite(x.fScore.a))g+=S.exactScore;}
    if(x.third===T)g+=S.third;
    if(x.bronzePair===bronzeKey&&x.third===T){g+=S.matchupBonus;if(x.bScore&&Number.isFinite(x.bScore.h)&&Number.isFinite(x.bScore.a))g+=S.exactScore;}
    return g;};
  console.log('\nPlayer picks (champion | predicted final | 3rd pick):');
  rows.forEach(r=>{const x=info(entries[r.id]);console.log('  '+r.name.padEnd(18)+' champ='+(x.champ||'—').padEnd(4)+' final='+(x.finalPair||'—').padEnd(9)+(x.fScore?(' '+x.fScore.h+'-'+x.fScore.a):'')+'  3rd='+(x.third||'—'));});
  const cur={}; rows.forEach(r=>cur[r.name]=r.b.total);
  const jerry='Jerry';
  console.log('\nProjected FINAL totals per scenario (champion / 3rd-place winner):');
  for(const C of finalists) for(const T of sfLosers){
    const proj=rows.map(r=>({name:r.name,tot:cur[r.name]+gain(entries[r.id],C,T)})).sort((a,b)=>b.tot-a.tot);
    console.log('  ['+C+' champ, '+T+' 3rd]: '+proj.slice(0,4).map(p=>p.name.split(' ')[0]+' '+p.tot).join('  |  '));
  }
  console.log('\nCan Jerry be caught? (chaser BEST case vs Jerry determined-min, per scenario):');
  const jg=(C,T)=>{const x=info(entries[rows.find(r=>r.name===jerry).id]);let g=0;if(x.champ===C)g+=S.champion;if(x.finalPair===finalKey&&x.champ===C)g+=S.matchupBonus;if(x.third===T)g+=S.third;if(x.bronzePair===bronzeKey&&x.third===T)g+=S.matchupBonus;return g;};
  let anyCatch=false;
  rows.filter(r=>r.name!==jerry).forEach(r=>{
    let best=-99,bestScn='';
    for(const C of finalists) for(const T of sfLosers){const my=cur[r.name]+gain(entries[r.id],C,T);const jr=cur[jerry]+jg(C,T);if(my-jr>best){best=my-jr;bestScn='['+C+'/'+T+']';}}
    if(best>0)anyCatch=true;
    console.log('  '+r.name.padEnd(18)+' best margin vs Jerry: '+(best>0?'+':'')+best+'  '+bestScn+(best>0?'  ← CAN WIN':'  (cannot catch)'));
  });
  console.log('\n=> '+(anyCatch?'Jerry CAN still be caught.':'Jerry is MATHEMATICALLY GUARANTEED 1st.'));
})().catch(e => { console.error(e); process.exit(1); });
