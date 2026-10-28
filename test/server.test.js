import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createServer } from '../server.js';
import { RateLimiter } from '../server/rate-limit.js';

const runningServers = [];

async function openServer(options = {}) {
  const server = createServer({
    config: {
      apiKey: '',
      baseUrl: 'https://provider.example/v1',
      model: 'test-model'
    },
    fetchImpl: async () => Response.json({
      choices: [{ message: { content: 'A helpful study response.' } }]
    }),
    ...options
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  runningServers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) =>
    new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  ));
});

test('serves the app safely and reports provider readiness without secrets', async () => {
  const baseUrl = await openServer();
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await page.text(), /MBA Buddy/);

  const privateFile = await fetch(`${baseUrl}/.env`);
  assert.equal(privateFile.status, 404);

  const health = await fetch(`${baseUrl}/api/health`);
  assert.deepEqual(await health.json(), {
    status: 'ok',
    providerConfigured: false,
    model: 'test-model'
  });
});

test('returns a clear configuration error when no provider key is set', async () => {
  const baseUrl = await openServer();
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Explain NPV', subject: 'finance' })
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'AI_SERVICE_ERROR');
});

test('validates input and forwards only normalized chat history to the provider', async () => {
  let upstream;
  const baseUrl = await openServer({
    config: {
      apiKey: 'server-only-test-key',
      baseUrl: 'https://provider.example/v1',
      model: 'test-model'
    },
    fetchImpl: async (url, options) => {
      upstream = { url, options, body: JSON.parse(options.body) };
      return Response.json({ choices: [{ message: { content: 'NPV explanation.' } }] });
    }
  });

  const invalid = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'hello', subject: 'unknown' })
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'INVALID_SUBJECT');
  assert.equal(upstream, undefined);

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: 'Explain NPV',
      subject: 'finance',
      history: [{ role: 'bot', text: 'What would you like to know?' }]
    })
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: 'NPV explanation.',
    model: 'test-model'
  });
  assert.equal(upstream.url, 'https://provider.example/v1/chat/completions');
  assert.equal(upstream.options.headers.authorization, 'Bearer server-only-test-key');
  assert.deepEqual(upstream.body.messages.map(({ role }) => role), ['system', 'assistant', 'user']);
  assert.equal(JSON.stringify(upstream.body).includes('server-only-test-key'), false);
});

test('enforces per-client chat limits', async () => {
  const baseUrl = await openServer({
    config: {
      apiKey: 'test-key',
      baseUrl: 'https://provider.example/v1',
      model: 'test-model'
    },
    rateLimiter: new RateLimiter({ limit: 1, windowMs: 60_000 })
  });
  const send = () => fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Explain NPV', subject: 'finance' })
  });
  assert.equal((await send()).status, 200);
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});
