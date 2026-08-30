import type { PlanItem, PlanSignals, PriorityInputs } from '../shared/types';

export function priorityScore(input: PriorityInputs): number {
  const c = (n: number) => Math.max(0, Math.min(1, n));
  return Number((0.35*c(input.dueUrgency)+0.25*c(input.activeGap)+0.15*c(input.personalRelevance)+0.10*c(input.errorRecurrence)+0.10*c(input.transferNeed)+0.05*c(input.curriculumBalance)).toFixed(4));
}

export function newUnitLimit(signals: PlanSignals): number {
  const recent = signals.completionRates.slice(-2);
  if (recent.length === 2 && recent.every((v) => v < 0.7)) return signals.dueCount > 60 ? 0 : 3;
  if (signals.dueCount > 60) return 2;
  if (signals.dueCount > 30) return 4;
  return signals.completionRates.slice(-7).length === 7 && signals.completionRates.slice(-7).every((v) => v > 0.9) && signals.stableAccuracy ? 8 : 6;
}

const BASE: PlanItem[] = [
  { type:'review', minutes:12, label:'Due Review' }, { type:'learn', minutes:10, label:'New Units' },
  { type:'drill', minutes:10, label:'Automaticity Sprint' }, { type:'speaking', minutes:18, label:'Speaking Scenario' },
  { type:'real_world', minutes:8, label:'Real-World / Writing Lab' }, { type:'reflection', minutes:2, label:'Reflection' },
];

export function allocatePlan(target: 30|45|60|75|90, dueCount = 0): PlanItem[] {
  if (target === 60) return BASE.map((item) => ({...item, minutes: item.type === 'learn' && dueCount > 60 ? 2 : item.minutes}));
  const presets: Record<number, number[]> = {30:[8,3,5,10,3,1],45:[10,6,7,14,6,2],75:[15,12,12,23,10,3],90:[18,14,14,28,12,4]};
  return BASE.map((item, i) => ({...item, minutes: presets[target][i]}));
}
