export type SpeechMode = 'browser' | 'azure_tts';

export interface SpeechConfig {
  speechMode: SpeechMode;
  realtimeSpeakEnabled: boolean;
  pronunciationAssessmentEnabled: boolean;
  azureOpenAiEndpoint?: string;
  azureRealtimeDeployment?: string;
  azureTtsDeployment?: string;
  azureTranscribeDeployment?: string;
  azureTextDeployment?: string;
  azureTtsVoice?: string;
  azureSpeechEndpoint?: string;
  azureSpeechVoice?: string;
}

const asBoolean = (value: unknown, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const asOptionalString = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || undefined;
};

export function readSpeechConfig(env: Partial<Record<keyof SpeechConfigEnv, unknown>>): SpeechConfig {
  const requestedMode = asOptionalString(env.SPEECH_MODE);
  return {
    speechMode: requestedMode === 'azure_tts' ? 'azure_tts' : 'browser',
    realtimeSpeakEnabled: asBoolean(env.REALTIME_SPEAK_ENABLED),
    pronunciationAssessmentEnabled: asBoolean(env.PRONUNCIATION_ASSESSMENT_ENABLED),
    azureOpenAiEndpoint: asOptionalString(env.AZURE_OPENAI_ENDPOINT),
    azureRealtimeDeployment: asOptionalString(env.AZURE_REALTIME_DEPLOYMENT),
    azureTtsDeployment: asOptionalString(env.AZURE_TTS_DEPLOYMENT),
    azureTranscribeDeployment: asOptionalString(env.AZURE_TRANSCRIBE_DEPLOYMENT),
    azureTextDeployment: asOptionalString(env.AZURE_TEXT_DEPLOYMENT),
    azureTtsVoice: asOptionalString(env.AZURE_TTS_VOICE),
    azureSpeechEndpoint: asOptionalString(env.AZURE_SPEECH_ENDPOINT),
    azureSpeechVoice: asOptionalString(env.AZURE_SPEECH_VOICE),
  };
}

export interface SpeechConfigEnv {
  SPEECH_MODE?: string;
  REALTIME_SPEAK_ENABLED?: string;
  PRONUNCIATION_ASSESSMENT_ENABLED?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_REALTIME_DEPLOYMENT?: string;
  AZURE_TTS_DEPLOYMENT?: string;
  AZURE_TRANSCRIBE_DEPLOYMENT?: string;
  AZURE_TEXT_DEPLOYMENT?: string;
  AZURE_TTS_VOICE?: string;
  AZURE_SPEECH_ENDPOINT?: string;
  AZURE_SPEECH_VOICE?: string;
}
