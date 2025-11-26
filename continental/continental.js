// La variable 'jugadores' ahora es declarada por jugadores.js, que se carga primero.
const numJugadas = 7; // Hay 7 rondas, de 7 a 13 cartas. 
let historialPuntuaciones = []; // Para la función de deshacer
/**
 * ¡SOLUCIÓN DEFINITIVA!
 * Unificamos toda la lógica de inicialización en 'DOMContentLoaded'.
 * Esto evita condiciones de carrera entre 'load' y 'DOMContentLoaded'.
 */
window.addEventListener('DOMContentLoaded', () => {
  // ¡SOLUCIÓN! Leemos desde la clave global correcta usando la función de jugadores.js
  const claveJugadores = getClaveLocalStorage(); // Esto devolverá 'jugadores_global'
  const nombresGuardados = JSON.parse(localStorage.getItem(claveJugadores)) || [];
  const puntuacionesGuardadas = JSON.parse(localStorage.getItem('continentalPuntuaciones'));

  // Fusionamos nombres y puntuaciones para asegurar la sincronización
  jugadores = nombresGuardados.map(nombre => {
    const jugadorPrevio = puntuacionesGuardadas ? puntuacionesGuardadas.find(j => j.nombre === nombre) : null;
    return {
      nombre,
      puntos: jugadorPrevio
        ? jugadorPrevio.puntos.slice(0, numJugadas).concat(Array(Math.max(0, numJugadas - jugadorPrevio.puntos.length)).fill(0))
        : Array(numJugadas).fill(0)
    };
  });

  guardarPuntuaciones(); // Guardamos la lista sincronizada

  // ¡SOLUCIÓN! Hacemos la lista de jugadores (solo los nombres) accesible globalmente
  // para que el sistema de voz pueda usarla de forma segura.
  window.listaJugadoresParaVoz = nombresGuardados;

  actualizarTabla(); // Ahora dibujamos la tabla con los datos correctos.
});

