/* Сайт клієнта (спільна база clients): вміст з адмінки, товари магазину, онлайн-заявка. Налаштування — window.CMS */
(function () {
  var C = window.CMS || {};
  if (!C.url || !C.key || !C.shop) return;
  var SH = encodeURIComponent(C.shop);
  var H = { apikey: C.key, Authorization: 'Bearer ' + C.key };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $$(s) { return [].slice.call(document.querySelectorAll(s)); }

  // ---------- вміст ----------
  fetch(C.url + '/rest/v1/content?shop=eq.' + SH + '&select=data', { headers: H }).then(function (r) { return r.json(); }).then(function (rows) {
    var d = rows && rows[0] && rows[0].data; if (!d || !Object.keys(d).length) return;

    if (d.notice) {
      var n = document.createElement('div'); n.className = 'cms-notice'; n.textContent = d.notice;
      document.body.insertBefore(n, document.body.firstChild); document.documentElement.classList.add('has-notice');
    }
    if (d.phone) {
      var digits = d.phone.replace(/\D/g, '').replace(/^380/, '0'), tel = 'tel:+38' + digits, old = C.phone;
      $$('a[href^="tel:"]').forEach(function (a) { a.href = tel; });
      if (old) $$('a[href^="tel:"] span, a[href^="tel:"], .phone').forEach(function (el) {
        if (el.children.length === 0 && el.textContent.trim() === old) el.textContent = d.phone;
      });
    }
    if (d.hours && d.hours.length) {
      var ul = document.querySelector('.hrs');
      if (ul) {
        ul.innerHTML = d.hours.map(function (h) { return '<li data-d="' + esc(h[0]) + '"><span>' + esc(h[1]) + '</span><b>' + esc(h[2]) + '</b></li>'; }).join('');
        try {
          var k = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv' })), w = String((k.getDay() + 6) % 7), mins = k.getHours() * 60 + k.getMinutes(), open = false;
          ul.querySelectorAll('li').forEach(function (l, i) {
            var on = l.dataset.d.split(',').indexOf(w) > -1; if (on) l.classList.add('today');
            if (/вихідн/i.test(l.textContent)) l.classList.add('off');
            var m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(d.hours[i][2]);
            if (on && m) { var a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4]; open = mins >= a && mins < b; }
          });
          var st = document.getElementById('st'), dot = document.getElementById('dot');
          if (st) st.textContent = d.hours.filter(function (h) { return !/вихідн/i.test(h[2]); }).map(function (h) { return h[1].replace(/\s*–\s*/, '–') + ' ' + h[2].replace(/\s*–\s*/, '–'); }).join(' · ');
          if (dot) dot.classList.toggle('off', !open);
        } catch (e) {}
      }
    }
    if (d.services) {
      $$('.bento .card').forEach(function (card, i) {
        var s = d.services[i]; if (!s) return;
        var h3 = card.querySelector('h3'), p = card.querySelector('p'), img = card.querySelector('img');
        if (h3 && s.t) h3.textContent = s.t; if (p && s.p != null) p.textContent = s.p; if (img && s.t) img.alt = s.t;
        var pr = card.querySelector('.cms-pr');
        if (s.price) { if (!pr) { pr = document.createElement('b'); pr.className = 'cms-pr'; (card.querySelector('.core') || card).prepend(pr); } pr.textContent = s.price; }
        else if (pr) pr.remove();
      });
      var sel = document.getElementById('bk-s');
      if (sel) sel.innerHTML = '<option value="">Оберіть послугу</option>' + d.services.map(function (s) { return '<option>' + esc(s.t) + '</option>'; }).join('') + '<option>Купити товар</option><option>Інше</option>';
    }
    if (d.price_note && C.priceNote) $$('p').forEach(function (p) { if (p.textContent.trim() === C.priceNote) p.textContent = d.price_note; });
    if (d.gallery && d.gallery.length) {
      var gal = document.querySelector('.gal');
      if (gal) gal.innerHTML = d.gallery.map(function (g) { return '<figure><img src="' + esc(g[0]) + '" alt="' + esc(g[1] || C.brand || '') + '" loading="lazy" decoding="async"></figure>'; }).join('');
    }
  }).catch(function () {});

  // ---------- товари магазину ----------
  var CAT = { iphone: 'iPhone', glass: 'Скло й чохли', cables: 'Кабелі й зарядки', gadgets: 'Гаджети' };
  function money(n) { return Number(n).toLocaleString('uk-UA') + ' грн'; }
  var grid = document.getElementById('shopg');
  if (grid) fetch(C.url + '/rest/v1/products?select=*&shop=eq.' + SH + '&visible=eq.true&order=in_stock.desc,sort,created_at.desc', { headers: H })
    .then(function (r) { return r.json(); }).then(function (P) {
      if (!Array.isArray(P) || !P.length) return;
      grid.innerHTML = P.map(function (p) {
        var meta = [p.memory, p.condition === 'used' ? 'б/в' : 'новий', CAT[p.category]].filter(Boolean).join(' · ');
        return '<article class="shop-c bz' + (p.in_stock ? '' : ' sold') + '"><div class="core">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.title) + '" loading="lazy">' : '') +
          '<div class="shop-b"><h3>' + esc(p.title) + '</h3><p>' + esc(meta) + (p.note ? '<br>' + esc(p.note) : '') + '</p>' +
          '<div class="shop-pr">' + (p.price != null ? money(p.price) : 'Ціна за запитом') + (p.in_stock ? '' : ' · продано') + '</div>' +
          '<div class="shop-a"><button type="button" class="shop-btn" data-buy="' + esc(p.title + (p.memory ? ', ' + p.memory : '')) + '">Замовити</button><a class="shop-ln" href="tel:' + esc((document.querySelector('a[href^="tel:"]') || {}).getAttribute ? document.querySelector('a[href^="tel:"]').getAttribute('href').slice(4) : '') + '">Подзвонити</a></div></div></div></article>';
      }).join('');
    }).catch(function () {});
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-buy]'); if (!b) return;
    var f = document.getElementById('bk'); if (!f) return; e.preventDefault();
    var s = f.querySelector('#bk-s'); if (s) s.value = 'Купити товар';
    f.comment.value = 'Хочу купити: ' + b.dataset.buy;
    document.getElementById('book').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { f.name.focus(); }, 600);
  });

  // ---------- онлайн-запис ----------
  var anchor = document.getElementById('photos') || document.getElementById('reviews') || document.getElementById('contacts');
  if (!anchor) return;
  var sv = (C.services || []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
  var today = new Date().toISOString().slice(0, 10);
  var sec = document.createElement('section'); sec.className = 's bk'; sec.id = 'book';
  sec.innerHTML = '<div class="wrap"><div class="bk-in">' +
    '<div class="bk-t"><span class="tag">Заявка</span><h2>Ремонт чи товар — <em>за хвилину</em></h2><p class="lead">Залиште заявку — передзвонимо, скажемо ціну й відкладемо товар для вас. Без передоплати.</p></div>' +
    '<form id="bk" novalidate>' +
      '<div class="bk-r"><label>Ім’я<input name="name" required maxlength="80" autocomplete="name"></label><label>Телефон<input name="phone" required inputmode="tel" maxlength="25" autocomplete="tel" placeholder="0__ ___ __ __"></label></div>' +
      '<div class="bk-r"><label>Пристрій<input name="device" maxlength="80" placeholder="Напр. iPhone 13, Samsung A54"></label><label>Послуга<select name="service" id="bk-s"><option value="">Оберіть послугу</option>' + sv + '<option>Купити товар</option><option>Інше</option></select></label></div>' +
      '<div class="bk-r"><label>Зручна дата<input name="wish_date" type="date" min="' + today + '"></label><label>Коментар<input name="comment" maxlength="500" placeholder="Що сталося або що хочете купити"></label></div>' +
      '<input name="website" tabindex="-1" autocomplete="off" class="bk-hp" aria-hidden="true">' +
      '<button class="b acc" type="submit"><span>Надіслати заявку</span></button><p class="bk-m" role="status"></p>' +
    '</form></div></div>';
  anchor.parentNode.insertBefore(sec, anchor);
  var f = sec.querySelector('form'), msg = sec.querySelector('.bk-m');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var o = {}; new FormData(f).forEach(function (v, k) { o[k] = String(v).trim(); });
    if (o.website) return; delete o.website;
    if (!o.name) { msg.textContent = 'Вкажіть, будь ласка, ім’я'; f.name.focus(); return; }
    if (o.phone.replace(/\D/g, '').length < 10) { msg.textContent = 'Перевірте номер телефону'; f.phone.focus(); return; }
    Object.keys(o).forEach(function (k) { if (o[k] === '') o[k] = null; }); o.shop = C.shop;
    var b = f.querySelector('button'); b.disabled = true; msg.textContent = 'Надсилаємо…';
    fetch(C.url + '/rest/v1/requests', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, H), body: JSON.stringify(o) })
      .then(function (r) {
        if (!r.ok) throw r;
        f.innerHTML = '<div class="bk-ok"><b>Дякуємо, заявку отримали!</b><span>Передзвонимо найближчим часом у робочі години.</span></div>';
      })
      .catch(function () { b.disabled = false; msg.innerHTML = 'Не вдалося надіслати. Зателефонуйте нам: <a href="' + (document.querySelector('a[href^="tel:"]') || {}).href + '">' + esc(C.phone || '') + '</a>'; });
  });
})();
