// voz.js

document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const synth = window.speechSynthesis;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = SpeechRecognition ? new SpeechRecognition() : null;

  if(!recog){
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }

  recog.lang = 'es-ES';
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  function hablar(texto){
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-ES';
      u.onend = res;
      synth.speak(u);
    });
  }

  function escuchar(){
    return new Promise(res => {
      recog.start();
      recog.onresult = e => {
        res(e.results[0][0].transcript);
        recog.stop();
      };
      recog.onerror = e => {
        recog.stop();
        res('');
      };
    });
  }

  async function iniciarRonda(){
    btnVoz.disabled = true;

    const tabla = document.getElementById('tabla-puntos');
    const cuerpo = document.getElementById('cuerpo-tabla');
    
    const filas = Array.from(cuerpo.rows); 

    if (filas.length === 0) {
        await hablar('Añade jugadores para empezar');
        btnVoz.disabled = false;
        return;
    }
    
    // nCols: número total de columnas de rondas
    const nCols = tabla.tHead.rows[1].cells.length; 

    // Encontrar primera columna vacía (empezando desde la columna 1 en las filas de jugador)
    let colActual = -1;
    for(let c=1;c<=nCols;c++){
      if(filas.some(f => f.cells[c].textContent==='')){ colActual = c; break; }
    }

    if(colActual === -1){
      await hablar('Todas las rondas están completas');
      btnVoz.disabled = false;
      return;
    }

    // CRÍTICO: La ronda actual está en la segunda fila del thead (índice 1).
    // El índice de la celda es colActual - 1 porque el índice 0 de la fila del jugador es el nombre.
    const colNombre = tabla.tHead.rows[1].cells[colActual - 1].textContent;
    await hablar(`Ronda de ${colNombre} cartas`); 

    for(let f of filas){
      const nombre = f.cells[0].textContent;
      await hablar(`Puntos para ${nombre}`);

      let resp = await escuchar();
      let num = parseInt(resp);

      if(!isNaN(num)){
        f.cells[colActual].textContent = num;
      } else {
        await hablar('No he entendido el número');
        f.cells[colActual].textContent = ''; 
      }
    }
    
    if(window.calcularPuntuaciones) window.calcularPuntuaciones();
    if(window.actualizarRanking) window.actualizarRanking();

    btnVoz.disabled = false;
  }
  
  if (btnVoz) {
    btnVoz.addEventListener('click', iniciarRonda);
  } else {
      console.error("El botón de voz no se encontró.");
  }

  window.iniciarRondaVoz = iniciarRonda;
});