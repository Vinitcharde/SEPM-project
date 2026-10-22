/* ============================================================
   landing.js – Landing Page Interactivity
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Init DB + seed
  seedDatabase();
  Theme.init();

  // ------ Navbar scroll effect ------
  const nav = document.getElementById('mainNav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ------ Mobile menu ------
  const menu     = document.getElementById('mobileMenu');
  const hamburger= document.getElementById('hamburger');
  const menuClose= document.getElementById('menuClose');
  hamburger?.addEventListener('click', () => { menu.classList.add('open'); hamburger.setAttribute('aria-expanded','true'); });
  menuClose?.addEventListener('click', () => { menu.classList.remove('open'); hamburger.setAttribute('aria-expanded','false'); });
  menu?.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => menu.classList.remove('open')));

  // ------ Theme toggle ------
  document.getElementById('themeToggleNav')?.addEventListener('click', () => {
    Theme.toggle();
    document.getElementById('themeToggleNav').textContent = Theme.isDark() ? '☀️' : '🌙';
  });
  if (Theme.isDark()) document.getElementById('themeToggleNav').textContent = '☀️';

  // ------ Counter animation ------
  const counters = document.querySelectorAll('.counter');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        animateCount(el, Number(el.dataset.target));
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));

  // Also animate hero stats
  const heroStats = [
    { el: document.getElementById('stat-c'), val: '5,200+' },
    { el: document.getElementById('stat-s'), val: '18,400+' },
    { el: document.getElementById('stat-r'), val: '10+' },
  ];
  setTimeout(() => {
    heroStats.forEach(({ el, val }) => { if (el) el.textContent = val; });
  }, 800);

  // ------ Smooth scroll for anchor links ------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // ------ Contact form ------
  document.getElementById('contact-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const isValid = Validator.validate(form, {
      name:    ['required'],
      email:   ['required', 'email'],
      subject: ['required'],
      message: ['required'],
    });
    if (!isValid) return;

    const btn = document.getElementById('contact-submit');
    btn.classList.add('btn-loading'); btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('btn-loading'); btn.disabled = false;
      Toast.success('Message Sent!', 'We\'ll get back to you within 24 hours.');
      form.reset();
    }, 1200);
  });

  // ------ Redirect if already logged in ------
  const session = Session.get();
  if (session) {
    const loginLinks = document.querySelectorAll('a[href="login.html"], a[href="login.html?tab=register"]');
    loginLinks.forEach(l => {
      l.href = Auth ? Auth.roleRedirect(session.role) : 'customer.html';
      l.textContent = 'Go to Dashboard';
    });
  }
});
