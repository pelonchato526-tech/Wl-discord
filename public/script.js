const startBtn = document.getElementById('startBtn');
const app = document.getElementById('app');
const timerEl = document.getElementById('timer');
const fill = document.getElementById('fill');

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
  "¿Está permitido hablar de temas de la vida real (fútbol, política, clima real) por el chat de voz del juego?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

let current = 0;
let respuestas = [];
let tiempo = 900;
let attempts = 0;
let timerInterval;

function startWL(){
  if(attempts >= 3){ alert("Ya superaste tus 3 intentos"); return; }
  attempts++;
  current=0;
  respuestas=[];
  showQuestion();
  timerInterval = setInterval(()=>{
    if(tiempo<=0){ clearInterval(timerInterval); cancelWL(); return; }
    let min = Math.floor(tiempo/60);
    let sec = tiempo%60;
    timerEl.innerText = `Tiempo restante: ${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    tiempo--;
  },1000);
}

function showQuestion(){
  app.innerHTML = `
    <img id="logo" src="logo.png"/>
    <h1>WL Formulario</h1>
    <p id="question">${preguntas[current]}</p>
    <input type="text" id="answer"/>
    <button id="nextBtn">Listo</button>
    <div id="progressBar"><div id="fill" style="width:${((current)/preguntas.length)*100}%"></div></div>
    <div id="timer">${timerEl.innerText}</div>
  `;
  document.getElementById('nextBtn').onclick = ()=>{
    const val = document.getElementById('answer').value.trim();
    if(!val){ alert("Debes responder"); return; }
    respuestas.push(val);
    fill.style.width = `${((current+1)/preguntas.length)*100}%`;
    current++;
    if(current < preguntas.length){
      showQuestion();
    } else {
      submitWL();
    }
  };
}

async function submitWL(){
  clearInterval(timerInterval);
  app.innerHTML = "<p>Enviando WL...</p>";
  const discordId = document.cookie.replace(/(?:(?:^|.*;\s*)discordId\s*\=\s*([^;]*).*$)|^.*$/,"$1");
  const res = await fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({discordId,respuestas})
  });
  const data = await res.json();
  app.innerHTML = `<p>${data.status==='ok'?'✅ WL enviada!':'❌ Error'}</p>`;
}

function cancelWL(){
  clearInterval(timerInterval);
  alert("❌ WL cancelada por cambio de pestaña o recarga");
  window.location.reload();
}

window.addEventListener('blur', cancelWL);
window.addEventListener('beforeunload', cancelWL);

startBtn.onclick = startWL;
