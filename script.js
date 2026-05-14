//AUDIO (Web Audio API synth sounds) ──────────────────────

// Create the "sound machine" that makes all our noises
const AC = new (window.AudioContext || window.webkitAudioContext)();

// A recipe for making ONE beep sound
// freq = how high/low the sound is, type = what kind of sound, dur = how long it lasts
function playTone(freq, type, dur, vol=0.3, delay=0) {
  const o = AC.createOscillator(); // makes the sound wave
  const g = AC.createGain();       // controls the volume
  o.connect(g); g.connect(AC.destination); // plug them together like LEGO
  o.type = type; o.frequency.setValueAtTime(freq, AC.currentTime + delay); // set the pitch
  g.gain.setValueAtTime(vol, AC.currentTime + delay);                       // set the volume
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + delay + dur); // fade out smoothly
  o.start(AC.currentTime + delay); // start the sound
  o.stop(AC.currentTime + delay + dur); // stop when done
}

// A small click sound when you press a button
function soundClick() {
  playTone(800, 'sine', 0.06, 0.12);
}

// A happy rising tune when you get an answer right
function soundCorrect() {
  playTone(523, 'sine', 0.15, 0.25);
  playTone(659, 'sine', 0.15, 0.25, 0.12);
  playTone(784, 'sine', 0.2,  0.3,  0.24);
  playTone(1047,'sine', 0.2,  0.3,  0.36);
}

// A buzzy low sound when you get an answer wrong
function soundWrong() {
  playTone(300, 'sawtooth', 0.12, 0.15);
  playTone(250, 'sawtooth', 0.15, 0.15, 0.12);
}

// A fast happy tune when you get a streak bonus
function soundStreakBonus() {
  [523,659,784,1047,1319].forEach((f,i) => playTone(f,'sine',0.12,0.2,i*0.08));
}

// ── STATE ──────────────────────────────────────────────────

// How many questions are in one round
const SET_SIZE = 15;

// Which times tables are turned on (default: 2 through 12)
let selectedTables = [2,3,4,5,6,7,8,9,10,11,12];

// The list of questions for this round
let questionQueue = [];

// The question currently on screen
let currentQ = null;

// What the player has typed so far
let currentInput = '';

// The player's total score
let score = 0;

// How many correct answers in a row
let streak = 0;

// The highest streak ever reached
let bestStreak = 0;

// How many questions answered correctly
let correctCount = 0;

// Which question number we're on
let questionIndex = 0;

// Extra bonus points earned from streaks
let bonusPoints = 0;

// Stops the player from typing while the game is checking an answer
let locked = false;

// ── TABLE SELECTOR ──────────────────────────────────────────

