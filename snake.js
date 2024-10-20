const canvas = document.getElementById("canvas");
const restartBtn = document.getElementById("restart-btn");

let score = 0; // Initialize the score


let ROWS = window.innerWidth > 600 ? 38 : 39;
const COLS = 48;
const PIXEL = 10;

const pixels = new Map();
const moveRight = ([t, l]) => [t, l + 1];
const moveLeft = ([t, l]) => [t, l - 1];
const moveUp = ([t, l]) => [t - 1, l];
const moveDown = ([t, l]) => [t + 1, l];

let gameInterval = null;
// --- rendering ---

restartBtn.addEventListener("click", () => location.reload());

function initializeCanvas() {
  // Clear existing canvas
  canvas.innerHTML = "";
  pixels.clear();

  // Create pixels based on ROWS and COLS
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      let pixel = document.createElement("div");
      pixel.style.position = "absolute";
      pixel.style.border = "1px solid #aaa";
      pixel.style.left = j * PIXEL + "px";
      pixel.style.top = i * PIXEL + "px";
      pixel.style.width = PIXEL + "px";
      pixel.style.height = PIXEL + "px";
      let key = toKey([i, j]);
      canvas.appendChild(pixel);
      pixels.set(key, pixel);
    }
  }
}

function updateCanvasSize() {
  ROWS = window.innerWidth > 600 ? 25 : 39; // Update ROWS based on window size
  initializeCanvas();
}

initializeCanvas();

// Listen for window resize events
window.addEventListener("resize", updateCanvasSize);

function drawCanvas() {
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      let key = toKey([i, j]);
      let pixel = pixels.get(key);
      let background = "white";
      if (key === currentFoodKey) {
        background = "#556B2F";
      } else if (currentSnakeKeys.has(key)) {
        background = "black";
      }
      pixel.style.background = background;
    }
  }
}

// --- game state ---

let currentSnake;
let currentSnakeKeys;
let currentVacantKeys;
let currentFoodKey;
let currentDirection;
let directionQueue;

function step() {
  let head = currentSnake[currentSnake.length - 1];
  let nextDirection = currentDirection;
  while (directionQueue.length > 0) {
    let candidateDirection = directionQueue.shift();
    if (!areOpposite(candidateDirection, currentDirection)) {
      nextDirection = candidateDirection;
      break;
    }
  }
  currentDirection = nextDirection;
  let nextHead = currentDirection(head);
  if (!checkValidHead(currentSnakeKeys, nextHead)) {
    stopGame(false);
    return;
  }
  pushHead(nextHead);
  if (toKey(nextHead) == currentFoodKey) {
    let nextFoodKey = spawnFood();
    if (nextFoodKey === null) {
      stopGame(true);
      return;
    }
    currentFoodKey = nextFoodKey;
  } else {
    popTail();
  }
  drawCanvas();
  if (window.location.search === "?debug") {
    checkIntegrity_SLOW();
  }
}

function pushHead(nextHead) {
  currentSnake.push(nextHead);
  let key = toKey(nextHead);
  currentVacantKeys.delete(key);
  currentSnakeKeys.add(key);
}

function popTail() {
  let tail = currentSnake.shift();
  let key = toKey(tail);
  currentVacantKeys.add(key);
  currentSnakeKeys.delete(key);
}

function spawnFood() {
  if (currentVacantKeys.size === 0) {
    return null;
  }
  let choice = Math.floor(Math.random() * currentVacantKeys.size);
  let i = 0;
  for (let key of currentVacantKeys) {
    if (i === choice) {
      return key;
    }
    i++;
  }
  throw Error("should never get here");
}

// --- interaction ---

window.addEventListener("keydown", (e) => {
  if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
    return;
  }
  e.preventDefault();
  switch (e.key) {
    case "ArrowLeft":
    case "A":
    case "a":
      directionQueue.push(moveLeft);
      break;
    case "ArrowRight":
    case "D":
    case "d":
      directionQueue.push(moveRight);
      break;
    case "ArrowUp":
    case "W":
    case "w":
      directionQueue.push(moveUp);
      break;
    case "ArrowDown":
    case "S":
    case "s":
      directionQueue.push(moveDown);
      break;
    case "R":
    case "r":
      stopGame(false);
      startGame();
      break;
    case "Enter":
      if (pressedR) {
        stopGame(false);
        startGame();
        pressedR = false;
      }
      break;
    case " ":
      step();
      break;
  }
});

