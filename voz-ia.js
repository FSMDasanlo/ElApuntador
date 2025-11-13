document.addEventListener('DOMContentLoaded', () => {
  const btnVoz = document.getElementById('btn-voz');
  const btnDetenerVoz = document.getElementById('btn-detener-voz');

  // Comprobamos si el navegador soporta la API de MediaRecorder
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    console.error('La grabación de audio no es soportada en este navegador.');
    btnVoz.disabled = true;
    btnVoz.textContent = '🎤 No Soportado';
    return;
  }

  let mediaRecorder;
  let audioChunks = [];

  const iniciarGrabacion = async () => {
    try {
      // 1. Pedimos permiso para usar el micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Creamos una instancia de MediaRecorder
      mediaRecorder = new MediaRecorder(stream);

      // 3. Cuando el grabador recibe datos (audio), los guardamos
      mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
      });

      // 4. Cuando la grabación se detiene, procesamos el audio
      mediaRecorder.addEventListener('stop', () => {
        // Creamos un "Blob", que es como un archivo de audio en memoria
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Limpiamos para la próxima grabación
        audioChunks = [];

        // Enviamos el audio al servidor para que la IA lo procese
        enviarAudioAlServidor(audioBlob);

        // Detenemos el acceso al micrófono para apagar el indicador de grabación
        stream.getTracks().forEach(track => track.stop());
      });

      // 5. Empezamos a grabar y actualizamos la interfaz
      mediaRecorder.start();
      btnVoz.style.display = 'none';
      btnDetenerVoz.style.display = 'inline-block';

    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Asegúrate de dar permiso.');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      btnVoz.style.display = 'inline-block';
      btnDetenerVoz.style.display = 'none';
    }
  };

  // Asignamos los eventos a los botones
  btnVoz.addEventListener('click', iniciarGrabacion);
  btnDetenerVoz.addEventListener('click', detenerGrabacion);
});

/**
 * Envía el audio a un servidor (backend) para su transcripción.
 * ESTA ES LA PARTE QUE NECESITA UN SERVIDOR REAL.
 * @param {Blob} audioBlob El audio grabado.
 */
async function enviarAudioAlServidor(audioBlob) {
  console.log("Enviando audio al servidor...");

  // Obtenemos la lista de jugadores para enviarla al backend
  const jugadores = localStorage.getItem("jugadores") || "[]";

  // Usamos FormData para empaquetar el archivo de audio
  const formData = new FormData();
  formData.append('audio', audioBlob, 'grabacion.webm');
  formData.append('jugadores', jugadores); // Enviamos los nombres como pista a la IA

  try {
    // --- ¡CONEXIÓN REAL AL BACKEND! ---
    // Usamos la URL completa porque el frontend (Go Live) y el backend están en puertos diferentes.
    const response = await fetch('http://localhost:3000/transcribir', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('Datos recibidos de la IA:', data);
    // ¡AQUÍ ESTÁ LA CONEXIÓN!
    // Llamamos a la función global que creamos en pocha.js
    if (data && window.actualizarPuntosPorVoz && data.jugador && data.puntos !== undefined) {
      window.actualizarPuntosPorVoz(data.jugador, data.puntos);
    }

  } catch (error) {
    console.error('Error al enviar audio al servidor:', error);
    alert('Hubo un error al procesar el audio. Revisa la consola del servidor.');
  }
}