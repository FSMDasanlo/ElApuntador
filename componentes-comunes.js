/**
 * componentes-comunes.js
 * 
 * Este script se encarga de inyectar y gestionar componentes reutilizables
 * en las diferentes páginas de juegos, como los modales de ayuda.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Inyectamos el modal de ayuda para los comandos de voz.
    inyectarModalAyudaVoz();
});

/**
 * Crea el modal de ayuda de voz y lo añade al DOM.
 * También gestiona la lógica para mostrarlo y ocultarlo.
 */
function inyectarModalAyudaVoz() {
    // Obtenemos el juego actual para mostrar la ayuda contextual.
    const juegoSeleccionado = localStorage.getItem('juegoSeleccionado') || '';

    // Creamos el bloque de ayuda específico para "Carrera de Dados" solo si es el juego actual.
    const ayudaCarreraDados = juegoSeleccionado.includes('dadospuntos') ? `
        <h4>Para Carrera de Dados (con categoría):</h4>
        <p>Para este juego, debes especificar la categoría al final. Ejemplos:</p>
        <ul>
          <li><em>"Sandra 15 en Reyes"</em></li>
          <li><em>"Juan 8 en Rojos"</em></li>
          <li><em>"Jesús 6 en Ases"</em></li>
        </ul>` : '';

    // 1. Definimos el HTML del modal como un string.
    const htmlModalVoz = `
    <div id="modal-voz-ayuda" class="modal">
      <div class="modal-contenido">
        <span class="cerrar-voz">&times;</span>
        <h2>Comandos de Voz</h2>
        <p>Pulsa el botón <strong>"🎤 Iniciar voz"</strong> para iniciar la escucha. La aplicación rellenará la tabla a medida que dictes las puntuaciones.</p>
        
        <h4>Añadir Puntuación:</h4>
        <p>Di el nombre del jugador seguido de los puntos. Ejemplos:</p>
        <ul>
          <li><em>"Jesús veinte"</em></li>
          <li><em>"Ana menos cincuenta"</em></li>
        </ul>

        ${ayudaCarreraDados}
        <h4>Comandos Generales:</h4>
        <ul>
            <li><strong>"Deshacer"</strong> o <strong>"Corrige"</strong>: Borra la última puntuación introducida.</li>
            <li><strong>"Reiniciar"</strong> o <strong>"Borrar todo"</strong>: Limpia todas las puntuaciones de la tabla.</li>
            <li><strong>"Cómo vamos"</strong> o <strong>"Quién va ganando"</strong>: Lee el ranking actual.</li>
            <li><strong>"Cómo se juega"</strong> o <strong>"Instrucciones"</strong>: Abre el reglamento del juego.</li>
            <li><strong>"Apaga micro"</strong>: Detiene la escucha de voz.</li>
        </ul>
      </div>
    </div>`;

    // 2. Inyectamos el HTML al final del body.
    document.body.insertAdjacentHTML('beforeend', htmlModalVoz);

    // 3. Reutilizamos la lógica para mostrar y ocultar el modal.
    const modalVoz = document.getElementById("modal-voz-ayuda");
    const btnVozAyuda = document.getElementById("btn-voz-ayuda");
    const cerrarVoz = modalVoz.querySelector(".cerrar-voz");

    if (btnVozAyuda) {
        btnVozAyuda.addEventListener("click", () => { modalVoz.style.display = "block"; });
        cerrarVoz.addEventListener("click", () => { modalVoz.style.display = "none"; });
        // Añadimos el listener para cerrar al hacer clic fuera, que ahora servirá para todos los modales.
        window.addEventListener("click", (e) => { 
            if (e.target === modalVoz) modalVoz.style.display = "none";
        });
    }
}