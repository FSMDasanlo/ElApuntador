document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tabla-puntos");
  const filaTotales = document.getElementById("fila-totales");
  const filaNombres = document.getElementById("fila-nombres");
  const cuerpoTabla = document.getElementById("cuerpo-tabla");
  const metaInput = document.getElementById("meta-puntos");

  const rankingContainer = document.createElement("div");
  rankingContainer.className = "ranking";
  rankingContainer.innerHTML = "<h3>Ranking en vivo</h3><ol id='ranking-list'></ol>";
  tabla.parentNode.appendChild(rankingContainer);

  let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];

// ===== Modal de ayuda =====
const btnAyuda = document.getElementById("btn-ayuda");
const modal = document.getElementById("modal-ayuda");
const spanCerrar = modal.querySelector(".cerrar");

btnAyuda.addEventListener("click", () => {
  modal.style.display = "block";
});

spanCerrar.addEventListener("click", () => {
  modal.style.display = "none";
});

// Cerrar modal haciendo clic fuera
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

  // -------------------- FUNCIONES --------------------

  window.agregarFila = function() {
    const tr = document.createElement("tr");
    jugadores.forEach(() => {
      const td = document.createElement("td");
      td.contentEditable = "true";
      td.addEventListener("input", () => {
        actualizarTotales();
        actualizarRanking();
      });
      td.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          saltarSiguienteCelda(td);
        }
      });
      tr.appendChild(td);
    });
    cuerpoTabla.appendChild(tr);
  };

  function inicializarTabla() {
    if (!cuerpoTabla) return; // Seguridad

    // Totales
    filaTotales.innerHTML = "";
    jugadores.forEach(() => {
      const th = document.createElement("th");
      th.textContent = 0;
      filaTotales.appendChild(th);
    });

    // Nombres
    filaNombres.innerHTML = "";
    jugadores.forEach(nombre => {
      const th = document.createElement("th");
      th.textContent = nombre;
      filaNombres.appendChild(th);
    });

    // Filas iniciales (10)
    cuerpoTabla.innerHTML = "";
    for (let i = 0; i < 10; i++) {
      window.agregarFila();
    }
  }

  function actualizarTotales() {
    const totales = jugadores.map((_, colIdx) => {
      let suma = 0;
      Array.from(cuerpoTabla.rows).forEach(row => {
        const val = parseInt(row.cells[colIdx].textContent || 0);
        if (!isNaN(val)) suma += val;
      });
      return suma;
    });

    Array.from(filaTotales.cells).forEach((cell, idx) => {
      cell.textContent = totales[idx];
    });
  }

  function actualizarRanking() {
    const rankingList = document.getElementById("ranking-list");
    rankingList.innerHTML = "";

    const totales = Array.from(filaTotales.cells).map(cell => parseInt(cell.textContent || 0));

    const maxTotal = Math.max(...totales);
    const minTotal = Math.min(...totales);

    Array.from(filaTotales.cells).forEach((cell, idx) => {
      cell.removeAttribute("maximo");
      cell.removeAttribute("minimo");
      if (totales[idx] === maxTotal) cell.setAttribute("maximo", "");
      else if (totales[idx] === minTotal) cell.setAttribute("minimo", "");
    });

    let ranking = jugadores.map((nombre, i) => ({nombre, puntos: totales[i]}));
    ranking.sort((a,b) => b.puntos - a.puntos);

    ranking.forEach((jug, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx+1}. ${jug.nombre} → ${jug.puntos}`;
      rankingList.appendChild(li);
    });
  }

  function saltarSiguienteCelda(td) {
    const row = td.parentElement;
    const index = Array.from(row.cells).indexOf(td);
    let nextRow = row.nextElementSibling;
    if (!nextRow) {
      window.agregarFila();
      nextRow = cuerpoTabla.lastElementChild;
    }
    nextRow.cells[index].focus();
  }

  window.limpiarPuntuaciones = function() {
    Array.from(cuerpoTabla.rows).forEach(row => {
      Array.from(row.cells).forEach(cell => cell.textContent = "");
    });
    actualizarTotales();
    actualizarRanking();
  };

  // -------------------- INICIALIZACIÓN --------------------
  inicializarTabla();
  actualizarTotales();
  actualizarRanking();

  metaInput.addEventListener("change", actualizarRanking);
});
