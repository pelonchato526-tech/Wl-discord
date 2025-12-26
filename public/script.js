const preguntas = [
  "¿Qué es el MetaGaming (MG)?",
  "Si mueres y reapareces en el hospital (PK), ¿qué debes hacer?",
  "¿Qué es el PowerGaming (PG)?",
  "Te están atracando con un arma en la cabeza. ¿Cómo actúas?",
  "¿Qué significa OOC (Out Of Character)?",
  "¿Qué es el VDM (Vehicle Deathmatch)?",
  "¿Cuál es el procedimiento si ves a alguien incumpliendo las normas?",
  "¿Qué es el Combat Logging?",
  "¿Qué es el Bunny Jump?",
  "¿Está permitido hablar de temas de la vida real por el chat de voz?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa Valorar la vida?"
];

let index = 0;
let respuestas = [];
let tiempo = 15 * 60; // 15 minutos
let timerInterval;

const app = document.getElementById("app");

// --- Inicializa la pantalla ---
function pantallaInicio() {
  mostrarPregunta();
}

// --- Timer ---
function iniciarTimer() {
  timerInterval = setInterval(() => {
    tiempo--;
    const min = String(Math.floor(tiempo / 60)).padStart(2, '0');
    const sec = String(tiempo % 60).padStart(2, '0');
    const timerEl = document.getElementById("timer");
    if(timerEl) timerEl.innerText = `⏳ Tiempo restante: ${min}:${sec}`;

    if (tiempo <= 0) {
      clearInterval(timerInterval);
      app.innerHTML = "<h1>⛔ Tiempo agotado</h1>";
    }
  }, 1000);
}

// --- Muestra pregunta ---
function mostrarPregunta() {
  if(index === 0) iniciarTimer();

  const progreso = Math.round((index / preguntas.length) * 100);

  app.innerHTML = `
    <div class="timer" id="timer">⏳ Tiempo restante: 15:00</div>
    <div class="progress"><div style="width:${progreso}%;background:#FFD700;height:100%;border-radius:10px;"></div></div>
    <div class="question">${preguntas[index]}</div>
    <textarea id="respuesta" placeholder="Escribe tu respuesta..."></textarea>
    <button class="btn" onclick="siguiente()">Siguiente</button>
  `;
}

// --- Siguiente pregunta ---
function siguiente() {
  const val = document.getElementById("respuesta").value.trim();
  if(!val) return alert("Debes responder la pregunta");

  respuestas.push(val);
  index++;

  if(index < preguntas.length) {
    mostrarPregunta();
  } else {
    enviarWL();
  }
}

// --- Enviar WL ---
async function enviarWL() {
  clearInterval(timerInterval);
  app.innerHTML = "<h1>📨 Enviando WL...</h1>";

  try {
    const resp = await fetch("/wl-form", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ respuestas })
    });
    const data = await resp.json();
    if(data.ok){
      app.innerHTML = "<h1>✅ WL enviada correctamente</h1>";
    } else {
      app.innerHTML = `<h1>❌ ${data.mensaje}</h1>`;
    }
  } catch(e){
    console.error(e);
    app.innerHTML = "<h1>❌ Error al enviar WL</h1>";
  }
}

pantallaInicio();
