/*!
 * Statik panel: formlar sunucuya gönderilmez.
 */
(function () {
    'use strict';

    function toast(text) {
        var old = document.querySelector('.static-toast');
        if (old) old.remove();
        var t = document.createElement('div');
        t.className = 'toast static-toast';
        t.setAttribute('role', 'status');
        t.textContent = text;
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('is-hiding'); setTimeout(function () { t.remove(); }, 600); }, 3200);
    }

    // Bu sayfadan panel köküne göreli yol (ör. "../" veya "../../")
    var here = location.pathname.split('/');
    var idx = here.lastIndexOf('yonetim');
    var up = idx >= 0 ? '../'.repeat(Math.max(0, here.length - idx - 2)) : '';

    document.addEventListener('submit', function (e) {
        var form = e.target;
        var action = form.getAttribute('action') || '';
        e.preventDefault();
        e.stopImmediatePropagation();

        if (/\/giris\.html$/.test(action)) { location.href = up + (document.querySelector('.login__form h1') && /adım/.test(document.querySelector('.login__form h1').textContent) ? 'index.html' : 'dogrulama.html'); return; }
        if (/\/dogrulama\.html$/.test(action)) { location.href = up + 'index.html'; return; }
        if (/\/cikis\.html$/.test(action)) { location.href = up + 'giris.html'; return; }
        if (/sifremi-unuttum\.html$/.test(action)) { toast('E-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.'); return; }
        if (/sifre-sifirla\.html$/.test(action)) { location.href = up + 'giris.html'; return; }
        if (form.hasAttribute('data-confirm') && !window.confirm(form.getAttribute('data-confirm'))) return;
        toast('Değişiklikler kaydedildi.');
    }, true);
})();
