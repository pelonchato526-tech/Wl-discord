// script.js

let currentQuestion = 0;
let respuestas = [];
let timer;
let tiempoRestante = 15 * 60; // 15 minutos en segundos
let wlCancelada = false;

const formContainer = document.getElementById('form-container');
const timerDiv = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');

function startTimer() {
  timerDiv.textContent = formatTime(tiempoRestante);
  timer = setInterval(() => {
    tiempoRestante--;
    timerDiv.textContent = formatTime(tiempoRestante);
    if (tiempoRestante <= 0) {
      clearInterval(timer);
      cancelarWL('Tiempo agotado');
    }
  }, 1000);
}

function formatTime(segundos) {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `Tiempo restante: ${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

function cancelarWL(reason) {
  wlCancelada = true;
  clearInterval(timer);
  formContainer.innerHTML = `<p>WL cancelada: ${reason}</p>`;
}

// Cancelar si cambias de pestaña o refrescas
window.addEventListener('beforeunload', (e) => {
  if(!wlCancelada) cancelarWL('Se cambió de página');
});

document.addEventListener('visibilitychange', () => {
  if(document.hidden && !wlCancelada){
    cancelarWL('Se cambió de pestaña');
  }
});

function mostrarPregunta() {
  if(currentQuestion >= preguntas.length){
    enviarWL();
    return;
  }

  const q = preguntas[currentQuestion];
  formContainer.innerHTML = `
    <p><strong>Pregunta ${currentQuestion+1}:</strong> ${q}</p>
    <textarea id="respuesta" rows="3" style="width:100%"></textarea>
    <br><button id="nextBtn">Siguiente</button>
    <div class="barra-progreso">
      <div class="relleno" style="width:${Math.floor((currentQuestion/preguntas.length)*100)}%"></div>
    </div>
  `;

  document.getElementById('nextBtn').addEventListener('click', () => {
    const resp = document.getElementById('respuesta').value.trim();
    respuestas.push(resp || 'No respondida');
    currentQuestion++;
    mostrarPregunta();
  });
}

async function enviarWL() {
  try {
    formContainer.innerHTML = `<p>Enviando WL...</p>`;
    clearInterval(timer);

    const res = await fetch('/wl-form', {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ discordId, respuestas })
    });

    const data = await res.json();
    if(data.error){
      formContainer.innerHTML = `<p>❌ Error: ${data.error}</p>`;
      return;
    }

    formContainer.innerHTML = `<p>✅ WL enviada correctamente. Espera tu resultado en Discord.</p>`;
  } catch(err){
    console.error(err);
    formContainer.innerHTML = `<p>❌ Error interno al enviar WL.</p>`;
  }
}

startBtn.addEventListener('click', ()=>{
  if(usuariosWL && usuariosWL[discordId] && usuariosWL[discordId].respondido){
    formContainer.innerHTML = `<p>Ya enviaste tu WL. Espera tu resultado.</p>`;
    return;
  }
  startTimer();
  mostrarPregunta();
});
