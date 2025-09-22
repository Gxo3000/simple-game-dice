(function () {
    'use strict';

    var diceEl = document.getElementById('dice');
    var nextRollEl = document.getElementById('next-roll');
    var themeSelect = document.getElementById('theme-select');
    var creditsBtn = document.getElementById('credits');

    var COUNTDOWN_STEP_MS = 1000;
    var ANIMATION_MS = 600;

    var nextRollAt = Date.now() + 60000;
    var countdownTimerId = null;
    var animationTimeoutId = null;

    function applyTheme(mode) {
        var root = document.documentElement;
        if (mode === 'dark') {
            root.classList.add('dark');
        } else if (mode === 'light') {
            root.classList.remove('dark');
        } else {
            // system
            var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) root.classList.add('dark'); else root.classList.remove('dark');
        }
    }

    function persistTheme(mode) { try { localStorage.setItem('theme', mode); } catch (e) {} }
    function readTheme() { try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; } }

    function updateDiceFace(value) { diceEl.textContent = String(value); }

    function triggerRollAnimation() {
        diceEl.classList.remove('rolling');
        void diceEl.offsetWidth;
        diceEl.classList.add('rolling');
        clearTimeout(animationTimeoutId);
        animationTimeoutId = setTimeout(function () { diceEl.classList.remove('rolling'); }, ANIMATION_MS + 50);
    }

    function startCountdown() {
        clearInterval(countdownTimerId);
        countdownTimerId = setInterval(function () {
            var remainingMs = Math.max(0, nextRollAt - Date.now());
            var remainingSec = Math.ceil(remainingMs / 1000);
            nextRollEl.textContent = remainingSec > 0 ? ('Rolling in ' + remainingSec + 's') : 'Rolling…';
        }, COUNTDOWN_STEP_MS);
    }

    function connectSSE() {
        var es = new EventSource('/api/stream');
        es.onmessage = function (evt) {
            try {
                var data = JSON.parse(evt.data);
                if (typeof data.value === 'number') { triggerRollAnimation(); updateDiceFace(data.value); }
                if (typeof data.nextRollAt === 'number') { nextRollAt = data.nextRollAt; startCountdown(); }
            } catch (e) {}
        };
        es.onerror = function () { setTimeout(function () { es.close(); connectSSE(); }, 2000); };
    }

    // Theme init
    var initialTheme = readTheme();
    if (themeSelect) { themeSelect.value = initialTheme; themeSelect.addEventListener('change', function () { var v = themeSelect.value; persistTheme(v); applyTheme(v); }); }
    applyTheme(initialTheme);
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (readTheme() === 'system') applyTheme('system'); });
    }

    if (creditsBtn) {
        creditsBtn.addEventListener('click', function () {
            alert('Cursor the best AI, and TheGxo (igodrtx)');
        });
    }

    // Start a local countdown immediately
    startCountdown();

    // Initial sync from server (if available)
    fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
        if (s && typeof s.value === 'number') updateDiceFace(s.value);
        if (s && typeof s.nextRollAt === 'number') nextRollAt = s.nextRollAt;
        startCountdown();
    }).catch(function () {});

    // Subscribe to the shared stream
    connectSSE();
})();
