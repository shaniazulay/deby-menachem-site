/* =========================================================
   Scroll effects – Gradient Overlay + Fade-to-Reveal (GSAP ScrollTrigger, scrubbed)
   • Hero: as the hero scrolls away, a gradient in the hero's own colour rises over the
     photo, and the hero content fades / drifts up (Scroll Fade Overlay).
   • Colour seams: wherever the background colour changes between areas, the new area
     enters behind a gradient veil in the colour above it, which melts away as it scrolls
     in (Fade-to-Reveal).
   At rest (hero at the top, areas scrolled in) every overlay is fully transparent,
   so the design itself is untouched. Desktop + mobile. Off in ?static (layout tests).
   ========================================================= */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger || /[?&]static\b/.test(location.search)) return;

  var CFG = {
    hero: {
      section: '.s-hero',
      media: '.hero-img',                    // the hero photo – the gradient is laid over it
      color: '107, 122, 105',                // sage (--sage #6b7a69)
      content: ['.hero-text', '.info-strip'] // fades / lifts away with the scroll
    },
    // Areas whose background differs from the area above are found automatically …
    areas: '.s-hero, main > section, .s-footer',
    // … plus coloured blocks that sit inside a white area
    blocks: ['.gift-panel', '.contact-card']
  };

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var style = document.createElement('style');
  style.textContent =
    '.fx-hero-grad, .fx-seam { position: absolute; left: 0; right: 0; pointer-events: none; opacity: 0; }' +
    '.fx-hero-grad { top: 0; bottom: 0; }' +
    '.fx-seam { top: -1px; height: min(60%, 560px); z-index: 4; border-radius: inherit; }';
  document.head.appendChild(style);

  function bg(el) {
    var c = getComputedStyle(el).backgroundColor;
    return /rgba\(.*,\s*0\)$|transparent/.test(c) ? null : c;
  }
  function rgb(c) { var m = c.match(/\d+(\.\d+)?/g); return m.slice(0, 3).join(', '); }
  function pageBg() { return bg(document.body) || bg(document.documentElement) || 'rgb(255, 255, 255)'; }

  function seam(host, fromColor) {
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var v = document.createElement('div');
    v.className = 'fx-seam';
    v.setAttribute('aria-hidden', 'true');
    v.style.background = 'linear-gradient(to bottom, rgba(' + fromColor + ', 1) 0%, rgba(' + fromColor + ', .85) 30%, rgba(' + fromColor + ', 0) 100%)';
    host.appendChild(v);
    return v;
  }

  // ----- build the overlays once -----
  var hero = $(CFG.hero.section);
  var media = hero && $(CFG.hero.media, hero);
  var heroGrad = null;
  if (media) {
    heroGrad = document.createElement('div');
    heroGrad.className = 'fx-hero-grad';
    heroGrad.setAttribute('aria-hidden', 'true');
    var c = CFG.hero.color;
    heroGrad.style.background = 'linear-gradient(to top, rgba(' + c + ', .95) 0%, rgba(' + c + ', .6) 40%, rgba(' + c + ', .15) 80%, rgba(' + c + ', 0) 100%)';
    media.appendChild(heroGrad);
  }

  var seams = [];
  var areas = $$(CFG.areas);
  var prevColor = null;
  areas.forEach(function (sec) {
    var col = bg(sec) || pageBg();
    if (prevColor && col !== prevColor) seams.push({ el: sec, veil: seam(sec, rgb(prevColor)) });
    prevColor = col;
  });
  CFG.blocks.forEach(function (sel) {
    $$(sel).forEach(function (block) {
      var area = block.closest('section, footer');
      var above = (area && bg(area)) || pageBg();
      seams.push({ el: block, veil: seam(block, rgb(above)) });
    });
  });

  // ----- scrubbed motion (the same on desktop and mobile; matchMedia reverts cleanly on resize) -----
  var mm = gsap.matchMedia();
  mm.add('all', function () {
    if (heroGrad) {
      gsap.fromTo(heroGrad, { opacity: 0 }, { opacity: 1, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    }
    if (hero) {
      var content = $$(CFG.hero.content.join(','), hero);
      if (content.length) gsap.fromTo(content, { opacity: 1, y: 0 }, { opacity: 0, y: -50, ease: 'power1.in', immediateRender: false,
        scrollTrigger: { trigger: hero, start: 'top top', end: '75% top', scrub: 0.6 } });
    }
    seams.forEach(function (s) {
      gsap.fromTo(s.veil, { opacity: 1 }, { opacity: 0, ease: 'power1.out',
        scrollTrigger: { trigger: s.el, start: 'top bottom', end: 'top 35%', scrub: 0.6 } });
    });
  });

  // layout (fonts, section fitting) settles after load
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
