/* ============================================================
   FRAGMENT SPACE — Complete Portfolio Interactions
   Loading, particles, text effects, project pages, filters,
   scroll reveal, scroll-top, stats counter, theme toggle,
   Easter egg, timeline, skills.
   ============================================================ */

(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rand = (a, b) => Math.random() * (b - a) + a;

  /* ============================================================
     1. LOADING SCREEN
     ============================================================ */
  function initLoader() {
    const loader = $('#loader');
    if (!loader) return Promise.resolve();

    if (sessionStorage.getItem('fs-loaded')) {
      loader.classList.add('done');
      return Promise.resolve();
    }

    const statusEl = loader.querySelector('.loader__status');
    const messages = ['initializing...', 'loading fragments...', 'assembling space...', 'ready.'];
    let msgIndex = 0;

    const msgInterval = setInterval(() => {
      msgIndex++;
      if (msgIndex < messages.length && statusEl) statusEl.textContent = messages[msgIndex];
    }, 600);

    return new Promise(resolve => {
      setTimeout(() => {
        clearInterval(msgInterval);
        if (statusEl) statusEl.textContent = 'ready.';
        setTimeout(() => {
          loader.classList.add('done');
          sessionStorage.setItem('fs-loaded', '1');
          resolve();
        }, 300);
      }, 2200);
    });
  }

  /* ============================================================
     2. STARFIELD — Deep Space with Constellations & Shooting Stars
     ============================================================ */
  class Starfield {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.stars = [];
      this.shootingStars = [];
      this.constellations = [];      // active constellation groups
      this.constellationFade = [];   // fade state per group
      this.mouse = { x: -1e3, y: -1e3 };
      this.t = 0;
      this.nextShoot = rand(80, 200);
      this.shootTimer = 0;
      this.constellationTimer = 0;
      this.constellationCycle = 500; // frames between rebuilds (~8s at 60fps)
      this.resize();
      addEventListener('resize', () => this.resize());
      addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
      addEventListener('mouseout', () => { this.mouse.x = -1e3; this.mouse.y = -1e3; });
    }

    resize() {
      this.w = this.c.width = innerWidth;
      this.h = this.c.height = innerHeight;
      this.initStars();
      this.buildConstellations();
    }

    initStars() {
      const area = this.w * this.h;
      const n = Math.min(area / 4000, 350);
      this.stars = [];

      // Star color palette — realistic celestial colors
      const colors = [
        { r: 255, g: 255, b: 255 },   // White
        { r: 200, g: 220, b: 255 },   // Blue-white
        { r: 180, g: 210, b: 255 },   // Light blue
        { r: 255, g: 240, b: 220 },   // Warm white
        { r: 255, g: 220, b: 180 },   // Pale gold
        { r: 78, g: 205, b: 196 },    // Teal accent
        { r: 220, g: 200, b: 255 },   // Lavender
        { r: 255, g: 200, b: 200 },   // Rose white
      ];

      for (let i = 0; i < n; i++) {
        const isBright = Math.random() < 0.15;
        const col = colors[~~rand(0, colors.length)];
        this.stars.push({
          x: rand(0, this.w),
          y: rand(0, this.h),
          sz: isBright ? rand(1.5, 3.2) : rand(0.4, 1.5),
          ba: isBright ? rand(0.5, 1) : rand(0.1, 0.45),
          a: 0,
          col,
          twinkleSpeed: rand(0.5, 2.5),
          twinklePhase: rand(0, Math.PI * 2),
          twinkleAmount: isBright ? rand(0.2, 0.5) : rand(0.05, 0.2),
          glow: isBright,
          glowSize: isBright ? rand(6, 14) : 0,
          drift: rand(0.01, 0.06),
          driftPhase: rand(0, Math.PI * 2),
        });
      }
    }

    buildConstellations() {
      // Get bright stars with their indices
      const bright = [];
      this.stars.forEach((s, i) => { if (s.glow) bright.push({ star: s, idx: i }); });

      // Shuffle to get different constellations each time
      for (let i = bright.length - 1; i > 0; i--) {
        const j = ~~(Math.random() * (i + 1));
        [bright[i], bright[j]] = [bright[j], bright[i]];
      }

      const used = new Set();
      const maxDist = Math.min(this.w, this.h) * 0.28;
      const newGroups = [];

      for (let i = 0; i < bright.length; i++) {
        if (used.has(i)) continue;
        const group = [bright[i].star];
        used.add(i);

        // Find nearby bright stars to connect
        const candidates = [];
        for (let j = 0; j < bright.length; j++) {
          if (used.has(j) || j === i) continue;
          const dx = bright[j].star.x - bright[i].star.x;
          const dy = bright[j].star.y - bright[i].star.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist && d > 30) candidates.push({ idx: j, d, star: bright[j].star });
        }

        // Sort by distance, pick closest 2-4
        candidates.sort((a, b) => a.d - b.d);
        const pick = Math.min(candidates.length, ~~rand(2, 5));
        for (let k = 0; k < pick; k++) {
          group.push(candidates[k].star);
          used.add(candidates[k].idx);
        }

        if (group.length >= 3) {
          // Sort group by angle from centroid for cleaner line patterns
          const cx = group.reduce((s, g) => s + g.x, 0) / group.length;
          const cy = group.reduce((s, g) => s + g.y, 0) / group.length;
          group.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
          newGroups.push({ stars: group, fade: 0 }); // fade starts at 0, will animate to 1
        } else if (group.length === 2) {
          newGroups.push({ stars: group, fade: 0 });
        }
      }

      this.constellations = newGroups;
      this.constellationTimer = 0;
    }

    spawnShootingStar() {
      const fromLeft = Math.random() < 0.5;
      const angle = rand(0.2, 0.8);
      const speed = rand(8, 16);
      this.shootingStars.push({
        x: fromLeft ? rand(-50, this.w * 0.3) : rand(this.w * 0.7, this.w + 50),
        y: rand(-50, this.h * 0.3),
        vx: fromLeft ? Math.cos(angle) * speed : -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: rand(0.008, 0.02),
        len: rand(60, 140),
        width: rand(1, 2.5),
      });
    }

    update() {
      const { ctx, w, h, stars, mouse, constellations, shootingStars } = this;
      ctx.clearRect(0, 0, w, h);
      this.t += 0.006;

      // ── Constellation lifecycle ──
      this.constellationTimer++;
      const fadeInEnd = 120;    // frames to fully appear
      const fadeOutStart = this.constellationCycle - 120; // start fading out

      if (this.constellationTimer >= this.constellationCycle) {
        this.buildConstellations();
      }

      // ── Draw constellation lines ──
      for (const group of constellations) {
        // Animate fade
        if (this.constellationTimer < fadeInEnd) {
          group.fade = Math.min(1, group.fade + 1 / fadeInEnd);
        } else if (this.constellationTimer > fadeOutStart) {
          group.fade = Math.max(0, group.fade - 1 / 120);
        } else {
          group.fade = 1;
        }

        if (group.fade < 0.01) continue;

        const grpStars = group.stars;
        const baseAlpha = group.fade * 0.35;

        // Draw lines connecting the constellation
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (let i = 0; i < grpStars.length - 1; i++) {
          const a = grpStars[i], b = grpStars[i + 1];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(78,205,196,${baseAlpha})`;
          ctx.stroke();
        }
        // Close the shape if 3+ stars (loop back)
        if (grpStars.length >= 3) {
          const first = grpStars[0], last = grpStars[grpStars.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(first.x, first.y);
          ctx.strokeStyle = `rgba(78,205,196,${baseAlpha * 0.6})`;
          ctx.stroke();
        }

        // Draw small dots at constellation nodes
        for (const s of grpStars) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(78,205,196,${baseAlpha * 0.8})`;
          ctx.fill();
        }
      }

      // ── Draw stars ──
      for (const s of stars) {
        // Twinkle
        const twinkle = Math.sin(this.t * s.twinkleSpeed + s.twinklePhase);
        s.a = s.ba + twinkle * s.twinkleAmount;
        s.a = Math.max(0.02, Math.min(1, s.a));

        // Subtle drift
        const driftX = Math.sin(this.t * 0.3 + s.driftPhase) * s.drift;
        const driftY = Math.cos(this.t * 0.2 + s.driftPhase * 1.3) * s.drift;

        const sx = s.x + driftX;
        const sy = s.y + driftY;

        // Mouse interaction — gentle push
        const dx = sx - mouse.x, dy = sy - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let renderX = sx, renderY = sy;
        if (dist < 150) {
          const force = (150 - dist) / 150 * 0.5;
          renderX += (dx / dist) * force * 8;
          renderY += (dy / dist) * force * 8;
          // Brighten near mouse
          s.a = Math.min(1, s.a + force * 0.4);
        }

        const { r, g, b } = s.col;

        // Glow for bright stars
        if (s.glow && s.a > 0.3) {
          const grad = ctx.createRadialGradient(renderX, renderY, 0, renderX, renderY, s.glowSize * s.a);
          grad.addColorStop(0, `rgba(${r},${g},${b},${s.a * 0.25})`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${s.a * 0.06})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(renderX, renderY, s.glowSize * s.a, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Cross-shaped spike for very bright stars
          if (s.sz > 2) {
            const spikeLen = s.sz * 3 * s.a;
            ctx.strokeStyle = `rgba(${r},${g},${b},${s.a * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(renderX - spikeLen, renderY);
            ctx.lineTo(renderX + spikeLen, renderY);
            ctx.moveTo(renderX, renderY - spikeLen);
            ctx.lineTo(renderX, renderY + spikeLen);
            ctx.stroke();
          }
        }

        // Star dot
        ctx.beginPath();
        ctx.arc(renderX, renderY, s.sz * (0.8 + twinkle * 0.1), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${s.a})`;
        ctx.fill();
      }

      // ── Shooting stars ──
      this.shootTimer++;
      if (this.shootTimer >= this.nextShoot) {
        this.spawnShootingStar();
        this.shootTimer = 0;
        this.nextShoot = rand(120, 400);
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= ss.decay;

        if (ss.life <= 0 || ss.x < -200 || ss.x > w + 200 || ss.y > h + 200) {
          shootingStars.splice(i, 1);
          continue;
        }

        // Trail
        const tailX = ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.len * ss.life;
        const tailY = ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.len * ss.life;

        const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255,255,255,${ss.life * 0.9})`);
        grad.addColorStop(0.3, `rgba(78,205,196,${ss.life * 0.4})`);
        grad.addColorStop(1, `rgba(78,205,196,0)`);

        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = ss.width * ss.life;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Bright head
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.width * ss.life * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${ss.life})`;
        ctx.fill();
      }

      requestAnimationFrame(() => this.update());
    }

    start() { this.update(); }
  }

  /* ============================================================
     3. TEXT SCRAMBLE
     ============================================================ */
  class TextScramble {
    constructor(el) { this.el = el; this.chars = '!<>-_\\/[]{}—=+*^?#________'; }
    setText(text) {
      const old = this.el.textContent;
      const len = Math.max(old.length, text.length);
      const p = new Promise(r => (this.res = r));
      this.q = [];
      for (let i = 0; i < len; i++) { const s = ~~(Math.random() * 30); this.q.push({ from: old[i] || '', to: text[i] || '', start: s, end: s + ~~(Math.random() * 30) }); }
      cancelAnimationFrame(this.raf); this.f = 0; this.tick(); return p;
    }
    tick() {
      let out = '', done = 0;
      for (let i = 0; i < this.q.length; i++) {
        let { from, to, start, end, char } = this.q[i];
        if (this.f >= end) { done++; out += to; }
        else if (this.f >= start) { if (!char || Math.random() < 0.28) { char = this.chars[~~(Math.random() * this.chars.length)]; this.q[i].char = char; } out += `<span style="color:var(--accent-cool);opacity:.7">${char}</span>`; }
        else out += from;
      }
      this.el.innerHTML = out;
      if (done === this.q.length) this.res();
      else { this.raf = requestAnimationFrame(() => this.tick()); this.f++; }
    }
  }

  /* ============================================================
     4. TYPEWRITER
     ============================================================ */
  class TypeWriter {
    constructor(el, text, speed = 50) { this.el = el; this.text = text; this.speed = speed; this.i = 0; }
    start() { this.el.textContent = ''; this.type(); }
    type() { if (this.i < this.text.length) { this.el.textContent += this.text[this.i++]; setTimeout(() => this.type(), this.speed + Math.random() * 40); } }
  }

  /* ============================================================
     5. NAVIGATION
     ============================================================ */
  function initNav() {
    const nav = $('#main-nav');
    const landing = $('#landing');
    const links = $$('.nav__link');
    if (!nav || !landing) return;

    new IntersectionObserver(([e]) => nav.classList.toggle('visible', !e.isIntersecting), { threshold: 0.1 }).observe(landing);

    const sections = $$('main section[id]');
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { const id = e.target.id; links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id)); } });
    }, { threshold: 0.3, rootMargin: '-72px 0px -40% 0px' });
    sections.forEach(s => { if (s.id !== 'landing') sectionObserver.observe(s); });

    links.forEach(l => l.addEventListener('click', e => { e.preventDefault(); const target = $(l.getAttribute('href')); if (target) target.scrollIntoView({ behavior: 'smooth' }); }));

    const logo = $('.nav__logo');
    if (logo) logo.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ============================================================
     6. PROJECT DETAIL PAGE (SPA)
     ============================================================ */
  function initProjectPages() {
    const page = $('#project-page');
    const mainContent = $('#main-content');
    if (!page || !mainContent) return;

    const els = {
      index: page.querySelector('.project-page__index'),
      title: page.querySelector('.project-page__title'),
      tags: page.querySelector('.project-page__tags'),
      desc: page.querySelector('.project-page__desc'),
      type: page.querySelector('[data-field="type"]'),
      status: page.querySelector('[data-field="status"]'),
      source: page.querySelector('[data-field="source"]'),
      learned: page.querySelector('[data-field="learned"]'),
      heroImg: page.querySelector('.project-page__hero-img'),
      gallery: page.querySelector('.project-page__gallery'),
      link: page.querySelector('.btn--primary'),
    };

    const accentMap = { warm: 'var(--accent-warm)', cool: 'var(--accent-cool)', hot: 'var(--accent-hot)' };

    function openProject(card) {
      const d = card.dataset;
      els.index.textContent = d.index || '';
      els.title.textContent = d.title || '';
      els.title.style.color = accentMap[d.accent] || 'var(--text)';
      els.desc.textContent = d.desc || '';
      els.type.textContent = d.type || '';

      // Status with color
      els.status.textContent = d.status || '';
      els.status.className = 'meta__value';
      if (d.status === 'completed') els.status.classList.add('status--complete');
      else els.status.classList.add('status--progress');

      // Source
      if (els.source) els.source.textContent = d.source || 'Personal project';

      els.learned.textContent = d.learned || '';

      // Tags
      els.tags.innerHTML = '';
      (d.tags || '').split(',').forEach(t => {
        const span = document.createElement('span');
        span.className = 'tag'; span.textContent = t.trim();
        els.tags.appendChild(span);
      });

      // Hero image
      const imgs = (d.images || '').split(',').map(s => s.trim()).filter(Boolean);
      if (imgs.length) { els.heroImg.src = imgs[0]; els.heroImg.alt = d.title + ' hero'; }

      // Documentation gallery
      els.gallery.innerHTML = '';
      imgs.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src; img.alt = `${d.title} — documentation ${i + 1}`;
        img.loading = 'lazy';
        els.gallery.appendChild(img);
      });

      // Link
      if (els.link) els.link.href = d.link || '#';

      // Slide in
      page.hidden = false;
      page.scrollTop = 0;
      requestAnimationFrame(() => { requestAnimationFrame(() => { page.classList.add('active'); document.body.classList.add('no-scroll'); }); });
    }

    function closeProject() {
      page.classList.remove('active');
      document.body.classList.remove('no-scroll');
      setTimeout(() => { page.hidden = true; }, 600);
    }

    $$('.project-card').forEach(card => {
      card.addEventListener('click', () => openProject(card));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(card); } });
    });

    $$('.project-page__back, .project-page__back-btn', page).forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); closeProject(); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && page.classList.contains('active')) closeProject(); });
  }

  /* ============================================================
     7. PROJECT FILTERS
     ============================================================ */
  function initFilters() {
    const btns = $$('.filter-btn');
    const cards = $$('.project-card');
    if (!btns.length) return;

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        cards.forEach(card => {
          if (filter === 'all' || card.dataset.category === filter) {
            card.classList.remove('hidden-card');
          } else {
            card.classList.add('hidden-card');
          }
        });
      });
    });
  }

  /* ============================================================
     8. ANIMATED STATS COUNTER
     ============================================================ */
  function initStatsCounter() {
    const stats = $$('.stat');
    if (!stats.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count) || 0;
          const numEl = el.querySelector('.stat__number');
          if (!numEl || el.dataset.counted) return;

          el.dataset.counted = '1';
          let current = 0;
          const duration = 1500;
          const increment = target / (duration / 16);
          const step = () => {
            current += increment;
            if (current >= target) {
              numEl.textContent = target + '+';
            } else {
              numEl.textContent = Math.floor(current);
              requestAnimationFrame(step);
            }
          };
          setTimeout(step, 300);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    stats.forEach(s => observer.observe(s));
  }

  /* ============================================================
     9. SKILL BARS
     ============================================================ */
  function initSkills() {
    $$('.skill-card').forEach(card => {
      const fill = card.querySelector('.skill-card__fill');
      if (fill) fill.style.setProperty('--fw', (card.dataset.level || 0) + '%');
    });
  }

  /* ============================================================
     10. SCROLL REVEAL — bidirectional (animates on scroll up too)
     ============================================================ */
  function initScrollReveal() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        } else {
          entry.target.classList.remove('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    $$('.sr').forEach(el => observer.observe(el));
  }

  /* ============================================================
     11. SCROLL TO TOP — with launch animation
     ============================================================ */
  function initScrollTop() {
    const btn = $('#scroll-top');
    if (!btn) return;
    const landing = $('#landing');
    if (landing) {
      new IntersectionObserver(([e]) => btn.classList.toggle('show', !e.isIntersecting), { threshold: 0.1 }).observe(landing);
    }
    btn.addEventListener('click', () => {
      btn.classList.add('launching');
      btn.style.background = 'var(--accent-cool)';
      btn.style.color = 'var(--bg)';
      btn.style.borderColor = 'var(--accent-cool)';
      setTimeout(() => {
        scrollTo({ top: 0, behavior: 'smooth' });
      }, 250);
      setTimeout(() => {
        btn.classList.remove('launching', 'show');
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 700);
    });
  }

  /* ============================================================
     12. THEME TOGGLE
     ============================================================ */
  function initThemeToggle() {
    const btn = $('#theme-toggle');
    if (!btn) return;

    // Restore saved theme
    const saved = localStorage.getItem('fs-theme');
    if (saved === 'light') document.documentElement.classList.add('light');

    btn.addEventListener('click', () => {
      document.documentElement.classList.toggle('light');
      const isLight = document.documentElement.classList.contains('light');
      localStorage.setItem('fs-theme', isLight ? 'light' : 'dark');
    });
  }

  /* ============================================================
     13. EASTER EGG (Konami Code)
     ============================================================ */
  function initEasterEgg() {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let index = 0;
    const toast = $('#easter-toast');
    if (!toast) return;

    document.addEventListener('keydown', e => {
      if (e.key === code[index]) {
        index++;
        if (index === code.length) {
          toast.hidden = false;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
          });
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.hidden = true; }, 500);
          }, 4000);
          index = 0;
        }
      } else {
        index = 0;
      }
    });

    // Also trigger with "hello" typed
    let helloBuffer = '';
    document.addEventListener('keydown', e => {
      if (e.key.length === 1) {
        helloBuffer += e.key.toLowerCase();
        if (helloBuffer.length > 10) helloBuffer = helloBuffer.slice(-10);
        if (helloBuffer.endsWith('hello')) {
          toast.hidden = false;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
          });
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.hidden = true; }, 500);
          }, 4000);
          helloBuffer = '';
        }
      }
    });
  }

  /* ============================================================
     14. ANNOTATIONS
     ============================================================ */
  function initAnnotations() {
    $$('.annotation').forEach(ann => {
      const delay = parseInt(ann.dataset.delay) || 1000;
      setTimeout(() => { ann.classList.add('vis'); setTimeout(() => ann.classList.add('float'), 800); }, delay);
    });
  }

  /* ============================================================
     15. LANDING SEQUENCE
     ============================================================ */
  function initLanding() {
    const nameEl = $('.landing__name-text');
    const subEl = $('.landing__subtitle-text');

    if (nameEl) {
      const sc = new TextScramble(nameEl);
      const name = nameEl.closest('.landing__name')?.dataset?.scramble || nameEl.textContent;
      nameEl.textContent = '';
      setTimeout(() => sc.setText(name).then(() => {
        if (subEl) { const tw = new TypeWriter(subEl, subEl.dataset.typing || subEl.textContent, 40); setTimeout(() => tw.start(), 400); }
      }), 500);
    }
    initAnnotations();
  }

  /* ============================================================
     16. CURSOR GLOW
     ============================================================ */
  function initGlow() {
    const g = document.createElement('div');
    g.setAttribute('aria-hidden', 'true');
    g.style.cssText = 'position:fixed;top:0;left:0;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(78,205,196,.04),transparent 70%);pointer-events:none;z-index:0;will-change:transform;';
    document.body.appendChild(g);
    let gx = 0, gy = 0, cx = 0, cy = 0;
    addEventListener('mousemove', e => { gx = e.clientX; gy = e.clientY; });
    (function run() { cx += (gx - cx) * 0.08; cy += (gy - cy) * 0.08; g.style.transform = `translate(${cx - 150}px,${cy - 150}px)`; requestAnimationFrame(run); })();
  }

  /* ============================================================
     17. PARALLAX
     ============================================================ */
  function initParallax() {
    const el = $('.landing__content');
    if (!el) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('mousemove', e => { tx = (e.clientX / innerWidth - 0.5) * 12; ty = (e.clientY / innerHeight - 0.5) * 12; });
    (function run() { cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06; el.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(run); })();
  }

  /* ============================================================
     18. LANGUAGE TOGGLE (EN / ID)
     ============================================================ */
  const i18n = {
    en: {
      // Landing
      status_exploring: 'status: exploring',
      ann_student: '\u2190 first-year student',
      ann_curious: 'curious \u2192',
      ann_builder: '\u2191 builder',
      ann_exploring: '\u2193 exploring',
      // Navigation
      nav_about: 'about',
      nav_projects: 'projects',
      nav_journey: 'journey',
      nav_skills: 'skills',
      nav_contact: 'contact',
      // About
      about_title: 'About',
      about_note: "who's behind the fragments",
      about_bio: 'First-year Software Engineering student driven by curiosity and a love for building things from scratch. I believe the best way to learn is by doing \u2014 breaking things, debugging, and creating something better each time. Currently exploring web development, algorithms, and everything in between.',
      stat_projects: 'Projects',
      stat_skills: 'Skills',
      stat_months: 'Months Coding',
      fact_location: 'Location',
      fact_semester: 'Semester',
      fact_semester_val: '1st Year',
      fact_focus: 'Focus',
      fact_focus_val: 'Software Development',
      fact_goal: 'Goal',
      fact_goal_val: 'Build & ship real projects',
      // Projects
      projects_title: 'Projects',
      projects_note: "modules I've built so far",
      filter_all: 'All',
      filter_game: 'Game',
      proj1_desc: 'Interactive to-do app with drag-and-drop and local storage.',
      proj2_desc: 'CLI calculator with expression parsing and history.',
      proj3_desc: 'Retro snake game with pixel-art and difficulty scaling.',
      proj4_desc: 'Personal digital space, coded from scratch.',
      badge_completed: 'completed',
      badge_inprogress: 'in progress',
      badge_evolving: 'evolving',
      // Journey
      journey_title: 'Journey',
      journey_note: 'the path so far',
      tl1_title: 'Started University',
      tl1_desc: 'Enrolled in Software Engineering. First exposure to programming with Python basics.',
      tl2_title: 'First Lines of HTML',
      tl2_desc: 'Discovered web development. Built my first "Hello World" page and got hooked on seeing code come alive in the browser.',
      tl3_title: 'Built TaskFlow',
      tl3_desc: 'Completed my first real project \u2014 a to-do app. Learned DOM manipulation, events, and localStorage.',
      tl4_desc: 'Started version controlling my projects. First commit, first push, first feeling of "real developer."',
      tl5_title: 'PixelSnake Game',
      tl5_desc: 'Built a retro snake game with Canvas API. First dive into game loops and real-time rendering.',
      tl6_title: 'This Portfolio',
      tl6_desc: 'Designed and built this portfolio from scratch. Particles, animations, transitions \u2014 all vanilla JS.',
      tl7_date: 'Now',
      tl7_title: "What's Next?",
      tl7_desc: 'Learning React, exploring backend development, and building bigger projects. The journey continues\u2026',
      // Skills
      skills_title: 'Skills',
      skills_note: 'dependencies loading\u2026',
      // Contact
      contact_title: 'Contact',
      contact_note: 'establishing connection\u2026',
      // Footer
      footer_text: 'built from scratch with curiosity',
      // Scroll
      scroll_explore: 'scroll to explore',
    },
    id: {
      // Landing
      status_exploring: 'status: menjelajah',
      ann_student: '\u2190 mahasiswa tahun pertama',
      ann_curious: 'penasaran \u2192',
      ann_builder: '\u2191 pembangun',
      ann_exploring: '\u2193 menjelajah',
      // Navigation
      nav_about: 'tentang',
      nav_projects: 'proyek',
      nav_journey: 'perjalanan',
      nav_skills: 'keahlian',
      nav_contact: 'kontak',
      // About
      about_title: 'Tentang',
      about_note: 'siapa di balik fragmen ini',
      about_bio: 'Mahasiswa Rekayasa Perangkat Lunak tahun pertama yang didorong oleh rasa ingin tahu dan kecintaan membangun sesuatu dari nol. Saya percaya cara terbaik belajar adalah dengan melakukan \u2014 merusak, memperbaiki, dan menciptakan sesuatu yang lebih baik setiap kali. Saat ini menjelajahi pengembangan web, algoritma, dan segala hal di antaranya.',
      stat_projects: 'Proyek',
      stat_skills: 'Keahlian',
      stat_months: 'Bulan Ngoding',
      fact_location: 'Lokasi',
      fact_semester: 'Semester',
      fact_semester_val: 'Tahun 1',
      fact_focus: 'Fokus',
      fact_focus_val: 'Pengembangan Perangkat Lunak',
      fact_goal: 'Tujuan',
      fact_goal_val: 'Membuat & merilis proyek nyata',
      // Projects
      projects_title: 'Proyek',
      projects_note: 'modul yang sudah saya buat',
      filter_all: 'Semua',
      filter_game: 'Permainan',
      proj1_desc: 'Aplikasi to-do interaktif dengan drag-and-drop dan penyimpanan lokal.',
      proj2_desc: 'Kalkulator CLI dengan penguraian ekspresi dan riwayat.',
      proj3_desc: 'Game snake retro dengan pixel-art dan peningkatan kesulitan.',
      proj4_desc: 'Ruang digital pribadi, dikoding dari nol.',
      badge_completed: 'selesai',
      badge_inprogress: 'sedang dikerjakan',
      badge_evolving: 'berkembang',
      // Journey
      journey_title: 'Perjalanan',
      journey_note: 'jejak sejauh ini',
      tl1_title: 'Masuk Universitas',
      tl1_desc: 'Terdaftar di Rekayasa Perangkat Lunak. Pertama kali mengenal pemrograman dengan dasar Python.',
      tl2_title: 'Baris Pertama HTML',
      tl2_desc: 'Menemukan pengembangan web. Membuat halaman "Hello World" pertama dan langsung ketagihan melihat kode hidup di browser.',
      tl3_title: 'Membuat TaskFlow',
      tl3_desc: 'Menyelesaikan proyek pertama \u2014 aplikasi to-do. Belajar manipulasi DOM, event, dan localStorage.',
      tl4_desc: 'Mulai mengontrol versi proyek. Commit pertama, push pertama, perasaan pertama jadi "developer sungguhan."',
      tl5_title: 'Game PixelSnake',
      tl5_desc: 'Membuat game snake retro dengan Canvas API. Pertama kali menyelam ke game loop dan rendering real-time.',
      tl6_title: 'Portfolio Ini',
      tl6_desc: 'Mendesain dan membuat portfolio ini dari nol. Partikel, animasi, transisi \u2014 semua vanilla JS.',
      tl7_date: 'Sekarang',
      tl7_title: 'Apa Selanjutnya?',
      tl7_desc: 'Belajar React, menjelajahi backend development, dan membuat proyek-proyek lebih besar. Perjalanan berlanjut\u2026',
      // Skills
      skills_title: 'Keahlian',
      skills_note: 'memuat dependensi\u2026',
      // Contact
      contact_title: 'Kontak',
      contact_note: 'membangun koneksi\u2026',
      // Footer
      footer_text: 'dibangun dari nol dengan rasa ingin tahu',
      // Scroll
      scroll_explore: 'gulir untuk menjelajah',
    }
  };

  function initLangToggle() {
    const btn = $('#lang-toggle');
    if (!btn) return;
    const textEl = btn.querySelector('.lang-toggle__text');

    let lang = localStorage.getItem('fs-lang') || 'en';

    function applyLang(l) {
      lang = l;
      localStorage.setItem('fs-lang', l);
      textEl.textContent = l === 'en' ? 'ID' : 'EN';

      // Translate all data-i18n elements
      const dict = i18n[l];
      $$('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
      });

      // Update scroll text
      const scrollText = $('.landing__scroll-text');
      if (scrollText) scrollText.textContent = dict.scroll_explore || 'scroll to explore';

      // Update typewriter data-typing attribute
      const typingEl = $('.landing__subtitle-text');
      if (typingEl) {
        const typingKey = l === 'en' ? 'data-typing-en' : 'data-typing-id';
        const newText = typingEl.getAttribute(typingKey);
        if (newText) {
          typingEl.setAttribute('data-typing', newText);
          typingEl.textContent = newText.split('·')[0].trim();
        }
      }
    }

    // Apply saved language on load
    if (lang === 'id') applyLang('id');

    btn.addEventListener('click', () => {
      const next = lang === 'en' ? 'id' : 'en';
      applyLang(next);
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  async function init() {
    const canvas = $('#particle-canvas');
    if (canvas) new Starfield(canvas).start();

    await initLoader();

    initLanding();
    initNav();
    initProjectPages();
    initFilters();
    initSkills();
    initStatsCounter();
    initScrollReveal();
    initScrollTop();
    initThemeToggle();
    initEasterEgg();
    initGlow();
    initParallax();
    initLangToggle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
