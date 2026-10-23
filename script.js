// Referencias a elementos del DOM
const zonaDeChat = document.getElementById('zona-de-chat');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Estado interno para control de envíos
let isWaitingResponse = false;
const TIMEOUT_MS = 10000; // Tiempo límite de 10 segundos

// Manejador del envío del formulario
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const text = userInput.value.trim();
  if (!text || isWaitingResponse) return;

  // 1. Mostrar mensaje del usuario en el chat
  appendMessage(text, 'user');
  userInput.value = '';
  
  // 2. Bloquear UI y activar estado de carga
  setLoadingState(true);
  const loadingBubble = appendLoadingBubble();

  // 3. Petición asíncrona con AbortController
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

    // Intenta interpretar la respuesta del webhook
    const data = await response.json().catch(() => null);
    const botReply = data?.reply || data?.message || 'Consulta recibida correctamente. ¿Tienes alguna otra duda sobre tus trámites?';
    
    // Remover indicador de carga y agregar respuesta
    loadingBubble.remove();
    appendMessage(botReply, 'bot');

  } catch (error) {
    clearTimeout(timeoutId);
    loadingBubble.remove();
    
    let errorMsg = 'Ocurrió un error al procesar tu solicitud.';
    if (error.name === 'AbortError') {
      errorMsg = 'La respuesta tardó demasiado. Por favor, intenta de nuevo.';
    }
    
    appendMessage(errorMsg, 'error');
  } finally {
    // Restaurar UI tras un breve periodo de espera entre envíos
    setTimeout(() => {
      setLoadingState(false);
    }, 1000);
  }
});

// Función para agregar mensajes a la zona de chat
function appendMessage(text, type) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', `message-${type}`);
  
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');
  contentDiv.textContent = text;
  
  msgDiv.appendChild(contentDiv);
  zonaDeChat.appendChild(msgDiv);
  
  // Auto-scroll al final
  zonaDeChat.scrollTop = zonaDeChat.scrollHeight;
  return msgDiv;
}

// Mostrar indicador de "escribiendo..."
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

// Bloquear / desbloquear controles durante el envío
function setLoadingState(loading) {
  isWaitingResponse = loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;
}

// Enviar con Enter (y Shift+Enter para salto de línea)
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});