function stopGame(success) {
  canvas.style.borderColor = success ? "green" : "red";
  clearInterval(gameInterval);
}

function startGame() {

  score = 0; // Reset the score when the game starts
  updateScore();

  directionQueue = [];
  currentDirection = moveRight;
  currentSnake = makeInitialSnake();
  currentSnakeKeys = new Set();
  currentVacantKeys = new Set();
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      currentVacantKeys.add(toKey([i, j]));
    }
  }
  for (let cell of currentSnake) {
    let key = toKey(cell);
    currentVacantKeys.delete(key);
    currentSnakeKeys.add(key);
  }
  currentFoodKey = spawnFood();
  [snakeKeys, vacantKeys] = partitionCells(currentSnake);
  currentSnakeKeys = snakeKeys;
  currentVacantKeys = vacantKeys;

  canvas.style.borderColor = "";
  gameInterval = setInterval(step, 50);
  drawCanvas();
}

startGame();

// --- utilities

function areOpposite(dir1, dir2) {
  if (dir1 === moveLeft && dir2 === moveRight) {
    return true;
  }
  if (dir1 === moveRight && dir2 === moveLeft) {
    return true;
  }
  if (dir1 === moveUp && dir2 === moveDown) {
    return true;
  }
  if (dir1 === moveDown && dir2 === moveUp) {
    return true;
  }
  return false;
}

function partitionCells(snake) {
  let snakeKeys = new Set();
  let vacantKeys = new Set();
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      vacantKeys.add(toKey([i, j]));
    }
  }
  for (let cell of snake) {
    let key = toKey(cell);
    vacantKeys.delete(key);
    snakeKeys.add(key);
  }
  return [snakeKeys, vacantKeys];
}

function checkValidHead(keys, cell) {
  let [top, left] = cell;
  if (top < 0 || left < 0) {
    return false;
  }
  if (top >= ROWS || left >= COLS) {
    return false;
  }
  if (keys.has(toKey(cell))) {
    return false;
  }
  return true;
}

function makeInitialSnake() {
  return [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ];
}

function toKey([top, left]) {
  return top + "_" + left;
}

// --- debugging ---

function checkIntegrity_SLOW() {
  let failedCheck = null;
  let foodCount = 0;
  let allKeys = new Set();
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      let key = toKey([i, j]);
      allKeys.add(key);
      if (key === currentFoodKey) {
        foodCount++;
      }
    }
  }
  if (foodCount !== 1) {
    failedCheck = "there cannot be two foods";
  }
  let [snakeKeys, vacantKeys] = partitionCells(currentSnake);
  if (!areSameSets_SLOW(snakeKeys, currentSnakeKeys)) {
    failedCheck = "snake keys don’t match";
  }
  if (!areSameSets_SLOW(vacantKeys, currentVacantKeys)) {
    failedCheck = "vacant keys don’t match";
  }
  if (currentSnakeKeys.has(currentFoodKey)) {
    failedCheck = "there’s food in the snake";
  }
  if (currentSnake.length !== currentSnakeKeys.size) {
    failedCheck = "the snake intersects itself";
  }
  if (
    !areSameSets_SLOW(
      new Set([...currentSnakeKeys, ...currentVacantKeys]),
      allKeys
    )
  ) {
    failedCheck = "something is out of bounds";
  }
  for (let i = 1 /* intentional */; i < currentSnake.length; i++) {
    let cell = currentSnake[i];
    let prevCell = currentSnake[i - 1];
    let dy = cell[0] - prevCell[0];
    let dx = cell[1] - prevCell[1];
    let isOk =
      (dy === 0 && Math.abs(dx) === 1) || (dx === 0 && Math.abs(dy) === 1);
    if (!isOk) {
      failedCheck = "the snake has a break";
    }
  }
  if (failedCheck !== null) {
    stopGame(false);
    canvas.style.borderColor = "purple";
    throw Error(failedCheck);
  }
}

function areSameSets_SLOW(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}



// Update the score when food is eaten
function pushHead(nextHead) {
  currentSnake.push(nextHead);
  let key = toKey(nextHead);
  currentVacantKeys.delete(key);
  currentSnakeKeys.add(key);

  // Check if the snake ate food
  if (key === currentFoodKey) {
    score += 10; // Increment the score
    updateScore();
  }
}

function updateScore() {
  const scoreElement = document.getElementById("score-value");
  scoreElement.textContent = score;
}
