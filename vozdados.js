// vozdados.js - Versión Final (Adaptada a Carrera de Dados)

document.addEventListener('DOMContentLoaded', () => {
    const btnVoz = document.getElementById('btn-voz');
    const btnDetenerVoz = document.getElementById('btn-detener-voz'); 
    const synth = window.speechSynthesis;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
    
    // --- Configuración de Gramática ---
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    // Rango de números ampliado para acomodar puntuaciones de dados (ej. 5 Ases * 6 ptos = 30)
    const numbers = 'cero | uno | dos | tres | cuatro | cinco | seis | siete | ocho | nueve | diez | once | doce | trece | catorce | quince | dieciséis | diecisiete | dieciocho | diecinueve | veinte | veintiuno | veintidós | veintitrés | veinticuatro | veinticinco | treinta | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 30'; 
    const grammar = `#JSGF V1.0; grammar numbers; public <number> = ${numbers} ;`;
    const speechRecognitionList = SpeechGrammarList ? new SpeechGrammarList() : null;
    if(speechRecognitionList) speechRecognitionList.addFromString(grammar, 1);
    // ----------------------------------------------------

    let recog = SpeechRecognition ? new SpeechRecognition() : null;
    let isRecording = false; 
    let currentResolve = null; 

    if(!recog){
        alert('Tu navegador no soporta reconocimiento de voz.');
        return;
    }

    // --- Inicialización y configuración del reconocedor (unmodified) ---
    recog.lang = 'es'; 
    recog.interimResults = false;
    recog.continuous = true; 
    if(speechRecognitionList) recog.grammars = speechRecognitionList;

    recog.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        if(currentResolve) {
            recog.stop(); 
            currentResolve(transcript);
        }
    };

    recog.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
            if(currentResolve) {
                recog.stop(); 
                currentResolve('');
            }
        } else {
            stopRecording();
            hablar("Ha ocurrido un error grave en el reconocimiento de voz.");
        }
    };

    recog.onend = () => {
        if (isRecording) { 
            try {
                recog.start(); 
            } catch (e) {
                console.warn("Recognition already started or error restarting.");
            }
        }
    };
    
    function escuchar() {
        return new Promise((resolve) => {
            if (!isRecording) return resolve('');
            currentResolve = resolve;
        });
    }

    function hablar(texto) {
        return new Promise((resolve) => {
            if (!synth || !isRecording) { 
                resolve();
                return;
            } 
            
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es';
            utterance.onend = resolve;
            utterance.onerror = () => {
                console.error("Speech synthesis error");
                resolve();
            };
            synth.speak(utterance);
        });
    }
    
    function startRecording() {
        if (isRecording) return; 
        isRecording = true;
        btnVoz.style.display = 'none';
        btnDetenerVoz.style.display = 'inline-block';
        try {
            recog.start(); 
            processVoiceInput(); 
        } catch (e) {
            console.error("Error starting recognition:", e);
            hablar("No se pudo iniciar la grabación de voz. Asegúrate de que el micrófono está disponible.");
            stopRecording();
        }
    }

    function stopRecording() {
        if (!isRecording) return;
        isRecording = false;
        btnVoz.style.display = 'inline-block';
        btnDetenerVoz.style.display = 'none';
        recog.stop(); 
    }

    btnVoz.addEventListener('click', startRecording);
    btnDetenerVoz.addEventListener('click', stopRecording);
    
    function parsearRespuesta(texto) {
        if (!texto) return NaN;

        const numMap = {
            'cero': 0, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 
            'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10, 'once': 11, 'doce': 12, 
            'trece': 13, 'catorce': 14, 'quince': 15, 'dieciséis': 16, 'diecisiete': 17, 
            'dieciocho': 18, 'diecinueve': 19, 'veinte': 20, 'veintiuno': 21, 'veintidós': 22, 
            'veintitrés': 23, 'veinticuatro': 24, 'veinticinco': 25, 'treinta': 30
        };

        let esNegativo = false;
        if (texto.startsWith('menos')) { 
            esNegativo = true;
            texto = texto.replace('menos', '').trim();
        }

        let num = NaN;
        if (!isNaN(parseInt(texto))) {
            num = parseInt(texto);
        } else if (numMap.hasOwnProperty(texto)) {
            num = numMap[texto];
        }

        if (isNaN(num)) return NaN;
        return esNegativo ? -num : num;
    }
    
    /**
     * Proceso principal de entrada de voz.
     */
    async function processVoiceInput() {
        
        if (!window.rondasActuales || !window.CATEGORY_NAMES) {
            await hablar("Error: No se ha cargado la estructura del juego. Vuelve a cargar la página.");
            stopRecording();
            return;
        }

        const filas = document.querySelectorAll('#cuerpo-tabla-ascendente tr');

        let colActual = 0; 
        let allRoundsFilled = true;
        const totalRounds = window.rondasActuales.todas.length;

        // 1. Buscar la primera celda que NO tenga valor para determinar la ronda actual
        for (let i = 0; i < totalRounds; i++) {
            const celda = document.querySelector(`.ronda-${i}`);
            if (celda && celda.textContent.trim() === '') {
                colActual = i;
                allRoundsFilled = false;
                break; 
            }
        }
        
        if (allRoundsFilled) {
            await hablar("El juego ha terminado. Todas las rondas están completas.");
            stopRecording();
            return;
        }
        
        if (filas.length === 0) {
            await hablar("No hay jugadores.");
            stopRecording();
            return;
        }
        
        // 2. Identificar la categoría y el tipo de ronda (Libre 0-5 o Obligada 6-11)
        const categoriaSimbolo = window.rondasActuales.todas[colActual]; // Ej: "N"
        const categoriaNombre = window.CATEGORY_NAMES[categoriaSimbolo]; // Ej: "Negros (1 pto)"
        const tipoRonda = colActual < 6 ? "Libre" : "Obligada";
        
        // 3. Mensaje de voz adaptado
        await hablar(`Comenzando la ronda ${categoriaNombre} en la sección ${tipoRonda}.`); 

        // Bucle principal: pide el valor a cada jugador
        for(const f of filas){ 
            if(!isRecording) break; 
            
            const nombre = f.cells[0].textContent;
            await hablar(`Puntos para ${nombre}`);
            
            if(!isRecording) break; 

            let resp = '';
            let intentos = 0;
            let num = NaN;
            
            while(isNaN(num) && intentos < 3 && isRecording){ 
                if (intentos > 0) {
                    await hablar(`No he entendido. Por favor, di solo el número de puntos para ${nombre}.`);
                }
                resp = await escuchar(); 
                num = parsearRespuesta(resp);
                intentos++;
            }

            // --- Escribir el resultado en la celda correcta ---
            const celdaAfectada = document.querySelector(`tr[data-jugador="${nombre}"] .ronda-${colActual}`);

            if(celdaAfectada){
                if(!isNaN(num)){
                    celdaAfectada.textContent = num;
                } else if (isRecording) { 
                    await hablar(`No he entendido el número después de ${intentos} intentos. Poniendo cero para ${nombre}.`);
                    celdaAfectada.textContent = '0'; 
                }
            }
        }
        
        if(window.calcularPuntuaciones) window.calcularPuntuaciones();
        if(window.actualizarRanking) window.actualizarRanking();

        if(isRecording){
            await hablar("Ronda completada. Dime puntos para la siguiente ronda cuando quieras.");
            processVoiceInput();
        }
    }
});