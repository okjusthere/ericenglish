import { Rating, type Grade } from 'ts-fsrs';

export function suggestRating(correct: boolean, responseMs: number, hintLevel: number): Grade {
  if (!correct || hintLevel >= 2) return Rating.Again;
  if (hintLevel === 1 || responseMs > 12_000) return Rating.Hard;
  if (responseMs <= 4_000) return Rating.Easy;
  return Rating.Good;
}
