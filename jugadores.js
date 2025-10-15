let jugadores = JSON.parse(localStorage.getItem('jugadores')) || [];
let juegoSeleccionado = localStorage.getItem('juegoSeleccionado') || 'continental.html';

// Mostrar título dinámico con el juego seleccionado
window.addEventListener('DOMContentLoaded', () => {
  const titulo = document.getElementById('titulo-juego');
  const nombreJuego = juegoSeleccionado.replace('.html', '').replace(/_/g, ' ');
  titulo.textContent = `Entrada de jugadores para "${nombreJuego}"`;
  renderLista();
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
    btnEliminar.textContent = '❌';
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
  input.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarJugador();
    }
  });
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
  localStorage.setItem('jugadores', JSON.stringify(jugadores));
}

// ----------------------------
// Ir al juego seleccionado
// ----------------------------
function irAlJuego() {
  if (jugadores.length === 0) {
    alert("Agrega al menos un jugador antes de empezar.");
    return;
  }
  window.location.href = juegoSeleccionado;
}
