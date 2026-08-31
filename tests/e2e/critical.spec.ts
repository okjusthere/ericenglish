import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ request }, testInfo) => {
  if (!testInfo.title.includes('first-run bootstrap')) return;
  const response = await request.post('/api/data/delete-all', {
    headers: { 'x-eric-csrf': '1', origin: 'http://127.0.0.1:5173' },
    data: { confirmation: 'DELETE' },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
});

async function mockSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.defineProperty(window, '__spokenEnglish', { configurable: true, value: spoken });
    class Utterance {
      text: string; lang = ''; rate = 1; pitch = 1; voice: SpeechSynthesisVoice | null = null;
      onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [], cancel: () => undefined, resume: () => undefined,
      speak: (utterance: Utterance) => { spoken.push(utterance.text); utterance.onstart?.(); utterance.onend?.(); },
    } });
  });
  await page.route('**/api/audio/tts', async (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'TTS unavailable', fallback: true }) }));
}

async function mockServerAudio(page: Page) {
  await page.addInitScript(() => {
    const played: string[] = [];
    Object.defineProperty(window, '__serverAudio', { configurable: true, value: played });
    class ServerAudio {
      onplay: (() => void) | null = null; onended: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(public src: string) {} pause() {} removeAttribute() {}
      async play() { played.push(this.src); this.onplay?.(); queueMicrotask(() => this.onended?.()); }
    }
    Object.defineProperty(window, 'Audio', { configurable: true, value: ServerAudio });
  });
  await page.route('**/api/audio/tts', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audioUrl: '/api/audio/e2e-server-tts.mp3', fallback: false }) }));
}

async function mockRealtime(page: Page) {
  await page.addInitScript(() => {
    const state = { tracks: 0, remoteTracks: 0, canceled: 0 };
    Object.defineProperty(window, '__rtcState', { configurable: true, value: state });
    const channel: { readyState: string; onmessage: ((event: { data: string }) => void) | null; send: (value: string) => void; close: () => void } = {
      readyState: 'open', onmessage: null,
      send: (value) => { if (JSON.parse(value).type === 'response.cancel') state.canceled += 1; },
      close: () => undefined,
    };
    class Peer {
      connectionState = 'connected'; ontrack: ((event: { streams: MediaStream[] }) => void) | null = null; onconnectionstatechange: (() => void) | null = null;
      addTrack() { state.tracks += 1; } createDataChannel() { return channel; }
      async createOffer() { return { type: 'offer', sdp: 'offer-sdp' }; }
      async setLocalDescription() { return undefined; }
      async setRemoteDescription() {
        state.remoteTracks += 1; this.ontrack?.({ streams: [new MediaStream()] });
        queueMicrotask(() => {
          channel.onmessage?.({ data: JSON.stringify({ event_id: 'e2e-assistant-delta', type: 'response.output_audio_transcript.delta', delta: 'Realtime' }) });
          channel.onmessage?.({ data: JSON.stringify({ event_id: 'e2e-assistant-transcript', type: 'response.output_audio_transcript.done', transcript: 'Realtime coach reply.' }) });
        });
      }
      close() { return undefined; }
    }
    Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: Peer });
    const microphone = new MediaStream();
    Object.defineProperty(microphone, 'getTracks', { configurable: true, value: () => [{ stop: () => undefined }] });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => microphone } });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: async () => undefined });
  });
  await page.route('**/api/realtime/client-secret', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ clientSecret: 'ephemeral-e2e', expiresAt: null, signalingUrl: 'https://resource.test/openai/v1/realtime/calls', maxDurationSeconds: 300 }) }));
  await page.route('https://resource.test/**', async (route) => route.fulfill({ status: 200, contentType: 'application/sdp', body: 'answer-sdp' }));
  await page.route('**/api/realtime/sessions/**/events', async (route) => route.continue({ headers: { ...route.request().headers(), 'cf-access-authenticated-user-email': 'owner@example.com' } }));
}

test('first-run bootstrap, resumable runner, and core learning paths', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/today');
  const bootstrap = page.getByRole('button', { name: /Bootstrap English OS/i });
  await expect(page.locator('main')).toContainText(/Bootstrap English OS|Today, make it/i, { timeout: 15_000 });
  if (await bootstrap.isVisible()) await bootstrap.click();
  await expect(page.getByRole('heading', { name: /Today, make it/i })).toBeVisible({ timeout: 15_000 });

  await page.goto('/session');
  await page.getByRole('button', { name: /Due Review/i }).click();
  await expect(page.getByRole('heading', { name: /New Units/i })).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /New Units/i })).toBeVisible();
  const targetCount = await page.evaluate(async () => (await fetch('/api/today/session').then((response) => response.json()) as { targetUnits: unknown[] }).targetUnits.length);
  expect(targetCount).toBeGreaterThan(0);
  await page.getByRole('button', { name: /New Units/i }).click();
  for (let index = 0; index < targetCount; index += 1) {
    await page.getByRole('button', { name: /Complete & continue/i }).click();
    if (index < targetCount - 1) await expect(page).toHaveURL(new RegExp(`targetIndex=${index + 1}`));
  }
  await expect(page).toHaveURL(/\/session/);

  await page.goto('/review');
  await page.getByRole('button', { name: /Reveal answer/i }).click();
  await page.getByRole('button', { name: /Good/i }).click();
  await page.goto('/write');
  await page.getByPlaceholder(/Write without AI help/i).fill('Can the price lower?');
  await page.getByRole('button', { name: /Evaluate my draft/i }).click();
  await expect(page.getByText('NATURAL', { exact: true })).toBeVisible();
  await page.goto('/capture');
  await page.getByPlaceholder(/I wanted to say/i).fill('I wanted to ask whether the rent could change.');
  await page.getByRole('button', { name: 'Capture text' }).click();
  await expect(page.getByText('NATURAL REWRITE')).toBeVisible();
  await page.goto('/prepare');
  await page.getByRole('button', { name: /Build my preparation/i }).click();
  await expect(page.getByText('PHONE CHEAT SHEET')).toBeVisible();
  await page.getByPlaceholder(/Outcome, next step/i).fill('We confirmed a tour and the next step.');
  await page.getByRole('button', { name: /Save review/i }).click();
  await expect(page.getByText('NATURAL RETELLING', { exact: true })).toBeVisible();
  await page.goto('/drill');
  await page.getByRole('button', { name: /Reveal & hear model/i }).click();
  const model = await page.locator('.drill-answer h2').innerText();
  await page.getByPlaceholder(/type exactly what you said/i).fill(model);
  await page.getByRole('button', { name: /Check response/i }).click();
  await expect(page.getByText(/verified/i)).toBeVisible();
  await page.goto('/today');
  await page.getByLabel(/What did you actually say/i).fill(`I used ${model} in a real client conversation.`);
  await page.getByRole('button', { name: /Save verified usage/i }).click();
  await expect(page.getByText(/Actual usage saved/i)).toBeVisible();
  await page.goto('/progress');
  await expect(page.getByText('ACTIVE RECALL ACCURACY')).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByText('Own the complete record')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON' }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('eric-english-os');
});

