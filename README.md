# MBA Buddy

MBA Buddy is a lightweight, static study-assistant demo for reviewing Finance,
Marketing, HR, and Operations topics. It runs entirely in the browser and does
not currently connect to an AI model or backend: replies are predefined study
prompts in `script.js`.

## Features

- Subject-specific quick topics, suggestions, and quiz prompts
- Topic-focused study explanations and scored, multi-question quizzes
- Locally saved chat history, study notes, and theme preference
- Search chat history and copy assistant responses
- Export chat history and export or import notes as JSON
- Responsive layout with light and dark themes
- Keyboard-accessible controls and visible focus indicators

## Run locally

No package installation or build step is required. Open `index.html` directly,
or serve the project directory with any static web server. For example:

```sh
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and accessible controls |
| `style.css` | Layout, responsive styles, and themes |
| `script.js` | Subject prompts, chat interactions, and browser storage |
| `config.js` | Front-end defaults |

## Data and privacy

Chat history, saved notes, and the selected theme are stored in the browser's
`localStorage`. They remain on the current browser profile and are not synced
to a server. Notes can be exported to or imported from a JSON backup; imports
are validated, merged by note ID, and limited to the five most recent notes.
Clearing browser site data removes locally saved data.

## Contributing

Changes to this static app should be tested in a browser at desktop and mobile
widths. No test runner or package manager is currently configured.
