/* =========================================================
   דבי מנחם – motion layer (GSAP 3 + ScrollTrigger)
   ---------------------------------------------------------
   • One init function, everything inside gsap.matchMedia(): full automatic cleanup on
     resize / orientation change (window.DebyAnim.revert() reverts everything manually).
   • Breakpoint = the site's layout breakpoint (1100px), so desktop motion never runs on
     the mobile layout (the spec's 992px would put desktop parallax on the 992–1099 mobile layout).
   • Desktop: depth (parallax), cursor micro-interactions, floating elements.
   • Mobile: fast, transform/opacity-only entrance reveals; no parallax; tap feedback in CSS.
   • prefers-reduced-motion: no movement – content is shown immediately, only a minimal hero fade.
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) return; // site works fully without the motion layer

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('gsap-on');

  var DESKTOP = '(min-width: 1100px)';
  var MOBILE = '(max-width: 1099.98px)';
  var REDUCE = '(prefers-reduced-motion: reduce)';
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return gsap.utils.toArray(s, ctx); };

  // Elements that receive entrance offsets are marked .gs, so the section-height
  // measurement in main.js can ignore those temporary transforms.
  function mark(targets) { $$(targets).forEach(function (el) { el.classList.add('gs'); }); return targets; }

  // Scroll-in reveal (plays once). clearProps hands the element back to CSS (hover states etc.).
  function reveal(targets, vars, trigger, start) {
    var els = $$(targets);
    if (!els.length) return null;
    mark(els);
    return gsap.from(els, Object.assign({
      opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', stagger: 0.1,
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: trigger || els[0], start: start || 'top 82%', once: true }
    }, vars));
  }

  // ---------- one-time DOM prep (shared by all branches) ----------
  var h1 = $('.hero-text h1');
  if (h1 && !h1.querySelector('.h1-line')) {
    h1.innerHTML = h1.innerHTML.split(/<br\s*\/?>/i).map(function (t) { return '<span class="h1-line">' + t.trim() + '</span>'; }).join('');
  }
  $$('.card-meta a').forEach(function (a) {
    if (!a.querySelector('.arr')) a.innerHTML = a.innerHTML.replace('←', '<span class="arr" aria-hidden="true">←</span>');
  });

  // Desktop glass header bar (clone of the hero header's logo / nav / CTA).
  var sticky = document.createElement('div');
  sticky.className = 'sticky-head';
  sticky.innerHTML =
    '<a class="sh-logo" href="#top" aria-label="דבי מנחם – לראש העמוד"><img src="assets/img/logo.webp" alt=""></a>' +
    '<nav aria-label="ניווט מהיר">' +
    $$('#site-nav a:not(.m-only)').map(function (a) { return '<a href="' + a.getAttribute('href') + '">' + a.textContent + '</a>'; }).join('') +
    '</nav><a class="sh-cta" href="#contact">שנדבר?</a>';
  document.body.appendChild(sticky);

  // Calls fn(true/false) when the page is scrolled past `px`; returns a cleanup function.
  function onScrollPast(px, fn) {
    var state = null;
    function check() { var on = window.scrollY > px; if (on !== state) { state = on; fn(on); } }
    window.addEventListener('scroll', check, { passive: true });
    check();
    return function () { window.removeEventListener('scroll', check); fn(false); };
  }

  // ---------- FAQ accordion: smooth height:auto + icon turn (all screen sizes) ----------
  var faqs = $$('.accordion .faq');
  function setFaq(d, open, instant) {
    var p = $('p', d), tog = $('.tog', d);
    var reduce = window.matchMedia(REDUCE).matches;
    gsap.killTweensOf([p, tog]);
    if (instant || reduce) { d.open = open; gsap.set(p, { clearProps: 'height,marginTop,opacity,overflow' }); return; }
    gsap.fromTo(tog, { rotate: 0 }, { rotate: 180, duration: 0.35, ease: 'power2.inOut', clearProps: 'rotate' });
    if (open) {
      d.open = true;
      gsap.fromTo(p, { height: 0, marginTop: 0, opacity: 0, overflow: 'hidden' },
        { height: 'auto', marginTop: 14, opacity: 1, duration: 0.35, ease: 'power2.inOut', clearProps: 'height,marginTop,opacity,overflow', onComplete: refreshLayout });
    } else {
      gsap.to(p, { height: 0, marginTop: 0, opacity: 0, overflow: 'hidden', duration: 0.35, ease: 'power2.inOut',
        onComplete: function () { d.open = false; gsap.set(p, { clearProps: 'height,marginTop,opacity,overflow' }); refreshLayout(); } });
    }
  }
  faqs.forEach(function (d) {
    $('summary', d).addEventListener('click', function (e) {
      e.preventDefault();
      var willOpen = !d.open;
      if (willOpen) faqs.forEach(function (o) { if (o !== d && o.open) setFaq(o, false); });
      setFaq(d, willOpen);
    });
  });
  var layoutTimer;
  function refreshLayout() {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(function () { if (window.DebyFitSections) window.DebyFitSections(); else ScrollTrigger.refresh(); }, 50);
  }

  // ---------- responsive motion ----------
  var mm = gsap.matchMedia();
  mm.add({ isDesktop: DESKTOP, isMobile: MOBILE, reduce: REDUCE }, function (ctx) {
    var c = ctx.conditions;
    var cleanups = [];
    var heroImg = $('.hero-img img');

    // ===== Reduced motion: no movement at all – just a gentle hero fade =====
    if (c.reduce) {
      gsap.from([heroImg, '.hero-text'], { opacity: 0, duration: 0.6, ease: 'none', clearProps: 'opacity' });
      return;
    }

    // ===== Marquee ticker – seamless loop with transforms only =====
    var track = $('.marquee-track');
    var ticker = gsap.fromTo(track, { xPercent: -33.3333 }, { xPercent: 0, duration: c.isDesktop ? 46 : 26, ease: 'none', repeat: -1 });

    if (c.isDesktop) {
      // ----- Hero & header -----
      var heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl
        .from(mark(['.logo', '.nav', '.header-actions', '.nav-rule']), { y: -20, opacity: 0, duration: 0.8, stagger: 0.06, clearProps: 'transform,opacity' }, 0)
        .fromTo(heroImg, { scale: 1.18 }, { scale: 1.12, duration: 1.8, ease: 'power2.out' }, 0) // 1.06 → 1 on top of the parallax head-room
        .from(mark('.hero-text .overline'), { y: 20, opacity: 0, duration: 0.7 }, 0.25)
        .from(mark('.hero-text .h1-line'), { y: 30, opacity: 0, duration: 0.9, stagger: 0.15 }, 0.35)
        .from(mark(['.hero-text .lead', '.hero-buttons', '.trust', '.info-strip']), { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, clearProps: 'transform,opacity' }, 0.7)
        .from(mark(['.hero-caption', '.vlabel > *']), { opacity: 0, duration: 1 }, 0.8)
        .from(mark('.hero-badge.d-only'), { scale: 0.85, opacity: 0, duration: 1.1, ease: 'back.out(1.6)' }, 0.6);

      // Image parallax (the 1.12 scale gives the head-room for the 6% drift)
      gsap.to(heroImg, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: 1.2 } });

      // Badge: slow continuous spin of the text ring + gentle float of the whole badge
      gsap.to('.hero-badge.d-only .badge-ring', { rotate: 360, duration: 30, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
      gsap.to('.hero-badge.d-only', { y: -8, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.6 });

      // Wave panel: soft water-like oscillation of its curved edge (left edge stays fixed)
      gsap.to('.hero-wave.d-only', { scaleX: 1.025, transformOrigin: '0% 50%', duration: 4.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });

      // Glass header bar after the hero header has scrolled away
      cleanups.push(onScrollPast(140, function (on) { sticky.classList.toggle('is-visible', on); }));

      // Magnetic CTA buttons (3–5px towards the cursor)
      $$('.hero-buttons .btn, .header-cta').forEach(function (btn) {
        var xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
        var yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
        function move(e) {
          var r = btn.getBoundingClientRect();
          xTo(((e.clientX - r.left) / r.width - 0.5) * 10);
          yTo(((e.clientY - r.top) / r.height - 0.5) * 8);
        }
        function leave() { xTo(0); yTo(0); }
        btn.addEventListener('mousemove', move);
        btn.addEventListener('mouseleave', leave);
        cleanups.push(function () { btn.removeEventListener('mousemove', move); btn.removeEventListener('mouseleave', leave); gsap.set(btn, { clearProps: 'x,y' }); });
      });

      // Marquee: hover slows it down by 50%
      function slow() { gsap.to(ticker, { timeScale: 0.5, duration: 0.6 }); }
      function normal() { gsap.to(ticker, { timeScale: 1, duration: 0.6 }); }
      track.addEventListener('mouseenter', slow);
      track.addEventListener('mouseleave', normal);
      cleanups.push(function () { track.removeEventListener('mouseenter', slow); track.removeEventListener('mouseleave', normal); });

      // ----- About -----
      gsap.set(['.m-room img', '.m-oils img'], { scale: 1.2 });
      gsap.fromTo('.m-room img', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.s-about', start: 'top bottom', end: 'bottom top', scrub: 1 } });
      gsap.fromTo('.m-oils img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.s-about', start: 'top bottom', end: 'bottom top', scrub: 1 } });
      gsap.fromTo('.about-squiggle', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 2.2, ease: 'power2.inOut', scrollTrigger: { trigger: '.s-about', start: 'top 75%', once: true } });
      reveal('.about-text > :not(.mosaic)', { stagger: 0.08 }, '.about-text');
      reveal('.mosaic > div:not(.caption)', { y: 40, stagger: 0.12, duration: 1.1 }, '.mosaic');
      reveal(['.mosaic .caption', '.about-badge'], { y: 0, scale: 0.9, stagger: 0.15, delay: 0.4 }, '.mosaic');

      // ----- Why me -----
      reveal('.s-why .sec-head > *', { stagger: 0.1 }, '.s-why');
      reveal('.reason', { y: 40, stagger: 0.12, duration: 1 }, '.reasons', 'top 80%');

      // ----- Services -----
      reveal('.s-services .sec-head > *', { stagger: 0.1 }, '.s-services');
      reveal('.card', { y: 40, stagger: 0.12, duration: 1 }, '.cards', 'top 82%');
      reveal('.services-btn', { y: 20 }, '.services-btn', 'top 92%');
      reveal('.services-badge', { y: 0, rotate: -25, scale: 0.85, duration: 1.2 }, '.s-services');

      // ----- Process: line drawn with the scroll, steps light up -----
      reveal('.process-aside > *', { stagger: 0.1 }, '.process-aside');
      gsap.fromTo('.tl-line.d-only', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });
      timelineSteps('top 62%', 'bottom 62%');

      // ----- Philosophy -----
      reveal('.philo-img', { y: 50, duration: 1.2 }, '.s-philo', 'top 75%');
      reveal('.philo-quote > *', { stagger: 0.12 }, '.philo-quote');

      // ----- For whom -----
      reveal('.whom-head > *', { stagger: 0.1 }, '.whom-head');
      reveal('.whom-grid .item', { y: 36, stagger: 0.08 }, '.whom-grid', 'top 80%');

      // ----- Testimonials: warm tilt-in -----
      reveal('.testi-head > *, .testi-arrows', { stagger: 0.1 }, '.s-testi');
      reveal('.testi', { y: 40, rotation: 1, stagger: 0.14, duration: 1.1, clearProps: 'transform,opacity,rotation' }, '.testi-list', 'top 85%');

      // ----- Gift, FAQ, contact, footer -----
      reveal('.gift-panel', { y: 50, duration: 1.1 }, '.s-gift', 'top 80%');
      reveal('.gift-text > *', { stagger: 0.08, delay: 0.25 }, '.gift-panel', 'top 75%');
      reveal('.faq-head > *', { stagger: 0.1 }, '.s-faq');
      reveal('.accordion .faq', { y: 20, stagger: 0.06 }, '.accordion');
      reveal('.contact-card', { y: 50, duration: 1.1 }, '.s-contact', 'top 82%');
      reveal('.contact-info > *', { stagger: 0.08, delay: 0.2 }, '.contact-card', 'top 75%');
      reveal('.contact-form', { y: 40, delay: 0.3 }, '.contact-card', 'top 75%');
      reveal('.contact-badge', { y: 0, scale: 0.85, rotate: -20, duration: 1.2 }, '.contact-card', 'top 60%');
      reveal('.f-cols > :not(.f-gap), .f-legal', { y: 20, stagger: 0.08 }, '.s-footer', 'top 90%');
    }

    if (c.isMobile) {
      // ----- Header: fixed, blur turns on after 10px -----
      var head = $('.site-header');
      cleanups.push(onScrollPast(10, function (on) { head.classList.toggle('is-scrolled', on); }));

      // ----- Hero: simple fade, quick text entrance, slow badge spin (no float, no parallax) -----
      gsap.from(heroImg, { opacity: 0, duration: 1, ease: 'power1.out', clearProps: 'opacity' });
      gsap.from(mark(['.hero-text .overline', '.hero-text .h1-line', '.hero-text .lead', '.hero-buttons', '.info-strip']),
        { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', delay: 0.15, clearProps: 'transform,opacity' });
      gsap.to('.hero-badge.m-only .badge-ring', { rotate: 360, duration: 40, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });

      // ----- Sections: smooth, fast entrance reveals -----
      var quick = { y: 24, duration: 0.7, stagger: 0.08 };
      reveal('.about-text > :not(.mosaic)', quick, '.about-text', 'top 85%');
      reveal('.m-room', { y: 0, x: -30, duration: 0.8 }, '.mosaic', 'top 85%');
      reveal(['.m-oils', '.m-stones'], { y: 0, x: 30, duration: 0.8, stagger: 0.1 }, '.mosaic', 'top 85%');
      reveal('.stat, .stat-div', { y: 16, duration: 0.6, stagger: 0.1 }, '.stats', 'top 90%');
      ['.s-why .sec-head > *', '.s-services .sec-head > *', '.process-aside > *', '.whom-head > *', '.testi-head > *',
        '.gift-text > *', '.contact-info > *'].forEach(function (s) { reveal(s, quick, $(s) && $(s).parentElement, 'top 85%'); });
      $$('.reason, .card, .whom-grid .item, .philo-img, .philo-quote, .gift-photo, .help-card, .contact-form, .process-cta').forEach(function (el) {
        reveal(el, { y: 24, duration: 0.7 }, el, 'top 80%');
      });
      reveal('.accordion .faq', { y: 14, duration: 0.5, stagger: 0.05 }, '.accordion', 'top 85%');
      reveal('.testi-list', { x: -30, y: 0, duration: 0.8 }, '.testi-list', 'top 85%');

      // ----- Process: line revealed with the scroll; the step crossing mid-screen is in focus -----
      gsap.fromTo('.tl-line.m-only', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 65%', end: 'bottom 55%', scrub: 0.6 } });
      timelineSteps('top 55%', 'bottom 45%');
    }

    // Shared: process steps highlight + node light-up
    function timelineSteps(start, end) {
      var steps = $$('.step'), nodes = $$('.timeline .node');
      function activate(i) {
        steps.forEach(function (s, k) { s.classList.toggle('is-dim', k !== i); });
        nodes.forEach(function (n, k) { n.classList.toggle('is-lit', k === i); });
      }
      steps.forEach(function (step, i) {
        ScrollTrigger.create({ trigger: step, start: start, end: end, onToggle: function (s) { if (s.isActive) activate(i); } });
      });
      cleanups.push(function () { steps.forEach(function (s) { s.classList.remove('is-dim'); }); nodes.forEach(function (n) { n.classList.remove('is-lit'); }); });
    }

    return function () { cleanups.forEach(function (fn) { fn(); }); };
  });

  // Layout (fonts, images, section trimming) settles after load → recompute trigger positions.
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  window.DebyAnim = { matchMedia: mm, revert: function () { mm.revert(); } };
})();
