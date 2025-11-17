document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const btnDetenerVoz = document.getElementById('btn-detener-voz');
  // URL del servidor de voz en la nube (Render).
  const URL_SERVIDOR_VOZ = 'https://elapuntador.onrender.com';
  
  // --- NUEVA ARQUITECTURA: MediaRecorder + Servidor con IA de Google ---

  // Comprobamos si el navegador soporta la API de MediaRecorder para grabar audio
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    console.error('La grabación de audio (MediaRecorder) no es soportada en este navegador.');
    btnVoz.disabled = true;
    btnVoz.textContent = '🎤 No Soportado';
    return;
  }

  let mediaRecorder;
  let audioChunks = [];
  let streamMicrofono; // Para poder detener el micrófono y que se apague el piloto rojo

  // --- NUEVO: Para la detección de silencio ---
  let silencioTimeout;
  let audioContext;
  let analizador;

  // --- LÓGICA DE PROCESAMIENTO (ADAPTADA DEL ANTIGUO server.js) ---
  
  /**
   * Función para extraer múltiples puntuaciones de un texto.
   * Ej: "Ana veinte, Felipe menos doce" -> [{ jugador: "Ana", puntos: 20 }, { jugador: "Felipe", puntos: -12 }]
   * @param {string} texto La transcripción de voz.
   * @param {string[]} jugadores La lista de nombres de jugadores.
   * @returns {object[]|object|null} Un array de objetos de puntuación, un objeto de comando, o null.
   */
  function parsearTranscripcion(texto, jugadores) {
    const textoMinusculas = texto.toLowerCase();
    const resultados = [];

    // --- 1. BUSCAMOS COMANDOS PRIMERO ---
    if (textoMinusculas.includes('apaga micro') || textoMinusculas.includes('apagar micro') || textoMinusculas.includes('detener micro')) {
      return { type: 'command', command: 'stop' };
    }

    if (textoMinusculas.includes('reiniciar') || textoMinusculas.includes('borrar todo') || textoMinusculas.includes('nueva partida')) {
      return { type: 'command', command: 'clear' };
    }

    if (textoMinusculas.includes('deshacer') || textoMinusculas.includes('corrige') || textoMinusculas.includes('borra la última')) {
      return { type: 'command', command: 'undo' };
    }

    if (textoMinusculas.includes('vale') || textoMinusculas.includes('calla') || textoMinusculas.includes('silencio')) {
      return { type: 'command', command: 'hush' };
    }

    const mapaNumeros = {
      'cero': 0, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
      'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
      'dieciséis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
      'veinte': 20, 'veintiuno': 21, 'veintidós': 22, 'veintitrés': 23, 'veinticuatro': 24,
      'veinticinco': 25, 'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
      'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60, 'setenta': 70,
      'ochenta': 80, 'noventa': 90, 'cien': 100
    };

    const textoNormalizado = texto.toLowerCase().replace(/\s+y\s+/g, ' ');
    const palabrasNormalizadas = textoNormalizado.split(' ');

    let jugadorActual = null;
    let puntosActuales = 0;
    let multiplicador = 1; // Para números negativos

    for (const palabra of palabrasNormalizadas) {
      // Comprobamos si la palabra es un jugador
      const jugadorEncontrado = jugadores.find(j => j.toLowerCase() === palabra);

      if (jugadorEncontrado) {
        // Si ya teníamos un jugador, guardamos su resultado antes de cambiar.
        if (jugadorActual) {
          resultados.push({ type: 'score', jugador: jugadorActual, puntos: puntosActuales * multiplicador });
        }
        // Empezamos a procesar el nuevo jugador.
        jugadorActual = jugadorEncontrado;
        puntosActuales = 0;
        multiplicador = 1;
        continue;
      }

      // Si no hay un jugador activo, ignoramos las palabras
      if (!jugadorActual) continue;

      // Comprobamos si es la palabra "menos"
      if (palabra === 'menos') {
        multiplicador = -1;
        continue;
      }

      // Comprobamos si es un número escrito
      const valor = mapaNumeros[palabra];
      if (valor !== undefined) {
        puntosActuales += valor;
      } else if (!isNaN(parseInt(palabra))) { // Comprobamos si es un dígito
        puntosActuales += parseInt(palabra);
      }
    }

    // Guardamos el último resultado que se estaba procesando
    if (jugadorActual) {
      resultados.push({ type: 'score', jugador: jugadorActual, puntos: puntosActuales * multiplicador });
    }

    return resultados.length > 0 ? resultados : null;
  }

  // --- FUNCIONES DE LOS BOTONES ---

  const iniciarGrabacion = async () => {
    try {
      // 1. Iniciar grabación como antes
      streamMicrofono = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(streamMicrofono, { mimeType: 'audio/webm' });

      mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        await enviarAudioAlServidor(audioBlob);
        streamMicrofono.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      btnVoz.style.display = 'none';
      btnDetenerVoz.style.display = 'inline-block';
      console.log("Iniciando grabación...");

      // 2. Iniciar el detector de silencio
      detectarSilencio(streamMicrofono);

    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Asegúrate de dar permiso en el navegador.');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // Detenemos el detector de silencio para que no interfiera
      clearTimeout(silencioTimeout);
      if (audioContext) audioContext.close();

      mediaRecorder.stop();
      btnVoz.style.display = 'inline-block';
      btnDetenerVoz.style.display = 'none';
      console.log("Deteniendo grabación.");
    }
  };

  /**
   * NUEVA FUNCIÓN: Analiza el audio del micrófono y llama a detenerGrabacion()
   * si hay silencio durante más de 1.5 segundos.
   */
  const detectarSilencio = (stream) => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analizador = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analizador);

    analizador.fftSize = 2048;
    const bufferLength = analizador.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const UMBRAL_SILENCIO = 20; // Umbral de volumen (0-255). Ajustable.
    const TIEMPO_SILENCIO_MS = 3000; // 3 segundos.

    const verificar = () => {
      analizador.getByteFrequencyData(dataArray);
      let suma = dataArray.reduce((a, b) => a + b, 0);
      let promedio = suma / bufferLength;

      if (promedio < UMBRAL_SILENCIO) {
        if (!silencioTimeout) {
          silencioTimeout = setTimeout(detenerGrabacion, TIEMPO_SILENCIO_MS);
        }
      } else {
        // Si hay sonido, reseteamos el temporizador de silencio
        clearTimeout(silencioTimeout);
        silencioTimeout = null;
      }

      // Si todavía estamos grabando, seguimos verificando
      if (mediaRecorder.state === 'recording') requestAnimationFrame(verificar);
    };
    requestAnimationFrame(verificar);
  };

  btnVoz.addEventListener('click', iniciarGrabacion);
  btnDetenerVoz.addEventListener('click', detenerGrabacion);

  async function enviarAudioAlServidor(audioBlob) {
    console.log("Enviando audio al servidor para transcripción...");
    try {
      const response = await fetch(`${URL_SERVIDOR_VOZ}/transcribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/webm' },
        body: audioBlob
      });

      if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);

      const data = await response.json();
      const transcripcion = data.texto || '';
      console.log(`Texto reconocido por la IA: "${transcripcion}"`);

      if (transcripcion) {
        procesarTranscripcion(transcripcion);
      } else {
        console.warn('La IA no devolvió ninguna transcripción.');
      }

    } catch (error) {
      console.error('Error al enviar/procesar audio:', error);
      alert('Hubo un error al contactar con el servicio de voz. Revisa la consola del navegador y del servidor.');
    }
  }

  function procesarTranscripcion(transcripcion) {
    const jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];
    const resultadoParseo = parsearTranscripcion(transcripcion, jugadores);

    // 1. Primero, comprobamos si es un comando.
    if (resultadoParseo && resultadoParseo.type === 'command') {
      console.log(`Comando reconocido: ${resultadoParseo.command}`);
      if (resultadoParseo.command === 'stop') {
        detenerGrabacion();
      } else if (resultadoParseo.command === 'clear') {
        if (window.limpiarPuntuaciones) window.limpiarPuntuaciones();
      } else if (resultadoParseo.command === 'undo') {
        if (window.deshacerUltimaPuntuacion) window.deshacerUltimaPuntuacion();
      } else if (resultadoParseo.command === 'hush') {
        window.speechSynthesis.cancel();
      }
    // 2. Si no es un comando, comprobamos si es una o más puntuaciones.
    } else if (Array.isArray(resultadoParseo) && resultadoParseo.length > 0) {
      console.log('Puntuaciones procesadas:', resultadoParseo);
      resultadoParseo.forEach(res => {
        if (res.type === 'score' && window.actualizarPuntosPorVoz) {
          window.actualizarPuntosPorVoz(res.jugador, res.puntos);
        }
      });
    // 3. Si no es ni un comando ni una puntuación, ¡es una pregunta para la IA!
    } else {
      // Si no es un comando ni una puntuación, es una pregunta para la IA
      console.log(`Pregunta no reconocida, enviando a la IA: "${transcripcion}"`);
      enviarPreguntaIA(transcripcion);
    }
  }

  /**
   * ¡NUEVA FUNCIÓN! Envía una pregunta de texto a la IA y lee la respuesta.
   * @param {string} pregunta El texto de la pregunta del usuario.
   */
  async function enviarPreguntaIA(pregunta) {
    // --- CORREGIDO: Recopilamos un resumen del estado del juego ---
    // En lugar de enviar todos los datos, enviamos solo el nombre y el total.
    let estadoJuego = [];
    if (window.jugadores && typeof window.calcularTotal === 'function') {
      estadoJuego = window.jugadores.map(jugador => ({
        nombre: jugador.nombre,
        total: window.calcularTotal(jugador)
      }));
    }

    const response = await fetch(`${URL_SERVIDOR_VOZ}/pregunta-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta, estadoJuego })
    });
    const data = await response.json();
    if (data.respuesta) {
      hablarTexto(data.respuesta);
    }
  }
});

/**
 * ¡NUEVA FUNCIÓN! Hace que el navegador lea un texto en voz alta.
 * @param {string} texto El texto que se va a leer.
 */
function hablarTexto(texto) {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.error('La síntesis de voz no es soportada en este navegador.');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = 'es-ES';
  utterance.rate = 0.9; // Un poco más lento para que se entienda bien.
  synth.speak(utterance);
}
window.hablarTexto = hablarTexto; // La hacemos global para que pocha.js pueda usarla.