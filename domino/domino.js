document.addEventListener('DOMContentLoaded', () => {
    const cuerpoTabla = document.getElementById('cuerpo-tabla');
    const filaNombres = document.getElementById('fila-nombres');
    const filaTotales = document.getElementById('fila-totales');
    const filaRanking = document.getElementById('fila-ranking'); // ¡NUEVO! Referencia a la fila de ranking
    const inputLimitePuntos = document.getElementById('limite-puntos');
    const btnIndividual = document.getElementById('btn-individual');
    const btnParejas = document.getElementById('btn-parejas'); // Ya no necesitamos descripcionModo

    let jugadores = JSON.parse(localStorage.getItem('jugadores')) || [];
    let limitePuntos = parseInt(localStorage.getItem('dominoLimitePuntos')) || 100;
    let modoJuego = localStorage.getItem('dominoModoJuego') || 'individual'; // 'individual' o 'parejas'
    let puntuaciones = JSON.parse(localStorage.getItem('dominoPuntuaciones')) || {};
    let historial = [];
    let partidaFinalizada = false; // ¡NUEVO! Bandera para controlar el fin de partida

    // --- INICIALIZACIÓN ---

    function inicializar() {
        // Hacemos la lista de jugadores accesible globalmente para el sistema de voz.
        window.listaJugadoresParaVoz = jugadores;

        // Sincronizar puntuaciones con jugadores
        const nuevasPuntuaciones = {};
        jugadores.forEach(nombre => {
            nuevasPuntuaciones[nombre] = puntuaciones[nombre] || [];
        });
        puntuaciones = nuevasPuntuaciones;
        guardarPuntuaciones();

        partidaFinalizada = false; // Reiniciar al inicio de la partida
        // Restaurar estado de los controles
        inputLimitePuntos.value = limitePuntos;
        actualizarBotonesModo();

        dibujarTabla();
        actualizarTotales();
        actualizarRanking();
    }

    function dibujarTabla() {
        // Limpiar cabeceras y cuerpo
        filaNombres.innerHTML = '';
        filaTotales.innerHTML = '';
        filaRanking.innerHTML = ''; // ¡NUEVO! Limpiamos la nueva fila
        cuerpoTabla.innerHTML = '';

        // Crear cabeceras
        jugadores.forEach(nombre => {
            // Fila de Nombres (sin ranking)
            const thNombre = document.createElement('th');
            thNombre.textContent = nombre;
            filaNombres.appendChild(thNombre);

            // ¡NUEVO! Fila de Ranking
            const thRanking = document.createElement('th');
            thRanking.dataset.jugador = nombre; // Para identificar la celda
            filaRanking.appendChild(thRanking);

            // Fila de Totales
            const thTotal = document.createElement('th');
            thTotal.textContent = '0';
            thTotal.dataset.jugador = nombre;
            filaTotales.appendChild(thTotal);
        });

        // Determinar el número máximo de rondas jugadas
        const maxRondasJugadas = Math.max(0, ...Object.values(puntuaciones).map(p => p.length));
        const filasADibujar = Math.max(8, maxRondasJugadas + 1); // Mínimo 8 filas o las jugadas + 1

        // Dibujar filas de rondas
        for (let i = 0; i < filasADibujar; i++) {
            const tr = document.createElement('tr');
            tr.dataset.ronda = i;
            jugadores.forEach(nombre => {
                const td = document.createElement('td');
                td.contentEditable = "true";
                td.textContent = puntuaciones[nombre][i] || '';
                td.dataset.jugador = nombre;
                td.addEventListener('input', (e) => manejarInput(e, i));
                tr.appendChild(td);
            });
            cuerpoTabla.appendChild(tr);
        }
    }

    // --- LÓGICA DE EVENTOS Y CÁLCULOS ---

    function manejarInput(e, ronda) {
        const celda = e.target;
        const nombre = celda.dataset.jugador;
        const valor = parseInt(celda.textContent) || 0;

        // Actualizar modelo de datos
        puntuaciones[nombre][ronda] = valor;

        // Guardar en historial
        historial.push({ celda, valorAnterior: celda.dataset.valorAnterior || '' });
        celda.dataset.valorAnterior = valor;

        // Comprobar si se necesita una nueva fila
        const esUltimaFila = ronda === cuerpoTabla.rows.length - 1;
        if (esUltimaFila && jugadores.some(j => (puntuaciones[j][ronda] !== undefined && puntuaciones[j][ronda] !== ''))) {
            agregarFila();
        }

        actualizarTotales();
        actualizarRanking();
        guardarPuntuaciones();
    }

    function actualizarTotales() {
        jugadores.forEach(nombre => {
            const total = (puntuaciones[nombre] || []).reduce((acc, val) => acc + val, 0);
            const thTotal = filaTotales.querySelector(`th[data-jugador="${nombre}"]`);
            if (thTotal) {
                thTotal.textContent = total;
                // Marcar si ha perdido
                if (total >= limitePuntos && !partidaFinalizada) { // Solo si no ha finalizado ya
                    thTotal.style.backgroundColor = '#e74c3c';
                    thTotal.style.color = 'white';
                    partidaFinalizada = true; // Marcamos la partida como finalizada
                    
                    // Anunciar el resultado
                    if (window.hablarTexto) {
                        const mensaje = `¡${nombre} ha llegado a ${limitePuntos} puntos y ha perdido la partida!`;
                        window.hablarTexto(mensaje);
                    }
                } else {
                    // Si la partida ya ha finalizado, mantenemos el color rojo para el perdedor
                    if (total >= limitePuntos && partidaFinalizada) { /* no hacemos nada, ya está rojo */ }
                    // Si no ha llegado al límite, o la partida no ha finalizado, quitamos el color
                    thTotal.style.backgroundColor = '';
                    thTotal.style.color = '';
                }
            }
        });
    }

    function actualizarRanking() {
        const rankingData = obtenerRanking(); // {nombre, puntos} (ya ordenado por puntos)
        const rankMap = new Map(); // Mapea nombre -> posición (1, 2, 3...)

        // ¡SOLUCIÓN! La lógica de ranking es la misma, ya que los "jugadores"
        // en modo parejas ya son los nombres de las parejas.
        rankingData.forEach((jugador, index) => {
            rankMap.set(jugador.nombre, index + 1);
        });

        // Actualizar las insignias en la cabecera
        jugadores.forEach(nombre => {
            // ¡NUEVO! Actualizamos la celda en la fila de ranking
            const thRanking = filaRanking.querySelector(`th[data-jugador="${nombre}"]`);
            if (thRanking) {
                const rank = rankMap.get(nombre) || 0;
                thRanking.textContent = `${rank || ''}º`;

                // Limpiamos clases antiguas y añadimos la nueva para el color
                thRanking.classList.remove('rank-1', 'rank-2', 'rank-3');
                if (rank > 0 && rank <= 3) {
                    thRanking.classList.add(`rank-${rank}`);
                }
            }
        });
    }

    function obtenerRanking() {
        const ranking = jugadores.map(nombre => {
            const puntos = (puntuaciones[nombre] || []).reduce((acc, val) => acc + val, 0);
            return { nombre, puntos };
        });
        // En dominó, menos puntos es mejor.
        ranking.sort((a, b) => a.puntos - b.puntos);
        return ranking;
    }

    function guardarPuntuaciones() {
        localStorage.setItem('dominoPuntuaciones', JSON.stringify(puntuaciones));
    }

    function cambiarModoJuego(nuevoModo) {
        modoJuego = nuevoModo;
        localStorage.setItem('dominoModoJuego', modoJuego);
        actualizarBotonesModo();
        actualizarRanking(); // El ranking puede cambiar con el modo
    }

    function actualizarBotonesModo() {
        if (modoJuego === 'individual') {
            btnIndividual.classList.add('active');
            btnParejas.classList.remove('active');
            btnIndividual.title = "El que llega al límite de puntos, pierde."; // ¡CORREGIDO!
            btnParejas.title = "La pareja que llega al límite de puntos, gana."; // ¡CORREGIDO!
        } else {
            btnParejas.classList.add('active');
            btnIndividual.classList.remove('active');
            btnParejas.title = "La pareja que llega al límite de puntos, gana."; // ¡CORREGIDO!
            btnIndividual.title = "El que llega al límite de puntos, pierde."; // ¡CORREGIDO!
        }
    }

    // --- LISTENERS PARA NUEVOS CONTROLES ---

    btnIndividual.addEventListener('click', () => cambiarModoJuego('individual'));
    btnParejas.addEventListener('click', () => {
        // ¡SOLUCIÓN! El modo por parejas requiere 2 nombres (que son las parejas)
        if (jugadores.length !== 2) {
            alert("El modo por parejas solo está disponible para 2 equipos (nombres).");
            return;
        }
        cambiarModoJuego('parejas');
    });
    inputLimitePuntos.addEventListener('change', () => {
        limitePuntos = parseInt(inputLimitePuntos.value) || 100;
        localStorage.setItem('dominoLimitePuntos', limitePuntos);
        actualizarTotales(); // Re-evaluar quién ha perdido/ganado
    });

    // ¡NUEVO! Listener para el botón de añadir fila
    const btnAddRow = document.getElementById('btn-add-row');
    btnAddRow.addEventListener('click', agregarFila);

    function agregarFila() {
        const nuevaRondaIndex = cuerpoTabla.rows.length;
        const nuevaFila = document.createElement('tr');
        nuevaFila.dataset.ronda = nuevaRondaIndex;

        jugadores.forEach(nombre => {
            const td = document.createElement('td');
            td.contentEditable = "true";
            td.dataset.jugador = nombre;
            td.addEventListener('input', (e) => manejarInput(e, nuevaRondaIndex));
            nuevaFila.appendChild(td);
        });
        cuerpoTabla.appendChild(nuevaFila);
    }

    // --- FUNCIONES GLOBALES PARA BOTONES Y VOZ ---

    window.limpiarPuntuaciones = function() {
        if (confirm("¿Estás seguro de que quieres borrar todas las puntuaciones?")) {
            puntuaciones = {};
            historial = [];
            jugadores.forEach(nombre => {
                puntuaciones[nombre] = [];
            });
            partidaFinalizada = false; // Reiniciar la bandera
            guardarPuntuaciones();
            inicializar();
        }
    };

    window.deshacerUltimaPuntuacion = function() {
        if (historial.length === 0) {
            alert("No hay acciones para deshacer.");
            return;
        }
        const ultimaAccion = historial.pop();
        const celda = ultimaAccion.celda;
        const ronda = parseInt(celda.parentNode.dataset.ronda);
        const nombre = celda.dataset.jugador;

        // ¡SOLUCIÓN! Replicamos la lógica del Continental
        ultimaAccion.celda.textContent = ultimaAccion.valorAnterior;
        // Disparamos el evento 'input' para que se recalcule todo de forma consistente
        ultimaAccion.celda.dispatchEvent(new Event('input', { bubbles: true }));
    };

    /**
     * Actualiza la puntuación desde la entrada de voz.
     */
    window.actualizarPuntosPorVoz = function(nombreJugador, puntos) {
        if (!jugadores.includes(nombreJugador)) {
            console.warn(`Jugador por voz "${nombreJugador}" no encontrado.`);
            return;
        }

        // Buscar la primera ronda con una celda vacía para este jugador
        let rondaParaActualizar = -1;
        const rondasJugadas = (puntuaciones[nombreJugador] || []).length;
        for (let i = 0; i <= rondasJugadas; i++) {
            if (puntuaciones[nombreJugador][i] === undefined || puntuaciones[nombreJugador][i] === null || puntuaciones[nombreJugador][i] === '') {
                rondaParaActualizar = i;
                break;
            }
        }

        if (rondaParaActualizar === -1) {
             rondaParaActualizar = rondasJugadas; // Añadir a una nueva ronda
        }

        const celda = cuerpoTabla.querySelector(`tr[data-ronda="${rondaParaActualizar}"] td[data-jugador="${nombreJugador}"]`);
        if (celda) {
            celda.textContent = puntos;
            celda.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.error("No se encontró la celda para actualizar por voz.");
        }
    };

    /**
     * Proporciona el ranking actual al sistema de voz.
     */
    window.obtenerRankingParaVoz = function() {
        return obtenerRanking();
    };

    // Iniciar todo
    inicializar();
});
