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

    // Inicializamos el cliente de Speech-to-Text SIN pasarle credenciales.
    // Ahora las encontrará automáticamente gracias a la variable de entorno.
    speechClient = new speech.SpeechClient();
  } catch (e) {
    console.error('Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
    // Si falla, creamos un cliente sin credenciales para que el servidor no se caiga al arrancar, aunque luego falle.
    speechClient = new speech.SpeechClient();
  }
} else {
  // Si no hay credenciales, inicializamos un cliente vacío para evitar que el servidor se caiga al arrancar.
  speechClient = new speech.SpeechClient();
}

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