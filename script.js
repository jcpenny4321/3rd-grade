//AUDIO (Web Audio API synth sounds) ──────────────────────
const AC = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, dur, vol=0.3, delay=0) {
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = type; o.frequency.setValueAtTime(freq, AC.currentTime + delay);
  g.gain.setValueAtTime(vol, AC.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + delay + dur);
  o.start(AC.currentTime + delay);
  o.stop(AC.currentTime + delay + dur);
}

function soundClick() {
  playTone(800, 'sine', 0.06, 0.12);
}

function soundCorrect() {
  playTone(523, 'sine', 0.15, 0.25);
  playTone(659, 'sine', 0.15, 0.25, 0.12);
  playTone(784, 'sine', 0.2,  0.3,  0.24);
  playTone(1047,'sine', 0.2,  0.3,  0.36);
}

function soundWrong() {
  playTone(300, 'sawtooth', 0.12, 0.15);
  playTone(250, 'sawtooth', 0.15, 0.15, 0.12);
}

function soundStreakBonus() {
  [523,659,784,1047,1319].forEach((f,i) => playTone(f,'sine',0.12,0.2,i*0.08));
}

// ── STATE ──────────────────────────────────────────────────
const SET_SIZE = 15;
let selectedTables = [2,3,4,5,6,7,8,9,10,11,12];
let questionQueue = [];
let currentQ = null;
let currentInput = '';
let score = 0;
let streak = 0;
let bestStreak = 0;
let correctCount = 0;
let questionIndex = 0;
let bonusPoints = 0;
let locked = false;

// ── TABLE SELECTOR ──────────────────────────────────────────
function buildTableGrid() {
  const grid = document.getElementById('table-grid');
  grid.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const btn = document.createElement('button');
    btn.className = 'tbl-btn' + (selectedTables.includes(i) ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => toggleTable(i, btn);
    grid.appendChild(btn);
  }
}

function toggleTable(n, btn) {
  soundClick();
  if (selectedTables.includes(n)) {
    if (selectedTables.length === 1) return; // keep at least one
    selectedTables = selectedTables.filter(t => t !== n);
    btn.classList.remove('active');
  } else {
    selectedTables.push(n);
    btn.classList.add('active');
  }
}

function selectAll()  { selectedTables = Array.from({length:12},(_,i)=>i+1); buildTableGrid(); }
function clearAll()   { selectedTables = [2]; buildTableGrid(); }
function selectHard() { selectedTables = [6,7,8,9,10,11,12]; buildTableGrid(); }

// ── QUESTION GENERATION ─────────────────────────────────────
function buildQueue() {
  const qs = [];
  // Fill 15 questions; repeat harder (6–12) more
  while (qs.length < SET_SIZE) {
    const table = selectedTables[Math.floor(Math.random() * selectedTables.length)];
    // Bias: 60% chance of multiplier 6-12 if available
    const hardPool = [6,7,8,9,10,11,12];
    let mult;
    if (Math.random() < 0.6 && hardPool.length) {
      mult = hardPool[Math.floor(Math.random() * hardPool.length)];
    } else {
      mult = Math.floor(Math.random() * 12) + 1;
    }
    // Avoid exact duplicate consecutive
    const last = qs[qs.length - 1];
    if (last && last.a === table && last.b === mult) continue;
    qs.push({ a: table, b: mult, answer: table * mult });
  }
  return qs;
}

// ── DISPLAY ─────────────────────────────────────────────────
function renderQuestion() {
  if (!currentQ) return;
  document.getElementById('num-a').textContent = currentQ.a;
  document.getElementById('num-b').textContent = currentQ.b;
  document.getElementById('prob-answer').style.opacity = 0;
  document.getElementById('q-counter').textContent = `Question ${questionIndex} of ${SET_SIZE}`;
  document.getElementById('correct-val').textContent = `${correctCount}/${questionIndex-1||'?'}`;

  // reset screen
  currentInput = '';
  updateScreen();
  resetBanner();
  locked = false;

  // progress
  const pct = ((questionIndex - 1) / SET_SIZE) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
}

function updateScreen() {
  const sv = document.getElementById('screen-value');
  sv.textContent = currentInput || '_';
  sv.className = 'screen-value';
}

function resetBanner() {
  const b = document.getElementById('answer-banner');
  b.className = 'answer-banner';
  b.textContent = 'Type your answer and press Enter! ✏️';
  const ft = document.getElementById('feedback-text');
  ft.className = 'feedback-text';
  ft.textContent = '';
}

function updateStats() {
  document.getElementById('score-val').textContent = score;
  document.getElementById('streak-val').textContent = `🔥 ${streak}`;
  document.getElementById('correct-val').textContent = `${correctCount}/${questionIndex}`;
}

// ── INPUT ────────────────────────────────────────────────────
function pressNum(n) {
  if (locked) return;
  if (currentInput.length >= 3) return;
  soundClick();
  rippleBtn(event && event.currentTarget);
  currentInput += n;
  updateScreen();
}

function pressClear() {
  if (locked) return;
  soundClick();
  currentInput = currentInput.slice(0, -1);
  updateScreen();
}

function pressEnter() {
  if (locked || !currentInput) return;
  submitAnswer();
}

function rippleBtn(btn) {
  if (!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple';
  r.style.width = r.style.height = '60px';
  r.style.left = '50%'; r.style.top = '50%';
  r.style.marginLeft = r.style.marginTop = '-30px';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 400);
}

