const express = require('express');
const speech = require('@google-cloud/speech');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Módulo para interactuar con el sistema de archivos

const app = express();

// --- CONFIGURACIÓN ---

// Usamos CORS para permitir peticiones desde nuestras páginas de juegos
app.use(cors()); 

// Necesitamos poder leer el cuerpo de las peticiones en formato raw para el audio
app.use(express.raw({ type: 'audio/webm', limit: '5mb' }));

// --- CONFIGURACIÓN DEL CLIENTE DE GOOGLE (MODIFICADO PARA RENDER) ---
const speechClientConfig = {};

// Si la variable de entorno con el JSON de credenciales existe (en Render), la usamos.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    // Parseamos el JSON que viene como un string desde la variable de entorno
    speechClientConfig.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log('Autenticando con Google Cloud usando credenciales de variable de entorno.');
  } catch (e) {
    console.error('Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
  }
} else {
  // Si no, intentamos usar el fichero local (para desarrollo en tu PC).
  const keyFilePath = path.join(__dirname, 'google-credentials.json');
  if (fs.existsSync(keyFilePath)) {
    speechClientConfig.keyFilename = keyFilePath;
    console.log('Autenticando con Google Cloud usando fichero local de credenciales.');
  } else {
    console.error('¡ATENCIÓN! No se encontraron credenciales de Google. El servidor no podrá transcribir audio.');
  }
}

const speechClient = new speech.SpeechClient(speechClientConfig);

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

// --- ARRANQUE DEL SERVIDOR (MODIFICADO PARA RENDER) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  // Escuchamos en 0.0.0.0 para aceptar conexiones desde cualquier IP
  console.log(`🚀 Servidor de voz escuchando en el puerto ${PORT}`);
});