/* Step 21 — Connect HTML Elements and Load Sounds */

/* Game grid size */
const GRID = 18;

/* Main game elements */
const board = document.getElementById('board');
const scoreBox = document.getElementById('scoreBox');
const highScoreEl = document.getElementById('highScore');

/* Control buttons */
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const fsBtn = document.getElementById('fsBtn');
const difficultySel = document.getElementById('difficulty');

/* Overlays and inputs */
const overlayStart = document.getElementById('overlayStart');
const overlayStartBtn = document.getElementById('overlayStartBtn');
const playerNameInput = document.getElementById('playerName');
const overlayGameOver = document.getElementById('overlayGameOver');
const finalScore = document.getElementById('finalScore');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const goHomeBtn = document.getElementById('goHomeBtn');

/* Game sounds */
const foodSound = new Audio('assets/food.mp3');
const gameOverSound = new Audio('assets/gameover.mp3');
const moveSound = new Audio('assets/move.mp3');

/* Background music */
const musicSound = new Audio('assets/music.mp3');
musicSound.loop = true;
/* Step 22 — Game Speed, Score, and High Score Loading */

let speed = 6, score = 0;

/* High score stored as: { score: number, name: string } */
const HKEY_OBJ = "snake_hiscore_obj";

let hiscoreObj = (function () {
  try {
    const raw = localStorage.getItem(HKEY_OBJ);

    // If nothing saved, return default
    if (!raw) return { score: 0, name: "" };

    const parsed = JSON.parse(raw);

    // Validate saved data
    if (typeof parsed.score === 'number' && typeof parsed.name === 'string') {
      return parsed;
    }

    return { score: 0, name: "" };

  } catch (e) {
    return { score: 0, name: "" };
  }
})();
/* Step 23 — Game State, Difficulty Settings, and Utilities */

/* Snake starts at the center of the board */
let snake = [{ x: 9, y: 9 }];

/* Food list (will store multiple food items) */
let foods = [];

/* Snake movement direction (starts still) */
let inputDir = { x: 0, y: 0 };

/* Time tracking for animation */
let lastPaint = 0;

/* Game state flags */
let running = false;
let paused = false;
let musicMuted = false;

/* Difficulty levels with speed and number of foods */
const DIFFICULTY = {
  easy:   { speed: 5, foods: 2 },
  medium: { speed: 7, foods: 3 },
  hard:   { speed: 10, foods: 4 }
};

/* Utility: random number between a and b */
const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

/* Utility: play a sound if not muted */
function play(s) {
  if (!musicMuted) {
    try {
      s.currentTime = 0;
      s.play();
    } catch (e) {}
  }
}

/* Step 24 — Food Spawning Logic */
function spawnFood(val) {
  let tries = 0;

  while (tries++ < 300) {
    const x = rand(1, GRID);
    const y = rand(1, GRID);

    // Check if the spot is empty (no snake, no food)
    const onSnake = snake.some(s => s.x === x && s.y === y);
    const onFood = foods.some(f => f.x === x && f.y === y);

    if (!onSnake && !onFood) {
      // Add a unique ID to each food for safe filtering later
      foods.push({
        x,
        y,
        val,
        id: Math.random().toString(36).slice(2, 9)
      });
      return;
    }
  }
}



/* Step 25 — Setup Multiple Foods Based on Difficulty */
function setupFoods() {
  // Clear the food list
  foods = [];

  // Get selected difficulty settings
  const preset = DIFFICULTY[difficultySel.value];

  // Spawn the required number of foods
  for (let i = 0; i < preset.foods; i++) {
    const r = Math.random();

    // Randomly pick food type: small (1), medium (2), big (3)
    const v = r < 0.6 ? 1 : (r < 0.9 ? 2 : 3);

    // Create the food on the board
    spawnFood(v);
  }
}


/* Step 26 — Reset the Game */
function resetGame() {
  // Stop movement
  inputDir = { x: 0, y: 0 };

  // Reset snake to the center
  snake = [{ x: 9, y: 9 }];

  // Reset score
  score = 0;

  // Set speed based on chosen difficulty
  speed = DIFFICULTY[difficultySel.value].speed;

  // Create new food items
  setupFoods();

  // Update score display
  updateScore();

  // Re-render the board
  render();

  // Reset game state
  running = false;
  paused = false;
}


