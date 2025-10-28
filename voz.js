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
    const filas = Array.from(cuerpo.rows).filter(r => !r.classList.contains('fila-b')); // solo filas A

    const nCols = tabla.tHead.rows[1].cells.length - 2; // excluye columna Jugador y Total

    // Encontrar primera columna vacía
    let colActual = -1;
    for(let c=1;c<=nCols;c++){
      if(filas.some(f => f.cells[c].textContent==='')){ colActual = c; break; }
    }

    if(colActual === -1){
      await hablar('Todas las columnas están completas');
      btnVoz.disabled = false;
      return;
    }

    const colNombre = tabla.tHead.rows[1].cells[colActual].textContent;
    await hablar(`Ronda de ${colNombre}`);

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

    // Actualizar totales y ranking
    if(window.actualizarTotales) window.actualizarTotales();
    if(window.actualizarRanking) window.actualizarRanking();

    await hablar('Ronda completada');
    btnVoz.disabled = false;
  }

  btnVoz.addEventListener('click', iniciarRonda);
});
