const zonaDeChat = document.getElementById('zona-de-chat');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let isWaitingResponse = false;
const TIMEOUT_MS = 15000; // Ampliado a 15s por si la IA del webhook tarda

// Ajuste automático de altura del textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = `${userInput.scrollHeight}px`;
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const text = userInput.value.trim();
  if (!text || isWaitingResponse) return;

  appendMessage(text, 'user');
  userInput.value = '';
  userInput.style.height = 'auto';
  
  setLoadingState(true);
  const loadingBubble = appendLoadingBubble();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Error al conectar con el servidor.');

    // Soporta tanto respuestas en JSON como texto plano del webhook
    const rawText = await response.text();
    let botReply = rawText;

    try {
      const data = JSON.parse(rawText);
      botReply = data?.reply || data?.message || data?.output || rawText;
    } catch {
      // Si no es JSON, se conserva rawText
    }

    if (!botReply || botReply === 'Accepted') {
      botReply = 'Consulta recibida correctamente. ¿Tienes alguna otra duda sobre tus trámites?';
    }
    
    loadingBubble.remove();
    appendMessage(botReply, 'bot');

  } catch (error) {
    clearTimeout(timeoutId);
    loadingBubble.remove();
    
    const errorMsg = error.name === 'AbortError'
      ? 'La respuesta tardó demasiado. Por favor, intenta de nuevo.'
      : 'Ocurrió un error al procesar tu solicitud.';
    
    appendMessage(errorMsg, 'error');
  } finally {
    setLoadingState(false);
    userInput.focus();
  }
});

function appendMessage(text, type) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', `message-${type}`);
  
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');
  contentDiv.textContent = text;
  
  msgDiv.appendChild(contentDiv);
  zonaDeChat.appendChild(msgDiv);
  
  zonaDeChat.scrollTop = zonaDeChat.scrollHeight;
  return msgDiv;
}

function appendLoadingBubble() {
  const loadingDiv = document.createElement('div');
  loadingDiv.classList.add('message', 'message-bot');
  loadingDiv.innerHTML = `
    <div class="message-content typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  zonaDeChat.appendChild(loadingDiv);
  zonaDeChat.scrollTop = zonaDeChat.scrollHeight;
  return loadingDiv;
}

function setLoadingState(loading) {
  isWaitingResponse = loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;
}

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});
