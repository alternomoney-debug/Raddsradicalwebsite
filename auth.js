/*
  RadAuth: the login system for raddwastaken.art.
  Needs config.js loaded first. If config.js is blank, nothing here does anything.
  Passwords never touch this site: people sign in with Discord (or an emailed link),
  and Supabase handles the rest.
*/
(function(){
  var cfg = window.RAD_CONFIG || {};
  var BASE = (function(){
    try { return new URL('.', document.currentScript.src).href; } catch(e){ return '/'; }
  })();

  var listeners = [], mounts = [], askedName = false;
  var R = window.RadAuth = {
    enabled: !!(cfg.SUPABASE_URL && cfg.SUPABASE_KEY),
    sb: null, user: null, profile: null, isAdmin: false, loaded: false,
    onChange: function(fn){ listeners.push(fn); if (R.loaded) fn(R); }
  };

  function here(){ return location.origin + location.pathname + location.search; }
  function emit(){
    R.loaded = true;
    renderMounts();
    listeners.forEach(function(fn){ try { fn(R); } catch(e){} });
    if (R.user && !R.profile && !askedName){ askedName = true; R.open('username'); }
  }

  // ---------- talking to Supabase ----------
  function loadLib(){
    return new Promise(function(res, rej){
      if (window.supabase) return res();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function refresh(){
    return R.sb.auth.getSession().then(function(r){
      var s = r.data && r.data.session;
      R.user = s ? s.user : null;
      if (!R.user){ R.profile = null; R.isAdmin = false; return; }
      return Promise.all([
        R.sb.from('profiles').select('username').eq('id', R.user.id).maybeSingle(),
        R.sb.rpc('is_admin')
      ]).then(function(a){
        R.profile = (a[0] && a[0].data) || null;
        R.isAdmin = !!(a[1] && a[1].data === true);
      });
    }).catch(function(){}).then(function(){
      emit();
      return syncEggs().then(function(changed){ if (changed) emit(); });
    });
  }

  R.signInDiscord = function(){
    return R.sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: here() } });
  };
  R.signInEmail = function(email){
    return R.sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: here() } });
  };
  R.signOut = function(){ return R.sb.auth.signOut().then(refresh); };
  R.setUsername = function(name){
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return Promise.resolve({ error: { message: 'Use 3 to 20 letters, numbers, or underscores.' } });
    return R.sb.from('profiles').insert({ id: R.user.id, username: name }).then(function(r){
      if (r.error){
        return { error: { message: r.error.code === '23505' ? 'That name is taken.' : 'Could not save that name. Try another.' } };
      }
      return refresh().then(function(){ return {}; });
    });
  };
  R.recordResult = function(game, won, shots){
    if (!R.user || !R.profile) return Promise.resolve();
    var args = { p_game: game, p_won: !!won };
    if (won && shots) args.p_shots = shots;
    return Promise.resolve(R.sb.rpc('record_result', args)).catch(function(){});
  };

  // achievements: ask the database to hand one out (it only allows the safe kinds)
  R.earn = function(key){
    if (!R.user || !R.profile) return Promise.resolve();
    return Promise.resolve(R.sb.rpc('earn_achievement', { p_key: key })).catch(function(){});
  };
  R.profileUrl = function(name){ return BASE + 'u/?name=' + encodeURIComponent(name); };

  // easter eggs found on this device get added to the account, and eggs found on other devices come back
  var synced = false;
  function syncEggs(){
    if (synced || !R.user || !R.profile) return Promise.resolve(false);
    synced = true;
    var eggs = {}; try { eggs = JSON.parse(localStorage.getItem('rad-eggs')) || {}; } catch(e){}
    var chain = Promise.resolve();
    Object.keys(eggs).forEach(function(id){ chain = chain.then(function(){ return R.earn('egg-' + id); }); });
    return chain.then(function(){
      return Promise.resolve(R.sb.from('achievements').select('key').eq('user_id', R.user.id));
    }).then(function(r){
      var changed = false;
      ((r && r.data) || []).forEach(function(a){
        if (a.key.indexOf('egg-') === 0 && !eggs[a.key.slice(4)]){ eggs[a.key.slice(4)] = Date.now(); changed = true; }
      });
      if (changed){ try { localStorage.setItem('rad-eggs', JSON.stringify(eggs)); } catch(e){} }
      return changed;
    }).catch(function(){ return false; });
  }
  R.deleteAccount = function(){
    return Promise.resolve(R.sb.rpc('delete_my_account')).then(function(r){
      if (r && r.error) throw r.error;
      return R.sb.auth.signOut();
    }).then(refresh);
  };

  // ---------- the little sign in / account window ----------
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '.ra-btn{font:700 15px var(--font,system-ui,sans-serif);color:var(--ink,#f1f3f5);background:transparent;border:1px solid var(--line,#252a31);padding:8px 16px;border-radius:999px;cursor:pointer}',
    '.ra-btn:hover{border-color:var(--accent,#5b9be6)}',
    '.ra-btn.solid{background:var(--accent,#5b9be6);color:var(--bg,#0b0d11);border-color:var(--accent,#5b9be6)}',
    '.ra-btn.danger{color:#ff7a68;border-color:#5a2a24}',
    'dialog.ra-dialog{width:min(92vw,440px);padding:28px;border:1px solid var(--line,#252a31);border-radius:14px;background:var(--bg,#0b0d11);color:var(--ink,#f1f3f5);font:16px/1.5 var(--font,system-ui,sans-serif)}',
    'dialog.ra-dialog::backdrop{background:rgba(5,6,8,.85)}',
    '.ra-dialog h2{margin:0 0 8px;font-size:28px;letter-spacing:-.02em}',
    '.ra-dialog p{margin:0 0 16px;color:var(--muted,#a7b0ba)}',
    '.ra-dialog input{width:100%;font:inherit;padding:10px 14px;margin:0 0 10px;border-radius:10px;border:1px solid var(--line,#252a31);background:transparent;color:inherit}',
    '.ra-dialog .ra-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}',
    '.ra-dialog .ra-msg{min-height:1.4em;margin:10px 0 0;color:#ff7a68;font-size:15px}',
    '.ra-dialog .ra-msg.ok{color:var(--accent,#5b9be6)}',
    '.ra-dialog small{display:block;margin-top:16px;color:var(--muted,#a7b0ba)}',
    '.ra-dialog small a{color:inherit}'
  ].join('');
  document.head.appendChild(styleEl);

  var dlg = null;
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function btn(label, cls, fn){ var b = el('button', 'ra-btn ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  R.open = function(kind){
    if (!R.enabled) return;
    if (!dlg){
      dlg = document.createElement('dialog'); dlg.className = 'ra-dialog';
      dlg.addEventListener('click', function(e){ if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = '';
    var msg = el('p', 'ra-msg');
    function say(t, ok){ msg.textContent = t || ''; msg.className = 'ra-msg' + (ok ? ' ok' : ''); }

    if (kind === 'signin'){
      dlg.appendChild(el('h2', '', 'Sign in'));
      dlg.appendChild(el('p', '', 'Comment on comics, save your place, and get on the leaderboards. There is no password to remember.'));
      var row = el('div', 'ra-row');
      row.appendChild(btn('Continue with Discord', 'solid', function(){ say(''); R.signInDiscord(); }));
      dlg.appendChild(row);
      if (cfg.EMAIL_LOGIN){
        dlg.appendChild(el('p', '', ''));
        var input = el('input'); input.type = 'email'; input.placeholder = 'you@example.com'; input.autocomplete = 'email'; input.setAttribute('aria-label', 'Email');
        dlg.appendChild(input);
        dlg.appendChild(btn('Email me a link', '', function(){
          var v = input.value.trim(); if (!v) return say('Type your email first.');
          R.signInEmail(v).then(function(r){ say(r.error ? 'Could not send that. Try again in a bit.' : 'Check your email for the link.', !r.error); });
        }));
      }
      dlg.appendChild(msg);
      var small = el('small'); small.appendChild(document.createTextNode('You need to be 13 or older. Signing in means you are okay with the '));
      var a = el('a', '', 'rules and privacy page'); a.href = BASE + 'privacy/'; small.appendChild(a); small.appendChild(document.createTextNode('.'));
      dlg.appendChild(small);
    }

    if (kind === 'username'){
      dlg.appendChild(el('h2', '', 'Pick a username'));
      dlg.appendChild(el('p', '', 'Everyone can see this next to your comments and scores. 3 to 20 letters, numbers, or underscores. You can not change it later.'));
      var name = el('input'); name.placeholder = 'username'; name.maxLength = 20; name.autocomplete = 'off'; name.setAttribute('aria-label', 'Username');
      dlg.appendChild(name);
      var save = function(){
        say('');
        R.setUsername(name.value.trim()).then(function(r){ if (r.error) say(r.error.message); else dlg.close(); });
      };
      name.addEventListener('keydown', function(e){ if (e.key === 'Enter') save(); });
      var r2 = el('div', 'ra-row'); r2.appendChild(btn('Save', 'solid', save)); r2.appendChild(btn('Not now', '', function(){ dlg.close(); }));
      dlg.appendChild(r2); dlg.appendChild(msg);
    }

    if (kind === 'account'){
      dlg.appendChild(el('h2', '', R.profile ? R.profile.username : 'Your account'));
      dlg.appendChild(el('p', '', 'Signed in.'));
      var r3 = el('div', 'ra-row');
      if (R.profile){
        var pa = el('a', 'ra-btn solid', 'View my profile'); pa.href = R.profileUrl(R.profile.username); pa.style.textDecoration = 'none';
        r3.appendChild(pa);
      }
      r3.appendChild(btn('Sign out', '', function(){ R.signOut().then(function(){ dlg.close(); }); }));
      var armed = false;
      var del = btn('Delete my account', 'danger', function(){
        if (!armed){ armed = true; del.textContent = 'Click again to delete everything'; return; }
        R.deleteAccount().then(function(){ dlg.close(); }, function(){ say('Could not delete. Message me on Discord and I will do it.'); });
      });
      r3.appendChild(del); dlg.appendChild(r3);
      dlg.appendChild(el('small', '', 'Deleting removes your username, comments, bookmarks, and scores for good.'));
      dlg.appendChild(msg);
    }

    if (!dlg.open) dlg.showModal();
  };

  // ---------- account buttons ----------
  function renderMounts(){
    mounts.forEach(function(m){
      m.innerHTML = '';
      if (!R.enabled || !R.loaded){ m.hidden = true; return; }
      m.hidden = false;
      if (R.user){
        m.appendChild(btn(R.profile ? R.profile.username : 'Pick a username', '', function(){ R.open(R.profile ? 'account' : 'username'); }));
      } else {
        m.appendChild(btn('Sign in', '', function(){ R.open('signin'); }));
      }
    });
  }
  R.mount = function(node){ if (node){ mounts.push(node); node.hidden = true; renderMounts(); } };

  // ---------- start ----------
  if (!R.enabled) return;
  loadLib().then(function(){
    R.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    // the docs say to hand off to a timer here, so this callback never blocks other calls
    R.sb.auth.onAuthStateChange(function(){ setTimeout(refresh, 0); });
    return refresh();
  }).catch(function(){ R.enabled = false; emit(); });
})();
