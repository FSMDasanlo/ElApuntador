let jugadores = [];
const numJugadas = 7;

window.addEventListener('DOMContentLoaded', () => {
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

    const tdNombre = document.createElement('td');
    tdNombre.textContent = jugador.nombre;
    row.appendChild(tdNombre);

    jugador.puntos.forEach((valor,j) => {
      const td = document.createElement('td');
      td.contentEditable = "true";
      td.textContent = valor === 0 ? "" : valor;

      td.addEventListener('focus', () => { if(td.textContent==="0") td.textContent=""; });
      td.addEventListener('input', () => {
        let val = parseInt(td.textContent);
        if(isNaN(val)) val=0;
        jugador.puntos[j]=val;
        actualizarTotal(row,jugador);
        colorearTotales();
        actualizarRanking();
        resaltarPodio();
      });

      td.addEventListener('keydown', (e)=>{
        if(e.key==="Enter"){
          e.preventDefault();
          const cells = Array.from(td.parentElement.querySelectorAll('td[contenteditable="true"]'));
          const index = cells.indexOf(td);
          if(index < cells.length-1) cells[index+1].focus();
          else {
            const nextRow = td.parentElement.nextElementSibling;
            if(nextRow) nextRow.querySelector('td[contenteditable="true"]').focus();
          }
        }
      });

      row.appendChild(td);
    });

    const tdTotal = document.createElement('td');
    tdTotal.textContent = calcularTotal(jugador);
    tdTotal.classList.add('total');
    row.appendChild(tdTotal);

    tablaBody.appendChild(row);
  });

  colorearTotales();
  actualizarRanking();
  resaltarPodio();
}

function calcularTotal(jugador){
  return jugador.puntos.reduce((a,b)=>a+b,0);
}

function actualizarTotal(row,jugador){
  row.querySelector('.total').textContent = calcularTotal(jugador);
}

function limpiarPuntuaciones(){
  if(jugadores.length===0) return;
  if(!confirm("¿Seguro que quieres borrar todas las puntuaciones?")) return;
  jugadores.forEach(j=>j.puntos=Array(numJugadas).fill(0));
  actualizarTabla();
}

function colorearTotales(){
  const totales = Array.from(document.querySelectorAll('.total'));
  if(totales.length===0) return;
  const valores = totales.map(td=>parseInt(td.textContent)||0);
  const max = Math.max(...valores);
  const min = Math.min(...valores);

  totales.forEach(td=>{
    td.removeAttribute('maximo');
    td.removeAttribute('minimo');
    if(max!==min){
      if(td.textContent==max) td.setAttribute('maximo','');
      else if(td.textContent==min) td.setAttribute('minimo','');
    }
  });
}

function actualizarRanking(){
  const rankingDiv = document.getElementById('ranking-vivo');
  if(!rankingDiv) return;
  const sorted = [...jugadores].sort((a,b)=>calcularTotal(a)-calcularTotal(b));
  let html = "<h3>Ranking en vivo</h3><ol>";
  const limit = Math.min(3,sorted.length);
  for(let i=0;i<limit;i++){
    let medal='';
    if(i===0) medal='🥇 ';
    else if(i===1) medal='🥈 ';
    else if(i===2) medal='🥉 ';
    html += `<li>${medal}${sorted[i].nombre} — ${calcularTotal(sorted[i])} puntos</li>`;
  }
  html += "</ol>";
  rankingDiv.innerHTML=html;
}

function resaltarPodio(){
  const rows = Array.from(document.querySelectorAll('#tabla-puntos tbody tr'));
  rows.forEach(row=>row.classList.remove('top1','top2','top3'));
  const sorted = rows.slice().sort((a,b)=>
  parseInt(a.querySelector('.total').textContent||0) -
  parseInt(b.querySelector('.total').textContent||0)
);

  for(let i=0;i<3 && i<sorted.length;i++){
    sorted[i].classList.add(colores[i]);
  }
}

// Navegación
function irAGestionJugadores(){ window.location.href='gestion_jugadores.html'; }
function volverAJuegos(){ window.location.href='juegos.html'; }
