// モード定義
const MODE = {
  FOCUS: "focus",
  BREAK: "break",
};

let currentMode = MODE.FOCUS;
let remainingSeconds = 25 * 60; // 初期値（集中 25分）
let timerId = null;

// DOM取得
const currentTimeEl = document.getElementById("current-time");
const modeLabelEl = document.getElementById("mode-label");
const focusMinutesInput = document.getElementById("focus-minutes");
const breakMinutesInput = document.getElementById("break-minutes");
const timeDisplayEl = document.getElementById("time-display");
const startPauseBtn = document.getElementById("start-pause-btn");
const resetBtn = document.getElementById("reset-btn");
const toggleModeBtn = document.getElementById("toggle-mode-btn");
const messageEl = document.getElementById("message");

// ========== 現在時刻表示 ==========
function updateCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  currentTimeEl.textContent = `${h}:${m}:${s}`;
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();

// ========== 時間関連 ==========
function getDurationSeconds(mode) {
  const focusMin = parseInt(focusMinutesInput.value, 10) || 0;
  const breakMin = parseInt(breakMinutesInput.value, 10) || 0;

  if (mode === MODE.FOCUS) {
    return Math.max(1, focusMin) * 60;
  } else {
    return Math.max(1, breakMin) * 60;
  }
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updateDisplay() {
  timeDisplayEl.textContent = formatTime(remainingSeconds);
  modeLabelEl.textContent = currentMode === MODE.FOCUS ? "集中モード" : "休憩モード";
  toggleModeBtn.textContent =
    currentMode === MODE.FOCUS ? "休憩モードに切替" : "集中モードに切替";
  applyModeTheme();
}

function applyModeTheme() {
  if (currentMode === MODE.FOCUS) {
    document.body.classList.add("focus-mode");
    document.body.classList.remove("break-mode");
  } else {
    document.body.classList.add("break-mode");
    document.body.classList.remove("focus-mode");
  }
}

// ========== タイマー制御 ==========
function startTimer() {
  if (timerId !== null) return; // 二重起動防止

  messageEl.textContent = "";
  startPauseBtn.textContent = "停止";

  timerId = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateDisplay();
      handleTimeUp();
    } else {
      updateDisplay();
    }
  }, 1000);
}

function pauseTimer() {
  if (timerId === null) return;
  clearInterval(timerId);
  timerId = null;
  startPauseBtn.textContent = "スタート";
}

function resetTimer() {
  pauseTimer();
  remainingSeconds = getDurationSeconds(currentMode);
  messageEl.textContent = "";
  updateDisplay();
}

// 時間終了時の挙動
function handleTimeUp() {
  pauseTimer();

  const prevMode = currentMode;
  const modeText = prevMode === MODE.FOCUS ? "集中" : "休憩";
  const nextModeText = prevMode === MODE.FOCUS ? "休憩" : "集中";

  // ブラウザ上の通知（ここでは alert を使用）
  alert(`${modeText}モードが終了しました。OKを押すと${nextModeText}モードに切り替わります。`);

  // OK押したらモード切替
  currentMode = prevMode === MODE.FOCUS ? MODE.BREAK : MODE.FOCUS;
  remainingSeconds = getDurationSeconds(currentMode);
  messageEl.textContent = `${nextModeText}モードに切り替わりました。`;
  updateDisplay();
  startTimer(); // 再スタート
}

// ========== モード切替 ==========
function switchModeManually() {
  const wasRunning = timerId !== null;
  pauseTimer();

  currentMode = currentMode === MODE.FOCUS ? MODE.BREAK : MODE.FOCUS;
  remainingSeconds = getDurationSeconds(currentMode);
  messageEl.textContent = "モードを手動で切り替えました。";
  updateDisplay();

  if (wasRunning) {
    startTimer(); // 切り替え前に動いていたら再スタート
  }
}

// ========== イベント登録 ==========
startPauseBtn.addEventListener("click", () => {
  if (timerId === null) {
    // 停止中 → スタート
    // モードごとの時間設定が変わっている可能性もあるので、
    // 0のときは現在モードのデフォルト時間で再セット
    if (remainingSeconds <= 0) {
      remainingSeconds = getDurationSeconds(currentMode);
    }
    startTimer();
  } else {
    // 動作中 → 一時停止
    pauseTimer();
  }
});

resetBtn.addEventListener("click", resetTimer);

toggleModeBtn.addEventListener("click", switchModeManually);

// 時間設定が変わったら、停止中の場合は即反映
focusMinutesInput.addEventListener("change", () => {
  if (currentMode === MODE.FOCUS && timerId === null) {
    remainingSeconds = getDurationSeconds(MODE.FOCUS);
    updateDisplay();
  }
});

breakMinutesInput.addEventListener("change", () => {
  if (currentMode === MODE.BREAK && timerId === null) {
    remainingSeconds = getDurationSeconds(MODE.BREAK);
    updateDisplay();
  }
});

// 初期表示
remainingSeconds = getDurationSeconds(currentMode);
updateDisplay();
