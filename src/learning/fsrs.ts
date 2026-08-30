import { createEmptyCard, fsrs, generatorParameters, type Card, type CardInput, type Grade } from 'ts-fsrs';

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false }));
export const emptyFsrsCard = (now = new Date()) => createEmptyCard(now);
export function scheduleReview(card: Card | CardInput, grade: Grade, now = new Date()) { return scheduler.next(card, now, grade); }
