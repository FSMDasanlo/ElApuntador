let jugadores = [];
const numJugadas = 7;

window.addEventListener('DOMContentLoaded', () => {
  // Cargar nombres desde gestion_jugadores.html
  const nombresGuardados = JSON.parse(localStorage.getItem('jugadores')) || [];
  jugadores = nombresGuardados.map(nombre => ({
    nombre: nombre,
    puntos: Array(numJugadas).fill(0)
  }));
  actualizarTabla();
});

function actualizarTabla() {
  const tablaBody = document.querySelector('#tabla-puntos tbody');

  tablaBody.innerHTML = "";
  jugadores.forEach((jugador) => {
    const row = document.createElement('tr');

    // Nombre
    const tdNombre = document.createElement('td');
    tdNombre.textContent = jugador.nombre;
    row.appendChild(tdNombre);

    // Celdas de jugadas
    jugador.puntos.forEach((valor, j) => {
      const td = document.createElement('td');
      td.contentEditable = "true";
      td.textContent = valor;
      td.addEventListener('input', () => {
        let val = parseInt(td.textContent);
        if (isNaN(val)) val = 0;
        jugador.puntos[j] = val;
        actualizarTotal(row, jugador);
        colorearTotales();
      });
      row.appendChild(td);
    });

    // Total
    const tdTotal = document.createElement('td');
    tdTotal.textContent = calcularTotal(jugador);
    tdTotal.classList.add('total');
    row.appendChild(tdTotal);

    tablaBody.appendChild(row);
  });

  colorearTotales();
}

function calcularTotal(jugador) {
  return jugador.puntos.reduce((a, b) => a + b, 0);
}

function actualizarTotal(row, jugador) {
  const totalTd = row.querySelector('.total');
  totalTd.textContent = calcularTotal(jugador);
}

function limpiarPuntuaciones() {
  if (jugadores.length === 0) return;
  if (!confirm("¿Seguro que quieres borrar todas las puntuaciones?")) return;

  jugadores.forEach(j => j.puntos = Array(numJugadas).fill(0));
  actualizarTabla();
}

function colorearTotales() {
  const totales = Array.from(document.querySelectorAll('.total'));
  if (totales.length === 0) return;

  const valores = totales.map(td => parseInt(td.textContent) || 0);
  const max = Math.max(...valores);
  const min = Math.min(...valores);

  totales.forEach((td, i) => {
    td.style.backgroundColor = '';
    if (max !== min) {
      if (valores[i] === max) {
        td.style.backgroundColor = '#a8f0a1'; // verde
      } else if (valores[i] === min) {
        td.style.backgroundColor = '#ffd7a1'; // naranja
      } else {
        td.style.backgroundColor = '#e2ffe2'; // neutro
      }
    } else {
      td.style.backgroundColor = '#e2ffe2';
    }
  });
}

function irAGestionJugadores() {
  window.location.href = 'gestion_jugadores.html';
}

function volverAJuegos() {
  window.location.href = 'juegos.html';
}
function colorearTotales() {
  const totales = Array.from(document.querySelectorAll('.total'));
  if (totales.length === 0) return;

  const valores = totales.map(td => parseInt(td.textContent) || 0);
  const max = Math.max(...valores);
  const min = Math.min(...valores);

  totales.forEach((td, i) => {
    td.removeAttribute('maximo');
    td.removeAttribute('minimo');
    if (max !== min) {
      if (valores[i] === max) {
        td.setAttribute('maximo', '');
      } else if (valores[i] === min) {
        td.setAttribute('minimo', '');
      }
    }
  });
}
