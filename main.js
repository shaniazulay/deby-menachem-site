(function () {
  'use strict';

  var WA_NUMBER = '972584502900';

  // ---------- Desktop: compact sections, always full width ----------
  // Each section's real content is measured, the extra top/bottom whitespace is trimmed
  // (keeping a margin and the wave shapes). Sections are not scaled down to the screen
  // height any more – scaling a section shrinks its width and left empty side margins.
  // Set FIT_HEIGHT = true to bring back "every section fits one screen" scaling.
  var desktopQuery = window.matchMedia('(min-width: 1100px)');
  var PAD = 56;      // breathing room kept above/below the content (design px)
  var MIN_K = 0.55;  // (FIT_HEIGHT only) never show a section below 55% of the design size
  var FIT_HEIGHT = false;

  function fitSections() {
    var sections = document.querySelectorAll('main > section:not(.s-marquee), .s-footer');
    sections.forEach(function (sec) {
      var frame = sec.querySelector('.frame');
      sec.style.height = ''; frame.style.transform = ''; frame.style.transformOrigin = '';
      if (!desktopQuery.matches) return;

      var fr = frame.getBoundingClientRect();
      var scale = fr.height / frame.offsetHeight || 1;   // page zoom
      var top = Infinity, bottom = -Infinity;
      (function walk(parent) {
        for (var i = 0; i < parent.children.length; i++) {
          var el = parent.children[i];
          var r = el.getBoundingClientRect();
          if (r.width && r.height) {
            top = Math.min(top, (r.top - fr.top) / scale);
            bottom = Math.max(bottom, (r.bottom - fr.top) / scale);
          }
          // Content cropped by an overflow:hidden box does not count beyond that box.
          if (getComputedStyle(el).overflow === 'visible') walk(el);
        }
      })(frame);
      if (!isFinite(top)) return;

      var h = frame.offsetHeight;
      var waveTop = sec.querySelector('.wave-top:not(.m-only)');
      var waveBottom = sec.querySelector('.wave-bottom:not(.m-only)');
      var padTop = Math.max(PAD, waveTop ? waveTop.offsetHeight + 24 : 0);
      var padBottom = Math.max(PAD, waveBottom ? waveBottom.offsetHeight + 24 : 0);
      var trimTop = Math.max(0, top - padTop);
      var trimBottom = Math.max(0, h - bottom - padBottom);
      var contentH = h - trimTop - trimBottom;                       // design px
      // MIN_K limits the on-screen size (relative to the design), not the extra factor.
      var k = FIT_HEIGHT ? Math.max(MIN_K / scale, Math.min(1, window.innerHeight / (contentH * scale))) : 1;

      frame.style.transformOrigin = '50% 0';
      frame.style.transform = 'scale(' + k + ') translateY(' + (-trimTop) + 'px)';
      sec.style.height = (contentH * k) + 'px';
    });
  }
  var fitTimer;
  function scheduleFit() { clearTimeout(fitTimer); fitTimer = setTimeout(fitSections, 60); }
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('load', fitSections);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSections);
  fitSections();

  // ---------- Mobile menu ----------
  var burger = document.querySelector('.hamburger');
  var nav = document.getElementById('site-nav');
  if (burger && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    };
    burger.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) setOpen(false);
    });
  }

  // ---------- FAQ: one open item at a time ----------
  var faqs = document.querySelectorAll('.accordion .faq');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  // ---------- Testimonials: rotate the three cards (desktop arrows) ----------
  var cards = Array.prototype.slice.call(document.querySelectorAll('.testi'));
  document.querySelectorAll('.testi-arrows .arrow').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var step = btn.dataset.dir === 'next' ? 1 : cards.length - 1;
      cards.forEach(function (c) {
        c.dataset.pos = String((Number(c.dataset.pos) + step) % cards.length);
      });
    });
  });

  // ---------- Testimonials: mobile swipe carousel (dots + active card) ----------
  var list = document.querySelector('.testi-list');
  var dotsBox = document.querySelector('.testi-dots');
  if (list && dotsBox && 'IntersectionObserver' in window) {
    var dots = cards.map(function (card, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'המלצה ' + (i + 1));
      d.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      d.addEventListener('click', function () {
        list.scrollTo({ left: card.offsetLeft - list.offsetLeft - (list.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
      });
      dotsBox.appendChild(d);
      return d;
    });
    var setActive = function (idx) {
      cards.forEach(function (c, i) { c.classList.toggle('is-dim', i !== idx); });
      dots.forEach(function (d, i) { d.setAttribute('aria-selected', String(i === idx)); });
    };
    var mobileQuery = window.matchMedia('(max-width: 1099.98px)');
    var io = new IntersectionObserver(function (entries) {
      if (!mobileQuery.matches) return;
      entries.forEach(function (e) { if (e.isIntersecting) setActive(cards.indexOf(e.target)); });
    }, { root: list, threshold: 0.6 });
    cards.forEach(function (c) { io.observe(c); });
    var syncMode = function () {
      if (mobileQuery.matches) setActive(0);
      else cards.forEach(function (c) { c.classList.remove('is-dim'); });
    };
    (mobileQuery.addEventListener ? mobileQuery.addEventListener('change', syncMode) : mobileQuery.addListener(syncMode));
    syncMode();
  }

  // ---------- Contact form → WhatsApp message (no backend needed) ----------
  var form = document.getElementById('contact-form');
  if (form) {
    var select = form.querySelector('select');
    var note = form.querySelector('.form-note');
    var noteText = note.textContent;
    select.addEventListener('change', function () { select.classList.toggle('has-value', !!select.value); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name;
      var phone = form.elements.phone;
      var ok = true;
      [name, phone].forEach(function (f) {
        var bad = !f.value.trim() || (f === phone && f.value.replace(/\D/g, '').length < 9);
        f.classList.toggle('is-invalid', bad);
        if (bad && ok) { f.focus(); ok = false; }
      });
      if (!ok) {
        note.textContent = 'נא למלא שם מלא ומספר טלפון תקין.';
        note.classList.remove('is-ok');
        return;
      }
      var lines = [
        'היי דבי, אשמח לקבוע טיפול 🌿',
        'שם: ' + name.value.trim(),
        'טלפון: ' + phone.value.trim()
      ];
      if (select.value) lines.push('סוג הטיפול: ' + select.value);
      var msg = form.elements.message.value.trim();
      if (msg) lines.push('הודעה: ' + msg);
      if (form.elements.consent.checked) lines.push('(מאשרת קבלת עדכונים במייל)');

      window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
      note.textContent = 'תודה! ההודעה מוכנה לשליחה בוואטסאפ – אחזור אלייך בהקדם.';
      note.classList.add('is-ok');
      form.reset();
      select.classList.remove('has-value');
      setTimeout(function () { note.textContent = noteText; note.classList.remove('is-ok'); }, 8000);
    });

    form.addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid') && e.target.value.trim()) e.target.classList.remove('is-invalid');
    });
  }
})();
