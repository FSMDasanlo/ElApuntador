// voz.js - Versión Final (Manejo de Permisos Corregido)

document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const btnDetenerVoz = document.getElementById('btn-detener-voz'); 
  const synth = window.speechSynthesis;
  // Usar window.webkitSpeechRecognition para mayor compatibilidad
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
  
  // --- Configuración de Gramática ---
  const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
  // Añadimos 'menos' a la gramática
  const numbers = 'menos cero | menos uno | menos dos | menos tres | menos cuatro | menos cinco | menos seis | menos siete | menos ocho | menos nueve | menos diez | cero | uno | dos | tres | cuatro | cinco | seis | siete | ocho | nueve | diez | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10';
  const grammar = `#JSGF V1.0; grammar numbers; public <number> = ${numbers} ;`;
  const speechRecognitionList = SpeechGrammarList ? new SpeechGrammarList() : null;
  if(speechRecognitionList) speechRecognitionList.addFromString(grammar, 1);
  // ----------------------------------------------------

  let recog = SpeechRecognition ? new SpeechRecognition() : null;
  let isRecording = false; 
  let currentResolve = null; 

  if(!recog){
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }

  // --- Inicialización y configuración del reconocedor ---
  recog.lang = 'es'; 
  recog.interimResults = false;
  recog.continuous = true; // Establecer modo continuo
  if(speechRecognitionList) recog.grammars = speechRecognitionList;

  // Manejar el resultado de la escucha
  recog.onresult = (event) => {
    // Solo procesamos el último resultado (el más completo)
    const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
    if(currentResolve) {
      // Detener para forzar la finalización del 'escuchar' actual
      recog.stop(); 
      currentResolve(transcript);
    }
  };

  // Manejar errores
  recog.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // Ignoramos estos errores si estamos en modo continuo, se reiniciará en onend
        // Si hay un resolve pendiente, lo resolvemos vacío.
        if(currentResolve) {
            recog.stop(); // Forzar la parada para resolver la promesa
            currentResolve('');
        }
    } else {
        // Para errores graves, detenemos completamente
        stopRecording();
        hablar("Ha ocurrido un error grave en el reconocimiento de voz.");
    }
  };

  // 🚨 SOLUCIÓN: Si la sesión termina (ej. el usuario deja de hablar, o llamamos a stop()), la reiniciamos.
  recog.onend = () => {
    // Solo reiniciamos si la variable 'isRecording' está activa (el usuario no ha pulsado Stop)
    if (isRecording) { 
        try {
            recog.start(); 
        } catch (e) {
            console.warn("Recognition already started or error restarting.");
        }
    }
  };
  
  /**
   * Envuelve la escucha de voz en una Promesa, esperando un resultado antes de continuar.
   * NO llama a recog.start(), sino que espera el resultado de la sesión continua.
   */
  function escuchar() {
    return new Promise((resolve) => {
      // Si no estamos grabando, resuelve inmediatamente
      if (!isRecording) return resolve('');
      
      currentResolve = resolve;
      
      // La escucha ya está activa gracias a recog.onend / startRecording.
      // Aquí solo esperamos a que recog.onresult llame a resolve.
      // Opcional: para forzar que empiece a grabar tras la pregunta (a veces ayuda):
      // recog.start(); 
    });
  }

  /**
   * Función para que el sintetizador hable un texto.
   */
  function hablar(texto) {
    return new Promise((resolve) => {
        if (!synth || !isRecording) { 
            resolve();
            return;
        } 
        
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es';
        utterance.onend = resolve;
        utterance.onerror = () => {
            console.error("Speech synthesis error");
            resolve();
        };
        synth.speak(utterance);
    });
  }
  
  /**
   * Inicia la grabación y pide el permiso UNA SOLA VEZ.
   */
  function startRecording() {
    if (isRecording) return; // Ya está activo
    
    isRecording = true;
    btnVoz.style.display = 'none';
    btnDetenerVoz.style.display = 'inline-block';
    
    // Iniciar la sesión de reconocimiento y procesamiento
    try {
        recog.start(); // Esto pedirá el permiso de micrófono
        processVoiceInput(); // Iniciar el flujo de preguntas/respuestas
    } catch (e) {
        console.error("Error starting recognition:", e);
        hablar("No se pudo iniciar la grabación de voz. Asegúrate de que el micrófono está disponible.");
        stopRecording();
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    btnVoz.style.display = 'inline-block';
    btnDetenerVoz.style.display = 'none';
    
    // Se detiene el motor, que a su vez previene el reinicio en recog.onend
    recog.stop(); 
  }

  btnVoz.addEventListener('click', startRecording);
  btnDetenerVoz.addEventListener('click', stopRecording);
  
  /**
   * Mapea la transcripción de voz (texto) a un número entero.
   */
  function parsearRespuesta(texto) {
      if (!texto) return NaN;

      const numMap = {
          'cero': 0, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 
          'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
      };

      let esNegativo = false;
      if (texto.startsWith('menos')) {
          esNegativo = true;
          texto = texto.replace('menos', '').trim();
      }

      let num = NaN;
      if (!isNaN(parseInt(texto))) {
          num = parseInt(texto);
      } else if (numMap.hasOwnProperty(texto)) {
          num = numMap[texto];
      }

      if (isNaN(num)) return NaN;
      return esNegativo ? -num : num;
  }
  
  /**
   * Proceso principal de entrada de voz.
   */
  async function processVoiceInput() {
    const filas = document.querySelectorAll('#cuerpo-tabla-ascendente tr');

    let colActual = 0; 
    let allRoundsFilled = true;

    // Buscar la primera celda que NO tenga valor para determinar la ronda actual
    for (let i = 0; i < window.rondasActuales.todas.length; i++) {
        const celda = document.querySelector(`.ronda-${i}`);
        if (celda && celda.textContent.trim() === '') {
            colActual = i;
            allRoundsFilled = false;
            break; 
        }
    }
    
    if (allRoundsFilled) {
        await hablar("El juego ha terminado. Todas las rondas están completas.");
        stopRecording();
        return;
    }
    
    if (filas.length === 0) {
        await hablar("No hay jugadores.");
        stopRecording();
        return;
    }

    // Identificar la ronda actual
    const numCartas = window.rondasActuales.todas[colActual];
    await hablar(`Comenzando ronda ${colActual + 1} de ${numCartas} cartas`); 

    // Bucle principal: pide el valor a cada jugador
    for(const f of filas){ // Usamos 'const' en vez de 'let' ya que no se reasigna
      if(!isRecording) break; 
      
      const nombre = f.cells[0].textContent;
      await hablar(`Puntos para ${nombre}`);
      
      if(!isRecording) break; 

      let resp = '';
      let intentos = 0;
      let num = NaN;
      
      // Bucle de reintento (máx. 3 veces)
      while(isNaN(num) && intentos < 3 && isRecording){ 
          if (intentos > 0) {
              await hablar(`No he entendido. Por favor, di solo el número de bazas para ${nombre}.`);
          }
          // Llama a la versión mejorada de escuchar que no reinicia el micrófono
          resp = await escuchar(); 
          num = parsearRespuesta(resp);
          intentos++;
      }

      // --- Escribir el resultado en la celda correcta ---
      const celdaAfectada = document.querySelector(`tr[data-jugador="${nombre}"] .ronda-${colActual}`);

      if(celdaAfectada){
        if(!isNaN(num)){
          celdaAfectada.textContent = num;
        } else if (isRecording) { 
          // Si falló 3 veces, usamos 0 como valor de seguridad.
          await hablar(`No he entendido el número después de ${intentos} intentos. Poniendo cero para ${nombre}.`);
          celdaAfectada.textContent = '0'; 
        }
      }
    }
    
    // Al terminar de pasar por todos los jugadores, se actualizan las puntuaciones y el ranking.
    if(window.calcularPuntuaciones) window.calcularPuntuaciones();
    if(window.actualizarRanking) window.actualizarRanking();

    // Mensaje de finalización
    if(isRecording){
        await hablar("Ronda completada. Dime puntos para la siguiente ronda cuando quieras.");
        // Después de completar la ronda, volvemos a llamar a processVoiceInput
        // para buscar la siguiente ronda vacía o detener si está completa.
        processVoiceInput();
    }
  }
});