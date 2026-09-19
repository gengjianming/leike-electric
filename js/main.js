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

  /* ---------- 6. Category filter (products / news) ---------- */
  function initFilter() {
    var bar = $('.filters');
    if (!bar) return;

    /* Works for both the product grid and the news list. */
    var listSelector = $('.prod') ? '.prod' : ($('.news-item') ? '.news-item' : null);
    if (!listSelector) return;

    var buttons = $$('.filter', bar);
    var cards   = $$(listSelector);
    var countEl = $('.toolbar-count b');
    var empty   = $('.empty-state');

    function apply(cat) {
      var shown = 0;
      cards.forEach(function (card) {
        var match = cat === 'all' || card.getAttribute('data-cat') === cat;
        card.classList.toggle('hide', !match);
        if (match) {
          shown++;
          if (!reduced) {
            card.style.animation = 'none';
            /* force reflow so the animation restarts */
            void card.offsetWidth;
            card.style.animation = 'fadeUp .5s cubic-bezier(.22,.61,.36,1) both';
            card.style.animationDelay = Math.min(shown * 40, 320) + 'ms';
          }
        }
      });
      if (countEl) countEl.textContent = shown;
      if (empty) empty.style.display = shown ? 'none' : 'block';
    }

    function select(cat) {
      buttons.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-filter') === cat);
      });
      apply(cat);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        select(btn.getAttribute('data-filter'));
      });
    });

    /* Honour ?cat=… from nav links */
    var wanted = new URLSearchParams(location.search).get('cat');
    if (wanted && buttons.some(function (b) { return b.getAttribute('data-filter') === wanted; })) {
      select(wanted);
    }
  }

  /* ---------- 7. Product detail modal ---------- */
  function initModal() {
    var modal = $('#prodModal');
    if (!modal) return;

    var body     = $('.modal-body', modal);
    var headCat  = $('.modal-cat', modal);
    var headName = $('.modal-head h3', modal);
    var headDesc = $('.modal-head p', modal);
    var lastFocus = null;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function open(card) {
      var d = card.dataset;
      lastFocus = card;

      headCat.textContent  = d.cat || '';
      headName.textContent = d.name || '';
      headDesc.textContent = d.summary || '';

      var specs = (d.specs || '').split('|').filter(Boolean);
      var tags  = (d.apps  || '').split('|').filter(Boolean);

      var html = '';
      if (specs.length) {
        html += '<h4>主要参数</h4><table class="spec-table"><tbody>';
        specs.forEach(function (row) {
          var parts = row.split('::');
          html += '<tr><th>' + esc(parts[0]) + '</th><td>' + esc(parts[1] || '—') + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      if (d.features) {
        html += '<h4>产品特点</h4><p style="color:var(--ink-soft);line-height:1.95">' + esc(d.features) + '</p>';
      }
      if (tags.length) {
        html += '<h4>适用场景</h4><div class="modal-tags">';
        tags.forEach(function (t) { html += '<span>' + esc(t) + '</span>'; });
        html += '</div>';
      }
      html += '<div class="modal-cta">' +
                '<a class="btn btn-gold" href="contact.html">获取报价 <span class="arw">→</span></a>' +
                '<a class="btn btn-ghost" href="tel:17538869151">电话咨询 17538869151</a>' +
              '</div>';
      body.innerHTML = html;

      modal.classList.add('open');
      document.body.classList.add('no-scroll');
      var closeBtn = $('.modal-close', modal);
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      modal.classList.remove('open');
      document.body.classList.remove('no-scroll');
      if (lastFocus) lastFocus.focus();
    }

    $$('.prod').forEach(function (card) {
      var activate = function () { open(card); };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });

    $$('[data-close]', modal).forEach(function (el) {
      el.addEventListener('click', close);
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  /* ---------- 8. Contact form ---------- */
  function initForm() {
    var form = $('#contactForm');
    if (!form) return;
    var note = $('#formNote', form.parentNode) || $('#formNote');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name  = $('#f-name', form);
      var phone = $('#f-phone', form);
      var msg   = $('#f-msg', form);

      if (!name.value.trim() || !phone.value.trim()) {
        if (note) { note.textContent = '请填写您的姓名与联系电话。'; note.style.color = '#C0392B'; }
        (name.value.trim() ? phone : name).focus();
        return;
      }
      if (!/^[\d\s\-+()]{7,20}$/.test(phone.value.trim())) {
        if (note) { note.textContent = '请填写有效的联系电话。'; note.style.color = '#C0392B'; }
        phone.focus();
        return;
      }
      if (!msg.value.trim()) {
        if (note) { note.textContent = '请简要描述您的需求。'; note.style.color = '#C0392B'; }
        msg.focus();
        return;
      }

      if (note) {
        note.textContent = '提交成功，我们将尽快与您联系。如需加急，请致电 17538869151。';
        note.style.color = 'var(--gold-600)';
      }
      form.reset();
    });
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
    initFilter();
    initModal();
    initForm();
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

/* Keyframe used by the product filter (kept in JS so filtering stays self-contained) */
(function () {
  if (document.getElementById('lk-fadeup')) return;
  var s = document.createElement('style');
  s.id = 'lk-fadeup';
  s.textContent = '@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}';
  document.head.appendChild(s);
})();