/* Step 27 — Save High Score (Score + Player Name) */
function saveHighScoreObject(obj) {
  try {
    // Save the high score object as JSON
    localStorage.setItem(HKEY_OBJ, JSON.stringify(obj));

    // Update the in-memory high score
    hiscoreObj = obj;
  } catch (e) {
    console.warn("Could not save high score:", e);
  }
}

/* Step 28 — Game Over Logic */
function gameOver() {
  // Play game-over sound
  play(gameOverSound);
  
  // Stop the game
  running = false;

  // Check if player beat the high score
  if (score > hiscoreObj.score) {
    const name =
      (playerNameInput && playerNameInput.value && playerNameInput.value.trim())
        ? playerNameInput.value.trim()
        : "Player";

    const newObj = { score: score, name: name };
    saveHighScoreObject(newObj);
  }

  // Show final score
  finalScore.textContent = `Score: ${score}`;

  // Update high-score display
  highScoreEl.textContent =
    hiscoreObj.score > 0
      ? `High: ${hiscoreObj.score} (${hiscoreObj.name || "Player"})`
      : `High: 0`;

  // Show Game Over overlay
  overlayGameOver.classList.remove("hidden");
}




/* Step 29 — Update Score and High Score on Screen */
function updateScore() {
  // Show current score
  scoreBox.textContent = `Score: ${score}`;

  // Show high score with player name (or default)
  highScoreEl.textContent =
    hiscoreObj.score > 0
      ? `High: ${hiscoreObj.score} (${hiscoreObj.name || "Player"})`
      : `High: 0`;
}


/* Step 30 — Collision Detection */
function willCollide(newHead) {
  // Check if the snake hits the wall
  if (newHead.x < 1 || newHead.x > GRID || newHead.y < 1 || newHead.y > GRID)
    return true;

  // Check if the snake hits itself
  if (snake.some(s => s.x === newHead.x && s.y === newHead.y))
    return true;

  // Safe to move
  return false;
}


/* Step 31 — Main Game Engine */
function gameEngine() {
  // If snake hasn't started moving, just draw the board
  if (inputDir.x === 0 && inputDir.y === 0) {
    render();
    return;
  }

  // Calculate new head position
  const newHead = {
    x: snake[0].x + inputDir.x,
    y: snake[0].y + inputDir.y
  };

  // Check for collision
  if (willCollide(newHead)) {
    gameOver();
    return;
  }

  // Move snake forward by adding the new head
  snake.unshift(newHead);

  // Check if the snake ate a food
  const eaten = foods.find(f => f.x === newHead.x && f.y === newHead.y);

  if (eaten) {
    play(foodSound);
    score += eaten.val;

    // Remove eaten food and spawn another of the same type
    foods = foods.filter(f => !(f.x === eaten.x && f.y === eaten.y));
    spawnFood(eaten.val);

    // Increase speed every 5 points
    if (score % 5 === 0) speed++;

    updateScore();
  } else {
    // If no food eaten, remove tail (normal movement)
    snake.pop();
  }

  // Redraw everything
  render();
}

/* Step 32 — Render Snake and Food on the Board */
function render() {
  // Clear old board
  board.innerHTML = "";

  // Draw foods
  foods.forEach(f => {
    const e = document.createElement("div");
    e.style.gridRowStart = f.y;
    e.style.gridColumnStart = f.x;
    e.className = 
      f.val === 1 ? "food-small" :
      f.val === 2 ? "food-mid" : 
      "food-big";
    board.appendChild(e);
  });

  // Draw snake segments
  snake.forEach((s, i) => {
    const e = document.createElement("div");
    e.style.gridRowStart = s.y;
    e.style.gridColumnStart = s.x;
    e.className = i === 0 ? "head" : "snake";
    board.appendChild(e);
  });
}
/* Step 33 — Main Game Loop */
function loop(ts) {
  // Stop if game isn't running
  if (!running) return;

  // If paused, update time and keep looping
  if (paused) { 
    lastPaint = ts; 
    requestAnimationFrame(loop); 
    return; 
  }

  // Keep the loop running smoothly
  requestAnimationFrame(loop);

  // Control speed (wait until enough time has passed)
  if ((ts - lastPaint) / 1000 < 1 / speed) return;

  lastPaint = ts;

  // Update the game
  gameEngine();
}

/* Step 34 — Start Game Events */

// Show the start overlay when Start button is clicked
startBtn.onclick = () => overlayStart.classList.remove("hidden");

