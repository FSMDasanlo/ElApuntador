// Carga el script genérico y luego lo inicializa con la configuración para "El Avaricioso"
const script = document.createElement('script');
script.src = 'juego-columnas.js';
script.onload = () => {
  inicializarJuegoColumnas({
    idTabla: "tabla-puntos",
    idFilaTotales: "fila-totales",
    idFilaNombres: "fila-nombres",
    idCuerpoTabla: "cuerpo-tabla",
    idMetaPuntos: "meta-puntos",
    idBtnAyuda: "btn-ayuda",
    idModalAyuda: "modal-ayuda"
  });
};
document.head.appendChild(script);
