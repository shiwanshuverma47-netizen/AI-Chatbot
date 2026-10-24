// script.js — chatbot UI interactions with quick prompts and saved history

const subjectBtns = document.querySelectorAll('.subject-btn');
const topicChips = document.querySelectorAll('.topic-chip');
const sendBtn = document.getElementById('sendBtn');
const quizBtn = document.getElementById('quizBtn');
const clearBtn = document.getElementById('clearBtn');
const userInput = document.getElementById('userInput');
const messages = document.getElementById('messages');
const activeBadge = document.getElementById('activeBadge');
const saveStatus = document.getElementById('saveStatus');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const quickSuggestions = document.getElementById('quickSuggestions');
const themeToggle = document.getElementById('themeToggle');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const exportNotesBtn = document.getElementById('exportNotesBtn');
const notesPanel = document.getElementById('notesPanel');
const toast = document.getElementById('toast');
const focusCopy = document.getElementById('focusCopy');

const STORAGE_KEY = 'mba-buddy-chat-history';
const THEME_STORAGE_KEY = window.MBA_BUDDY_CONFIG?.themeKey || 'mba-buddy-theme';
const SUBJECT_STORAGE_KEY = 'mba-buddy-active-subject';
const NOTES_STORAGE_KEY = 'mba-buddy-saved-notes';
let activeSubject = 'finance';
let chatHistory = [];
let savedNotes = [];

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    showToast('Browser storage is unavailable');
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    showToast('Changes could not be saved in this browser');
    return false;
  }
}

const subjectReplies = {
  finance: {
    quiz: 'Quick finance quiz: What is the main difference between NPV and IRR?',
    tip: 'Finance revision tip: write one formula, one example, and one exam takeaway for every topic.',
    default: 'I can help with finance topics like NPV, CAPM, ratio analysis, and capital structure.',
    focus: 'Finance • Build confidence with formulas and case examples'
  },
  marketing: {
    quiz: 'Quick marketing quiz: Why is segmentation important in a go-to-market strategy?',
    tip: 'Marketing revision tip: connect each concept to one real brand example for faster recall.',
    default: 'I can help with marketing topics like 4Ps, STP, branding, and consumer behaviour.',
    focus: 'Marketing • Compare brand strategy with practical campaign examples'
  },
  hr: {
    quiz: 'Quick HR quiz: What is the main purpose of performance management systems?',
    tip: 'HR revision tip: summarise each topic in one definition, one example, and one challenge.',
    default: 'I can help with HR topics like recruitment, performance management, and organizational behaviour.',
    focus: 'HR • Link people practices to organizational outcomes'
  },
  operations: {
    quiz: 'Quick operations quiz: How does inventory management affect customer service?',
    tip: 'Operations revision tip: focus on process flow, bottlenecks, and key metrics.',
    default: 'I can help with operations topics like supply chain, Six Sigma, and inventory management.',
    focus: 'Operations • Map the process flow and identify bottlenecks'
  }
};

function setActiveSubject(subject, button) {
  if (!Object.prototype.hasOwnProperty.call(subjectReplies, subject)) {
    subject = 'finance';
    button = document.querySelector('.subject-btn[data-subject="finance"]');
  }

  subjectBtns.forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  if (button) {
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
  }

  activeSubject = subject;
  writeStorage(SUBJECT_STORAGE_KEY, subject);
  activeBadge.textContent = button?.dataset.label || subject.charAt(0).toUpperCase() + subject.slice(1);

  document.querySelectorAll('.topic-group').forEach((group) => group.classList.add('hidden'));
  const activeGroup = document.getElementById('topics-' + activeSubject);
  if (activeGroup) {
    activeGroup.classList.remove('hidden');
  }

  updateFocusStrip();
  updateSuggestionChips();
}

function closeSidebar(restoreFocus = false) {
  const wasOpen = sidebar.classList.contains('open');
  sidebar.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation menu');
  if (restoreFocus && wasOpen) {
    menuToggle.focus();
  }
}

function updateFocusStrip() {
  if (!focusCopy) return;
  const currentSubject = subjectReplies[activeSubject] || subjectReplies.finance;
  focusCopy.textContent = currentSubject.focus;
}

function updateSuggestionChips() {
  if (!quickSuggestions) return;

  const prompts = {
    finance: ['Explain NPV simply', 'Give me 3 finance revision tips', 'Quiz me on Finance'],
    marketing: ['Explain 4Ps simply', 'Give me 3 marketing revision tips', 'Quiz me on Marketing'],
    hr: ['Explain HR basics', 'Give me 3 HR revision tips', 'Quiz me on HR'],
    operations: ['Explain supply chain basics', 'Give me 3 operations revision tips', 'Quiz me on Operations']
  };

  const chips = prompts[activeSubject] || prompts.finance;
  quickSuggestions.innerHTML = chips
    .map((text) => `<button class="suggestion-chip" type="button">${text}</button>`)
    .join('');

  quickSuggestions.querySelectorAll('.suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => sendMessage(chip.textContent.trim()));
  });
}

