import { describe,expect,it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { allocatePlan,newUnitLimit,priorityScore } from '../../src/learning/planner';
import { suggestRating } from '../../src/learning/rating';
import { transitionMastery } from '../../src/learning/mastery';
import { redactPii } from '../../src/learning/redaction';

describe('deterministic learning engine',()=>{
  it('maps evidence to FSRS ratings',()=>{expect(suggestRating(false,1000,0)).toBe(Rating.Again);expect(suggestRating(true,15000,0)).toBe(Rating.Hard);expect(suggestRating(true,7000,0)).toBe(Rating.Good);expect(suggestRating(true,2000,0)).toBe(Rating.Easy);});
  it('allocates every supported daily plan exactly',()=>{for(const minutes of [30,45,60,75,90] as const)expect(allocatePlan(minutes).reduce((n,x)=>n+x.minutes,0)).toBe(minutes);});
  it('protects overloaded review days from new-unit growth',()=>{expect(newUnitLimit({dueCount:61,completionRates:[],stableAccuracy:false})).toBe(2);expect(newUnitLimit({dueCount:40,completionRates:[],stableAccuracy:false})).toBe(4);expect(newUnitLimit({dueCount:10,completionRates:Array(7).fill(.95),stableAccuracy:true})).toBe(8);});
  it('uses the binding priority formula',()=>expect(priorityScore({dueUrgency:1,activeGap:1,personalRelevance:1,errorRecurrence:1,transferNeed:1,curriculumBalance:1})).toBe(1));
  it('requires production and lapse stability for mastery',()=>{expect(transitionMastery({recognition:90,recall:85,production:75,transfer:30,recentActiveCorrect:3,freeUses:3,realUses:1,lapses:0,daysSinceLapse:31})).toBe('mastered');expect(transitionMastery({recognition:90,recall:40,production:75,transfer:30,recentActiveCorrect:0,freeUses:3,realUses:1,lapses:1,daysSinceLapse:2})).toBe('fragile');});
  it('redacts sensitive captures while leaving addresses configurable',()=>{const kept=redactPii('Email me at a@b.com or 212-555-0100 at 12 Main Street.');expect(kept.redacted).toContain('[EMAIL]');expect(kept.redacted).toContain('[PHONE]');expect(kept.redacted).toContain('12 Main Street');expect(redactPii('Meet at 12 Main Street.',true).redacted).toContain('[ADDRESS]');});
});
