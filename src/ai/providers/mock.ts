import type { ZodType } from 'zod';
import type { AudioResult, SpeechToTextProvider, TextModelProvider, TextRequest, TextResult, TextToSpeechProvider, TranscriptResult } from './types';

const corrections = [{ original:'Can the price lower?', improved:'Is there any flexibility on the asking price?', reason:'Use a natural negotiation collocation.', category:'collocation', severity:'medium' }];

export class MockTextProvider implements TextModelProvider {
  async generateText(input: TextRequest): Promise<TextResult> {
    const text = input.taskType === 'roleplay' ? 'I can check that. Before I do, could you clarify your preferred move-in timeline?' : 'Your request is clear. Let us focus on the most natural next step.';
    return { text, provider:'mock', model:'deterministic-v1', latencyMs:1 };
  }
  async generateStructured<T>(input: TextRequest, schema: ZodType<T>): Promise<T> {
    let value: unknown;
    if (input.taskType === 'writing') value = { correct:'Is the space still available, and could you confirm the asking rent?', natural:'Could you confirm whether the space is still available and share the current asking rent?', polished:'Would you please confirm the space’s availability and provide the current asking rent and estimated NNN charges?', reasons:['Use an indirect question after “confirm whether.”','Group related property questions into one concise request.'], phraseUpgrades:['confirm whether','provide the current asking rent'], corrections };
    else if (input.taskType === 'capture') value = { naturalRewrite:'Could you clarify whether there is any flexibility on the asking rent?', units:[{term:'any flexibility on',definition:'used to ask politely whether a term can change',worthReviewing:true}], errors:corrections };
    else if (input.taskType === 'weekly_report') value = { learned:'Active recall improved for this week’s target phrases.',recognitionOnly:'Several newly introduced units still need free production.',recurringErrors:'Collocation and indirect-question patterns remain the highest-value focus.',speakingChange:'Speaking time increased while turn length remained steady.',nextWeek:'Reduce new units slightly and add one negotiation retry drill.' };
    else if (input.taskType === 'assessment') value = {writing:3,speaking:3,listening:4,grammar:3,naturalness:3,topRecurringErrors:['indirect questions','collocation precision'],focus:['active recall through timed prompts','natural professional phrasing','spontaneous speaking retries'],confidence:'moderate'};
    else value = { taskCompletion:4,clarity:4,grammar:3,lexicalRange:3,naturalness:3,pragmatics:4,fluency:3,summary:'The objective was clear and the next step was confirmed.',priorityCorrections:corrections,successfulTargetUnits:['clarify'],missedTargetUnits:['justify'],newCandidateUnits:['room for negotiation'] };
    return schema.parse(value);
  }
}

export class MockSttProvider implements SpeechToTextProvider {
  async transcribe(_audio: ArrayBuffer, _mimeType: string): Promise<TranscriptResult> { return { text:'Could you clarify whether the space is still available?',confidence:0.98,durationSeconds:4,provider:'mock',model:'deterministic-stt-v1' }; }
}
export class BrowserFallbackTtsProvider implements TextToSpeechProvider { async synthesize(_text: string): Promise<AudioResult|null> { return null; } }
