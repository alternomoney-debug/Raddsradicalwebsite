/*
  DRIFT: the rules and the two computer players.
  Petryn's card game from The Long Shot Initiative, Chapter 26.

  The page (index.html) only draws things and handles clicks. Everything about
  what is allowed, what scores, and how Petryn and Marsh choose a move lives here,
  so the rules can be tested on their own.

  THE RULES (also shown on the page)
    One standard deck, two players.
    Deal 12 cards face down in a ring: the orbit. The rest is the Dark.
    Two face-up neighbours line up if they share a suit, share a rank,
    or are one rank apart (King and Ace count as one apart).
    Three or more face-up cards in a row that all line up are a Line.
    On your turn you may NUDGE once: swap a face-up card with a neighbour.
    Then you must do one of:
      FLIP a face-down card,
      CLAIM a Line (take the cards, refill the gaps face down from the Dark;
        once the Dark is empty the gaps close up),
      JETTISON a face-up card (only when nothing in the orbit is face down
        and the Dark still has cards; it is replaced face down).
    You can't nudge the same two cards your opponent just nudged.
    A Line scores 3, plus 2 for every card past three. All one suit: double.
    The game ends when nobody can flip, claim, or jettison. Most points wins.
*/
(function (root) {
  'use strict';

  var SUITS = ['S', 'H', 'D', 'C'];
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var ORBIT = 12;

  function deck() {
    var d = [];
    SUITS.forEach(function (s) { for (var r = 1; r <= 13; r++) d.push({ r: r, s: s, id: RANKS[r] + s }); });
    return d;
  }
  function shuffle(a, rng) {
    rng = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function newGame(rng) {
    var d = shuffle(deck(), rng);
    return {
      orbit: d.splice(0, ORBIT).map(function (c) { return { c: c, up: false }; }),
      dark: d, cold: [], score: [0, 0], taken: [0, 0], turn: 0,
      lastNudge: null,   // the two card ids the previous player swapped
      over: false
    };
  }

  function clone(s) {
    return {
      orbit: s.orbit.map(function (o) { return { c: o.c, up: o.up }; }),
      dark: s.dark.slice(), cold: s.cold.slice(), score: s.score.slice(), taken: s.taken.slice(),
      turn: s.turn, lastNudge: s.lastNudge, over: s.over
    };
  }

  function match(a, b) {
    if (a.s === b.s || a.r === b.r) return true;
    var d = Math.abs(a.r - b.r);
    return d === 1 || d === 12;
  }

  // Every maximal Line in the orbit, as a list of positions in ring order.
  function lines(orbit) {
    var n = orbit.length, out = [];
    if (n < 3) return out;
    var link = [], all = true;
    for (var i = 0; i < n; i++) {
      var a = orbit[i], b = orbit[(i + 1) % n];
      link[i] = a.up && b.up && match(a.c, b.c);
      if (!link[i]) all = false;
    }
    if (all) { var whole = []; for (var k = 0; k < n; k++) whole.push(k); return [whole]; }
    var start = 0;
    while (link[(start + n - 1) % n]) start++;        // begin just after a break
    var run = null;
    for (var step = 0; step < n; step++) {
      var p = (start + step) % n;
      if (link[p]) { if (!run) run = [p]; run.push((p + 1) % n); }
      else { if (run && run.length >= 3) out.push(run); run = null; }
    }
    if (run && run.length >= 3) out.push(run);
    return out;
  }

  function lineScore(cards) {
    var pts = 3 + 2 * (cards.length - 3);
    for (var i = 1; i < cards.length; i++) if (cards[i].s !== cards[0].s) return pts;
    return pts * 2;
  }

  function lineAt(orbit, pos) {
    var ls = lines(orbit);
    for (var i = 0; i < ls.length; i++) if (ls[i].indexOf(pos) >= 0) return ls[i];
    return null;
  }

  function canNudge(s, i, dir) {
    var n = s.orbit.length;
    if (n < 2 || !s.orbit[i] || !s.orbit[i].up) return false;
    var j = (i + dir + n) % n;
    if (j === i) return false;
    if (s.lastNudge) {
      var a = s.orbit[i].c.id, b = s.orbit[j].c.id, l = s.lastNudge;
      if ((a === l[0] && b === l[1]) || (a === l[1] && b === l[0])) return false;
    }
    return true;
  }
  function nudge(s, i, dir) {                        // changes s, returns the other position
    var n = s.orbit.length, j = (i + dir + n) % n, t = s.orbit[i];
    s.orbit[i] = s.orbit[j]; s.orbit[j] = t;
    s.nudged = [s.orbit[i].c.id, s.orbit[j].c.id];
    return j;
  }
  function nudgeOptions(s) {
    var out = [], n = s.orbit.length, seen = {};
    for (var i = 0; i < n; i++) for (var d = -1; d <= 1; d += 2) {
      if (!canNudge(s, i, d)) continue;
      var j = (i + d + n) % n, key = Math.min(i, j) + ',' + Math.max(i, j);
      if (seen[key]) continue;
      seen[key] = 1; out.push({ i: i, dir: d });
    }
    return out;
  }

  function hasFaceDown(orbit) { for (var i = 0; i < orbit.length; i++) if (!orbit[i].up) return true; return false; }
  function canJettison(s, i) { return !!s.orbit[i] && s.orbit[i].up && !hasFaceDown(s.orbit) && s.dark.length > 0; }

  // After the optional nudge, the action. Each returns a small report for the page.
  function flip(s, i) { s.orbit[i].up = true; return { act: 'flip', at: i, card: s.orbit[i].c }; }
  function claim(s, pos) {
    var set = {}, cards = [];
    pos.forEach(function (p) { set[p] = 1; cards.push(s.orbit[p].c); });
    var pts = lineScore(cards), next = [];
    for (var i = 0; i < s.orbit.length; i++) {
      if (!set[i]) next.push(s.orbit[i]);
      else if (s.dark.length) next.push({ c: s.dark.pop(), up: false });
    }
    s.orbit = next; s.score[s.turn] += pts; s.taken[s.turn] += cards.length;
    return { act: 'claim', at: pos, cards: cards, pts: pts };
  }
  function jettison(s, i) {
    var c = s.orbit[i].c; s.cold.push(c); s.orbit[i] = { c: s.dark.pop(), up: false };
    return { act: 'jet', at: i, card: c };
  }

  function endTurn(s) {
    s.lastNudge = s.nudged || null; s.nudged = null;
    s.turn = 1 - s.turn;
    if (!canAct(s)) s.over = true;
    return s;
  }

  // Can the player whose turn it is do anything at all?
  function canAct(s) {
    if (!s.orbit.length) return false;
    if (hasFaceDown(s.orbit)) return true;
    if (s.dark.length) return true;                    // everything is up, so a jettison works
    return bestClaim(s).pts > 0;
  }

  // The best claim available this turn, counting one optional nudge first.
  // Uses only face-up cards, so the computer players never peek.
  function bestClaim(s) {
    var best = { pts: 0 };
    function look(st, nd) {
      lines(st.orbit).forEach(function (l) {
        var pts = lineScore(l.map(function (p) { return st.orbit[p].c; }));
        if (pts > best.pts) best = { pts: pts, nudge: nd, line: l };
      });
    }
    look(s, null);
    nudgeOptions(s).forEach(function (o) {
      var t = clone(s); nudge(t, o.i, o.dir); look(t, o);
    });
    return best;
  }

  // Cards a player could not have seen: still face down or in the Dark.
  function unseen(s) {
    var known = {};
    s.orbit.forEach(function (o) { if (o.up) known[o.c.id] = 1; });
    var out = [];
    deck().forEach(function (c) { if (!known[c.id]) out.push(c); });
    // Cards already claimed or jettisoned are gone; they were face up when they left,
    // so the orbit plus the Dark is exactly what is left in play.
    var inPlay = {};
    s.orbit.forEach(function (o) { inPlay[o.c.id] = 1; });
    s.dark.forEach(function (c) { inPlay[c.id] = 1; });
    return out.filter(function (c) { return inPlay[c.id]; });
  }

  // ---------------- the computer players ----------------
  // A move: { nudge: null | {i, dir}, act: 'flip'|'claim'|'jet', at: position or line }

  function petrynMove(s, rng) {
    rng = rng || Math.random;
    var b = bestClaim(s);
    if (b.pts > 0 && rng() < 0.85) return { nudge: b.nudge || null, act: 'claim', at: b.line };
    var down = [];
    s.orbit.forEach(function (o, i) { if (!o.up) down.push(i); });
    var nd = null;
    if (rng() < 0.3) { var opts = nudgeOptions(s); if (opts.length) nd = opts[Math.floor(rng() * opts.length)]; }
    if (down.length) {
      var t = clone(s); if (nd) nudge(t, nd.i, nd.dir);
      var d2 = []; t.orbit.forEach(function (o, i) { if (!o.up) d2.push(i); });
      return { nudge: nd, act: 'flip', at: d2[Math.floor(rng() * d2.length)] };
    }
    if (b.pts > 0) return { nudge: b.nudge || null, act: 'claim', at: b.line };
    return { nudge: null, act: 'jet', at: Math.floor(rng() * s.orbit.length) };
  }

  // Marsh does the math: her points minus the best reply it leaves her opponent.
  function marshMove(s, rng) {
    rng = rng || Math.random;
    var pool = unseen(s), best = null, bestV = -1e9;
    function reply(t) { var r = clone(t); r.lastNudge = t.nudged || null; r.nudged = null; return bestClaim(r).pts; }
    function consider(v, m) { v += rng() * 0.01; if (v > bestV) { bestV = v; best = m; } }
    var nudges = [null].concat(nudgeOptions(s));
    nudges.forEach(function (nd) {
      var t = clone(s); if (nd) nudge(t, nd.i, nd.dir);
      lines(t.orbit).forEach(function (l) {
        var u = clone(t); u.nudged = t.nudged; var rep = claim(u, l);
        consider(rep.pts - 0.9 * reply(u), { nudge: nd, act: 'claim', at: l });
      });
      var faceDown = false;
      t.orbit.forEach(function (o, i) {
        if (o.up) return;
        faceDown = true;
        var total = 0;
        pool.forEach(function (c) {
          var u = clone(t); u.nudged = t.nudged; u.orbit[i] = { c: c, up: true };
          total += reply(u);
        });
        consider(-0.9 * total / Math.max(1, pool.length), { nudge: nd, act: 'flip', at: i });
      });
      if (!faceDown && t.dark.length) t.orbit.forEach(function (o, i) {
        var u = clone(t); u.nudged = t.nudged; u.orbit[i] = { c: { r: 0, s: 'X', id: '?' }, up: false };
        consider(-0.9 * reply(u) - 0.5, { nudge: nd, act: 'jet', at: i });
      });
    });
    return best;
  }

  // Apply a whole move for whoever's turn it is. Returns the reports, for the page.
  function play(s, m) {
    var out = [];
    if (m.nudge) { var j = nudge(s, m.nudge.i, m.nudge.dir); out.push({ act: 'nudge', at: [m.nudge.i, j] }); }
    if (m.act === 'flip') out.push(flip(s, m.at));
    else if (m.act === 'claim') out.push(claim(s, m.at));
    else out.push(jettison(s, m.at));
    endTurn(s);
    return out;
  }

  var API = {
    SUITS: SUITS, RANKS: RANKS, deck: deck, shuffle: shuffle, newGame: newGame, clone: clone,
    match: match, lines: lines, lineAt: lineAt, lineScore: lineScore,
    canNudge: canNudge, nudge: nudge, nudgeOptions: nudgeOptions, hasFaceDown: hasFaceDown,
    canJettison: canJettison, flip: flip, claim: claim, jettison: jettison, endTurn: endTurn,
    canAct: canAct, bestClaim: bestClaim, unseen: unseen, petrynMove: petrynMove, marshMove: marshMove, play: play
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Drift = API;
})(this);
