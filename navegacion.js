// =================================================
// NAVEGACION.JS - Lógica compartida en toda la app
// =================================================

/**
 * Obtiene la clave única para guardar/recuperar datos del localStorage
 * para el juego actualmente seleccionado.
 */
function getClaveLocalStorage() {
  const juegoSeleccionado = localStorage.getItem('juegoSeleccionado');
  // Si no hay juego seleccionado, usamos una clave genérica para no romper la funcionalidad.
  return juegoSeleccionado ? `jugadores_${juegoSeleccionado}` : 'jugadores_default';
}

/**
 * Redirige a la página del juego correspondiente, asegurando que la ruta
 * siempre se construya desde la raíz del sitio.
 */
function irAlJuego() {
  const juegoSeleccionado = localStorage.getItem('juegoSeleccionado');
  if (!juegoSeleccionado) {
    alert('No se ha seleccionado ningún juego. Volviendo a la selección.');
    window.location.href = '/juegos.html'; // Ruta absoluta
    return;
  }

  const clave = getClaveLocalStorage();
  const jugadores = JSON.parse(localStorage.getItem(clave)) || [];

  if (jugadores.length === 0) {
    alert('Debes añadir al menos un jugador para poder empezar a jugar.');
    return;
  }

  // ¡LA CLAVE! Usamos una ruta absoluta desde la raíz del sitio.
  // El '/' al principio le dice al navegador que empiece desde la raíz del servidor.
  const nombreJuego = juegoSeleccionado.toLowerCase();
  const juegoUrl = `/${nombreJuego}/${nombreJuego}.html`;

  window.location.href = juegoUrl;
}