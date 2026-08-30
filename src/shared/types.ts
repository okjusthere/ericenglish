export type UnitStatus = 'unseen' | 'introduced' | 'recognizable' | 'recallable' | 'productive' | 'transferred' | 'fragile' | 'mastered' | 'suspended';
export interface MasteryState {
  recognition: number; recall: number; production: number; transfer: number;
  recentActiveCorrect: number; freeUses: number; realUses: number; lapses: number; daysSinceLapse: number;
}
export interface PlanSignals {
  dueCount: number; completionRates: number[]; stableAccuracy: boolean;
}
export interface PlanItem { type: string; minutes: number; label: string; }
export interface PriorityInputs { dueUrgency: number; activeGap: number; personalRelevance: number; errorRecurrence: number; transferNeed: number; curriculumBalance: number; }
