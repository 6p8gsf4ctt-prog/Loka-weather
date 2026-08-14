export interface ShadowMetricRow {
  forecastDate: string;
  generatedAt: string;
  rawSceneId: number | null;
  rawScore: number | null;
  rawConfidence: string | null;
  finalSceneId: number | null;
  finalScore: number | null;
  finalConfidence: string | null;
  runnerUpSceneId: number | null;
  runnerUpScore: number | null;
  fallbackUsed: boolean;
  hysteresisApplied: boolean;
  reliabilityApplied: boolean;
  reliabilityReason: string | null;
}

const VERSION = "9.1.0";

const round = (v: number, d = 4) => {
  const p = 10 ** d;
  return Math.round(v * p) / p;
};
const rate = (n: number, d: number) => d > 0 ? round(n / d) : 0;
const avg = (v: number[]) => v.length ? round(v.reduce((a,b)=>a+b,0)/v.length, 2) : null;
const med = (v: number[]) => {
  if (!v.length) return null;
  const s=[...v].sort((a,b)=>a-b), m=Math.floor(s.length/2);
  return round(s.length%2?s[m]:(s[m-1]+s[m])/2,2);
};

function sameDayTransitions(rows: ShadowMetricRow[]) {
  const pairs: Array<[ShadowMetricRow, ShadowMetricRow]> = [];
  for (let i=1;i<rows.length;i++) {
    if (rows[i-1].forecastDate === rows[i].forecastDate) pairs.push([rows[i-1],rows[i]]);
  }
  return pairs;
}

function changes(
  pairs: Array<[ShadowMetricRow, ShadowMetricRow]>,
  pick: (r: ShadowMetricRow)=>number|null
) {
  return pairs.filter(([a,b]) => {
    const x=pick(a), y=pick(b);
    return x!==null && y!==null && x!==y;
  }).length;
}

function gaps(rows: ShadowMetricRow[]) {
  return rows.map(r =>
    r.finalScore!==null && r.runnerUpScore!==null ? r.finalScore-r.runnerUpScore : null
  ).filter((v): v is number => v!==null && Number.isFinite(v));
}

function dist(rows: ShadowMetricRow[], pick:(r:ShadowMetricRow)=>number|null) {
  const m=new Map<number,number>();
  for (const r of rows) {
    const id=pick(r);
    if (id!==null) m.set(id,(m.get(id)??0)+1);
  }
  const total=[...m.values()].reduce((a,b)=>a+b,0);
  return [...m.entries()]
    .map(([sceneId,count])=>({sceneId,count,rate:rate(count,total)}))
    .sort((a,b)=>b.count-a.count || a.sceneId-b.sceneId);
}

function longestStableRun(rows: ShadowMetricRow[]) {
  let best=0, cur=0, prevScene:number|null=null, prevDate:string|null=null;
  for (const r of rows) {
    if (r.finalSceneId===null) { cur=0; prevScene=null; prevDate=r.forecastDate; continue; }
    cur=(r.forecastDate===prevDate && r.finalSceneId===prevScene)?cur+1:1;
    best=Math.max(best,cur); prevScene=r.finalSceneId; prevDate=r.forecastDate;
  }
  return best;
}

function daily(rows: ShadowMetricRow[]) {
  const groups=new Map<string,ShadowMetricRow[]>();
  for (const r of rows) {
    const g=groups.get(r.forecastDate)??[]; g.push(r); groups.set(r.forecastDate,g);
  }
  return [...groups.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([date,g])=>{
    const s=[...g].sort((a,b)=>a.generatedAt.localeCompare(b.generatedAt));
    const t=sameDayTransitions(s);
    const rc=changes(t,r=>r.rawSceneId), fc=changes(t,r=>r.finalSceneId);
    const sg=gaps(s);
    return {
      date,
      generations:s.length,
      comparableTransitions:t.length,
      rawSceneChanges:rc,
      finalSceneChanges:fc,
      rawStabilityRate:t.length?round(1-rc/t.length):null,
      finalStabilityRate:t.length?round(1-fc/t.length):null,
      averageFinalScore:avg(s.map(r=>r.finalScore).filter((v):v is number=>v!==null)),
      averageScoreGap:avg(sg),
      reliabilityAppliedRate:rate(s.filter(r=>r.reliabilityApplied).length,s.length),
      lowConfidenceRate:rate(s.filter(r=>r.finalConfidence==="LOW").length,s.length),
      rawFinalOverrideRate:rate(s.filter(r=>r.rawSceneId!==null&&r.finalSceneId!==null&&r.rawSceneId!==r.finalSceneId).length,s.length)
    };
  });
}

