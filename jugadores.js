/**
 * Obtiene la clave única para guardar/recuperar datos del localStorage
 * para el juego actualmente seleccionado.
 */
function getClaveLocalStorage() {
  // ¡CAMBIO! Usamos una única clave para todos los juegos.
  // Así, la lista de jugadores es compartida.
  return 'jugadores_global';
}

let jugadores = JSON.parse(localStorage.getItem(getClaveLocalStorage())) || [];
let juegoSeleccionado = localStorage.getItem('juegoSeleccionado') || 'continental'; // Ahora guardamos el nombre de la carpeta

// Mapeo de nombres bonitos para cada juego
const nombresBonitos = {
  "continental": "CONTINENTAL",
  "Avaricioso": "EL AVARICIOSO", // ¡SOLUCIÓN! Mapeo para la nueva ruta
  "pocha": "LA POCHA",
  "domino": "DOMINÓ",
  "dadospuntos": "CARRERA DE DADOS"
  // añade aquí los próximos juegos usando el nombre de su carpeta
};

// ¡SOLUCIÓN! Mapeo de nombres de imágenes para cada juego.
// Esto evita problemas si el nombre del archivo de imagen no coincide con el ID del juego.
const nombresImagenes = {
  "continental": "continental",
  "Avaricioso": "dados", // El Avaricioso usa 'dados.jpg'
  "pocha": "pocha",
  "domino": "domino",
  "dadospuntos": "dadospuntos"
};

// ----------------------------
// Inicialización y título
// ----------------------------
window.addEventListener('DOMContentLoaded', () => {
  // Nos aseguramos de quitar el .html si existiera por datos antiguos en localStorage
  const juegoId = juegoSeleccionado.replace('.html', '');
  const nombreJuego = nombresBonitos[juegoId] || juegoId.split('/').pop().toUpperCase();
  
  // ¡SOLUCIÓN! Usamos el ID correcto para cada página.
  const tituloElemento = document.getElementById('texto-titulo-juego') || document.getElementById('nombre-juego');
  if (tituloElemento) {
    tituloElemento.textContent = nombreJuego;
  }

  // --- ¡CORREGIDO! Poner imagen de fondo en la cabecera SOLO en la página de gestión ---
  // Comprobamos si estamos en la página de gestión antes de ejecutar
  if (document.body.classList.contains('gestion')) {
    const headerContainer = document.querySelector('.header-container');
    if (headerContainer) {
      // ¡SOLUCIÓN! Usamos el mapa de imágenes para obtener el nombre correcto.
      const nombreImagen = nombresImagenes[juegoId] || juegoId.split('/').pop();
      // La ruta es relativa a gestion_jugadores.html, que está en la raíz.
      const imageUrl = `assets/${nombreImagen}.jpg`;
      headerContainer.style.backgroundImage = `url('${imageUrl}')`;
    }
    // ¡SOLUCIÓN! Solo renderizamos la lista si estamos en la página de gestión.
    renderLista();
  }

  // Aseguramos que 'jugadores' sea siempre un array de strings.
  // Si por alguna razón se guarda algo incorrecto, lo reseteamos.
  if (!Array.isArray(jugadores) || jugadores.some(j => typeof j !== 'string')) {
    jugadores = [];
  }
});

// ----------------------------
// Renderizar lista
// ----------------------------
function renderLista() {
  const ul = document.getElementById('lista-jugadores');
  ul.innerHTML = "";

  jugadores.forEach((nombre, index) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = nombre;
    span.contentEditable = true;
    span.addEventListener('blur', () => {
      jugadores[index] = span.textContent.trim();
      guardarJugadores();
    });

    const btnEliminar = document.createElement('button');
    btnEliminar.innerHTML = '&times;'; // Usamos el carácter de multiplicación, más elegante
    btnEliminar.className = 'borrar-jugador';
    btnEliminar.addEventListener('click', () => eliminarJugador(index));

    li.appendChild(span);
    li.appendChild(btnEliminar);
    ul.appendChild(li);
  });
}

// ----------------------------
// Añadir jugador
// ----------------------------
function agregarJugador() {
  const input = document.getElementById('nombre-jugador');
  const nombre = input.value.trim();
  if (nombre === "") return;
  jugadores.push(nombre);
  input.value = "";
  guardarJugadores();
  renderLista();
}

// Permitir añadir pulsando Enter
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('nombre-jugador');
  // ¡SOLUCIÓN! Solo añadimos el listener si el input existe (estamos en gestion_jugadores.html)
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        agregarJugador();
      }
    });
  }
});

// ----------------------------
// Eliminar / Limpiar
// ----------------------------
function eliminarJugador(index) {
  jugadores.splice(index, 1);
  guardarJugadores();
  renderLista();
}

function limpiarJugadores() {
  if (confirm("¿Borrar todos los jugadores?")) {
    jugadores = [];
    guardarJugadores();
    renderLista();
  }
}

// ----------------------------
// Guardar en localStorage
// ----------------------------
function guardarJugadores() {
  const jugadoresJSON = JSON.stringify(jugadores);
  // Guardamos en la clave global para los juegos nuevos/actualizados.
  localStorage.setItem(getClaveLocalStorage(), jugadoresJSON);
  // ¡SOLUCIÓN DEFINITIVA! También guardamos en la clave "legacy" o antigua.
  // Esto da compatibilidad a los juegos que no han sido actualizados (Dominó, etc.)
  localStorage.setItem('jugadores', jugadoresJSON);
}

// ----------------------------
// Ir al juego seleccionado
// ----------------------------
function irAlJuego() {
  if (jugadores.length === 0) {
    alert("Agrega al menos un jugador antes de empezar.");
    return;
  }
  
  // ¡SOLUCIÓN! Guardamos la lista de jugadores justo antes de navegar.
  // Esto asegura que la página del juego recibirá la lista más actualizada.
  guardarJugadores();

  // Corregimos la lógica de redirección.
  // Ahora la ruta será, por ejemplo: 'continental/continental.html'
  // Aseguramos que siempre usamos el ID limpio, sin extensiones, por si se ha guardado un valor antiguo.
  const juegoId = (localStorage.getItem('juegoSeleccionado') || 'continental').replace('.html', '');
  
  // ¡SOLUCIÓN! Restauramos la lógica correcta de construcción de URL.
  let urlFinal;
  if (juegoId === 'Avaricioso') {
    // Caso especial para Avaricioso, que tiene un nombre de fichero diferente.
    urlFinal = 'Avaricioso/dadosavaricioso.html';
  } else {
    // Para todos los demás juegos, la carpeta y el fichero se llaman igual.
    // Ej: 'domino' -> 'domino/domino.html'
    urlFinal = `${juegoId}/${juegoId}.html`;
  }

  window.location.href = urlFinal;
}
