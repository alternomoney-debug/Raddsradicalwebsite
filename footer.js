/*
  The one footer every page shares. Change the lines below and every page updates.
  (The main page and Elsewhere have the same footer written out in their own HTML.)
*/
(function(){
  var src = (document.currentScript && document.currentScript.src) || '', root = src.replace(/footer\.js.*$/, '');
  var st = document.createElement('style');
  st.textContent = 'footer.sf{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 24px;margin-top:auto;padding:28px clamp(16px,3vw,48px) 36px;border-top:1px solid #252a31;color:#a7b0ba;font:400 14px/1.5 "Bricolage Grotesque","Helvetica Neue",Arial,sans-serif;position:relative;z-index:2}footer.sf a{color:inherit}';
  document.head.appendChild(st);
  document.addEventListener('DOMContentLoaded', function(){
    var f = document.createElement('footer'); f.className = 'sf';
    function text(t){ var s = document.createElement('span'); s.textContent = t; f.appendChild(s); }
    function link(t, h){ var s = document.createElement('span'), a = document.createElement('a'); a.href = root + h; a.textContent = t; s.appendChild(a); f.appendChild(s); }
    text('House on the Bluff Records, an unincorporated partnership of musicians, ' + new Date().getFullYear());
    text('Made by Jayce and R, Budiworo, J.');
    text('ASCII background by TheMonHub on Discord');
    link('Site credits', 'credits/');
    link('Rules and privacy', 'privacy/');
    var old = document.querySelectorAll('footer');
    if (old.length){ old[0].parentNode.replaceChild(f, old[0]); for (var i = 1; i < old.length; i++) old[i].parentNode.removeChild(old[i]); }
    else document.body.appendChild(f);
    // on a short page, push the footer down so it sits at the bottom of the screen
    var raf = 0;
    function fit(){
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function(){
        var cur = parseFloat(f.style.marginTop) || 0, base = f.getBoundingClientRect().bottom + window.scrollY - cur, gap = window.innerHeight - base;
        f.style.marginTop = gap > 1 ? gap + 'px' : '';
      });
    }
    fit(); window.addEventListener('load', fit); window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(document.body);
  });
})();
