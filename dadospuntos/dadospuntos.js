document.addEventListener("DOMContentLoaded", () => {
    // Definición de las 6 categorías del juego
    const CATEGORIES = ["N", "R", "J", "Q", "K", "AS"]; 
    const CATEGORY_NAMES = {
        "N": "Negros (1 pto)",
        "R": "Rojos (2 ptos)",
        "J": "Jotas (3 ptos)",
        "Q": "Reinas (4 ptos)",
        "K": "Reyes (5 ptos)",
        "AS": "Ases (6 ptos)"
    };
    // Multiplicadores para validación de múltiplo
    const CATEGORY_MULTIPLIERS = {
        "N": 1, "R": 2, "J": 3, "Q": 4, "K": 5, "AS": 6
    };
    
    // 1. OBTENER REFERENCIAS A LAS NUEVAS TABLAS
    const cuerpoTablaAsc = document.getElementById("cuerpo-tabla-ascendente");
    const tablaAsc = document.getElementById("tabla-puntos-ascendente");
    const cuerpoTablaDesc = document.getElementById("cuerpo-tabla-descendente");
    const tablaDesc = document.getElementById("tabla-puntos-descendente");

    let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];

    function generarRondas() {
        const rondasLibres = CATEGORIES; 
        const rondasObligadas = CATEGORIES;
        
        return { 
            ascendentes: rondasLibres, 
            descendentes: rondasObligadas,
            todas: rondasLibres.concat(rondasObligadas),
            maxCartas: 6 
        };
    }

    let rondasActuales = generarRondas();

    /**
     * Función auxiliar para inicializar una tabla específica
     */
    function inicializarTabla(tabla, cuerpoTabla, rondas, esTablaAscendente) {
        cuerpoTabla.innerHTML = "";
        const thead = tabla.tHead;
        thead.innerHTML = "";

        if (jugadores.length === 0) return; 
        
        const numRondas = rondas.length;

        // Fila 1: "Jugador" (rowspan 2), Títulos de RONDA (1, 2, 3, 4, 5, 6), "Total" (rowspan 2)
        const trRondasPrincipal = document.createElement("tr");

        let thJugador = document.createElement("th");
        thJugador.textContent = "Jugador";
        thJugador.setAttribute("rowspan", "2");
        trRondasPrincipal.appendChild(thJugador);


        // Títulos de Ronda (1, 2, 3, 4, 5, 6)
        for(let i = 1; i <= numRondas; i++) {
            let thRonda = document.createElement("th");
            thRonda.textContent = i; // El número de ronda
            trRondasPrincipal.appendChild(thRonda);
        }

        let thTotal = document.createElement("th");
        thTotal.textContent = "Total";
        thTotal.setAttribute("rowspan", "2");
        trRondasPrincipal.appendChild(thTotal);
        
        thead.appendChild(trRondasPrincipal);

        // Fila 2: Títulos de las categorías (N, R, J, Q, K, AS)
        const trRondasSecundaria = document.createElement("tr");
        rondas.forEach((categoria) => {
            const th = document.createElement("th");
            th.textContent = categoria; 
            trRondasSecundaria.appendChild(th);
        });
        thead.appendChild(trRondasSecundaria);
        
        // FILAS DE JUGADORES
        jugadores.forEach(nombre => {
            const tr = document.createElement("tr");
            tr.setAttribute('data-jugador', nombre); 
            tr.setAttribute('data-ronda', esTablaAscendente ? 'ascendente' : 'descendente');

            // Celda de nombre
            const tdNombre = document.createElement("td");
            tdNombre.textContent = nombre;
            tdNombre.classList.add("nombre-jugador"); // Clase para identificar la celda del nombre
            tdNombre.classList.add("jugador");
            tr.appendChild(tdNombre);
            
            const offset = esTablaAscendente ? 0 : CATEGORIES.length; 

            // Celdas de puntuación por categoría
            rondas.forEach((categoria, index) => {
                const td = document.createElement("td");
                td.className = `ronda-${offset + index}`; 
                td.contentEditable = esTablaAscendente ? "true" : "false"; // Tabla Descendente inicialmente bloqueada

                td.addEventListener("keydown", manejarKeydownCelda); 
                td.addEventListener("blur", manejarBlurCelda); 
                
                td.setAttribute('data-categoria', categoria); 

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

    // 🌟 ARREGLO DEL ENTER 🌟
    function manejarKeydownCelda(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            
            const currentCell = e.target;
            currentCell.blur(); // Dispara manejarBlurCelda (validación y guardado)

            setTimeout(() => {
                const currentRow = currentCell.parentNode;
                
                // 1. Encontrar el índice de la columna
                let columnIndex = Array.from(currentRow.cells).indexOf(currentCell);

                // 2. Encontrar la siguiente fila
                const nextRow = currentRow.nextElementSibling;
                
                let targetCell;

                if (nextRow) {
                    // 3. Intentar enfocar la celda en la misma columna de la siguiente fila
                    targetCell = nextRow.cells[columnIndex];
                } else {
                    // Si es la última fila, intentar ir a la primera celda de la Tabla Descendente
                    if (currentRow.getAttribute('data-ronda') === 'ascendente') {
                        const firstDescRow = cuerpoTablaDesc.querySelector('tr');
                        if (firstDescRow) {
                            targetCell = firstDescRow.cells[1];
                        }
                    }
                }

                if (targetCell && targetCell.getAttribute('contenteditable') === 'true') {
                    targetCell.focus();
                }
            }, 10); 
        }
    }

    // 🔴 Lógica de Validación (Fondo Rojo)
    function manejarBlurCelda(e) {
        const td = e.target;
        const categoriaSimbolo = td.getAttribute('data-categoria');

        // Limpieza robusta: Quitamos saltos de línea y solo dejamos números
        let textoLimpio = td.textContent.replace(/(\r\n|\n|\r)/gm, "").trim();
        textoLimpio = textoLimpio.replace(/[^0-9]/g, ""); // Permitir solo dígitos
        td.textContent = textoLimpio; 

        let valor = parseInt(textoLimpio);
        const multiplier = CATEGORY_MULTIPLIERS[categoriaSimbolo];
        
        // 1. Caso: Vacío o Cero -> Válido
        if (textoLimpio === '' || valor === 0) {
            td.classList.remove('error-multiplo');
        } 
        // 2. Caso: Error (No es número o no es múltiplo) -> Rojo
        else if (isNaN(valor) || valor % multiplier !== 0) {
            td.classList.add('error-multiplo');
            window.hablarTexto(`El número tiene que ser múltiplo de ${multiplier}.`); // <-- ¡NUEVO! Mensaje de voz
        } 
        // 3. Caso: Válido -> Quitar Rojo
        else {
            td.classList.remove('error-multiplo');
        }
        
        guardarPuntuaciones();
        calcularPuntuaciones(); 
        
        // REVISIÓN DEL BLOQUEO
        if (td.closest('tr').getAttribute('data-ronda') === 'ascendente') {
            verificarCompletadoRondaLibre();
        }
    }


    // NUEVO: Lógica de bloqueo
    function isRondaLibreCompleted() {
        // Recorrer todas las celdas de puntuación de la tabla ascendente
        const scoreCells = document.querySelectorAll("#cuerpo-tabla-ascendente td[data-categoria]");
        
        for (const cell of scoreCells) {
            // Si está vacía O tiene la clase de error (fondo rojo), NO está completada.
            if (!cell.textContent.trim() || cell.classList.contains('error-multiplo')) {
                return false;
            }
        }
        return true;
    }
    
    // NUEVO: Aplica o quita el bloqueo
    function toggleTableDescEditable(isCompleted) {
        const celdasDesc = document.querySelectorAll("#cuerpo-tabla-descendente td[data-categoria]");
        
        celdasDesc.forEach(td => {
            if (isCompleted) {
                td.setAttribute('contenteditable', 'true');
                td.style.backgroundColor = ''; // Limpiamos el gris
                td.style.cursor = 'text';
            } else {
                td.setAttribute('contenteditable', 'false');
                td.style.backgroundColor = '#ddd'; // Fondo gris para indicar bloqueo
                td.style.cursor = 'not-allowed';
            }
        });
    }

    function verificarCompletadoRondaLibre() {
        const completed = isRondaLibreCompleted();
        toggleTableDescEditable(completed);
    }

    function inicializarTablas() {
        
        inicializarTabla(tablaAsc, cuerpoTablaAsc, rondasActuales.ascendentes, true);
        inicializarTabla(tablaDesc, cuerpoTablaDesc, rondasActuales.descendentes, false);
        
        cargarPuntuaciones();
        calcularPuntuaciones();
        verificarCompletadoRondaLibre(); // Aplicar el bloqueo al inicio
    }

    function guardarPuntuaciones() {
        const data = {};
        Array.from(cuerpoTablaAsc.rows).forEach(row => { 
            const nombre = row.getAttribute('data-jugador'); // <-- 1. SOLUCIÓN: Usamos el atributo, que siempre es limpio.
            const puntos = [];
            
            // 1. Puntos de la tabla ascendente
            for (let i = 1; i < row.cells.length - 1; i++) { 
                puntos.push(row.cells[i].textContent);
            }
            
            // 2. Puntos de la tabla descendente 
            const filaDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);
            if (filaDesc) {
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
            const nombre = rowAsc.getAttribute('data-jugador'); // <-- Usamos el atributo aquí también por consistencia.
            const puntos = data[nombre] || [];
            
            const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);
            
            // Cargar puntos en tabla ascendente (validando el fondo rojo inicial)
            for (let i = 0; i < lenAsc; i++) {
                if (i < puntos.length) {
                    const td = rowAsc.cells[i + 1];
                    td.textContent = puntos[i];
                    
                    // VALIDACIÓN AL CARGAR (Fondo Rojo inicial)
                    const valor = parseInt(puntos[i] || 0);
                    const categoriaSimbolo = td.getAttribute('data-categoria');
                    const multiplier = CATEGORY_MULTIPLIERS[categoriaSimbolo];
                    
                    if (valor !== 0 && (isNaN(valor) || valor % multiplier !== 0)) {
                         td.classList.add('error-multiplo');
                    } else {
                         td.classList.remove('error-multiplo');
                    }
                }
            }
            
            // Cargar puntos en tabla descendente (validando el fondo rojo inicial)
            if (rowDesc) {
                for (let i = 0; i < rondasActuales.descendentes.length; i++) {
                    const puntoIndex = lenAsc + i;
                    if (puntoIndex < puntos.length) {
                        const td = rowDesc.cells[i + 1];
                        td.textContent = puntos[puntoIndex];
                        
                        // VALIDACIÓN AL CARGAR (Fondo Rojo inicial)
                        const valor = parseInt(puntos[puntoIndex] || 0);
                        const categoriaSimbolo = td.getAttribute('data-categoria');
                        const multiplier = CATEGORY_MULTIPLIERS[categoriaSimbolo];
                        
                        if (valor !== 0 && (isNaN(valor) || valor % multiplier !== 0)) {
                             td.classList.add('error-multiplo');
                        } else {
                             td.classList.remove('error-multiplo');
                        }
                    }
                }
            }
        });
    }

    // MODIFICADO: Solo suma si no hay clase de error
    function calcularPuntuaciones() {
        Array.from(cuerpoTablaAsc.rows).forEach(rowAsc => {
            let sumaAsc = 0;
            let sumaTotal = 0;
            const nombre = rowAsc.getAttribute('data-jugador');
            const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);

            // Sumar puntos de la tabla ascendente (Libre)
            for (let i = 1; i < rowAsc.cells.length - 1; i++) {
                const cell = rowAsc.cells[i];
                if (!cell.classList.contains('error-multiplo')) {
                    const val = parseInt(cell.textContent || 0);
                    if (!isNaN(val)) sumaAsc += val;
                }
            }
            
            sumaTotal = sumaAsc;

            // Sumar puntos de la tabla descendente (Obligada)
            if (rowDesc) {
                for (let i = 1; i < rowDesc.cells.length - 1; i++) {
                    const cell = rowDesc.cells[i];
                    if (!cell.classList.contains('error-multiplo')) {
                        const val = parseInt(cell.textContent || 0);
                        if (!isNaN(val)) sumaTotal += val;
                    }
                }
            }
            
            // Actualizar el total en la primera tabla (Solo parcial)
            rowAsc.querySelector(".total").textContent = sumaAsc;
            // Actualizar el total en la segunda tabla (Acumulado)
            if (rowDesc) {
                rowDesc.querySelector(".total").textContent = sumaTotal;
            }
        });

        // --- 2. LÓGICA DE RANKING (COMO EN POCHA) ---
        const datosJugadores = Array.from(cuerpoTablaAsc.rows).map(row => {
            const nombre = row.getAttribute('data-jugador');
            const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);
            // El ranking se basa en el total acumulado (tabla descendente)
            const puntos = rowDesc ? parseInt(rowDesc.querySelector(".total").textContent || 0) : 0;
            return {
                nombre: nombre,
                puntos: puntos
            };
        });

        datosJugadores.sort((a, b) => b.puntos - a.puntos);

        datosJugadores.forEach((jugador, index) => {
            const posicion = index + 1;
            // Buscamos todas las celdas de nombre para este jugador (en ambas tablas)
            const filasDelJugador = document.querySelectorAll(`tr[data-jugador="${jugador.nombre}"]`);

            filasDelJugador.forEach(fila => {
                const celdaNombre = fila.querySelector('.nombre-jugador');                
                if (celdaNombre) {
                    celdaNombre.innerHTML = jugador.nombre; // Primero limpiamos la celda y ponemos solo el nombre
                    const rankPrefix = document.createElement('span');
                    rankPrefix.className = `rank-prefix-col top${posicion}`;
                    rankPrefix.textContent = `${posicion}º`;
                    // Insertamos el prefijo al principio de la celda
                    celdaNombre.prepend(rankPrefix);
                }
            });
        });
    }

    window.limpiarPuntuaciones = function() {
        if(!confirm("¿Estás seguro de que quieres borrar todas las puntuaciones?")) return;
        
        // Limpiar contenido y quitar la clase de error
        Array.from(document.querySelectorAll("#cuerpo-tabla-ascendente td[contenteditable='true'], #cuerpo-tabla-descendente td[contenteditable='true']")).forEach(td => {
            td.textContent = "";
            td.classList.remove('error-multiplo');
            if (td.closest('tr').getAttribute('data-ronda') === 'descendente') {
                td.setAttribute('contenteditable', 'false');
                td.style.backgroundColor = '#ddd'; // Volver a gris
            }
        });
        
        Array.from(document.querySelectorAll(".total")).forEach(td => td.textContent = 0);
        guardarPuntuaciones();
        verificarCompletadoRondaLibre();
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
    window.CATEGORY_NAMES = CATEGORY_NAMES;

    // 2. SOLUCIÓN VOZ: Creamos la función que el sistema de voz necesita para leer el ranking.
    window.obtenerRankingParaVoz = function() {
        const datosJugadores = Array.from(cuerpoTablaAsc.rows).map(row => {
            const nombre = row.getAttribute('data-jugador');
            const rowDesc = cuerpoTablaDesc.querySelector(`tr[data-jugador="${nombre}"]`);
            const puntos = rowDesc ? parseInt(rowDesc.querySelector(".total").textContent || 0) : 0;
            return { nombre, puntos };
        });
        return datosJugadores.sort((a, b) => b.puntos - a.puntos);
    };

    // 1. SOLUCIÓN VOZ: Exponemos la lista de jugadores para el sistema de voz.
    window.listaJugadoresParaVoz = jugadores;
    
    // EXPORTAR PARA VOZDADOS: Función que valida si un valor es correcto para una categoría
    window.validarPuntuacion = function(valor, categoryCode) {
        if (isNaN(valor) || valor === null) return false;
        const multiplier = CATEGORY_MULTIPLIERS[categoryCode];
        return valor % multiplier === 0;
    };

    // EXPORTAR PARA VOZ: Función que actualiza la celda correcta.
    window.actualizarPuntosPorVoz = function(nombreJugador, puntos, categoria) {
        if (!nombreJugador || puntos === undefined || categoria === null) {
            console.warn("Voz: Faltan datos para actualizar la puntuación (jugador, puntos o categoría).");
            return;
        }

        // Buscamos la celda en la tabla de Ronda Libre que no esté llena
        let celdaParaActualizar = document.querySelector(`#cuerpo-tabla-ascendente tr[data-jugador="${nombreJugador}"] td[data-categoria="${categoria}"]:not(:has(div))`);
        
        // Si no la encontramos en la libre, y la obligada está activa, la buscamos ahí
        if (!celdaParaActualizar && isRondaLibreCompleted()) {
             celdaParaActualizar = document.querySelector(`#cuerpo-tabla-descendente tr[data-jugador="${nombreJugador}"] td[data-categoria="${categoria}"]`);
        }

        if (celdaParaActualizar) {
            if (celdaParaActualizar.getAttribute('contenteditable') === 'true') {
                celdaParaActualizar.textContent = puntos;
                // Disparamos el evento 'blur' para que se ejecute toda la lógica de validación y cálculo
                celdaParaActualizar.dispatchEvent(new Event('blur', { bubbles: true }));
            } else {
                console.warn(`Voz: La celda para ${nombreJugador} en ${categoria} está bloqueada.`);
            }
        } else {
            console.warn(`Voz: No se encontró una celda vacía para ${nombreJugador} en la categoría ${categoria}.`);
        }
    };
});