test('text speaking session persists a turn', async ({ page }) => {
  await page.goto('/speak');
  await page.getByRole('button', { name: /Start fluency/i }).first().click();
  await page.getByPlaceholder(/Type a turn/i).fill('Could you clarify whether CAM is included?');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/I can check that/i)).toBeVisible();
});

test('realtime WebRTC connects, plays remote audio, persists transcript, and interrupts', async ({ page }) => {
  await mockRealtime(page);
  await page.goto('/speak');
  await page.getByRole('button', { name: /Start fluency/i }).first().click();
  await page.getByRole('button', { name: /Start realtime voice/i }).click();
  await expect(page.getByRole('button', { name: /Realtime connected/i })).toBeVisible();
  await expect(page.getByText('Realtime coach reply.')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Interrupt coach/i }).click();
  const state = await page.evaluate(() => (window as unknown as { __rtcState: { tracks: number; remoteTracks: number; canceled: number } }).__rtcState);
  expect(state).toMatchObject({ tracks: 1, remoteTracks: 1, canceled: 1 });
});

test('realtime provider failure keeps the turn-based speaking path usable', async ({ page }) => {
  await page.route('**/api/realtime/client-secret', async (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Realtime provider unavailable.' }) }));
  await page.goto('/speak');
  await page.getByRole('button', { name: /Start fluency/i }).first().click();
  await page.getByRole('button', { name: /Start realtime voice/i }).click();
  await expect(page.getByText(/Realtime provider unavailable.*Turn-based speaking is still available/i)).toBeVisible();
  await page.getByPlaceholder(/Type a turn/i).fill('Could you clarify whether CAM is included?');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/I can check that/i)).toBeVisible();
});

test('server TTS audio is preferred when the protected audio API succeeds', async ({ page }) => {
  await mockServerAudio(page);
  await page.goto('/learn/unit-001');
  await page.getByRole('button', { name: /Hear pronunciation/i }).click();
  const urls = () => page.evaluate(() => (window as unknown as { __serverAudio: string[] }).__serverAudio);
  await expect.poll(urls).toContain('/api/audio/e2e-server-tts.mp3');
});

test('browser speech fallback covers Learn, Review, Drill, Prepare, and Speak corrections', async ({ page }) => {
  test.setTimeout(60_000);
  await mockSpeech(page);
  const plays = () => page.evaluate(() => (window as unknown as { __spokenEnglish: string[] }).__spokenEnglish.length);
  await page.goto('/review');
  await page.getByRole('button', { name: /Reveal answer/i }).click();
  await expect(page.getByRole('button', { name: /Replay natural answer/i })).toBeVisible();
  await expect.poll(plays).toBeGreaterThan(0);
  await page.goto('/drill');
  await page.getByRole('button', { name: /Reveal & hear model/i }).click();
  await expect(page.getByRole('button', { name: /Replay model answer/i })).toBeVisible();
  await expect.poll(plays).toBeGreaterThan(0);
  await page.goto('/library');
  await page.locator('.unit-table:not(.head)').first().click();
  await page.getByRole('button', { name: /Hear pronunciation/i }).click();
  await expect.poll(plays).toBeGreaterThan(0);
  await page.goto('/prepare');
  await page.getByRole('button', { name: /Build my preparation/i }).click();
  await page.getByRole('button', { name: 'Hear opening' }).click();
  await expect.poll(plays).toBeGreaterThan(0);
  await page.goto('/speak');
  await page.getByRole('button', { name: /Start fluency/i }).first().click();
  await page.getByPlaceholder(/Type a turn/i).fill('Can the price lower?');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Replay coach' })).toBeVisible();
  await expect.poll(plays).toBeGreaterThan(0);
  await page.getByRole('button', { name: /Finish & analyze/i }).click();
  await expect(page.getByRole('button', { name: 'Hear correction' }).first()).toBeVisible({ timeout: 20_000 });
  const before = await plays();
  await page.getByRole('button', { name: 'Hear correction' }).first().click();
  await expect.poll(plays).toBeGreaterThan(before);
});
