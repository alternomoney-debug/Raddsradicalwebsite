window.G={
  best:function(s){return +(localStorage.getItem('g:'+s+':best'))||0},
  setBest:function(s,v,low){try{var c=G.best(s);if(!c||(low?v<c:v>c))localStorage.setItem('g:'+s+':best',v)}catch(e){}},
  onHide:function(f){document.addEventListener('visibilitychange',function(){if(document.hidden)f()});window.addEventListener('blur',f)},
  swipe:function(el,cb){var sx,sy;el.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY});el.addEventListener('pointerup',function(e){var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;cb(Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'d':'u'))})},
  keys:function(f){document.addEventListener('keydown',function(e){if(e.ctrlKey||e.metaKey||e.altKey)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key)>=0)e.preventDefault();f(e.key.length===1?e.key.toLowerCase():e.key,e)})},
  $:function(id){return document.getElementById(id)}
};
(function(){
  var s=location.pathname.split('/').filter(Boolean).pop();
  try{var r=JSON.parse(localStorage.getItem('g:recent')||'[]').filter(function(x){return x!==s});r.unshift(s);localStorage.setItem('g:recent',JSON.stringify(r.slice(0,8)))}catch(e){}
  var fs=document.getElementById('fs');
  if(fs)fs.onclick=function(){var d=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(d.requestFullscreen)d.requestFullscreen()};
})();