// Draws the grid of number buttons (1–12) for picking times tables
function buildTableGrid() {
  const grid = document.getElementById('table-grid');
  grid.innerHTML = ''; // clear old buttons first
  for (let i = 1; i <= 12; i++) {
    const btn = document.createElement('button');
    // highlight the button if that table is selected
    btn.className = 'tbl-btn' + (selectedTables.includes(i) ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => toggleTable(i, btn); // clicking it turns it on or off
    grid.appendChild(btn);
  }
}

// Turns a times table on or off when you click it
function toggleTable(n, btn) {
  soundClick();
  if (selectedTables.includes(n)) {
    if (selectedTables.length === 1) return; // you must keep at least one table on!
    selectedTables = selectedTables.filter(t => t !== n); // remove it
    btn.classList.remove('active'); // un-highlight the button
  } else {
    selectedTables.push(n); // add it
    btn.classList.add('active'); // highlight the button
  }
}

// Turns ALL tables on
function selectAll()  { selectedTables = Array.from({length:12},(_,i)=>i+1); buildTableGrid(); }

// Turns all off except 2 (the minimum)
function clearAll()   { selectedTables = [2]; buildTableGrid(); }

// Turns on only the tricky tables (6–12)
function selectHard() { selectedTables = [6,7,8,9,10,11,12]; buildTableGrid(); }

// ── QUESTION GENERATION ─────────────────────────────────────

// Builds a fresh list of 15 questions
function buildQueue() {
  const qs = [];
  while (qs.length < SET_SIZE) {
    // pick a random times table from the selected ones
    const table = selectedTables[Math.floor(Math.random() * selectedTables.length)];

    // 60% of the time, pick a harder multiplier (6–12)
    const hardPool = [6,7,8,9,10,11,12];
    let mult;
    if (Math.random() < 0.6 && hardPool.length) {
      mult = hardPool[Math.floor(Math.random() * hardPool.length)];
    } else {
      mult = Math.floor(Math.random() * 12) + 1; // any multiplier 1–12
    }

    // Don't repeat the same question twice in a row
    const last = qs[qs.length - 1];
    if (last && last.a === table && last.b === mult) continue;

    qs.push({ a: table, b: mult, answer: table * mult }); // save the question + correct answer
  }
  return qs;
}

// ── DISPLAY ─────────────────────────────────────────────────

// Puts the current question on screen and resets everything for a fresh attempt
function renderQuestion() {
  if (!currentQ) return;
  document.getElementById('num-a').textContent = currentQ.a; // show first number
  document.getElementById('num-b').textContent = currentQ.b; // show second number
  document.getElementById('prob-answer').style.opacity = 0;  // hide the answer box
  document.getElementById('q-counter').textContent = `Question ${questionIndex} of ${SET_SIZE}`;
  document.getElementById('correct-val').textContent = `${correctCount}/${questionIndex-1||'?'}`;

  // clear what the player typed and reset the screen
  currentInput = '';
  updateScreen();
  resetBanner();
  locked = false;

  // move the progress bar forward
  const pct = ((questionIndex - 1) / SET_SIZE) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
}

// Updates the calculator-style display to show what the player typed
function updateScreen() {
  const sv = document.getElementById('screen-value');
  sv.textContent = currentInput || '_'; // show an underscore if nothing typed yet
  sv.className = 'screen-value';
}

// Resets the coloured banner and message back to the default prompt
function resetBanner() {
  const b = document.getElementById('answer-banner');
  b.className = 'answer-banner';
  b.textContent = 'Type your answer and press Enter! ✏️';
  const ft = document.getElementById('feedback-text');
  ft.className = 'feedback-text';
  ft.textContent = '';
}

// Updates the score, streak, and correct-count shown on screen
function updateStats() {
  document.getElementById('score-val').textContent = score;
  document.getElementById('streak-val').textContent = `🔥 ${streak}`;
  document.getElementById('correct-val').textContent = `${correctCount}/${questionIndex}`;
}

// ── INPUT ────────────────────────────────────────────────────

// Called when the player presses a number button
function pressNum(n) {
  if (locked) return;            // ignore input while checking answer
  if (currentInput.length >= 3) return; // max 3 digits
  soundClick();
  rippleBtn(event && event.currentTarget); // show a ripple animation on the button
  currentInput += n;  // add the digit to what's been typed
  updateScreen();
}

// Deletes the last digit the player typed (like a backspace)
function pressClear() {
  if (locked) return;
  soundClick();
  currentInput = currentInput.slice(0, -1);
  updateScreen();
}

// Called when the player presses Enter to submit their answer
function pressEnter() {
  if (locked || !currentInput) return; // do nothing if locked or nothing typed
  submitAnswer();
}

// Makes a little ripple animation spread out from a button when clicked
function rippleBtn(btn) {
  if (!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple';
  r.style.width = r.style.height = '60px';
  r.style.left = '50%'; r.style.top = '50%';
  r.style.marginLeft = r.style.marginTop = '-30px';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 400); // remove it after the animation finishes
}

// Listens for keyboard presses so players can use their real keyboard too
document.addEventListener('keydown', e => {
  if (AC.state === 'suspended') AC.resume(); // wake up the sound machine if asleep

  // If the review popup is open, only let Enter or Space close it
  if (reviewModalOpen) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closeReviewModal();
    }
    return;
  }

  if (e.key >= '0' && e.key <= '9') pressNum(e.key); // number key → type a digit
  else if (e.key === 'Backspace') pressClear();        // backspace → delete last digit
  else if (e.key === 'Enter') pressEnter();            // enter → submit answer

  // Visually highlight the matching on-screen button
  const btn = document.querySelector(`[data-val="${e.key}"]`);
  if (btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 120);
  }
});

