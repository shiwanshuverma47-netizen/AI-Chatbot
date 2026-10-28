# MBA Buddy

MBA Buddy is a study assistant for MBA Finance, Marketing, HR, and Operations.
The browser UI is served by a small Node.js backend. Chat questions are sent to
an OpenAI-compatible AI provider from the server; provider credentials are
never placed in frontend code.

## Requirements

- Node.js 20 or newer
- An API key for an OpenAI-compatible chat-completions provider

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `AI_API_KEY` in `.env`. Keep this file private; it is ignored by Git.
3. Optionally adjust `AI_BASE_URL`, `AI_MODEL`, `HOST`, or `PORT`.
4. Start the app:

   ```sh
   npm start
   ```

5. Open <http://127.0.0.1:3000>.

The default provider URL and model target Groq's OpenAI-compatible API. Set
`AI_BASE_URL` and `AI_MODEL` to use another compatible service. Without an API
key the server still serves the app and reports that chat is not configured;
it does not silently substitute canned answers for AI responses.

## Backend API

- `GET /api/health` reports whether a provider key is configured (never returns
  the key).
- `POST /api/chat` accepts JSON with `message`, `subject`, and optional recent
  `history`. Subjects are `finance`, `marketing`, `hr`, and `operations`.
- Chat requests are validated, limited in size and rate, and sent to the
  provider with a server-side timeout. Provider failures return explicit
  errors.

Run the backend tests with:

```sh
npm test
```

## Project files

| File | Purpose |
| --- | --- |
| `server.js` | HTTP server, static assets, and API routes |
| `server/config.js` | Environment configuration |
| `server/chat.js` | Request validation and provider integration |
| `server/rate-limit.js` | In-memory API rate limiter |
| `index.html` | Accessible chat UI |
| `script.js` | Chat UI, local notes, and API client |
| `style.css` | Responsive layout and themes |

Saved chat history, notes, and theme preferences remain in the browser's
`localStorage`; they are not sent to the backend unless recent chat messages
are included as context with a chat request.
