(function () {
    'use strict';

    var diceEl = document.getElementById('dice');
    var nextRollEl = document.getElementById('next-roll');
    var rollNowBtn = document.getElementById('roll-now');

    var COUNTDOWN_STEP_MS = 1000;
    var ANIMATION_MS = 600;

    var nextRollAt = Date.now() + 60000;
    var countdownTimerId = null;
    var animationTimeoutId = null;

    function updateDiceFace(value) {
        diceEl.textContent = String(value);
    }

    function triggerRollAnimation() {
        diceEl.classList.remove('rolling');
        void diceEl.offsetWidth;
        diceEl.classList.add('rolling');
        clearTimeout(animationTimeoutId);
        animationTimeoutId = setTimeout(function () {
            diceEl.classList.remove('rolling');
        }, ANIMATION_MS + 50);
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
                if (typeof data.value === 'number') {
                    triggerRollAnimation();
                    updateDiceFace(data.value);
                }
                if (typeof data.nextRollAt === 'number') {
                    nextRollAt = data.nextRollAt;
                    startCountdown();
                }
            } catch (e) {
                console.error('Bad event data', e);
            }
        };
        es.onerror = function () {
            // Try to reconnect by replacing the EventSource
            setTimeout(function () {
                es.close();
                connectSSE();
            }, 2000);
        };
    }

    rollNowBtn.addEventListener('click', function () {
        fetch('/api/roll-now', { method: 'POST' }).catch(function () {});
    });

    // Initial sync
    fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
        updateDiceFace(s.value);
        nextRollAt = s.nextRollAt;
        startCountdown();
    }).catch(function () {});

    connectSSE();
})();

