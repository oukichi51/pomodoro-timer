// モード定義
const MODE = {
  FOCUS: "focus",
  BREAK: "break",
};

// キー定義
const STORAGE_KEY = "pomodoroSessions"; // 好きなキー名でOK

let currentMode = MODE.FOCUS;
let remainingSeconds = 25 * 60; // 初期値（集中 25分）
let timerId = null;
let currentSessionStart = null;
let currentDayKey = createDateKey(new Date());

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
const todayFocusMinutesEl = document.getElementById("today-focus-minutes");
const todayBreakMinutesEl = document.getElementById("today-break-minutes");
const todayFocusCyclesEl  = document.getElementById("today-focus-cycles");
const clearTodayLogsBtn = document.getElementById("clear-today-logs-btn");
const clearAllLogsBtn   = document.getElementById("clear-all-logs-btn");

// ========== ローカルストレージ操作 ==========
function saveSessions(data) {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error("Failed to save sessions to localStorage", e);
  }
}

function loadSessions() {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) {
    // まだ何も保存されていない場合
    return {};
  }

  try {
    const parsed = JSON.parse(json);
    return parsed;
  } catch (e) {
    console.error("Failed to parse sessions from localStorage", e);
    return {};
  }
}

function clearTodayLogs() {
  if (!confirm("今日のログを削除しますか？")) {
    return;
  }

  const sessions = loadSessions();
  const todayKey = createDateKey(new Date());

  // 今日のキーだけ削除
  delete sessions[todayKey];

  saveSessions(sessions);
  updateTodayStats();
  messageEl.textContent = "今日のログを削除しました。";
}

function clearAllLogs() {
  if (!confirm("すべてのログを削除しますか？この操作は取り消せません。")) {
    return;
  }

  // ログ用キーごと削除
  localStorage.removeItem(STORAGE_KEY);

  // 画面上は「0分 / 0回」にさせる
  updateTodayStats();
  messageEl.textContent = "すべてのログを削除しました。";
}

// ========== 現在時刻表示 ==========
function updateCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  currentTimeEl.textContent = `${h}:${m}:${s}`;

  const dayKey = createDateKey(now);
  if (dayKey !== currentDayKey) {
    currentDayKey = dayKey;
    updateTodayStats(); // 日付変わったら今日の実績を再計算
  }
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

function createDateKey(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月は0始まりなので+1
  const day   = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function updateDisplay() {
  timeDisplayEl.textContent = formatTime(remainingSeconds);
  modeLabelEl.textContent = currentMode === MODE.FOCUS ? "集中モード" : "休憩モード";
  toggleModeBtn.textContent =
    currentMode === MODE.FOCUS ? "休憩モードに切替" : "集中モードに切替";
  applyModeTheme();
  updateTodayStats();
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

  const initialSeconds = getDurationSeconds(currentMode);
  const isFull = remainingSeconds === initialSeconds;
  if (currentSessionStart === null || isFull) {
    currentSessionStart = new Date();
  }

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
  currentSessionStart = null;
  messageEl.textContent = "";
  updateDisplay();
}

// 時間終了時の挙動
function handleTimeUp() {
  pauseTimer();

  const end = new Date();

  let durationSeconds = getDurationSeconds(currentMode);
  let start = new Date(end.getTime() - durationSeconds * 1000);
  if(currentSessionStart !== null) {
    start = currentSessionStart;
    durationSeconds = Math.round((end - currentSessionStart) / 1000);
  }

  const dateKey = createDateKey(end);
  const sessions = loadSessions();
  sessions[dateKey] = sessions[dateKey] || [];
  sessions[dateKey].push({ 
    mode: currentMode, 
    start: start.toISOString(), 
    end: end.toISOString(), 
    durationSeconds 
  });
  saveSessions(sessions);
  updateTodayStats();
  currentSessionStart = null;

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

// ========== ログ関連 ==========
function updateTodayStats() {
  const now = new Date();
  const todayKey = createDateKey(now);
  const sessions = loadSessions();
  const todaySessions = sessions[todayKey] || [];

  let totalFocusSeconds = 0;
  let totalBreakSeconds = 0;
  let focusCycles = 0;

  todaySessions.forEach((session) => {
    if (session.mode === MODE.FOCUS) {
      // durationSeconds が入っている前提
      totalFocusSeconds += session.durationSeconds || 0;
    } else {
      totalBreakSeconds += session.durationSeconds || 0;
      focusCycles += 1;
    }
  });

  const totalFocusMinutes = Math.floor(totalFocusSeconds / 60);
  const totalBreakMinutes = Math.floor(totalBreakSeconds / 60);

  // HTML に反映
  todayFocusMinutesEl.textContent = `${totalFocusMinutes} 分`;
  todayBreakMinutesEl.textContent = `${totalBreakMinutes} 分`;
  todayFocusCyclesEl.textContent  = `${focusCycles} 回`;
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

clearTodayLogsBtn.addEventListener("click", clearTodayLogs);
clearAllLogsBtn.addEventListener("click", clearAllLogs);

// 初期表示
remainingSeconds = getDurationSeconds(currentMode);
updateDisplay();
