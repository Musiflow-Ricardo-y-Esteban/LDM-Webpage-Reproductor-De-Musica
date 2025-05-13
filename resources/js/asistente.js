  // DeepSeek API key 
  const DEEPSEEK_API_KEY = "sk-3a89c8e5c29441eab94b51a4e0b8a069";
        
  // elementos del DOM
  const musicAssistantButton = document.getElementById('musicAssistantButton');
  const musicAssistantModal = document.getElementById('musicAssistantModal');
  const closeButton = document.getElementById('closeButton');
  const chatMessages = document.getElementById('chatMessages');
  const typingIndicator = document.getElementById('typingIndicator');
  const assistantInput = document.getElementById('assistantInput');
  const sendButton = document.getElementById('sendButton');
  
  // Store conversation history
  let conversationHistory = [];
  
  // Toggle chat modal
  musicAssistantButton.addEventListener('click', () => {
      musicAssistantModal.style.display = 'flex';
      
      // Display welcome message if conversation is empty
      if (conversationHistory.length === 0) {
          addWelcomeMessage();
      }
      
      // Focus on input
      assistantInput.focus();
  });
  
  // Close modal
  closeButton.addEventListener('click', () => {
      musicAssistantModal.style.display = 'none';
  });
  
  // Send message on button click
  sendButton.addEventListener('click', () => {
      sendMessage();
  });
  
  // Send message on Enter key
  assistantInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          sendMessage();
      }
  });
  
  // Add welcome message
  function addWelcomeMessage() {
      const welcomeMessage = "¡Hola! Soy MusicGPT. Una IA basada en DeepSeek para MusiFlow. En que puedo ayudarte hoy? 🎵";
      appendMessage('bot', welcomeMessage);
      conversationHistory.push({ role: 'assistant', content: welcomeMessage });
  }
  
  // Send message
  function sendMessage() {
      const message = assistantInput.value.trim();
      
      if (message === '') return;
      
      // Clear input field
      assistantInput.value = '';
      
      // Add user message to UI
      appendMessage('user', message);
      
      // Add to history
      conversationHistory.push({ role: 'user', content: message });
      
      // Show typing indicator
      typingIndicator.style.display = 'block';
      scrollToBottom();
      
      // Get bot response
      getBotResponse(message);
  }
  
  // Get bot response
  async function getBotResponse(message) {
      try {
          // Calculate a reasonable typing delay based on message length
          const typingDelay = Math.min(3000, Math.max(1500, message.length * 20));
          
          // Simulate typing delay for a more natural experience
          await new Promise(resolve => setTimeout(resolve, typingDelay));
          
          // Call DeepSeek API
          const response = await callDeepSeekApi(message);
          
          // Hide typing indicator
          typingIndicator.style.display = 'none';
          
          // Add bot response to UI
          appendMessage('bot', response);
          
          // Add to history
          conversationHistory.push({ role: 'assistant', content: response });
          
      } catch (error) {
          console.error('Error getting response:', error);
          
          // Hide typing indicator
          typingIndicator.style.display = 'none';
          
          // Add error message
          appendMessage('bot', "Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, intenta de nuevo.");
      }
  }
  
  // Call DeepSeek API
  async function callDeepSeekApi(message) {
      try {
          // Build the system prompt
          const systemPrompt = `Eres MusicGPT, un asistente musical experto diseñado para ayudar a los usuarios con una plataforma de reproducción de música. Tienes estas características:
ERES EL ASISTENTE VIRTUAL DE LA PAGINA WEB 'MusiFlow', UN PROYECTO DE UNOS ALUMNOS DE DESARROLLO WEB EN LA ESCUELA 'AL-MUDEYNE'. MusiFlow ES UN PROYECTO DE LOS MODULOS DE LENGUAJE DE MARCAS Y ENTORNOS DE DESAROLLO, PROVENIENTES DE EL GRADO DE DESARROLLO DE APLICACIONES WEB. LOS CREADORES SON RICARDO MONTES Y ESTEBAN GARCÍA. 
1. Tono amigable, conversacional y entusiasta sobre la música
2. Conocimientos profundos sobre géneros musicales, artistas y tendencias
3. Capacidad para recomendar música basada en los gustos del usuario
4. Ayuda con la navegación y funciones de la plataforma
5. Respuestas concisas (máximo 4 frases)
6. Personalidad ligeramente informal pero siempre profesional
7. Ocasionalmente usas emojis relacionados con la música (🎵, 🎧, 🎸, etc.)

Conoces estas funciones de la plataforma:
- Reproducción de canciones, álbumes y listas
- Creación y gestión de listas de reproducción personalizadas
- Descubrimiento de nueva música basado en gustos
- Radio basada en artistas o canciones
- Modo sin conexión para escuchar música descargada
- Letras de canciones en tiempo real
- Compartir música en redes sociales
- Historial de reproducción y favoritos

IMPORTANTE: Mantén tus respuestas cortas pero útiles, máximo 3-4 frases en total.`;

          // Get the messages for context (limit to last 6 messages for simplicity)
          const contextMessages = conversationHistory.slice(-6);
          
          // Make the API call.
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
              },
              body: JSON.stringify({
                  model: "deepseek-chat",
                  messages: [
                      {
                          role: "system",
                          content: systemPrompt
                      },
                      ...contextMessages,
                      {
                          role: "user",
                          content: message
                      }
                  ],
                  max_tokens: 300,
                  temperature: 0.7,
              })
          });
          
          if (!response.ok) {
              // If API call fails, fall back to generic responses
              console.warn('API call failed, falling back to local generation');
              return generateFallbackResponse(message);
          }
          
          const data = await response.json();
          return data.choices[0].message.content;
          
      } catch (error) {
          console.error('API call error:', error);
          // Fall back to generic response if API fails
          return generateFallbackResponse(message);
      }
  }
  
  // Generate fallback response if API fails
  function generateFallbackResponse(message) {
      const messageLower = message.toLowerCase();
      
      // List of fallback responses based on keywords
      if (messageLower.includes("hola") || messageLower.includes("saludos") || messageLower.includes("hey")) {
          return "¡Hola! Soy MusicGPT, tu asistente musical. ¿En qué puedo ayudarte hoy? 🎵";
      }
      else if (messageLower.includes("recomienda") || messageLower.includes("sugerencia") || messageLower.includes("similar a")) {
          return "Para darte buenas recomendaciones, necesito saber más sobre tus gustos musicales. ¿Podrías mencionar algunos artistas o géneros que te gusten? 🎧";
      }
      else if (messageLower.includes("playlist") || messageLower.includes("lista")) {
          return "Puedes crear listas de reproducción personalizadas fácilmente. Solo tienes que hacer clic en el botón '+' junto a cualquier canción y seleccionar 'Añadir a lista de reproducción'. 🎵";
      }
      else if (messageLower.includes("descargar") || messageLower.includes("offline") || messageLower.includes("sin conexión")) {
          return "Para escuchar música sin conexión, busca el icono de descarga junto a las canciones o álbumes. Una vez descargados, estarán disponibles en la sección 'Tu música' incluso sin internet. 🎧";
      }
      else if (messageLower.includes("rock") || messageLower.includes("metal") || messageLower.includes("punk")) {
          return "Si te gusta el rock, te recomendaría explorar nuestras listas curadas como 'Clásicos del Rock', 'Rock Alternativo Actual' o 'Evolución del Metal'. ¿Hay alguna era o subgénero específico que te interese? 🎸";
      }
      else if (messageLower.includes("pop") || messageLower.includes("electronica") || messageLower.includes("dance")) {
          return "Para amantes del pop y la electrónica, tenemos listas como 'Pop Actual', 'Electrónica Innovadora' y 'Dance Hits'. ¿Prefieres algo más mainstream o sonidos más alternativos? 🎧";
      }
      else {
          return "Estoy aquí para ayudarte con recomendaciones musicales y a navegar por nuestra plataforma. ¿Te gustaría descubrir nueva música, crear listas de reproducción o aprender a usar alguna función específica? 🎵";
      }
  }
  
  // Append message to chat UI
  function appendMessage(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      messageDiv.textContent = content;
      
      chatMessages.appendChild(messageDiv);
      scrollToBottom();
  }
  
  // Scroll chat to bottom
  function scrollToBottom() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Initialize
  function init() {
      // Check if chat is already open (rare, but possible if page reloads)
      if (musicAssistantModal.style.display === 'flex') {
          addWelcomeMessage();
      }
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);