function loadChatHistory() {
  try {
    const stored = readStorage(STORAGE_KEY);
    if (!stored) return [];
    const history = JSON.parse(stored);
    if (!Array.isArray(history)) {
      showToast('Saved chat data was invalid and was ignored');
      return [];
    }
    const validEntries = history.filter((entry) =>
      entry
      && typeof entry.text === 'string'
      && (entry.role === 'user' || entry.role === 'bot')
    );
    if (validEntries.length !== history.length) {
      showToast('Some saved chat messages were invalid and skipped');
    }
    return validEntries.slice(-100);
  } catch (error) {
    showToast('Saved chat data could not be read');
    return [];
  }
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);

  if (themeToggle) {
    const icon = themeToggle.querySelector('i');
    const label = themeToggle.querySelector('span');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    if (label) {
      label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }
  }
}

function initializeTheme() {
  const savedTheme = readStorage(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const defaultTheme = window.MBA_BUDDY_CONFIG?.defaultTheme || 'light';
  const theme = savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : (prefersDark ? 'dark' : defaultTheme);
  applyTheme(theme);
}

function saveChatHistory() {
  const saved = writeStorage(STORAGE_KEY, JSON.stringify(chatHistory));
  if (saveStatus) {
    saveStatus.textContent = saved ? 'Autosaved' : 'Not saved';
  }
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  const container = document.createElement('div');
  container.textContent = value;
  return container.innerHTML;
}

function loadSavedNotes() {
  try {
    const stored = readStorage(NOTES_STORAGE_KEY);
    if (!stored) return [];
    const notes = JSON.parse(stored);
    if (!Array.isArray(notes)) {
      showToast('Saved notes data was invalid and was ignored');
      return [];
    }
    const validNotes = notes.filter((note) =>
      note
      && typeof note.id === 'string'
      && typeof note.subject === 'string'
      && typeof note.createdAt === 'string'
      && typeof note.title === 'string'
      && typeof note.content === 'string'
    );
    if (validNotes.length !== notes.length) {
      showToast('Some saved notes were invalid and skipped');
    }
    return validNotes.slice(0, 5);
  } catch (error) {
    showToast('Saved notes data could not be read');
    return [];
  }
}

function renderNotes() {
  if (!notesPanel) return;

  if (!savedNotes.length) {
    notesPanel.innerHTML = '<div class="note-empty">Save a topic summary to keep revision points for later.</div>';
    return;
  }

  notesPanel.innerHTML = savedNotes
    .map((note) => `
      <article class="note-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <strong>${escapeHtml(note.subject)}</strong>
          <button class="note-delete" data-id="${note.id}" aria-label="Delete note">✕</button>
        </div>
        <span>${escapeHtml(note.createdAt)}</span>
        <p>${escapeHtml(note.title)}</p>
      </article>
    `)
    .join('');

  notesPanel.querySelectorAll('.note-delete').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = button.getAttribute('data-id');
      const nextNotes = savedNotes.filter((note) => note.id !== id);
      if (!writeStorage(NOTES_STORAGE_KEY, JSON.stringify(nextNotes))) return;
      savedNotes = nextNotes;
      renderNotes();
      showToast('Note removed');
    });
  });
  updateExportButtonState();
}

function updateExportButtonState() {
  if (!exportNotesBtn) return;
  const has = savedNotes && savedNotes.length > 0;
  exportNotesBtn.disabled = !has;
  exportNotesBtn.setAttribute('aria-disabled', (!has).toString());
}

