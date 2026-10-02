/*
  Lite mode: for school Chromebooks and older computers.
  Turns off the animated background and most motion, and makes the games draw less often.
  It switches on by itself for weak computers (or ones that stutter), and anyone can flip it with the
  link at the bottom of each page, by adding ?lite=1 or ?lite=0 to any address, or by visiting /lite/.
*/
(function(){
  var KEY = 'rad-lite', q = new URLSearchParams(location.search), pref = null;
  if (q.has('lite')){ pref = q.get('lite') === '0' ? '0' : '1'; try { localStorage.setItem(KEY, pref); } catch(e){} }
  else { try { pref = localStorage.getItem(KEY); } catch(e){} }
  var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var weak = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  var lite = pref === '1' || (pref === null && (weak || rm));
  window.__LITE = lite;
  document.documentElement.classList.toggle('lite', lite);
  var st = document.createElement('style');
  st.textContent = 'html.lite #c{display:none!important}html.lite *{animation:none!important;transition:none!important}html.lite{scroll-behavior:auto!important}'
    + '.lite-toggle{background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}';
  document.head.appendChild(st);

  function set(on){ try { localStorage.setItem(KEY, on ? '1' : '0'); } catch(e){} var u = new URL(location.href); u.searchParams.delete('lite'); location.href = u.toString(); }
  window.RadLite = { on: lite, set: set };

  document.addEventListener('DOMContentLoaded', function(){
    var f = document.querySelector('footer'); if (!f) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'lite-toggle';
    b.textContent = lite ? 'Lite mode: on (switch to full)' : 'Slow computer? Try Lite mode';
    b.addEventListener('click', function(){ set(!lite); });
    var span = document.createElement('span'); span.appendChild(b); f.appendChild(span);
  });

  // not decided yet and the page is stuttering? switch to Lite on our own, once
  if (!lite && pref === null && window.requestAnimationFrame){
    var frames = 0, t0 = 0, started = false;
    function tick(t){
      if (document.hidden){ requestAnimationFrame(tick); return; }
      if (!started){ if (t > 1200){ started = true; t0 = t; } requestAnimationFrame(tick); return; }
      frames++;
      if (t - t0 < 2500){ requestAnimationFrame(tick); return; }
      var fps = frames / ((t - t0) / 1000);
      if (fps < 28){
        try { localStorage.setItem(KEY, '1'); } catch(e){}
        var n = document.createElement('div'); n.setAttribute('role', 'status');
        n.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99;background:#f1f3f5;color:#0b0d11;padding:12px 18px;border-radius:12px;font:600 15px system-ui,sans-serif;max-width:92vw;text-align:center';
        n.textContent = 'This page is running slowly on your computer, so Lite mode is turning on.';
        document.body.appendChild(n); setTimeout(function(){ location.reload(); }, 2200);
      } else { try { localStorage.setItem(KEY, '0'); } catch(e){} }
    }
    requestAnimationFrame(tick);
  }
})();
