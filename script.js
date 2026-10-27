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
const exportChatBtn = document.getElementById('exportChatBtn');
const notesPanel = document.getElementById('notesPanel');
const toast = document.getElementById('toast');
const focusCopy = document.getElementById('focusCopy');
const historySearch = document.getElementById('historySearch');
const searchStatus = document.getElementById('searchStatus');

const STORAGE_KEY = 'mba-buddy-chat-history';
const THEME_STORAGE_KEY = window.MBA_BUDDY_CONFIG?.themeKey || 'mba-buddy-theme';
const SUBJECT_STORAGE_KEY = 'mba-buddy-active-subject';
const NOTES_STORAGE_KEY = 'mba-buddy-saved-notes';
let activeSubject = 'finance';
let chatHistory = [];
let savedNotes = [];
let activeQuiz = null;
const pendingReplyTimers = new Set();

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
    focus: 'Finance • Build confidence with formulas and case examples',
    topics: [
      {
        keywords: ['npv', 'net present value'],
        answer: 'Net present value (NPV) is the present value of a project’s expected cash inflows minus its upfront investment. Discount future cash flows at the required return; a positive NPV means the project is expected to add value. Example: if discounted inflows are ₹1,20,000 and the initial cost is ₹1,00,000, NPV is ₹20,000.'
      },
      {
        keywords: ['capm', 'capital asset pricing'],
        answer: 'CAPM estimates a share’s required return: expected return = risk-free rate + beta × (market return − risk-free rate). Beta measures how sensitive the share is to market movements. For example, with a 6% risk-free rate, beta of 1.2, and a 5% market risk premium, the estimate is 12%.'
      },
      {
        keywords: ['ratio analysis', 'financial ratio'],
        answer: 'Ratio analysis compares financial statement figures to assess performance. Liquidity ratios (such as the current ratio) assess short-term obligations; profitability ratios (such as net margin) show profit generation; leverage ratios show reliance on debt. Compare ratios over time and against relevant peers.'
      },
      {
        keywords: ['capital structure', 'debt equity', 'debt-equity'],
        answer: 'Capital structure is the mix of debt and equity used to finance a business. Debt can lower the average cost of capital because interest may be tax-deductible, but too much debt increases fixed-payment and financial-distress risk. The appropriate mix depends on cash-flow stability, taxes, and business risk.'
      }
    ]
  },
  marketing: {
    quiz: 'Quick marketing quiz: Why is segmentation important in a go-to-market strategy?',
    tip: 'Marketing revision tip: connect each concept to one real brand example for faster recall.',
    default: 'I can help with marketing topics like 4Ps, STP, branding, and consumer behaviour.',
    focus: 'Marketing • Compare brand strategy with practical campaign examples',
    topics: [
      {
        keywords: ['4ps', 'marketing mix'],
        answer: 'The marketing mix’s 4Ps are Product (what is offered), Price (what customers pay), Place (how it reaches them), and Promotion (how customers learn about it). Strong plans align all four—for example, premium pricing should match product quality, distribution, and brand messaging.'
      },
      {
        keywords: ['stp', 'segmentation', 'targeting', 'positioning'],
        answer: 'STP means Segmentation, Targeting, and Positioning. First group customers with shared needs, then select the segment(s) the business can serve well, and finally define how the offer should be perceived versus alternatives. A clear position guides product, pricing, and promotion decisions.'
      },
      {
        keywords: ['consumer behaviour', 'consumer behavior'],
        answer: 'Consumer behaviour studies how people choose, buy, use, and evaluate products. Needs, culture, social groups, personal circumstances, and perceptions can all influence a purchase. Mapping the customer journey helps marketers identify where useful information or support is needed.'
      },
      {
        keywords: ['branding', 'brand strategy'],
        answer: 'A brand strategy defines the promise and associations a business wants customers to remember. It combines a clear audience, a distinctive value proposition, consistent identity, and reliable customer experiences. Consistency across touchpoints helps build recognition and trust.'
      }
    ]
  },
  hr: {
    quiz: 'Quick HR quiz: What is the main purpose of performance management systems?',
    tip: 'HR revision tip: summarise each topic in one definition, one example, and one challenge.',
    default: 'I can help with HR topics like recruitment, performance management, and organizational behaviour.',
    focus: 'HR • Link people practices to organizational outcomes',
    topics: [
      {
        keywords: ['recruitment', 'recruiting', 'hiring'],
        answer: 'A recruitment process typically defines the role, attracts candidates, screens applications, assesses job-related skills, checks references where appropriate, and makes an offer. Clear criteria and structured interviews improve consistency and help reduce avoidable bias.'
      },
      {
        keywords: ['performance management', 'performance review'],
        answer: 'Performance management is an ongoing process of setting expectations, supporting work, reviewing progress, and agreeing on development. Useful goals are specific and connected to team outcomes. Regular feedback makes an annual review less surprising and more actionable.'
      },
      {
        keywords: ['ob', 'organizational behaviour', 'organizational behavior'],
        answer: 'Organizational behaviour (OB) examines how individuals and groups act at work and how organizational structures affect them. Common topics include motivation, leadership, communication, team dynamics, and culture. OB helps managers understand workplace behaviour and improve collaboration.'
      },
      {
        keywords: ['labour law', 'labor law', 'employment law'],
        answer: 'Employment and labour requirements depend on the jurisdiction, worker category, and current legislation. For an exam answer, identify the relevant rule, explain who it covers, and apply it to the facts. Verify legal details against current official sources rather than relying on a general summary.'
      }
    ]
  },
  operations: {
    quiz: 'Quick operations quiz: How does inventory management affect customer service?',
    tip: 'Operations revision tip: focus on process flow, bottlenecks, and key metrics.',
    default: 'I can help with operations topics like supply chain, Six Sigma, and inventory management.',
    focus: 'Operations • Map the process flow and identify bottlenecks',
    topics: [
      {
        keywords: ['supply chain', 'supply chain management'],
        answer: 'A supply chain coordinates the flow of materials, information, and products from suppliers through production and distribution to customers. Managers balance cost, speed, quality, and resilience. Mapping the chain can reveal delays, excess inventory, or single points of failure.'
      },
      {
        keywords: ['six sigma', 'six-sigma'],
        answer: 'Six Sigma is a data-driven approach to reducing process defects and variation. Its DMAIC cycle is Define the problem, Measure current performance, Analyze causes, Improve the process, and Control the gains. Start with a measurable customer-impacting problem.'
      },
      {
        keywords: ['tqm', 'total quality management'],
        answer: 'Total Quality Management (TQM) is an organization-wide commitment to continuous improvement and customer-focused quality. It relies on employee involvement, process measurement, prevention of defects, and learning from results—not just inspecting finished products.'
      },
      {
        keywords: ['inventory', 'stock management'],
        answer: 'Inventory management balances having enough stock to meet demand against the cost of storing it. Reorder points, demand forecasts, lead times, and safety stock help guide decisions. Too little stock risks missed sales; too much ties up cash and space.'
      }
    ]
  }
};