// Wake up the sound machine the first time the player clicks anywhere
document.addEventListener('click', () => { if (AC.state === 'suspended') AC.resume(); }, {once: true});

// ── SUBMIT ───────────────────────────────────────────────────

// Checks if the player's answer is right or wrong and reacts
function submitAnswer() {
  locked = true; // stop new input while we check
  const userAns = parseInt(currentInput, 10); // turn the typed text into a real number
  const isCorrect = userAns === currentQ.answer;

  const sv = document.getElementById('screen-value');
  const banner = document.getElementById('answer-banner');
  const ft = document.getElementById('feedback-text');

  if (isCorrect) {
    soundCorrect();
    sv.className = 'screen-value correct'; // turn the display green
    banner.className = 'answer-banner correct';

    // Pick a random happy message to show
    const msgs = ['✅ Correct! Amazing! 🌟','✅ Yes! Brilliant! 🎉','✅ That\'s right! 🔥','✅ Perfect! Keep going! ⚡'];
    banner.textContent = msgs[Math.floor(Math.random() * msgs.length)];

    streak++;
    correctCount++;
    score += 10; // +10 points for a correct answer

    // Every 3 correct answers in a row → bonus points!
    if (streak > 0 && streak % 3 === 0) {
      score += 5;
      bonusPoints += 5;
      soundStreakBonus();
      ft.textContent = `+5 streak bonus! 🔥`;
      ft.className = 'feedback-text show';
    }

    // Save the new best streak if this one is better
    if (streak > bestStreak) bestStreak = streak;

  } else {
    soundWrong();
    sv.className = 'screen-value wrong'; // turn the display red
    banner.className = 'answer-banner wrong';
    banner.innerHTML = `❌ Incorrect`;

    // Shake the card to show the wrong answer
    const gc = document.getElementById('game-card');
    gc.classList.remove('shake');
    void gc.offsetWidth; // tiny trick to restart the animation
    gc.classList.add('shake');
    setTimeout(() => gc.classList.remove('shake'), 400);

    streak = 0; // reset the streak on a wrong answer
  }

  updateStats();

  if (isCorrect) {
    // Wait a moment, then move to the next question automatically
    setTimeout(() => {
      questionIndex++;
      if (questionIndex > SET_SIZE) {
        showEndScreen(); // all questions done!
      } else {
        currentQ = questionQueue[questionIndex - 1];
        renderQuestion();
      }
    }, 900);
  } else {
    // Show a popup explaining the correct answer before moving on
    openReviewModal(currentQ, currentInput);
  }
}

// ── INCORRECT REVIEW MODAL ──────────────────────────────────

// Tracks whether the "oops, here's the right answer" popup is open
let reviewModalOpen = false;

// Opens the popup that shows what the correct answer was
function openReviewModal(q, userAnswer) {
  reviewModalOpen = true;
  document.getElementById('review-question').textContent = `${q.a} × ${q.b}`;
  document.getElementById('review-user-answer').textContent = userAnswer;     // what they typed
  document.getElementById('review-correct-answer').textContent = q.answer;   // the right answer

  document.getElementById('review-overlay').classList.add('show'); // make it visible

  // Move keyboard focus to the Continue button so you can press Enter straight away
  setTimeout(() => {
    document.getElementById('review-continue-btn').focus();
  }, 100);
}

// Closes the popup and moves on to the next question
function closeReviewModal() {
  if (!reviewModalOpen) return;
  reviewModalOpen = false;
  document.getElementById('review-overlay').classList.remove('show'); // hide the popup

  questionIndex++;
  if (questionIndex > SET_SIZE) {
    showEndScreen();
  } else {
    currentQ = questionQueue[questionIndex - 1];
    renderQuestion();
  }
}

// ── END SCREEN ───────────────────────────────────────────────

