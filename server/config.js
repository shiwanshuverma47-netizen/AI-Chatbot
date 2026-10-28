import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function loadEnvironment(filePath = resolve(projectRoot, '.env'), target = process.env) {
  let contents;
  try {
    contents = readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return target;
    throw error;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.prototype.hasOwnProperty.call(target, match[1])) continue;

    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    target[match[1]] = value;
  }

  return target;
}

export function getConfig(env = process.env) {
  const model = env.AI_MODEL || 'llama-3.3-70b-versatile';
  const baseUrl = env.AI_BASE_URL || 'https://api.groq.com/openai/v1';

  let providerUrl;
  try {
    providerUrl = new URL(baseUrl);
  } catch (error) {
    throw new Error('AI_BASE_URL must be a valid URL');
  }
  if (providerUrl.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(providerUrl.hostname)) {
    throw new Error('AI_BASE_URL must use HTTPS except for localhost');
  }

  return {
    apiKey: env.AI_API_KEY || '',
    baseUrl: providerUrl.toString().replace(/\/+$/, ''),
    model,
    port: Number(env.PORT) || 3000,
    host: env.HOST || '127.0.0.1'
  };
}
