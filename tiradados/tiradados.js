/**
 * tiradados.js
 * 
 * Módulo reutilizable para gestionar la tirada de dados con selección y bloqueo.
 * 
 * @param {object} config - Objeto de configuración para inicializar el componente.
 * @param {string} config.contenedorDadosId - El ID del elemento HTML donde se mostrarán los dados.
 * @param {string} config.botonTirarId - El ID del botón que inicia la tirada.
 * @param {string} config.numDadosInputId - El ID del input para el número de dados.
 * @param {string} config.dadosAmericanosCheckId - El ID del checkbox para los dados americanos.
 * @param {function} [config.onTiradaCompleta] - Una función callback que se ejecuta después de cada tirada, 
 *                                              pasando como argumento un array con los valores de los dados.
 */
function inicializarTiradaDados(config) {
    const contenedorDados = document.getElementById(config.contenedorDadosId);
    const botonTirar = document.getElementById(config.botonTirarId);
    // RESTAURADO: Elementos de configuración
    const inputNumDados = document.getElementById(config.numDadosInputId);
    const checkDadosAmericanos = document.getElementById(config.dadosAmericanosCheckId);
    const onTiradaCompleta = config.onTiradaCompleta;

    if (!contenedorDados || !botonTirar || !inputNumDados || !checkDadosAmericanos) {
        console.error("Error: No se encontraron todos los elementos necesarios (contenedor, botón, input de número o checkbox). Revisa los IDs en la configuración.");
        return;
    }

    // RESTAURADO: Definición de las caras de los dados
    const carasAmericanas = {
        "As":    { img: "../assets/as.png" },
        "K":     { img: "../assets/k.png" },
        "Q":     { img: "../assets/q.png" },
        "J":     { img: "../assets/j.png" },
        "Rojo":  { img: "../assets/rojos.png" },
        "Negro": { img: "../assets/negros.png" }
    };
    const carasNormales = {
        "1": { img: "../assets/1.png" },
        "2": { img: "../assets/2.png" },
        "3": { img: "../assets/3.png" },
        "4": { img: "../assets/4.png" },
        "5": { img: "../assets/5.png" },
        "6": { img: "../assets/6.png" }
    };

    const sonidoDados = new Audio('../assets/tiradados.mp3');

    let numeroDeDados = parseInt(inputNumDados.value);
    let valoresDados = new Array(numeroDeDados).fill(1);

    /**
     * Crea los elementos <img> de los dados y los añade al contenedor.
     */
    function crearDados() {
        contenedorDados.innerHTML = ''; // Limpiamos por si acaso
        numeroDeDados = parseInt(inputNumDados.value);
        valoresDados = new Array(numeroDeDados).fill(checkDadosAmericanos.checked ? "As" : 1);

        for (let i = 0; i < numeroDeDados; i++) {
            const dadoImg = document.createElement('img');
            dadoImg.src = checkDadosAmericanos.checked ? carasAmericanas["As"].img : carasNormales["1"].img;
            dadoImg.alt = `Dado inicial`;
            dadoImg.classList.add('dado');
            dadoImg.dataset.index = i; // Guardamos su índice para identificarlo
            dadoImg.addEventListener('click', seleccionarDado);
            contenedorDados.appendChild(dadoImg);
        }
    }

    /**
     * Alterna el estado de selección de un dado al hacerle clic.
     * @param {Event} e - El evento de clic.
     */
    function seleccionarDado(e) {
        e.target.classList.toggle('seleccionado');
    }

    /**
     * Simula la tirada de los dados que no están seleccionados.
     */
    function tirarDados() {
        botonTirar.disabled = true;
        sonidoDados.play();

        // Leemos las opciones justo antes de tirar
        const sonAmericanos = checkDadosAmericanos.checked;
        const caras = sonAmericanos ? carasAmericanas : carasNormales;
        const nombresCaras = Object.keys(caras);

        const dados = contenedorDados.querySelectorAll('.dado');
        let dadosGirando = 0;
        
        dados.forEach((dado, index) => {
            // Solo tiramos los dados que NO tienen la clase 'seleccionado'
            if (!dado.classList.contains('seleccionado')) {
                dadosGirando++;
                dado.src = '../assets/dado_girando.gif';
                
                setTimeout(() => {
                    const caraAleatoria = nombresCaras[Math.floor(Math.random() * nombresCaras.length)];
                    const infoCara = caras[caraAleatoria];
                    valoresDados[index] = sonAmericanos ? caraAleatoria : parseInt(caraAleatoria);
                    dado.src = infoCara.img;
                    dado.alt = `Dado con valor ${caraAleatoria}`;
                    dado.classList.remove('girando');
                }, 1000); // Duración de la animación (aumentada para que se aprecie)
            }
        });

        // Esperamos a que terminen todas las animaciones para notificar el resultado
        setTimeout(() => {
            botonTirar.disabled = false;

            if (onTiradaCompleta && typeof onTiradaCompleta === 'function') {
                onTiradaCompleta(valoresDados);
            }
        }, dadosGirando > 0 ? 1100 : 0);
    }

    // --- Inicialización del componente ---
    crearDados();
    botonTirar.addEventListener('click', tirarDados);
    // RESTAURADO: Listeners para que la interfaz se actualice si cambian las opciones
    inputNumDados.addEventListener('change', crearDados);
    checkDadosAmericanos.addEventListener('change', crearDados);

    // Devolvemos un objeto con métodos públicos por si se necesitan desde fuera
    return {
        getValores: () => valoresDados,
        reiniciar: () => {
            crearDados();
        }
    };
}