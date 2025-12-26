const preguntas = [...]; // Array de preguntas
let index = 0;
let respuestas = [];
let tiempo = 900;
const timerEl = document.getElementById('timer');
const progressBar = document.getElementById('progress');

function updateProgress() {
  const porcentaje = ((index) / preguntas.length) * 100;
  progressBar.style.width = porcentaje + '%';
}

function showQuestion() {
  if(index === 0) startTimer();
  updateProgress();

  // Renderiza pregunta + input
  const container = document.getElementById('form-container');
  container.innerHTML = `
    <div id="question">${preguntas[index]}</div>
    <input type="text" id="answer" placeholder="Escribe tu respuesta...">
    <button id="nextBtn">Listo</button>
    <div class="progress-container"><div class="progress-bar" id="progress"></div></div>
  `;
  document.getElementById('nextBtn').onclick = nextQuestion;
}

function nextQuestion() {
  const val = document.getElementById('answer').value.trim();
  if(!val) return alert("Debes responder");
  respuestas.push(val);
  index++;
  if(index < preguntas.length) showQuestion();
  else submitWL();
}

function startTimer() {
  const interval = setInterval(()=>{
    if(tiempo <=0){ clearInterval(interval); alert("⏰ Tiempo expirado"); return; }
    const min = Math.floor(tiempo/60);
    const sec = tiempo%60;
    timerEl.innerText = `Tiempo restante: ${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    tiempo--;
  },1000);
}