// When the player clicks the overlay Start button
overlayStartBtn.onclick = () => {
  // Reset game before starting
  resetGame();

  // Hide the start overlay
  overlayStart.classList.add("hidden");

  // Start the game
  running = true;

  // Play background music
  try {
    if (!musicMuted) musicSound.play();
  } catch (e) {}

  // Begin the game loop
  requestAnimationFrame(loop);
};


/* Step 35 — Pause, Restart, and Mute Controls */

// Pause or resume the game
pauseBtn.onclick = () => {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
};

// Restart the game
restartBtn.onclick = () => {
  resetGame();
  running = true;
  requestAnimationFrame(loop);
};

// Mute or unmute music
muteBtn.onclick = () => {
  musicMuted = !musicMuted;
  muteBtn.textContent = musicMuted ? "Unmute" : "Mute";

  if (musicMuted) {
    musicSound.pause();
  } else {
    try {
      musicSound.play();
    } catch (e) {}
  }
};

/* Step 36 — Fullscreen Toggle & Difficulty Change */

// Toggle fullscreen mode
fsBtn.onclick = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
    fsBtn.textContent = "Exit FS";
  } else {
    await document.exitFullscreen();
    fsBtn.textContent = "Fullscreen";
  }
};

// Reset the game when difficulty is changed
difficultySel.onchange = resetGame;

/* Step 37 — Game Over Controls */

// Try Again button: restart the game
tryAgainBtn.onclick = () => {
  overlayGameOver.classList.add("hidden");
  resetGame();
  running = true;
  requestAnimationFrame(loop);
};

// Go Home button: return to the start screen
goHomeBtn.onclick = () => {
  overlayGameOver.classList.add("hidden");
  overlayStart.classList.remove("hidden");
};

/* Step 38 — Keyboard Controls */

window.addEventListener("keydown", e => {

  // Start the game if an arrow key is pressed
  if (!running && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    overlayStart.classList.add("hidden");
    running = true;
    requestAnimationFrame(loop);
  }

  // Snake movement controls
  switch (e.key) {
    case "ArrowUp":
      if (inputDir.y !== 1) inputDir = { x: 0, y: -1 };
      break;

    case "ArrowDown":
      if (inputDir.y !== -1) inputDir = { x: 0, y: 1 };
      break;

    case "ArrowLeft":
      if (inputDir.x !== 1) inputDir = { x: -1, y: 0 };
      break;

    case "ArrowRight":
      if (inputDir.x !== -1) inputDir = { x: 1, y: 0 };
      break;

    // Pause with P key
    case "p":
    case "P":
      pauseBtn.click();
      break;
  }

  // Play movement sound
  play(moveSound);
});

/* Step 39 — Mobile Button Controls */

document.querySelectorAll(".mbtn").forEach(b => {
  b.addEventListener("click", () => {
    const d = b.dataset.dir;

    if (d === "up"    && inputDir.y !== 1)  inputDir = { x: 0,  y: -1 };
    if (d === "down"  && inputDir.y !== -1) inputDir = { x: 0,  y: 1 };
    if (d === "left"  && inputDir.x !== 1)  inputDir = { x: -1, y: 0 };
    if (d === "right" && inputDir.x !== -1) inputDir = { x: 1,  y: 0 };

    play(moveSound);
  });
});
/* Step 40 — Swipe Controls for Mobile */

// Starting touch position
let sx = 0, sy = 0;

// When the player first touches the screen
board.addEventListener("touchstart", e => {
  const t = e.touches[0];
  sx = t.clientX;
  sy = t.clientY;
}, { passive: true });

// When the touch ends, check swipe direction
board.addEventListener("touchend", e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - sx;
  const dy = t.clientY - sy;

  // Horizontal swipe
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
    if (dx > 0 && inputDir.x !== -1) inputDir = { x: 1, y: 0 };   // Right
    else if (dx < 0 && inputDir.x !== 1) inputDir = { x: -1, y: 0 }; // Left
  }
  // Vertical swipe
  else if (Math.abs(dy) > 20) {
    if (dy > 0 && inputDir.y !== -1) inputDir = { x: 0, y: 1 };    // Down
    else if (dy < 0 && inputDir.y !== 1) inputDir = { x: 0, y: -1 }; // Up
  }

  play(moveSound);
}, { passive: true });

/* Step 40 — Initialize Game */
updateScore();  // Load saved high score and name
resetGame();    // Reset board and snake
render();       // Draw everything

