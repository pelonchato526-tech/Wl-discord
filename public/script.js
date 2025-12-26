const params = new URLSearchParams(window.location.search);
const discordId = params.get('discordId');
const username = params.get('username');

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
  "¿Está permitido hablar de temas de la vida real por chat de voz?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

let current = 0;
let respuestas = [];
let tiempo = 900; // 15 min
const formContainer = document.getElementById('formContainer');
const progressBar = document.getElementById('progressBar');
const timerEl = document.getElementById('timer');
const tituloForm = document.getElementById('tituloForm');

function actualizarProgress(){
  const perc = ((current)/preguntas.length)*100;
  progressBar.style.width = perc+'%';
}

function actualizarTimer(){
  const min = Math.floor(tiempo/60).toString().padStart(2,'0');
  const sec = (tiempo%60).toString().padStart(2,'0');
  timerEl.innerText = `⏳ Tiempo restante: ${min}:${sec}`;
  tiempo--;
  if(tiempo<0){
    clearInterval(timerInterval);
    formContainer.innerHTML = "<p>⛔ Tiempo agotado</p>";
  }
}

const timerInterval = setInterval(actualizarTimer,1000);

function mostrarPregunta(){
  actualizarProgress();
  formContainer.innerHTML = `
    <div>${preguntas[current]}</div>
    <textarea id="respuesta" placeholder="Escribe tu respuesta..."></textarea>
    <br/>
    <button id="nextBtn" class="btn">Siguiente</button>
  `;
  document.getElementById('nextBtn').onclick = ()=> {
    const val = document.getElementById('respuesta').value.trim();
    if(!val) return alert("Debes responder la pregunta");
    respuestas.push(val);
    current++;
    if(current<preguntas.length){
      mostrarPregunta();
    }else{
      enviarWL();
    }
  };
}

function enviarWL(){
  formContainer.innerHTML = "<p>Enviando WL...</p>";
  fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({discordId,respuestas})
  }).then(res=>res.json()).then(data=>{
    formContainer.innerHTML = data.ok?"<p>✅ WL enviada correctamente</p>":"<p>❌ Error al enviar</p>";
    clearInterval(timerInterval);
    progressBar.style.width = "100%";
  });
}

mostrarPregunta();
