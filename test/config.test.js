import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { getConfig, loadEnvironment } from '../server/config.js';

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('loads environment values without overriding existing process values', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mba-buddy-config-'));
  temporaryDirectories.push(directory);
  const envFile = join(directory, '.env');
  writeFileSync(envFile, [
    '# Provider settings',
    'AI_MODEL="test-model"',
    'PORT=4321 # local development',
    'export HOST=127.0.0.1',
    'EXISTING=from-file'
  ].join('\n'));

  const env = { EXISTING: 'from-process' };
  loadEnvironment(envFile, env);
  assert.deepEqual(env, {
    EXISTING: 'from-process',
    AI_MODEL: 'test-model',
    PORT: '4321',
    HOST: '127.0.0.1'
  });
});

test('validates provider URL and port while keeping a safe default model', () => {
  assert.deepEqual(getConfig({}), {
    apiKey: '',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    port: 3000,
    host: '127.0.0.1'
  });
  assert.throws(() => getConfig({ AI_BASE_URL: 'http://example.com/v1' }), /must use HTTPS/);
  assert.throws(() => getConfig({ AI_BASE_URL: 'https://user:pass@example.com/v1' }), /must not include credentials/);
  assert.throws(() => getConfig({ PORT: '70000' }), /PORT must be an integer/);
});
