document.addEventListener("DOMContentLoaded", () => {
  const cuerpoTabla = document.getElementById("cuerpo-tabla");
  const tabla = document.getElementById("tabla-puntos");

  // Ranking setup
  const rankingContainer = document.createElement("div");
  rankingContainer.className = "ranking";
  rankingContainer.innerHTML = "<h3>Ranking en vivo</h3><ol id='ranking-list'></ol>";
  tabla.parentNode.appendChild(rankingContainer);

  let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];

  function generarRondas() {
    const nJugadores = jugadores.length;
    // Asume un juego de baraja de 40 cartas
    const maxCartas = Math.floor(40 / nJugadores) || 1;

    let rondas = [];
    
    // Rondas Ascendentes
    for (let i = 1; i <= maxCartas; i++) {
      // Repetir el 1 (nJugadores veces)
      const rep = (i === 1) ? nJugadores : 1;
      for (let r = 0; r < rep; r++) rondas.push(i);
    }
    
    // Rondas Descendentes
    for (let i = maxCartas; i >= 1; i--) {
        // Repetir maxCartas y 1 (nJugadores veces)
        const rep = (i === maxCartas || i === 1) ? nJugadores : 1;
        for (let r = 0; r < rep; r++) rondas.push(i);
    }

    // Retorna una lista única y secuencial de todas las rondas del juego
    return { todas: rondas, maxCartas: maxCartas };
  }

  let rondasActuales = generarRondas();

  function inicializarTabla() {
    cuerpoTabla.innerHTML = "";
    const thead = tabla.tHead;
    thead.innerHTML = "";

    if (jugadores.length === 0) return;
    
    // ------------------------------------------
    // MODIFICACIÓN: CABECERA DE DOS NIVELES
    // ------------------------------------------
    const numRondas = rondasActuales.todas.length;

    // Fila 1: "Jugador" (rowspan 2), "NUMERO DE CARTAS" (colspan N), "Total" (rowspan 2)
    const trRondasPrincipal = document.createElement("tr");

    // Columna Jugador (ocupa dos filas)
    let thJugador = document.createElement("th");
    thJugador.textContent = "Jugador";
    thJugador.setAttribute("rowspan", "2");
    trRondasPrincipal.appendChild(thJugador);

    // Columna "NUMERO DE CARTAS" (ocupa todas las columnas de rondas)
    let thCartas = document.createElement("th");
    thCartas.textContent = "NUMERO DE CARTAS";
    thCartas.setAttribute("colspan", numRondas);
    trRondasPrincipal.appendChild(thCartas);

    // Columna Total (ocupa dos filas)
    let thTotal = document.createElement("th");
    thTotal.textContent = "Total";
    thTotal.setAttribute("rowspan", "2");
    trRondasPrincipal.appendChild(thTotal);
    
    thead.appendChild(trRondasPrincipal);

    // Fila 2: Números de las rondas (1, 1, 1, 2, 3...)
    const trRondasSecundaria = document.createElement("tr");
    rondasActuales.todas.forEach((nCartas, index) => {
      const th = document.createElement("th");
      // Muestra solo el número de cartas
      th.textContent = nCartas; 
      trRondasSecundaria.appendChild(th);
    });
    thead.appendChild(trRondasSecundaria);
    // ------------------------------------------

    // FILAS DE JUGADORES
    jugadores.forEach(nombre => {
      const tr = document.createElement("tr");

      // Celda de nombre
      const tdNombre = document.createElement("td");
      tdNombre.textContent = nombre;
      tdNombre.classList.add("jugador");
      tr.appendChild(tdNombre);

      // Celdas de puntuación por ronda
      rondasActuales.todas.forEach((_, index) => {
        const td = document.createElement("td");
        td.className = `ronda-${index}`;
        td.contentEditable = "true";
        td.addEventListener("input", manejarInputCelda);
        tr.appendChild(td);
      });

      // Celda de total
      const tdTotal = document.createElement("td");
      tdTotal.textContent = "0";
      tdTotal.classList.add("total");
      tr.appendChild(tdTotal);

      cuerpoTabla.appendChild(tr);
    });

    cargarPuntuaciones();
    calcularPuntuaciones();
    actualizarRanking();
  }
  
  function guardarPuntuaciones() {
    const data = {};
    Array.from(cuerpoTabla.rows).forEach(row => {
      const nombre = row.cells[0].textContent;
      const puntos = [];
      for (let i = 1; i < row.cells.length - 1; i++) {
        puntos.push(row.cells[i].textContent);
      }
      data[nombre] = puntos;
    });
    localStorage.setItem("puntuacionesPocha", JSON.stringify(data));
  }

  function cargarPuntuaciones() {
    const data = JSON.parse(localStorage.getItem("puntuacionesPocha")) || {};
    Array.from(cuerpoTabla.rows).forEach(row => {
      const nombre = row.cells[0].textContent;
      const puntos = data[nombre] || [];
      for (let i = 0; i < puntos.length && i < row.cells.length - 2; i++) {
        row.cells[i + 1].textContent = puntos[i];
      }
    });
    calcularPuntuaciones();
  }

  function manejarInputCelda(e) {
    const cell = e.target;
    // Permite números y el signo menos (-) para puntuaciones negativas
    cell.textContent = cell.textContent.replace(/[^0-9-]/g, "");

    guardarPuntuaciones();
    calcularPuntuaciones();
    actualizarRanking();
  }

  function calcularPuntuaciones() {
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

    const datos = Array.from(cuerpoTabla.rows).map(row => {
      const nombre = row.cells[0].textContent;
      const puntos = parseInt(row.querySelector(".total").textContent || 0);
      return { nombre, puntos };
    });
    
    datos.sort((a, b) => b.puntos - a.puntos);

    datos.forEach((jug, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${jug.nombre} → ${jug.puntos}`;
      rankingList.appendChild(li);
    });
  }

  window.limpiarPuntuaciones = function() {
    if(!confirm("¿Estás seguro de que quieres borrar todas las puntuaciones?")) return;
    
    Array.from(cuerpoTabla.rows).forEach(row => {
      for (let i = 1; i < row.cells.length - 1; i++) row.cells[i].textContent = "";
      row.querySelector(".total").textContent = 0;
    });
    guardarPuntuaciones();
    actualizarRanking();
  }
  
  window.agregarJugador = function() {
    const nombre = prompt("Introduce el nombre del nuevo jugador:");
    if (nombre && !jugadores.includes(nombre)) {
      jugadores.push(nombre);
      localStorage.setItem("jugadores", JSON.stringify(jugadores));
      inicializarTabla();
    }
  }

  // Inicializar al cargar la página
  inicializarTabla();
});