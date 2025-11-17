const express = require('express');
const speech = require('@google-cloud/speech');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Módulo para interactuar con el sistema de archivos

// Carga las variables de entorno desde el fichero .env en local
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// --- CONFIGURACIÓN ---

// Usamos CORS para permitir peticiones desde nuestras páginas de juegos
app.use(cors()); 

// Necesitamos poder leer el cuerpo de las peticiones en formato raw para el audio
app.use(express.raw({ type: 'audio/webm', limit: '10mb' }));
app.use(express.json({ limit: '10mb' })); // Para recibir el JSON con la pregunta y el estado del juego

// --- CONFIGURACIÓN DEL CLIENTE DE GOOGLE (MODIFICADO PARA RENDER) ---
const speechClientConfig = {};

// Cuando se ejecuta en Render o en local (con .env), esta variable de entorno existirá.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    // Parseamos el JSON que viene como un string desde la variable de entorno
    speechClientConfig.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log('Autenticando con Google Speech-to-Text usando credenciales de variable de entorno.');
  } catch (e) {
    console.error('Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
  }
}

const speechClient = new speech.SpeechClient(speechClientConfig);

// --- ¡NUEVO! CONFIGURACIÓN DEL CLIENTE DE GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, { apiVersion: 'v1' });
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

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
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(`Respuesta de la IA: "${text}"`);
    res.json({ respuesta: text });
  } catch (error) {
    console.error('ERROR en la API de Gemini:', error);
    res.status(500).json({ error: 'Error al contactar con la IA.' });
  }
});

// --- ARRANQUE DEL SERVIDOR (MODIFICADO PARA RENDER) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  // Escuchamos en 0.0.0.0 para aceptar conexiones desde cualquier IP
  console.log(`🚀 Servidor de voz escuchando en el puerto ${PORT}`);
});