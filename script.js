// script.js — UI interactions only (no API yet)

const subjectBtns = document.querySelectorAll('.subject-btn');
const topicChips  = document.querySelectorAll('.topic-chip');
const sendBtn     = document.getElementById('sendBtn');
const quizBtn     = document.getElementById('quizBtn');
const clearBtn    = document.getElementById('clearBtn');
const userInput   = document.getElementById('userInput');
const messages    = document.getElementById('messages');
const activeBadge = document.getElementById('activeBadge');
const menuToggle  = document.getElementById('menuToggle');
const sidebar     = document.querySelector('.sidebar');

let activeSubject = 'finance';
// Initialize

// Subject tab switching
subjectBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    subjectBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeSubject = btn.dataset.subject;
    activeBadge.textContent = btn.textContent.trim();
    document.querySelectorAll('.topic-group').forEach(g => g.classList.add('hidden'));
    document.getElementById('topics-' + activeSubject).classList.remove('hidden');
  });
});

// Topic chips
topicChips.forEach(chip => {
  chip.addEventListener('click', () => {
    userInput.value = chip.textContent.trim();
    userInput.focus();
  });
});

// Send message
function sendMessage(text) {
  if (!text.trim()) return;
  addMessage(text, 'user');
  userInput.value = '';
  showTyping();
  // API call will go here in Step 4
  setTimeout(() => {
    removeTyping();
    addMessage("This is a UI preview — Groq API will be connected in Step 4!", 'bot');
  }, 1200);
}

sendBtn.addEventListener('click', () => sendMessage(userInput.value));
userInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(userInput.value); });

// Quiz shortcut
quizBtn.addEventListener('click', () => {
  sendMessage('Quiz me on ' + activeSubject.charAt(0).toUpperCase() + activeSubject.slice(1));
});

// Clear chat
clearBtn.addEventListener('click', () => {
  messages.innerHTML = '';
});

// Mobile menu
menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

// Helpers
function addMessage(text, role) {
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'bot' ? 'bot-msg' : 'user-msg');
  if (role === 'bot') {
    div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble">${text}</div>`;
  } else {
    div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  }
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot-msg'; div.id = 'typing';
  div.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble"><div class="typing-bubble"><span></span><span></span><span></span></div></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}