// keyboard
document.addEventListener('keydown', e => {
  if (AC.state === 'suspended') AC.resume();
  if (e.key >= '0' && e.key <= '9') pressNum(e.key);
  else if (e.key === 'Backspace') pressClear();
  else if (e.key === 'Enter') pressEnter();
  // highlight btn
  const btn = document.querySelector(`[data-val="${e.key}"]`);
  if (btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 120);
  }
});

// resume AC on any click
document.addEventListener('click', () => { if (AC.state === 'suspended') AC.resume(); }, {once: true});

// ── SUBMIT ───────────────────────────────────────────────────
function submitAnswer() {
  locked = true;
  const userAns = parseInt(currentInput, 10);
  const isCorrect = userAns === currentQ.answer;

  const sv = document.getElementById('screen-value');
  const banner = document.getElementById('answer-banner');
  const ft = document.getElementById('feedback-text');

  if (isCorrect) {
    // correct
    soundCorrect();
    sv.className = 'screen-value correct';
    banner.className = 'answer-banner correct';

    const msgs = ['✅ Correct! Amazing! 🌟','✅ Yes! Brilliant! 🎉','✅ That\'s right! 🔥','✅ Perfect! Keep going! ⚡'];
    banner.textContent = msgs[Math.floor(Math.random() * msgs.length)];

    streak++;
    correctCount++;
    score += 10;

    // streak bonus
    if (streak > 0 && streak % 3 === 0) {
      score += 5;
      bonusPoints += 5;
      soundStreakBonus();
      ft.textContent = `+5 streak bonus! 🔥`;
      ft.className = 'feedback-text show';
    }

    if (streak > bestStreak) bestStreak = streak;

  } else {
    // wrong
    soundWrong();
    sv.className = 'screen-value wrong';
    banner.className = 'answer-banner wrong';
    banner.innerHTML = `❌ The answer is <strong>${currentQ.a} × ${currentQ.b} = ${currentQ.answer}</strong>`;

    // show correct answer in problem area
    const pa = document.getElementById('prob-answer');
    pa.textContent = currentQ.answer;
    pa.style.opacity = 1;

    // shake game card
    const gc = document.getElementById('game-card');
    gc.classList.remove('shake');
    void gc.offsetWidth;
    gc.classList.add('shake');
    setTimeout(() => gc.classList.remove('shake'), 400);

    streak = 0;
  }

  updateStats();

  // next question after delay
  setTimeout(() => {
    questionIndex++;
    if (questionIndex > SET_SIZE) {
      showEndScreen();
    } else {
      currentQ = questionQueue[questionIndex - 1];
      renderQuestion();
    }
  }, isCorrect ? 900 : 1600);
}

// ── END SCREEN ───────────────────────────────────────────────
function showEndScreen() {
  const pct = correctCount / SET_SIZE;
  document.getElementById('progress-bar').style.width = '100%';
  document.getElementById('end-score').textContent = score;
  document.getElementById('end-correct').textContent = `${correctCount}/15`;
  document.getElementById('end-best-streak').textContent = bestStreak;
  document.getElementById('end-bonus').textContent = '+' + bonusPoints;

  let stars, emoji, title;
  if (pct >= 0.93)      { stars = '⭐⭐⭐'; emoji = '🏆'; title = 'Perfect Score!'; }
  else if (pct >= 0.73) { stars = '⭐⭐'; emoji = '🎉'; title = 'Great Job!'; }
  else                  { stars = '⭐'; emoji = '💪'; title = 'Keep Practicing!'; }

  document.getElementById('end-stars').textContent = stars;
  document.getElementById('end-emoji').textContent = emoji;
  document.getElementById('end-title').textContent = title;

  document.getElementById('end-overlay').classList.add('show');
  if (pct >= 0.7) launchConfetti();
}

// ── CONFETTI ─────────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    r: Math.random() * 8 + 4,
    d: Math.random() * 6 + 2,
    color: ['#FF6B2B','#FFD23F','#FF3D3D','#2ECC71','#3498DB','#9B59B6'][Math.floor(Math.random()*6)],
    tilt: Math.random() * 20 - 10,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05,
  }));
  let frame;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += p.d;
      p.x += Math.sin(p.tiltAngle) * 2;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r/4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.r);
      ctx.stroke();
    });
    if (pieces.some(p => p.y < canvas.height + 20)) {
      frame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  }
  draw();
  setTimeout(() => { cancelAnimationFrame(frame); ctx.clearRect(0,0,canvas.width,canvas.height); }, 4000);
}

// ── RESTART ──────────────────────────────────────────────────
function restartGame() {
  document.getElementById('end-overlay').classList.remove('show');
  score = 0; streak = 0; bestStreak = 0; correctCount = 0;
  questionIndex = 1; bonusPoints = 0; locked = false;
  questionQueue = buildQueue();
  currentQ = questionQueue[0];
  updateStats();
  document.getElementById('progress-bar').style.width = '0%';
  renderQuestion();
}

// ── FLOATING STARS ───────────────────────────────────────────
function buildStars() {
  const container = document.getElementById('stars');
  const emojis = ['⭐','✨','🌟','💫'];
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.textContent = emojis[i % emojis.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.top  = Math.random() * 100 + 'vh';
    s.style.animationDelay = (Math.random() * 6) + 's';
    s.style.animationDuration = (5 + Math.random() * 5) + 's';
    s.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
    container.appendChild(s);
  }
}

// ── INIT ─────────────────────────────────────────────────────
buildStars();
buildTableGrid();
restartGame();