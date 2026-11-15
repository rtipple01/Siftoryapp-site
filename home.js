/* Siftory home page: hero auto-swipe demo, "Have a go" deck, Media Roll and gallery controls. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LABEL = { up: 'Keep', down: 'Trash', left: 'Later', right: 'Favourite' };
  var KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setStamp(card, dir) {
    var stamp = $('.stamp', card);
    stamp.textContent = LABEL[dir];
    stamp.setAttribute('data-dir', dir);
  }

  function flash(els, ms) {
    els.forEach(function (el) {
      if (!el) return;
      el.classList.add('hit');
      setTimeout(function () { el.classList.remove('hit'); }, ms || 600);
    });
  }

  /* Runs a callback while an element is on screen, the tab is visible and the user hasn't paused it. */
  function playController(el, button, onChange) {
    var state = { visible: false, paused: false };
    function update() {
      var run = state.visible && !state.paused && !document.hidden && !reduceMotion.matches;
      onChange(run);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        state.visible = entries[0].isIntersecting;
        update();
      }, { threshold: 0.15 }).observe(el);
    } else {
      state.visible = true;
    }
    document.addEventListener('visibilitychange', update);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', update);
    if (button) {
      button.hidden = reduceMotion.matches;
      button.addEventListener('click', function () {
        state.paused = !state.paused;
        button.setAttribute('aria-pressed', String(state.paused));
        button.textContent = state.paused ? 'Play animation' : 'Pause animation';
        update();
      });
    }
    update();
  }

  /* ---------- Hero: auto-swiping phone ---------- */
  function initHero() {
    var stage = $('[data-hero-demo]');
    if (!stage) return;
    var cards = $$('.sw-card', stage);
    var n = cards.length;
    var cur = 0;
    var timer = null;
    var running = false;
    var start = { up: 5, down: 4, left: 1, right: 2 };
    var counts = {};
    var sequence = ['up', 'right', 'down', 'up', 'left', 'up', 'down', 'right', 'up', 'down'];
    var step = 0;
    var sortedEl = $('[data-sorted]', stage);
    var trashEl = $('[data-trashed]', stage);
    var progress = $('[data-progress]', stage);

    function resetCounts() { Object.keys(start).forEach(function (k) { counts[k] = start[k]; }); }
    function total() { return counts.up + counts.down + counts.left + counts.right; }
    function render() {
      Object.keys(counts).forEach(function (k) { $('[data-count="' + k + '"]', stage).textContent = counts[k]; });
      sortedEl.textContent = total();
      trashEl.textContent = counts.down;
      progress.style.width = Math.min(100, Math.round(total() / 50 * 100)) + '%';
    }
    function layout() {
      cards.forEach(function (card, i) {
        if (card.classList.contains('flying')) return;
        var pos = (i - cur + n) % n;
        card.setAttribute('data-pos', String(Math.min(pos, 3)));
      });
    }

    function swipe(dir) {
      var card = cards[cur];
      setStamp(card, dir);
      card.classList.add('stamped', 'flying');
      flash([$('.m-tab[data-dir="' + dir + '"]', stage), $('.tally-chip[data-dir="' + dir + '"]', stage)], 700);
      setTimeout(function () {
        card.classList.add('out-' + dir);
        cur = (cur + 1) % n;
        layout();
        counts[dir] += 1;
        if (total() >= 50) resetCounts();
        render();
      }, 220);
      setTimeout(function () {
        card.classList.add('no-anim');
        card.classList.remove('out-' + dir, 'stamped', 'flying');
        layout();
        void card.offsetWidth;
        card.classList.remove('no-anim');
      }, 900);
    }

    function tick() {
      if (!running) return;
      swipe(sequence[step % sequence.length]);
      step += 1;
      timer = setTimeout(tick, 1700);
    }

    resetCounts();
    render();
    playController(stage, $('[data-toggle-hero]', stage), function (run) {
      if (run === running) return;
      running = run;
      clearTimeout(timer);
      if (run) timer = setTimeout(tick, 700);
    });
  }

  /* ---------- "Have a go": draggable deck ---------- */
  function initTry() {
    var deck = $('[data-try-deck]');
    if (!deck) return;
    var section = deck.closest('section');
    var stageEl = deck.closest('.try-stage');
    var cards = $$('.sw-card', deck);
    var n = cards.length;
    var cur = 0;
    var history = [];
    var counts = { up: 0, down: 0, left: 0, right: 0 };
    var endPanel = $('[data-try-end]', deck);
    var live = $('[data-try-live]', section);
    var undoBtn = $('[data-try-undo]', section);
    var dirButtons = $$('[data-try-btn]', section);
    var drag = null;

    function layout() {
      cards.forEach(function (card, i) {
        if (i >= cur) card.setAttribute('data-pos', String(Math.min(i - cur, 3)));
      });
    }
    function render() {
      Object.keys(counts).forEach(function (k) { $('[data-try-count="' + k + '"]', section).textContent = counts[k]; });
      $('[data-try-done]', section).textContent = cur;
      undoBtn.disabled = cur === 0;
      dirButtons.forEach(function (b) { b.disabled = cur >= n; });
    }
    function tabs(dir) { return $('.m-tab[data-dir="' + dir + '"]', stageEl); }
    function clearHits() { $$('.m-tab.hit', stageEl).forEach(function (t) { t.classList.remove('hit'); }); }

    function swipe(dir) {
      if (cur >= n) return;
      var card = cards[cur];
      setStamp(card, dir);
      card.classList.remove('dragging');
      card.style.transform = '';
      card.classList.add('stamped', 'out-' + dir);
      clearHits();
      flash([tabs(dir)], 500);
      history.push(dir);
      counts[dir] += 1;
      cur += 1;
      layout();
      render();
      live.textContent = 'Sent to ' + LABEL[dir] + '. ' + cur + ' of ' + n + ' sorted.';
      if (cur === n) {
        setTimeout(function () {
          endPanel.hidden = false;
          if (deck.contains(document.activeElement) || section.contains(document.activeElement)) {
            $('[data-try-again]', endPanel).focus();
          }
        }, 450);
      }
    }

    function undo() {
      if (!history.length) return;
      var dir = history.pop();
      cur -= 1;
      counts[dir] -= 1;
      var card = cards[cur];
      card.classList.remove('out-' + dir);
      setTimeout(function () { card.classList.remove('stamped'); }, 250);
      endPanel.hidden = true;
      layout();
      render();
      live.textContent = 'Undone. ' + cur + ' of ' + n + ' sorted.';
    }

    function reset() {
      cur = 0;
      history = [];
      Object.keys(counts).forEach(function (k) { counts[k] = 0; });
      endPanel.hidden = true;
      cards.forEach(function (card) {
        card.classList.add('no-anim');
        card.classList.remove('out-up', 'out-down', 'out-left', 'out-right', 'stamped', 'dragging');
        card.style.transform = '';
      });
      layout();
      void deck.offsetWidth;
      cards.forEach(function (card) { card.classList.remove('no-anim'); });
      render();
      live.textContent = 'Started again. 0 of ' + n + ' sorted.';
    }

    function dominant(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
      return dy > 0 ? 'down' : 'up';
    }

    deck.addEventListener('pointerdown', function (e) {
      if (cur >= n || e.button > 0 || !e.target.closest('.sw-card')) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), card: cards[cur], dir: null };
      deck.setPointerCapture(e.pointerId);
      drag.card.classList.add('dragging');
    });
    deck.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      drag.card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.05) + 'deg)';
      var dir = dist > 28 ? dominant(dx, dy) : null;
      if (dir !== drag.dir) {
        clearHits();
        if (dir) { setStamp(drag.card, dir); tabs(dir).classList.add('hit'); }
        drag.card.classList.toggle('stamped', !!dir);
        drag.dir = dir;
      }
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var speed = dist / Math.max(1, Date.now() - drag.t);
      var threshold = Math.max(60, deck.clientWidth * 0.28);
      var card = drag.card;
      drag = null;
      if (e.type !== 'pointercancel' && (dist > threshold || (dist > 35 && speed > 0.6))) {
        swipe(dominant(dx, dy));
      } else {
        card.classList.remove('dragging', 'stamped');
        card.style.transform = '';
        clearHits();
      }
    }
    deck.addEventListener('dragstart', function (e) { e.preventDefault(); });
    deck.addEventListener('pointerup', endDrag);
    deck.addEventListener('pointercancel', endDrag);

    section.addEventListener('keydown', function (e) {
      var dir = KEYS[e.key];
      if (!dir) return;
      var t = e.target;
      if (t !== deck && !t.closest('.dpad')) return;
      e.preventDefault();
      swipe(dir);
    });
    dirButtons.forEach(function (b) {
      b.addEventListener('click', function () { swipe(b.getAttribute('data-try-btn')); });
    });
    undoBtn.addEventListener('click', undo);
    $('[data-try-reset]', section).addEventListener('click', reset);
    $('[data-try-again]', section).addEventListener('click', function () { reset(); deck.focus(); });

    layout();
    render();
  }

  /* ---------- Media Roll loop ---------- */
  function initRoll() {
    var wrap = $('[data-roll]');
    if (!wrap) return;
    playController(wrap, $('[data-toggle-roll]', wrap), function (run) {
      wrap.classList.toggle('is-playing', run);
    });
  }

  /* ---------- Screenshot gallery buttons ---------- */
  function initGallery() {
    var list = $('#gallery');
    var prev = $('[data-gallery-prev]');
    var next = $('[data-gallery-next]');
    if (!list || !prev || !next) return;
    function stepSize() {
      var item = list.querySelector('li');
      var gap = parseFloat(getComputedStyle(list).columnGap) || 16;
      var per = Math.max(1, Math.floor(list.clientWidth / (item.offsetWidth + gap)) - 1);
      return per * (item.offsetWidth + gap);
    }
    function update() {
      prev.disabled = list.scrollLeft <= 2;
      next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 2;
    }
    function go(sign) {
      list.scrollBy({ left: sign * stepSize(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  initHero();
  initTry();
  initRoll();
  initGallery();
})();

/* Phone: size the headline so its first line exactly spans the column, whatever font the phone uses. */
(function fitHeadline() {
  var h1 = document.getElementById('hero-title');
  var lines = h1 ? Array.prototype.slice.call(h1.querySelectorAll('.l1')) : [];
  if (!lines.length) return;
  var mq = window.matchMedia('(max-width: 959px)');
  function fit() {
    h1.style.fontSize = '';
    if (!mq.matches) return;
    var target = h1.clientWidth, actual = Math.max.apply(null, lines.map(function (l) { return l.scrollWidth; }));
    if (!target || !actual) return;
    var size = parseFloat(getComputedStyle(h1).fontSize) * (target / actual) * 0.995;
    h1.style.fontSize = Math.min(size, 80) + 'px';
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('siftory:refit', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

/* Preview layout: the app screenshot matches the height of the three headline lines. */
(function matchShot() {
  var shot = document.querySelector('.hero-shot');
  var h1 = document.getElementById('hero-title');
  if (!shot || !h1) return;
  function size() {
    for (var i = 0; i < 3; i++) {
      shot.style.height = h1.offsetHeight + 'px';
      window.dispatchEvent(new Event('siftory:refit'));
    }
  }
  if (shot.complete) size(); else shot.addEventListener('load', size);
  window.addEventListener('resize', size);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
})();
