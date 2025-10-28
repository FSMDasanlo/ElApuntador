// voz.js - Versión Mejorada (con soporte para números negativos)

document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const btnDetenerVoz = document.getElementById('btn-detener-voz'); 
  const synth = window.speechSynthesis;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // --- Configuración de Gramática (Mejora clave para negativos) ---
  const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
  const numbers = 'cero | uno | dos | tres | cuatro | cinco | seis | siete | ocho | nueve | diez | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10';
  
  // Incluimos la opción de que la predicción pueda empezar con 'menos'
  // El signo '-' se usará internamente para reconocer el número
  const grammar = `#JSGF V1.0; grammar numbers; public <number> = [menos] <num> ; <num> = ${numbers} ;`;
  const speechRecognitionList = SpeechGrammarList ? new SpeechGrammarList() : null;
  if(speechRecognitionList) speechRecognitionList.addFromString(grammar, 1);
  // ------------------------------------------------------------------

  let recog = SpeechRecognition ? new SpeechRecognition() : null;
  let isRecording = false; 
  let currentResolve = null; 

  if(!recog){
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }

  // --- Aplicando mejoras ---
  recog.lang = 'es'; 
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  recog.continuous = true; 
  if(speechRecognitionList) recog.grammars = speechRecognitionList; 
  // -------------------------

  // --- MANEJADORES GLOBALES DE EVENTOS ---
  recog.onresult = e => {
    if (currentResolve) {
      const transcript = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
      const resolveFn = currentResolve;
      currentResolve = null; 
      
      // *** MODIFICACIÓN: Procesar 'menos' como un signo negativo ***
      let processedTranscript = transcript;
      if (transcript.startsWith('menos')) {
          processedTranscript = '-' + transcript.replace('menos', '').trim();
      }
      // -------------------------------------------------------------
      
      // Intentamos normalizar números hablados (uno -> 1)
      processedTranscript = normalizarNumero(processedTranscript);

      resolveFn(processedTranscript); 
    }
  };
  
  // Nueva función para normalizar números de texto a dígitos
  function normalizarNumero(texto) {
      const mapa = {
          'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 
          'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 
          'diez': '10'
      };
      // Manejar el caso de '-uno' o 'cinco'
      let isNegative = texto.startsWith('-');
      let numStr = isNegative ? texto.substring(1).trim() : texto.trim();
      
      if (mapa.hasOwnProperty(numStr)) {
          numStr = mapa[numStr];
      }
      
      return isNegative ? '-' + numStr : numStr;
  }
// ... resto del código sin cambios ...
  recog.onerror = e => {
    console.error('Error de reconocimiento:', e.error);
    if(currentResolve) {
        const resolveFn = currentResolve;
        currentResolve = null;
        resolveFn(''); 
    }
    if (e.error !== 'not-allowed') { 
        detenerRonda();
    }
  };
  
  recog.onend = () => {
    if(isRecording) {
        // Reiniciar la grabación automáticamente si termina sin una llamada a stop() explícita
        if(currentResolve) {
            console.log("Reiniciando reconocimiento de voz...");
            try {
                recog.start();
            } catch(e) {
                console.warn("Fallo al reiniciar la grabación:", e);
                detenerRonda();
            }
        } else {
            detenerRonda();
        }
    }
  }
  // --- FIN MANEJADORES GLOBALES ---

  function hablar(texto){
    return new Promise(res => {
      if(!isRecording) { res(); return; } 
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-ES';
      u.onend = res;
      synth.speak(u);
    });
  }

  function escuchar(){
    return new Promise(res => {
      if(!isRecording) { res(''); return; } 
      currentResolve = res;
    });
  }

  function detenerRonda() {
    isRecording = false;
    try {
        recog.stop(); 
    } catch(e) { /* Ignorar si ya está detenida */ }
    synth.cancel(); 
    btnVoz.disabled = false;
    btnVoz.textContent = '🎤 puntos x voz'; // Cambiado 'Iniciar ronda por voz' a 'puntos x voz' para coincidir con el HTML
    btnDetenerVoz.style.display = 'none';
  }
  
  window.detenerRonda = detenerRonda;

  async function iniciarRonda(){
    isRecording = true;
    btnVoz.disabled = true;
    btnVoz.textContent = '⏳ Escuchando...';
    btnDetenerVoz.style.display = 'inline-block';

    const tabla = document.getElementById('tabla-puntos');
    const cuerpo = document.getElementById('cuerpo-tabla');
    const filas = Array.from(cuerpo.rows); 

    if (filas.length === 0) {
        await hablar('Añade jugadores para empezar');
        detenerRonda();
        return;
    }
    
    try {
        recog.start(); 
    } catch (e) {
        console.warn("Recognition start failed, trying to continue:", e);
    }

    // Lógica para encontrar la columna actual
    const nCols = tabla.tHead.rows[1].cells.length; 
    let colActual = -1;
    for(let c=1;c<=nCols;c++){
      // Busca la primera columna de ronda vacía
      if(filas.some(f => f.cells[c].textContent==='')){ colActual = c; break; }
    }

    if(colActual === -1){
      await hablar('Todas las rondas están completas');
      detenerRonda();
      return;
    }

    const colNombre = tabla.tHead.rows[1].cells[colActual - 1].textContent;
    await hablar(`Ronda de ${colNombre} cartas`); 

    // Bucle principal: ahora espera input sin reiniciar la sesión
    for(let f of filas){
      if(!isRecording) break; 
      
      const nombre = f.cells[0].textContent;
      await hablar(`Puntos para ${nombre}`);
      
      if(!isRecording) break; 

      let resp = '';
      let intentos = 0;
      
      // Bucle de reintento (máx. 3 veces)
      while((!resp || isNaN(parseInt(resp))) && intentos < 3 && isRecording){ 
          if (intentos > 0) {
              // --- Mensaje más explícito (Mejora) ---
              await hablar(`No he entendido. Por favor, di solo el número de bazas para ${nombre}.`);
              // --------------------------------------
          }
          resp = await escuchar(); 
          intentos++;
      }

      // La clave es que 'resp' ya puede ser '-5' o '5'
      let num = parseInt(resp);

      if(!isNaN(num)){
        f.cells[colActual].textContent = num.toString(); // Usar num.toString() para manejar el signo
      } else if (isRecording) { 
        await hablar(`No he entendido el número después de varios intentos. Poniendo cero para ${nombre}.`);
        f.cells[colActual].textContent = '0'; // Poner 0 si no se entiende
      }
    }
    
    // Las funciones calcularPuntuaciones y actualizarRanking deben estar definidas globalmente o cargadas
    if(typeof calcularPuntuaciones === 'function') calcularPuntuaciones();
    if(typeof actualizarRanking === 'function') actualizarRanking();
    
    detenerRonda();
  }
  
  if (btnVoz) btnVoz.addEventListener('click', iniciarRonda);
  if (btnDetenerVoz) btnDetenerVoz.addEventListener('click', detenerRonda);

  window.iniciarRondaVoz = iniciarRonda;
});