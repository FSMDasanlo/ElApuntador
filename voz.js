// voz.js

document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const btnDetenerVoz = document.getElementById('btn-detener-voz'); 
  const synth = window.speechSynthesis;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = SpeechRecognition ? new SpeechRecognition() : null;
  let isRecording = false; 
  let currentResolve = null; // Para resolver la promesa de 'escuchar'

  if(!recog){
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }

  recog.lang = 'es-ES';
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  recog.continuous = true; // 🌟 CLAVE: Mantener la escucha activa para toda la ronda

  // --- MANEJADORES GLOBALES DE EVENTOS ---
  recog.onresult = e => {
    // Solo si estamos esperando activamente la entrada (currentResolve está configurado)
    if (currentResolve) {
      // Obtenemos la última transcripción
      const transcript = e.results[e.results.length - 1][0].transcript;
      const resolveFn = currentResolve;
      currentResolve = null; // Limpiamos el resolvedor
      resolveFn(transcript); // Resolvemos la promesa en escuchar()
    }
  };

  recog.onerror = e => {
    console.error('Error de reconocimiento:', e.error);
    // Si ocurre un error, debemos desbloquear la promesa actual y detener la ronda.
    if(currentResolve) {
        const resolveFn = currentResolve;
        currentResolve = null;
        resolveFn(''); // Desbloqueamos la espera
    }
    // Solo detenemos si no es un error de permiso inicial
    if (e.error !== 'not-allowed') { 
        detenerRonda();
    }
  };
  
  recog.onend = () => {
    // En modo continuo, onend solo se dispara si llamamos a recog.stop() o por un error fatal.
    if(isRecording) {
        detenerRonda();
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
    // Esta función ahora solo crea una promesa y la almacena.
    // El manejador global recog.onresult la resolverá cuando escuche algo.
    return new Promise(res => {
      if(!isRecording) { res(''); return; } 
      currentResolve = res;
    });
  }

  function detenerRonda() {
    isRecording = false;
    try {
        recog.stop(); // Detener la sesión continua
    } catch(e) { /* Ignorar si ya está detenida */ }
    synth.cancel(); 
    btnVoz.disabled = false;
    btnVoz.textContent = '🎤 Iniciar ronda por voz';
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
    
    // 🌟 CLAVE: Iniciar la sesión continua UNA SOLA VEZ
    try {
        recog.start(); 
    } catch (e) {
        console.warn("Recognition start failed, assuming already started or error:", e);
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
              await hablar('Por favor, repite el número.');
          }
          // 💡 escuchar() ahora solo espera el resultado de la sesión continua
          resp = await escuchar(); 
          intentos++;
      }

      let num = parseInt(resp);

      if(!isNaN(num)){
        f.cells[colActual].textContent = num;
      } else if (isRecording) { 
        await hablar('No he entendido el número después de varios intentos. Pasando al siguiente jugador.');
        f.cells[colActual].textContent = ''; 
      }
    }
    
    if(window.calcularPuntuaciones) window.calcularPuntuaciones();
    if(window.actualizarRanking) window.actualizarRanking();
    
    detenerRonda();
  }
  
  if (btnVoz) btnVoz.addEventListener('click', iniciarRonda);
  if (btnDetenerVoz) btnDetenerVoz.addEventListener('click', detenerRonda);

  window.iniciarRondaVoz = iniciarRonda;
});