import { MASTERY_THRESHOLDS as T } from '../shared/constants';
import type { MasteryState, UnitStatus } from '../shared/types';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function transitionMastery(state: MasteryState): UnitStatus {
  if (state.lapses > 0 && state.daysSinceLapse < 7 && state.recall < 55) return 'fragile';
  if (state.recognition >= T.masteredRecognition && state.recall >= T.masteredRecall && state.production >= T.masteredProduction && state.daysSinceLapse >= 30) return 'mastered';
  if (state.realUses >= 1 && state.recentActiveCorrect >= 1) return 'transferred';
  if (state.production >= T.productive && state.freeUses >= 2) return 'productive';
  if (state.recall >= T.recallable && state.recentActiveCorrect >= 2) return 'recallable';
  if (state.recognition >= T.recognizable) return 'recognizable';
  if (state.recognition > 0 || state.recall > 0) return 'introduced';
  return 'unseen';
}

export function applyMasteryReview(state: MasteryState, dimension: 'recognition' | 'recall', correct: boolean, rating: number): MasteryState {
  const delta = correct ? (rating === 4 ? 10 : rating === 3 ? 7 : 3) : -Math.max(8, rating === 1 ? 18 : 10);
  return {
    ...state,
    [dimension]: clamp(state[dimension] + delta),
    recentActiveCorrect: dimension === 'recall' ? (correct ? state.recentActiveCorrect + 1 : 0) : state.recentActiveCorrect,
    lapses: state.lapses + (correct ? 0 : 1),
    daysSinceLapse: correct ? state.daysSinceLapse : 0,
  };
}
