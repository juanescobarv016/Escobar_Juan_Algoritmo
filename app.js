// =====================
// 1) FORMATOS DE VIDEO
// =====================

const formatosVideo = [
  "Tutorial paso a paso",
  "Short vertical",
  "Vlog personal",
  "Entrevista",
  "Review de producto",
  "Análisis profundo",
  "Directo (stream)",
  "Storytelling",
  "Top 10 / Listas",
  "Reacción a tendencias"
];

// =====================
// 2) SEGMENTOS
// =====================

const segmentos = {
  "N": "Nuevo creador",
  "I": "Creador intermedio",
  "M": "Canal monetizado",
  "P": "Marca personal",
  "X": "Canal nicho específico"
};

// =====================
// 3) CONTEXTOS
// =====================

const contextos = {
  "V": "¿Cuál genera más viralidad?",
  "C": "¿Cuál ayuda a crecer más rápido?",
  "R": "¿Cuál conecta mejor con la audiencia?",
  "M": "¿Cuál tiene mayor potencial de monetización?"
};

// Elo
const RATING_INICIAL = 1000;
const K = 32;

const STORAGE_KEY = "youtubemash_state_v1";

function defaultState(){
  const buckets = {};
  for (const seg of Object.keys(segmentos)){
    for (const ctx of Object.keys(contextos)){
      const key = `${seg}__${ctx}`;
      buckets[key] = {};
      formatosVideo.forEach(f => buckets[key][f] = RATING_INICIAL);
    }
  }
  return { buckets, votes: [] };
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); }
  catch { return defaultState(); }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function expectedScore(ra, rb){
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, A, B, winner){
  const ra = bucket[A], rb = bucket[B];
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = (winner === "A") ? 1 : 0;
  const sb = (winner === "B") ? 1 : 0;

  bucket[A] = ra + K * (sa - ea);
  bucket[B] = rb + K * (sb - eb);
}

function randomPair(){
  const a = formatosVideo[Math.floor(Math.random() * formatosVideo.length)];
  let b = a;
  while (b === a){
    b = formatosVideo[Math.floor(Math.random() * formatosVideo.length)];
  }
  return [a, b];
}

function bucketKey(seg, ctx){ return `${seg}__${ctx}`; }

function topN(bucket, n=10){
  const arr = Object.entries(bucket).map(([formato, rating]) => ({formato, rating}));
  arr.sort((x,y) => y.rating - x.rating);
  return arr.slice(0, n);
}

// UI

const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnNewPair = document.getElementById("btnNewPair");
const btnShowTop = document.getElementById("btnShowTop");
const topBox = document.getElementById("topBox");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

let currentA = null;
let currentB = null;

function fillSelect(selectEl, obj){
  selectEl.innerHTML = "";
  for (const [k, v] of Object.entries(obj)){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

segmentSelect.value = "N";
contextSelect.value = "C";

function refreshQuestion(){
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel(){
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  refreshQuestion();
}

function renderTop(){
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const bucket = state.buckets[bucketKey(seg, ctx)];

  const rows = topN(bucket, 10);
  topBox.innerHTML = rows.map((r, idx) => `
    <div class="toprow">
      <div><b>${idx+1}.</b> ${r.formato}</div>
      <div>${r.rating.toFixed(1)}</div>
    </div>
  `).join("");
}

function vote(winner){
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const key = bucketKey(seg, ctx);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentos[seg],
    contexto: contextos[ctx],
    A: currentA,
    B: currentB,
    ganador: (winner === "A") ? currentA : currentB
  });

  saveState();
  renderTop();
  newDuel();
}

btnA.addEventListener("click", () => vote("A"));
btnB.addEventListener("click", () => vote("B"));
btnNewPair.addEventListener("click", () => newDuel());
btnShowTop.addEventListener("click", () => renderTop());

btnReset.addEventListener("click", () => {
  if (!confirm("Se borrarán todos los datos. ¿Continuar?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
});

btnExport.addEventListener("click", () => {
  if (state.votes.length === 0){
    alert("Aún no hay votos.");
    return;
  }

  const headers = ["ts","segmento","contexto","A","B","ganador"];
  const lines = [headers.join(",")];

  for (const v of state.votes){
    lines.push(headers.map(h => `"${v[h]}"`).join(","));
  }

  const blob = new Blob([lines.join("\n")], {type: "text/csv"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "youtubemash_votos.csv";
  a.click();
});

newDuel();
renderTop();
refreshQuestion();
