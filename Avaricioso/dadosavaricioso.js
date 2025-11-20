document.addEventListener('DOMContentLoaded', () => {
    const cuerpoTabla = document.getElementById('cuerpo-tabla');
    const filaNombres = document.getElementById('fila-nombres');
    const filaTotales = document.getElementById('fila-totales');
    const filaRanking = document.getElementById('fila-ranking');
    const inputMetaPuntos = document.getElementById('meta-puntos');
    const btnAddRow = document.getElementById('btn-add-row');

    let jugadores = JSON.parse(localStorage.getItem('jugadores')) || [];
    let metaPuntos = parseInt(localStorage.getItem('avariciosoMetaPuntos')) || 5000;
    let puntuaciones = JSON.parse(localStorage.getItem('avariciosoPuntuaciones')) || {};
    let historial = [];
    let partidaFinalizada = false;

    // --- INICIALIZACIÓN ---

    function inicializar() {
        window.listaJugadoresParaVoz = jugadores;

        const nuevasPuntuaciones = {};
        jugadores.forEach(nombre => {
            nuevasPuntuaciones[nombre] = puntuaciones[nombre] || [];
        });
        puntuaciones = nuevasPuntuaciones;
        guardarPuntuaciones();

        partidaFinalizada = false;
        inputMetaPuntos.value = metaPuntos;

        dibujarTabla();
        actualizarTotales();
        actualizarRanking();
    }

    function dibujarTabla() {
        filaNombres.innerHTML = '';
        filaTotales.innerHTML = '';
        filaRanking.innerHTML = '';
        cuerpoTabla.innerHTML = '';

        jugadores.forEach(nombre => {
            const thNombre = document.createElement('th');
            thNombre.textContent = nombre;
            filaNombres.appendChild(thNombre);

            const thRanking = document.createElement('th');
            thRanking.dataset.jugador = nombre;
            filaRanking.appendChild(thRanking);

            const thTotal = document.createElement('th');
            thTotal.textContent = '0';
            thTotal.dataset.jugador = nombre;
            filaTotales.appendChild(thTotal);
        });

        const maxRondasJugadas = Math.max(0, ...Object.values(puntuaciones).map(p => p.length));
        const filasADibujar = Math.max(8, maxRondasJugadas + 1);

        for (let i = 0; i < filasADibujar; i++) {
            agregarFila(i, false);
        }
    }

    function agregarFila(indiceRonda = -1, conAnimacion = true) {
        const ronda = (indiceRonda === -1) ? cuerpoTabla.rows.length : indiceRonda;
        const tr = document.createElement('tr');
        tr.dataset.ronda = ronda;

        jugadores.forEach(nombre => {
            const td = document.createElement('td');
            td.contentEditable = "true";
            td.textContent = puntuaciones[nombre] ? (puntuaciones[nombre][ronda] || '') : '';
            td.dataset.jugador = nombre;
            td.addEventListener('input', (e) => manejarInput(e, ronda));
            tr.appendChild(td);
        });
        cuerpoTabla.appendChild(tr);

        if (conAnimacion) {
            tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // --- LÓGICA DE EVENTOS Y CÁLCULOS ---

    function manejarInput(e, ronda) {
        const celda = e.target;
        const nombre = celda.dataset.jugador;
        const valor = parseInt(celda.textContent) || 0;

        if (!puntuaciones[nombre]) puntuaciones[nombre] = [];
        puntuaciones[nombre][ronda] = valor;

        historial.push({ celda, valorAnterior: celda.dataset.valorAnterior || '' });
        celda.dataset.valorAnterior = valor;

        const esUltimaFila = ronda === cuerpoTabla.rows.length - 1;
        if (esUltimaFila && jugadores.some(j => (puntuaciones[j][ronda] !== undefined && puntuaciones[j][ronda] !== ''))) {
            agregarFila(-1, false);
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
                if (total >= metaPuntos && !partidaFinalizada) {
                    thTotal.style.backgroundColor = '#28a745'; // Verde para el ganador
                    thTotal.style.color = 'white';
                    partidaFinalizada = true;
                    if (window.hablarTexto) {
                        window.hablarTexto(`¡${nombre} ha llegado a ${metaPuntos} puntos y ha ganado la partida!`);
                    }
                } else {
                    if (total >= metaPuntos && partidaFinalizada) { /* Mantener color ganador */ }
                    else {
                        thTotal.style.backgroundColor = '';
                        thTotal.style.color = '';
                    }
                }
            }
        });
    }

    function actualizarRanking() {
        const rankingData = obtenerRanking();
        const rankMap = new Map();
        rankingData.forEach((jugador, index) => {
            rankMap.set(jugador.nombre, index + 1);
        });

        jugadores.forEach(nombre => {
            const thRanking = filaRanking.querySelector(`th[data-jugador="${nombre}"]`);
            if (thRanking) {
                const rank = rankMap.get(nombre) || 0;
                thRanking.textContent = `${rank || ''}º`;
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
        // En Avaricioso, más puntos es mejor.
        ranking.sort((a, b) => b.puntos - a.puntos);
        return ranking;
    }

    function guardarPuntuaciones() {
        localStorage.setItem('avariciosoPuntuaciones', JSON.stringify(puntuaciones));
    }

    // --- LISTENERS ---

    inputMetaPuntos.addEventListener('change', () => {
        metaPuntos = parseInt(inputMetaPuntos.value) || 5000;
        localStorage.setItem('avariciosoMetaPuntos', metaPuntos);
        actualizarTotales();
    });

    btnAddRow.addEventListener('click', () => agregarFila(-1, true));

    // --- FUNCIONES GLOBALES ---

    window.limpiarPuntuaciones = function() {
        if (confirm("¿Estás seguro de que quieres borrar todas las puntuaciones?")) {
            puntuaciones = {};
            historial = [];
            jugadores.forEach(nombre => {
                puntuaciones[nombre] = [];
            });
            partidaFinalizada = false;
            guardarPuntuaciones();
            inicializar();
        }
    };

    window.deshacerUltimaPuntuacion = function() {
        if (historial.length === 0) return;
        const ultimaAccion = historial.pop();
        ultimaAccion.celda.textContent = ultimaAccion.valorAnterior;
        ultimaAccion.celda.dispatchEvent(new Event('input', { bubbles: true }));
    };

    window.actualizarPuntosPorVoz = function(nombreJugador, puntos) {
        if (!jugadores.includes(nombreJugador)) return;
        let rondaParaActualizar = -1;
        const rondasJugadas = (puntuaciones[nombreJugador] || []).length;
        for (let i = 0; i <= rondasJugadas; i++) {
            if (puntuaciones[nombreJugador][i] === undefined || puntuaciones[nombreJugador][i] === null || puntuaciones[nombreJugador][i] === '') {
                rondaParaActualizar = i;
                break;
            }
        }
        if (rondaParaActualizar === -1) rondaParaActualizar = rondasJugadas;

        const celda = cuerpoTabla.querySelector(`tr[data-ronda="${rondaParaActualizar}"] td[data-jugador="${nombreJugador}"]`);
        if (celda) {
            celda.textContent = puntos;
            celda.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    window.obtenerRankingParaVoz = function() { return obtenerRanking(); };

    // Iniciar todo
    inicializar();
});
