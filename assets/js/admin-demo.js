/*!
 * Panel demosu: formlar sunucuya gönderilmez, değişiklikler kaydedilmez.
 */
(function () {
    'use strict';

    // Demo uyarı şeridi
    var bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML = '<strong>DEMO</strong><span>Bu yönetim panelinin tanıtım sürümüdür. Ekranlar gezilebilir; yapılan değişiklikler kaydedilmez.</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-demo-bar');

    function toast(text) {
        var old = document.querySelector('.demo-toast');
        if (old) old.remove();
        var t = document.createElement('div');
        t.className = 'toast demo-toast';
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
        if (/sifremi-unuttum\.html$/.test(action)) { toast('Demo: gerçek sürümde e-posta adresinize sıfırlama bağlantısı gönderilir.'); return; }
        if (/sifre-sifirla\.html$/.test(action)) { location.href = up + 'giris.html'; return; }
        if (form.hasAttribute('data-confirm') && !window.confirm(form.getAttribute('data-confirm'))) return;
        toast('Demo sürümü: değişiklikler kaydedilmez.');
    }, true);
})();
