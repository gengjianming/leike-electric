/* =============================================================
   洛阳雷科电气有限公司 — 官网交互脚本
   ============================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Header scroll state ---------- */
  function initHeader() {
    var header = $('.site-header');
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 2. Mobile drawer ---------- */
  function initDrawer() {
    var burger = $('.burger');
    var drawer = $('.drawer');
    var scrim  = $('.scrim');
    if (!burger || !drawer || !scrim) return;

    var closeBtn = $('.drawer-close', drawer);

    function open() {
      drawer.classList.add('open');
      scrim.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      drawer.classList.remove('open');
      scrim.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      burger.focus();
    }

    burger.addEventListener('click', function () {
      drawer.classList.contains('open') ? close() : open();
    });
    scrim.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () {
        if (a.closest('.dsub')) close();
      });
    });

    /* Accordion sub-menus */
    $$('.drow', drawer).forEach(function (row) {
      row.addEventListener('click', function () {
        var sub = row.nextElementSibling;
        if (!sub || !sub.classList.contains('dsub')) return;
        var isOpen = row.getAttribute('aria-expanded') === 'true';
        $$('.drow', drawer).forEach(function (r) {
          r.setAttribute('aria-expanded', 'false');
          if (r.nextElementSibling && r.nextElementSibling.classList.contains('dsub')) {
            r.nextElementSibling.style.maxHeight = null;
          }
        });
        if (!isOpen) {
          row.setAttribute('aria-expanded', 'true');
          sub.style.maxHeight = sub.scrollHeight + 'px';
        }
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024 && drawer.classList.contains('open')) close();
    });
  }

  /* ---------- 3. Viewport watcher ----------
     Position check driven directly by scroll/resize rather than
     IntersectionObserver. The observer coalesces notifications during fast
     scrolling (End key, momentum wheel), and rAF can be throttled, either of
     which leaves elements stuck in their hidden state with no recovery.
     Only ~30 nodes are ever pending, so a direct check is cheap. */
  function watchViewport(nodes, onEnter, offset) {
    if (!nodes.length) return;
    var pending = nodes.slice();
    var offsetPx = offset == null ? 0.88 : offset;

    function check() {
      var limit = window.innerHeight * offsetPx;
      for (var i = pending.length - 1; i >= 0; i--) {
        /* At or above the reveal line — includes elements the user has
           already scrolled past, so scrolling back up is never blank. */
        if (pending[i].getBoundingClientRect().top < limit) {
          onEnter(pending[i]);
          pending.splice(i, 1);
        }
      }
      if (!pending.length) {
        window.removeEventListener('scroll', check);
        window.removeEventListener('resize', check);
      }
    }

    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
  }

  /* ---------- 4. Reveal on scroll ---------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (reduced) {
      items.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    watchViewport(items, function (el) { el.classList.add('in-view'); }, 0.92);
  }

  /* ---------- 5. Animated counters ---------- */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = (el.getAttribute('data-decimals') | 0);
      if (reduced) { el.textContent = target.toFixed(decimals); return; }
      var dur = 1500;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    watchViewport(nums, run, 1);
  }

  /* ---------- 9. Back to top ---------- */
  function initToTop() {
    var btn = $('.to-top');
    if (!btn) return;
    var onScroll = function () {
      btn.classList.toggle('show', window.scrollY > 520);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 10. Current year in footer ---------- */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------- 11. Active nav highlight ---------- */
  function initActiveNav() {
    var path = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-list a, .drawer-nav a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('#')[0];
      if (href && href === path) a.classList.add('active');
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    initHeader();
    initDrawer();
    initReveal();
    initCounters();
    initToTop();
    initYear();
    initActiveNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