// Shows the final results screen when all 15 questions are done
function showEndScreen() {
  const pct = correctCount / SET_SIZE; // what fraction did they get right?
  document.getElementById('progress-bar').style.width = '100%'; // fill the bar all the way
  document.getElementById('end-score').textContent = score;
  document.getElementById('end-correct').textContent = `${correctCount}/15`;
  document.getElementById('end-best-streak').textContent = bestStreak;
  document.getElementById('end-bonus').textContent = '+' + bonusPoints;

  // Give stars based on how well they did
  let stars, emoji, title;
  if (pct >= 0.93)      { stars = '⭐⭐⭐'; emoji = '🏆'; title = 'Perfect Score!'; }
  else if (pct >= 0.73) { stars = '⭐⭐';   emoji = '🎉'; title = 'Great Job!'; }
  else                  { stars = '⭐';     emoji = '💪'; title = 'Keep Practicing!'; }

  document.getElementById('end-stars').textContent = stars;
  document.getElementById('end-emoji').textContent = emoji;
  document.getElementById('end-title').textContent = title;

  document.getElementById('end-overlay').classList.add('show'); // show the end screen
  if (pct >= 0.7) launchConfetti(); // celebrate if they did well!
}

// ── CONFETTI ─────────────────────────────────────────────────

// Shoots colourful confetti all over the screen when the player does well
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  // Create 120 little confetti pieces with random positions, speeds, and colours
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: -20, // start just above the screen
    r: Math.random() * 8 + 4,           // size
    d: Math.random() * 6 + 2,           // fall speed
    color: ['#FF6B2B','#FFD23F','#FF3D3D','#2ECC71','#3498DB','#9B59B6'][Math.floor(Math.random()*6)],
    tilt: Math.random() * 20 - 10,      // how much it leans
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05, // how fast it wobbles
  }));

  let frame;

  // Draw every piece on the canvas, then move them down a bit, over and over
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height); // wipe the canvas clean
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed; // wobble
      p.y += p.d;                 // fall down
      p.x += Math.sin(p.tiltAngle) * 2; // drift left and right
      p.tilt = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r/4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.r);
      ctx.stroke(); // draw the piece
    });

    // Keep animating until all pieces have fallen off the bottom
    if (pieces.some(p => p.y < canvas.height + 20)) {
      frame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height); // clean up when done
    }
  }

  draw();
  // Force-stop after 4 seconds just in case
  setTimeout(() => { cancelAnimationFrame(frame); ctx.clearRect(0,0,canvas.width,canvas.height); }, 4000);
}

// ── RESTART ──────────────────────────────────────────────────

// Resets everything and starts a brand new round
function restartGame() {
  document.getElementById('end-overlay').classList.remove('show'); // hide the end screen
  // Reset all the counters back to zero
  score = 0; streak = 0; bestStreak = 0; correctCount = 0;
  questionIndex = 1; bonusPoints = 0; locked = false;
  questionQueue = buildQueue();    // make a fresh set of questions
  currentQ = questionQueue[0];     // start on question 1
  updateStats();
  document.getElementById('progress-bar').style.width = '0%'; // empty the progress bar
  renderQuestion(); // show the first question
}

// ── FLOATING STARS ───────────────────────────────────────────

// Adds sparkly floating star emojis to the background for decoration
function buildStars() {
  const container = document.getElementById('stars');
  const emojis = ['⭐','✨','🌟','💫'];
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.textContent = emojis[i % emojis.length]; // cycle through the 4 emoji types
    s.style.left = Math.random() * 100 + 'vw'; // random horizontal position
    s.style.top  = Math.random() * 100 + 'vh'; // random vertical position
    s.style.animationDelay    = (Math.random() * 6) + 's';       // start at different times
    s.style.animationDuration = (5 + Math.random() * 5) + 's';   // float at different speeds
    s.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';      // random sizes
    container.appendChild(s);
  }
}

// ── INIT ─────────────────────────────────────────────────────

// Run these three things when the page first loads to get the game ready
buildStars();      // add background stars
buildTableGrid();  // draw the times table picker
restartGame();     // start the first round