import { z, type ZodType } from 'zod';
import type { AiUsageEvent } from './openai-compatible';
import type { TextModelProvider, TextRequest, TextResult } from './types';

interface WorkersAiOptions {
  ai: Ai;
  gatewayId: string;
  models: Record<TextRequest['modelRole'], string>;
  beforeRequest?: (input: { taskType: string; modelRole?: TextRequest['modelRole'] }) => Promise<void>;
  usageSink?: (event: AiUsageEvent) => Promise<void>;
}

interface WorkersAiPayload {
  response?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const modelRates: Record<string, { input: number; output: number }> = {
  '@cf/qwen/qwen3-30b-a3b-fp8': { input: 0.0509, output: 0.335 },
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { input: 0.293, output: 2.253 },
};

const estimateCost = (model: string, inputTokens = 0, outputTokens = 0) => {
  const rates = modelRates[model] ?? { input: 0.1, output: 0.5 };
  return Number(((inputTokens * rates.input + outputTokens * rates.output) / 1_000_000).toFixed(6));
};

const errorCode = (error: unknown) => error instanceof Error ? error.name : 'unknown';

function readText(payload: unknown): { text: string; usage: WorkersAiPayload['usage'] } {
  if (typeof payload === 'string') return { text: payload, usage: undefined };
  if (!payload || typeof payload !== 'object') throw new Error('Workers AI returned an invalid response');
  const value = payload as WorkersAiPayload;
  if (typeof value.response === 'string') return { text: value.response, usage: value.usage };
  const content = value.choices?.[0]?.message?.content;
  if (typeof content === 'string') return { text: content, usage: value.usage };
  throw new Error('Workers AI returned no text');
}

export class WorkersAiTextProvider implements TextModelProvider {
  constructor(private readonly options: WorkersAiOptions) {}

  private async run(input: TextRequest, jsonMode: boolean): Promise<TextResult> {
    const started = Date.now();
    const model = this.options.models[input.modelRole];
    if (!model) throw new Error(`Model is not configured for ${input.modelRole}`);
    await this.options.beforeRequest?.({ taskType: input.taskType, modelRole: input.modelRole });
    let usage: WorkersAiPayload['usage'];
    try {
      const payload = await this.options.ai.run(
        model as Parameters<Ai['run']>[0],
        {
          messages: [
            { role: 'system', content: input.system },
            { role: 'user', content: input.prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        } as never,
        {
          gateway: {
            id: this.options.gatewayId,
            skipCache: true,
            collectLog: false,
            retries: { maxAttempts: 2, backoff: 'exponential' },
          },
        },
      );
      const parsed = readText(payload);
      usage = parsed.usage;
      const result: TextResult = {
        text: parsed.text,
        provider: 'workers-ai',
        model,
        latencyMs: Date.now() - started,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
      };
      await this.options.usageSink?.({
        taskType: input.taskType,
        provider: result.provider,
        model,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: estimateCost(model, result.inputTokens, result.outputTokens),
        success: true,
      });
      return result;
    } catch (error) {
      await this.options.usageSink?.({
        taskType: input.taskType,
        provider: 'workers-ai',
        model,
        latencyMs: Date.now() - started,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
        estimatedCost: estimateCost(model, usage?.prompt_tokens, usage?.completion_tokens),
        success: false,
        errorCode: errorCode(error),
      });
      throw error;
    }
  }

  generateText(input: TextRequest): Promise<TextResult> {
    return this.run(input, false);
  }

  async generateStructured<T>(input: TextRequest, schema: ZodType<T>): Promise<T> {
    const requestedSchema = JSON.stringify(z.toJSONSchema(schema), null, 2);
    let prompt = `${input.prompt}\nReturn only valid JSON matching this exact JSON Schema:\n${requestedSchema}`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await this.run({ ...input, prompt }, true);
      try {
        return schema.parse(JSON.parse(result.text) as unknown);
      } catch (error) {
        if (attempt === 1) throw new Error('AI output failed schema validation after one repair attempt');
        prompt = `${prompt}\nYour last output was invalid. Repair it as JSON only. Validation issue: ${error instanceof Error ? error.message.slice(0, 500) : 'unknown'}`;
      }
    }
    throw new Error('AI structured generation failed');
  }
}
