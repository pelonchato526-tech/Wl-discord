const startBtn = document.getElementById('startBtn');
const app = document.getElementById('app');

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
  "¿Qué significa valorar la vida?"
];

let index = 0;
let respuestas = [];
let tiempo = 900;
let timerInterval;

startBtn.onclick = () => {
  showQuestion();
  timerInterval = setInterval(()=>{
    tiempo--;
    if(tiempo<=0){ clearInterval(timerInterval); app.innerHTML="<h2>⏰ Tiempo agotado</h2>"; return; }
  },1000);
};

function showQuestion(){
  app.innerHTML = `
    <div class="progress-bar">
      <div class="progress" style="width:${(index/preguntas.length)*100}%"></div>
    </div>
    <h2>${preguntas[index]}</h2>
    <textarea id="answer" placeholder="Escribe tu respuesta"></textarea>
    <button id="nextBtn">Listo</button>
  `;
  document.getElementById('nextBtn').onclick = next;
}

async function next(){
  const val = document.getElementById('answer').value.trim();
  if(!val) return alert('Debes responder la pregunta');
  respuestas.push(val);
  index++;
  if(index < preguntas.length){
    showQuestion();
  }else{
    await submitWL();
  }
}

async function submitWL(){
  app.innerHTML = "<h2>Enviando WL...</h2>";
  const discordId = "TU_DISCORD_ID"; // reemplazar con variable de OAuth
  const res = await fetch('/wl-form',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({discordId,respuestas})
  });
  const data = await res.json();
  app.innerHTML = "<h2>"+(data.status==='ok'?'✅ WL enviada!':'❌ Error')+"</h2>";
}
