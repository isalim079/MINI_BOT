const CHAT_STORAGE_KEY = 'dsa_chat_history';

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const newDiscussionBtn = document.querySelector('.new-discussion-btn');
const quickPromptButtons = document.querySelectorAll('[data-quick-prompt]');

let chatHistory = loadChats();
let isLoading = false;
renderChats();

sendBtn.addEventListener('click', onSend);
chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    onSend();
  }
});

newDiscussionBtn.addEventListener('click', () => {
  chatHistory = [];
  saveChats();
  renderChats();
});

quickPromptButtons.forEach((button) => {
  button.addEventListener('click', () => {
    chatInput.value = button.dataset.quickPrompt || '';
    chatInput.focus();
  });
});

function loadChats() {
  const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
  if (!raw) {
    return [
      {
        role: 'assistant',
        text:
          'Ask me any DSA question. I will keep answers clear and concise.',
      },
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
}

function saveChats() {
  sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
}

function renderChats() {
  chatMessages.innerHTML = '';

  chatHistory.forEach((message) => {
    if (message.role === 'user') {
      const userNode = document.createElement('article');
      userNode.className = 'user-message';
      userNode.textContent = message.text;
      chatMessages.appendChild(userNode);
      return;
    }

    const botNode = document.createElement('article');
    botNode.className = 'bot-card';

    const textNode = document.createElement('p');
    textNode.textContent = message.text;

    if (message.isError) {
      textNode.classList.add('error-text');
    }

    botNode.appendChild(textNode);
    chatMessages.appendChild(botNode);
  });

  if (isLoading) {
    const loadingNode = document.createElement('article');
    loadingNode.className = 'bot-card loading-card';
    loadingNode.innerHTML =
      '<div class="typing-loader">' +
      '<span></span><span></span><span></span>' +
      '</div><p class="loading-label">Analyzing your query...</p>';
    chatMessages.appendChild(loadingNode);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function onSend() {
  const message = chatInput.value.trim();
  if (!message) {
    return;
  }

  chatInput.value = '';

  chatHistory.push({ role: 'user', text: message });
  setBusy(true);
  renderChats();
  saveChats();

  try {
    const aiText = await callGeminiApi(chatHistory);
    chatHistory.push({ role: 'assistant', text: aiText });
  } catch (error) {
    chatHistory.push({
      role: 'assistant',
      text: error.message || 'API call failed.',
      isError: true,
    });
  } finally {
    setBusy(false);
    saveChats();
    renderChats();
  }
}

function setBusy(isBusy) {
  isLoading = isBusy;
  sendBtn.disabled = isBusy;
  sendBtn.classList.toggle('is-loading', isBusy);
}

async function callGeminiApi(history) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ history }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${errorText}`);
  }

  const data = await response.json();
  return data?.text || 'No response generated.';
}
