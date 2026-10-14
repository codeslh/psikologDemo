/*!
 * Yönetim paneli etkileşimleri. Kullanıcı girdileri DOM'a yalnızca textContent ile yazılır.
 */
(function () {
    'use strict';

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* Mobil kenar menü */
    const side = $('[data-side]');
    const sideToggle = $('[data-side-toggle]');
    if (side && sideToggle) {
        sideToggle.addEventListener('click', (e) => { e.stopPropagation(); side.classList.toggle('is-open'); });
        document.addEventListener('click', (e) => { if (!side.contains(e.target)) side.classList.remove('is-open'); });
    }

    /* Kırık görsel yedeği (ör. harici görsel erişilemezse) */
    // Yedek görsel, bu betiğin konumuna göre çözülür (alt klasörde yayınlanan sitelerde de çalışır)
    const self = document.querySelector('script[src*="assets/js/admin.js"]');
    const placeholder = self ? new URL('../img/placeholder.svg', self.src).href : '/assets/img/placeholder.svg';
    const fixImg = (img) => { if (img.getAttribute('src') && !img.src.endsWith(placeholder)) img.src = placeholder; };
    document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') fixImg(e.target); }, true);
    $$('img').forEach((img) => { if (img.complete && img.naturalWidth === 0) fixImg(img); });

    /* Bildirim */
    const toast = $('[data-toast]');
    if (toast) setTimeout(() => { toast.classList.add('is-hiding'); setTimeout(() => toast.remove(), 600); }, 4200);

    /* Silme onayı */
    $$('form[data-confirm]').forEach((form) => {
        form.addEventListener('submit', (e) => {
            if (!window.confirm(form.dataset.confirm)) e.preventDefault();
        });
    });

    /* Aç/kapa (ör. bölüm öğesi düzenleme formu) */
    $$('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = $(btn.dataset.toggle);
            if (!target) return;
            target.hidden = !target.hidden;
            $$(`[data-toggle="${btn.dataset.toggle}"]`).forEach((b) => b.setAttribute('aria-expanded', String(!target.hidden)));
            if (!target.hidden) {
                const first = $('input[type="text"], textarea', target);
                if (first) first.focus();
                $$('textarea[data-autogrow]', target).forEach((ta) => ta.dispatchEvent(new Event('input')));
            }
        });
    });

    /* Filtre seçimi değişince gönder */
    $$('[data-autosubmit]').forEach((el) => el.addEventListener('change', () => el.form.submit()));

    /* Şifre göster/gizle */
    $$('[data-pw-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.setAttribute('aria-label', show ? 'Şifreyi gizle' : 'Şifreyi göster');
        });
    });

    /* Caps Lock uyarısı */
    const caps = $('[data-caps]');
    if (caps) {
        document.addEventListener('keyup', (e) => {
            if (typeof e.getModifierState === 'function') caps.hidden = !e.getModifierState('CapsLock');
        });
    }
    const shake = $('[data-shake]');
    if (shake) shake.classList.add('is-shake');

    /* İki adımlı doğrulama: kod alanı, kurtarma kodu geçişi */
    const otpForm = $('[data-otp-form]');
    if (otpForm) {
        const switchBtn = $('[data-otp-switch]', otpForm);
        const modes = $$('[data-otp-mode]', otpForm);
        const labels = { code: 'Telefonuma erişemiyorum, kurtarma kodu kullan', recovery: 'Uygulamadaki kodu kullan' };
        const update = () => {
            const recovery = !$('[data-otp-mode="recovery"]', otpForm).hidden;
            switchBtn.textContent = recovery ? labels.recovery : labels.code;
        };
        switchBtn.addEventListener('click', () => {
            modes.forEach((m) => {
                m.hidden = !m.hidden;
                // Gizlenen alanın değeri gönderilmesin
                $$('input', m).forEach((i) => { i.disabled = m.hidden; if (!m.hidden) i.focus(); });
            });
            update();
        });
        modes.forEach((m) => $$('input', m).forEach((i) => { i.disabled = m.hidden; }));
        update();
    }
    $$('[data-otp-input]').forEach((input) => {
        input.addEventListener('input', () => {
            const digits = input.value.replace(/\D/g, '').slice(0, 6);
            input.value = digits;
            if (digits.length === 6 && input.form && !('noAutosubmit' in input.form.dataset)) input.form.requestSubmit();
        });
    });

    /* Kurtarma kodları: kopyala / indir */
    $$('[data-codes]').forEach((box) => {
        const text = () => $$('code', box).map((c) => c.textContent).join('\n');
        const copy = $('[data-codes-copy]', box);
        const download = $('[data-codes-download]', box);
        if (copy) copy.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(text()); copy.textContent = 'Kopyalandı ✓'; } catch (e) { /* yok say */ }
        });
        if (download) download.addEventListener('click', () => {
            const blob = new Blob(['Yönetim paneli kurtarma kodları\n\n' + text() + '\n'], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'kurtarma-kodlari.txt';
            a.click();
            URL.revokeObjectURL(a.href);
        });
    });

    /* Karakter sayaçları */
    $$('[data-counter]').forEach((input) => {
        const max = parseInt(input.dataset.counter, 10);
        const counter = document.createElement('span');
        counter.className = 'counter';
        input.insertAdjacentElement('afterend', counter);
        const update = () => {
            counter.textContent = input.value.length + ' / ' + max;
            counter.classList.toggle('is-warn', input.value.length > max * 0.9);
        };
        input.addEventListener('input', update);
        update();
    });

    /* Otomatik yükseklik */
    $$('textarea[data-autogrow]').forEach((ta) => {
        const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
        ta.addEventListener('input', fit);
        fit();
    });

    /* Görsel önizleme & sürükle-bırak */
    $$('[data-dropzone]').forEach((zone) => {
        const input = $('[data-preview-input]', zone);
        const img = $('[data-preview]', zone);
        ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.add('is-over')));
        ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove('is-over')));
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
                alert('Yalnızca JPG, PNG veya WEBP görseller yüklenebilir.');
                input.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Görsel en fazla 5 MB olabilir.');
                input.value = '';
                return;
            }
            img.src = URL.createObjectURL(file);
            img.hidden = false;
        });
    });

    /* Türkçe karakter dostu slug */
    const slugify = (text) => text
        .toLocaleLowerCase('tr-TR')
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);

    const titleInput = $('[data-title-input]');
    const slugInput = $('[data-slug-input]');
    if (titleInput && slugInput) {
        let manual = slugInput.value !== '';
        slugInput.addEventListener('input', () => {
            manual = slugInput.value !== '';
            slugInput.value = slugify(slugInput.value.replace(/-$/, ' ')) + (slugInput.value.endsWith('-') ? '-' : '');
        });
        titleInput.addEventListener('input', () => { if (!manual) slugInput.value = slugify(titleInput.value); updateSerp(); });
    }

    /* SERP önizleme */
    function updateSerp() {
        $$('.card, .tabs__panel').forEach((scope) => {
            const t = $('[data-serp-title-input]', scope);
            const d = $('[data-serp-desc-input]', scope);
            const st = $('[data-serp-title]', scope);
            const sd = $('[data-serp-desc]', scope);
            if (t && st) st.textContent = t.value || (titleInput ? titleInput.value : '') || 'Sayfa başlığı';
            if (d && sd) sd.textContent = d.value || 'Meta açıklama burada görünür.';
        });
        const su = $('[data-serp-url]');
        if (su && slugInput) su.textContent = su.textContent.replace(/[^/]*$/, slugInput.value || 'yazi-baglantisi');
    }
    $$('[data-serp-title-input], [data-serp-desc-input], [data-slug-input]').forEach((el) => el.addEventListener('input', updateSerp));

    /* Anahtar kelime etiketleri */
    $$('[data-tags-input]').forEach((input) => {
        const box = input.parentElement.querySelector('[data-tags]');
        const render = () => {
            box.textContent = '';
            input.value.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
                const s = document.createElement('span');
                s.textContent = t;
                box.appendChild(s);
            });
        };
        input.addEventListener('input', render);
        render();
    });

    /* Sekmeler */
    $$('[data-tabs]').forEach((tabs) => {
        const buttons = $$('[data-tab]', tabs);
        buttons.forEach((btn) => btn.addEventListener('click', () => {
            buttons.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
            $$('[data-panel]', tabs).forEach((p) => { p.hidden = p.dataset.panel !== btn.dataset.tab; });
        }));
        // Hata olan sekmeyi aç
        const invalid = $$('[data-panel]', tabs).find((p) => $('.is-invalid', p));
        if (invalid) $(`[data-tab="${invalid.dataset.panel}"]`, tabs).click();
    });

    /* Şifre gücü */
    const pwNew = $('[data-pw-new]');
    if (pwNew) {
        const bar = $('[data-strength-bar]');
        const confirmInput = $('[data-pw-confirm]');
        const match = $('[data-pw-match]');
        const rules = {
            len: (v) => v.length >= 10,
            lower: (v) => /\p{Ll}/u.test(v),
            upper: (v) => /\p{Lu}/u.test(v),
            num: (v) => /\d/.test(v),
            sym: (v) => /[^\p{L}\d]/u.test(v),
        };
        const check = () => {
            const v = pwNew.value;
            let score = 0;
            Object.entries(rules).forEach(([k, fn]) => {
                const ok = fn(v);
                if (ok) score++;
                $(`[data-rule="${k}"]`).classList.toggle('is-ok', ok);
            });
            bar.style.width = (score / 5) * 100 + '%';
            bar.style.background = score <= 2 ? 'var(--danger)' : score <= 4 ? 'var(--sun)' : 'var(--ok)';
            if (confirmInput.value) {
                const same = confirmInput.value === v;
                match.textContent = same ? 'Şifreler eşleşiyor' : 'Şifreler eşleşmiyor';
                match.className = 'hint ' + (same ? 'is-ok' : 'is-bad');
            } else match.textContent = '';
        };
        pwNew.addEventListener('input', check);
        confirmInput.addEventListener('input', check);
    }

    /* Zengin metin editörü (Quill) */
    window.addEventListener('load', () => {
        const holder = $('[data-editor]');
        const source = $('[data-editor-source]');
        if (!holder || !source || typeof window.Quill === 'undefined') {
            if (source) source.hidden = false;
            return;
        }
        const quill = new window.Quill(holder, {
            theme: 'snow',
            placeholder: 'Yazınızı buraya yazın…',
            modules: {
                toolbar: [
                    [{ header: [2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', { list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'clean'],
                ],
            },
        });
        if (source.value.trim()) {
            quill.setContents(quill.clipboard.convert({ html: source.value }), 'silent');
        }
        const sync = () => {
            const html = quill.getLength() > 1 ? quill.getSemanticHTML().replace(/&nbsp;/g, ' ') : '';
            source.value = html;
        };
        quill.on('text-change', sync);
        source.form.addEventListener('submit', (e) => {
            sync();
            if (!source.value.trim()) {
                e.preventDefault();
                alert('İçerik boş olamaz.');
                quill.focus();
            }
        });
    });
})();
