function irAJuegos() {
  const overlay = document.querySelector('.overlay');
  overlay.classList.add('fade-out'); // Aplicamos la clase de desvanecimiento
  setTimeout(() => {
    window.location.href = "juegos.html"; // Redirige tras 1 segundo
  }, 1000);
}
// Redirigir automáticamente tras 10 segundos
setTimeout(irAJuegos, 10000);
