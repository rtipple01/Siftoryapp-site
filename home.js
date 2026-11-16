/* Siftory home page: hero auto-swipe demo, "Have a go" deck, Media Roll and gallery controls. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var LABEL = { up: 'Keep', down: 'Trash', left: 'Later', right: 'Favourite' };
  var KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  var COLLS = ['Family', 'For Ref', 'Fun', 'Random'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* c: optional Keep Collection index; the stamp then names the Collection instead of "Keep". */
  function setStamp(card, dir, c) {
    var stamp = $('.stamp', card);
    var hasColl = c !== null && c !== undefined;
    stamp.textContent = hasColl ? COLLS[c] : LABEL[dir];
    stamp.setAttribute('data-dir', dir);
    if (hasColl) stamp.setAttribute('data-coll', String(c)); else stamp.removeAttribute('data-coll');
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
    var start = { up: 2, down: 24, left: 0, right: 1 };
    var counts = {};
    var sequence = ['up', 'right', 'down', 'up', 'left', 'up', 'down', 'right', 'up', 'down'];
    var step = 0;
    var sortedEl = $('[data-sorted]', stage);
    var trashEl = $('[data-trashed]', stage);
    var progress = $('[data-progress]', stage);
    var currentEl = $('[data-current]', stage);
    var POOL = 1242;
    var chips = $$('.as-colls li[data-coll]', stage);
    var collCounts = [0, 0, 0, 0];
    var keeps = 0;
    var nextColl = 0;

    function resetCounts() {
      Object.keys(start).forEach(function (k) { counts[k] = start[k]; });
      collCounts = [0, 0, 0, 0];
    }
    function total() { return counts.up + counts.down + counts.left + counts.right; }
    function render() {
      Object.keys(counts).forEach(function (k) { var el = $('[data-count="' + k + '"]', stage); if (el) el.textContent = counts[k]; });
      sortedEl.textContent = total();
      trashEl.textContent = counts.down;
      if (currentEl) currentEl.textContent = total() + 1;
      progress.style.width = (total() / POOL * 100).toFixed(2) + '%';
      chips.forEach(function (chip, i) { $('i', chip).textContent = collCounts[i]; });
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
      var c = null;
      /* About one Keep in four goes straight into a Keep Collection, as in the app. */
      if (dir === 'up' && chips.length) {
        keeps += 1;
        if (keeps % 4 === 2) { c = nextColl; nextColl = (nextColl + 1) % chips.length; }
      }
      setStamp(card, dir, c);
      card.classList.add('stamped', 'flying');
      flash([$('.m-tab[data-dir="' + dir + '"]', stage), $('.tally-chip[data-dir="' + dir + '"]', stage), c !== null ? chips[c] : null].filter(Boolean), 700);
      setTimeout(function () {
        card.classList.add('out-' + dir);
        cur = (cur + 1) % n;
        layout();
        counts[dir] += 1;
        if (c !== null) collCounts[c] += 1;
        if (total() >= 60) resetCounts();
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

    /* Tapping a label (on the phone or the counters around it) swipes that way. */
    var tapBusy = false;
    stage.addEventListener('click', function (e) {
      var t = e.target.closest('.m-tab[data-dir], .tally-chip[data-dir]');
      if (!t || tapBusy) return;
      tapBusy = true;
      setTimeout(function () { tapBusy = false; }, 900);
      clearTimeout(timer);
      swipe(t.getAttribute('data-dir'));
      if (running) timer = setTimeout(tick, 3000);
    });
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
    var coll = [0, 0, 0, 0];
    var endPanel = $('[data-try-end]', deck);
    var live = $('[data-try-live]', section);
    var undoBtns = $$('[data-try-undo]', section);
    var progressEls = $$('[data-try-progress], [data-try-bar]', section);
    var dirButtons = $$('[data-try-btn]', section);
    var collButtons = $$('[data-try-coll]', section);
    var collChips = collButtons.map(function (b) { return b.closest('li'); });
    var collRow = $('.try-colls ul', section);
    var collTally = $$('.coll-tally li', section);
    var drag = null;

    function layout() {
      cards.forEach(function (card, i) {
        if (i >= cur) card.setAttribute('data-pos', String(Math.min(i - cur, 3)));
      });
    }
    function render() {
      Object.keys(counts).forEach(function (k) { $$('[data-try-count="' + k + '"]', section).forEach(function (el) { el.textContent = counts[k]; }); });
      coll.forEach(function (c, i) {
        $$('[data-try-coll-count="' + i + '"], [data-try-coll-total="' + i + '"]', section).forEach(function (el) { el.textContent = c; });
        collButtons[i].setAttribute('aria-label', 'Keep in ' + COLLS[i] + (c ? ', ' + c + ' kept' : ''));
      });
      $$('[data-try-done]', section).forEach(function (el) { el.textContent = cur; });
      $$('[data-try-current]', section).forEach(function (el) { el.textContent = Math.min(cur + 1, n); });
      progressEls.forEach(function (el) { el.style.width = (cur / n * 100) + '%'; });
      undoBtns.forEach(function (b) { b.disabled = cur === 0; });
      dirButtons.concat(collButtons).forEach(function (b) { b.disabled = cur >= n; });
    }
    function tabs(dir) { return $('.m-tab[data-dir="' + dir + '"]', stageEl); }
    function clearHits() {
      $$('.m-tab.hit', stageEl).forEach(function (t) { t.classList.remove('hit'); });
      collChips.forEach(function (c) { c.classList.remove('aim', 'pick'); });
    }

    /* dir: up/down/left/right. c: index of a Keep Collection (only with up), or null. */
    function swipe(dir, c) {
      if (cur >= n) return;
      if (dir !== 'up') c = null;
      var hasColl = c !== null && c !== undefined;
      var card = cards[cur];
      setStamp(card, dir, hasColl ? c : null);
      card.classList.remove('dragging');
      card.style.transform = '';
      card.classList.add('stamped', 'out-' + dir);
      clearHits();
      flash([tabs(dir)], 500);
      flash([$('.tally li[data-dir="' + dir + '"]', section)], 650);
      if (hasColl) { coll[c] += 1; flash([collChips[c], collTally[c]], 650); }
      history.push({ dir: dir, coll: hasColl ? c : null });
      counts[dir] += 1;
      cur += 1;
      layout();
      render();
      live.textContent = (hasColl ? 'Kept in ' + COLLS[c] : 'Sent to ' + LABEL[dir]) + '. ' + cur + ' of ' + n + ' sorted.';
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
      var last = history.pop();
      cur -= 1;
      counts[last.dir] -= 1;
      if (last.coll !== null) coll[last.coll] -= 1;
      var card = cards[cur];
      card.classList.remove('out-' + last.dir);
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
      coll = [0, 0, 0, 0];
      endPanel.hidden = true;
      clearHits();
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
    /* The Keep Collection chip nearest the pointer's x position. */
    function nearestChip(x) {
      var best = 0, bestD = Infinity;
      collChips.forEach(function (chip, i) {
        var r = chip.getBoundingClientRect();
        var d = Math.abs(x - (r.left + r.width / 2));
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }
    /* Dropping zone for a Collection: the chip row, or anywhere above the top edge of the photo area. */
    function inCollZone(y) {
      var deckTop = deck.getBoundingClientRect().top;
      var rowBottom = collRow ? collRow.getBoundingClientRect().bottom : deckTop;
      return y <= Math.max(rowBottom, deckTop + 6);
    }

    deck.addEventListener('pointerdown', function (e) {
      if (cur >= n || e.button > 0 || !e.target.closest('.sw-card')) return;
      if (e.pointerType === 'mouse') e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), card: cards[cur], key: null };
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
      var c = null, pick = false;
      if (dir === 'up') {
        c = nearestChip(e.clientX);
        pick = inCollZone(e.clientY);
      }
      var key = dir ? dir + (c !== null ? ':' + c + (pick ? '!' : '') : '') : null;
      if (key !== drag.key) {
        clearHits();
        if (dir) {
          setStamp(drag.card, dir, pick ? c : null);
          tabs(dir).classList.add('hit');
          if (c !== null) collChips[c].classList.add(pick ? 'pick' : 'aim');
        }
        drag.card.classList.toggle('stamped', !!dir);
        drag.key = key;
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
        var dir = dominant(dx, dy);
        swipe(dir, dir === 'up' && inCollZone(e.clientY) ? nearestChip(e.clientX) : null);
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
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      var num = /^[1-4]$/.test(e.key) ? Number(e.key) - 1 : -1;
      if (num >= 0) {
        if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        e.preventDefault();
        swipe('up', num);
        return;
      }
      var dir = KEYS[e.key];
      if (!dir) return;
      if (t !== deck && !t.closest('.dpad')) return;
      e.preventDefault();
      swipe(dir);
    });
    dirButtons.forEach(function (b) {
      b.addEventListener('click', function () { swipe(b.getAttribute('data-try-btn')); });
    });
    collButtons.forEach(function (b) {
      b.addEventListener('click', function () { swipe('up', Number(b.getAttribute('data-try-coll'))); });
    });
    undoBtns.forEach(function (b) { b.addEventListener('click', undo); });
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
    var shotEl = document.querySelector('.hero-shot');
    var shotW = shotEl && getComputedStyle(shotEl).float !== 'none' ? shotEl.offsetWidth + parseFloat(getComputedStyle(shotEl).marginLeft || 0) : 0;
    var target = h1.clientWidth - shotW, actual = Math.max.apply(null, lines.map(function (l) { return l.scrollWidth; }));
    if (!target || !actual) return;
    var size = parseFloat(getComputedStyle(h1).fontSize) * (target / actual) * 0.995;
    h1.style.fontSize = Math.min(size, 80) + 'px';
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('siftory:refit', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();


/* If a sample photo fails to load (patchy mobile signal), try again rather than showing a broken image. */
(function retryImages() {
  Array.prototype.forEach.call(document.querySelectorAll('img[src*="assets/demo/"], img[src*="assets/screens/"]'), function (img) {
    var tries = 0;
    function retry() {
      if (tries >= 3) return;
      tries += 1;
      var base = img.getAttribute('src').split('?')[0];
      setTimeout(function () { img.src = base + '?r=' + tries; }, 800 * tries);
    }
    img.addEventListener('error', retry);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('loading') !== 'lazy') retry();
  });
})();
