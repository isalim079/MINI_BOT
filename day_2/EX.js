const CHAT_STORAGE_KEY = 'ex_chat_history';

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');

let chatHistory = loadHistory();
let isLoading = false;
renderHistory();

sendBtn.addEventListener('click', onSend);
clearBtn.addEventListener('click', clearChat);
inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    onSend();
  }
});

function loadHistory() {
  const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
  if (!raw) {
    return [
      {
        role: 'assistant',
        text: 'Hey MaxTon... bolo, aaj ki niye kotha bolbe? 🙂',
      },
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveHistory() {
  sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
}

function clearChat() {
  chatHistory = [];
  saveHistory();
  renderHistory();
}

function renderHistory() {
  messagesEl.innerHTML = '';

  chatHistory.forEach((message) => {
    const bubble = document.createElement('article');
    bubble.className =
      message.role === 'user' ? 'message user-message' : 'message ai-message';
    bubble.textContent = message.text;

    if (message.isError) {
      bubble.classList.add('error-message');
    }
    messagesEl.appendChild(bubble);
  });

  if (isLoading) {
    const loader = document.createElement('article');
    loader.className = 'message ai-message loader-message';
    loader.innerHTML =
      '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    messagesEl.appendChild(loader);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function onSend() {
  const text = inputEl.value.trim();
  if (!text || isLoading) {
    return;
  }

  inputEl.value = '';
  chatHistory.push({ role: 'user', text });
  setBusy(true);
  saveHistory();
  renderHistory();

  try {
    const reply = await chatWithApi(chatHistory);
    chatHistory.push({ role: 'assistant', text: reply });
  } catch (error) {
    chatHistory.push({
      role: 'assistant',
      text: error.message || 'Request failed',
      isError: true,
    });
  } finally {
    setBusy(false);
    saveHistory();
    renderHistory();
  }
}

function setBusy(loading) {
  isLoading = loading;
  sendBtn.disabled = loading;
}

async function chatWithApi(history) {
  const response = await fetch('/api/ex-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ history }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'API error');
  }

  const data = await response.json();
  return data?.text || 'No response';
}