const quizQuestions = {
  finance: [
    {
      question: 'What does NPV stand for?',
      acceptedAnswers: ['net present value'],
      explanation: 'NPV is the present value of expected cash flows minus the initial investment.'
    },
    {
      question: 'In CAPM, what does beta measure?',
      acceptedAnswers: ['systematic risk', 'market risk', 'sensitivity to market movements'],
      explanation: 'Beta measures how sensitive an investment is to movements in the overall market.'
    }
  ],
  marketing: [
    {
      question: 'What do the 4Ps describe?',
      acceptedAnswers: ['product price place promotion', 'product, price, place, promotion', 'marketing mix'],
      explanation: 'The 4Ps are Product, Price, Place, and Promotion—the elements of the marketing mix.'
    },
    {
      question: 'In STP, what does the T stand for?',
      acceptedAnswers: ['targeting', 'target'],
      explanation: 'STP stands for Segmentation, Targeting, and Positioning.'
    }
  ],
  hr: [
    {
      question: 'What is the main purpose of performance management?',
      acceptedAnswers: ['improve performance', 'align and improve performance', 'support employee performance'],
      explanation: 'Performance management aligns expectations, feedback, and development with work outcomes.'
    },
    {
      question: 'What does OB stand for in management studies?',
      acceptedAnswers: ['organizational behaviour', 'organizational behavior', 'organisation behaviour', 'organisation behavior'],
      explanation: 'OB is Organizational Behaviour: the study of people and groups at work.'
    }
  ],
  operations: [
    {
      question: 'What is the first step in the DMAIC cycle?',
      acceptedAnswers: ['define'],
      explanation: 'DMAIC starts with Define, followed by Measure, Analyze, Improve, and Control.'
    },
    {
      question: 'What is safety stock held to protect against?',
      acceptedAnswers: ['demand or supply uncertainty', 'uncertainty', 'unexpected demand or delays'],
      explanation: 'Safety stock buffers against demand changes and replenishment delays.'
    }
  ]
};

