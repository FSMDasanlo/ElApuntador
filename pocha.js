document.addEventListener("DOMContentLoaded", () => {
  // 1. OBTENER REFERENCIAS A LAS NUEVAS TABLAS
  const cuerpoTablaAsc = document.getElementById("cuerpo-tabla-ascendente");
  const tablaAsc = document.getElementById("tabla-puntos-ascendente");
  const cuerpoTablaDesc = document.getElementById("cuerpo-tabla-descendente");
  const tablaDesc = document.getElementById("tabla-puntos-descendente");

  // El ranking lo vincularemos al contenedor principal del marcador
  const marcador = document.querySelector(".marcador");
  
  // Ranking setup
  const rankingContainer = document.createElement("div");
  rankingContainer.className = "ranking";
  rankingContainer.innerHTML = "<h3>Ranking en vivo</h3><ol id='ranking-list'></ol>";
  
  // Lo añadimos al inicio del contenedor principal del marcador (para el layout grid)
  marcador.prepend(rankingContainer);

  let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];
  
  // ¡NUEVO! Historial para la función de deshacer
  let historialPuntuaciones = [];

  // ¡NUEVO! Guardián para controlar el fin de partida
  let partidaTerminada = false;

  function generarRondas() {
    const nJugadores = jugadores.length;
    // Asume un juego de baraja de 40 cartas
    const maxCartas = Math.floor(40 / nJugadores) || 1;

    let rondasAscendentes = [];
    let rondasDescendentes = [];
    
    // 1. Rondas Ascendentes
    for (let i = 1; i <= maxCartas; i++) {
        let rep = 1;
        
        // Repetir la ronda de 1 carta N veces (al inicio)
        if (i === 1) { 
            rep = nJugadores;
        }
        // Repetir la ronda de MaxCartas N veces (al final del ascenso)
        if (i === maxCartas) {
            rep = nJugadores;
        }
        
        for (let r = 0; r < rep; r++) rondasAscendentes.push(i);
    }
    
    // 2. Rondas Descendentes (El "descenso" entre la ronda Max y el 1)
    // Empieza desde maxCartas - 1 y va hasta 2
    for (let i = maxCartas - 1; i >= 2; i--) {
        rondasDescendentes.push(i);
    }
    
    // 3. Rondas de 1 carta al final (si maxCartas es > 1)
    // Repetir la ronda de 1 carta N veces (al final del juego)
    if (maxCartas > 1) {
        for (let r = 0; r < nJugadores; r++) {
             rondasDescendentes.push(1);
        }
    }
    
    // Retorna un objeto con las dos listas de rondas y la lista total
    return { 
        ascendentes: rondasAscendentes, 
        descendentes: rondasDescendentes,
        todas: rondasAscendentes.concat(rondasDescendentes),
        maxCartas: maxCartas 
    };
  }

  let rondasActuales = generarRondas();

  /**
   * Función auxiliar para inicializar una tabla específica
   * Se incluye la columna Total en ambas tablas.
   */
  function inicializarTabla(tabla, cuerpoTabla, rondas, esTablaAscendente) {
    cuerpoTabla.innerHTML = "";
    const thead = tabla.tHead;
    thead.innerHTML = "";

    // Si no hay jugadores, se detiene aquí y la tabla queda vacía
    if (jugadores.length === 0) return; 
    
    const numRondas = rondas.length;

    // Fila 1: "Jugador" (rowspan 2), "RONDA X" (colspan N), "Total" (rowspan 2)
    const trRondasPrincipal = document.createElement("tr");

    // 1. Columna Jugador (ocupa dos filas)
    let thJugador = document.createElement("th");
    thJugador.textContent = "Jugador";
    thJugador.setAttribute("rowspan", "2");
    trRondasPrincipal.appendChild(thJugador);


    // Columna "RONDA" (ocupa todas las columnas de rondas)
    let thCartas = document.createElement("th");
    thCartas.textContent = esTablaAscendente ? "Número de cartas" : "Número de cartas";
    thCartas.setAttribute("colspan", numRondas); 
    trRondasPrincipal.appendChild(thCartas);

    // 2. Columna Total (ocupa dos filas)
    let thTotal = document.createElement("th");
    thTotal.textContent = "Total";
    thTotal.setAttribute("rowspan", "2");
    trRondasPrincipal.appendChild(thTotal);
    
    thead.appendChild(trRondasPrincipal);

    // Fila 2: Números de las rondas (1, 1, 1, 2, 3...)
    const trRondasSecundaria = document.createElement("tr");
    rondas.forEach((nCartas) => {
      const th = document.createElement("th");
      th.textContent = nCartas; 
      trRondasSecundaria.appendChild(th);
    });
    thead.appendChild(trRondasSecundaria);
    // ------------------------------------------

    // FILAS DE JUGADORES
    jugadores.forEach(nombre => {
      const tr = document.createElement("tr");
      tr.setAttribute('data-jugador', nombre); // Para identificar la fila

      // Celda de nombre
      const tdNombre = document.createElement("td");
      tdNombre.textContent = nombre;
      tdNombre.classList.add("jugador");
      tr.appendChild(tdNombre);
      
      
      // La posición de la ronda en el array 'rondasActuales.todas' es clave para guardar/cargar
      const offset = esTablaAscendente ? 0 : rondasActuales.ascendentes.length;

      // Celdas de puntuación por ronda
      rondas.forEach((_, index) => {
        const td = document.createElement("td");
        // El índice de la columna en el array TOTAL es (offset + index)
        td.className = `ronda-${offset + index}`; 
        td.contentEditable = "true";
        td.addEventListener("input", manejarInputCelda);
        
        // Listener para la navegación con Enter
        td.addEventListener("keydown", manejarKeydownCelda); 

        tr.appendChild(td);
      });

      // Celda de total
      const tdTotal = document.createElement("td");
      tdTotal.textContent = "0";
      tdTotal.classList.add("total");
      tr.appendChild(tdTotal);

      cuerpoTabla.appendChild(tr);
    });
  }

  // Función para manejar el Enter (navegar hacia abajo)
  function manejarKeydownCelda(e) {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      
      const currentCell = e.target;
      const currentRow = currentCell.parentNode;
      
      // 1. Encontrar el índice de la columna
      let columnIndex = Array.from(currentRow.cells).indexOf(currentCell);

      // 2. Encontrar la siguiente fila
      const nextRow = currentRow.nextElementSibling;
      
      if (nextRow) {
        // 3. Intentar enfocar la celda en la misma columna de la siguiente fila
        const targetCell = nextRow.cells[columnIndex];

        if (targetCell && targetCell.getAttribute('contenteditable') === 'true') {
          targetCell.focus();
        } else {
          currentCell.blur();
        }
        
      } else {
        currentCell.blur();
      }
      
      // Se guarda y actualiza después de la entrada
      guardarPuntuaciones();
      calcularPuntuaciones();
      actualizarRanking();

      // ¡NUEVO! Comprobar si la partida ha terminado.
      verificarFinDePartidaYLeerRanking();
    }
  }

  function manejarInputCelda(e) {
    // La validación de números
    e.target.textContent = e.target.textContent.replace(/[^0-9-]/g, "");
    
    guardarPuntuaciones();
    calcularPuntuaciones();
    actualizarRanking();

    // ¡NUEVO! Comprobar si la partida ha terminado.
    verificarFinDePartidaYLeerRanking();
  }

  function inicializarTablas() {
    
    // Limpiar y crear la tabla Ascendente
    inicializarTabla(tablaAsc, cuerpoTablaAsc, rondasActuales.ascendentes, true);
    
    // Limpiar y crear la tabla Descendente
    inicializarTabla(tablaDesc, cuerpoTablaDesc, rondasActuales.descendentes, false);
    
    cargarPuntuaciones();
    calcularPuntuaciones();
    actualizarRanking();
  }

  function guardarPuntuaciones() {
    const data = {};
    Array.from(cuerpoTablaAsc.rows).forEach(row => { 
      const nombre = row.cells[0].textContent;
      const puntos = [];
      
      // 1. Puntos de la tabla ascendente (desde la celda 1 hasta la penúltima, saltando Total)
      for (let i = 1; i < row.cells.length - 1; i++) { 
        puntos.push(row.cells[i].textContent);
      }
      
      // 2. Puntos de la tabla descendente 
      const filaDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);
      if (filaDesc) {
          // Empezamos desde la celda 1 (saltando Nombre), y paramos antes de la última celda (Total)
          for (let i = 1; i < filaDesc.cells.length - 1; i++) { 
            puntos.push(filaDesc.cells[i].textContent);
          }
      }
      
      data[nombre] = puntos;
    });
    localStorage.setItem("puntuacionesPocha", JSON.stringify(data));
  }

  function cargarPuntuaciones() {
    const data = JSON.parse(localStorage.getItem("puntuacionesPocha")) || {};
    const lenAsc = rondasActuales.ascendentes.length;
    
    Array.from(cuerpoTablaAsc.rows).forEach(rowAsc => {
      const nombre = rowAsc.cells[0].textContent;
      const puntos = data[nombre] || [];
      
      // Referencia a la fila descendente
      const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);
      
      // Cargar puntos en tabla ascendente (va desde el índice 1 hasta el penúltimo)
      for (let i = 0; i < lenAsc; i++) {
        // i+1 porque la columna 0 es el nombre del jugador
        if (i < puntos.length) rowAsc.cells[i + 1].textContent = puntos[i];
      }
      
      // Cargar puntos en tabla descendente (va desde el índice 1 hasta el penúltimo)
      if (rowDesc) {
        for (let i = 0; i < rondasActuales.descendentes.length; i++) {
          const puntoIndex = lenAsc + i;
          // i+1 porque la columna 0 es el nombre del jugador
          if (puntoIndex < puntos.length) rowDesc.cells[i + 1].textContent = puntos[puntoIndex];
        }
      }
    });
  }

  function calcularPuntuaciones() {
    // Calculamos siempre usando la tabla ascendente como referencia de las filas
    Array.from(cuerpoTablaAsc.rows).forEach(rowAsc => {
      let suma = 0;
      const nombre = rowAsc.cells[0].textContent;
      
      // Referencia a la fila descendente
      const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);

      // Sumar puntos de la tabla ascendente (Desde la celda 1 hasta la penúltima)
      for (let i = 1; i < rowAsc.cells.length - 1; i++) {
        const val = parseInt(rowAsc.cells[i].textContent || 0);
        if (!isNaN(val)) suma += val;
      }
      
      // Sumar puntos de la tabla descendente (Desde la celda 1 hasta la penúltima)
      if (rowDesc) {
        for (let i = 1; i < rowDesc.cells.length - 1; i++) {
          const val = parseInt(rowDesc.cells[i].textContent || 0);
          if (!isNaN(val)) suma += val;
        }
      }
      
      // Actualizar el total en AMBAS filas
      rowAsc.querySelector(".total").textContent = suma;
      if (rowDesc) {
          rowDesc.querySelector(".total").textContent = suma;
      }
    });
  }

  function actualizarRanking() {
    const rankingList = document.getElementById("ranking-list");
    rankingList.innerHTML = "";

    // Obtenemos los datos de la tabla ascendente (que ahora tienen el mismo Total que la descendente)
    const datos = Array.from(cuerpoTablaAsc.rows).map(row => {
      const nombre = row.cells[0].textContent;
      const puntos = parseInt(row.querySelector(".total").textContent || 0);
      return { nombre, puntos, row };
    });
    
    datos.sort((a, b) => b.puntos - a.puntos);

    // Resetear y aplicar clases de ranking a AMBAS tablas
    Array.from(document.querySelectorAll("#cuerpo-tabla-ascendente tr, #cuerpo-tabla-descendente tr")).forEach(row => {
        row.classList.remove("top1", "top2", "top3");
    });
    
    datos.forEach((jug, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${jug.nombre} → ${jug.puntos}`;
      rankingList.appendChild(li);
      
      // Fila ascendente
      if (idx === 0) jug.row.classList.add("top1");
      if (idx === 1) jug.row.classList.add("top2");
      if (idx === 2) jug.row.classList.add("top3");
      
      // Fila descendente (buscada por el atributo data-jugador)
      const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${jug.nombre}"]`);
      if (rowDesc) {
          if (idx === 0) rowDesc.classList.add("top1");
          if (idx === 1) rowDesc.classList.add("top2");
          if (idx === 2) rowDesc.classList.add("top3");
      }
    });
  }

  window.limpiarPuntuaciones = function() {
    if(!confirm("¿Estás seguro de que quieres borrar todas las puntuaciones?")) return;
    
    // Limpiar la tabla ascendente (columnas de datos: índice 1 hasta la penúltima)
    Array.from(cuerpoTablaAsc.rows).forEach(row => {
      for (let i = 1; i < row.cells.length - 1; i++) row.cells[i].textContent = "";
      row.querySelector(".total").textContent = 0;
    });
    // Limpiar la tabla descendente (columnas de datos: índice 1 hasta la penúltima)
    Array.from(cuerpoTablaDesc.rows).forEach(row => {
      for (let i = 1; i < row.cells.length - 1; i++) row.cells[i].textContent = "";
      row.querySelector(".total").textContent = 0; 
    });
    partidaTerminada = false; // ¡NUEVO! Reiniciamos el guardián
    
    guardarPuntuaciones();
    actualizarRanking();
  }
  
  window.agregarJugador = function() {
    const nombre = prompt("Introduce el nombre del nuevo jugador:");
    if (nombre && !jugadores.includes(nombre)) {
      jugadores.push(nombre);
      localStorage.setItem("jugadores", JSON.stringify(jugadores));
      partidaTerminada = false; // ¡NUEVO! Reiniciamos el guardián
      inicializarTablas(); // Recargar la vista
    }
  }

  // Inicializar al cargar la página
  inicializarTablas();
  
  // Exponer variables y funciones para voz.js
  window.rondasActuales = rondasActuales;
  window.calcularPuntuaciones = calcularPuntuaciones;
  window.actualizarRanking = actualizarRanking;

  /**
   * NUEVA FUNCIÓN: Actualiza la puntuación desde la entrada de voz de la IA.
   * Busca la primera celda vacía para un jugador y le asigna los puntos.
   * @param {string} nombreJugador El nombre del jugador reconocido.
   * @param {number} puntos Los puntos reconocidos.
   */
  window.actualizarPuntosPorVoz = function(nombreJugador, puntos) {
    // --- LÓGICA MEJORADA ---
    // 1. Encontrar la primera columna (ronda) que tenga al menos una celda vacía.
    let colActual = -1;
    const totalRondas = rondasActuales.todas.length;

    for (let i = 0; i < totalRondas; i++) {
      // Buscamos si existe al menos una celda vacía en la columna 'i'
      const algunaCeldaVaciaEnColumna = document.querySelector(`.ronda-${i}:empty`);
      if (algunaCeldaVaciaEnColumna) {
        colActual = i;
        break; // Encontramos la primera ronda incompleta
      }
    }

    if (colActual === -1) {
      console.warn("El juego ha terminado. No hay rondas vacías.");
      return;
    }

    // 2. Buscar la celda específica para el jugador en esa columna.
    const celdaParaActualizar = document.querySelector(
      `tr[data-jugador="${nombreJugador}"] .ronda-${colActual}`
    );

    if (celdaParaActualizar && celdaParaActualizar.textContent === '') {
      console.log(`Actualizando celda para ${nombreJugador} con ${puntos} puntos.`);
      celdaParaActualizar.textContent = puntos;

      // ¡NUEVO! Guardamos la acción en el historial
      historialPuntuaciones.push(celdaParaActualizar);

      // Disparamos los cálculos y guardado como si fuera una entrada manual.
      guardarPuntuaciones();
      calcularPuntuaciones();
      actualizarRanking();

      // ¡NUEVO! Comprobar si la partida ha terminado para leer el ranking.
      verificarFinDePartidaYLeerRanking();

    } else {
      console.warn(`La celda para ${nombreJugador} en la ronda actual ya está llena o no se encontró.`);
      // Opcional: podrías usar `alert` o una notificación para el usuario.
      // alert(`No hay más rondas para ${nombreJugador}.`);
    }
  }

  /**
   * ¡NUEVA FUNCIÓN! Comprueba si quedan celdas vacías y, si no, lee el ranking.
   */
  function verificarFinDePartidaYLeerRanking() {
    // Si el guardián dice que ya hemos anunciado el final, no hacemos nada.
    if (partidaTerminada) return;

    // Buscamos si queda alguna celda de puntuación vacía
    const algunaCeldaVacia = document.querySelector('td[contenteditable="true"]:empty');

    // Si no hay celdas vacías, la partida ha terminado
    if (!algunaCeldaVacia) {
      console.log("¡Partida finalizada! Leyendo ranking...");
      partidaTerminada = true; // Activamos el guardián para no repetir

      // Construimos el texto a leer a partir de la lista del ranking
      const rankingItems = document.querySelectorAll("#ranking-list li");
      let textoRanking = "Partida finalizada. El ranking es: ";
      const posiciones = ["En primer lugar", "En segundo lugar", "En tercer lugar"];

      rankingItems.forEach((item, index) => {
        const textoItem = item.textContent.replace(/^[0-9]+\.\s/, '').replace('→', 'con');
        const prefijo = posiciones[index] || `En posición ${index + 1},`;
        textoRanking += `${prefijo}, ${textoItem} puntos. `;
      });

      // --- ¡NUEVO! Lógica para el redoble de tambores ---
      if (window.hablarTexto) {
        // Usamos el archivo de sonido local para el redoble.
        const urlRedoble = 'tambor_corto.mp3';
        const sonido = new Audio(urlRedoble);

        // Cuando el sonido del redoble TERMINE, entonces hablamos.
        sonido.onended = () => {
          window.hablarTexto(textoRanking);
        };

        // Reproducimos el sonido.
        sonido.play().catch(e => {
          console.error("No se pudo reproducir el sonido:", e);
          window.hablarTexto(textoRanking); // Si falla el sonido, al menos hablamos.
        });
      }
    }
  }

  /**
   * ¡NUEVA FUNCIÓN! Deshace la última puntuación introducida.
   */
  window.deshacerUltimaPuntuacion = function() {
    if (historialPuntuaciones.length === 0) {
      console.warn("No hay acciones que deshacer.");
      return;
    }

    const ultimaCeldaModificada = historialPuntuaciones.pop();
    console.log("Deshaciendo la última entrada en la celda:", ultimaCeldaModificada);
    ultimaCeldaModificada.textContent = ''; // Borramos el contenido

    // Recalculamos todo
    guardarPuntuaciones();
    calcularPuntuaciones();
    actualizarRanking();
  }
});