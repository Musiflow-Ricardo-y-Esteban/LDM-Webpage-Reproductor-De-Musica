// asistente.js - Implementación del asistente musical inteligente MusicGPT

/**
 * FUNCIÓN PRINCIPAL: Este script implementa un asistente musical inteligente (MusicGPT)
 * que utiliza la API de DeepSeek para responder preguntas sobre música, hacer recomendaciones
 * y ayudar a los usuarios con la plataforma MusiFlow.
 */

// Clave de API para DeepSeek (servicio de inteligencia artificial)
const DEEPSEEK_API_KEY = "sk-3a89c8e5c29441eab94b51a4e0b8a069"; // ¡Recuerda mantener segura tu clave de API!
      
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
    const welcomeMessage = "¡Hola! Soy MusicGPT. Una IA basada en DeepSeek para MusiFlow. ¿En qué puedo ayudarte hoy? 🎵";
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
        const systemPrompt = `Eres MusicGPT, un asistente musical experto, amigable, conversacional y entusiasta, diseñado para ayudar a los usuarios con la plataforma de reproducción de música MusiFlow. 
        
        INFORMACIÓN CLAVE SOBRE MUSIFLOW Y TU ROL:
        - PROYECTO: MusiFlow es un proyecto académico de los módulos de Lenguaje de Marcas y Entornos de Desarrollo, del Grado de Desarrollo de Aplicaciones Web en la escuela 'AL-MUDEYNE'.
        - CREADORES: Ricardo Montes y Esteban García.
        - TU IDENTIDAD: Eres el asistente virtual de MusiFlow.
        - ESTILO DE RESPUESTA: Usa un tono amigable y ligeramente informal, pero siempre profesional. Ocasionalmente usa emojis relacionados con la música (🎵, 🎧, 🎸, 🎤, 🎶, 🎼, 🎹, 🥁, 🎷, 🎺, 🎻).
        - CONCISIÓN: Mantén tus respuestas cortas pero útiles, idealmente entre 1 y 4 frases.

        CONOCIMIENTO GENERAL DE LA PLATAFORMA MUSIFLOW:
        MusiFlow permite a los usuarios disfrutar de la música de varias maneras. Las secciones principales son:
        1.  Página de Inicio (index.html): Presentación general de MusiFlow.
        2.  Registro y Autenticación de Usuarios: Se utiliza Firebase. El registro es simple, requiriendo nombre de usuario, email y contraseña. Los usuarios pueden iniciar y cerrar sesión.
        3.  Explorar Música (explorar.html): Aquí los usuarios pueden buscar música utilizando la API de Spotify y también reproducir una selección de música local predefinida (por ejemplo, "Dark Horse" de Katy Perry).
        4.  Página de Cuenta de Usuario (account.html): Un espacio personalizado para cada usuario donde gestionan su perfil y actividad musical.
        5.  Página Premium (premium.html): Ofrece planes premium que funcionan como donaciones para apoyar el proyecto. No son necesarios para usar las funciones principales de la página.

        DETALLES ESPECÍFICOS DE LA PÁGINA DE CUENTA DE USUARIO (ACCOUNT.HTML):
        Como asistente, conoces a fondo las funcionalidades disponibles en la sección de cuenta del usuario:
        -   **Gestión del Perfil**: 
            *   Los usuarios pueden ver su nombre de perfil, email y la fecha desde que son miembros.
            *   Pueden editar su perfil: cambiar su nombre de usuario, actualizar su foto de perfil (proporcionando una URL de imagen) y añadir o modificar una breve biografía.
            *   Pueden cerrar sesión de forma segura desde su perfil.
        -   **Canciones Favoritas ('Me Gusta')**:
            *   Los usuarios pueden marcar canciones como favoritas haciendo clic en un icono de corazón. Estas canciones se guardan en su perfil.
            *   En la sección de "Canciones Favoritas" de su perfil, pueden ver todas las canciones que les gustan, reproducir una canción individual, reproducir todas sus favoritas en secuencia, o añadir una canción favorita directamente a una de sus playlists. También pueden eliminar canciones de sus favoritas.
        -   **Historial de Reproducción**:
            *   MusiFlow guarda un historial de las últimas 20 canciones que el usuario ha reproducido.
            *   Este historial es visible en el perfil del usuario, mostrando cuándo se escuchó cada canción.
            *   Desde el historial, los usuarios pueden volver a reproducir una canción o añadirla a una playlist.
            *   También tienen la opción de limpiar completamente su historial de reproducción.
        -   **Playlists Personalizadas**:
            *   Los usuarios pueden crear un número ilimitado de playlists personalizadas.
            *   Al crear una playlist, pueden darle un nombre, una descripción opcional y elegir si la playlist es pública o privada.
            *   Pueden añadir canciones a sus playlists desde la sección de "Canciones Favoritas", desde su "Historial de Reproducción", o mientras exploran música.
            *   En su perfil, pueden ver todas sus playlists, cuántas canciones tiene cada una, reproducir una playlist completa, o ver los detalles de una playlist específica.
            *   Al ver los detalles de una playlist, pueden editar su nombre, descripción y visibilidad (pública/privada), eliminar canciones individuales de la playlist, o eliminar la playlist completa.
        -   **Reproductor de Música y Preferencias**:
            *   El reproductor de música integrado permite escuchar canciones locales y, en el caso de canciones de Spotify encontradas a través de la búsqueda, MusiFlow intentará abrir la canción en la aplicación o web de Spotify.
            *   Los controles del reproductor incluyen play/pausa, canción anterior/siguiente, modo bucle (repetir la canción actual), modo aleatorio (para playlists), y control de volumen.
            *   Las preferencias del reproductor como el estado del modo bucle, modo aleatorio y el nivel de volumen se guardan para cada usuario y se cargan la próxima vez que usan la plataforma.
            *   El reproductor muestra la imagen del álbum (si está disponible), título de la canción, artista, y una barra de progreso interactiva.
            **ERRORES CONOCIDOS**:
            * Sabes que la website tiene algunos errores. Entre ellos, se encuentran errores con Spotify; por ejemplo, no se puede reproducir una canción de Spotify desde una playlist por problemas con la API.
            * En la página de inicio, no se puede pinchar el icono de usuario
            * Aveces el sitio tarda unos segundos en recuperar tu cuenta
        TU OBJETIVO ES:
        Ayudar a los usuarios a navegar MusiFlow, entender sus funciones, descubrir música, y resolver dudas relacionadas con la plataforma, basándote en la información proporcionada. Sé proactivo ofreciendo ayuda sobre estas características si es relevante.
        
        IMPORTANTE: Reitero, mantén tus respuestas concisas y directas, idealmente no más de 3-4 frases. Enfócate en ser útil y amigable.`;

        // Obtiene los mensajes para contexto (limitado a los últimos 6 mensajes, incluyendo el system prompt si es el primero)
        const contextMessages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-5) // Últimos 5 mensajes de usuario/asistente para dar más espacio al system prompt
        ];
        
        // Realiza la llamada a la API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // Asegúrate que este es el modelo correcto que quieres usar
                messages: [
                    ...contextMessages, // System prompt y conversación previa
                    {
                        role: "user", // Mensaje actual del usuario
                        content: message 
                    }
                ],
                max_tokens: 250, // Ajustado para respuestas concisas, pero suficiente para 3-4 frases.
                temperature: 0.7, // Mantenemos un balance entre creatividad y predictibilidad.
            })
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error en la API de DeepSeek:', response.status, errorBody);
            // Si la llamada a la API falla, recurre a respuestas genéricas
            return generateFallbackResponse(message);
        }
        
        const data = await response.json();
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            console.error('Respuesta inesperada de la API:', data);
            return generateFallbackResponse(message);
        }
        
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
        return "Puedes crear y gestionar tus playlists desde tu perfil. Añade canciones que te gusten, dales un nombre ¡y listo! ¿Necesitas ayuda con algún paso específico? 🎶";
    }
    else if (messageLower.includes("perfil") || messageLower.includes("cuenta")) {
        return "En tu página de cuenta puedes ver tu información, tus canciones favoritas, historial y playlists. ¡También puedes editar tu nombre y foto de perfil! 😊";
    }
    else if (messageLower.includes("ayuda") || messageLower.includes("cómo funciona")) {
        return "¡Claro! Estoy aquí para ayudarte. ¿Sobre qué función de MusiFlow te gustaría saber más? Puedo contarte sobre playlists, tu perfil, cómo encontrar música y más. 🎸";
    }
    else {
        return "Estoy aquí para ayudarte con recomendaciones musicales y a navegar por nuestra plataforma MusiFlow. ¿Te gustaría descubrir nueva música, crear listas de reproducción o aprender a usar alguna función específica? 🎼";
    }
}

/**
 * FUNCIÓN IMPORTANTE: Añade un mensaje al chat
 * Crea el elemento visual y lo añade a la interfaz
 */
function appendMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Para interpretar saltos de línea y aplicar un formato básico si es necesario
    // Reemplazar \n con <br> para que se muestren los saltos de línea en HTML.
    messageDiv.innerHTML = content.replace(/\n/g, '<br>');
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Desplaza el chat hacia abajo para mostrar los mensajes más recientes
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función de inicialización del asistente (si fuera necesaria más configuración)
function initAssistant() {
    console.log("Asistente Musical MusicGPT inicializado.");
}


// Inicializa cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', initAssistant);