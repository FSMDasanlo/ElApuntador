document.addEventListener("DOMContentLoaded", () => {
  const cuerpoTabla = document.getElementById("cuerpo-tabla");
  const tabla = document.getElementById("tabla-puntos");

  // Ranking
  const rankingContainer = document.createElement("div");
  rankingContainer.className = "ranking";
  rankingContainer.innerHTML = "<h3>Ranking en vivo</h3><ol id='ranking-list'></ol>";
  tabla.parentNode.appendChild(rankingContainer);

  let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];

  function generarRondas() {
    const nJugadores = jugadores.length;
    const maxCartas = Math.floor(40 / nJugadores) || 1;

    const ascendente = [];
    const descendente = [];

    // Ascendente con repetición de la primera carta
    for (let i = 1; i <= maxCartas; i++) {
      const rep = (i === 1) ? nJugadores : 1;
      for (let r = 0; r < rep; r++) ascendente.push(i);
    }

    // Descendente con repetición de la última carta
    for (let i = maxCartas; i >= 1; i--) {
      const rep = (i === maxCartas || i === 1) ? nJugadores : 1;
      for (let r = 0; r < rep; r++) descendente.push(i);
    }

    return { ascendente, descendente, maxCartas };
  }

  function inicializarTabla() {
    cuerpoTabla.innerHTML = "";

    const { ascendente, descendente, maxCartas } = generarRondas();
    const rondasMax = Math.max(ascendente.length, descendente.length);

    // Encabezado de 2 filas
    const thead = tabla.querySelector("thead");
    thead.innerHTML = "";

    // Fila 1: "Número de cartas"
    const filaNumCartas = document.createElement("tr");
    filaNumCartas.appendChild(document.createElement("th")).textContent = "Jugador";
    const thNumCartas = document.createElement("th");
    thNumCartas.setAttribute("colspan", rondasMax);
    thNumCartas.textContent = "Número de cartas";
    filaNumCartas.appendChild(thNumCartas);
    filaNumCartas.appendChild(document.createElement("th")).textContent = "Total";
    thead.appendChild(filaNumCartas);

    // Fila 2: números de carta
    const filaCartas = document.createElement("tr");
    filaCartas.appendChild(document.createElement("th")).textContent = "";
    for (let i = 0; i < rondasMax; i++) {
      const td = document.createElement("th");
      let val = ascendente[i] || descendente[i] || "";

      // Si es la primera carta repetida, usar 1; si es la última repetida, usar maxCartas
      if (i < jugadores.length) val = 1;
      if (i >= rondasMax - jugadores.length) val = maxCartas;

      td.textContent = val;
      filaCartas.appendChild(td);
    }
    filaCartas.appendChild(document.createElement("th")).textContent = "";
    thead.appendChild(filaCartas);

    // Filas A/B por jugador
    jugadores.forEach(nombre => {
      // Fila A
      const trA = document.createElement("tr");
      const tdNombreA = document.createElement("td");
      tdNombreA.textContent = nombre;
      tdNombreA.classList.add("jugador");
      trA.appendChild(tdNombreA);

      for (let i = 0; i < rondasMax; i++) {
        const carta = ascendente[i];
        const td = document.createElement("td");
        td.contentEditable = "true";
        td.addEventListener("input", () => {
          actualizarTotales();
          actualizarRanking();
        });
        td.textContent = carta || "";
        trA.appendChild(td);
      }

      const tdTotalA = document.createElement("td");
      tdTotalA.textContent = 0;
      tdTotalA.classList.add("total");
      trA.appendChild(tdTotalA);
      cuerpoTabla.appendChild(trA);

      // Fila B - sombreado completo
      const trB = document.createElement("tr");
      trB.classList.add("fila-b");

      const tdNombreB = document.createElement("td");
      tdNombreB.textContent = nombre ;
      tdNombreB.classList.add("jugador");
      trB.appendChild(tdNombreB);

      for (let i = 0; i < rondasMax; i++) {
        const carta = descendente[i];
        const td = document.createElement("td");
        td.contentEditable = "true";
        td.addEventListener("input", () => {
          actualizarTotales();
          actualizarRanking();
        });
        td.textContent = carta || "";
        trB.appendChild(td);
      }

      const tdTotalB = document.createElement("td");
      tdTotalB.textContent = 0;
      tdTotalB.classList.add("total");
      trB.appendChild(tdTotalB);

      cuerpoTabla.appendChild(trB);
    });

    actualizarTotales();
    actualizarRanking();
  }

  function actualizarTotales() {
    Array.from(cuerpoTabla.rows).forEach(row => {
      let suma = 0;
      for (let i = 1; i < row.cells.length - 1; i++) {
        const val = parseInt(row.cells[i].textContent || 0);
        if (!isNaN(val)) suma += val;
      }
      row.querySelector(".total").textContent = suma;
    });
  }

  function actualizarRanking() {
    const rankingList = document.getElementById("ranking-list");
    rankingList.innerHTML = "";

    const rankingMap = {};
    Array.from(cuerpoTabla.rows).forEach(row => {
      const nombreBase = row.cells[0].textContent.replace(/ [AB]$/, "");
      const puntos = parseInt(row.querySelector(".total").textContent || 0);
      rankingMap[nombreBase] = (rankingMap[nombreBase] || 0) + puntos;
    });

    const datos = Object.entries(rankingMap).map(([nombre, puntos]) => ({ nombre, puntos }));
    datos.sort((a, b) => b.puntos - a.puntos);

    datos.forEach((jug, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${jug.nombre} → ${jug.puntos}`;
      rankingList.appendChild(li);
    });
  }

  window.limpiarPuntuaciones = function() {
    Array.from(cuerpoTabla.rows).forEach(row => {
      for (let i = 1; i < row.cells.length - 1; i++) row.cells[i].textContent = "";
      row.querySelector(".total").textContent = 0;
    });
    actualizarRanking();
  };

  window.agregarJugador = function() {
    const nombre = prompt("Nombre del nuevo jugador:");
    if (nombre) {
      jugadores.push(nombre);
      localStorage.setItem("jugadores", JSON.stringify(jugadores));
      inicializarTabla();
    }
  };

  inicializarTabla();
});
