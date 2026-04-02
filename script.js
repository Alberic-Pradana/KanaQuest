// ============================================================
// KanaQuest — Game Engine
// ============================================================

(function () {
  'use strict';

  // ──────────────────────────────────────────
  // Sound Manager (Web Audio API + Custom Sounds)
  // ──────────────────────────────────────────
  class SoundManager {
    constructor() {
      this.enabled = localStorage.getItem('kq_sound') !== 'off';
      this.ctx = null;

      // Custom sound settings (stored in localStorage)
      this.customCorrect = localStorage.getItem('kq_sound_correct') || '';
      this.customWrong = localStorage.getItem('kq_sound_wrong') || '';

      // Preloaded custom audio elements
      this.correctAudio = null;
      this.wrongAudio = null;

      this._preloadCustomSounds();
    }

    _preloadCustomSounds() {
      if (this.customCorrect) {
        this.correctAudio = new Audio(`sounds/${this.customCorrect}`);
        this.correctAudio.preload = 'auto';
      } else {
        this.correctAudio = null;
      }

      if (this.customWrong) {
        this.wrongAudio = new Audio(`sounds/${this.customWrong}`);
        this.wrongAudio.preload = 'auto';
      } else {
        this.wrongAudio = null;
      }
    }

    setCustomSound(type, filename) {
      if (type === 'correct') {
        this.customCorrect = filename;
        localStorage.setItem('kq_sound_correct', filename);
      } else if (type === 'wrong') {
        this.customWrong = filename;
        localStorage.setItem('kq_sound_wrong', filename);
      }
      this._preloadCustomSounds();
    }

    resetToDefault() {
      this.customCorrect = '';
      this.customWrong = '';
      localStorage.removeItem('kq_sound_correct');
      localStorage.removeItem('kq_sound_wrong');
      this._preloadCustomSounds();
    }

    _getCtx() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return this.ctx;
    }

    _playFile(audio) {
      if (!audio) return false;
      try {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(() => {});
        return true;
      } catch { return false; }
    }

    play(type) {
      if (!this.enabled) return;
      try {
        // Try custom sounds first
        if (type === 'correct' && this.correctAudio) {
          this._playFile(this.correctAudio);
          return;
        }
        if (type === 'wrong' && this.wrongAudio) {
          this._playFile(this.wrongAudio);
          return;
        }

        // Fallback to built-in oscillator sounds
        const ctx = this._getCtx();

        if (type === 'correct') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'wrong') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'complete') {
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.15);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
            o.start(ctx.currentTime + i * 0.15);
            o.stop(ctx.currentTime + i * 0.15 + 0.4);
          });
        }
      } catch (e) { /* ignore audio errors */ }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('kq_sound', this.enabled ? 'on' : 'off');
      return this.enabled;
    }
  }

  // ──────────────────────────────────────────
  // Leaderboard Manager
  // ──────────────────────────────────────────
  class LeaderboardManager {
    constructor() {
      this.storageKey = 'kq_leaderboard';
    }

    getAll() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
      } catch { return []; }
    }

    getByLevel(level) {
      return this.getAll()
        .filter(e => e.level === level)
        .sort((a, b) => b.score - a.score);
    }

    add(entry) {
      const all = this.getAll();
      all.push({
        ...entry,
        date: new Date().toISOString()
      });
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    }

    clear() {
      localStorage.removeItem(this.storageKey);
    }
  }

  // ──────────────────────────────────────────
  // Timer Manager
  // ──────────────────────────────────────────
  class TimerManager {
    constructor() {
      this.startTime = null;
      this.elapsed = 0; // in seconds
      this.intervalId = null;
      this.onTick = null;
    }

    start(onTick) {
      this.startTime = Date.now();
      this.elapsed = 0;
      this.onTick = onTick;
      this.intervalId = setInterval(() => {
        this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onTick) this.onTick(this.elapsed);
      }, 1000);
    }

    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.startTime) {
        this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      }
      return this.elapsed;
    }

    getElapsed() {
      return this.elapsed;
    }

    static formatTime(totalSeconds) {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  }

  // ──────────────────────────────────────────
  // Game Engine
  // ──────────────────────────────────────────
  class GameEngine {
    constructor() {
      this.level = 1;
      this.questions = [];
      this.currentIndex = 0;
      this.score = 0;
      this.answers = []; // { question, userAnswer, correctAnswer, isCorrect }
      this.practiceMode = false;
      this.kanaType = 'hiragana'; // for level 1
      this.endlessMode = false;
      this.endlessCorrect = 0;
      this.endlessWrong = 0;
      this.endlessTotal = 0;
    }

    // Generate questions for Level 1
    generateLevel1(kanaType, count) {
      let pool = [];
      if (kanaType === 'hiragana') pool = [...HIRAGANA];
      else if (kanaType === 'katakana') pool = [...KATAKANA];
      else pool = [...HIRAGANA, ...KATAKANA]; // mixed

      this._shuffle(pool);

      // Handle "all" modes
      if (count === 'all-hiragana') { pool = [...HIRAGANA]; this._shuffle(pool); count = pool.length; }
      else if (count === 'all-katakana') { pool = [...KATAKANA]; this._shuffle(pool); count = pool.length; }
      else if (count === 'all') { pool = [...HIRAGANA, ...KATAKANA]; this._shuffle(pool); count = pool.length; }
      else count = Math.min(parseInt(count), pool.length);

      this.questions = pool.slice(0, count).map(item => {
        // Generate 4 options including the correct answer
        const allRomaji = [...new Set([...HIRAGANA, ...KATAKANA].map(k => k.romaji))];
        const options = this._generateOptions(item.romaji, allRomaji, 4);
        return {
          display: item.kana,
          correctAnswer: item.romaji,
          options,
          type: 'choice'
        };
      });
    }

    // Generate questions for Level 2
    generateLevel2(count) {
      let pool = [...WORDS];
      this._shuffle(pool);
      count = Math.min(parseInt(count), pool.length);

      this.questions = pool.slice(0, count).map(item => {
        const allRomaji = WORDS.map(w => w.romaji);
        const options = this._generateOptions(item.romaji, allRomaji, 4);
        return {
          display: item.word,
          displayClass: 'question-word',
          clue: item.meaning,
          correctAnswer: item.romaji,
          options,
          type: 'choice'
        };
      });
    }

    // Generate questions for Level 3
    generateLevel3(count) {
      let pool = [...SENTENCES];
      this._shuffle(pool);
      count = Math.min(parseInt(count), pool.length);

      this.questions = pool.slice(0, count).map(item => ({
        display: item.sentence,
        displayClass: 'question-sentence',
        clue: item.meaning,
        correctAnswer: item.romaji,
        type: 'input'
      }));
    }

    // Generate questions for Level 4 (Kanji)
    generateLevel4(count) {
      let pool = [...KANJI];
      this._shuffle(pool);

      if (count === 'all') {
        count = pool.length;
      } else {
        count = Math.min(parseInt(count), pool.length);
      }

      const allMeanings = KANJI.map(k => k.meaning);

      this.questions = pool.slice(0, count).map(item => {
        const options = this._generateOptions(item.meaning, allMeanings, 4);
        // Build reading string from on'yomi and kun'yomi
        const readings = [item.onyomi, item.kunyomi].filter(r => r).join(' / ');
        return {
          display: item.kanji,
          displayClass: 'question-kanji',
          clue: readings || null,
          clueClass: 'question-clue kanji-reading',
          correctAnswer: item.meaning,
          options,
          type: 'choice'
        };
      });
    }

    // Generate a single random question for Endless Mode
    generateEndlessQuestion(kanaType) {
      let pool = [];
      if (kanaType === 'hiragana') pool = [...HIRAGANA];
      else if (kanaType === 'katakana') pool = [...KATAKANA];

      const item = pool[Math.floor(Math.random() * pool.length)];
      const allRomaji = [...new Set(pool.map(k => k.romaji))];
      const options = this._generateOptions(item.romaji, allRomaji, 4);

      return {
        display: item.kana,
        correctAnswer: item.romaji,
        options,
        type: 'choice'
      };
    }

    // Start endless mode — generates the first question
    startEndless(kanaType) {
      this.endlessMode = true;
      this.kanaType = kanaType;
      this.endlessCorrect = 0;
      this.endlessWrong = 0;
      this.endlessTotal = 0;
      this.currentIndex = 0;
      this.score = 0;
      this.answers = [];
      this.questions = [];

      // Generate first question
      const q = this.generateEndlessQuestion(kanaType);
      this.questions.push(q);
    }

    // Move to next endless question
    nextEndless() {
      const q = this.generateEndlessQuestion(this.kanaType);
      this.questions.push(q);
      this.currentIndex = this.questions.length - 1;
    }

    // Generate retry questions from wrong answers
    generateRetry(wrongAnswers, level) {
      this.questions = wrongAnswers.map(wa => {
        const q = { ...wa.originalQuestion };
        return q;
      });
      this._shuffle(this.questions);
    }

    _generateOptions(correct, allOptions, count) {
      const uniqueOptions = [...new Set(allOptions)].filter(o => o !== correct);
      this._shuffle(uniqueOptions);
      const wrong = uniqueOptions.slice(0, count - 1);
      const options = [correct, ...wrong];
      this._shuffle(options);
      return options;
    }

    _shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    getCurrentQuestion() {
      return this.questions[this.currentIndex] || null;
    }

    checkAnswer(userAnswer) {
      const q = this.getCurrentQuestion();
      if (!q) return null;

      const normalized = userAnswer.trim().toLowerCase();
      const correct = q.correctAnswer.trim().toLowerCase();
      const isCorrect = normalized === correct;

      if (isCorrect && !this.practiceMode) {
        this.score += 10;
      }

      if (this.endlessMode) {
        this.endlessTotal++;
        if (isCorrect) this.endlessCorrect++;
        else this.endlessWrong++;
      }

      const result = {
        question: q,
        userAnswer: userAnswer.trim(),
        correctAnswer: q.correctAnswer,
        isCorrect,
        originalQuestion: q
      };

      // Store answer if not already answered
      if (!this.answers[this.currentIndex]) {
        this.answers[this.currentIndex] = result;
      }

      return result;
    }

    isAnswered() {
      return !!this.answers[this.currentIndex];
    }

    getAnswer() {
      return this.answers[this.currentIndex] || null;
    }

    next() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++;
        return true;
      }
      return false;
    }

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        return true;
      }
      return false;
    }

    isComplete() {
      if (this.endlessMode) return false; // Endless never "completes"
      return this.answers.filter(Boolean).length === this.questions.length;
    }

    getResults() {
      if (this.endlessMode) {
        const total = this.endlessTotal;
        const correct = this.endlessCorrect;
        const wrong = this.endlessWrong;
        const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
        return { score: this.score, correct, wrong, total, percent, answers: this.answers };
      }
      const answered = this.answers.filter(Boolean);
      const correct = answered.filter(a => a.isCorrect).length;
      const wrong = answered.filter(a => !a.isCorrect).length;
      const total = this.questions.length;
      const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
      return { score: this.score, correct, wrong, total, percent, answers: this.answers };
    }

    getWrongAnswers() {
      return this.answers.filter(a => a && !a.isCorrect);
    }

    reset() {
      this.questions = [];
      this.currentIndex = 0;
      this.score = 0;
      this.answers = [];
      this.endlessMode = false;
      this.endlessCorrect = 0;
      this.endlessWrong = 0;
      this.endlessTotal = 0;
    }
  }

  // ──────────────────────────────────────────
  // UI Controller
  // ──────────────────────────────────────────
  const sound = new SoundManager();
  const leaderboard = new LeaderboardManager();
  const game = new GameEngine();
  const timer = new TimerManager();

  // DOM elements
  const $ = id => document.getElementById(id);

  const pages = {
    menu: $('page-menu'),
    game: $('page-game'),
    result: $('page-result'),
    leaderboard: $('page-leaderboard')
  };

  // ── Page navigation ──
  function showPage(name) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    pages[name].classList.add('active');
  }

  // ── Dark mode ──
  function initDarkMode() {
    const saved = localStorage.getItem('kq_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      $('btn-dark-mode').classList.add('active');
    }
  }

  $('btn-dark-mode').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('kq_theme', 'light');
      $('btn-dark-mode').classList.remove('active');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('kq_theme', 'dark');
      $('btn-dark-mode').classList.add('active');
    }
  });

  // ── Sound toggle ──
  function updateSoundBtn() {
    $('btn-sound').textContent = sound.enabled ? '🔊' : '🔇';
    if (sound.enabled) $('btn-sound').classList.remove('active');
    else $('btn-sound').classList.add('active');
  }

  $('btn-sound').addEventListener('click', () => {
    sound.toggle();
    updateSoundBtn();
  });

  // ── Sound settings modal ──
  const SOUND_FILES = [];
  let soundFilesLoaded = false;

  async function loadSoundFiles() {
    if (soundFilesLoaded) return;

    // Use predefined list if available (fixes file:// protocol CORS issues)
    if (window.SOUND_LIST && Array.isArray(window.SOUND_LIST)) {
      window.SOUND_LIST.forEach(name => {
        if (!SOUND_FILES.includes(name)) SOUND_FILES.push(name);
      });
    } else {
      try {
        const res = await fetch('sounds/');
        const html = await res.text();
        // Match all href values pointing to audio files
        const regex = /href="[^"]*?([^"/]+\.(mp3|wav|ogg|mpeg|m4a|webm|flac))"/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
          const name = decodeURIComponent(match[1]);
          if (!SOUND_FILES.includes(name)) SOUND_FILES.push(name);
        }
      } catch (e) {
        // Fallback: can't auto-detect
      }
    }
    
    SOUND_FILES.sort();
    soundFilesLoaded = true;
  }

  function populateSoundSelects() {
    ['select-sound-correct', 'select-sound-wrong'].forEach(id => {
      const sel = $(id);
      // Keep the default option, remove others
      while (sel.options.length > 1) sel.remove(1);
      SOUND_FILES.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = `🔊 ${f}`;
        sel.appendChild(opt);
      });
    });

    // Set current values
    $('select-sound-correct').value = sound.customCorrect;
    $('select-sound-wrong').value = sound.customWrong;
  }

  $('btn-sound-settings').addEventListener('click', async () => {
    await loadSoundFiles();
    populateSoundSelects();
    $('sound-modal-overlay').classList.remove('hidden');
  });

  $('btn-close-sound-modal').addEventListener('click', () => {
    $('sound-modal-overlay').classList.add('hidden');
  });

  $('sound-modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('sound-modal-overlay')) {
      $('sound-modal-overlay').classList.add('hidden');
    }
  });

  // Preview buttons
  $('btn-preview-correct').addEventListener('click', () => {
    const file = $('select-sound-correct').value;
    if (file) {
      const a = new Audio(`sounds/${file}`);
      a.volume = 0.5;
      a.play().catch(() => {});
    } else {
      // Play default oscillator
      sound.play('correct');
    }
  });

  $('btn-preview-wrong').addEventListener('click', () => {
    const file = $('select-sound-wrong').value;
    if (file) {
      const a = new Audio(`sounds/${file}`);
      a.volume = 0.5;
      a.play().catch(() => {});
    } else {
      sound.play('wrong');
    }
  });

  // Save
  $('btn-save-sounds').addEventListener('click', () => {
    sound.setCustomSound('correct', $('select-sound-correct').value);
    sound.setCustomSound('wrong', $('select-sound-wrong').value);
    $('sound-modal-overlay').classList.add('hidden');
  });

  // Reset
  $('btn-reset-sounds').addEventListener('click', () => {
    sound.resetToDefault();
    $('select-sound-correct').value = '';
    $('select-sound-wrong').value = '';
  });

  // ── Logo → home ──
  $('logo-home').addEventListener('click', () => {
    timer.stop();
    showPage('menu');
  });

  // ── Level card toggle settings ──
  document.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't toggle if clicking inside settings
      if (e.target.closest('.level-settings')) return;
      const id = card.id;
      let settingsId;
      if (id === 'card-level-endless') {
        settingsId = 'settings-endless';
      } else {
        const level = id.replace('card-level-', '');
        settingsId = `settings-${level}`;
      }
      const settings = $(settingsId);

      // Close other settings
      document.querySelectorAll('.level-settings').forEach(s => {
        if (s !== settings) s.classList.remove('active');
      });

      settings.classList.toggle('active');
    });
  });

  // ── Chip selection (generic) ──
  function setupChips(containerId, singleSelect = true) {
    const container = $(containerId);
    if (!container) return;
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (singleSelect) {
          container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        }
        chip.classList.toggle('selected');
      });
    });
  }

  setupChips('kana-type-chips');
  setupChips('count-chips-1');
  setupChips('count-chips-2');
  setupChips('count-chips-3');
  setupChips('count-chips-4');
  setupChips('endless-type-chips');

  // ── Update count chips visibility based on kana type selection ──
  function updateCountChipsVisibility() {
    const kanaType = getSelectedChip('kana-type-chips') || 'hiragana';
    const countChips = $('count-chips-1').querySelectorAll('.chip');

    countChips.forEach(chip => {
      const val = chip.dataset.value;
      let shouldHide = false;

      if (kanaType === 'hiragana') {
        // Hide "Semua Katakana" and "Semua"
        if (val === 'all-katakana' || val === 'all') shouldHide = true;
      } else if (kanaType === 'katakana') {
        // Hide "Semua Hiragana" and "Semua"
        if (val === 'all-hiragana' || val === 'all') shouldHide = true;
      } else if (kanaType === 'mixed') {
        // Hide "Semua Hiragana" and "Semua Katakana"
        if (val === 'all-hiragana' || val === 'all-katakana') shouldHide = true;
      }

      chip.style.display = shouldHide ? 'none' : '';

      // If the currently selected chip is being hidden, deselect it
      if (shouldHide && chip.classList.contains('selected')) {
        chip.classList.remove('selected');
        // Select "10" as default fallback
        const fallback = $('count-chips-1').querySelector('.chip[data-value="10"]');
        if (fallback) fallback.classList.add('selected');
      }
    });
  }

  // Hook into kana type chip clicks
  $('kana-type-chips').querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      updateCountChipsVisibility();
    });
  });

  // Run on init
  updateCountChipsVisibility();

  // ── Toggle switches ──
  document.querySelectorAll('.toggle-switch').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOn = toggle.dataset.on === 'true';
      toggle.dataset.on = isOn ? 'false' : 'true';
      toggle.classList.toggle('on');
    });
  });

  // ── Custom input — deselect chips when typing ──
  $('custom-count-1').addEventListener('input', (e) => {
    e.stopPropagation();
    if (e.target.value) {
      document.querySelectorAll('#count-chips-1 .chip').forEach(c => c.classList.remove('selected'));
    }
  });
  $('custom-count-1').addEventListener('click', (e) => e.stopPropagation());

  // ── Get selected chip value ──
  function getSelectedChip(containerId) {
    const container = $(containerId);
    const selected = container.querySelector('.chip.selected');
    return selected ? selected.dataset.value : null;
  }

  // ── Timer display helper ──
  function updateTimerDisplay(seconds) {
    $('game-timer-display').textContent = `⏱️ ${TimerManager.formatTime(seconds)}`;
  }

  // ──────────────────────────────────────────
  // START GAME
  // ──────────────────────────────────────────
  function startGame(level) {
    game.reset();
    game.level = level;

    // Hide endless-specific UI
    $('btn-stop-endless').classList.add('hidden');
    $('endless-stats-bar').classList.add('hidden');
    $('progress-bar-container').classList.remove('hidden');
    $('question-counter').classList.remove('hidden');
    $('btn-prev').classList.remove('hidden');

    game.practiceMode = false;
    const practiceEl = $(`practice-toggle-${level}`);
    if (practiceEl) game.practiceMode = practiceEl.dataset.on === 'true';

    if (level === 1) {
      const kanaType = getSelectedChip('kana-type-chips') || 'hiragana';
      game.kanaType = kanaType;

      // Get count
      let count = getSelectedChip('count-chips-1');
      const custom = $('custom-count-1').value;

      if (custom && !count) {
        count = parseInt(custom);
      } else if (!count) {
        count = 10;
      }

      game.generateLevel1(kanaType, count);
    } else if (level === 2) {
      let count = getSelectedChip('count-chips-2') || '10';
      game.generateLevel2(parseInt(count));
    } else if (level === 3) {
      let count = getSelectedChip('count-chips-3') || '10';
      game.generateLevel3(parseInt(count));
    } else if (level === 4) {
      let count = getSelectedChip('count-chips-4') || '10';
      game.generateLevel4(count);
    }

    if (game.questions.length === 0) return;

    // Update UI
    const levelLabels = {
      1: 'Level 1 — Huruf → Romaji',
      2: 'Level 2 — Kata → Romaji',
      3: 'Level 3 — Kalimat → Romaji',
      4: 'Level 4 — Kanji → Arti'
    };
    $('game-level-label').textContent = levelLabels[level];

    if (game.practiceMode) {
      $('game-score-display').classList.add('hidden');
    } else {
      $('game-score-display').classList.remove('hidden');
      $('score-value').textContent = '0';
    }

    // Start timer
    updateTimerDisplay(0);
    timer.start(updateTimerDisplay);

    showPage('game');
    renderQuestion();
  }

  // ──────────────────────────────────────────
  // START ENDLESS MODE
  // ──────────────────────────────────────────
  function startEndlessGame() {
    game.reset();
    const kanaType = getSelectedChip('endless-type-chips') || 'hiragana';
    game.startEndless(kanaType);
    game.level = 'endless';

    // Show endless-specific UI, hide normal UI
    $('btn-stop-endless').classList.remove('hidden');
    $('endless-stats-bar').classList.remove('hidden');
    $('progress-bar-container').classList.add('hidden');
    $('question-counter').classList.add('hidden');
    $('btn-prev').classList.add('hidden');

    // Reset stats display
    $('endless-correct-count').textContent = '0';
    $('endless-wrong-count').textContent = '0';

    // Label
    const typeLabel = kanaType === 'hiragana' ? 'Hiragana' : 'Katakana';
    $('game-level-label').textContent = `Endless Mode — ${typeLabel}`;

    // Score
    $('game-score-display').classList.remove('hidden');
    $('score-value').textContent = '0';

    // Start timer
    updateTimerDisplay(0);
    timer.start(updateTimerDisplay);

    showPage('game');
    renderEndlessQuestion();
  }

  // Start buttons
  $('btn-start-1').addEventListener('click', (e) => { e.stopPropagation(); startGame(1); });
  $('btn-start-2').addEventListener('click', (e) => { e.stopPropagation(); startGame(2); });
  $('btn-start-3').addEventListener('click', (e) => { e.stopPropagation(); startGame(3); });
  $('btn-start-4').addEventListener('click', (e) => { e.stopPropagation(); startGame(4); });
  $('btn-start-endless').addEventListener('click', (e) => { e.stopPropagation(); startEndlessGame(); });

  // Stop Endless button
  $('btn-stop-endless').addEventListener('click', () => {
    finishGame();
  });

  // ──────────────────────────────────────────
  // RENDER QUESTION (Normal Mode)
  // ──────────────────────────────────────────
  function renderQuestion() {
    const q = game.getCurrentQuestion();
    if (!q) return;

    const total = game.questions.length;
    const idx = game.currentIndex;

    // Progress
    $('progress-bar').style.width = `${((idx + 1) / total) * 100}%`;
    $('question-counter').textContent = `Soal ${idx + 1} / ${total}`;

    // Question display
    const display = $('question-display');
    display.textContent = q.display;
    display.className = q.displayClass || 'question-kana';

    // Clue
    const clue = $('question-clue');
    if (q.clue) {
      clue.textContent = q.clue;
      clue.className = q.clueClass || 'question-clue';
      clue.classList.remove('hidden');
    } else {
      clue.className = 'question-clue';
      clue.classList.add('hidden');
    }

    // Hide feedback
    $('feedback').classList.remove('show', 'correct', 'wrong');

    // Show options or input
    if (q.type === 'choice') {
      $('options-grid').classList.remove('hidden');
      $('answer-input-group').classList.add('hidden');
      renderOptions(q);
    } else {
      $('options-grid').classList.add('hidden');
      $('answer-input-group').classList.remove('hidden');
      $('answer-input').value = '';
      $('answer-input').disabled = false;
      $('answer-input').classList.remove('correct', 'wrong');
      $('btn-submit').disabled = false;

      // Check if already answered
      const prev = game.getAnswer();
      if (prev) {
        $('answer-input').value = prev.userAnswer;
        $('answer-input').disabled = true;
        $('btn-submit').disabled = true;
        $('answer-input').classList.add(prev.isCorrect ? 'correct' : 'wrong');
        showFeedback(prev.isCorrect, prev.correctAnswer);
      } else {
        setTimeout(() => $('answer-input').focus(), 100);
      }
    }

    // Navigation
    $('btn-prev').disabled = idx === 0;

    // Update next button
    if (game.isComplete()) {
      $('btn-next').textContent = 'Lihat Hasil 🏆';
      $('btn-next').disabled = false;
    } else if (idx === total - 1) {
      const answered = game.isAnswered();
      $('btn-next').textContent = answered && game.isComplete() ? 'Lihat Hasil 🏆' : 'Selanjutnya →';
      $('btn-next').disabled = !answered;
    } else {
      $('btn-next').textContent = 'Selanjutnya →';
      $('btn-next').disabled = !game.isAnswered();
    }

    // Score
    $('score-value').textContent = game.score;

    // Animate card
    $('question-card').style.animation = 'none';
    $('question-card').offsetHeight; // trigger reflow
    $('question-card').style.animation = 'fadeSlideIn 0.3s ease';
  }

  // ──────────────────────────────────────────
  // RENDER ENDLESS QUESTION
  // ──────────────────────────────────────────
  function renderEndlessQuestion() {
    const q = game.getCurrentQuestion();
    if (!q) return;

    // Question display
    const display = $('question-display');
    display.textContent = q.display;
    display.className = 'question-kana';

    // Hide clue
    $('question-clue').classList.add('hidden');

    // Hide feedback
    $('feedback').classList.remove('show', 'correct', 'wrong');

    // Always show choice options for endless mode
    $('options-grid').classList.remove('hidden');
    $('answer-input-group').classList.add('hidden');
    renderOptions(q);

    // Next button is hidden in endless, stop button is shown
    $('btn-next').textContent = 'Selanjutnya →';
    $('btn-next').disabled = true;

    // Score
    $('score-value').textContent = game.score;

    // Animate card
    $('question-card').style.animation = 'none';
    $('question-card').offsetHeight;
    $('question-card').style.animation = 'fadeSlideIn 0.3s ease';
  }

  function renderOptions(q) {
    const grid = $('options-grid');
    grid.innerHTML = '';

    const prevAnswer = game.getAnswer();

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;

      if (prevAnswer) {
        btn.classList.add('disabled');
        if (opt === prevAnswer.correctAnswer) {
          btn.classList.add('correct');
          btn.classList.remove('disabled');
        }
        if (opt === prevAnswer.userAnswer && !prevAnswer.isCorrect) {
          btn.classList.add('wrong');
          btn.classList.remove('disabled');
        }
        if (opt !== prevAnswer.correctAnswer && opt !== prevAnswer.userAnswer) {
          btn.classList.add('disabled');
        }
      } else {
        btn.addEventListener('click', () => handleChoiceAnswer(opt));
      }

      grid.appendChild(btn);
    });
  }

  // ──────────────────────────────────────────
  // HANDLE ANSWERS
  // ──────────────────────────────────────────
  function handleChoiceAnswer(selected) {
    if (game.isAnswered()) return;

    const result = game.checkAnswer(selected);
    if (!result) return;

    // Update options visually
    const buttons = $('options-grid').querySelectorAll('.option-btn');
    buttons.forEach(btn => {
      btn.classList.add('disabled');
      const text = btn.textContent;
      if (text === result.correctAnswer) {
        btn.classList.add('correct');
        btn.classList.remove('disabled');
      }
      if (text === selected && !result.isCorrect) {
        btn.classList.add('wrong');
        btn.classList.remove('disabled');
      }
    });

    // Sound & feedback
    sound.play(result.isCorrect ? 'correct' : 'wrong');
    showFeedback(result.isCorrect, result.correctAnswer);

    // Score
    if (!game.practiceMode) {
      $('score-value').textContent = game.score;
      if (result.isCorrect) {
        $('score-value').classList.add('score-pop');
        setTimeout(() => $('score-value').classList.remove('score-pop'), 400);
      }
    }

    // Update endless stats
    if (game.endlessMode) {
      $('endless-correct-count').textContent = game.endlessCorrect;
      $('endless-wrong-count').textContent = game.endlessWrong;

      // Auto-advance in endless mode after a short delay
      setTimeout(() => {
        if (game.endlessMode) {
          game.nextEndless();
          renderEndlessQuestion();
        }
      }, 1000);
    } else {
      // Update nav
      updateNavButtons();
    }
  }

  function handleInputAnswer() {
    const input = $('answer-input');
    const value = input.value.trim();
    if (!value || game.isAnswered()) return;

    const result = game.checkAnswer(value);
    if (!result) return;

    input.disabled = true;
    $('btn-submit').disabled = true;
    input.classList.add(result.isCorrect ? 'correct' : 'wrong');

    // Sound & feedback
    sound.play(result.isCorrect ? 'correct' : 'wrong');
    showFeedback(result.isCorrect, result.correctAnswer);

    // Score
    if (!game.practiceMode) {
      $('score-value').textContent = game.score;
      if (result.isCorrect) {
        $('score-value').classList.add('score-pop');
        setTimeout(() => $('score-value').classList.remove('score-pop'), 400);
      }
    }

    updateNavButtons();
  }

  $('btn-submit').addEventListener('click', handleInputAnswer);
  $('answer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleInputAnswer();
  });

  function showFeedback(isCorrect, correctAnswer) {
    const fb = $('feedback');
    fb.classList.remove('show', 'correct', 'wrong');
    fb.offsetHeight; // reflow
    fb.classList.add('show', isCorrect ? 'correct' : 'wrong');
    $('feedback-icon').textContent = isCorrect ? '✅' : '❌';
    $('feedback-text').textContent = isCorrect
      ? 'Benar! Hebat!'
      : `Salah! Jawaban yang benar: ${correctAnswer}`;
  }

  function updateNavButtons() {
    const idx = game.currentIndex;
    const total = game.questions.length;

    $('btn-prev').disabled = idx === 0;

    if (game.isComplete()) {
      $('btn-next').textContent = 'Lihat Hasil 🏆';
      $('btn-next').disabled = false;
    } else if (game.isAnswered()) {
      $('btn-next').textContent = idx === total - 1 ? 'Selanjutnya →' : 'Selanjutnya →';
      $('btn-next').disabled = false;
    } else {
      $('btn-next').disabled = true;
    }
  }

  // ── Navigation ──
  $('btn-next').addEventListener('click', () => {
    if (game.endlessMode) return; // Endless mode doesn't use next button for navigation
    if (game.isComplete()) {
      finishGame();
      return;
    }
    if (game.next()) {
      renderQuestion();
    }
  });

  $('btn-prev').addEventListener('click', () => {
    if (game.prev()) {
      renderQuestion();
    }
  });

  // ──────────────────────────────────────────
  // FINISH GAME → RESULT
  // ──────────────────────────────────────────
  function finishGame() {
    const duration = timer.stop();
    sound.play('complete');
    const results = game.getResults();

    // Emoji & title
    let emoji, title;
    if (results.percent === 100) { emoji = '🏆'; title = 'Sempurna!'; }
    else if (results.percent >= 80) { emoji = '🎉'; title = 'Luar Biasa!'; }
    else if (results.percent >= 60) { emoji = '👍'; title = 'Bagus!'; }
    else if (results.percent >= 40) { emoji = '💪'; title = 'Terus Berlatih!'; }
    else { emoji = '📚'; title = 'Jangan Menyerah!'; }

    $('result-emoji').textContent = emoji;
    $('result-title').textContent = title;

    // Animated score count
    animateCounter($('result-score'), results.score);
    $('stat-correct').textContent = results.correct;
    $('stat-wrong').textContent = results.wrong;
    $('stat-percent').textContent = `${results.percent}%`;
    $('stat-duration').textContent = TimerManager.formatTime(duration);

    // Wrong answers list
    const wrongAnswers = game.getWrongAnswers();
    const wrongSection = $('wrong-answers-section');
    const wrongList = $('wrong-answers-list');
    wrongList.innerHTML = '';

    if (wrongAnswers.length > 0) {
      wrongSection.classList.remove('hidden');
      $('btn-retry-wrong').classList.remove('hidden');

      wrongAnswers.forEach(wa => {
        const item = document.createElement('div');
        item.className = 'wrong-answer-item';
        item.innerHTML = `
          <div class="wrong-q">${wa.question.display}</div>
          <div class="wrong-details">
            <div class="wrong-your">Jawaban: ${wa.userAnswer}</div>
            <div class="wrong-correct">Benar: ${wa.correctAnswer}</div>
          </div>
        `;
        wrongList.appendChild(item);
      });
    } else {
      wrongSection.classList.add('hidden');
      $('btn-retry-wrong').classList.add('hidden');
    }

    // Save to leaderboard (if not practice mode)
    if (!game.practiceMode) {
      leaderboard.add({
        level: game.level,
        score: results.score,
        total: results.total,
        correct: results.correct,
        percent: results.percent,
        duration: duration
      });
    }

    showPage('result');
  }

  function animateCounter(el, target) {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = current;
    }, 30);
  }

  // ── Result actions ──
  $('btn-retry-wrong').addEventListener('click', () => {
    const wrongAnswers = game.getWrongAnswers();
    const level = game.level;
    game.reset();
    game.level = level;
    game.generateRetry(wrongAnswers, level);
    if (game.questions.length === 0) return;

    // Hide endless-specific UI
    $('btn-stop-endless').classList.add('hidden');
    $('endless-stats-bar').classList.add('hidden');
    $('progress-bar-container').classList.remove('hidden');
    $('question-counter').classList.remove('hidden');
    $('btn-prev').classList.remove('hidden');

    const levelLabels = {
      1: 'Level 1 — Ulangi Soal Salah',
      2: 'Level 2 — Ulangi Soal Salah',
      3: 'Level 3 — Ulangi Soal Salah',
      4: 'Kanji — Ulangi Soal Salah',
      'endless': 'Endless — Ulangi Soal Salah'
    };
    $('game-level-label').textContent = levelLabels[level] || 'Ulangi Soal Salah';
    $('game-score-display').classList.remove('hidden');
    $('score-value').textContent = '0';

    // Start timer
    updateTimerDisplay(0);
    timer.start(updateTimerDisplay);

    showPage('game');
    renderQuestion();
  });

  $('btn-play-again').addEventListener('click', () => {
    if (game.level === 'endless') {
      startEndlessGame();
    } else {
      startGame(game.level);
    }
  });

  $('btn-result-home').addEventListener('click', () => {
    showPage('menu');
  });

  // ──────────────────────────────────────────
  // LEADERBOARD
  // ──────────────────────────────────────────
  let currentLBLevel = 1;

  $('btn-leaderboard').addEventListener('click', () => {
    renderLeaderboard(currentLBLevel);
    showPage('leaderboard');
  });

  $('btn-lb-back').addEventListener('click', () => showPage('menu'));

  // Tab clicks
  $('lb-tabs').querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $('lb-tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const lvl = tab.dataset.level;
      currentLBLevel = lvl === 'endless' ? 'endless' : parseInt(lvl);
      renderLeaderboard(currentLBLevel);
    });
  });

  function renderLeaderboard(level) {
    const entries = leaderboard.getByLevel(level);
    const tbody = $('lb-tbody');
    const table = $('lb-table');
    const empty = $('lb-empty');

    tbody.innerHTML = '';

    if (entries.length === 0) {
      table.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    table.classList.remove('hidden');
    empty.classList.add('hidden');

    entries.forEach((entry, idx) => {
      const rank = idx + 1;
      let rankClass = 'rank-other';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';

      const date = new Date(entry.date);
      const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      const durationStr = entry.duration != null ? TimerManager.formatTime(entry.duration) : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="rank-badge ${rankClass}">${rank}</span></td>
        <td style="font-weight:700; color:var(--primary)">${entry.score}</td>
        <td>${entry.correct}/${entry.total}</td>
        <td>${entry.percent}%</td>
        <td style="font-weight:600; color:var(--accent-purple)">${durationStr}</td>
        <td style="color:var(--text-muted);font-size:0.8rem">${dateStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  $('btn-clear-lb').addEventListener('click', () => {
    if (confirm('Hapus semua data leaderboard?')) {
      leaderboard.clear();
      renderLeaderboard(currentLBLevel);
    }
  });

  // ──────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────
  initDarkMode();
  updateSoundBtn();

})();