export function calculateShadowMetrics(input: ShadowMetricRow[]) {
  const rows=[...input].sort((a,b)=>a.generatedAt.localeCompare(b.generatedAt));
  const t=sameDayTransitions(rows);
  const rawChanges=changes(t,r=>r.rawSceneId);
  const finalChanges=changes(t,r=>r.finalSceneId);
  const rawStability=t.length?1-rawChanges/t.length:null;
  const finalStability=t.length?1-finalChanges/t.length:null;
  const sg=gaps(rows);
  const winnerScores=rows.map(r=>r.finalScore).filter((v):v is number=>v!==null);
  const runnerScores=rows.map(r=>r.runnerUpScore).filter((v):v is number=>v!==null);
  const applied=rows.filter(r=>r.reliabilityApplied).length;
  const overrides=rows.filter(r=>r.rawSceneId!==null&&r.finalSceneId!==null&&r.rawSceneId!==r.finalSceneId).length;

  const reasonCounts=new Map<string,number>();
  for (const r of rows) if (r.reliabilityApplied && r.reliabilityReason)
    reasonCounts.set(r.reliabilityReason,(reasonCounts.get(r.reliabilityReason)??0)+1);

  const perDay=daily(rows);
  const activeDays=perDay.filter(d=>d.comparableTransitions>0);

  return {
    version:VERSION,
    generatedAt:new Date().toISOString(),
    sample:{
      generations:rows.length,
      forecastDays:new Set(rows.map(r=>r.forecastDate)).size,
      firstGeneratedAt:rows[0]?.generatedAt??null,
      lastGeneratedAt:rows.at(-1)?.generatedAt??null,
      comparableTransitions:t.length
    },
    stability:{
      rawSceneChanges:rawChanges,
      finalSceneChanges:finalChanges,
      rawStabilityRate:rawStability===null?null:round(rawStability),
      finalStabilityRate:finalStability===null?null:round(finalStability),
      rawChangeRate:t.length?rate(rawChanges,t.length):null,
      finalChangeRate:t.length?rate(finalChanges,t.length):null,
      stabilizationGainPoints:rawStability===null||finalStability===null?null:round((finalStability-rawStability)*100,2),
      longestFinalStableRunGenerations:longestStableRun(rows),
      averageFinalSwitchesPerDay:activeDays.length?round(activeDays.reduce((s,d)=>s+d.finalSceneChanges,0)/activeDays.length,2):null
    },
    scoring:{
      averageWinnerScore:avg(winnerScores),
      medianWinnerScore:med(winnerScores),
      averageRunnerUpScore:avg(runnerScores),
      averageScoreGap:avg(sg),
      medianScoreGap:med(sg),
      minimumScoreGap:sg.length?round(Math.min(...sg),2):null,
      lowConfidenceRate:rate(rows.filter(r=>r.finalConfidence==="LOW").length,rows.length),
      mediumConfidenceRate:rate(rows.filter(r=>r.finalConfidence==="MEDIUM").length,rows.length),
      highConfidenceRate:rate(rows.filter(r=>r.finalConfidence==="HIGH").length,rows.length),
      closeDecisionRate:rate(sg.filter(g=>g<7).length,sg.length)
    },
    reliability:{
      appliedCount:applied,
      appliedRate:rate(applied,rows.length),
      rawFinalOverrideCount:overrides,
      rawFinalOverrideRate:rate(overrides,rows.length),
      fallbackUsedRate:rate(rows.filter(r=>r.fallbackUsed).length,rows.length),
      hysteresisAppliedRate:rate(rows.filter(r=>r.hysteresisApplied).length,rows.length),
      reasons:[...reasonCounts.entries()]
        .map(([reason,count])=>({reason,count,rate:rate(count,applied)}))
        .sort((a,b)=>b.count-a.count || a.reason.localeCompare(b.reason))
    },
    distribution:{
      rawScenes:dist(rows,r=>r.rawSceneId),
      finalScenes:dist(rows,r=>r.finalSceneId)
    },
    daily:perDay
  };
}
