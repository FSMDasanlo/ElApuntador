const express = require('express');
const speech = require('@google-cloud/speech');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Módulo para interactuar con el sistema de archivos

// Carga las variables de entorno desde el fichero .env en local
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { VertexAI } = require('@google-cloud/vertexai');

const app = express();

// --- CONFIGURACIÓN ---

// Lista de orígenes permitidos. Deberías añadir la URL de tu frontend en producción.
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:5500', 'https://fsmdasanlo.github.io'];
const corsOptions = {
  origin: function (origin, callback) {
    // Permite peticiones sin 'origin' (como apps móviles o Postman) y las de la lista.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};

// Usamos CORS para permitir peticiones desde nuestras páginas de juegos
app.use(cors(corsOptions)); 

// Necesitamos poder leer el cuerpo de las peticiones en formato raw para el audio
app.use(express.raw({ type: 'audio/webm', limit: '10mb' }));
app.use(express.json({ limit: '10mb' })); // Para recibir el JSON con la pregunta y el estado del juego

// --- CONFIGURACIÓN DEL CLIENTE DE GOOGLE (MODIFICADO PARA RENDER) ---
const speechClientConfig = {};

// Cuando se ejecuta en Render o en local (con .env), esta variable de entorno existirá.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    // --- ESTRATEGIA DEFINITIVA PARA RENDER Y LOCAL ---
    // Parseamos las credenciales desde la variable de entorno.
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    speechClientConfig.credentials = credentials; // SpeechClient sí funciona con el objeto

    // Creamos un fichero temporal con las credenciales.
    // Las librerías de Google Cloud (como VertexAI) lo buscan por defecto si la variable de entorno apunta a él.
    const credentialsPath = path.join(__dirname, 'google-credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials));

    // Le decimos al proceso dónde está ese fichero. ESTA ES LA CLAVE PARA VERTEX AI.
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    console.log('Credenciales de Google cargadas y configuradas para todo el entorno.');
  } catch (e) {
    console.error('Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
  }
}

const speechClient = new speech.SpeechClient(speechClientConfig);

// --- CONFIGURACIÓN DE GEMINI (MÉTODO VERTEX AI - CORRECTO PARA SERVIDORES) ---
let model;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) { // Comprobamos si el fichero se creó
  try {
    // VertexAI ahora encontrará las credenciales automáticamente gracias a la variable de entorno
    const vertex_ai = new VertexAI({ project: 'elapuntador', location: 'us-central1' });
    model = vertex_ai.getGenerativeModel({ model: 'gemini-1.0-pro' });
    console.log(`Cliente de Gemini (Vertex AI) inicializado en proyecto 'elapuntador'.`);
  } catch (e) {
    console.error('Error al inicializar el cliente de Vertex AI (Gemini):', e);
  }
}

// --- ENDPOINT DE TRANSCRIPCIÓN ---

app.post('/transcribir', async (req, res) => {
  const audioBytes = req.body.toString('base64');

  if (!audioBytes) {
    return res.status(400).json({ error: 'No se ha recibido audio.' });
  }

  const audio = {
    content: audioBytes,
  };

  const config = {
    encoding: 'WEBM_OPUS', // Formato de audio que enviaremos desde el navegador
    sampleRateHertz: 48000, // Tasa de muestreo estándar
    languageCode: 'es-ES',
    model: 'default', // Modelo estándar, muy preciso para dictado
  };

  const request = {
    audio: audio,
    config: config,
  };

  try {
    // Enviamos la petición a Google Cloud
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    console.log(`Transcripción recibida: "${transcription}"`);
    // Devolvemos el texto transcrito al navegador
    res.json({ texto: transcription });

  } catch (error) {
    console.error('ERROR en la API de Google Speech-to-Text:', error);
    res.status(500).json({ error: 'Error al procesar el audio.' });
  }
});

// --- ¡NUEVO! ENDPOINT PARA PREGUNTAS A LA IA ---
app.post('/pregunta-ia', async (req, res) => {
  const { pregunta, estadoJuego } = req.body;

  if (!pregunta || !estadoJuego) {
    return res.status(400).json({ error: 'Faltan la pregunta o el estado del juego.' });
  }

  // Creamos el "prompt" para la IA
  const prompt = `
    Eres un asistente experto y conciso para un juego de apuntar puntos llamado "El Apuntador".
    El estado actual del juego es el siguiente (en formato JSON):
    ${JSON.stringify(estadoJuego, null, 2)}

    El usuario ha preguntado por voz: "${pregunta}"

    Tu tarea es responder a su pregunta de forma breve, clara y directa, como si fueras un apuntador humano. No uses formalidades como "Hola" o "Claro".
    Por ejemplo, si te preguntan "¿Quién va ganando?", responde "Va ganando [Nombre] con [puntos] puntos".
    Si te preguntan "¿Cuántos puntos le faltan a Ana para ganar?", responde "A Ana le faltan X puntos".
  `;

  try {
    if (!model) {
      throw new Error("El modelo de IA no se ha inicializado correctamente.");
    }
    const result = await model.generateContent(prompt);

    // La forma moderna y segura de obtener la respuesta
    const response = result.response;
    if (!response) {
      throw new Error("La IA no devolvió una respuesta válida.");
    }

    const text = response.text(); // .text() es una función que extrae el texto
    console.log(`Respuesta de la IA: "${text}"`);
    res.json({ respuesta: text });
  } catch (error) {
    // Logueamos el error completo para poder depurarlo en Render
    console.error('ERROR en la API de Gemini:', error);
    // Devolvemos un mensaje de error más específico si es posible
    const errorMessage = error.message || 'Error al contactar con la IA.';
    res.status(500).json({ 
      error: 'Error en el servidor al procesar la pregunta.',
      details: errorMessage 
    });
  }
});

// --- ARRANQUE DEL SERVIDOR (MODIFICADO PARA RENDER) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  // Escuchamos en 0.0.0.0 para aceptar conexiones desde cualquier IP
  console.log(`🚀 Servidor de voz escuchando en el puerto ${PORT}`);
});