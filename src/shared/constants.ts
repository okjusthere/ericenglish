export const SINGLE_USER_ID = 'primary';
export const APP_TIMEZONE = 'America/New_York';
export const MASTERY_THRESHOLDS = {
  recognizable: 70,
  recallable: 70,
  productive: 60,
  masteredRecognition: 85,
  masteredRecall: 80,
  masteredProduction: 70,
} as const;
export const ALLOWED_DAILY_MINUTES = [30, 45, 60, 75, 90] as const;
export const CARD_TYPES = ['recognition', 'active_recall', 'cloze', 'listening_recall'] as const;
export const AUDIO_MAX_BYTES = 12 * 1024 * 1024;
export const AUDIO_MIME_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'] as const;
