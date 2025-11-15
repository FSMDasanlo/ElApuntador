document.addEventListener("DOMContentLoaded", () => {
  const cuerpoTabla = document.getElementById("cuerpo-tabla");
  const cabecera = document.getElementById("cabecera-cartas");

  // Recuperar jugadores (por defecto 3)
  let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [
    "Jugador 1",
    "Jugador 2",
    "Jugador 3",
  ];

  const numCartas = Math.floor(40 / jugadores.length);

  // ==================== Cabecera ====================
  function generarCabecera() {
    cabecera.innerHTML = "";

    // Fila 1: Número de Cartas
    const trTitulo = document.createElement("tr");
    const thTitulo = document.createElement("th");
    thTitulo.colSpan = 1 + (numCartas - 2 + jugadores.length * 2) + 1; // Jugador + puntuaciones + Total
    thTitulo.textContent = "Número de Cartas";
    thTitulo.style.textAlign = "center";
    thTitulo.style.fontWeight = "bold";
    thTitulo.style.fontSize = "1.1rem";
    trTitulo.appendChild(thTitulo);
    cabecera.appendChild(trTitulo);

    // Fila 2: números
    const trNums = document.createElement("tr");
    const thJugador = document.createElement("th");
    thJugador.textContent = "Jugador";
    trNums.appendChild(thJugador);

    // Repetir primera carta
    for (let i = 0; i < jugadores.length; i++) {
      const th = document.createElement("th");
      th.textContent = 1;
      trNums.appendChild(th);
    }

    // Números intermedios
    for (let i = 2; i < numCartas; i++) {
      const th = document.createElement("th");
      th.textContent = i;
      trNums.appendChild(th);
    }

    // Repetir última carta
    for (let i = 0; i < jugadores.length; i++) {
      const th = document.createElement("th");
      th.textContent = numCartas;
      trNums.appendChild(th);
    }

    // Total
    const thTotal = document.createElement("th");
    thTotal.textContent = "Total";
    trNums.appendChild(thTotal);

    cabecera.appendChild(trNums);
  }

  // ==================== Filas ====================
  function generarFilas() {
    cuerpoTabla.innerHTML = "";

    const totalCeldas = numCartas - 2 + jugadores.length * 2; // solo celdas puntuación

    // Fase Ascendente
    jugadores.forEach((nombre) => {
      const tr = document.createElement("tr");
      const tdNombre = document.createElement("td");
      tdNombre.textContent = nombre;
      tr.appendChild(tdNombre);

      for (let i = 0; i < totalCeldas; i++) {
        const td = document.createElement("td");
        td.contentEditable = "true";
        td.addEventListener("input", actualizarTotalesYRaking);
        tr.appendChild(td);
      }

      const tdTotal = document.createElement("td");
      tdTotal.textContent = "0";
      tr.appendChild(tdTotal);

      cuerpoTabla.appendChild(tr);
    });

    // Fila separadora
    const trSep = document.createElement("tr");
    trSep.classList.add("fila-separadora");
    const tdSep = document.createElement("td");
    tdSep.colSpan = 1 + totalCeldas + 1;
    tdSep.textContent = "— MODO DESCENDENTE —";
    trSep.appendChild(tdSep);
    cuerpoTabla.appendChild(trSep);

    // Fase Descendente
    jugadores.forEach((nombre) => {
      const tr = document.createElement("tr");
      tr.classList.add("fila-desc");

      const tdNombre = document.createElement("td");
      tdNombre.textContent = nombre;
      tr.appendChild(tdNombre);

      for (let i = 0; i < totalCeldas; i++) {
        const td = document.createElement("td");
        td.contentEditable = "true";
        td.addEventListener("input", actualizarTotalesYRaking);
        tr.appendChild(td);
      }

      const tdTotal = document.createElement("td");
      tdTotal.textContent = "0";
      tr.appendChild(tdTotal);

      cuerpoTabla.appendChild(tr);
    });
  }

  // ==================== Totales + Ranking ====================
  function actualizarTotalesYRaking() {
    const filas = Array.from(cuerpoTabla.querySelectorAll("tr")).filter(
      (tr) => !tr.classList.contains("fila-separadora")
    );

    const totales = jugadores.map(() => 0);

    filas.forEach((tr) => {
      const tds = Array.from(tr.querySelectorAll("td"));
      const nombre = tds[0].textContent;
      let total = 0;
      for (let i = 1; i < tds.length - 1; i++) {
        const val = parseInt(tds[i].textContent || 0);
        if (!isNaN(val)) total += val;
      }
      tds[tds.length - 1].textContent = total;

      const idx = jugadores.indexOf(nombre);
      if (idx !== -1) totales[idx] += total;
    });

    // Ranking
    let rankingList = document.getElementById("ranking-list");
    if (!rankingList) {
      rankingList = document.createElement("ol");
      rankingList.id = "ranking-list";
      const rankingDiv = document.createElement("div");
      rankingDiv.className = "ranking";
      const h3 = document.createElement("h3");
      h3.textContent = "Ranking en vivo";
      rankingDiv.appendChild(h3);
      rankingDiv.appendChild(rankingList);
      document.querySelector(".tabla").appendChild(rankingDiv);
    }
    rankingList.innerHTML = "";

    let ranking = jugadores.map((nombre, i) => ({ nombre, puntos: totales[i] }));
    ranking.sort((a, b) => b.puntos - a.puntos);

    ranking.forEach((jug, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${jug.nombre} → ${jug.puntos}`;
      rankingList.appendChild(li);
    });
  }

  // ==================== Inicialización ====================
  generarCabecera();
  generarFilas();
  actualizarTotalesYRaking();

  // ==================== Limpiar ====================
  window.limpiarPuntuaciones = () => {
    cuerpoTabla.querySelectorAll("td").forEach((td) => {
      if (!td.parentElement.classList.contains("fila-separadora") && td.cellIndex !== 0 && td.cellIndex !== td.parentElement.cells.length - 1) {
        td.textContent = "";
      }
    });
    actualizarTotalesYRaking();
  };

  // ==================== Modal ====================
  const modal = document.getElementById("modal-ayuda");
  const btnAyuda = document.getElementById("btn-ayuda");
  const cerrar = document.querySelector(".cerrar");

  btnAyuda.addEventListener("click", () => (modal.style.display = "block"));
  cerrar.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
});
