// asistente.js - Implementación del asistente musical inteligente MusicGPT

/**
 * FUNCIÓN PRINCIPAL: Este script implementa un asistente musical inteligente (MusicGPT)
 * que utiliza la API de DeepSeek para responder preguntas sobre música, hacer recomendaciones
 * y ayudar a los usuarios con la plataforma MusiFlow.
 */

// Clave de API para DeepSeek (servicio de inteligencia artificial)
const DEEPSEEK_API_KEY = "sk-3a89c8e5c29441eab94b51a4e0b8a069";
      
// Obtiene referencias a elementos importantes de la interfaz
const musicAssistantButton = document.getElementById('musicAssistantButton');
const musicAssistantModal = document.getElementById('musicAssistantModal');
const closeButton = document.getElementById('closeButton');
const chatMessages = document.getElementById('chatMessages');
const typingIndicator = document.getElementById('typingIndicator');
const assistantInput = document.getElementById('assistantInput');
const sendButton = document.getElementById('sendButton');

// Almacena el historial de la conversación
let conversationHistory = [];

/**
 * FUNCIÓN IMPORTANTE: Muestra/oculta el chat del asistente
 * Gestiona el botón para abrir el chat y muestra mensaje de bienvenida
 */
musicAssistantButton.addEventListener('click', () => {
    musicAssistantModal.style.display = 'flex';
    
    // Muestra mensaje de bienvenida si la conversación está vacía
    if (conversationHistory.length === 0) {
        addWelcomeMessage();
    }
    
    // Enfoca el campo de entrada
    assistantInput.focus();
});

// Cierra el modal
closeButton.addEventListener('click', () => {
    musicAssistantModal.style.display = 'none';
});

// Envía mensaje al hacer clic en el botón
sendButton.addEventListener('click', () => {
    sendMessage();
});

// Envía mensaje al presionar Enter
assistantInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

/**
 * FUNCIÓN IMPORTANTE: Añade el mensaje de bienvenida al chat
 */
function addWelcomeMessage() {
    const welcomeMessage = "¡Hola! Soy MusicGPT. Una IA basada en DeepSeek para MusiFlow. En que puedo ayudarte hoy? 🎵";
    appendMessage('bot', welcomeMessage);
    conversationHistory.push({ role: 'assistant', content: welcomeMessage });
}

/**
 * FUNCIÓN IMPORTANTE: Envía el mensaje del usuario al asistente
 * Captura el texto, lo añade al chat y solicita una respuesta
 */
function sendMessage() {
    const message = assistantInput.value.trim();
    
    if (message === '') return;
    
    // Limpia el campo de entrada
    assistantInput.value = '';
    
    // Añade el mensaje del usuario a la interfaz
    appendMessage('user', message);
    
    // Añade al historial
    conversationHistory.push({ role: 'user', content: message });
    
    // Muestra indicador de escritura
    typingIndicator.style.display = 'block';
    scrollToBottom();
    
    // Obtiene respuesta del bot
    getBotResponse(message);
}

/**
 * FUNCIÓN IMPORTANTE: Obtiene la respuesta del asistente
 * Simula un retraso de escritura y llama a la API
 */
async function getBotResponse(message) {
    try {
        // Calcula un retraso de escritura razonable basado en el largo del mensaje
        const typingDelay = Math.min(3000, Math.max(1500, message.length * 20));
        
        // Simula un retraso de escritura para una experiencia más natural
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        
        // Llama a la API de DeepSeek
        const response = await callDeepSeekApi(message);
        
        // Oculta indicador de escritura
        typingIndicator.style.display = 'none';
        
        // Añade respuesta del bot a la interfaz
        appendMessage('bot', response);
        
        // Añade al historial
        conversationHistory.push({ role: 'assistant', content: response });
        
    } catch (error) {
        console.error('Error al obtener respuesta:', error);
        
        // Oculta indicador de escritura
        typingIndicator.style.display = 'none';
        
        // Añade mensaje de error
        appendMessage('bot', "Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, intenta de nuevo.");
    }
}

/**
 * FUNCIÓN IMPORTANTE: Llama a la API de DeepSeek para obtener respuestas inteligentes
 * Envía el mensaje y el contexto de la conversación a la API
 */