function normalizeAnswer(value) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function startQuiz(subject) {
  activeQuiz = { subject, questionIndex: 0, correctAnswers: 0 };
  const firstQuestion = quizQuestions[subject][0];
  return `Let's do a ${quizQuestions[subject].length}-question ${subject} quiz. Reply with your answer, or type "stop quiz" to end.\n\nQuestion 1: ${firstQuestion.question}`;
}

function answerQuiz(userText) {
  if (['stop quiz', 'quit quiz', 'exit quiz'].includes(normalizeAnswer(userText))) {
    activeQuiz = null;
    return 'Quiz stopped. You can start another one whenever you like.';
  }

  const questions = quizQuestions[activeQuiz.subject];
  const question = questions[activeQuiz.questionIndex];
  const answer = normalizeAnswer(userText);
  const isCorrect = question.acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === answer);
  if (isCorrect) {
    activeQuiz.correctAnswers += 1;
  }

  const feedback = isCorrect ? 'Correct!' : `Not quite. A good answer is: ${question.acceptedAnswers[0]}.`;
  const explanation = question.explanation;
  activeQuiz.questionIndex += 1;

  if (activeQuiz.questionIndex >= questions.length) {
    const result = `${feedback} ${explanation}\n\nQuiz complete: ${activeQuiz.correctAnswers} of ${questions.length} correct.`;
    activeQuiz = null;
    return result;
  }

  const nextQuestion = questions[activeQuiz.questionIndex];
  return `${feedback} ${explanation}\n\nQuestion ${activeQuiz.questionIndex + 1}: ${nextQuestion.question}`;
}

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
        <details class="note-details">
          <summary>View response summary</summary>
          <p>${escapeHtml(note.content)}</p>
        </details>
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

function updateExportChatButtonState() {
  if (!exportChatBtn) return;
  exportChatBtn.disabled = chatHistory.length === 0;
  exportChatBtn.setAttribute('aria-disabled', exportChatBtn.disabled.toString());
}

