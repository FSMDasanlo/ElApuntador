let jugadores = [];
const numJugadas = 6; // MODIFICACIÓN 1: Se reduce de 7 a 6 jugadas

window.addEventListener('DOMContentLoaded', () => {
  const nombresGuardados = JSON.parse(localStorage.getItem('jugadores')) || [];
  jugadores = nombresGuardados.map(nombre => ({
    nombre: nombre,
    puntos: Array(numJugadas).fill(0)
  }));
  actualizarTabla();
});

function actualizarTabla() {
  const tablaBody = document.querySelector('#tabla-puntos tbody');
  tablaBody.innerHTML = "";

  jugadores.forEach((jugador, i) => { // i es el índice de la fila (jugador)
    const row = document.createElement('tr');

    const tdNombre = document.createElement('td');
    tdNombre.textContent = jugador.nombre;
    row.appendChild(tdNombre);

    jugador.puntos.forEach((valor, j) => { // j es el índice de la columna (jugada)
      const td = document.createElement('td');
      td.contentEditable = "true";
      td.textContent = valor === 0 ? "" : valor;

      td.addEventListener('focus', () => { if (td.textContent === "0") td.textContent = ""; });
      td.addEventListener('input', () => {
        let val = parseInt(td.textContent);
        if (isNaN(val)) val = 0;
        jugador.puntos[j] = val;
        actualizarTotal(row, jugador);
        colorearTotales();
        actualizarRanking();
        resaltarPodio();
      });

      // Navegación con ENTER
      td.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();

          const allRows = Array.from(document.querySelectorAll('#tabla-puntos tbody tr'));
          const nextRowIndex = i + 1;

          if (nextRowIndex < allRows.length) {
            const nextRow = allRows[nextRowIndex];
            const nextCell = nextRow.querySelector(`td:nth-child(${j + 2})[contenteditable="true"]`);
            if (nextCell) nextCell.focus();
          }
        }
      });

      row.appendChild(td);
    });

    const tdTotal = document.createElement('td');
    tdTotal.classList.add('total');
    tdTotal.textContent = calcularTotal(jugador);
    row.appendChild(tdTotal);

    tablaBody.appendChild(row);
  });

  colorearTotales();
  actualizarRanking();
  resaltarPodio();
}

function calcularTotal(jugador) {
  return jugador.puntos.reduce((acc, val) => acc + val, 0);
}

function actualizarTotal(row, jugador) {
  const total = calcularTotal(jugador);
  const tdTotal = row.querySelector('.total');
  tdTotal.textContent = total;
  guardarPuntuaciones();
}

function guardarPuntuaciones() {
  localStorage.setItem('continentalPuntuaciones', JSON.stringify(jugadores));
}

function limpiarPuntuaciones() {
  if (confirm("¿Estás seguro de que quieres borrar TODAS las puntuaciones?")) {
    jugadores.forEach(jugador => {
      jugador.puntos = Array(numJugadas).fill(0);
    });
    guardarPuntuaciones();
    actualizarTabla();
  }
}

/* ✅ Sincronización NOMBRES ↔ PUNTUACIONES */
window.addEventListener('load', () => {
  const nombresGuardados = JSON.parse(localStorage.getItem('jugadores')) || [];
  const puntuacionesGuardadas = JSON.parse(localStorage.getItem('continentalPuntuaciones'));

  if (!puntuacionesGuardadas) {
      // No había puntuaciones, iniciar todo a cero
      jugadores = nombresGuardados.map(nombre => ({
          nombre,
          puntos: Array(numJugadas).fill(0)
      }));
      guardarPuntuaciones();
  } else {
      // Fusionar nombres y puntuaciones (mantener nuevos y borrar eliminados)
      jugadores = nombresGuardados.map(nombre => {
          const jugadorPrevio = puntuacionesGuardadas.find(j => j.nombre === nombre);
          return {
              nombre,
              puntos: jugadorPrevio
                  ? jugadorPrevio.puntos.slice(0, numJugadas).concat(
                      Array(Math.max(0, numJugadas - jugadorPrevio.puntos.length)).fill(0)
                    )
                  : Array(numJugadas).fill(0)
          };
      });
      guardarPuntuaciones(); // Limpia jugadores eliminados
  }

  actualizarTabla();
});

function colorearTotales() {
  const totales = Array.from(document.querySelectorAll('#tabla-puntos tbody .total'));
  if (totales.length === 0) return;

  const valores = totales.map(td => parseInt(td.textContent)).filter(val => !isNaN(val));

  if (valores.length === 0) return;

  const max = Math.max(...valores);
  const min = Math.min(...valores);

  totales.forEach(td => {
    td.removeAttribute('maximo');
    td.removeAttribute('minimo');
    if (max !== min) {
      if (td.textContent == max) td.setAttribute('maximo', '');
      else if (td.textContent == min) td.setAttribute('minimo', '');
    }
  });
}

function actualizarRanking() {
  const rankingDiv = document.getElementById('ranking-vivo');
  if (!rankingDiv) return;

  const sorted = [...jugadores].sort((a,b)=>calcularTotal(a)-calcularTotal(b));
  let html = "<h3>Ranking en vivo</h3><ol>";

  const limit = Math.min(3, sorted.length);
  for(let i = 0; i < limit; i++){
    let medal='';
    if(i===0) medal='🥇 ';
    else if(i===1) medal='🥈 ';
    else if(i===2) medal='🥉 ';
    html += `<li>${medal}${sorted[i].nombre} — ${calcularTotal(sorted[i])} puntos</li>`;
  }
  html += "</ol>";
  rankingDiv.innerHTML = html;
}

function resaltarPodio(){
  const rows = Array.from(document.querySelectorAll('#tabla-puntos tbody tr'));
  rows.forEach(row=>row.classList.remove('top1','top2','top3'));

  const sorted = rows.slice().sort((a,b)=>{
      const totalA = parseInt(a.querySelector('.total').textContent);
      const totalB = parseInt(b.querySelector('.total').textContent);
      return totalA - totalB;
  });

  if(sorted.length > 0) sorted[0].classList.add('top1');
  if(sorted.length > 1) sorted[1].classList.add('top2');
  if(sorted.length > 2) sorted[2].classList.add('top3');
}
