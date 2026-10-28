import { createReadStream, statSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, loadEnvironment } from './server/config.js';
import {
  ChatRequestError,
  generateChatReply,
  ProviderError,
  validateChatRequest
} from './server/chat.js';
import { RateLimiter } from './server/rate-limit.js';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);
const publicFiles = new Set(['/index.html', '/style.css', '/script.js', '/config.js']);
const MAX_BODY_BYTES = 16 * 1024;
const chatRateLimiter = new RateLimiter({ limit: 20, windowMs: 60_000 });

function setSecurityHeaders(response) {
  response.setHeader('content-security-policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "font-src 'self' https://cdnjs.cloudflare.com",
    "connect-src 'self'",
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; '));
  response.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('x-frame-options', 'DENY');
  response.setHeader('x-permitted-cross-domain-policies', 'none');
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';
    let rejected = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (!rejected && Buffer.byteLength(body) > MAX_BODY_BYTES) {
        rejected = true;
        rejectBody(new ChatRequestError(413, 'BODY_TOO_LARGE', 'Request body exceeds 16 KB'));
      }
    });
    request.on('end', () => {
      if (rejected) return;
      try {
        resolveBody(JSON.parse(body));
      } catch (error) {
        rejectBody(new ChatRequestError(400, 'INVALID_JSON', 'Request body must be valid JSON'));
      }
    });
    request.on('error', () => {
      if (!rejected) {
        rejectBody(new ChatRequestError(400, 'REQUEST_READ_FAILED', 'Could not read request body'));
      }
    });
  });
}

function serveStaticFile(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (error) {
    sendJson(response, 400, { error: 'Invalid URL path' });
    return;
  }

  const publicPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
  if (!publicFiles.has(publicPath)) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }
  const filePath = resolve(projectRoot, relativePath);
  if (filePath !== projectRoot && !filePath.startsWith(projectRoot + sep)) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  try {
    if (!statSync(filePath).isFile()) {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }
  } catch (error) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  response.writeHead(200, {
    'content-type': contentTypes.get(extname(filePath)) || 'application/octet-stream',
    'x-content-type-options': 'nosniff'
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

export function createServer({
  env = process.env,
  config = getConfig(env),
  fetchImpl = fetch,
  rateLimiter = chatRateLimiter
} = {}) {
  return createHttpServer(async (request, response) => {
    setSecurityHeaders(response);
    const requestUrl = new URL(request.url || '/', 'http://localhost');

    if (requestUrl.pathname === '/api/health') {
      response.setHeader('cache-control', 'no-store');
      if (request.method !== 'GET') {
        response.setHeader('allow', 'GET');
        sendJson(response, 405, { error: 'Method not allowed' });
        return;
      }

      sendJson(response, 200, {
        status: 'ok',
        providerConfigured: Boolean(config.apiKey),
        model: config.model
      });
      return;
    }

    if (requestUrl.pathname === '/api/chat') {
      response.setHeader('cache-control', 'no-store');
      if (request.method !== 'POST') {
        response.setHeader('allow', 'POST');
        sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
        return;
      }

      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
        sendJson(response, 415, { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send a JSON request body' } });
        return;
      }

      const clientKey = request.socket.remoteAddress || 'unknown';
      const limit = rateLimiter.consume(clientKey);
      if (!limit.allowed) {
        response.setHeader('retry-after', limit.retryAfterSeconds.toString());
        sendJson(response, 429, {
          error: { code: 'RATE_LIMITED', message: 'Too many chat requests. Please wait before trying again.' }
        });
        return;
      }

      const contentLength = Number(request.headers['content-length']);
      if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
        sendJson(response, 413, {
          error: { code: 'BODY_TOO_LARGE', message: 'Request body exceeds 16 KB' }
        });
        return;
      }

      try {
        const requestBody = await readJsonBody(request);
        const validatedRequest = validateChatRequest(requestBody);
        const result = await generateChatReply({ request: validatedRequest, config, fetchImpl });
        sendJson(response, 200, result);
      } catch (error) {
        if (error instanceof ChatRequestError || error instanceof ProviderError) {
          sendJson(response, error.status, {
            error: { code: error.code || 'AI_SERVICE_ERROR', message: error.message }
          });
          return;
        }
        console.error('Unexpected chat request failure:', error);
        sendJson(response, 500, {
          error: { code: 'INTERNAL_ERROR', message: 'The server could not process this request.' }
        });
      }
      return;
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'API route not found' });
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('allow', 'GET, HEAD');
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    serveStaticFile(request, response, requestUrl.pathname);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadEnvironment();
  const config = getConfig();
  const server = createServer({ config });
  server.listen(config.port, config.host, () => {
    console.log(`MBA Buddy backend listening on http://${config.host}:${config.port}`);
  });
}
