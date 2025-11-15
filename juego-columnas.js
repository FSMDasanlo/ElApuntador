/**
 * juego-columnas.js
 * Lógica genérica para juegos de puntuación por columnas (Dominó, Avaricioso, etc.)
 * 
 * @param {object} config - Objeto de configuración.
 * @param {string} config.idTabla - ID de la tabla de puntos.
 * @param {string} config.idFilaTotales - ID de la fila de totales.
 * @param {string} config.idFilaNombres - ID de la fila de nombres.
 * @param {string} config.idCuerpoTabla - ID del tbody de la tabla.
 * @param {string} config.idMetaPuntos - ID del input para la meta de puntos.
 * @param {string} config.idBtnAyuda - ID del botón de ayuda.
 * @param {string} config.idModalAyuda - ID del modal de ayuda.
 * @param {number} [config.filasIniciales=10] - Número de filas a crear al inicio.
 * @param {boolean} [config.ganaMenosPuntos=false] - Si true, el ranking ordena de menor a mayor.
 */
function inicializarJuegoColumnas(config) {
    const tabla = document.getElementById(config.idTabla);
    const filaTotales = document.getElementById(config.idFilaTotales);
    const filaNombres = document.getElementById(config.idFilaNombres);
    const cuerpoTabla = document.getElementById(config.idCuerpoTabla);
    const metaInput = document.getElementById(config.idMetaPuntos);

    const rankingContainer = document.createElement("div");
    rankingContainer.className = "ranking";
    rankingContainer.innerHTML = "<h3>Ranking en vivo</h3><ol id='ranking-list'></ol>";
    tabla.parentNode.appendChild(rankingContainer);

    let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];
    let historialPuntuaciones = [];

    // ===== Modal de ayuda =====
    const btnAyuda = document.getElementById(config.idBtnAyuda);
    const modal = document.getElementById(config.idModalAyuda);
    const spanCerrar = modal.querySelector(".cerrar");

    btnAyuda.addEventListener("click", () => modal.style.display = "block");
    spanCerrar.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    // -------------------- FUNCIONES --------------------

    window.agregarFila = function() {
      const tr = document.createElement("tr");
      jugadores.forEach(() => {
        const td = document.createElement("td");
        td.contentEditable = "true";
        td.addEventListener('focus', (e) => { e.target.dataset.valorAnterior = e.target.textContent; });
        td.addEventListener("input", () => {
          actualizarTotales();
          actualizarRanking();
        });
        td.addEventListener("keypress", e => {
          if (e.key === "Enter") {
            e.preventDefault();
            saltarSiguienteCelda(td);
          }
        });
        tr.appendChild(td);
      });
      cuerpoTabla.appendChild(tr);
    };

    function inicializarTabla() {
      if (!cuerpoTabla) return;
      filaTotales.innerHTML = "";
      jugadores.forEach(() => filaTotales.appendChild(document.createElement("th")).textContent = 0);
      filaNombres.innerHTML = "";
      jugadores.forEach(nombre => {
        const th = document.createElement("th");
        // Creamos la estructura con spans para poder estilizar el ranking
        const spanRank = document.createElement('span');
        spanRank.className = 'rank-prefix-col'; // Clase específica para juegos de columna
        const spanName = document.createElement('span');
        spanName.textContent = nombre;
        th.append(spanRank, spanName);
        filaNombres.appendChild(th);
      });
      cuerpoTabla.innerHTML = "";
      for (let i = 0; i < (config.filasIniciales || 10); i++) {
        window.agregarFila();
      }
    }

    function actualizarTotales() {
      const totales = jugadores.map((_, colIdx) => {
        let suma = 0;
        Array.from(cuerpoTabla.rows).forEach(row => {
          const val = parseInt(row.cells[colIdx].textContent || 0);
          if (!isNaN(val)) suma += val;
        });
        return suma;
      });
      Array.from(filaTotales.cells).forEach((cell, idx) => cell.textContent = totales[idx]);
    }

    function actualizarRanking() {
      const rankingList = document.getElementById("ranking-list");
      if (!rankingList) return;
      rankingList.innerHTML = "";

      const totales = Array.from(filaTotales.cells).map(cell => parseInt(cell.textContent || 0));
      const maxTotal = Math.max(...totales);
      const minTotal = Math.min(...totales);

      Array.from(filaTotales.cells).forEach((cell, idx) => {
        cell.removeAttribute("maximo");
        cell.removeAttribute("minimo");
        if (totales[idx] === maxTotal) cell.setAttribute("maximo", "");
        else if (totales[idx] === minTotal) cell.setAttribute("minimo", "");
      });

      let ranking = jugadores.map((nombre, i) => ({ nombre, puntos: totales[i] }));
      ranking.sort((a, b) => config.ganaMenosPuntos ? a.puntos - b.puntos : b.puntos - a.puntos);

      ranking.forEach((jug, idx) => {
        const li = document.createElement("li");
        li.textContent = `${idx + 1}. ${jug.nombre} → ${jug.puntos}`;
        rankingList.appendChild(li);
      });

      // --- ¡LA MALDAD! (Versión para juegos de columnas) ---
      // 1. Creamos un mapa para buscar la posición de cada jugador.
      const rankMap = new Map();
      let lastScore = config.ganaMenosPuntos ? Infinity : -Infinity;
      let currentRank = 0;
      ranking.forEach((jugador, index) => {
        if (jugador.puntos !== lastScore) {
          currentRank = index + 1;
        }
        rankMap.set(jugador.nombre, `${currentRank}º`);
        lastScore = jugador.puntos;
      });

      // 2. Actualizamos el contenido de los `th` en la fila de nombres.
      Array.from(filaNombres.cells).forEach((th, index) => {
        const nombreOriginal = jugadores[index];
        th.querySelector('.rank-prefix-col').textContent = rankMap.get(nombreOriginal) || '';
      });
    }

    function saltarSiguienteCelda(td) {
      const row = td.parentElement;
      const index = Array.from(row.cells).indexOf(td);
      let nextRow = row.nextElementSibling;
      if (!nextRow) {
        window.agregarFila();
        nextRow = cuerpoTabla.lastElementChild;
      }
      nextRow.cells[index].focus();
    }

    window.limpiarPuntuaciones = function() {
      if (confirm("¿Estás seguro de que quieres borrar TODAS las puntuaciones?")) {
        Array.from(cuerpoTabla.rows).forEach(row => {
          Array.from(row.cells).forEach(cell => cell.textContent = "");
        });
        actualizarTotales();
        actualizarRanking();
      }
    };

    // ===== INTEGRACIÓN CON VOZ =====
    window.actualizarPuntosPorVoz = function(nombreJugador, puntos) {
      const jugadorIndex = jugadores.findIndex(j => j.toLowerCase() === nombreJugador.toLowerCase());
      if (jugadorIndex === -1) {
        console.warn(`Jugador "${nombreJugador}" no encontrado.`);
        return;
      }

      let celdaParaActualizar = null;
      for (const fila of Array.from(cuerpoTabla.rows)) {
        const celda = fila.cells[jugadorIndex];
        if (celda && celda.textContent.trim() === "") {
          celdaParaActualizar = celda;
          break;
        }
      }

      if (!celdaParaActualizar) {
        window.agregarFila();
        celdaParaActualizar = cuerpoTabla.lastElementChild.cells[jugadorIndex];
      }

      if (celdaParaActualizar) {
        historialPuntuaciones.push({
          celda: celdaParaActualizar,
          valorAnterior: celdaParaActualizar.textContent
        });
        celdaParaActualizar.textContent = puntos;
        celdaParaActualizar.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    window.deshacerUltimaPuntuacion = function() {
      if (historialPuntuaciones.length === 0) {
        alert("No hay ninguna puntuación reciente introducida por voz para deshacer.");
        return;
      }
      const ultimaAccion = historialPuntuaciones.pop();
      if (ultimaAccion && ultimaAccion.celda) {
        ultimaAccion.celda.textContent = ultimaAccion.valorAnterior;
        ultimaAccion.celda.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    // -------------------- INICIALIZACIÓN --------------------
    inicializarTabla();
    actualizarTotales();
    actualizarRanking();

    if (metaInput) {
        metaInput.addEventListener("change", actualizarRanking);
    }
}