function exportNotes() {
  if (!savedNotes || !savedNotes.length) {
    showToast('No notes to export');
    return;
  }

  const data = JSON.stringify(savedNotes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const datePart = new Date().toISOString().slice(0,10);
  const subjectPart = (activeBadge?.textContent || activeSubject).toString().replace(/\s+/g, '-').toLowerCase();
  a.download = `mba-buddy-notes-${subjectPart}-${savedNotes.length}-${datePart}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(`Exported ${savedNotes.length} note${savedNotes.length>1?'s':''}`);
}

function saveCurrentNote() {
  if (!chatHistory.length) {
    showToast('Start a conversation first');
    return;
  }

  const latestUserEntry = [...chatHistory].reverse().find((entry) => entry.role === 'user');
  const latestBotEntry = [...chatHistory].reverse().find((entry) => entry.role === 'bot');
  const note = {
    id: Date.now().toString(),
    subject: activeBadge?.textContent || activeSubject.charAt(0).toUpperCase() + activeSubject.slice(1),
    title: latestUserEntry ? latestUserEntry.text : 'Study session',
    createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    content: latestBotEntry ? latestBotEntry.text : subjectReplies[activeSubject].default
  };

  const nextNotes = [note, ...savedNotes].slice(0, 5);
  if (!writeStorage(NOTES_STORAGE_KEY, JSON.stringify(nextNotes))) return;
  savedNotes = nextNotes;
  renderNotes();
  showToast('Study note saved');
}

function showEmptyState() {
  messages.innerHTML = '<div class="empty-state">Start a conversation to save your study notes here.</div>';
}

function renderChatHistory() {
  messages.innerHTML = '';
  if (!chatHistory.length) {
    showEmptyState();
    return;
  }
  chatHistory.forEach((entry) => addMessage(entry.text, entry.role, false));
  messages.scrollTop = messages.scrollHeight;
}

function sendMessage(text) {
  const value = text.trim();
  if (!value) return;

  addMessage(value, 'user', true);
  userInput.value = '';
  showTyping();

  setTimeout(() => {
    removeTyping();
    const reply = getBotReply(value);
    addMessage(reply, 'bot', true);
  }, 1000);
}

function getBotReply(userText) {
  const lowerText = userText.toLowerCase();
  const label = activeSubject.charAt(0).toUpperCase() + activeSubject.slice(1);

  if (lowerText.includes('quiz')) {
    return `${subjectReplies[activeSubject].quiz} (${label})`;
  }

  if (lowerText.includes('tip') || lowerText.includes('revision')) {
    return subjectReplies[activeSubject].tip;
  }

  return subjectReplies[activeSubject].default;
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function addMessage(text, role, persist = true) {
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'bot' ? 'bot-msg' : 'user-msg');

  const timestamp = `<span class="msg-time">${formatTime()}</span>`;
  const safeText = escapeHtml(text);

  if (role === 'bot') {
    div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble">${safeText}<div class="msg-meta">${timestamp}</div></div>`;
  } else {
    div.innerHTML = `<div class="msg-bubble">${safeText}<div class="msg-meta">${timestamp}</div></div>`;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  if (persist) {
    chatHistory.push({ text, role });
    saveChatHistory();
  }
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot-msg';
  div.id = 'typing';
  div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble"><div class="typing-bubble"><span></span><span></span><span></span></div></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

subjectBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    setActiveSubject(btn.dataset.subject, btn);
    if (window.matchMedia('(max-width: 700px)').matches) {
      closeSidebar();
    }
  });
});

topicChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    userInput.value = chip.textContent.trim();
    userInput.focus();
    closeSidebar();
  });
});

sendBtn.addEventListener('click', () => sendMessage(userInput.value));
userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage(userInput.value);
  }
});

quizBtn.addEventListener('click', () => {
  sendMessage(`Quiz me on ${activeSubject.charAt(0).toUpperCase() + activeSubject.slice(1)}`);
});

clearBtn.addEventListener('click', () => {
  if (chatHistory.length && !window.confirm('Clear this study conversation?')) {
    return;
  }
  chatHistory = [];
  saveChatHistory();
  showEmptyState();
  updateSuggestionChips();
});

menuToggle.addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', isOpen.toString());
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
});

document.addEventListener('click', (event) => {
  if (sidebar.classList.contains('open')
    && !sidebar.contains(event.target)
    && !menuToggle.contains(event.target)) {
    closeSidebar();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar.classList.contains('open')) {
    closeSidebar(true);
  }
});

themeToggle?.addEventListener('click', () => {
  const nextTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  writeStorage(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
});

saveNoteBtn?.addEventListener('click', saveCurrentNote);

// keyboard shortcut: Ctrl/Cmd+E to export notes
document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const target = event.target;
  const isEditing = target instanceof HTMLElement
    && (target.isContentEditable || target.matches('input, textarea, select'));
  if ((event.ctrlKey || event.metaKey) && key === 'e' && !isEditing && !event.repeat) {
    event.preventDefault();
    exportNotes();
  }
});

initializeTheme();
chatHistory = loadChatHistory();
savedNotes = loadSavedNotes();
renderNotes();
updateExportButtonState();
if (chatHistory.length) {
  renderChatHistory();
} else {
  updateSuggestionChips();
}

const savedSubject = readStorage(SUBJECT_STORAGE_KEY);
const isKnownSubject = Object.prototype.hasOwnProperty.call(subjectReplies, savedSubject);
const initialButton = isKnownSubject
  ? Array.from(subjectBtns).find((button) => button.dataset.subject === savedSubject)
  : document.querySelector('.subject-btn.active');
setActiveSubject(isKnownSubject ? savedSubject : activeSubject, initialButton || document.querySelector('.subject-btn.active'));