/* 導覽列下拉：點外面或按 Esc 關閉，一次只開一個 */
(function () {
  'use strict';
  var dds = Array.prototype.slice.call(document.querySelectorAll('.topnav details.dd'));
  if (!dds.length) return;
  dds.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) dds.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener('click', function (e) {
    dds.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') dds.forEach(function (d) { d.open = false; });
  });
})();
