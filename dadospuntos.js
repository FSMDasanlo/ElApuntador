document.addEventListener("DOMContentLoaded", () => {
    // Definición de las 6 categorías del juego
    // CORREGIDO: Usar los símbolos correctos para coincidir con CATEGORY_NAMES
    const CATEGORIES = ["N", "R", "J", "Q", "K", "AS"]; 
    const CATEGORY_NAMES = {
        "N": "Negros (1 pto)",
        "R": "Rojos (2 ptos)",
        "J": "Jotas (3 ptos)",
        "Q": "Reinas (4 ptos)",
        "K": "Reyes (5 ptos)",
        "AS": "Ases (6 ptos)"
    };
    
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

    // MODIFICADO: Genera las 12 rondas fijas (6 libres + 6 obligadas)
    function generarRondas() {
        // La ronda ascendente es la Libre (6 categorías)
        const rondasLibres = CATEGORIES; 
        // La ronda descendente es la Obligada (6 categorías)
        const rondasObligadas = CATEGORIES;
        
        return { 
            ascendentes: rondasLibres, 
            descendentes: rondasObligadas,
            // Lista total para buscar por índice de columna (0-5 Libre, 6-11 Obligada)
            todas: rondasLibres.concat(rondasObligadas),
            maxCartas: 6 
        };
    }

    let rondasActuales = generarRondas();

    /**
     * Función auxiliar para inicializar una tabla específica
     * Ahora usa las categorías fijas.
     */
    function inicializarTabla(tabla, cuerpoTabla, rondas, esTablaAscendente) {
        cuerpoTabla.innerHTML = "";
        const thead = tabla.tHead;
        thead.innerHTML = "";

        // Si no hay jugadores, se detiene aquí y la tabla queda vacía
        if (jugadores.length === 0) return; 
        
        const numRondas = rondas.length;

        // Fila 1: "Jugador" (rowspan 2), Títulos de RONDA (1, 2, 3, 4, 5, 6), "Total" (rowspan 2)
        const trRondasPrincipal = document.createElement("tr");

        // 1. Columna Jugador (ocupa dos filas)
        let thJugador = document.createElement("th");
        thJugador.textContent = "Jugador";
        thJugador.setAttribute("rowspan", "2");
        trRondasPrincipal.appendChild(thJugador);


        // MODIFICACIÓN PRINCIPAL: Títulos de Ronda (1, 2, 3, 4, 5, 6)
        for(let i = 1; i <= numRondas; i++) {
            let thRonda = document.createElement("th");
            thRonda.textContent = i; // El número de ronda
            trRondasPrincipal.appendChild(thRonda);
        }
        // FIN MODIFICACIÓN PRINCIPAL

        // 2. Columna Total (ocupa dos filas)
        let thTotal = document.createElement("th");
        thTotal.textContent = "Total";
        thTotal.setAttribute("rowspan", "2");
        trRondasPrincipal.appendChild(thTotal);
        
        thead.appendChild(trRondasPrincipal);

        // Fila 2: Títulos de las categorías (N, R, J, Q, K, AS)
        const trRondasSecundaria = document.createElement("tr");
        rondas.forEach((categoria) => {
            const th = document.createElement("th");
            // Usamos el nombre corto (N, R, J...) para la cabecera
            th.textContent = categoria; 
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
            const offset = esTablaAscendente ? 0 : CATEGORIES.length; 

            // Celdas de puntuación por categoría
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

    // Función para manejar el Enter (navegar hacia abajo) - SIN CAMBIOS
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
        }
    }

    function manejarInputCelda(e) {
        // La validación de números
        e.target.textContent = e.target.textContent.replace(/[^0-9-]/g, "");
        
        guardarPuntuaciones();
        calcularPuntuaciones();
        actualizarRanking();
    }

    function inicializarTablas() {
        
        // Limpiar y crear la tabla Ascendente (Libre)
        inicializarTabla(tablaAsc, cuerpoTablaAsc, rondasActuales.ascendentes, true);
        
        // Limpiar y crear la tabla Descendente (Obligada)
        inicializarTabla(tablaDesc, cuerpoTablaDesc, rondasActuales.descendentes, false);
        
        cargarPuntuaciones();
        calcularPuntuaciones();
        actualizarRanking();
    }

    // MODIFICADO: Cambio de nombre de clave de almacenamiento de 'puntuacionesPocha' a 'puntuacionesDados'
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
        localStorage.setItem("puntuacionesDados", JSON.stringify(data));
    }

    function cargarPuntuaciones() {
        const data = JSON.parse(localStorage.getItem("puntuacionesDados")) || {};
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

    // Las siguientes funciones se mantienen porque se basan en el DOM (clase '.ronda-X') y no en la lógica del juego anterior.
    function calcularPuntuaciones() {
        Array.from(cuerpoTablaAsc.rows).forEach(rowAsc => {
            let suma = 0;
            const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${rowAsc.cells[0].textContent}"]`);

            // Sumar puntos de la tabla ascendente (Libre)
            for (let i = 1; i < rowAsc.cells.length - 1; i++) {
                const val = parseInt(rowAsc.cells[i].textContent || 0);
                if (!isNaN(val)) suma += val;
            }
            
            // Sumar puntos de la tabla descendente (Obligada)
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
        const datos = Array.from(cuerpoTablaAsc.rows).map(row => {
            return { nombre: row.cells[0].textContent, puntos: parseInt(row.querySelector(".total").textContent || 0), row };
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
            
            // Aplicar clases de ranking
            const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${jug.nombre}"]`);
            [jug.row, rowDesc].forEach(r => {
                if (r) {
                    if (idx === 0) r.classList.add("top1");
                    if (idx === 1) r.classList.add("top2");
                    if (idx === 2) r.classList.add("top3");
                }
            });
        });
    }

    window.limpiarPuntuaciones = function() {
        if(!confirm("¿Estás seguro de que quieres borrar todas las puntuaciones?")) return;
        Array.from(document.querySelectorAll("#cuerpo-tabla-ascendente td[contenteditable='true'], #cuerpo-tabla-descendente td[contenteditable='true']")).forEach(td => td.textContent = "");
        Array.from(document.querySelectorAll(".total")).forEach(td => td.textContent = 0);
        guardarPuntuaciones();
        actualizarRanking();
    }
  
    window.agregarJugador = function() {
        const nombre = prompt("Introduce el nombre del nuevo jugador:");
        if (nombre && !jugadores.includes(nombre)) {
            jugadores.push(nombre);
            localStorage.setItem("jugadores", JSON.stringify(jugadores));
            inicializarTablas(); // Recargar la vista
        }
    }

    // Inicializar al cargar la página
    inicializarTablas();
    
    // Exponer variables y funciones para vozdados.js
    window.rondasActuales = rondasActuales;
    window.calcularPuntuaciones = calcularPuntuaciones;
    window.actualizarRanking = actualizarRanking;
    window.CATEGORY_NAMES = CATEGORY_NAMES; // **NUEVO**
});