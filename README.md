# MBA Buddy

MBA Buddy is a study assistant for MBA Finance, Marketing, HR, and Operations.
The browser UI is served by a small Node.js backend. Chat questions are sent to
the configured OpenAI-compatible AI provider from the server; provider
credentials are never placed in frontend code.

## Requirements

- Node.js 20 or newer
- An API key for an OpenAI-compatible chat-completions provider

## Run locally

1. Copy `.env.example` to `.env`.
2. Create a new provider key in the provider dashboard, then set `AI_API_KEY` in
   `.env`. Never paste API keys into chat, frontend code, or Git commits. If a
   key has been shared or committed, revoke it and issue a replacement.
   `.env` is ignored by Git.
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
  errors, including actionable setup messages for rejected keys and unavailable
  models.

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
`localStorage`. When asking a question, the latest conversation messages are
sent to the backend and then to the configured AI provider as context. Saved
notes and theme preferences are not sent.

Never put an API key in a chat request, frontend code, or a commit. If a key has
been shared or committed, revoke it with the provider and configure a new key
locally in `.env`. Removing a key from the latest version does not remove it
from older Git history, so previously committed keys must still be revoked.
