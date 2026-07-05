// Google Analytics 4 (gtag.js) — 直覺科學互動學習
// 共用檔：各頁 <head> 以 <script src=".../assets/ga.js"></script> 引用。
// 之後要換評估 ID，只改這一個檔即可。
(function () {
  var GA_ID = 'G-ZR546G8BH4';
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
})();
