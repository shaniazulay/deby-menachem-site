(function () {
  'use strict';

  var WA_NUMBER = '972584502900';

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
