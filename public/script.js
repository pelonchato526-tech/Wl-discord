const app = document.getElementById("app");

let current = 0;
const respuestas = [];
let tiempo = 900; // 15 minutos
let timerInterval;
let wlStarted = false;

// Cancelar WL si refresca o cambia de pestaña
window.addEventListener("beforeunload", e=>{
  if(wlStarted){
    e.preventDefault();
    e.returnValue = '';
  }
});

// --- Mostrar formulario paso a paso ---
function startWL(){
  wlStarted = true;
  app.innerHTML = `
    <div class="card">
      <img src="/logo.png" class="logo">
      <div id="timer">Tiempo restante: 15:00</div>
      <div class="progress-container"><div class="progress-bar" id="progress"></div></div>
      <div class="question" id="question"></div>
      <input type="text" id="answer" placeholder="Escribe tu respuesta...">
      <button class="btn" id="nextBtn">Siguiente</button>
      <div class="footer">© 2025 La Piña RP</div>
    </div>
  `;
  timerInterval = setInterval(updateTimer, 1000);
  showQuestion();
}

function updateTimer(){
  if(tiempo<=0){
    clearInterval(timerInterval);
    app.innerHTML = "<h1>⏰ Tiempo expirado</h1>";
    return;
  }
  let min = Math.floor(tiempo/60);
  let sec = tiempo%60;
  document.getElementById("timer").innerText = `Tiempo restante: ${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  tiempo--;
}

function showQuestion(){
  document.getElementById("question").innerText = preguntas[current];
  document.getElementById("answer").value = "";
  document.getElementById("nextBtn").onclick = nextQuestion;
  updateProgress();
}

function nextQuestion(){
  const val = document.getElementById("answer").value.trim();
  if(!val){ alert("Debes responder"); return; }
  respuestas.push(val);
  current++;
  if(current<preguntas.length){
    showQuestion();
  }else{
    submitWL();
  }
}

function updateProgress(){
  const bar = document.getElementById("progress");
  bar.style.width = `${Math.round((current/preguntas.length)*100)}%`;
}

// --- Enviar WL ---
async function submitWL(){
  clearInterval(timerInterval);
  app.innerHTML = "<div class='card'><p>Enviando WL...</p></div>";
  try{
    const res = await fetch("/wl-form", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ discordId, respuestas })
    });
    const data = await res.json();
    if(data.status === "already"){
      app.innerHTML = `
        <div class="card">
          <img src="/logo.png" class="logo">
          <h1>WL ya completada</h1>
          <p>Estado: <b>${data.result}</b></p>
          <img src="${data.gif}" style="width:200px;margin-top:15px;">
          <div class="footer">© 2025 La Piña RP</div>
        </div>
      `;
    } else if(data.status === "ok"){
      app.innerHTML = `
        <div class="card">
          <img src="/logo.png" class="logo">
          <h1>✅ WL enviada correctamente</h1>
          <p>Espera a que el staff la revise.</p>
          <div class="footer">© 2025 La Piña RP</div>
        </div>
      `;
    } else {
      app.innerHTML = "<h1>❌ Error</h1>";
    }
  }catch(err){
    console.error(err);
    app.innerHTML = "<h1>❌ Error interno</h1>";
  }
}

// --- Mostrar botón iniciar si es la primera vez ---
app.innerHTML = `
  <div class="card">
    <img src="/logo.png" class="logo">
    <h1>WL Formulario - ${username}</h1>
    <div class="instructions">Presiona "Comenzar" para iniciar la WL</div>
    <button class="btn" id="startBtn">Comenzar</button>
    <div class="footer">© 2025 La Piña RP</div>
  </div>
`;

document.getElementById("startBtn").onclick = startWL;
