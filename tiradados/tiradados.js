document.addEventListener('DOMContentLoaded', () => {

    // --- DEFINICIÓN DE CARAS DE DADOS ---

    // Caras "Americanas" (Poker) con sus puntos asociados
    const carasAmericanas = {
        "As":    { img: "../assets/as.png", puntos: 100 },
        "K":     { img: "../assets/k.png", puntos: 50 },
        "Q":     { img: "../assets/q.png", puntos: 0 },
        "J":     { img: "../assets/j.png", puntos: 0 },
        "Rojo":  { img: "../assets/rojos.png", puntos: 0 },
        "Negro": { img: "../assets/negros.png", puntos: 0 }
    };

    // Caras normales (numéricas)
    const carasNormales = {
        "1": { img: "../assets/1.png", puntos: 1 },
        "2": { img: "../assets/2.png", puntos: 2 },
        "3": { img: "../assets/3.png", puntos: 3 },
        "4": { img: "../assets/4.png", puntos: 4 },
        "5": { img: "../assets/5.png", puntos: 5 },
        "6": { img: "../assets/6.png", puntos: 6 }
    };

    // --- ELEMENTOS DEL DOM ---

    const inputNumDados = document.getElementById('num-dados');
    const checkDadosAmericanos = document.getElementById('dados-americanos');
    const btnTirar = document.getElementById('btn-tirar');
    const dadosContainer = document.getElementById('dados-container');
    const iconoTitulo = document.getElementById('icono-titulo');

    // --- AUDIO ---
    const sonidoDados = new Audio('../assets/tiradados.mp3');

    // --- LÓGICA DE LA APLICACIÓN ---

    function tirarDados() {
        // 1. Leer opciones
        const numDados = parseInt(inputNumDados.value) || 5;
        const sonAmericanos = checkDadosAmericanos.checked;
        const caras = sonAmericanos ? carasAmericanas : carasNormales;
        const nombresCaras = Object.keys(caras);

        // 2. Simular giro de dados
        iconoTitulo.innerHTML = ''; // Ocultar cubilete del título
        dadosContainer.innerHTML = ''; // Limpiar tirada anterior
        for (let i = 0; i < numDados; i++) {
            const img = document.createElement('img');
            img.src = '../assets/dado_girando.gif';
            img.alt = 'Dado girando';
            dadosContainer.appendChild(img);
        }

        btnTirar.disabled = true;
        sonidoDados.play(); // ¡Reproducir sonido!

        // 3. Mostrar resultados después de una pausa
        setTimeout(() => {
            dadosContainer.innerHTML = ''; // Limpiar los GIFs
            let sumaTotal = 0;
            const resultados = [];

            for (let i = 0; i < numDados; i++) {
                // Elegir una cara al azar
                const caraAleatoria = nombresCaras[Math.floor(Math.random() * nombresCaras.length)];
                const infoCara = caras[caraAleatoria];
                
                // Acumular puntos y guardar resultado
                sumaTotal += infoCara.puntos;
                resultados.push(infoCara);

                // Crear y mostrar la imagen del resultado
                const img = document.createElement('img');
                img.src = infoCara.img;
                img.alt = `Resultado: ${caraAleatoria}`;
                dadosContainer.appendChild(img);
            }

            // 4. Mostrar icono del cubilete en el título
            const imgIcono = document.createElement('img');
            imgIcono.src = '../assets/cubilete2.png';
            iconoTitulo.appendChild(imgIcono);

            btnTirar.disabled = false;

        }, 1500); // Duración de la animación de giro
    }

    // --- EVENT LISTENER ---
    btnTirar.addEventListener('click', tirarDados);
});