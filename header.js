/*
  The one top bar every page shares (except House on the Bluff and the games).
  Put <script src="header.js"></script> (with the right ../ in front) as the first thing inside <body>.
  Change the links below and every page updates.
*/
(function(){
  var me = document.currentScript, src = (me && me.src) || '', root = src.replace(/header\.js.*$/, '');
  var links = [['Stories', 'stories/'], ['Projects', 'projects/'], ['Games', 'games/'], ['Elsewhere', 'elsewhere/']];

  var st = document.createElement('style');
  st.textContent = 'header.sh{position:relative;z-index:10;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px clamp(16px,3vw,48px);background:#0b0d11;border-bottom:1px solid #252a31;font-family:"Bricolage Grotesque","Helvetica Neue",Arial,sans-serif;font-size:17px;line-height:1.55}'
    + 'header.sh.stick{position:sticky;top:0}'
    + 'header.sh .mark{color:#f1f3f5;font-weight:800;font-size:22px;letter-spacing:-.03em;text-decoration:none}'
    + 'header.sh nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px clamp(14px,2.2vw,32px);justify-content:flex-end}'
    + 'header.sh nav a{color:#a7b0ba;text-decoration:none;font-weight:500}header.sh nav a:hover{color:#f1f3f5}'
    + 'header.sh nav a.cur{color:#f1f3f5;font-weight:800}'
    + 'header.sh nav a.pill{color:#0b0d11;background:#f1f3f5;padding:7px 16px;border-radius:999px;font-weight:700}header.sh nav a.pill:hover{background:#5b9be6}'
    + '@media (max-width:560px){header.sh{flex-wrap:wrap;padding-top:10px;padding-bottom:10px}header.sh nav{justify-content:flex-start;font-size:15px}}';
  document.head.appendChild(st);

  // which section this page belongs to, so its link shows as the current one
  var path = location.href.split(/[?#]/)[0];
  var here = path.indexOf(root) === 0 ? path.slice(root.length) : '';

  var h = document.createElement('header'); h.className = 'sh' + (me && me.hasAttribute('data-sticky') ? ' stick' : '');
  var mark = document.createElement('a'); mark.className = 'mark'; mark.href = root || '/'; mark.textContent = 'rad'; h.appendChild(mark);
  var nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Main');
  links.forEach(function(l){
    var a = document.createElement('a'); a.href = root + l[1]; a.textContent = l[0];
    if (here.indexOf(l[1]) === 0){ a.className = 'cur'; if (here === l[1]) a.setAttribute('aria-current', 'page'); }
    nav.appendChild(a);
  });
  var d = document.createElement('a'); d.className = 'pill'; d.href = 'https://discord.gg/j6ZrNMdA63'; d.target = '_blank'; d.rel = 'noopener'; d.textContent = 'Discord'; nav.appendChild(d);
  var acct = document.createElement('span'); acct.id = 'acct'; nav.appendChild(acct);
  h.appendChild(nav);
  if (me && me.parentNode) me.parentNode.insertBefore(h, me); else document.body.insertBefore(h, document.body.firstChild);

  // the Sign in button. Pages that load auth.js already mount it; on the rest, load the login system here
  document.addEventListener('DOMContentLoaded', function(){
    if (window.RadAuth) return;
    function add(file, done){ var s = document.createElement('script'); s.src = root + file; s.onload = done; document.head.appendChild(s); }
    add('config.js', function(){ add('auth.js', function(){ if (window.RadAuth) RadAuth.mount(acct); }); });
  });
})();
