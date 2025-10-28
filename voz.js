// voz.js - AJUSTES PARA COMPATIBILIDAD MÓVIL

document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const btnDetenerVoz = document.getElementById('btn-detener-voz'); 
  const synth = window.speechSynthesis;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // --- Configuración de Gramática (Desactivada en móviles) ---
  // Aunque es útil, la GRAMÁTICA (SpeechGrammarList) NO es compatible
  // con muchos navegadores móviles y puede causar fallos.
  const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
  // let speechRecognitionList = SpeechGrammarList ? new SpeechGrammarList() : null;
  // if(speechRecognitionList) {
  //     const numbers = 'cero | uno | dos | tres | cuatro | cinco | seis | siete | ocho | nueve | diez | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10';
  //     const grammar = `#JSGF V1.0; grammar numbers; public <number> = [menos] <num> ; <num> = ${numbers} ;`;
  //     speechRecognitionList.addFromString(grammar, 1);
  // }
  let speechRecognitionList = null; // <= Forzar a NULL para evitar fallos en móviles

  let recog = SpeechRecognition ? new SpeechRecognition() : null;
  // ... (el resto del código sigue igual, pero sin usar speechRecognitionList en el objeto recog) ...
  // ... (el resto del código que ya estaba) ...

  if(!recog){
    // Este mensaje será crucial para avisar al usuario en Safari iOS
    alert('Tu navegador no soporta o tiene deshabilitado el reconocimiento de voz (Web Speech API).');
    return;
  }

  // --- Aplicando mejoras ---
  recog.lang = 'es'; 
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  // La propiedad 'continuous' puede ser problemática. Si falla, prueba a ponerla a 'false'.
  recog.continuous = true; 
  // if(speechRecognitionList) recog.grammars = speechRecognitionList; // <= Eliminado
  // -------------------------

  // ... (resto del código sin cambios en onresult, onerror, onend, hablar, escuchar, detenerRonda) ...
  
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
  
  recog.onresult = e => {
    if (currentResolve) {
      const transcript = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
      const resolveFn = currentResolve;
      currentResolve = null; 
      
      let processedTranscript = transcript;
      
      // SIN LA GRAMÁTICA, debemos detectar "menos" en la transcripción
      // También debemos aceptar "negativo" o solo el signo si se pronuncia
      if (transcript.startsWith('menos')) {
          processedTranscript = '-' + transcript.replace('menos', '').trim();
      } else if (transcript.startsWith('negativo')) {
          processedTranscript = '-' + transcript.replace('negativo', '').trim();
      }
      
      // Intentamos normalizar números hablados (uno -> 1)
      processedTranscript = normalizarNumero(processedTranscript);

      resolveFn(processedTranscript); 
    }
  };

  // ... (el resto de las funciones: escuchar, hablar, iniciarRonda...)
  
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
    btnVoz.textContent = '🎤 puntos x voz'; 
    btnDetenerVoz.style.display = 'none';
  }
  
  window.detenerRonda = detenerRonda;
  
  async function iniciarRonda(){
      // ... (código de iniciarRonda) ...
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
      
      // ** IMPORTANTE: En móviles puede que necesites REINICIAR aquí**
      // En lugar de llamar a `recog.start()` una vez, a veces hay que llamarlo
      // para cada jugador si `continuous: true` falla.
      
      try {
          recog.start(); 
      } catch (e) {
          console.warn("Recognition start failed, trying to continue:", e);
      }

      // Lógica para encontrar la columna actual
      const nCols = tabla.tHead.rows[1].cells.length; 
      let colActual = -1;
      for(let c=1;c<=nCols;c++){
        if(filas.some(f => f.cells[c].textContent==='')){ colActual = c; break; }
      }

      if(colActual === -1){
        await hablar('Todas las rondas están completas');
        detenerRonda();
        return;
      }

      const colNombre = tabla.tHead.rows[1].cells[colActual - 1].textContent;
      await hablar(`Ronda de ${colNombre} cartas`); 

      // Bucle principal
      for(let f of filas){
        if(!isRecording) break; 
        
        const nombre = f.cells[0].textContent;
        await hablar(`Puntos para ${nombre}`);
        
        if(!isRecording) break; 

        let resp = '';
        let intentos = 0;
        
        while((!resp || isNaN(parseInt(resp))) && intentos < 3 && isRecording){ 
            if (intentos > 0) {
                await hablar(`No he entendido. Por favor, di solo el número de bazas para ${nombre}.`);
            }
            resp = await escuchar(); 
            intentos++;
        }

        let num = parseInt(resp);

        if(!isNaN(num)){
          f.cells[colActual].textContent = num.toString(); 
        } else if (isRecording) { 
          await hablar(`No he entendido el número después de varios intentos. Poniendo cero para ${nombre}.`);
          f.cells[colActual].textContent = '0'; 
        }
      }
      
      if(typeof calcularPuntuaciones === 'function') calcularPuntuaciones();
      if(typeof actualizarRanking === 'function') actualizarRanking();
      
      detenerRonda();
    }
  
  if (btnVoz) btnVoz.addEventListener('click', iniciarRonda);
  if (btnDetenerVoz) btnDetenerVoz.addEventListener('click', detenerRonda);

  window.iniciarRondaVoz = iniciarRonda;
});