function exportNotes() {
  if (!savedNotes || !savedNotes.length) {
    showToast('No notes to export');
    return;
  }

  function exportChatHistory() {
    if (!chatHistory.length) {
      showToast('No chat messages to export');
      return;
    }

    const data = JSON.stringify(chatHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mba-buddy-chat-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${chatHistory.length} chat message${chatHistory.length === 1 ? '' : 's'}`);
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
  applyHistorySearch();
}

function renderChatHistory() {
  messages.innerHTML = '';
  if (!chatHistory.length) {
    showEmptyState();
    return;
  }
  chatHistory.forEach((entry) => addMessage(entry.text, entry.role, false));
  messages.scrollTop = messages.scrollHeight;
  applyHistorySearch();
}

function applyHistorySearch() {
  if (!historySearch || !searchStatus) return;
  const query = historySearch.value.trim().toLocaleLowerCase();
  const messageElements = messages.querySelectorAll('.msg[data-chat-message="true"]');
  let visibleCount = 0;

  messageElements.forEach((message) => {
    const matches = !query || message.textContent.toLocaleLowerCase().includes(query);
    message.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  searchStatus.hidden = !query;
  searchStatus.textContent = query
    ? (visibleCount ? `${visibleCount} matching message${visibleCount === 1 ? '' : 's'}` : 'No matching messages')
    : '';
}

function sendMessage(text) {
  const value = text.trim();
  if (!value) return;

  const subjectAtSend = activeSubject;
  addMessage(value, 'user', true);
  userInput.value = '';
  if (!pendingReplyTimers.size) {
    showTyping();
  }

  const timer = setTimeout(() => {
    pendingReplyTimers.delete(timer);
    if (!pendingReplyTimers.size) {
      removeTyping();
    }
    const reply = getBotReply(value, subjectAtSend);
    addMessage(reply, 'bot', true);
  }, 1000);
  pendingReplyTimers.add(timer);
}

function getBotReply(userText, subject = activeSubject) {
  const lowerText = userText.toLowerCase();

  if (lowerText.includes('quiz')) {
    return startQuiz(subject);
  }

  if (activeQuiz) {
    return answerQuiz(userText);
  }

  if (lowerText.includes('tip') || lowerText.includes('revision')) {
    return subjectReplies[subject].tip;
  }

  const topic = subjectReplies[subject].topics.find(({ keywords }) =>
    keywords.some((keyword) => lowerText.includes(keyword))
  );
  if (topic) {
    return topic.answer;
  }

  return subjectReplies[subject].default;
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function addMessage(text, role, persist = true) {
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'bot' ? 'bot-msg' : 'user-msg');
  div.dataset.chatMessage = 'true';

  const timestamp = `<span class="msg-time">${formatTime()}</span>`;
  const safeText = escapeHtml(text);

  if (role === 'bot') {
    div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble">${safeText}<div class="msg-meta">${timestamp}<button class="copy-message" type="button" aria-label="Copy assistant response"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy</span></button></div></div>`;
    div.querySelector('.copy-message').dataset.message = text;
  } else {
    div.innerHTML = `<div class="msg-bubble">${safeText}<div class="msg-meta">${timestamp}</div></div>`;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  applyHistorySearch();

  if (persist) {
    chatHistory.push({ text, role });
    saveChatHistory();
    updateExportChatButtonState();
  }
}

messages.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const copyButton = event.target.closest('.copy-message');
  if (!copyButton) return;

  const message = copyButton.dataset.message;
  if (!message) return;

  try {
    await navigator.clipboard.writeText(message);
    showToast('Response copied');
  } catch (error) {
    showToast('Could not access the clipboard; check browser permissions');
  }
});

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
historySearch?.addEventListener('input', applyHistorySearch);

quizBtn.addEventListener('click', () => {
  sendMessage(`Quiz me on ${activeSubject.charAt(0).toUpperCase() + activeSubject.slice(1)}`);
});

clearBtn.addEventListener('click', () => {
  if (chatHistory.length && !window.confirm('Clear this study conversation?')) {
    return;
  }
  pendingReplyTimers.forEach((timer) => clearTimeout(timer));
  pendingReplyTimers.clear();
  removeTyping();
  activeQuiz = null;
  chatHistory = [];
  saveChatHistory();
  updateExportChatButtonState();
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
exportChatBtn?.addEventListener('click', exportChatHistory);

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
updateExportChatButtonState();
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