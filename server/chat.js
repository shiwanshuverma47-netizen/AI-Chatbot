const SUBJECTS = new Set(['finance', 'marketing', 'hr', 'operations']);
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_LENGTH = 10;

export class ChatRequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ProviderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateChatRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ChatRequestError(400, 'INVALID_REQUEST', 'Request body must be a JSON object');
  }

  if (typeof body.message !== 'string' || !body.message.trim()) {
    throw new ChatRequestError(400, 'INVALID_MESSAGE', 'Enter a study question before sending');
  }
  const message = body.message.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ChatRequestError(400, 'MESSAGE_TOO_LONG', `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }

  if (typeof body.subject !== 'string' || !SUBJECTS.has(body.subject)) {
    throw new ChatRequestError(400, 'INVALID_SUBJECT', 'Choose a supported MBA subject');
  }

  if (body.history !== undefined && !Array.isArray(body.history)) {
    throw new ChatRequestError(400, 'INVALID_HISTORY', 'Conversation history must be an array');
  }
  const history = body.history || [];
  if (history.length > MAX_HISTORY_LENGTH) {
    throw new ChatRequestError(400, 'HISTORY_TOO_LONG', `Include no more than ${MAX_HISTORY_LENGTH} recent messages`);
  }

  const sanitizedHistory = history.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || !['user', 'bot'].includes(entry.role)
      || typeof entry.text !== 'string'
      || !entry.text.trim()
      || entry.text.length > MAX_MESSAGE_LENGTH) {
      throw new ChatRequestError(400, 'INVALID_HISTORY_ENTRY', 'Conversation history contains an invalid message');
    }

    return {
      role: entry.role === 'bot' ? 'assistant' : 'user',
      content: entry.text.trim()
    };
  });

  return { message, subject: body.subject, history: sanitizedHistory };
}

function createSystemPrompt(subject) {
  return [
    'You are MBA Buddy, a clear and supportive MBA study assistant.',
    `The learner selected ${subject}. Keep explanations accurate, structured, and appropriate for MBA coursework.`,
    'Use concise examples when useful. If you are unsure, say so instead of inventing facts.',
    'For legal, regulatory, or current information, explain that the learner should check an authoritative up-to-date source.'
  ].join(' ');
}

export async function generateChatReply({ request, config, fetchImpl = fetch }) {
  if (!config.apiKey) {
    throw new ProviderError(503, 'AI service is not configured. Add AI_API_KEY to the server environment.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const messages = [
    { role: 'system', content: createSystemPrompt(request.subject) },
    ...request.history,
    { role: 'user', content: request.message }
  ];

  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.4,
        max_tokens: 700
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const status = response.status === 429 ? 503 : 502;
      throw new ProviderError(status, response.status === 429
        ? 'The AI service is busy. Please try again shortly.'
        : 'The AI service could not complete this request.');
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new ProviderError(502, 'The AI service returned an invalid response.');
    }

    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      throw new ProviderError(502, 'The AI service returned an empty response.');
    }

    return { reply: reply.trim(), model: config.model };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error.name === 'AbortError') {
      throw new ProviderError(504, 'The AI service took too long to respond. Please try again.');
    }
    throw new ProviderError(502, 'Could not reach the AI service. Check the server connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}