function actualizarTabla() {
  const tablaBody = document.querySelector('#tabla-puntos tbody');
  tablaBody.innerHTML = "";
  const rankMap = obtenerMapaDeRanking();

  jugadores.forEach((jugador, i) => { // i es el índice de la fila (jugador)
    const row = document.createElement('tr');

    const tdNombre = document.createElement('td');
    // --- ¡LA MALDAD! (Parte JS) ---
    // Creamos spans separados para el ranking y el nombre para poder estilizarlos.
    const rankPrefix = rankMap.get(jugador.nombre) || '';
    const rankNumber = rankPrefix ? parseInt(rankPrefix) : 0;
    const spanRank = document.createElement('span');
    spanRank.className = 'rank-prefix';
    spanRank.textContent = rankPrefix;

    const spanName = document.createElement('span');
    spanName.className = 'rank-name';
    spanName.textContent = jugador.nombre;

    if (rankNumber > 0 && rankNumber <= 3) {
      spanRank.classList.add(`rank-${rankNumber}`);
    }

    tdNombre.appendChild(spanRank);
    tdNombre.appendChild(spanName);
    row.appendChild(tdNombre);

    jugador.puntos.forEach((valor, j) => { // j es el índice de la columna (jugada)
      const td = document.createElement('td');
      td.contentEditable = "true";
      td.textContent = valor === 0 ? "" : valor;

      td.addEventListener('focus', (e) => {
        if (td.textContent === "0") td.textContent = "";
        // Guardamos el estado previo para el deshacer manual
        e.target.dataset.valorAnterior = e.target.textContent;
      });
      td.addEventListener('input', () => {
        let val = parseInt(td.textContent);
        if (isNaN(val)) val = 0;

        // Guardamos la acción en el historial para poder deshacerla
        const valorAnterior = td.dataset.valorAnterior || "";
        if (td.textContent !== valorAnterior) {
          historialPuntuaciones.push({ celda: td, valorAnterior });
        }
        jugador.puntos[j] = val;
        actualizarTotal(row, jugador);
        colorearTotales();
        actualizarNombresConRanking(); // ¡LA SOLUCIÓN! Refresca los nombres con el ranking.
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
  resaltarPodio();
}

/**
 * Calcula el ranking actual y devuelve un mapa con la posición de cada jugador.
 * @returns {Map<string, string>} Un mapa donde la clave es el nombre y el valor es el prefijo del ranking (ej: "1º").
 */
function obtenerMapaDeRanking() {
  const jugadoresConTotal = jugadores.map(j => ({ ...j, total: calcularTotal(j) }));
  jugadoresConTotal.sort((a, b) => a.total - b.total);

  const rankMap = new Map();
  let lastScore = -1;
  let currentRank = 0;
  jugadoresConTotal.forEach((jugador, index) => {
    if (jugador.total !== lastScore) {
      currentRank = index + 1;
    }
    rankMap.set(jugador.nombre, `${currentRank}º`);
    lastScore = jugador.total;
  });
  return rankMap;
}

/**
 * Actualiza el texto de la primera columna de cada fila con el ranking actual.
 */
function actualizarNombresConRanking() {
  const rankMap = obtenerMapaDeRanking();
  const filas = document.querySelectorAll('#tabla-puntos tbody tr');
  filas.forEach((fila, index) => {
    const tdNombre = fila.cells[0];
    tdNombre.innerHTML = ''; // Limpiamos la celda

    const nombreOriginal = jugadores[index].nombre;
    const rankPrefix = rankMap.get(nombreOriginal) || '';
    const rankNumber = rankPrefix ? parseInt(rankPrefix) : 0;

    const spanRank = document.createElement('span');
    spanRank.className = 'rank-prefix';
    spanRank.textContent = rankPrefix ? `${rankPrefix} ` : ''; // Añadimos el espacio aquí

    if (rankNumber > 0 && rankNumber <= 3) {
      spanRank.classList.add(`rank-${rankNumber}`);
    }

    const spanName = document.createElement('span');
    spanName.className = 'rank-name';
    spanName.textContent = nombreOriginal;

    tdNombre.appendChild(spanRank);
    tdNombre.appendChild(spanName);
  });
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

window.limpiarPuntuaciones = function() {
  if (confirm("¿Estás seguro de que quieres borrar TODAS las puntuaciones?")) {
    jugadores.forEach(jugador => {
      jugador.puntos = Array(numJugadas).fill(0);
    });
    guardarPuntuaciones();
    actualizarTabla();
  }
};

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

// =======================================================
// ===== INTEGRACIÓN CON VOZ (COMO EN POCHA.JS) =====
// =======================================================

/**
 * Actualiza la puntuación desde la entrada de voz.
 * Busca la primera celda vacía para un jugador y le asigna los puntos.
 * @param {string} nombreJugador El nombre del jugador reconocido.
 * @param {number} puntos Los puntos reconocidos.
 */
window.actualizarPuntosPorVoz = function(nombreJugador, puntos) {
  // 1. Encontrar la primera columna (jugada) que tenga al menos una celda vacía.
  let colActual = -1;
  const filas = Array.from(document.querySelectorAll('#tabla-puntos tbody tr'));

  for (let j = 0; j < numJugadas; j++) {
    // Buscamos si alguna celda en esta columna está vacía
    const algunaCeldaVacia = filas.some(fila => {
      const celda = fila.querySelector(`td:nth-child(${j + 2})`);
      return celda && celda.textContent.trim() === '';
    });

    if (algunaCeldaVacia) {
      colActual = j;
      break; // Encontramos la primera jugada incompleta
    }
  }

  if (colActual === -1) {
    console.warn("El juego ha terminado. No hay rondas vacías.");
    return;
  }

  // 2. Buscar la celda específica para el jugador en esa columna.
  const jugadorIndex = jugadores.findIndex(j => j.nombre.toLowerCase() === nombreJugador.toLowerCase());
  if (jugadorIndex === -1) {
    console.warn(`Jugador "${nombreJugador}" no encontrado.`);
    return;
  }

  const filaJugador = filas[jugadorIndex];
  const celdaParaActualizar = filaJugador.querySelector(`td:nth-child(${colActual + 2})`);

  if (celdaParaActualizar && celdaParaActualizar.textContent.trim() === '') {
    // Guardamos la acción en el historial para poder deshacerla
    historialPuntuaciones.push({
      celda: celdaParaActualizar,
      valorAnterior: celdaParaActualizar.textContent
    });

    celdaParaActualizar.textContent = puntos;
    // Disparamos el evento 'input' para que se actualice todo
    celdaParaActualizar.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    console.warn(`La celda para ${nombreJugador} en la jugada actual ya está llena o no se encontró.`);
  }
};

/**
 * Deshace la última puntuación introducida.
 */
window.deshacerUltimaPuntuacion = function() {
  if (historialPuntuaciones.length === 0) {
    console.warn("No hay acciones para deshacer.");
    alert("No hay ninguna puntuación reciente para deshacer.");
    return;
  }

  const ultimaAccion = historialPuntuaciones.pop();
  if (ultimaAccion && ultimaAccion.celda) {
    ultimaAccion.celda.textContent = ultimaAccion.valorAnterior;
    // Disparamos el evento 'input' para que se recalcule todo
    ultimaAccion.celda.dispatchEvent(new Event('input', { bubbles: true }));
    console.log("Última puntuación deshecha.");
  }
};

/**
 * ¡NUEVO! Proporciona el ranking actual al sistema de voz.
 * @returns {Array<{nombre: string, puntos: number}>} Un array con los jugadores ordenados.
 */
window.obtenerRankingParaVoz = function() {
  const jugadoresConTotal = jugadores.map(j => ({ ...j, total: calcularTotal(j) }));
  // En Continental, menos puntos es mejor.
  jugadoresConTotal.sort((a, b) => a.total - b.total);

  return jugadoresConTotal.map(j => ({ nombre: j.nombre, puntos: j.total }));
};