async function callDeepSeekApi(message) {
    try {
        // Construye el prompt del sistema con instrucciones para el asistente
        const systemPrompt = `Eres MusicGPT, un asistente musical experto diseñado para ayudar a los usuarios con una plataforma de reproducción de música. Tienes estas características:
ERES EL ASISTENTE VIRTUAL DE LA PAGINA WEB 'MusiFlow', UN PROYECTO DE UNOS ALUMNOS DE DESARROLLO WEB EN LA ESCUELA 'AL-MUDEYNE'. MusiFlow ES UN PROYECTO DE LOS MODULOS DE LENGUAJE DE MARCAS Y ENTORNOS DE DESAROLLO, PROVENIENTES DE EL GRADO DE DESARROLLO DE APLICACIONES WEB. LOS CREADORES SON RICARDO MONTES Y ESTEBAN GARCÍA. 
1. Tono amigable, conversacional y entusiasta sobre la música
2. Conocimientos profundos sobre géneros musicales, artistas y tendencias
3. Capacidad para recomendar música basada en los gustos del usuario
4. Ayuda con la navegación y funciones de la plataforma
5. Respuestas concisas (máximo 4 frases)
6. Personalidad ligeramente informal pero siempre profesional
7. Ocasionalmente usas emojis relacionados con la música (🎵, 🎧, 🎸, etc.)
8. Conoces todas las funciones de esta página web. Las funciones son las siguientes: Página de inicio, Creación y registro de usuarios (utiliza Firebase. El registro es simple, solo requiriendo un usuario, gmail y contraseña). Reproducción de musica (en explorar.html), donde puedes buscar música con la API de spotify o tocar música local (como dark horse de katy perry). Hay una página premium.html con varios planes premium, pero son una donación, no hace falta para usar la pagina. En tu usuario puedes añadir playlists y tus canciones favoritas (con megusta). 

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

        // Obtiene los mensajes para contexto (limitado a los últimos 6 mensajes)
        const contextMessages = conversationHistory.slice(-6);
        
        // Realiza la llamada a la API
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
            // Si la llamada a la API falla, recurre a respuestas genéricas
            console.warn('Llamada a API fallida, recurriendo a generación local');
            return generateFallbackResponse(message);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Error en llamada a API:', error);
        // Recurre a respuesta genérica si la API falla
        return generateFallbackResponse(message);
    }
}

/**
 * FUNCIÓN IMPORTANTE: Genera respuestas de respaldo si la API falla
 * Utiliza palabras clave para dar respuestas predefinidas
 */
function generateFallbackResponse(message) {
    const messageLower = message.toLowerCase();
    
    // Lista de respuestas de respaldo basadas en palabras clave
    if (messageLower.includes("hola") || messageLower.includes("saludos") || messageLower.includes("hey")) {
        return "¡Hola! Soy MusicGPT, tu asistente musical. ¿En qué puedo ayudarte hoy? 🎵";
    }
    else if (messageLower.includes("recomienda") || messageLower.includes("sugerencia") || messageLower.includes("similar a")) {
        return "Para darte buenas recomendaciones, necesito saber más sobre tus gustos musicales. ¿Podrías mencionar algunos artistas o géneros que te gusten? 🎧";
    }
    else if (messageLower.includes("playlist") || messageLower.includes("lista")) {
        return "Puedes crear listas de reproducción personalizadas fácilmente. Solo tienes que hacer clic en el botón '+' junto a cualquier canción y seleccionar 'Añadir a lista de reproducción'. 🎵";
    }

    else {
        return "Estoy aquí para ayudarte con recomendaciones musicales y a navegar por nuestra plataforma. ¿Te gustaría descubrir nueva música, crear listas de reproducción o aprender a usar alguna función específica? 🎵";
    }
}

/**
 * FUNCIÓN IMPORTANTE: Añade un mensaje al chat
 * Crea el elemento visual y lo añade a la interfaz
 */
function appendMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = content;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Desplaza el chat hacia abajo para mostrar los mensajes más recientes
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función de inicialización del asistente
function init() {
    console.log("Inicializando asistente musical...");
    setupChatMessages();
    setupEventListeners();
}


// Inicializa cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', init);