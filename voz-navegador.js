document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const btnDetenerVoz = document.getElementById('btn-detener-voz');

  // Comprobamos si el navegador soporta la API de voz
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error('El reconocimiento de voz no es soportado en este navegador.');
    btnVoz.disabled = true;
    btnVoz.textContent = '🎤 No Soportado';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = false; // No queremos resultados parciales
  recognition.continuous = false; // Solo queremos un resultado final por cada escucha

  // --- ¡AQUÍ ESTÁ LA MAGIA! ---
  // Desactivamos los sonidos de "bip" que hace el navegador al reconocer.
  recognition.onaudiostart = recognition.onaudioend = recognition.onsoundstart = recognition.onsoundend = recognition.onspeechstart = recognition.onspeechend = () => {};

  let isRecording = false;

  // --- LÓGICA DE PROCESAMIENTO (ADAPTADA DEL ANTIGUO server.js) ---

  /**
   * Función para extraer el nombre y los puntos de un texto.
   * Ej: "Ana veinte" -> { jugador: "Ana", puntos: 20 }
   */
  function parsearTranscripcion(texto, jugadores) {
    const palabras = texto.toLowerCase().split(' ');
    let jugadorEncontrado = null;
    let puntosEncontrados = null;

    // --- 1. BUSCAMOS COMANDOS PRIMERO ---
    const textoMinusculas = texto.toLowerCase();
    if (textoMinusculas.includes('apaga micro') || textoMinusculas.includes('apagar micro') || textoMinusculas.includes('detener micro')) {
      // Si encontramos un comando para detener, lo devolvemos con un tipo especial.
      return { type: 'command', command: 'stop' };
    }

    if (textoMinusculas.includes('reiniciar') || textoMinusculas.includes('borrar todo') || textoMinusculas.includes('nueva partida')) {
      // Comando para limpiar la tabla
      return { type: 'command', command: 'clear' };
    }

    if (textoMinusculas.includes('deshacer') || textoMinusculas.includes('corrige') || textoMinusculas.includes('borra la última')) {
      // Comando para deshacer la última acción
      return { type: 'command', command: 'undo' };
    }

    if (textoMinusculas.includes('vale') || textoMinusculas.includes('calla') || textoMinusculas.includes('silencio')) {
      // Comando para detener la síntesis de voz
      return { type: 'command', command: 'hush' };
    }

    const mapaNumeros = {
      'cero': 0, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
      'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
      'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
      'veinte': 20, 'veintiuno': 21, 'veintidos': 22, 'veintitres': 23, 'veinticuatro': 24,
      'veinticinco': 25, 'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
      'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60, 'setenta': 70,
      'ochenta': 80, 'noventa': 90, 'cien': 100
    };

    // Normalizamos el texto para facilitar el parseo (ej: "treinta y uno" -> "treinta uno")
    const textoNormalizado = texto.toLowerCase().replace(/\s+y\s+/g, ' ');
    const palabrasNormalizadas = textoNormalizado.split(' ');

    // --- BÚSQUEDA DE JUGADOR MEJORADA ---
    // Buscamos la coincidencia más larga para evitar falsos positivos (ej: "Ana" y "Anabel")
    let mejorCoincidencia = '';
    for (const jugador of jugadores) {
      const nombreJugadorMinusculas = jugador.toLowerCase();
      // Comprobamos si alguna palabra reconocida empieza como el nombre de un jugador
      // O si el nombre de un jugador empieza como una palabra reconocida (para casos como "Jesu")
      if (palabrasNormalizadas.some(p => nombreJugadorMinusculas.startsWith(p) || p.startsWith(nombreJugadorMinusculas))) {
        if (nombreJugadorMinusculas.length > mejorCoincidencia.length) {
          mejorCoincidencia = jugador;
        }
      }
    }
    if (mejorCoincidencia) {
      jugadorEncontrado = mejorCoincidencia;
    }

    // --- LÓGICA DE PARSEO DE NÚMEROS MEJORADA ---
    let sumaParcial = 0;
    for (const palabra of palabrasNormalizadas) {
      // Primero, intentamos convertir la palabra a un número directamente (ej: "25")
      if (!isNaN(parseInt(palabra))) {
        sumaParcial += parseInt(palabra);
        continue; // Pasamos a la siguiente palabra por si es un número compuesto
      }

      // Si no es un número, buscamos en nuestro mapa
      const valor = mapaNumeros[palabra];
      if (valor !== undefined) {
        // Para decenas (30, 40...), si la suma ya tiene algo, es un nuevo número.
        // Esto es una simplificación, asumimos que no se dirán números como "treinta veinte".
        if (valor >= 30 && sumaParcial % 10 !== 0) {
            // Ignoramos esta palabra si parece el inicio de otro número
        } else {
            sumaParcial += valor;
        }
      }
    }
    if (sumaParcial > 0 || (palabrasNormalizadas.includes('cero') && jugadorEncontrado)) {
        puntosEncontrados = sumaParcial;
    }

    if (!jugadorEncontrado || puntosEncontrados === null) {
      return null; // No se encontró una orden válida
    }

    return { type: 'score', jugador: jugadorEncontrado, puntos: puntosEncontrados };
  }

  // --- MANEJO DE EVENTOS DE LA API DE VOZ ---

  // Cuando el reconocimiento de voz termina
  recognition.onend = () => {
    if (isRecording) {
      // Si estábamos grabando, volvemos a empezar a escuchar.
      // Esto crea un ciclo de escucha continuo hasta que el usuario pulsa "Detener".
      recognition.start();
    }
  };

  // Cuando se detecta un resultado
  recognition.onresult = (event) => {
    const transcripcion = event.results[event.results.length - 1][0].transcript.trim();
    console.log(`Texto reconocido: "${transcripcion}"`);

    const jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];
    const resultado = parsearTranscripcion(transcripcion, jugadores);

    if (resultado && resultado.type === 'score') {
      console.log('Datos procesados:', resultado);
      if (window.actualizarPuntosPorVoz) {
        window.actualizarPuntosPorVoz(resultado.jugador, resultado.puntos);
      }
    } else if (resultado && resultado.type === 'command' && resultado.command === 'stop') {
      console.log('Comando de detener voz reconocido.');
      // Llamamos a la función que detiene la grabación.
      detenerGrabacion();
    } else if (resultado && resultado.type === 'command' && resultado.command === 'clear') {
      console.log('Comando de reiniciar partida reconocido.');
      // Llamamos a la función global de pocha.js
      if (window.limpiarPuntuaciones) {
        window.limpiarPuntuaciones();
      }
    } else if (resultado && resultado.type === 'command' && resultado.command === 'undo') {
      console.log('Comando de deshacer reconocido.');
      // Llamamos a la nueva función global de pocha.js
      if (window.deshacerUltimaPuntuacion) {
        window.deshacerUltimaPuntuacion();
      }
    } else if (resultado && resultado.type === 'command' && resultado.command === 'hush') {
      console.log('Comando de silenciar voz reconocido.');
      // Llamamos directamente a la API del navegador para cancelar la voz.
      window.speechSynthesis.cancel();
    } else {
      console.warn('No se pudo interpretar la orden.');
      // Opcional: podrías añadir un sonido o feedback visual de "no entendido".
    }
    
  };

  recognition.onerror = (event) => {
    console.error('Error en el reconocimiento de voz:', event.error);
    // Errores como 'no-speech' son comunes, simplemente los ignoramos y el onend se encargará de reiniciar.
  };

  // --- FUNCIONES DE LOS BOTONES ---

  const iniciarGrabacion = () => {
    if (isRecording) return;
    isRecording = true;
    btnVoz.style.display = 'none';
    btnDetenerVoz.style.display = 'inline-block';
    recognition.start();
    console.log("Iniciando escucha continua...");
  };

  const detenerGrabacion = () => {
    if (!isRecording) return;
    isRecording = false;
    btnVoz.style.display = 'inline-block';
    btnDetenerVoz.style.display = 'none';
    recognition.stop();
    console.log("Deteniendo escucha.");
  };

  btnVoz.addEventListener('click', iniciarGrabacion);
  btnDetenerVoz.addEventListener('click', detenerGrabacion);
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