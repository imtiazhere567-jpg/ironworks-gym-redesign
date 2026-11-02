// Ironworks Gym — hero intro, scroll animations, counters, parallax and polite pop-up
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Split headings into words for the word-by-word reveal */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text
      .split(/\s+/)
      .map((word, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${word}</span></span>`)
      .join(' ');
  });

  /* Smooth inertia scrolling (Lenis); native scrolling if it fails to load or motion is reduced */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.07, wheelMultiplier: 0.85, touchMultiplier: 1.2 });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* Hero headline: split each line into letters (--l = line, --c = letter) */
  document.querySelectorAll('[data-chars]').forEach((line, l) => {
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = [...line.textContent.trim()]
      .map((ch, c) => `<span class="ch" style="--l:${l};--c:${c}">${ch === ' ' ? '&nbsp;' : ch}</span>`)
      .join('');
  });

  /* Live open/closed status (gym hours 6am–10pm) */
  const status = document.getElementById('openStatus');
  if (status) {
    const hour = new Date().getHours();
    const open = hour >= 6 && hour < 22;
    status.textContent = open ? 'Open now · until 10pm' : 'Closed · opens 6am';
    status.parentElement.classList.toggle('is-closed', !open);
  }

  /* Children of [data-stagger] reveal one after another */
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.style.setProperty('--i', i);
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
    });
  });

  /* Counters */
  const formatCount = (el, n) =>
    (el.dataset.prefix || '') + Math.round(n).toLocaleString('en-GB') + (el.dataset.suffix || '');

  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = formatCount(el, target); return; }
    const start = performance.now();
    const duration = 1600;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      el.textContent = formatCount(el, target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = formatCount(el, 0); });

  /* Reveal on scroll */
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      if (entry.target.dataset.count) runCounter(entry.target);
      revealer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal], [data-split], [data-count], [data-inview]').forEach((el) => revealer.observe(el));

  /* Hero intro once fonts are ready */
  const intro = () => body.classList.add('is-loaded');
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(intro);
  setTimeout(intro, 1200);

  /* Videos: only play while on screen */
  const videos = document.querySelectorAll('video');
  if (reduceMotion) {
    videos.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
  } else {
    const player = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { if (!entry.target.dataset.userPaused) entry.target.play().catch(() => {}); }
        else entry.target.pause();
      });
    }, { rootMargin: '200px 0px' });
    videos.forEach((v) => player.observe(v));
  }

  /* Scroll-driven: progress bar, header, parallax, sideways text, polite pop-up */
  const heroPin = document.getElementById('heroPin');
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.progress span');
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const sliders = [...document.querySelectorAll('[data-scroll-x]')];
  const sheet = document.getElementById('nlSheet');
  const wantsSheet = sheet && new URLSearchParams(location.search).get('popup') === 'scroll';
  let sheetShown = false;
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;
    const ratio = max > 0 ? y / max : 0;

    progress.style.transform = `scaleX(${ratio})`;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > lastY && y > 500 && !header.classList.contains('nav-open'));
    lastY = y;

    if (!reduceMotion) {
      const pr = heroPin.getBoundingClientRect();
      const pinTravel = Math.max(pr.height - vh, 1);
      heroPin.style.setProperty('--hp', Math.min(Math.max(-pr.top / pinTravel, 0), 1).toFixed(3));
      parallax.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const offset = -(r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
        el.style.setProperty('--py', `${offset.toFixed(1)}px`);
      });
      sliders.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (vh - r.top) / (vh + r.height);
        el.style.setProperty('--sx', `${(p * parseFloat(el.dataset.scrollX)).toFixed(2)}%`);
      });
    }

    if (wantsSheet && !sheetShown && ratio > 0.35) {
      sheetShown = true;
      sheet.classList.add('is-open');
      sheet.removeAttribute('aria-hidden');
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Crossing tapes: drift sideways, speed up, lean and reverse with scroll velocity */
  const tapes = document.querySelector('.tapes');
  const tracks = [...document.querySelectorAll('.tape-track')];
  if (tapes && !reduceMotion) {
    const state = tracks.map((track) => {
      const set = [...track.children];
      while (track.scrollWidth < window.innerWidth * 1.4) set.forEach((item) => track.appendChild(item.cloneNode(true)));
      [...track.children].forEach((item) => track.appendChild(item.cloneNode(true))); // two identical halves
      return { track, x: 0, dir: Number(track.dataset.dir) };
    });
    let tapesVisible = false;
    new IntersectionObserver(([entry]) => { tapesVisible = entry.isIntersecting; }).observe(tapes);
    let prevY = window.scrollY, prevT = performance.now(), velocity = 0, heading = 1;
    const drift = (now) => {
      const dt = Math.min(now - prevT, 50) / 1000;
      prevT = now;
      const y = window.scrollY;
      velocity += ((y - prevY) / Math.max(dt, 0.001) - velocity) * 0.12;
      prevY = y;
      if (Math.abs(velocity) > 30) heading = Math.sign(velocity);
      if (tapesVisible) {
        const speed = 70 + Math.min(Math.abs(velocity) * 0.35, 600);
        state.forEach((s) => {
          const half = s.track.scrollWidth / 2;
          s.x += s.dir * heading * speed * dt;
          if (s.x <= -half) s.x += half;
          if (s.x > 0) s.x -= half;
          s.track.style.transform = `translate3d(${s.x.toFixed(1)}px,0,0)`;
        });
        tapes.style.setProperty('--skew', `${Math.max(-10, Math.min(10, velocity / 120)).toFixed(2)}deg`);
      }
      requestAnimationFrame(drift);
    };
    requestAnimationFrame(drift);
  }

  /* Numbers bento: words for the light-up headline, scroll-scrubbed cells and counters */
  document.querySelectorAll('[data-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    const accentFrom = Number(el.dataset.accentFrom ?? Infinity);
    el.setAttribute('aria-label', el.textContent.trim());
    el.style.setProperty('--n', words.length);
    el.innerHTML = words
      .map((w, i) => `<span class="wd${i >= accentFrom ? ' acc' : ''}" style="--i:${i}" aria-hidden="true">${w}</span>`)
      .join(' ');
  });
  const cells = [...document.querySelectorAll('.cell')];
  const scrubCounters = [...document.querySelectorAll('[data-scrub]')];
  const scrubCells = () => {
    const vh = window.innerHeight;
    cells.forEach((cell) => {
      const r = cell.getBoundingClientRect();
      const raw = reduceMotion ? 1 : Math.min(Math.max((vh * 0.95 - r.top) / (vh * 0.55), 0), 1);
      cell.style.setProperty('--p', (1 - Math.pow(1 - raw, 3)).toFixed(3));
    });
    scrubCounters.forEach((el) => {
      const p = Number(el.closest('.cell').style.getPropertyValue('--p'));
      el.textContent = formatCount(el, Number(el.dataset.scrub) * p);
    });
    scrubClassCards(vh);
    if (bandPin) {
      const r = bandPin.getBoundingClientRect();
      const bp = reduceMotion ? 1 : Math.min(Math.max(-r.top / Math.max(r.height - vh, 1), 0), 1);
      bandPin.style.setProperty('--bp', bp.toFixed(3));
    }
    scrubTour(vh);
    scrubTail(vh);
  };

  /* Pricing fan-out (--pp), CTA knockout zoom (--cp) and footer wordmark (--fp) follow scroll */
  const priceGrid = document.getElementById('priceGrid');
  const ctaFinal = document.getElementById('ctaFinal');
  const ctaPin = document.getElementById('ctaPin');
  document.querySelectorAll('.cta-pick button').forEach((btn, _, all) => btn.addEventListener('click', () => {
    all.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const times = document.getElementById('ctaTimes');
    times.classList.add('is-swapping');
    setTimeout(() => { times.textContent = btn.dataset.times; times.classList.remove('is-swapping'); }, 200);
  }));
  const siteFooter = document.getElementById('siteFooter');
  document.querySelectorAll('[data-mark]').forEach((el) => {
    el.innerHTML = [...el.textContent.trim()].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
  });
  const enterProgress = (el, vh, start, span) => {
    if (!el || reduceMotion) return 1;
    return clamp01((vh * start - el.getBoundingClientRect().top) / (vh * span));
  };
  /* Pricing: odometer digits, monthly/yearly toggle, value calculator */
  let billing = 'monthly';
  let pricesRolled = false;
  const rolls = [...document.querySelectorAll('.roll')];
  const setRoll = (el, value) => {
    const chars = String(value).split('');
    if (el.children.length !== chars.length) {
      el.innerHTML = chars.map((_, i) => `<span class="digit"><span class="strip" style="--dd:${i}">${'0123456789'.split('').map((n) => `<span>${n}</span>`).join('')}</span></span>`).join('');
      void el.offsetWidth; // let the new strips start from 0 before rolling
    }
    chars.forEach((ch, i) => {
      const strip = el.children[i].firstElementChild;
      strip.style.setProperty('--d', ch);
      el.children[i].style.width = `${strip.children[Number(ch)].offsetWidth}px`; // narrow digits like 1 don't leave a gap
    });
  };
  const rollPrices = () => rolls.forEach((el) => setRoll(el, el.dataset[billing]));
  rolls.forEach((el) => setRoll(el, reduceMotion ? el.dataset.monthly : '0'.repeat(el.dataset.monthly.length)));
  // Digit widths depend on the display font, so re-measure once it has loaded
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => rolls.forEach((el) => {
    [...el.children].forEach((digit) => {
      const strip = digit.firstElementChild;
      digit.style.width = `${strip.children[Number(strip.style.getPropertyValue('--d'))].offsetWidth}px`;
    });
  }));

  const billToggle = document.querySelector('.bill-toggle');
  const placePill = () => {
    const on = billToggle.querySelector('[aria-pressed="true"]');
    billToggle.style.setProperty('--x', `${on.offsetLeft}px`);
    billToggle.style.setProperty('--w', `${on.offsetWidth}px`);
  };
  const vcRange = document.getElementById('vcRange');
  const updateCalc = () => {
    if (!vcRange) return;
    const n = Number(vcRange.value);
    const monthly = Number(document.querySelector('.plan-main .roll').dataset[billing]);
    const perMonth = (n * 52) / 12;
    vcRange.style.setProperty('--fill', `${((n - 1) / 6) * 100}%`);
    document.getElementById('vcTimes').textContent = n;
    document.querySelectorAll('.vc-days i').forEach((d, i) => d.classList.toggle('on', i < n));
    document.getElementById('vcCost').textContent = `£${(monthly / perMonth).toFixed(2)}`;
    const save = Math.round(perMonth * 8 - monthly);
    document.getElementById('vcSave').textContent = save > 0 ? `You save £${save} a month vs day passes` : 'Day passes work out cheaper at this pace';
  };
  if (billToggle) {
    billToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bill]');
      if (!btn || btn.dataset.bill === billing) return;
      billing = btn.dataset.bill;
      billToggle.querySelectorAll('[data-bill]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      placePill();
      rollPrices();
      document.querySelectorAll('#pricing [data-monthly]:not(.roll)').forEach((el) => {
        el.classList.add('is-swapping');
        setTimeout(() => { el.textContent = el.dataset[billing]; el.classList.remove('is-swapping'); }, 250);
      });
      updateCalc();
    });
    window.addEventListener('resize', placePill);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(placePill);
    placePill();
  }
  if (vcRange) { vcRange.addEventListener('input', updateCalc); updateCalc(); }

  // Every regular (non-pinned) section rises in as it scrolls into view (--se 0 → 1)
  const entering = [...document.querySelectorAll('.numbers, #classes, #timetable, #pricing, .voices, .site-footer')];
  entering.forEach((el) => el.classList.add('sec'));

  function scrubTail(vh) {
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    entering.forEach((el) => {
      const raw = reduceMotion ? 1 : clamp01((vh - el.getBoundingClientRect().top) / (vh * 0.5));
      el.style.setProperty('--se', ease(raw).toFixed(3));
      el.classList.toggle('is-entered', raw >= 1); // drop the transform once settled (keeps sticky children clean)
    });
    if (priceGrid) {
      const pp = ease(enterProgress(priceGrid, vh, 1, 0.6));
      priceGrid.style.setProperty('--pp', pp.toFixed(3));
      priceGrid.classList.toggle('is-in', pp > 0.85);
      if (pp > 0.85 && !pricesRolled) { pricesRolled = true; rollPrices(); }
    }
    if (ctaPin) {
      const r = ctaPin.getBoundingClientRect();
      const cp = reduceMotion ? 1 : clamp01(-r.top / Math.max(r.height - vh, 1));
      ctaPin.style.setProperty('--cp', cp.toFixed(3));
      ctaFinal.classList.toggle('is-live', cp > 0.7);
    }
    if (siteFooter) siteFooter.style.setProperty('--fp', ease(enterProgress(siteFooter, vh, 1, 0.7)).toFixed(3));
  }

  /* Hover tilt + spotlight for [data-tilt] cards (mouse only) */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }
  const bandPin = document.getElementById('bandPin');

  /* Floor tour: hold on each zone, then walk the marker to the next and open its photo */
  const clamp01 = (n) => Math.min(Math.max(n, 0), 1);
  const tourPin = document.querySelector('.tour-pin');
  const tourPhotos = [...document.querySelectorAll('.tour-photo')];
  const tourZones = [...document.querySelectorAll('.tour-zone')];
  const tourRects = [...document.querySelectorAll('.tm-zone')];
  const tourSteps = [...document.querySelectorAll('.tour-steps i')];
  const tourRoute = document.getElementById('tourRoute');
  const tourDot = document.getElementById('tourDot');
  const tourPulse = document.getElementById('tourPulse');
  const tourBig = document.getElementById('tourBig');
  const stops = tourRects.map((g) => {
    const r = g.querySelector('rect');
    const n = (a) => Number(r.getAttribute(a));
    return [n('x') + n('width') / 2, n('y') + n('height') / 2 + 6];
  });
  const segs = stops.slice(1).map((p, i) => Math.hypot(p[0] - stops[i][0], p[1] - stops[i][1]));
  const routeLen = segs.reduce((a, b) => a + b, 0);
  if (tourRoute) {
    const d = `M${stops.map((p) => p.join(' ')).join(' L')}`;
    tourRoute.setAttribute('d', d);
    document.getElementById('tourRouteBg').setAttribute('d', d);
    tourRoute.style.strokeDasharray = routeLen;
  }
  // Scroll sets a target position along the route; a rAF loop glides the marker towards it
  let tourActive = 0;
  let tourTarget = 0;
  let tourCurrent = 0;
  let tourGliding = false;

  const setTourActive = (active) => {
    if (active === tourActive) return;
    tourPhotos.forEach((ph, i) => {
      ph.classList.toggle('was-active', i === tourActive);
      ph.classList.toggle('is-active', i === active);
    });
    tourActive = active;
    tourZones.forEach((el, i) => el.classList.toggle('is-active', i === active));
    tourRects.forEach((el, i) => el.classList.toggle('is-active', i === active));
    tourBig.textContent = String(active + 1).padStart(2, '0');
    tourBig.style.animation = 'none';
    void tourBig.offsetWidth; // restart the number's entrance animation
    tourBig.style.animation = '';
  };

  const renderTour = (zm) => {
    const idx = Math.min(Math.floor(zm), stops.length - 2);
    const m = zm - idx;
    const [ax, ay] = stops[idx];
    const [bx, by] = stops[idx + 1];
    const x = (ax + (bx - ax) * m).toFixed(1);
    const y = (ay + (by - ay) * m).toFixed(1);
    [tourDot, tourPulse].forEach((c) => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
    tourRoute.style.strokeDashoffset = routeLen - (segs.slice(0, idx).reduce((a, b) => a + b, 0) + segs[idx] * m);
    tourSteps.forEach((s, i) => s.style.setProperty('--f', clamp01(zm + 1 - i).toFixed(3)));
    setTourActive(Math.round(zm));
  };

  const glideTour = () => {
    tourCurrent += (tourTarget - tourCurrent) * (reduceMotion ? 1 : 0.09);
    if (Math.abs(tourTarget - tourCurrent) < 0.0005) tourCurrent = tourTarget;
    renderTour(tourCurrent);
    tourGliding = tourCurrent !== tourTarget;
    if (tourGliding) requestAnimationFrame(glideTour);
  };

  function scrubTour(vh) {
    if (!tourPin) return;
    const r = tourPin.getBoundingClientRect();
    const last = stops.length - 1;
    const z = clamp01(-r.top / Math.max(r.height - vh, 1)) * last;
    const idx = Math.min(Math.floor(z), last - 1);
    const f = clamp01((z - idx - 0.35) / 0.65); // first 35% of each step holds on the zone
    tourTarget = idx + (f < 0.5 ? 4 * f ** 3 : 1 - (-2 * f + 2) ** 3 / 2);
    if (!tourGliding) { tourGliding = true; requestAnimationFrame(glideTour); }
  }

  /* Class cards: entrance (--e), covered by the next card (--cov), active item in the side nav */
  const classCards = [...document.querySelectorAll('.class-card')];
  const classNav = document.querySelector('.class-nav');
  const navItems = classNav ? [...classNav.children] : [];
  function scrubClassCards(vh) {
    const rects = classCards.map((c) => c.getBoundingClientRect());
    let active = 0;
    classCards.forEach((card, i) => {
      const r = rects[i];
      const e = reduceMotion ? 1 : Math.min(Math.max((vh - r.top) / (vh * 0.5), 0), 1);
      const next = rects[i + 1];
      const cov = next && !reduceMotion ? Math.min(Math.max(1 - (next.top - r.top) / r.height, 0), 1) : 0;
      card.style.setProperty('--e', (1 - Math.pow(1 - e, 3)).toFixed(3));
      card.style.setProperty('--cov', cov.toFixed(3));
      if (r.top < vh * 0.55) active = i;
    });
    if (classNav) {
      classNav.style.setProperty('--active', active);
      navItems.forEach((li, i) => li.classList.toggle('is-active', i === active));
    }
  }
  // Cards are sticky, so jump targets come from the stack's flow layout, not the cards' live positions
  document.querySelectorAll('[data-goto]').forEach((btn) => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.goto);
    const stack = document.querySelector('.class-stack');
    const gap = parseFloat(getComputedStyle(stack).rowGap) || 0;
    const before = classCards.slice(0, i).reduce((sum, c) => sum + c.offsetHeight + gap, 0);
    const stickyTop = parseFloat(getComputedStyle(classCards[i]).top) || 0;
    const y = stack.getBoundingClientRect().top + window.scrollY + before - stickyTop + 2;
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }));
  let scrubQueued = false;
  window.addEventListener('scroll', () => {
    if (!scrubQueued) { scrubQueued = true; requestAnimationFrame(() => { scrubCells(); scrubQueued = false; }); }
  }, { passive: true });
  window.addEventListener('resize', scrubCells);
  scrubCells();

  /* Numbers bento: today's bar, clock "now" hand, pointer spotlight */
  document.querySelectorAll('.bars li').forEach((li, i) => {
    li.querySelector('i').style.setProperty('--bi', i);
    li.classList.toggle('is-today', i === (new Date().getDay() + 6) % 7);
  });
  const clockNow = document.getElementById('clockNow');
  if (clockNow) {
    const d = new Date();
    clockNow.style.setProperty('--now', `${((d.getHours() + d.getMinutes() / 60) / 24) * 360}deg`);
  }
  document.querySelectorAll('.cell').forEach((cell) => cell.addEventListener('pointermove', (e) => {
    const r = cell.getBoundingClientRect();
    cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
    cell.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* Booking confirmation dialog: check draws, confetti bursts, details slide in; .ics for the calendar */
  const bookingDialog = document.getElementById('bookingDialog');
  let bookingTrigger = null;
  let icsUrl = null;
  const pad2 = (n) => String(n).padStart(2, '0');
  const icsStamp = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;

  const burstConfetti = (color, box = bookingDialog.querySelector('.bk-confetti')) => {
    const colors = [color, '#ff5b24', '#ffc23d', '#7fd1b9', '#f3efe8'];
    box.innerHTML = Array.from({ length: 34 }, (_, i) => {
      const angle = (i / 34) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 130;
      return `<i style="--x:${(Math.cos(angle) * dist).toFixed(0)}px;--y:${(Math.sin(angle) * dist - 40).toFixed(0)}px;--r:${Math.round(Math.random() * 720 - 360)}deg;--c:${colors[i % colors.length]};--d:${(Math.random() * 0.15).toFixed(2)}s"></i>`;
    }).join('');
  };

  function openBooking(b) {
    if (!bookingDialog) return;
    const $ = (id) => document.getElementById(id);
    const ref = `IW-${Math.floor(1000 + Math.random() * 9000)}`;
    const mode = b.mode || 'booked';
    $('bkKicker').textContent = { booked: 'Booking confirmed', waitlist: 'Waitlist', free: 'Free class claimed' }[mode];
    $('bkTitle').textContent = { booked: "You're booked in!", waitlist: "You're on the waitlist", free: 'Your first class is on us!' }[mode];
    $('bkSub').textContent = {
      booked: `See you on the floor. Arrive 10 minutes early and bring a towel.`,
      waitlist: `This ${b.type} class is full. We'll text you the moment a space opens up.`,
      free: `Show this at reception and pick any ${b.type} session. No card needed.`,
    }[mode];
    $('bkClass').textContent = b.type;
    $('bkWhenLabel').textContent = mode === 'free' ? 'Sessions' : 'When';
    $('bkWhen').textContent = b.when;
    $('bkCoachLabel').textContent = mode === 'free' ? 'Price' : 'Coach';
    $('bkCoach').textContent = mode === 'free' ? 'Free · first class' : b.coach;
    $('bkDurLabel').textContent = mode === 'free' ? 'Then' : 'Duration';
    $('bkDur').textContent = mode === 'free' ? '£29/month, no contract' : `${b.dur} min`;
    $('bkRef').textContent = ref;

    const cal = $('bkCal');
    if (icsUrl) URL.revokeObjectURL(icsUrl);
    icsUrl = null;
    cal.hidden = !b.start || mode === 'waitlist';
    if (b.start && mode !== 'waitlist') {
      const end = new Date(b.start.getTime() + b.dur * 60000);
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ironworks Gym sample site//EN', 'BEGIN:VEVENT',
        `UID:${ref}-${Date.now()}@ironworks.sample`, `DTSTAMP:${icsStamp(new Date())}`,
        `DTSTART:${icsStamp(b.start)}`, `DTEND:${icsStamp(end)}`,
        `SUMMARY:${b.type} at Ironworks Gym`, 'LOCATION:12 Foundry Lane\\, Sample Town',
        `DESCRIPTION:Coach ${b.coach}. Booking ref ${ref}.`, 'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
      icsUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      cal.href = icsUrl;
      cal.download = `ironworks-${b.type.toLowerCase()}.ics`;
    }

    bookingDialog.style.setProperty('--bk', b.color || 'var(--accent)');
    bookingDialog.classList.toggle('is-waitlist', mode === 'waitlist');
    bookingTrigger = b.trigger || document.activeElement;
    bookingDialog.showModal();
    if (lenis) lenis.stop();
    requestAnimationFrame(() => {
      bookingDialog.classList.add('is-open');
      if (mode !== 'waitlist' && !reduceMotion) burstConfetti(b.color || '#ff5b24');
    });
    $('bkDone').focus({ preventScroll: true });
  }

  const closeBooking = () => {
    if (!bookingDialog.open || bookingDialog.classList.contains('is-closing')) return;
    bookingDialog.classList.add('is-closing');
    bookingDialog.classList.remove('is-open');
    setTimeout(() => {
      bookingDialog.classList.remove('is-closing');
      bookingDialog.close();
      if (lenis) lenis.start();
      bookingTrigger?.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 380);
  };
  if (bookingDialog) {
    bookingDialog.addEventListener('cancel', (e) => { e.preventDefault(); closeBooking(); });
    bookingDialog.addEventListener('click', (e) => { if (e.target === bookingDialog) closeBooking(); });
    document.getElementById('bkDone').addEventListener('click', closeBooking);
    bookingDialog.querySelector('.bk-x').addEventListener('click', closeBooking);
    // The CTA's claim button opens the free-class version for the picked class
    document.querySelector('.cta-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation(); // skip the smooth-scroll anchor handler
      const picked = document.querySelector('.cta-pick [aria-pressed="true"]');
      openBooking({ mode: 'free', type: picked.textContent.trim(), color: picked.style.getPropertyValue('--tc'), when: `Daily · ${picked.dataset.times}`, trigger: e.currentTarget });
    }, true);
  }

  /* Join dialog: pick a plan and enter details, then a welcome step with a membership card */
  const joinDialog = document.getElementById('joinDialog');
  if (joinDialog) {
    const form = joinDialog.querySelector('.jn-form');
    const planBtns = [...joinDialog.querySelectorAll('[data-plan]')];
    const errorEl = joinDialog.querySelector('.jn-error');
    let plan = 'monthly';
    let joinTrigger = null;

    // Prices follow the monthly / yearly switch in the pricing section
    const planInfo = (p) => {
      const yearly = billing === 'yearly';
      if (p === 'day') return { short: '£8 / day', due: '£8', label: 'Due today', card: 'Day pass' };
      if (p === 'student') return yearly
        ? { short: '£18/mo, yearly', due: '£216', label: 'Due today (1 year)', card: 'Student · Yearly' }
        : { short: '£22 / month', due: '£22', label: 'Due today', card: 'Student' };
      return yearly
        ? { short: '£24/mo, yearly', due: '£290', label: 'Due today (1 year)', card: 'Monthly · Yearly' }
        : { short: '£29 / month', due: '£29', label: 'Due today', card: 'Monthly' };
    };
    const selectPlan = (p) => {
      plan = p;
      planBtns.forEach((b) => {
        b.setAttribute('aria-checked', String(b.dataset.plan === p));
        b.querySelector('.jn-price').textContent = planInfo(b.dataset.plan).short;
      });
      const info = planInfo(p);
      document.getElementById('jnTotal').textContent = info.due;
      document.getElementById('jnTotalLabel').textContent = info.label;
    };

    const openJoin = (p, trigger) => {
      joinTrigger = trigger;
      form.reset();
      form.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
      errorEl.textContent = '';
      selectPlan(p);
      joinDialog.showModal();
      if (lenis) lenis.stop();
      requestAnimationFrame(() => joinDialog.classList.add('is-open'));
      form.elements.name.focus({ preventScroll: true });
    };
    const closeJoin = () => {
      if (!joinDialog.open || joinDialog.classList.contains('is-closing')) return;
      joinDialog.classList.add('is-closing');
      joinDialog.classList.remove('is-open');
      setTimeout(() => {
        joinDialog.classList.remove('is-closing', 'is-done');
        joinDialog.close();
        if (lenis) lenis.start();
        joinTrigger?.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 380);
    };

    planBtns.forEach((b) => b.addEventListener('click', () => selectPlan(b.dataset.plan)));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.name;
      const email = form.elements.email;
      const badName = name.value.trim().length < 2;
      const badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      [[name, badName], [email, badEmail]].forEach(([input, bad]) => {
        input.classList.remove('is-invalid');
        if (bad) { void input.offsetWidth; input.classList.add('is-invalid'); }
      });
      if (badName || badEmail) {
        errorEl.textContent = badName ? 'Please enter your name.' : 'Please enter a valid email address.';
        (badName ? name : email).focus();
        return;
      }
      errorEl.textContent = '';
      const fullName = name.value.trim().replace(/\s+/g, ' ');
      const digits = () => String(Math.floor(1000 + Math.random() * 9000));
      document.getElementById('jnWelcome').textContent = `Welcome to the crew, ${fullName.split(' ')[0]}!`;
      document.getElementById('jmName').textContent = fullName;
      document.getElementById('jmPlan').textContent = planInfo(plan).card;
      document.getElementById('jmNo').textContent = `IW ${digits()} ${digits()}`;
      document.getElementById('jmSince').textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      joinDialog.classList.add('is-done');
      if (!reduceMotion) burstConfetti('#ff5b24', joinDialog.querySelector('.bk-confetti'));
      joinDialog.querySelector('.jn-done').focus({ preventScroll: true });
    });
    joinDialog.addEventListener('cancel', (e) => { e.preventDefault(); closeJoin(); });
    joinDialog.addEventListener('click', (e) => { if (e.target === joinDialog) closeJoin(); });
    joinDialog.querySelector('.bk-x').addEventListener('click', closeJoin);
    joinDialog.querySelector('.jn-done').addEventListener('click', closeJoin);
    document.querySelectorAll('[data-join]').forEach((el) => el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation(); // skip the smooth-scroll anchor handler
      if (header.classList.contains('nav-open')) setMenu(false);
      openJoin(el.dataset.join, el);
    }, true));
  }

  /* Timetable: day tabs, 6am–10pm rail, filter chips and a strip of bookable tickets */
  const ttSection = document.getElementById('timetable');
  if (ttSection) {
    const TYPES = {
      spin: { name: 'Spin', tag: 'High energy', cap: 20 },
      hiit: { name: 'HIIT', tag: 'Full body', cap: 16 },
      yoga: { name: 'Yoga', tag: 'Mobility', cap: 16 },
    };
    const CLASSES = [
      ['06:30', 'spin', 45, 'Dani'], ['07:15', 'hiit', 30, 'Marcus'], ['09:30', 'yoga', 60, 'Priya'],
      ['12:15', 'spin', 45, 'Dani'], ['13:00', 'hiit', 30, 'Leah'], ['17:30', 'yoga', 60, 'Priya'],
      ['18:00', 'hiit', 30, 'Leah'], ['19:00', 'spin', 45, 'Sam'], ['20:00', 'yoga', 60, 'Priya'],
    ];
    // Which classes run each day, Mon → Sun (6+6+7+6+6+6+5 = 42 a week, matching the numbers section)
    const WEEK = [[0, 1, 2, 3, 6, 8], [0, 2, 4, 5, 7, 8], [0, 1, 2, 3, 6, 7, 8], [0, 1, 2, 4, 6, 8], [0, 1, 3, 5, 6, 7], [1, 2, 3, 5, 7, 8], [2, 3, 5, 7, 8]];
    const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const OPEN = 6 * 60;
    const SPAN = 16 * 60;
    const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    const pad = (n) => String(n).padStart(2, '0');

    const today = (new Date().getDay() + 6) % 7;
    const booked = new Set();
    let day = today;
    let filter = 'all';

    const daysEl = ttSection.querySelector('.tt-days');
    const axisEl = ttSection.querySelector('.tt-axis');
    const dotsEl = ttSection.querySelector('.tt-dots');
    const nowEl = ttSection.querySelector('.tt-now');
    const filtersEl = ttSection.querySelector('.tt-filters');
    const strip = ttSection.querySelector('.tt-strip');

    const classesFor = (d) => WEEK[d].map((ci, i) => {
      const [time, type, dur, coach] = CLASSES[ci];
      const cap = TYPES[type].cap;
      const left = [0, 1, 2, 3, 5, 6, 8, 9, 11, 4, 7][(d * 31 + i * 17 + 7) % 11]; // stable sample availability
      return { key: `${d}-${ci}`, time, type, dur, coach, cap, left: Math.min(left, cap) };
    });

    const nowMinutes = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
    const statusOf = (c) => {
      const start = toMin(c.time);
      if (day === today) {
        const now = nowMinutes();
        if (now >= start + c.dur) return ['Finished', 'is-past'];
        if (now >= start) return ['Live now', 'is-live'];
        if (start - now <= 180) {
          const m = start - now;
          return [`Starts in ${m >= 60 ? `${Math.floor(m / 60)}h ` : ''}${m % 60}m`, 'is-soon'];
        }
      }
      const left = c.left - (booked.has(c.key) ? 1 : 0);
      return left <= 0 && !booked.has(c.key) ? ['Full', 'is-full'] : [day === today ? 'Today' : DAY_NAMES[day], ''];
    };

    const ticketHTML = (c, k) => {
      const t = TYPES[c.type];
      const [label, cls] = statusOf(c);
      const mine = booked.has(c.key);
      const left = c.left - (mine ? 1 : 0);
      const taken = c.cap - c.left;
      const dots = Array.from({ length: c.cap }, (_, i) => `<i class="${i < taken ? 'on' : i === taken && mine ? 'mine' : ''}"></i>`).join('');
      const past = cls === 'is-past';
      const full = c.left <= 0 && !mine;
      const btn = past ? 'Finished' : mine ? 'Booked ✓' : full ? 'Full · join waitlist' : 'Book this class';
      return `<article class="ticket${past ? ' is-past' : ''}${mine ? ' is-booked' : ''}" style="--k:${k};--tc:var(--${c.type})" data-key="${c.key}">
        <div class="tk-stub"><span class="tk-time">${c.time}</span><span class="tk-dur">${c.dur}<br>min</span></div>
        <div class="tk-main">
          <div class="tk-top"><span class="tk-type">${t.tag}</span><span class="tk-status ${cls}">${label}</span></div>
          <h3>${t.name}</h3>
          <div class="tk-coach"><span class="tk-avatar">${c.coach[0]}</span>Coach ${c.coach}</div>
          <div class="tk-seats"><div class="tk-dots" aria-hidden="true">${dots}</div><span><b>${Math.max(left, 0)}</b> of ${c.cap} spaces left</span></div>
          <button class="tk-book" type="button"${past ? ' disabled' : ''}>${btn}</button>
        </div>
      </article>`;
    };

    const renderDays = () => {
      const monday = new Date();
      monday.setDate(monday.getDate() - today);
      daysEl.innerHTML = DAY_NAMES.map((n, d) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + d);
        return `<button class="tt-day" role="tab" type="button" aria-selected="${d === day}" data-day="${d}">${d === today ? 'Today' : n}<b>${date.getDate()}</b></button>`;
      }).join('');
    };

    const renderFilters = (list) => {
      const count = (type) => list.filter((c) => type === 'all' || c.type === type).length;
      filtersEl.innerHTML = ['all', 'spin', 'hiit', 'yoga'].map((type) => `<button class="tt-chip" type="button" aria-pressed="${filter === type}" data-filter="${type}"${type === 'all' ? '' : ` style="--tc:var(--${type})"`}><i></i>${type === 'all' ? 'All classes' : TYPES[type].name} <small>${count(type)}</small></button>`).join('');
    };

    const renderNow = () => {
      const now = nowMinutes();
      const show = day === today && now >= OPEN && now <= OPEN + SPAN;
      nowEl.hidden = !show;
      if (show) {
        nowEl.style.left = `${((now - OPEN) / SPAN) * 100}%`;
        nowEl.querySelector('span').textContent = `Now ${pad(Math.floor(now / 60))}:${pad(now % 60)}`;
      }
    };

    const render = (animate = true) => {
      const list = classesFor(day);
      const shown = list.filter((c) => filter === 'all' || c.type === filter);
      renderFilters(list);
      dotsEl.innerHTML = list.map((c, k) => {
        const past = day === today && nowMinutes() >= toMin(c.time) + c.dur;
        const dim = filter !== 'all' && c.type !== filter;
        return `<button class="tt-dot${dim ? ' is-dim' : ''}${past ? ' is-past' : ''}" type="button" style="--k:${k};--tc:var(--${c.type});left:${((toMin(c.time) - OPEN) / SPAN) * 100}%" data-key="${c.key}" data-label="${c.time} · ${TYPES[c.type].name}" aria-label="${c.time} ${TYPES[c.type].name}"></button>`;
      }).join('');
      renderNow();
      if (animate) strip.classList.remove('is-in');
      strip.innerHTML = shown.length ? shown.map(ticketHTML).join('') : '<p class="tt-empty">No classes match this filter today.</p>';
      // Snap points follow the tickets' entrance offset, so pause snapping while they deal in
      strip.style.scrollSnapType = 'none';
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => { strip.style.scrollSnapType = ''; }, 1600);
      // On today, start the strip at the next class that hasn't finished
      const next = day === today ? strip.querySelector('.ticket:not(.is-past)') : null;
      strip.scrollLeft = next ? next.offsetLeft - strip.offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft) : 0;
      if (animate && ttRevealed) { void strip.offsetWidth; strip.classList.add('is-in'); }
    };
    let snapTimer;

    axisEl.innerHTML = Array.from({ length: 9 }, (_, i) => `<span style="left:${(i / 8) * 100}%">${pad(6 + i * 2)}:00</span>`).join('');

    let ttRevealed = false;
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      ttRevealed = true;
      strip.style.scrollSnapType = 'none';
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => { strip.style.scrollSnapType = ''; }, 1600);
      strip.classList.add('is-in');
      obs.disconnect();
    }, { threshold: 0.2 }).observe(strip);

    daysEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-day]');
      if (!btn || Number(btn.dataset.day) === day) return;
      day = Number(btn.dataset.day);
      renderDays();
      render();
    });
    filtersEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn || btn.dataset.filter === filter) return;
      filter = btn.dataset.filter;
      render();
    });
    strip.addEventListener('click', (e) => {
      const btn = e.target.closest('.tk-book');
      if (!btn || btn.disabled) return;
      const ticket = btn.closest('.ticket');
      const key = ticket.dataset.key;
      const c = classesFor(day).find((x) => x.key === key);
      const start = new Date();
      start.setDate(start.getDate() - today + day);
      start.setHours(Number(c.time.slice(0, 2)), Number(c.time.slice(3)), 0, 0);
      const details = {
        type: TYPES[c.type].name, color: `var(--${c.type})`, coach: c.coach, dur: c.dur, start, trigger: btn,
        when: `${day === today ? 'Today' : DAY_NAMES[day]} ${start.getDate()} ${start.toLocaleString('en-GB', { month: 'short' })} · ${c.time}`,
      };
      if (booked.has(key)) booked.delete(key);
      else if (c.left > 0) { booked.add(key); openBooking(details); }
      else { btn.textContent = 'On the waitlist ✓'; btn.disabled = true; openBooking({ ...details, mode: 'waitlist' }); return; }
      const k = ticket.style.getPropertyValue('--k');
      ticket.outerHTML = ticketHTML(c, k);
    });
    dotsEl.addEventListener('click', (e) => {
      const dot = e.target.closest('.tt-dot');
      if (!dot) return;
      if (filter !== 'all' && !strip.querySelector(`[data-key="${dot.dataset.key}"]`)) { filter = 'all'; render(); }
      const ticket = strip.querySelector(`[data-key="${dot.dataset.key}"]`);
      if (ticket) strip.scrollTo({ left: ticket.offsetLeft - strip.offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft), behavior: 'smooth' });
    });
    ttSection.querySelectorAll('.tt-arrow').forEach((btn) => btn.addEventListener('click', () => {
      const card = strip.querySelector('.ticket');
      strip.scrollBy({ left: Number(btn.dataset.dir) * ((card ? card.offsetWidth : 300) + 16), behavior: 'smooth' });
    }));

    // Drag to scroll with a mouse
    let dragX = null;
    let dragLeft = 0;
    let dragged = false;
    strip.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.target.closest('button')) return;
      dragX = e.clientX; dragLeft = strip.scrollLeft; dragged = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (dragX === null) return;
      if (Math.abs(e.clientX - dragX) > 4) { dragged = true; strip.classList.add('is-dragging'); }
      if (dragged) strip.scrollLeft = dragLeft - (e.clientX - dragX);
    });
    window.addEventListener('pointerup', () => { dragX = null; strip.classList.remove('is-dragging'); });

    renderDays();
    render(false);
    setInterval(renderNow, 60000);
  }

  /* Members' chat: scripted messages type in one by one, then the thread clears and loops */
  const chatBody = document.getElementById('chatBody');
  if (chatBody) {
    const PEOPLE = {
      aisha: { name: 'Aisha K.', c: '#ffc23d' },
      sam: { name: 'Sam R.', c: '#ff8a5c' },
      tom: { name: 'Tom W.', c: '#7fd1b9' },
      dani: { name: 'Dani', c: '#ff5b24', badge: 'Coach', me: true },
      jordan: { name: 'Jordan L.', c: '#b49cff' },
      megan: { name: 'Megan D.', c: '#ff8fa3' },
    };
    const SCRIPT = [
      { who: 'aisha', text: 'Anyone else at 6:30 Spin tomorrow? 🚴', time: '07:02' },
      { who: 'sam', text: 'Always. Never wait for a rack here, even at 6pm. The coaches actually remember your name.', time: '07:04', react: '💯 8' },
      { who: 'tom', text: 'Sunday yoga is my reset. Clean, friendly and properly equipped 🙏', time: '07:11' },
      { who: 'dani', text: "Love this crew. Tomorrow's Spin playlist is 🔥", time: '07:15', react: '🔥 21' },
      { who: 'jordan', photo: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=500&q=60', text: "30 min HIIT at lunch and I'm back at my desk buzzing", time: '12:46' },
      { who: 'megan', text: 'Came for the price, stayed for the people. Three years in and I still look forward to every session ❤️', time: '13:20', react: '❤️ 14' },
      { who: 'aisha', text: "No contract is what sold me. Now I'd never leave 😅", time: '13:22' },
    ];
    const status = document.getElementById('chatStatus');
    const idleStatus = status.textContent;
    let step = 0;
    let visible = false;
    let started = false;
    let pending = null; // next step, held while the chat is off-screen

    const later = (fn, ms) => setTimeout(() => { if (visible) fn(); else pending = fn; }, ms);
    const scrollDown = () => chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
    const msgHTML = (m) => {
      const p = PEOPLE[m.who];
      return `<div class="msg${p.me ? ' is-me' : ''}" style="--c:${p.c}">
        <span class="msg-av" aria-hidden="true">${p.name[0]}</span>
        <div class="msg-bubble"><span class="msg-name">${p.name}${p.badge ? `<span class="msg-badge">${p.badge}</span>` : ''}</span>${m.photo ? `<img class="msg-photo" src="${m.photo}" alt="Battle ropes in a HIIT class">` : ''}${m.text}<span class="msg-time">${m.time}</span>${reduceMotion && m.react ? `<span class="msg-react">${m.react}</span>` : ''}</div>
      </div>`;
    };
    const addMessage = (m) => {
      chatBody.insertAdjacentHTML('beforeend', msgHTML(m));
      const el = chatBody.lastElementChild;
      el.querySelector('img')?.addEventListener('load', scrollDown);
      return el;
    };

    const next = () => {
      if (step >= SCRIPT.length) { later(restart, 4500); return; }
      const m = SCRIPT[step];
      const p = PEOPLE[m.who];
      const typing = document.createElement('div');
      typing.className = 'typing';
      if (p.me) { typing.style.alignSelf = 'flex-end'; typing.style.flexDirection = 'row-reverse'; }
      typing.innerHTML = `<span class="msg-av" style="--c:${p.c}" aria-hidden="true">${p.name[0]}</span><span class="dots"><i></i><i></i><i></i></span>`;
      chatBody.appendChild(typing);
      status.textContent = `${p.name} is typing…`;
      status.classList.add('is-typing');
      scrollDown();
      later(() => {
        typing.remove();
        status.textContent = idleStatus;
        status.classList.remove('is-typing');
        const el = addMessage(m);
        scrollDown();
        if (m.react) {
          setTimeout(() => {
            el.classList.add('has-react');
            el.querySelector('.msg-bubble').insertAdjacentHTML('beforeend', `<span class="msg-react">${m.react}</span>`);
            scrollDown();
          }, 900);
        }
        step += 1;
        later(next, 1600 + Math.min(m.text.length * 14, 1400));
      }, 900 + Math.min(m.text.length * 10, 900));
    };
    const restart = () => {
      chatBody.classList.add('is-clearing');
      setTimeout(() => {
        chatBody.innerHTML = '<span class="chat-day">Today</span>';
        chatBody.classList.remove('is-clearing');
        step = 0;
        later(next, 600);
      }, 650);
    };

    if (reduceMotion) {
      chatBody.innerHTML = '<span class="chat-day">Today</span>';
      SCRIPT.forEach(addMessage);
    } else {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) return;
        if (!started) {
          started = true;
          chatBody.innerHTML = '<span class="chat-day">Today</span>';
          later(next, 700);
        } else if (pending) {
          const fn = pending;
          pending = null;
          fn();
        }
      }, { threshold: 0.3 }).observe(chatBody);
    }
  }

  /* Hero video: play/pause button with a progress ring */
  const heroVideo = document.getElementById('heroVideo');
  const heroPlay = document.getElementById('heroPlay');
  if (heroVideo && heroPlay) {
    heroVideo.addEventListener('timeupdate', () => {
      if (heroVideo.duration) heroPlay.style.setProperty('--vp', (heroVideo.currentTime / heroVideo.duration).toFixed(3));
    });
    const syncPlay = () => {
      heroPlay.classList.toggle('is-paused', heroVideo.paused);
      heroPlay.setAttribute('aria-label', heroVideo.paused ? 'Play video' : 'Pause video');
    };
    heroVideo.addEventListener('play', syncPlay);
    heroVideo.addEventListener('pause', syncPlay);
    heroPlay.addEventListener('click', () => {
      if (heroVideo.paused) { heroVideo.dataset.userPaused = ''; heroVideo.play(); }
      else { heroVideo.dataset.userPaused = '1'; heroVideo.pause(); }
    });
    syncPlay();
  }

  /* Magnetic buttons (mouse only) */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* Mobile menu */
  const toggle = document.querySelector('.nav-toggle');
  const setMenu = (open) => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    root.classList.toggle('lock', open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  };
  toggle.addEventListener('click', () => setMenu(!header.classList.contains('nav-open')));
  document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* In-page links glide with Lenis too */
  if (lenis) {
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: a.getAttribute('href') === '#top' ? 0 : -72, duration: 1.4, force: true });
    }));
  }

  /* Polite sheet (?popup=scroll) */
  if (sheet) {
    const closeSheet = () => { sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); };
    sheet.querySelector('.nl-sheet-close').addEventListener('click', closeSheet);
    sheet.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); closeSheet(); });
  }
})();
