/*!
 * Psikolog Berat Çınar — site etkileşimleri
 * Bağımlılıksız (vanilla) JavaScript. Tüm metin girdileri textContent ile yazılır (XSS güvenli).
 */
(function () {
    'use strict';

    const doc = document;
    const root = doc.documentElement;
    const body = doc.body;
    const $ = (s, c = doc) => c.querySelector(s);
    const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
    const lerp = (a, b, n) => a + (b - a) * n;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const store = {
        get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* yok say */ } },
    };

    const waNumber = body.dataset.wa || '';
    const waLink = (text) => 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(text);
    const openWhatsApp = (text) => {
        const win = window.open(waLink(text), '_blank', 'noopener');
        if (!win) window.location.href = waLink(text);
    };

    /* ------------------------------------------------------------------
       Kırık görsel yedeği
       ------------------------------------------------------------------ */
    const placeholder = body.dataset.placeholder;
    const markBroken = (img) => {
        if (placeholder && !img.src.endsWith(placeholder)) img.src = placeholder;
        else img.classList.add('is-broken');
    };
    doc.addEventListener('error', (e) => {
        if (e.target && e.target.tagName === 'IMG') markBroken(e.target);
    }, true);
    $$('img').forEach((img) => { if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) markBroken(img); });

    /* ------------------------------------------------------------------
       Metin bölme (kelime / harf)
       ------------------------------------------------------------------ */
    function splitText(el) {
        const mode = el.dataset.split === 'chars' ? 'chars' : 'words';
        const words = el.textContent.trim().split(/\s+/);
        el.setAttribute('aria-label', el.textContent.trim());
        el.textContent = '';
        let i = 0;
        words.forEach((word, wi) => {
            const w = doc.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            if (mode === 'chars') {
                Array.from(word).forEach((ch) => {
                    const c = doc.createElement('span');
                    c.className = 'c';
                    c.style.setProperty('--i', i++);
                    c.textContent = ch;
                    w.appendChild(c);
                });
            } else {
                const inner = doc.createElement('span');
                inner.style.setProperty('--i', i++);
                inner.textContent = word;
                w.appendChild(inner);
            }
            el.appendChild(w);
            if (wi < words.length - 1) el.appendChild(doc.createTextNode(' '));
        });
    }
    $$('[data-split]').forEach(splitText);

    /* Kaydırmaya bağlı kelime vurgusu */
    const scrubEls = $$('[data-scrub-text]').map((el) => {
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        const spans = words.map((word, i) => {
            const s = doc.createElement('span');
            s.className = 'sw';
            s.textContent = word;
            el.appendChild(s);
            if (i < words.length - 1) el.appendChild(doc.createTextNode(' '));
            return s;
        });
        return { el, spans };
    });

    /* ------------------------------------------------------------------
       Görünüm gözlemcisi (reveal)
       ------------------------------------------------------------------ */
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.classList.add('is-in');
                io.unobserve(el);
                // Giriş animasyonundan sonra gecikmeyi kaldır (hover anında tepki versin)
                setTimeout(() => el.style.setProperty('--d', '0ms'), 1600);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    const startReveals = () => {
        $$('[data-reveal], [data-split], .signature, [data-footer-giant]').forEach((el) => io.observe(el));
    };

    /* ------------------------------------------------------------------
       Preloader
       ------------------------------------------------------------------ */
    const preloader = $('[data-preloader]');
    function runPreloader(done) {
        if (!preloader) return done();
        if (store.get('visited') || reduceMotion) {
            preloader.classList.add('is-skip');
            return done();
        }
        store.set('visited', '1');
        body.classList.add('is-locked');
        const counter = $('[data-preloader-count]', preloader);
        const bar = $('.preloader__bar', preloader);
        let p = 0;
        const start = performance.now();
        const tick = (now) => {
            const t = clamp((now - start) / 1800, 0, 1);
            p = Math.round((1 - Math.pow(1 - t, 3)) * 100);
            counter.textContent = p;
            bar.style.setProperty('--p', p + '%');
            if (t < 1) requestAnimationFrame(tick);
            else {
                setTimeout(() => {
                    preloader.classList.add('is-done');
                    body.classList.remove('is-locked');
                    done();
                }, 250);
            }
        };
        requestAnimationFrame(tick);
    }

    /* ------------------------------------------------------------------
       Sayfa geçişi: bulanık arka plan üzerinde logo spinner
       ------------------------------------------------------------------ */
    const loader = $('[data-page-loader]');
    const hideLoader = () => loader && loader.classList.remove('is-active');
    doc.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a || !loader) return;
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const href = a.getAttribute('href') || '';
        if (a.target === '_blank' || a.hasAttribute('download') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        let url;
        try { url = new URL(a.href, location.href); } catch (err) { return; }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.hash) return;
        e.preventDefault();
        closeMenu();
        loader.classList.add('is-active');
        setTimeout(() => { location.href = url.href; }, reduceMotion ? 0 : 280);
    });
    // Geri/ileri ile önbellekten dönülürse spinner'ı kapat
    window.addEventListener('pageshow', hideLoader);

    /* ------------------------------------------------------------------
       İmleç: küçük nokta + takip eden ince halka
       ------------------------------------------------------------------ */
    const cursor = $('.cursor');
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    if (cursor && finePointer && !reduceMotion) {
        body.classList.add('has-cursor');
        const dot = $('.cursor__dot', cursor);
        const ring = $('.cursor__ring', cursor);
        const ringPos = { x: mouse.x, y: mouse.y };
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX; mouse.y = e.clientY;
            dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
        }, { passive: true });
        const loop = () => {
            ringPos.x = lerp(ringPos.x, mouse.x, 0.22);
            ringPos.y = lerp(ringPos.y, mouse.y, 0.22);
            ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
            requestAnimationFrame(loop);
        };
        loop();
        const interactive = 'a, button, label, input, textarea, select, [role="tab"]';
        doc.addEventListener('mouseover', (e) => { if (e.target.closest(interactive)) cursor.classList.add('is-hover'); });
        doc.addEventListener('mouseout', (e) => {
            const target = e.target.closest(interactive);
            if (!target || (e.relatedTarget && target.contains(e.relatedTarget))) return;
            cursor.classList.remove('is-hover');
        });
        doc.addEventListener('mousedown', () => cursor.classList.add('is-down'));
        doc.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
        doc.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
        doc.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
    }

    /* ------------------------------------------------------------------
       Menü
       ------------------------------------------------------------------ */
    const menuToggle = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    const menuLabel = menuToggle ? $('.menu-toggle__label', menuToggle) : null;
    function setMenu(open) {
        if (!menu) return;
        body.classList.toggle('menu-open', open);
        body.classList.toggle('is-locked', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-hidden', String(!open));
        if (menuLabel) menuLabel.textContent = open ? menuLabel.dataset.close : menuLabel.dataset.open;
    }
    function closeMenu() { if (body.classList.contains('menu-open')) setMenu(false); }
    if (menuToggle) {
        menuToggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
        doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        const imgs = $$('[data-menu-img]');
        const showImg = (i) => imgs.forEach((img) => img.classList.toggle('is-active', img.dataset.menuImg === String(i)));
        showImg(0);
        $$('[data-menu-link]').forEach((link) => link.addEventListener('mouseenter', () => showImg(link.dataset.menuLink)));
    }

    /* ------------------------------------------------------------------
       Dönen kelimeler
       ------------------------------------------------------------------ */
    const rotator = $('[data-rotator]');
    if (rotator) {
        const items = $$('em', rotator);
        let idx = 0;
        if (items.length > 1) {
            setInterval(() => {
                const current = items[idx];
                current.classList.remove('is-active');
                current.classList.add('is-leaving');
                setTimeout(() => current.classList.remove('is-leaving'), 800);
                idx = (idx + 1) % items.length;
                items[idx].classList.add('is-active');
            }, 2200);
        }
    }

    /* ------------------------------------------------------------------
       Hero fare derinliği
       ------------------------------------------------------------------ */
    const scene = $('[data-depth-scene]');
    if (scene && finePointer && !reduceMotion) {
        const layers = $$('[data-depth]', scene);
        const target = { x: 0, y: 0 }, pos = { x: 0, y: 0 };
        window.addEventListener('mousemove', (e) => {
            target.x = (e.clientX / innerWidth - 0.5) * 2;
            target.y = (e.clientY / innerHeight - 0.5) * 2;
        }, { passive: true });
        const loop = () => {
            pos.x = lerp(pos.x, target.x, 0.06);
            pos.y = lerp(pos.y, target.y, 0.06);
            layers.forEach((l) => {
                const d = parseFloat(l.dataset.depth) * 120;
                l.style.translate = `${-pos.x * d}px ${-pos.y * d}px`;
            });
            requestAnimationFrame(loop);
        };
        loop();
    }

    /* ------------------------------------------------------------------
       Kaydırma ile çalışan efektler (tek rAF döngüsü)
       ------------------------------------------------------------------ */
    const header = $('[data-header]');
    const progress = $('.scroll-progress');
    const toTopRing = $('[data-to-top-ring]');
    const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
    const marquee = $('[data-marquee] .marquee__track');
    const hscroll = $('[data-hscroll]');
    const hTrack = $('[data-hscroll-track]');
    const hBar = $('[data-hscroll-bar]');
    const readBar = $('[data-read-progress]');
    const article = $('[data-article]');
    const timeline = $('[data-timeline]');
    const timelineFill = $('[data-timeline-fill]');

    let lastY = scrollY, velocity = 0, marqueeX = 0, ticking = false;

    function onScroll() {
        const y = scrollY;
        const vh = innerHeight;
        const max = root.scrollHeight - vh;
        const ratio = max > 0 ? y / max : 0;

        velocity = y - lastY;

        if (header) {
            header.classList.toggle('is-scrolled', y > 40);
            if (!body.classList.contains('menu-open')) header.classList.toggle('is-hidden', velocity > 4 && y > 400);
            if (velocity < -4) header.classList.remove('is-hidden');
        }
        if (progress) progress.style.setProperty('--progress', ratio.toFixed(4));
        if (toTopRing) toTopRing.style.strokeDashoffset = String(126 - 126 * ratio);

        parallaxEls.forEach((el) => {
            const r = el.parentElement.getBoundingClientRect();
            if (r.bottom < -100 || r.top > vh + 100) return;
            const extra = Math.max(0, el.offsetHeight - r.height);
            const p = clamp((r.top + r.height) / (vh + r.height), 0, 1);
            el.style.translate = `0 ${(-(1 - p) * extra).toFixed(1)}px`;
        });

        scrubEls.forEach(({ el, spans }) => {
            const r = el.getBoundingClientRect();
            const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
            const lit = Math.floor(p * spans.length);
            spans.forEach((s, i) => s.classList.toggle('is-lit', i < lit));
        });

        if (hscroll && hTrack && innerWidth > 760) {
            const r = hscroll.getBoundingClientRect();
            const total = hscroll.offsetHeight - vh;
            const p = clamp(-r.top / total, 0, 1);
            const dist = hTrack.scrollWidth - innerWidth;
            hTrack.style.transform = `translate3d(${-p * dist}px, 0, 0)`;
            if (hBar) hBar.style.transform = `scaleX(${p})`;
        }

        if (readBar && article) {
            const r = article.getBoundingClientRect();
            const p = clamp((vh * 0.3 - r.top) / (r.height - vh * 0.5), 0, 1);
            readBar.style.transform = `scaleX(${p})`;
        }

        if (timeline && timelineFill) {
            const r = timeline.getBoundingClientRect();
            timelineFill.style.transform = `scaleY(${clamp((vh * 0.7 - r.top) / r.height, 0, 1)})`;
        }

        lastY = y;
        ticking = false;
    }
    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', onScroll);

    /* Kayan şerit: sürekli akış + kaydırma hızına göre ivme */
    if (marquee && !reduceMotion) {
        let boost = 0;
        const half = () => marquee.scrollWidth / 2;
        const loop = () => {
            boost = lerp(boost, Math.abs(velocity) * 0.6, 0.08);
            velocity *= 0.9;
            marqueeX -= 0.6 + boost;
            if (-marqueeX >= half()) marqueeX += half();
            marquee.style.transform = `translate3d(${marqueeX}px, 0, 0) skewX(${clamp(-boost * 0.4, -10, 0)}deg)`;
            requestAnimationFrame(loop);
        };
        loop();
    }

    /* Yukarı çık */
    const toTop = $('[data-to-top]');
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    /* ------------------------------------------------------------------
       Sayaçlar
       ------------------------------------------------------------------ */
    const countIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            countIO.unobserve(el);
            const end = parseInt(el.dataset.count, 10);
            const original = el.textContent;
            if (!end || reduceMotion) return;
            const suffix = original.replace(/[0-9.,\s]/g, '');
            const startVal = end > 1000 ? end - 40 : 0;
            const t0 = performance.now();
            const step = (now) => {
                const t = clamp((now - t0) / 1600, 0, 1);
                const v = Math.round(startVal + (end - startVal) * (1 - Math.pow(1 - t, 4)));
                el.textContent = v + suffix;
                if (t < 1) requestAnimationFrame(step); else el.textContent = original;
            };
            requestAnimationFrame(step);
        });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => countIO.observe(el));

    /* ------------------------------------------------------------------
       İmleci takip eden hizmet görseli
       ------------------------------------------------------------------ */
    const hoverWrap = $('[data-hover-reveal]');
    if (hoverWrap && finePointer) {
        const reveal = $('.hover-reveal', hoverWrap);
        const img = $('img', reveal);
        const pos = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
        let active = false, rot = 0;
        $$('[data-hover-img]', hoverWrap).forEach((row) => {
            row.addEventListener('mouseenter', () => {
                img.src = row.dataset.hoverImg;
                reveal.classList.add('is-visible');
                active = true;
            });
            row.addEventListener('mouseleave', () => { reveal.classList.remove('is-visible'); active = false; });
        });
        window.addEventListener('mousemove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
        const loop = () => {
            const dx = pos.x - cur.x;
            cur.x = lerp(cur.x, pos.x, 0.12);
            cur.y = lerp(cur.y, pos.y, 0.12);
            rot = lerp(rot, clamp(dx * 0.08, -14, 14), 0.1);
            if (active || reveal.classList.contains('is-visible')) {
                reveal.style.transform = `translate3d(${cur.x - 150}px, ${cur.y - 190}px, 0) rotate(${rot}deg)`;
            }
            requestAnimationFrame(loop);
        };
        loop();
    }

    /* ------------------------------------------------------------------
       Ruh hâli seçici
       ------------------------------------------------------------------ */
    const mood = $('[data-mood]');
    if (mood) {
        const answer = $('[data-mood-answer]', mood);
        const text = $('[data-mood-text]', mood);
        const cta = $('[data-mood-cta]', mood);
        const blob = $('.mood__blob', mood);
        const chips = $$('[data-mood-choice]', mood);
        chips.forEach((chip, i) => {
            chip.addEventListener('click', () => {
                chips.forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
                text.textContent = chip.dataset.text;
                cta.href = waLink(`Merhaba, "${chip.dataset.label}" durumu bana tanıdık geliyor. ${chip.dataset.topic} konusunda görüşmek istiyorum.`);
                answer.hidden = true;
                void answer.offsetWidth;
                answer.hidden = false;
                if (blob) blob.style.transform = `translate(${(i - 2) * -8}%, ${i * 6}%) rotate(${i * 40}deg) scale(${1 + i * 0.05})`;
            });
        });
    }

    /* ------------------------------------------------------------------
       Nefes egzersizi
       ------------------------------------------------------------------ */
    const breathe = $('[data-breathe]');
    if (breathe) {
        const btn = $('[data-breathe-toggle]', breathe);
        const label = $('[data-breathe-label]', breathe);
        const orb = $('[data-breathe-orb]', breathe);
        const phaseEl = $('[data-breathe-phase]', breathe);
        const countEl = $('[data-breathe-count]', breathe);
        const phases = [['Nefes al', 4, 1.55], ['Tut', 4, 1.55], ['Ver', 6, 1]];
        let running = false, timer = null, phase = 0, remaining = 0, cycles = 0;
        const setPhase = () => {
            const [name, secs, scale] = phases[phase];
            phaseEl.textContent = name;
            remaining = secs;
            countEl.textContent = remaining;
            orb.style.setProperty('--t', secs + 's');
            orb.style.setProperty('--s', scale);
        };
        const stop = (finished) => {
            running = false;
            clearInterval(timer);
            breathe.classList.remove('is-running');
            orb.style.setProperty('--t', '1s');
            orb.style.setProperty('--s', 1);
            phaseEl.textContent = finished ? 'Harika 🌿' : 'Hazır';
            countEl.textContent = '';
            label.textContent = finished ? 'Tekrar başlat' : 'Egzersizi başlat';
        };
        btn.addEventListener('click', () => {
            if (running) return stop(false);
            running = true; phase = 0; cycles = 0;
            breathe.classList.add('is-running');
            label.textContent = 'Durdur';
            setPhase();
            timer = setInterval(() => {
                remaining--;
                if (remaining > 0) { countEl.textContent = remaining; return; }
                phase = (phase + 1) % phases.length;
                if (phase === 0 && ++cycles >= 4) return stop(true);
                setPhase();
            }, 1000);
        });
    }

    /* ------------------------------------------------------------------
       Akordeon
       ------------------------------------------------------------------ */
    $$('[data-accordion]').forEach((acc) => {
        $$('.accordion__btn', acc).forEach((btn) => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.accordion__item');
                const open = !item.classList.contains('is-open');
                $$('.accordion__item', acc).forEach((it) => {
                    it.classList.remove('is-open');
                    $('.accordion__btn', it).setAttribute('aria-expanded', 'false');
                });
                item.classList.toggle('is-open', open);
                btn.setAttribute('aria-expanded', String(open));
            });
        });
    });

    /* ------------------------------------------------------------------
       Terapi yaklaşımları: sekmeli içerik
       ------------------------------------------------------------------ */
    $$('[data-approach]').forEach((wrap) => {
        const tabs = $$('[data-approach-tab]', wrap);
        const panels = $$('[data-approach-panel]', wrap);
        const select = (i) => {
            tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
            panels.forEach((p, j) => { p.hidden = i !== j; });
        };
        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => select(i));
            tab.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const next = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                select(next);
                tabs[next].focus();
            });
        });
        select(0);
    });

    /* ------------------------------------------------------------------
       Bağımlılık döngüsü diyagramı
       ------------------------------------------------------------------ */
    const cycle = $('[data-cycle]');
    const cycleNodes = cycle ? $$('[data-cycle-node]', cycle) : [];
    if (cycle && cycleNodes.length) {
        const nodes = cycleNodes;
        const title = $('[data-cycle-title]', cycle);
        const text = $('[data-cycle-text]', cycle);
        const help = $('[data-cycle-help]', cycle);
        const no = $('[data-cycle-no]', cycle);
        let current = 0, timer = null;
        const show = (i) => {
            current = i;
            const n = nodes[i];
            nodes.forEach((x) => x.classList.toggle('is-active', x === n));
            cycle.style.setProperty('--angle', (i * 360 / nodes.length) + 'deg');
            no.textContent = String(i + 1).padStart(2, '0');
            title.textContent = n.dataset.title;
            text.textContent = n.dataset.text;
            help.textContent = n.dataset.help;
        };
        const auto = () => { clearInterval(timer); timer = setInterval(() => show((current + 1) % nodes.length), 4200); };
        nodes.forEach((n, i) => n.addEventListener('click', () => { show(i); auto(); }));
        cycle.addEventListener('mouseenter', () => clearInterval(timer));
        cycle.addEventListener('mouseleave', auto);
        show(0);
        if (!reduceMotion) {
            const cycleIO = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) auto(); else clearInterval(timer); });
            cycleIO.observe(cycle);
        }
    }

    /* ------------------------------------------------------------------
       Uzmanlık alanları: aktif sekme takibi
       ------------------------------------------------------------------ */
    const svcLinks = $$('[data-svc-link]');
    if (svcLinks.length) {
        const svcIO = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.dataset.svcSection;
                svcLinks.forEach((l) => {
                    const on = l.dataset.svcLink === id;
                    l.classList.toggle('is-active', on);
                    if (on) l.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        $$('[data-svc-section]').forEach((s) => svcIO.observe(s));
    }

    /* Belirti kontrol listesi */
    const signs = $('[data-signs]');
    if (signs) {
        const boxes = $$('[data-sign]', signs);
        const fill = $('[data-gauge-fill]', signs);
        const value = $('[data-gauge-value]', signs);
        const msg = $('[data-signs-message]', signs);
        const messages = [
            'Maddeleri işaretledikçe burada kısa bir değerlendirme göreceksiniz.',
            'Bazı işaretler var. Erken fark etmek büyük avantaj; aklınıza takılanları konuşabiliriz.',
            'Birden fazla alanda kontrol kaybına işaret eden durumlar görünüyor. Bir ön görüşme, durumu netleştirmenize yardımcı olabilir.',
            'İşaretlediğiniz maddeler belirgin bir kumar/bahis sorununa işaret ediyor olabilir. Bu yükü tek başınıza taşımak zorunda değilsiniz; destek almak güçlü bir adımdır.',
        ];
        const update = () => {
            const n = boxes.filter((b) => b.checked).length;
            const ratio = n / boxes.length;
            fill.style.strokeDashoffset = String(327 - 327 * ratio);
            fill.style.stroke = ratio > 0.6 ? 'var(--clay)' : 'var(--sun)';
            value.textContent = n;
            msg.textContent = messages[n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3];
        };
        boxes.forEach((b) => b.addEventListener('change', update));
    }

    /* ------------------------------------------------------------------
       Blog: kategori filtresi & canlı arama
       ------------------------------------------------------------------ */
    const blog = $('[data-blog]');
    if (blog) {
        const cards = $$('.post-card, .featured-post', blog);
        const search = $('[data-blog-search]', blog);
        const empty = $('[data-blog-empty]', blog);
        let cat = '*';
        const normalize = (s) => s.toLocaleLowerCase('tr-TR');
        const apply = () => {
            const q = normalize(search ? search.value.trim() : '');
            let shown = 0;
            cards.forEach((card) => {
                const ok = (cat === '*' || card.dataset.category === cat) && (!q || normalize(card.dataset.title || '').includes(q));
                const wasHidden = card.classList.contains('is-filtered');
                card.classList.toggle('is-filtered', !ok);
                if (ok) {
                    shown++;
                    if (wasHidden) { card.classList.remove('is-entering'); void card.offsetWidth; card.classList.add('is-entering'); }
                }
            });
            if (empty) empty.hidden = shown > 0;
        };
        $$('[data-filter]', blog).forEach((btn) => {
            btn.addEventListener('click', () => {
                cat = btn.dataset.filter;
                $$('[data-filter]', blog).forEach((b) => b.classList.toggle('is-active', b === btn));
                apply();
            });
        });
        if (search) search.addEventListener('input', apply);
    }

    /* Blog yazısı: içindekiler & bağlantı kopyalama */
    if (article) {
        const toc = $('[data-toc]');
        const list = $('[data-toc-list]');
        const heads = $$('h2, h3', article);
        if (toc && heads.length > 1) {
            heads.forEach((h, i) => {
                h.id = h.id || 'baslik-' + (i + 1);
                const li = doc.createElement('li');
                const a = doc.createElement('a');
                a.href = '#' + h.id;
                a.textContent = h.textContent;
                li.appendChild(a);
                list.appendChild(li);
            });
            toc.hidden = false;
            const links = $$('a', list);
            const tocIO = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) links.forEach((l) => l.classList.toggle('is-active', l.hash === '#' + entry.target.id));
                });
            }, { rootMargin: '0px 0px -70% 0px' });
            heads.forEach((h) => tocIO.observe(h));
        }
    }
    $$('[data-copy-link]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(btn.dataset.copyLink); } catch (e) { return; }
            btn.classList.add('is-copied');
            btn.textContent = '✓';
            setTimeout(() => { btn.classList.remove('is-copied'); btn.textContent = '⧉'; }, 1800);
        });
    });

    /* ------------------------------------------------------------------
       WhatsApp: yüzen balon
       ------------------------------------------------------------------ */
    const waFloat = $('[data-wa-float]');
    if (waFloat && !store.get('wa-bubble-closed')) {
        setTimeout(() => waFloat.classList.add('is-bubble'), 6000);
        const close = $('[data-wa-bubble-close]', waFloat);
        close.addEventListener('click', () => {
            waFloat.classList.remove('is-bubble');
            store.set('wa-bubble-closed', '1');
        });
    }

    /* WhatsApp: footer randevu oluşturucu */
    const appointment = $('[data-appointment-form]');
    if (appointment) {
        const daysWrap = $('[data-days]', appointment);
        const preview = $('[data-appointment-preview]', appointment);
        const fmtDay = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
        const fmtDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
        const fmtFull = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
        const d = new Date();
        let added = 0;
        while (added < 7) {
            d.setDate(d.getDate() + 1);
            if (d.getDay() === 0) continue; // Pazar hariç
            const label = doc.createElement('label');
            label.className = 'chip chip--day';
            const input = doc.createElement('input');
            input.type = 'radio'; input.name = 'day'; input.value = fmtFull.format(d);
            const span = doc.createElement('span');
            const small = doc.createElement('small');
            small.textContent = fmtDay.format(d);
            span.appendChild(small);
            span.appendChild(doc.createTextNode(fmtDate.format(d)));
            label.appendChild(input); label.appendChild(span);
            daysWrap.appendChild(label);
            added++;
        }
        const compose = () => {
            const f = new FormData(appointment);
            const name = String(f.get('name') || '').trim().slice(0, 60);
            const parts = ['Merhaba' + (name ? ', ben ' + name : '') + '.', 'Randevu almak istiyorum.'];
            if (f.get('topic')) parts.push('Konu: ' + f.get('topic') + '.');
            if (f.get('day')) parts.push('Tercih ettiğim gün: ' + f.get('day') + '.');
            if (f.get('slot')) parts.push('Zaman dilimi: ' + f.get('slot') + '.');
            if (f.get('type')) parts.push('Görüşme şekli: ' + f.get('type') + '.');
            return parts.join(' ');
        };
        appointment.addEventListener('change', () => { preview.classList.remove('is-error'); preview.textContent = '“' + compose() + '”'; });
        appointment.addEventListener('input', () => { preview.textContent = '“' + compose() + '”'; });
        appointment.addEventListener('submit', (e) => {
            e.preventDefault();
            const f = new FormData(appointment);
            if (!f.get('day') || !f.get('slot')) {
                preview.classList.add('is-error');
                preview.textContent = 'Lütfen bir gün ve zaman dilimi seçin.';
                return;
            }
            openWhatsApp(compose());
        });
    }

    /* WhatsApp: iletişim formu */
    const contactForm = $('[data-contact-form]');
    if (contactForm) {
        const err = $('[data-form-error]', contactForm);
        const ta = $('textarea', contactForm);
        const counter = $('[data-char-count]', contactForm);
        ta.addEventListener('input', () => {
            counter.textContent = ta.value.length;
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
        });
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const f = new FormData(contactForm);
            const name = String(f.get('name') || '').trim();
            const message = String(f.get('message') || '').trim();
            const problems = [];
            if (name.length < 2) problems.push('adınızı');
            if (message.length < 5) problems.push('mesajınızı');
            if (!f.get('consent')) problems.push('onay kutusunu');
            if (problems.length) {
                err.textContent = 'Lütfen ' + problems.join(', ') + ' kontrol edin.';
                err.hidden = false;
                contactForm.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 350 });
                return;
            }
            err.hidden = true;
            const lines = ['Merhaba, ben ' + name.slice(0, 60) + '.'];
            if (f.get('topic')) lines.push('Konu: ' + f.get('topic'));
            if (String(f.get('phone') || '').trim()) lines.push('Telefon: ' + String(f.get('phone')).trim().slice(0, 20));
            lines.push('', message.slice(0, 800));
            openWhatsApp(lines.join('\n'));
        });
    }

    /* ------------------------------------------------------------------
       Video: tıklayınca yüklenen YouTube/Vimeo oynatıcı
       ------------------------------------------------------------------ */
    const allowedFrames = ['https://www.youtube-nocookie.com/embed/', 'https://player.vimeo.com/video/'];
    $$('[data-video-embed]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const src = btn.dataset.videoEmbed || '';
            if (!allowedFrames.some((p) => src.startsWith(p))) return;
            const frame = doc.createElement('iframe');
            frame.src = src;
            frame.title = btn.dataset.videoTitle || 'Video';
            frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            frame.allowFullscreen = true;
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            frame.className = 'video-player__frame';
            btn.replaceWith(frame);
        });
    });

    /* ------------------------------------------------------------------
       Başlat
       ------------------------------------------------------------------ */
    root.classList.remove('no-js');
    onScroll();
    runPreloader(startReveals);
})();

/* Demo: paylaşım bağlantılarını sayfanın gerçek adresiyle doldur */
(function () {
    var url = location.href.split('#')[0];
    document.querySelectorAll('a[href*="__SAYFA_ADRESI__"]').forEach(function (a) {
        a.href = a.getAttribute('href').split('__SAYFA_ADRESI__').join(encodeURIComponent(url));
    });
    document.querySelectorAll('[data-copy-link="__SAYFA_ADRESI__"]').forEach(function (b) { b.setAttribute('data-copy-link', url); });
})();

/* Demo: video oynatıcı — gerçek sürümde YouTube/Vimeo videosu ya da yüklenen dosya oynatılır */
(function () {
    document.querySelectorAll('[data-video-embed="demo"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.querySelector('.video-demo-note')) return;
            var note = document.createElement('span');
            note.className = 'video-demo-note';
            note.innerHTML = '<strong>Demo video</strong><span>Tam sürümde panelden eklediğiniz YouTube/Vimeo videosu ya da yüklediğiniz video burada oynatılır.</span>';
            btn.appendChild(note);
        });
    });
})();
