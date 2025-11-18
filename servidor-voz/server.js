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
let speechClient;

// Cuando se ejecuta en Render o en local (con .env), esta variable de entorno existirá.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    // --- ESTRATEGIA DEFINITIVA PARA RENDER Y LOCAL ---
    // Parseamos las credenciales desde la variable de entorno.
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    // Creamos un fichero temporal con las credenciales.
    // Las librerías de Google Cloud (como VertexAI) lo buscan por defecto si la variable de entorno apunta a él.
    const credentialsPath = path.join(__dirname, 'google-credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials));

    // Le decimos al proceso dónde está ese fichero. ESTA ES LA CLAVE PARA VERTEX AI.
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    console.log('Credenciales de Google cargadas y configuradas para todo el entorno.');

    // VOLVEMOS AL MÉTODO QUE FUNCIONA PARA SPEECH-TO-TEXT:
    // Inicializamos el cliente de voz directamente con las credenciales.
    speechClient = new speech.SpeechClient({ credentials });
  } catch (e) {
    console.error('Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
    // Si falla, creamos un cliente sin credenciales para que el servidor no se caiga al arrancar, aunque luego falle.
    speechClient = new speech.SpeechClient();
  }
} else {
  // Si no hay credenciales, inicializamos un cliente vacío para evitar que el servidor se caiga.
  speechClient = new speech.SpeechClient();
}

// --- ENDPOINT DE TRANSCRIPCIÓN ---

app.post('/transcribir', async (req, res) => {
  const audioBytes = req.body.toString('base64');

  if (!speechClient) {
    return res.status(500).json({ error: 'El cliente de voz no está inicializado.' });
  }

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

// --- ENDPOINT DE IA (TEMPORALMENTE DESHABILITADO) ---
app.post('/pregunta-ia', async (req, res) => {
  console.log("El endpoint de IA está temporalmente deshabilitado para estabilizar la transcripción.");
  res.status(503).json({ respuesta: "Lo siento, la función de preguntas a la inteligencia artificial está en mantenimiento. Prueba a dictar una puntuación." });
});

// --- ARRANQUE DEL SERVIDOR (MODIFICADO PARA RENDER) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  // Escuchamos en 0.0.0.0 para aceptar conexiones desde cualquier IP
  console.log(`🚀 Servidor de voz escuchando en el puerto ${PORT}`);
});