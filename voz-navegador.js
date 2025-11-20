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
  // ===== SOLUCIÓN HÍBRIDA DEFINITIVA ("EL INTERRUPTOR") =====
  // 1. Mantenemos el micro en modo continuo para evitar que el navegador pida permiso repetidamente.
  recognition.continuous = true;

  let servicioIniciado = false;       // ¿Hemos arrancado el servicio alguna vez?
  let procesarLaSiguienteFrase = false; // El "interruptor" que nos dice si debemos procesar la voz.
  
  // --- LÓGICA DE PROCESAMIENTO (ADAPTADA DEL ANTIGUO server.js) ---

  /**
   * ===== MEJORA 2: Nueva función para procesar múltiples puntuaciones en una sola frase =====
   * Ej: "Ana veinte Jesús treinta" -> [{ jugador: "Ana", puntos: 20 }, { jugador: "Jesús", puntos: 30 }]
   */
  function parsearTranscripcion(texto, jugadores) {
    const textoLimpio = texto.toLowerCase().trim();
    
    // --- 1. BUSCAMOS COMANDOS GLOBALES ---
    if (textoLimpio.includes('apaga micro') || textoLimpio.includes('apagar micro') || textoLimpio.includes('detener micro')) {
      return [{ type: 'command', command: 'stop' }];
    }
    if (textoLimpio.includes('reiniciar') || textoLimpio.includes('borrar todo') || textoLimpio.includes('nueva partida')) {
      return [{ type: 'command', command: 'clear' }];
    }
    if (textoLimpio.includes('deshacer') || textoLimpio.includes('corrige') || textoLimpio.includes('borra la última')) {
      return [{ type: 'command', command: 'undo' }];
    }
    if (textoLimpio.includes('vale') || textoLimpio.includes('calla') || textoLimpio.includes('silencio')) {
      return [{ type: 'command', command: 'hush' }];
    }
    if (textoLimpio.includes('cómo vamos') || textoLimpio.includes('quién va ganando')) {
      return [{ type: 'command', command: 'ranking' }];
    }
    // ¡NUEVO! Comando para abrir la ayuda.
    if (textoLimpio.includes('ver reglas') || textoLimpio.includes('cómo se juega') || textoLimpio.includes('instrucciones')) {
      return [{ type: 'command', command: 'help' }];
    }

    // --- 2. LÓGICA PARA MÚLTIPLES PUNTUACIONES (REDISEÑADA) ---
    const resultados = [];
    const nombresJugadoresMinusculas = jugadores.map(j => j.toLowerCase());
    const palabras = textoLimpio.split(' ');

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

    // SOLUCIÓN: Mapa para reconocer los nombres de las categorías de Carrera de Dados
    const mapaCategorias = {
      'negros': 'N', 'rojos': 'R', 'jotas': 'J', 
      'reinas': 'Q', 'reyes': 'K', 'ases': 'AS'
    };
    const nombresCategorias = Object.keys(mapaCategorias);

    let jugadorActual = null;
    let puntosActuales = 0;
    let esNegativo = false; // ¡NUEVO! Bandera para detectar si el número es negativo.
    let categoriaActual = null; // ¡SOLUCIÓN! Variable temporal para la categoría.

    function guardarResultado() {
      if (jugadorActual) {
        // Buscamos el nombre original con mayúsculas/minúsculas correctas
        const nombreOriginal = jugadores.find(j => j.toLowerCase() === jugadorActual);
        resultados.push({ type: 'score', jugador: nombreOriginal, puntos: puntosActuales, categoria: categoriaActual }); // Usamos la categoría guardada
        jugadorActual = null;
        puntosActuales = 0;
        esNegativo = false; // Reseteamos la bandera para el siguiente jugador.
      }
    }

    for (const palabra of palabras) {
      
      // Si la palabra es un nombre de jugador
      if (nombresJugadoresMinusculas.includes(palabra)) {
        guardarResultado(); // Guardamos el resultado anterior si lo hubiera
        jugadorActual = palabra; // Empezamos un nuevo resultado
        continue;
      }

      // Si la palabra es un número, un signo o una categoría
      if (jugadorActual) {
        // SOLUCIÓN: Comprobamos si es un número en cifras ANTES de buscar en el mapa.
        let valor;
        if (!isNaN(parseInt(palabra))) {
            valor = parseInt(palabra);
        } else {
            valor = mapaNumeros[palabra];
        }

        // SOLUCIÓN: Comprobamos si la palabra es una categoría
        if (mapaCategorias[palabra]) {
            categoriaActual = mapaCategorias[palabra];
        }

        // Si la palabra es "en", lo que sigue es la categoría
        if (palabra === 'en') {
            const indexPalabra = palabras.indexOf(palabra);
            const siguientePalabra = palabras[indexPalabra + 1];
            if (siguientePalabra && mapaCategorias[siguientePalabra]) {
                categoriaActual = mapaCategorias[siguientePalabra];
            } 
        }
        // Si la palabra es "menos", activamos la bandera para el siguiente número
        if (palabra === 'menos') {
          esNegativo = true;
        } else if (valor !== undefined && valor !== null) {
          // Aplicamos el signo si la bandera está activa.
          const valorFinal = esNegativo ? -valor : valor;
          // Si ya hay un resultado para este jugador, sumamos los puntos
          puntosActuales += valorFinal;
          esNegativo = false; // Reseteamos la bandera después de usarla.
        }
      }
    }

    guardarResultado(); // Guardamos el último resultado pendiente al final de la frase
    return resultados;
  }

  // --- MANEJO DE EVENTOS DE LA API DE VOZ ---

  // Cuando se detecta un resultado
  recognition.onresult = (event) => {
    // Si el "interruptor" no está activado, ignoramos todo.
    if (!procesarLaSiguienteFrase) {
      console.log(`Voz ignorada: "${event.results[event.results.length - 1][0].transcript.trim()}"`);
      return;
    }
    const transcripcion = event.results[event.results.length - 1][0].transcript.trim();
    console.log(`Texto reconocido: "${transcripcion}"`);

    // ¡SOLUCIÓN! Usamos la lista de jugadores que la página del juego nos ha preparado.
    // Esto evita problemas de sincronización.
    const nombresJugadores = window.listaJugadoresParaVoz || [];

    // Desactivamos el interruptor INMEDIATAMENTE para no procesar más frases.
    procesarLaSiguienteFrase = false;
    restaurarBotonVoz();
    const resultados = parsearTranscripcion(transcripcion, nombresJugadores);

    // Procesamos cada resultado (puede ser uno o varios)
    resultados.forEach(resultado => {
      if (!resultado) return;

      if (resultado.type === 'score') {
        console.log('Datos procesados:', resultado);
        if (window.actualizarPuntosPorVoz) {
          window.actualizarPuntosPorVoz(resultado.jugador, resultado.puntos, resultado.categoria);
        }
      } else if (resultado.type === 'command' && resultado.command === 'clear') {
      console.log('Comando de reiniciar partida reconocido.');
      // Llamamos a la función global de pocha.js
      if (window.limpiarPuntuaciones) {
        window.limpiarPuntuaciones();
      }
      } else if (resultado.type === 'command' && resultado.command === 'undo') {
      console.log('Comando de deshacer reconocido.');
      // Llamamos a la nueva función global de pocha.js
      if (window.deshacerUltimaPuntuacion) {
        window.deshacerUltimaPuntuacion();
      }
      } else if (resultado.type === 'command' && resultado.command === 'hush') {
      console.log('Comando de silenciar voz reconocido.');
      // Llamamos directamente a la API del navegador para cancelar la voz.
      window.speechSynthesis.cancel();
      } else if (resultado.type === 'command' && resultado.command === 'ranking') {
        console.log('Comando de ranking reconocido.');
        if (window.obtenerRankingParaVoz) {
          const ranking = window.obtenerRankingParaVoz(); // Pedimos el ranking al juego actual
          if (ranking && ranking.length > 0) {
            let textoRanking = "Así vamos. ";
            const posiciones = ["En primer lugar", "en segundo lugar", "y en tercer lugar"];
            
            ranking.slice(0, 3).forEach((jugador, index) => {
              const prefijo = posiciones[index] || `en posición ${index + 1}`;
              textoRanking += `${prefijo}, ${jugador.nombre} con ${jugador.puntos} puntos. `;
            });

            hablarTexto(textoRanking);
          } else {
            hablarTexto("Aún no hay suficientes datos para mostrar un ranking.");
          }
        }
      } else if (resultado.type === 'command' && resultado.command === 'help') {
        console.log('Comando de ayuda reconocido.');
        // Buscamos el botón de ayuda del reglamento y simulamos un clic.
        const btnAyuda = document.getElementById('btn-ayuda');
        if (btnAyuda) {
          btnAyuda.click();
        }
      }
    });

    if (resultados.length === 0 && transcripcion) {
        console.warn(`No se pudo interpretar la orden: "${transcripcion}"`);
    }
  };

  // Si el servicio se detiene por un error (ej. se desconecta el micro), lo intentamos reiniciar.
  recognition.onend = () => {
    console.log("El servicio de reconocimiento se ha detenido.");
    // Si el servicio se había iniciado intencionadamente, lo reiniciamos para mantener la sesión.
    if (servicioIniciado) {
      console.log("Intentando reiniciar el servicio de voz...");
      try {
        recognition.start();
      } catch(e) {
        console.error("Error al reiniciar el servicio de voz.", e);
      }
    }
  };

  const iniciarGrabacion = async () => {
    // ===== MEJORA DE PERMISOS: Usamos la Permissions API para una mejor UX =====
    try {
      // 1. Consultamos el estado del permiso del micrófono.
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

      if (permissionStatus.state === 'denied') {
        alert('El permiso para usar el micrófono está denegado. Por favor, habilítalo en la configuración del navegador para usar el control por voz.');
        btnVoz.disabled = true;
        btnVoz.textContent = '🎤 Bloqueado';
        return;
      }

      // Si el servicio no se ha arrancado nunca, lo hacemos ahora.
      // Esto solo ocurrirá UNA VEZ por carga de página.
      if (!servicioIniciado) {
        try {
          recognition.start();
          servicioIniciado = true;
          console.log("Servicio de voz iniciado en modo continuo por primera vez.");
        } catch (e) {
          console.error("Error al iniciar el servicio de voz por primera vez:", e);
          alert("No se pudo iniciar el micrófono. Por favor, recarga la página y concede el permiso.");
          return;
        }
      }

      // Activamos el "interruptor" y actualizamos el botón.
      procesarLaSiguienteFrase = true;
      btnVoz.disabled = true;
      btnVoz.textContent = '🎤 Escuchando...';
      btnVoz.style.backgroundColor = '#e74c3c'; // Rojo para indicar que graba

    } catch (error) {
      console.error("Error al consultar los permisos del micrófono:", error);
      alert("No se pudo verificar el permiso del micrófono. Es posible que tu navegador no sea compatible con esta función.");
      btnVoz.disabled = true;
      btnVoz.textContent = '🎤 Error';
    }
  };

  btnVoz.addEventListener('click', iniciarGrabacion);
  if (btnDetenerVoz) {
    btnDetenerVoz.style.display = 'none'; // Ocultamos el botón de detener permanentemente.
  }

  function restaurarBotonVoz() {
    btnVoz.disabled = false;
    btnVoz.textContent = '🎤 Iniciar voz';
    btnVoz.style.backgroundColor = ''; // Vuelve al color por defecto del CSS
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
  utterance.lang = 'es-ES'; // Mantenemos el idioma
  utterance.rate = 0.9;     // Mantenemos la velocidad

  synth.speak(utterance);
}
window.hablarTexto = hablarTexto; // La hacemos global para que otros scripts puedan usarla.