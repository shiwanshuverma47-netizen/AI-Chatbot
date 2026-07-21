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

const STORAGE_KEY = 'mba-buddy-chat-history';
let activeSubject = 'finance';
let chatHistory = [];

const subjectReplies = {
  finance: {
    quiz: 'Quick finance quiz: What is the main difference between NPV and IRR?',
    tip: 'Finance revision tip: write one formula, one example, and one exam takeaway for every topic.',
    default: 'I can help with finance topics like NPV, CAPM, ratio analysis, and capital structure.'
  },
  marketing: {
    quiz: 'Quick marketing quiz: Why is segmentation important in a go-to-market strategy?',
    tip: 'Marketing revision tip: connect each concept to one real brand example for faster recall.',
    default: 'I can help with marketing topics like 4Ps, STP, branding, and consumer behaviour.'
  },
  hr: {
    quiz: 'Quick HR quiz: What is the main purpose of performance management systems?',
    tip: 'HR revision tip: summarise each topic in one definition, one example, and one challenge.',
    default: 'I can help with HR topics like recruitment, performance management, and organizational behaviour.'
  },
  operations: {
    quiz: 'Quick operations quiz: How does inventory management affect customer service?',
    tip: 'Operations revision tip: focus on process flow, bottlenecks, and key metrics.',
    default: 'I can help with operations topics like supply chain, Six Sigma, and inventory management.'
  }
};

function setActiveSubject(subject, button) {
  subjectBtns.forEach((btn) => btn.classList.remove('active'));
  if (button) {
    button.classList.add('active');
  }

  activeSubject = subject;
  activeBadge.textContent = button?.dataset.label || subject.charAt(0).toUpperCase() + subject.slice(1);

  document.querySelectorAll('.topic-group').forEach((group) => group.classList.add('hidden'));
  const activeGroup = document.getElementById('topics-' + activeSubject);
  if (activeGroup) {
    activeGroup.classList.remove('hidden');
  }

  updateSuggestionChips();
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
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveChatHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
  if (saveStatus) {
    saveStatus.textContent = 'Autosaved';
  }
}

function renderChatHistory() {
  messages.innerHTML = '';
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

function addMessage(text, role, persist = true) {
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'bot' ? 'bot-msg' : 'user-msg');

  if (role === 'bot') {
    div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble">${text}</div>`;
  } else {
    div.innerHTML = `<div class="msg-bubble">${text}</div>`;
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
  });
});

topicChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    userInput.value = chip.textContent.trim();
    userInput.focus();
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
  chatHistory = [];
  saveChatHistory();
  messages.innerHTML = '';
});

menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

chatHistory = loadChatHistory();
if (chatHistory.length) {
  renderChatHistory();
} else {
  updateSuggestionChips();
}
setActiveSubject(activeSubject, document.querySelector('.subject-btn.active'));