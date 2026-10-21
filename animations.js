/* =========================================================
   דבי מנחם – motion layer (GSAP 3 + ScrollTrigger)
   ---------------------------------------------------------
   • One init function, everything inside gsap.matchMedia(): full automatic cleanup on
     resize / orientation change (window.DebyAnim.revert() reverts everything manually).
   • Breakpoint = the site's layout breakpoint (1100px), so desktop motion never runs on
     the mobile layout (the spec's 992px would put desktop parallax on the 992–1099 mobile layout).
   • Desktop: depth (parallax), cursor micro-interactions, floating elements.
   • Mobile: fast, transform/opacity-only entrance reveals; no parallax; tap feedback in CSS.
   • prefers-reduced-motion: ignored by owner decision (RESPECT_REDUCED_MOTION below); when enabled → fades only.
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) return; // site works fully without the motion layer
  if (/[?&]static(&|$)/.test(location.search)) return; // ?static – motion off (used by the layout/pixel tests)

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  // GSAP 3.13 – SplitText, DrawSVG and ScrollSmoother are free; each is optional (feature-detected).
  var SplitText = window.SplitText, DrawSVGPlugin = window.DrawSVGPlugin, ScrollSmoother = window.ScrollSmoother;
  gsap.registerPlugin.apply(gsap, [ScrollTrigger, SplitText, DrawSVGPlugin, ScrollSmoother].filter(Boolean));
  root.classList.add('gsap-on');

  var DESKTOP = '(min-width: 1100px)';
  var MOBILE = '(max-width: 1099.98px)';
  // Owner decision: the full motion experience always runs, even when the device asks for reduced motion.
  // To respect that setting again, set RESPECT_REDUCED_MOTION = true.
  var RESPECT_REDUCED_MOTION = false;
  var REDUCE = RESPECT_REDUCED_MOTION ? '(prefers-reduced-motion: reduce)' : 'not all';
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return gsap.utils.toArray(s, ctx); };

  // Elements that receive entrance offsets are marked .gs, so the section-height
  // measurement in main.js can ignore those temporary transforms.
  function mark(targets) { $$(targets).forEach(function (el) { el.classList.add('gs'); }); return targets; }

  // Scroll-in reveal (plays once). clearProps hands the element back to CSS (hover states etc.).
  function reveal(targets, vars, trigger, start) {
    // Headlines split into words ([data-split]) get their own word-by-word animation.
    var els = $$(targets).filter(function (el) { return !el.hasAttribute('data-split'); });
    if (!els.length) return null;
    mark(els);
    return gsap.from(els, Object.assign({
      opacity: 0, y: 30, duration: 0.9, ease: 'power3.out', stagger: 0.1,
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: trigger || els[0], start: start || 'top 82%', once: true }
    }, vars));
  }

  // ---------- one-time DOM prep (shared by all branches) ----------
  // Section headlines that will be written word by word (marked now, split once fonts are ready).
  var HEADS = '.about-text h2, .sec-head h2, .process-aside h2, .whom-head h2, .testi-head h2, .faq-head h2, .gift-text h2, .contact-info h2';
  if (SplitText) $$(HEADS).forEach(function (h) { h.setAttribute('data-split', ''); });

  // Dotted squiggles: inline the SVG files so their paths can be drawn with DrawSVG.
  var inlined = Promise.all($$('img.about-squiggle, img.contact-squiggle, img.contact-squiggle-m').map(function (img) {
    return fetch(img.getAttribute('src')).then(function (r) { return r.text(); }).then(function (txt) {
      var holder = document.createElement('div');
      holder.innerHTML = txt.trim();
      var svg = holder.querySelector('svg');
      if (!svg || !img.parentNode) return;
      svg.setAttribute('class', img.getAttribute('class'));
      svg.setAttribute('aria-hidden', 'true');
      svg.removeAttribute('style');
      img.parentNode.replaceChild(svg, img);
    }).catch(function () {});
  }));

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

  // Runs fn when the preloader curtain starts lifting (or right away if there is no preloader).
  function whenReady(fn) {
    if (root.classList.contains('is-loading') && !root.classList.contains('loader-out')) window.addEventListener('deby:ready', fn, { once: true });
    else fn();
  }

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

    // ===== Reduced motion: no movement at all – only soft opacity fade-ins =====
    if (c.reduce) {
      gsap.from([heroImg, '.hero-text', '.info-strip', '.hero-badge'], { opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power1.out', clearProps: 'opacity' });
      var fade = { y: 0, x: 0, duration: 0.9, stagger: 0.08, ease: 'power1.out' };
      ['.about-text > *', '.about-squiggle', '.s-why .sec-head > *', '.reason', '.s-services .sec-head > *', '.card',
        '.process-aside > *', '.step', '.philo-img', '.philo-quote > *', '.whom-head > *', '.whom-grid .item',
        '.testi-head > *', '.testi-list', '.gift-panel', '.faq-head > *', '.accordion .faq', '.contact-card', '.f-cols'
      ].forEach(function (sel) { var el = $(sel); if (el) reveal(sel, fade, el.parentElement, 'top 88%'); });
      // Header states are UI, not motion – keep them (the CSS transitions are already disabled here).
      if (c.isDesktop) cleanups.push(onScrollPast(140, function (on) { sticky.classList.toggle('is-visible', on); }));
      else { var hd = $('.site-header'); cleanups.push(onScrollPast(10, function (on) { hd.classList.toggle('is-scrolled', on); })); }
      return function () { cleanups.forEach(function (fn) { fn(); }); };
    }

    // ===== Desktop smooth scrolling (ScrollSmoother) – created first, before the other triggers =====
    if (c.isDesktop && ScrollSmoother) {
      var smoother = ScrollSmoother.create({ wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 1.1, smoothTouch: false, effects: false });
      root.classList.add('has-smoother');
      // In-page links scroll through the smoother (native anchor jumps don't know about it)
      var onAnchor = function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        var target = id.length > 1 && document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        smoother.scrollTo(target, true, 'top 70px');
      };
      document.addEventListener('click', onAnchor);
      cleanups.push(function () { document.removeEventListener('click', onAnchor); smoother.kill(); root.classList.remove('has-smoother'); });
    }

    // ===== Marquee ticker – seamless loop with transforms only =====
    var track = $('.marquee-track');
    var ticker = gsap.fromTo(track, { xPercent: -33.3333 }, { xPercent: 0, duration: c.isDesktop ? 46 : 26, ease: 'none', repeat: -1 });

    // Stats counters: numeric values count up from 0 when the stats enter the screen ('LFA' just fades in)
    $$('.stat dt').forEach(function (dt) {
      var m = dt.textContent.trim().match(/^(d+)(%?)$/);
      if (!m) return;
      var target = +m[1], suffix = m[2], o = { v: 0 };
      dt.textContent = '0' + suffix;
      gsap.to(o, { v: target, duration: target > 10 ? 1.8 : 1.1, ease: 'power2.out', scrollTrigger: { trigger: '.stats', start: 'top 90%', once: true },
        onUpdate: function () { dt.textContent = Math.round(o.v) + suffix; } });
      cleanups.push(function () { dt.textContent = target + suffix; });
    });

    if (c.isDesktop) {
      // ----- Hero & header -----
      var heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      whenReady(function () { heroTl.play(); });
      heroTl
        .from(mark(['.logo', '.nav', '.header-actions', '.nav-rule']), { y: -20, opacity: 0, duration: 0.8, stagger: 0.06, clearProps: 'transform,opacity' }, 0)
        .fromTo(heroImg, { scale: 1.18 }, { scale: 1.12, duration: 1.8, ease: 'power2.out' }, 0) // 1.06 → 1 on top of the parallax head-room
        .from(mark('.hero-text .overline'), { y: 20, opacity: 0, duration: 0.7 }, 0.25)
        .from(mark('.hero-text .h1-line'), { y: 30, opacity: 0, duration: 0.9, stagger: 0.15 }, 0.35)
        .from(mark(['.hero-text .lead', '.hero-buttons', '.trust', '.info-strip']), { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, clearProps: 'transform,opacity' }, 0.7)
        .from(mark(['.hero-caption', '.vlabel > *']), { opacity: 0, duration: 1 }, 0.8)
        .from(mark('.hero-badge.d-only'), { scale: 0.85, opacity: 0, duration: 1.1, ease: 'back.out(1.6)' }, 0.6)
        .from(mark('.avatars .av'), { scale: 0, duration: 0.55, ease: 'back.out(2.2)', stagger: 0.12, clearProps: 'transform' }, 1.05);

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
      drawOnEnter('.about-squiggle', '.s-about', 2.4);
      drawOnEnter('.contact-squiggle', '.contact-card', 2.2);

      // Grid lines of "For whom" extend from their centres, then the pink dots light up at the crossings
      var gtl = gsap.timeline({ scrollTrigger: { trigger: '.whom-grid', start: 'top 75%', once: true } });
      gtl.from(mark('.g-v1, .g-v2, .g-v3, .g-v4'), { scaleY: 0, transformOrigin: '50% 50%', duration: 1.1, ease: 'power3.inOut', stagger: 0.1, clearProps: 'transform' })
        .from(mark('.g-h1'), { scaleX: 0, transformOrigin: '50% 50%', duration: 1.1, ease: 'power3.inOut', clearProps: 'transform' }, 0.1)
        .from(mark('.g-dot'), { scale: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.15, clearProps: 'transform' }, 0.85);
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
      var mHero = gsap.timeline({ paused: true });
      whenReady(function () { mHero.play(); });
      mHero.from(heroImg, { opacity: 0, duration: 1, ease: 'power1.out', clearProps: 'opacity' }, 0);
      mHero.from(mark(['.hero-text .overline', '.hero-text .h1-line', '.hero-text .lead', '.hero-buttons', '.info-strip']),
        { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.15);
      gsap.to('.hero-badge.m-only .badge-ring', { rotate: 360, duration: 40, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });

      // ----- Sections: clearly visible but light entrance reveals (transform / opacity / clip only) -----
      var START = 'top 88%';
      // Section titles: the pink line draws in, then the title and its text rise in
      ['.about-text', '.s-why .sec-head', '.s-services .sec-head', '.process-aside', '.whom-head', '.testi-head', '.faq-head', '.gift-text', '.contact-info', '.philo-quote'].forEach(function (s) {
        var box = $(s); if (!box) return;
        var trig = getComputedStyle(box).display === 'contents' ? box.firstElementChild : box; // .faq-head is display:contents on mobile
        var line = $('.overline i', box);
        if (line) gsap.from(line, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.9, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: trig, start: START, once: true } });
        reveal($$(':scope > :not(.mosaic):not(.help-card):not(.stats):not(.about-cta):not(.gift-facts):not(.btn):not(.details)', box), { y: 46, duration: 1, stagger: 0.1 }, trig, START);
      });
      // Images: wipe up from the bottom with a gentle zoom-out
      $$('.m-room, .m-oils, .m-stones, .card-media, .philo-img > img, .gift-photo, .help-media').forEach(function (el, i) {
        var img = el.tagName === 'IMG' ? el : $('img', el);
        var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: START, once: true } });
        tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power3.inOut', clearProps: 'clipPath' }, el.classList.contains('m-oils') || el.classList.contains('m-stones') ? 0.15 : 0);
        if (img && el !== img) tl.from(mark(img), { scale: 1.25, duration: 1.5, ease: 'power2.out', clearProps: 'transform' }, '<');
        if (el === img) tl.from(mark(img), { scale: 1.12, duration: 1.5, ease: 'power2.out', clearProps: 'transform' }, '<');
      });
      reveal('.mosaic .caption, .about-badge', { y: 0, scale: 0.6, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.15, delay: 0.6 }, '.mosaic', START);
      // Cards: rise and settle with a soft bounce, cascading
      ['.reasons', '.cards', '.whom-grid'].forEach(function (g) {
        reveal($$(':scope > .reason, :scope > .card, :scope > .item', $(g)), { y: 60, scale: 0.94, duration: 1, ease: 'back.out(1.4)', stagger: 0.12 }, g, START);
      });
      reveal('.stat, .stat-div', { y: 30, duration: 0.8, stagger: 0.12 }, '.stats', START);
      reveal('.about-cta > *', { y: 30, duration: 0.8, stagger: 0.12 }, '.about-cta', START);
      reveal('.step', { x: 60, y: 0, duration: 0.9, stagger: 0.15 }, '.timeline', START);
      reveal('.process-cta', { y: 30, scale: 0.9, duration: 0.8, ease: 'back.out(1.6)' }, '.process-cta', 'top 95%');
      reveal('.testi-list', { x: -80, y: 0, duration: 1.1 }, '.testi-list', START);
      reveal('.gift-facts li, .gift-text .btn', { x: 30, y: 0, duration: 0.7, stagger: 0.1 }, '.gift-facts', START);
      reveal('.accordion .faq', { y: 30, duration: 0.7, stagger: 0.08 }, '.accordion', START);
      reveal('.help-card', { y: 50, duration: 1 }, '.help-card', START);
      reveal('.details li', { x: 40, y: 0, duration: 0.7, stagger: 0.08 }, '.details', START);
      reveal('.contact-form', { y: 60, duration: 1 }, '.contact-form', START);
      reveal('.contact-badge', { y: 0, scale: 0.6, rotate: -30, duration: 1.1, ease: 'back.out(1.6)' }, '.contact-badge', 'top 95%');
      reveal('.f-cols > :not(.f-gap), .f-legal', { y: 30, duration: 0.8, stagger: 0.1 }, '.s-footer', 'top 92%');

      // ----- Process: line revealed with the scroll; the step crossing mid-screen is in focus -----
      gsap.fromTo('.tl-line.m-only', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 65%', end: 'bottom 55%', scrub: 0.6 } });
      timelineSteps('top 55%', 'bottom 45%');
    }

    if (c.isMobile) drawOnEnter('.contact-squiggle-m', '.contact-squiggle-m', 1.8);

    // ===== Shared (desktop + mobile) =====
    // Headlines written word by word: soft blur → sharp
    if (SplitText) {
      var splits = [];
      document.fonts.ready.then(function () {
        ctx.add(function () {
          $$(HEADS).forEach(function (h) {
            if (h.offsetParent === null) return;
            var st = SplitText.create(h, { type: 'words', wordsClass: 'split-word' });
            splits.push(st);
            gsap.from(mark(st.words), { opacity: 0, y: 26, filter: 'blur(8px)', duration: 0.95, ease: 'power3.out', stagger: 0.07,
              clearProps: 'filter,transform,opacity', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
          });
          refreshLayout();
        });
      });
      cleanups.push(function () { splits.forEach(function (s) { s.revert(); }); });
    }

    // Breathing icons (a calm 2–3% inhale/exhale, out of sync)
    gsap.to(mark('.ring-icon, .w-icon'), { scale: 1.035, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.55, from: 'random' } });

    // Waves between sections breathe slowly
    gsap.to(mark('.wave-top'), { scaleY: 1.18, transformOrigin: '50% 0%', duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(mark('.wave-bottom'), { scaleY: 1.18, transformOrigin: '50% 100%', duration: 5.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 });

    // Gift voucher: slow Ken Burns on the photo (logo + text ride along), then the logo is "stamped" on the card
    gsap.fromTo('.gift-zoom', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.gift-photo', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    var vtl = gsap.timeline({ scrollTrigger: { trigger: '.gift-photo', start: 'top 65%', once: true } });
    vtl.fromTo('.voucher-logo', { xPercent: -50, yPercent: -50, rotation: -8.4, scale: 1.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power4.in' })
      .to('.voucher-logo', { scale: 1.04, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out' })
      .fromTo('.voucher-text', { xPercent: -50, yPercent: -50, rotation: -8.4, scale: 1.45, opacity: 0 }, { scale: 1, opacity: 0.9, duration: 0.45, ease: 'power4.in' }, '-=0.05')
      .set(['.voucher-logo', '.voucher-text'], { clearProps: 'transform,opacity' });

    // Testimonial stars fill in one by one
    gsap.from(mark('.testi .stars img'), { scale: 0, rotate: -40, opacity: 0, duration: 0.5, ease: 'back.out(2.5)', stagger: 0.06, delay: 0.3,
      clearProps: 'transform,opacity', scrollTrigger: { trigger: '.testi-list', start: 'top 80%', once: true } });

    // Lotus at the end of the timeline blooms
    gsap.from(mark('.tl-lotus'), { scale: 0, rotate: -60, opacity: 0, duration: 1, ease: 'back.out(2)', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.tl-lotus', start: 'top 85%', once: true } });

    // Dotted squiggle drawn along its path (DrawSVG) once its section arrives
    function drawOnEnter(sel, trigger, dur) {
      if (!DrawSVGPlugin) return;
      inlined.then(function () {
        ctx.add(function () {
          var svg = $(sel);
          if (!svg || svg.tagName.toLowerCase() !== 'svg') return;
          var shapes = $$('path, circle', svg);
          gsap.fromTo(shapes, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'power2.inOut', stagger: 0.05,
            scrollTrigger: { trigger: trigger, start: 'top 75%', once: true } });
        });
      });
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
