/* 長頁面閱讀強化：章節收合、頁內搜尋、進度條、章節選單、目錄高亮、回到頂部
   漸進增強：沒有 JavaScript 時所有內容照常完整顯示。 */
(function () {
  'use strict';
  var main = document.querySelector('main.content');
  if (!main) return;

  var KEY = 'reader:' + location.pathname;
  var nav = document.querySelector('.topnav');

  /* ---------- 1. 找出可收合的章節 ---------- */
  var items = [];
  Array.prototype.forEach.call(main.querySelectorAll('section'), function (sec) {
    if (sec.classList.contains('howto')) return;      // 導讀不收合
    var h = null, host = sec;
    for (var i = 0; i < sec.children.length; i++) {
      if (sec.children[i].tagName === 'H2') { h = sec.children[i]; break; }
    }
    if (!h) {                                          // 標題放在前面的 .parthead 裡
      var prev = sec.previousElementSibling;
      if (prev && prev.classList.contains('parthead')) { h = prev.querySelector('h2'); host = prev; }
    }
    if (!h) return;
    items.push({ sec: sec, h: h, host: host, id: sec.id || h.id || ('sec' + items.length) });
  });
  var hasSections = items.length >= 3;                 // 章節太少就不做收合

  if (hasSections) items.forEach(function (it) {
    if (!it.sec.id) it.sec.id = it.id;
    var body = document.createElement('div');
    body.className = 'secbody';
    var start = (it.host === it.sec) ? Array.prototype.indexOf.call(it.sec.children, it.h) + 1 : 0;
    var moving = Array.prototype.slice.call(it.sec.children, start);
    moving.forEach(function (n) { body.appendChild(n); });
    it.sec.appendChild(body);
    it.body = body;
    it.orig = body.innerHTML;

    it.h.classList.add('sech');
    it.h.setAttribute('role', 'button');
    it.h.setAttribute('tabindex', '0');
    var cnt = document.createElement('span');
    cnt.className = 'seccount';
    it.count = cnt;
    it.h.appendChild(cnt);
    var chev = document.createElement('span');
    chev.className = 'chev';
    chev.setAttribute('aria-hidden', 'true');
    it.h.appendChild(chev);

    it.h.addEventListener('click', function () { toggle(it); });
    it.h.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(it); }
    });
  });

  function setOpen(it, on) {
    it.open = !!on;
    it.sec.classList.toggle('collapsed', !on);
    it.host.classList.toggle('collapsed', !on);
    it.h.setAttribute('aria-expanded', on ? 'true' : 'false');
    var n = it.body.querySelectorAll('h3').length;
    it.count.textContent = on ? '' : (n ? '　' + n + ' 個重點' : '');
  }
  function toggle(it) { setOpen(it, !it.open); save(); }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items.filter(function (i) { return i.open; })
        .map(function (i) { return i.sec.id; })));
    } catch (e) {}
  }

  /* 初始狀態：沿用上次展開的章節，否則只開第一節 */
  var initial = null;
  try { initial = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (hasSections) items.forEach(function (it, i) {
    setOpen(it, initial ? initial.indexOf(it.sec.id) >= 0 : i === 0);
  });

  /* ---------- 2. 工具列：搜尋、全部展開／收合、章節選單 ---------- */
  var bar, sel, allBtn, input, clearBtn, hit, timer;
  if (hasSections) buildBar();
  function buildBar(){
  bar = document.createElement('div');
  bar.className = 'readerbar';
  bar.innerHTML =
    '<select class="rsec" aria-label="跳到章節"></select>' +
    '<div class="rsearch"><input type="search" placeholder="在本頁搜尋，例如：15 日" aria-label="在本頁搜尋">' +
    '<button class="rclear" type="button" aria-label="清除搜尋" hidden>✕</button></div>' +
    '<button class="rall" type="button">全部展開</button>' +
    '<span class="rhit" role="status"></span>';
  items[0].host.parentNode.insertBefore(bar, items[0].host);   // 放在導讀之後、第一個章節之前

  sel = bar.querySelector('.rsec');
  sel.innerHTML = '<option value="">跳到章節…</option>' + items.map(function (it) {
    return '<option value="' + it.sec.id + '">' + it.h.textContent.replace(/\s+/g, ' ').trim() + '</option>';
  }).join('');
  sel.addEventListener('change', function () {
    var it = byId(sel.value); if (!it) return;
    setOpen(it, true); save();
    it.host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sel.value = '';
  });

  allBtn = bar.querySelector('.rall');
  allBtn.addEventListener('click', function () {
    var openAll = items.some(function (i) { return !i.open; });
    items.forEach(function (i) { setOpen(i, openAll); });
    allBtn.textContent = openAll ? '全部收合' : '全部展開';
    save();
  });

  function byId(id) {
    for (var i = 0; i < items.length; i++) if (items[i].sec.id === id) return items[i];
    return null;
  }

  /* ---------- 3. 頁內搜尋（補回 Ctrl+F，收合中的章節也找得到） ---------- */
  input = bar.querySelector('input');
  clearBtn = bar.querySelector('.rclear');
  hit = bar.querySelector('.rhit');

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function restore() {
    items.forEach(function (it) { if (it.dirty) { it.body.innerHTML = it.orig; it.dirty = false; } });
  }

  function highlight(node, re) {
    var n = 0, walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null), texts = [], t;
    while ((t = walker.nextNode())) {
      if (t.parentNode && /^(SCRIPT|STYLE|MARK)$/.test(t.parentNode.tagName)) continue;
      if (re.test(t.nodeValue)) texts.push(t);
      re.lastIndex = 0;
    }
    texts.forEach(function (tn) {
      var frag = document.createDocumentFragment(), s = tn.nodeValue, last = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(s))) {
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        var mk = document.createElement('mark');
        mk.className = 'hit';
        mk.textContent = m[0];
        frag.appendChild(mk);
        last = m.index + m[0].length;
        n++;
        if (m[0].length === 0) re.lastIndex++;
      }
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });
    return n;
  }

  function search() {
    var q = input.value.trim();
    restore();
    clearBtn.hidden = !q;
    if (!q) {
      hit.textContent = '';
      items.forEach(function (it) { it.host.classList.remove('nomatch'); });
      return;
    }
    var re = new RegExp(esc(q), 'gi');
    var total = 0, secs = 0, first = null;
    items.forEach(function (it) {
      var inHead = re.test(it.h.textContent); re.lastIndex = 0;
      var n = highlight(it.body, re);
      if (n) it.dirty = true;
      var found = n > 0 || inHead;
      if (found) { total += n; secs++; if (!first) first = it; }
      it.host.classList.toggle('nomatch', !found);
      setOpen(it, found);
    });
    hit.textContent = total || secs
      ? '找到 ' + total + ' 處，分布在 ' + secs + ' 個章節'
      : '本頁找不到「' + q + '」';
    if (first) first.host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 250); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { input.value = ''; search(); } });
  clearBtn.addEventListener('click', function () { input.value = ''; search(); input.focus(); });
  }  /* buildBar 結束 */

  /* ---------- 4. 內部連結：先展開再跳 ---------- */
  function openByHash(h) {
    if (!h) return;
    var el = document.getElementById(h.slice(1));
    if (!el) return;
    var it = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].sec === el || items[i].sec.contains(el) || items[i].h === el) { it = items[i]; break; }
    }
    if (it) { setOpen(it, true); save(); }
    setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var h = a.getAttribute('href');
    if (h.length < 2) return;
    e.preventDefault();
    history.replaceState(null, '', h);
    openByHash(h);
  });
  if (location.hash) setTimeout(function () { openByHash(location.hash); }, 60);

  /* ---------- 5. 進度條、回到頂部、目錄高亮 ---------- */
  var prog = document.createElement('div');
  prog.className = 'rprog';
  prog.innerHTML = '<i></i>';
  document.body.appendChild(prog);
  var pbar = prog.firstChild;

  var top = document.createElement('button');
  top.className = 'rtop';
  top.type = 'button';
  top.setAttribute('aria-label', '回到頂部');
  top.textContent = '↑';
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(top);

  var tocLinks = {};
  Array.prototype.forEach.call(document.querySelectorAll('.rail .toc a[href^="#"]'), function (a) {
    tocLinks[a.getAttribute('href').slice(1)] = a;
  });

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var d = document.documentElement;
      var max = d.scrollHeight - d.clientHeight;
      pbar.style.width = (max > 0 ? Math.min(100, d.scrollTop / max * 100) : 0) + '%';
      top.classList.toggle('show', d.scrollTop > d.clientHeight * 0.8);

      var cur = null, mid = d.clientHeight * 0.35;
      items.forEach(function (it) {
        var r = it.host.getBoundingClientRect();
        if (r.top <= mid) cur = it;
      });
      for (var k in tocLinks) tocLinks[k].classList.remove('on');
      if (cur && tocLinks[cur.sec.id]) tocLinks[cur.sec.id].classList.add('on');
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 工具列固定位置要避開 topnav */
  function fit() {
    var h = nav ? nav.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--navh', Math.round(h) + 'px');
  }
  fit();
  window.addEventListener('resize', fit);
})();
