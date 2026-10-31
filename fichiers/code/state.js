// ===== Game state, save, time, encounters, trainer generation =====
(function (W) {
'use strict';
const P = W.PK, G = W.GD;
const { sp, mv, R, ri, pick } = P;
const SAVE_KEY = 'pkaventure_save_v1';

const Game = W.Game = {};
// ---------- timers that keep running when the tab is in the background (browsers throttle the page's own timers)
(() => {
  let wk = null, seq = 0; const cbs = new Map();
  try {
    const src = 'const t={};onmessage=e=>{const d=e.data;if(d.c)clearTimeout(t[d.c]),delete t[d.c];else t[d.id]=setTimeout(()=>{delete t[d.id];postMessage(d.id)},d.ms)}';
    wk = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    wk.onmessage = e => { const f = cbs.get(e.data); cbs.delete(e.data); if (f) f() };
  } catch (e) { wk = null }
  W.bgHidden = () => document.visibilityState === 'hidden';
  W.tmo = (fn, ms) => { if (!wk || !W.bgHidden()) return { t: setTimeout(fn, ms) }; const id = ++seq; cbs.set(id, fn); wk.postMessage({ id, ms }); return { w: id } };
  W.untmo = h => { if (!h) return; if (h.t != null) clearTimeout(h.t); if (h.w != null) { cbs.delete(h.w); if (wk) wk.postMessage({ c: h.w }) } };
  W.sleep = ms => new Promise(r => W.tmo(r, ms));
})();
let S = null;
Game.get = () => S;

// ---------- utils
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.floor(n).toLocaleString('fr-FR');
Game.esc = esc; Game.fmt = fmt;

// sprite blob cache
const urlCache = {};
function b64url(b64, type) {
  try { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([a], { type })) } catch (e) { return 'data:' + type + ';base64,' + b64 }
}
Game.spriteURL = (ix, shiny) => {
  const key = (shiny ? 's' : 'n') + ix; if (urlCache[key]) return urlCache[key];
  const arr = shiny ? W.ICS : W.ICN; if (!arr || !arr[ix]) return '';
  return urlCache[key] = b64url(arr[ix], 'image/webp');
};
Game.backURL = (id, shiny) => {
  const key = (shiny ? 'bs' : 'bn') + id; if (urlCache[key] !== undefined) return urlCache[key];
  const src = shiny ? W.BKS : W.BKN; const b = src && (src[id] || (shiny && W.BKN ? null : null));
  return urlCache[key] = b ? b64url(b, 'image/webp') : '';
};
// sharp HOME render (PokéAPI) for the Pokémon that have no animated sprite
const hdCache = {};
Game.homeHD = (id, shiny) => { const k = (shiny ? 's' : 'n'); const d = W.HOMEHD && W.HOMEHD[k] && W.HOMEHD[k][id]; if (!d) return ''; return hdCache[k + id] || (hdCache[k + id] = b64url(d, 'image/webp')) };
Game.frontURL = (id, shiny) => {
  const key = (shiny ? 'fs' : 'fn') + id; if (urlCache[key] !== undefined) return urlCache[key];
  const src = shiny ? W.FRS : W.FRN; const b = src && src[id];
  return urlCache[key] = b ? b64url(b, 'image/webp') : '';
};
// animated sprites, loaded on demand in small chunks (anim/<kind>_<n>.js)
const animStore = {}, animState = {}, animWait = {};
W.__ANIM = (kind, obj) => { for (const id in obj) animStore[kind + id] = obj[id] };
Game.animURL = (kind, id, cb) => {
  if (S && S.set && S.set.spr === 'home') return ''; // still HOME sprites chosen in the options
  const key = kind + id; if (urlCache['a' + key]) return urlCache['a' + key];
  if (animStore[key]) { const v = animStore[key]; const u = urlCache['a' + key] = typeof v === 'string' ? b64url(v, 'image/webp') : URL.createObjectURL(v); delete animStore[key]; return u }
  const ix = W.ANIX && W.ANIX[kind] && W.ANIX[kind][id]; if (ix == null) return '';
  if (W.ANIM_DIR) return urlCache['a' + key] = (W.ASSET_ROOT || '') + 'anim/' + kind + '/' + id + '.webp';
  const ck = kind + '_' + ix;
  if (!animState[ck]) {
    animState[ck] = 'loading';
    const done = ok => { animState[ck] = ok ? 'done' : 'fail'; const L = (animWait[ck] || []).splice(0); if (ok) L.forEach(f => { try { f() } catch (e) { } }) };
    const viaScript = () => { try { const sc = document.createElement('script'); sc.src = (W.ASSET_ROOT || '') + 'anim/' + ck + '.js'; sc.async = true; sc.onload = () => done(true); sc.onerror = () => done(false); document.head.appendChild(sc) } catch (e) { done(false) } };
    // fetch + parse (no eval) works in the hosted page; a <script> tag is the fallback
    const viaJS = () => fetch((W.ASSET_ROOT || '') + 'anim/' + ck + '.js').then(r => { if (!r.ok) throw new Error(r.status); return r.text() }).then(t => {
        const i = t.indexOf(',{'); const obj = JSON.parse(t.slice(i + 1, t.lastIndexOf('}') + 1)); W.__ANIM(kind, obj); done(true);
      }).catch(viaScript);
    // binary chunk (anim/<kind>_<n>.wasm (raw bytes; .wasm only because the host serves that binary type)): uint32 header length, JSON {id:[offset,length]}, then the raw WebP files
    try {
      fetch((W.ASSET_ROOT || '') + 'anim/' + ck + '.wasm').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer() }).then(buf => {
        const hl = new DataView(buf).getUint32(0, true); const hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))); const base = 4 + hl;
        for (const id in hdr) animStore[kind + id] = new Blob([new Uint8Array(buf, base + hdr[id][0], hdr[id][1])], { type: 'image/webp' });
        done(true);
      }).catch(viaJS);
    } catch (e) { viaScript() }
  }
  if (cb && animState[ck] === 'loading') (animWait[ck] = animWait[ck] || []).push(cb);
  return '';
};
Game.preloadAnim = (id, shiny) => { Game.animURL('f' + (shiny ? 's' : 'n'), id) };
Game.itemURL = n => { const key = 'i' + n; if (urlCache[key] !== undefined) return urlCache[key]; const b = W.ITI && W.ITI[n]; return urlCache[key] = b ? b64url(b, b.startsWith('iVBOR') ? 'image/png' : 'image/webp') : '' };
Game.typeURL = t => { const key = 't' + t; if (urlCache[key]) return urlCache[key]; const b = W.TYI && W.TYI[t]; return urlCache[key] = b ? b64url(b, 'image/png') : '' };

// ---------- new game / save
function blank(name, starterId) {
  return {
    v: 1, name, rival: 'Kael', starter: starterId, money: 3000, gyms: [0, 0, 0, 0, 0, 0, 0, 0], champ: 0, champTimes: 0,
    items: { 'Poké Ball': 10, 'Potion': 5 }, tms: [], team: [], box: [], pc: { cur: 0, names: [], b: [] }, dex: {}, zones: {}, cur: 1,
    chain: { s: 0, n: 0 }, inc: null, flags: { share: 0, ring: 0, charm: 0, oval: 0, dc2: 0 }, tower: { best1: 0, best2: 0, best3: 0, pts: 0, streak: 0, mode: 0 },
    rematch: {}, leagueRe: 0, stats: { enc: 0, caught: 0, shinies: 0, wins: 0, legs: 0, epics: 0, quick: 0, started: Date.now(), play: 0 },
    set: { speed: 2, clock: 'fast', anim: 1 }, t: Date.now(),
    daycare: { a: null, b: null, t: 0, eggs: 0 }, daycare2: { a: null, b: null, t: 0, eggs: 0 }, quests: { d: null, w: null }, dexRw: [], dexN: {}, raid: { next: 0, cur: null }, tid: String(Math.floor(R() * 1e6)).padStart(6, '0'), tradesIn: [], tradesOut: [], pvp: {}
  };
}
// starter "soft reset": roll the starter again and again (new IV, nature, talent, shiny 1/350) before starting
Game.rollStarter = id => { const m = P.makeMon(id, 5, { perfect: 2, sh: R() < 1 / RATE.shiny }); m.ball = 'Poké Ball'; m.z = 0; return m };
Game.newGame = (name, starterId, mon) => {
  S = blank(name, starterId); S.flags.tuto = 0; S.tid = String(100000 + Math.floor(Math.random() * 900000));
  const m = mon && mon.s === starterId ? mon : Game.rollStarter(starterId); Game.addRib(m, 'starter');
  S.team.push(m); Game.dexSet(starterId, 3 | (m.sh ? 12 : 0));
  Game.save(true);
  return S;
};
Game.load = () => { try { const t = localStorage.getItem(SAVE_KEY); if (t) { S = migrate(JSON.parse(t)); try { Game.closePension() } catch (e) { } try { Game.dexSync() } catch (e) { } return S } } catch (e) { } return null };
// every Pokémon you own (team, PC, Pension) counts as seen and caught in the Pokédex, whatever way it arrived (trade, gift, evolution…)
Game.dexSync = () => { const own = [...S.team, ...Game.pcAll()]; for (const d of [S.daycare, S.daycare2]) if (d) { if (d.a) own.push(d.a); if (d.b) own.push(d.b) } let n = 0; for (const m of own) { if (!m || !sp(m.s)) continue; if (m.hw) Game.hwDexSet(m.s, 3 | (m.sh ? 4 : 0)); const want = 3 | (m.sh ? 12 : 0); if (((S.dex[m.s] || 0) & want) !== want) { Game.dexSet(m.s, want); const c = S.dexN[m.s] || (S.dexN[m.s] = [0, 0, 0, 0]); if (!c[0]) c[0] = 1; if (!c[1]) c[1] = 1; if (m.sh) { if (!c[2]) c[2] = 1; if (!c[3]) c[3] = 1 } n++ } } return n };
function migrate(s) { const b = blank(s.name || 'Dresseur', s.starter || 1); for (const k in b) if (s[k] === undefined) s[k] = b[k];
  if (!s.tid) s.tid = String(100000 + Math.floor(Math.random() * 900000)); // trainer ID (also binds trade codes to one player)
  // Rayquazite no longer exists (Rayquaza mega-evolves with Draco Ascension): refund it
  { let n = (s.items && s.items['Rayquazite']) || 0; if (s.items) delete s.items['Rayquazite']; const strip = m => { if (m && m.it === 'Rayquazite') { m.it = ''; n++ } }; (s.team || []).forEach(strip); for (const bx of (s.pc && s.pc.b) || []) (bx || []).forEach(strip); if (n) s.money = (s.money || 0) + n * 50000 }
  if (s.box && s.box.length) { const keep = S; S = s; for (const m of s.box) Game.pcAdd(m); s.box = []; S = keep } for (const k in b.flags) if (s.flags[k] === undefined) s.flags[k] = b.flags[k]; for (const k in b.set) if (s.set[k] === undefined) s.set[k] = b.set[k]; for (const k in b.stats) if (s.stats[k] === undefined) s.stats[k] = b.stats[k];
  // Pokédex counters start from what the old save already knew
  if (!Object.keys(s.dexN).length) for (const id in s.dex) { const f = s.dex[id]; s.dexN[id] = [f & 1 ? 1 : 0, f & 2 ? 1 : 0, f & 8 ? 1 : 0, f & 4 ? 1 : 0] }
  // legendaries are no longer accepted at the daycare: give them back
  for (const d of [s.daycare, s.daycare2]) if (d && d.b && P.sp(d.b.s) && P.sp(d.b.s).rar === 'legendaire') { const m = d.b; d.b = null; d.t = 0; if (s.team.length < 6) s.team.push(m); else { const keep = S; S = s; Game.pcAdd(m); S = keep } s.flags.dcLegBack = 1 }
  if (s.set) s.set.clock = 'fast'; // real-time clock removed
  // genders for Pokémon caught before the gender system
  { const fix = m => { if (m && m.s && m.gd === undefined) m.gd = P.rollGender(m.s) }; (s.team || []).forEach(fix); for (const bx of (s.pc && s.pc.b) || []) (bx || []).forEach(fix); for (const d of [s.daycare, s.daycare2]) if (d) { fix(d.a); fix(d.b) } }
  return s }
let cloudTimer = null; Game.cloud = { ok: false, last: 0, err: '' };
let saveTimer = null, saveLast = 0;
let natLast = 0;
const writeSave = () => { saveTimer = null; if (!S) return; saveLast = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)) } catch (e) { }
  try { if (W.valmaraNative && Date.now() - natLast > 600000) { natLast = Date.now(); W.valmaraNative.backup(JSON.stringify(S)) } } catch (e) { } /* .exe: rolling backup files */ clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudSave, 8000) };
Game.save = (quiet) => {
  if (!S) return; S.t = Date.now();
  // writing the whole save takes time with a big PC: during long farms, writes are grouped (one every 4 s at most)
  const wait = 4000 - (Date.now() - saveLast); if (wait <= 0) { clearTimeout(saveTimer); writeSave(); return } if (!saveTimer) saveTimer = setTimeout(writeSave, wait);
};
Game.saveNow = () => { clearTimeout(saveTimer); writeSave() };
try { addEventListener('pagehide', () => { if (saveTimer) Game.saveNow() }); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) Game.saveNow() }); addEventListener('beforeunload', () => { if (saveTimer) Game.saveNow() }) } catch (e) { }
Game.exportText = () => JSON.stringify(S);
Game.importText = t => { const o = JSON.parse(t); if (!o || !o.team || !o.name) throw new Error('Fichier de sauvegarde invalide'); S = migrate(o); Game.save(); return S };
Game.reset = () => { try { localStorage.removeItem(SAVE_KEY) } catch (e) { } S = null };

// cloud save through the artifact db capability (per-viewer private subtree)
let dbApi = null, uidv = null;
async function cloudInit() {
  try {
    if (!W.claude || !W.claude.use) return null;
    const [db, user] = await Promise.all([W.claude.use('db'), W.claude.use('user')]);
    if (!db || !user) return null; uidv = await user.id(); if (!uidv) return null; dbApi = db; Game.cloud.ok = true; return db;
  } catch (e) { Game.cloud.err = String(e && e.message || e); return null }
}
const CH = 180000;
async function cloudSave() {
  if (!S) return; if (!dbApi) await cloudInit(); if (!dbApi) return;
  try {
    const txt = JSON.stringify(S); const parts = []; for (let i = 0; i < txt.length; i += CH) parts.push(txt.slice(i, i + CH));
    const col = dbApi.collection('data/users/' + uidv);
    for (let i = 0; i < parts.length; i++) await col.doc('s' + i).set({ d: parts[i] });
    await col.doc('meta').set({ n: parts.length, t: S.t, name: S.name });
    Game.cloud.last = Date.now(); Game.cloud.err = '';
  } catch (e) { Game.cloud.err = (e && (e.code || e.message)) || 'erreur' }
}
Game.cloudSaveNow = cloudSave;
Game.cloudLoad = async () => {
  if (!dbApi) await cloudInit(); if (!dbApi) return null;
  try {
    const col = dbApi.collection('data/users/' + uidv); const meta = await col.doc('meta').get(); const md = meta.data && meta.data(); if (!md || !md.n) return null;
    let txt = ''; for (let i = 0; i < md.n; i++) { const d = await col.doc('s' + i).get(); const x = d.data && d.data(); if (!x) return null; txt += x.d }
    return { t: md.t, name: md.name, data: JSON.parse(txt) };
  } catch (e) { Game.cloud.err = (e && (e.code || e.message)) || 'erreur'; return null }
};
Game.closePension = () => { if (!S) return 0; let n = 0; for (const k of ['daycare', 'daycare2']) { const d = S[k]; if (!d) continue; for (const sl of ['a', 'b']) if (d[sl]) { const m = d[sl]; d[sl] = null; if (S.team.length < 6) S.team.push(m); else Game.pcAdd(m); n++ } d.eggs = 0 } return n };
Game.cloudWipe = async () => { if (!dbApi) await cloudInit(); if (!dbApi) return; await dbApi.collection('data/users/' + uidv).doc('meta').delete() };
Game.adopt = s => { S = migrate(s); try { Game.dexSync() } catch (e) { } try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)) } catch (e) { } };
Game.cloudInit = cloudInit;

// ---------- PC boxes (200 × 30)
const NB = 200, NS = 30; Game.NB = NB; Game.NS = NS;
Game.pcBox = i => { const pc = S.pc; while (pc.b.length <= i) pc.b.push(null); if (!pc.b[i]) pc.b[i] = Array(NS).fill(null); return pc.b[i] };
Game.pcName = i => (S.pc.names[i] || ('Boîte ' + (i + 1)));
Game.pcAll = () => { const out = []; for (const b of S.pc.b) if (b) for (const m of b) if (m) out.push(m); return out };
Game.pcAdd = (m, from) => { const st = from != null ? from : S.pc.cur; for (let k = 0; k < NB; k++) { const i = (st + k) % NB; const bx = Game.pcBox(i); const j = bx.indexOf(null); if (j >= 0) { bx[j] = m; return [i, j] } } return null };
Game.pcFind = u => { for (let i = 0; i < S.pc.b.length; i++) { const bx = S.pc.b[i]; if (!bx) continue; const j = bx.findIndex(m => m && m.u === u); if (j >= 0) return [i, j] } return null };
Game.pcRemove = m => { const f = Game.pcFind(m.u); if (f) S.pc.b[f[0]][f[1]] = null; return f };
Game.findMon = u => { let m = S.team.find(x => x.u === u); if (m) return [m, 'team']; const f = Game.pcFind(u); return f ? [S.pc.b[f[0]][f[1]], 'box', f] : [null, null] };
Game.removeMon = m => { const i = S.team.indexOf(m); if (i >= 0) { S.team.splice(i, 1); return } Game.pcRemove(m) };

// ---------- time of day
Game.isNight = () => {
  const cyc = 40 * 60000, t = Date.now() % cyc; return t >= 28 * 60000;
};
Game.phaseLeft = () => {
  const cyc = 40 * 60000, t = Date.now() % cyc; return t < 28 * 60000 ? 28 * 60000 - t : cyc - t;
};

// ---------- dex
Game.dexSet = (id, bits) => { S.dex[id] = (S.dex[id] || 0) | bits };
Game.seen = id => (S.dex[id] || 0) & 1; Game.caught = id => (S.dex[id] || 0) & 2; Game.shinyCaught = id => (S.dex[id] || 0) & 4;
Game.dexCount = () => { let s = 0, c = 0, sh = 0, cb = 0; for (const id of P.ALL_IDS) { const f = S.dex[id] || 0; if (f & 1) s++; if (f & 2) { c++; if (id < 10000) cb++ } if (f & 4) sh++ } return { s, c, sh, cb, tot: P.ALL_IDS.length } };

// ---------- items
Game.has = n => (S.items[n] || 0) > 0;
Game.add = (n, q = 1) => { S.items[n] = (S.items[n] || 0) + q; if (S.items[n] <= 0) delete S.items[n] };
Game.badges = () => S.gyms.filter(Boolean).length;

// ---------- zones
Game.zone = id => G.ZONES[id - 1];
Game.zst = id => (S.zones[id] = S.zones[id] || { tr: [], rival: 0, cleared: 0 });
Game.gymIndexForZone = zid => G.GYM_AFTER[zid] != null ? G.GYM_AFTER[zid] : -1;
Game.rivalIndexForZone = zid => G.RIVAL_AT.indexOf(zid);
Game.zoneCleared = zid => {
  const z = Game.zone(zid), st = Game.zst(zid);
  const bossIdx = z.tr.length - 1; if (!st.tr.includes(bossIdx)) return false;
  const gi = Game.gymIndexForZone(zid); if (gi >= 0 && !S.gyms[gi]) return false;
  if (Game.rivalIndexForZone(zid) >= 0 && !st.rival) return false;
  return true;
};
Game.zoneUnlocked = zid => {
  if (zid === 1) return true;
  if (zid === 26) return !!S.champ;
  if (zid > 26) return !!S.champ && Game.zoneCleared(zid - 1);
  return Game.zoneCleared(zid - 1);
};
Game.leagueOpen = () => Game.badges() >= 8 && Game.zoneCleared(25);
// level cap: the strongest Pokémon of the last trainer (and of the Arène) of the furthest zone open to you
Game.zoneCapLv = z => { const boss = z.tr[z.tr.length - 1]; let lv = boss ? Math.max(...boss.team.map(x => x[1])) : z.lv[1]; const gi = Game.gymIndexForZone(z.id); if (gi >= 0 && !S.gyms[gi]) lv = Math.max(lv, ...P.G.GYMS[gi].team.map(x => x[1])); return lv };
Game.levelCap = () => {
  if (S.champ) return 100; // after the League: no cap
  const Z = P.G.ZONES; let last = null;
  for (const z of Z) if (z.id <= 25 && Game.zoneUnlocked(z.id)) last = z;
  if (!last) return 100;
  if (Game.zoneCleared(last.id) && (last.id === Z[Z.length - 1].id)) return 100;
  if (!S.champ && Game.leagueOpen()) return Math.max(...P.G.LEAGUE.flatMap(L => L.team.map(x => x[1])));
  return Math.max(Game.zoneCapLv(last), 5);
};
Game.zoneSpecies = (zid, night) => {
  const z = Game.zone(zid);
  return z.sp.filter(id => { const s = sp(id); if (!s) return false; if (s.tod === 'n' && !night) return false; if (s.tod === 'd' && night) return false; return true });
};

// ---------- encounters
const RATE = { shiny: 1000, epic: 500, leg: 5000, rare: 100 }; Game.RATE = RATE;
Game.shinyRate = () => (1 / RATE.shiny) * (S.flags.charm ? 2 : 1);
// ---------- zone weather: changes every 5 minutes, depending on the biome (same for everybody at the same time)
const WX = { clear: ['Temps clair', '🌤', null, ['ele']], rain: ['Pluie', '🌧', 'rain', ['wat', 'bug']], sun: ['Grand soleil', '☀', 'sun', ['fir', 'gra', 'nor']], snow: ['Neige', '❄', 'snow', ['ice']], sand: ['Tempête de sable', '🌪', 'sand', ['roc', 'gro', 'ste']], fog: ['Brouillard', '🌫', null, ['gho', 'psy', 'fai', 'dar']], wind: ['Grand vent', '🍃', null, ['fly', 'dra']] };
Game.WX = WX; Game.WX_MS = 5 * 60000;
const BIO_WX = { meadow: { clear: 4, sun: 3, rain: 3, wind: 1 }, forest: { clear: 3, rain: 3, fog: 3 }, cave: { clear: 6, fog: 3, sand: 1 }, beach: { clear: 3, sun: 4, rain: 3, wind: 1 }, swamp: { rain: 5, fog: 4, clear: 2 }, hills: { clear: 3, wind: 4, sun: 2, rain: 1 }, flowers: { sun: 4, clear: 4, rain: 2 }, power: { clear: 4, rain: 4, fog: 1 }, canyon: { sun: 4, sand: 4, clear: 2 }, lake: { rain: 4, clear: 3, fog: 3 }, volcano: { sun: 6, clear: 2, sand: 2 }, peaks: { snow: 4, wind: 3, clear: 3 }, desert: { sand: 5, sun: 4, clear: 1 }, oasis: { sun: 4, clear: 3, rain: 2, sand: 1 }, grave: { fog: 6, rain: 2, clear: 2 }, jungle: { rain: 5, sun: 3, fog: 2 }, city: { clear: 6, rain: 3, fog: 1 }, magma: { sun: 7, sand: 3 }, tundra: { snow: 6, clear: 2, wind: 2 }, glacier: { snow: 7, wind: 2, fog: 1 }, ruins: { fog: 4, sand: 3, clear: 3 }, abyss: { rain: 5, fog: 5 }, fairy: { clear: 4, fog: 3, sun: 3 }, dragon: { wind: 5, clear: 3, sun: 2 }, victory: { clear: 4, sand: 3, wind: 3 }, storm: { rain: 7, wind: 3 }, sky: { wind: 5, clear: 4, sun: 1 }, distortion: { fog: 7, clear: 3 }, ultra: { fog: 4, clear: 4, rain: 2 }, origin: { clear: 4, sun: 3, fog: 3 } };
const whash = (a, b) => { let h = (a * 2654435761 ^ b * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 };
Game.zoneWeather = (zid, t = Date.now()) => {
  const z = Game.zone(zid); const tab = BIO_WX[z && z.bio] || { clear: 1 }; const slot = Math.floor(t / Game.WX_MS); let r = whash(zid * 7919 + 13, slot) * Object.values(tab).reduce((a, b) => a + b, 0); let k = 'clear';
  for (const [w, n] of Object.entries(tab)) { r -= n; if (r < 0) { k = w; break } }
  return { k, n: WX[k][0], ic: WX[k][1], battle: WX[k][2], types: WX[k][3], left: Game.WX_MS - (t % Game.WX_MS) };
};
Game.rollEncounter = (zid) => {
  const z = Game.zone(zid); const night = Game.isNight();
  const list = Game.zoneSpecies(zid, night);
  const by = { commun: [], peucommun: [], rare: [], epique: [], legendaire: [] };
  for (const id of list) { const r = sp(id).rar; (by[r] || by.commun).push(id) }
  const inc = S.inc; const incX = k => inc && inc.k === k ? inc.x : 1;
  let tier;
  if (by.legendaire.length && R() < (1 / RATE.leg) * incX('legendaire')) tier = 'legendaire';
  else if (by.epique.length && R() < (1 / RATE.epic) * incX('epique')) tier = 'epique';
  else {
    const w = { commun: 65, peucommun: 35 };
    if (by.rare.length && R() < (1 / RATE.rare) * incX('rare')) tier = 'rare';
    const avail = tier ? [] : Object.keys(w).filter(k => by[k].length);
    if (tier) { } else if (!avail.length) tier = by.rare.length ? 'rare' : by.epique.length ? 'epique' : 'legendaire';
    else { const tot = avail.reduce((a, k) => a + w[k], 0); let r = R() * tot; tier = avail[avail.length - 1]; for (const k of avail) { r -= w[k]; if (r < 0) { tier = k; break } } }
  }
  const pool = by[tier].length ? by[tier] : list;
  // weather: Pokémon of the boosted types come 1.4 times more often
  const wx = Game.zoneWeather(zid); let id;
  if (wx.types.length && pool.length > 1) { const ws = pool.map(x => sp(x).t.some(t => wx.types.includes(t)) ? 1.4 : 1); let r = R() * ws.reduce((a, b) => a + b, 0); id = pool[pool.length - 1]; for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r < 0) { id = pool[i]; break } } } else id = pick(pool);
  // Halloween event: the Pokémon with a Halloween palette that live in this zone show up 1 time in 100
  if (Game.hwSeason() && tier !== 'legendaire') { const hwl = list.filter(x => Game.HW_IDS.includes(x)); if (hwl.length && R() < Game.HW_RATE) { id = pick(hwl); tier = sp(id).rar } }
  // catch combo: the species you keep catching shows up more often (up to +25 %), Légendaires excepted
  const ch = S.chain; if (ch && ch.n >= 2 && list.includes(ch.s) && sp(ch.s).rar !== 'legendaire' && R() < Game.chainBoost()) { id = ch.s; tier = sp(id).rar }
  // Journée Communauté: its Pokémon replaces about 1 encounter in 3, in every zone (Légendaires keep their place)
  const cd = Game.cdayActive(); if (cd && tier !== 'legendaire' && R() < Game.CD_RATE) { id = cd.s; tier = sp(id).rar || 'commun' }
  const s = sp(id);
  let lv = ri(z.lv[0], z.lv[1]);
  if (tier === 'legendaire') lv = z.lv[1] + 5; else if (tier === 'epique') lv = z.lv[1] + ri(0, 2);
  if (s.rq > lv) lv = Math.min(100, s.rq + ri(0, 2));
  lv = Math.min(100, lv);
  const sh = R() < Game.shinyRate() * (S.chain && S.chain.s === id ? Game.chainShinyMult() : 1) * (cd && cd.s === id ? Game.CD_SHINY : 1);
  const hw = Game.hwSeason() && !!Game.hwURL(id, false) && R() < Game.HW_PAL;
  if (inc) { inc.left--; if (inc.left <= 0) S.inc = null }
  // seen / encounter counters are updated when the battle starts, not here (fleeing an encounter does not count)
  const ha = !!(sp(id).ha && R() < Game.haRate(id)); // the hidden ability is decided with the encounter, so the game can show it (and the farm can stop on it)
  return { id, lv, sh, tier, hw, ha };
};
// wild held items: rare on purpose (about 1 Pokémon in 12 holds something)
const WILD_ITEMS = [['Mini Champi', 25], ['Perle', 20], ['Poussière Étoile', 15], ['Baie Oran', 10], ['Gros Champi', 8], ['Baie Sitrus', 7], ['Grosse Perle', 6], ['Morceau d’Étoile', 4], ['Pépite', 3], ['Baie Prine', 3], ['Collier Perle', 1], ['Pépite Comète', 0.6], ['Grosse Pépite', 0.4]];
// wild Pokémon hold nothing; after a win in the wild there is a small chance (1/32) to find one of these
Game.WILD_DROP = 0; // wild Pokémon no longer drop items: treasures are in the Mine souterraine
Game.rollWildItem = () => { if (R() >= Game.WILD_DROP) return ''; const tot = WILD_ITEMS.reduce((a, x) => a + x[1], 0); let r = R() * tot; for (const [n, w] of WILD_ITEMS) { r -= w; if (r < 0) return n } return WILD_ITEMS[0][0] };
Game.chainShinyMult = () => { const ch = S.chain; return ch && ch.n >= 2 ? 1 + Math.min(30, ch.n) / 30 * 0.75 : 1 };
// boost depends on the species' rarity: commons come back very often, rares and epics only a little more often
Game.CHAIN_CAP = { commun: [0.25, 17], peucommun: [0.2, 20], rare: [0.04, 40], epique: [0.015, 60] };
Game.chainBoost = () => { const ch = S.chain; if (!ch || ch.n < 2) return 0; const c = Game.CHAIN_CAP[sp(ch.s).rar]; return c ? c[0] * Math.min(1, ch.n / c[1]) : 0 };
// catch combo: from 50 captures in a row of the same species, hidden ability 1/100 instead of 1/300
Game.haRate = id => S && S.chain && S.chain.s === id && S.chain.n >= 50 ? 1 / 100 : 1 / 300;
Game.makeWild = enc => {
  const s = sp(enc.id);
  const ab = enc.ha === true ? 'h' : enc.ha === false ? ri(0, Math.max(0, s.ab.length - 1)) : undefined;
  const m = P.makeMon(enc.id, enc.lv, { sh: enc.sh, perfect: Math.max(enc.perfect || 0, s.rar === 'legendaire' ? 3 : s.rar === 'epique' ? 1 : 0), haRate: Game.haRate(enc.id), ab });
  m.it = ''; if (enc.hw) m.hw = 1;
  // wild Legendaries always know their signature move, whatever their level
  if (s.rar === 'legendaire') { const k = Game.sigMove(enc.id); if (k && !m.m.some(x => x[0] === k)) { const mv = P.mv(k); if (m.m.length < 4) m.m.push([k, mv.pp]); else { let wi = 0, wp = 1e9; m.m.forEach((x, i) => { const p = (P.mv(x[0]) || {}).p || 0; if (p < wp) { wp = p; wi = i } }); m.m[wi] = [k, mv.pp] } } }
  return m;
};
let SIGN = null;
Game.sigMove = id => {
  if (!SIGN) { SIGN = {}; for (const i of P.ALL_IDS) { const x = sp(i); if (!x) continue; for (const k of new Set([...x.lv.map(l => l[1]), ...x.tm])) SIGN[k] = (SIGN[k] || 0) + 1 } }
  const s = sp(id); const L = s.lv.map(l => l[1]).filter(k => P.mv(k) && P.mv(k).p > 0); const pw = k => P.mv(k).p;
  return L.filter(k => SIGN[k] <= 4).sort((a, b) => pw(b) - pw(a))[0] || L.filter(k => s.t.includes(P.mv(k).t)).sort((a, b) => pw(b) - pw(a))[0] || '';
};

// ---------- Mine souterraine (unlocked with the 1st badge): dig a wall to uncover treasures, evolution stones and plates
// ---------- partner Pokémon: the bond (m.pf) stays on each Pokémon, but only the active partner (in the team) gives its bonuses
// m.ph = hearts (0-5), m.pf = progress toward the next heart (reset to 0 at each new heart). PRT_T[h] = Pokémon to defeat to go from h to h+1 hearts
const PRT_T = [500, 1500, 3000, 6000, 10000]; Game.PRT_T = PRT_T; Game.PRT_FEED = 3;
const prtFix = m => { if (m && m.ph == null) { m.ph = 0; m.pf = m.pf || 0 } return m };
Game.hearts = m => m ? prtFix(m).ph : 0;
Game.heartNeed = m => { const h = Game.hearts(m); return h >= 5 ? 0 : PRT_T[h] };
Game.partnerMon = () => S.partner ? (Game.findMon(S.partner) || [null])[0] : null;
Game.partner = () => S.partner ? S.team.find(x => x.u === S.partner) || null : null;
Game.setPartner = u => { S.partner = u || ''; const m = u ? Game.partnerMon() : null; if (m && !m.pfD) m.pfD = Date.now() };
Game.partnerGain = n => { const m = Game.partner(); if (!m) return 0; prtFix(m); if (m.ph >= 5) return 0; m.pf += n; let up = 0; while (m.ph < 5 && m.pf >= PRT_T[m.ph]) { m.pf -= PRT_T[m.ph]; m.ph++; up = m.ph } if (m.ph >= 5) m.pf = 0; if (up) S.stats.prtMax = Math.max(S.stats.prtMax || 0, up); return up };
Game.berries = () => Object.keys(S.items).filter(n => /^Baie /.test(n) && S.items[n] > 0).sort((a, b) => ((P.IT[a] && P.IT[a].p) || 0) - ((P.IT[b] && P.IT[b].p) || 0));
Game.feedLeft = () => { const d = new Date().toDateString(); if (!S.pfFeed || S.pfFeed.d !== d) S.pfFeed = { d, n: 0 }; return Game.PRT_FEED - S.pfFeed.n };
Game.partnerFeed = () => { const m = Game.partner(); const b = Game.berries()[0]; if (!m || !b || Game.feedLeft() <= 0) return null; Game.add(b, -1); S.pfFeed.n++; const up = Game.partnerGain(5); return { b, up } };
const PRT_LOOT = [['Baie Oran', 30], ['Baie Sitrus', 18], ['Baie Prine', 10], ['Super Potion', 14], ['Hyper Potion', 8], ['Rappel', 8], ['Super Ball', 10], ['Hyper Ball', 5], ['Huile', 3], ['Rappel Max', 1]];
Game.partnerFind = (farm) => { const m = Game.partner(); if (!m || Game.hearts(m) < 2 || R() >= (farm ? 1 / 60 : 1 / 15)) return ''; /* rarer during the auto farm */ const L = PRT_LOOT.filter(x => P.IT[x[0]]); if (!L.length) return ''; let r = R() * L.reduce((a, x) => a + x[1], 0); for (const [n, w] of L) { r -= w; if (r < 0) { Game.add(n, 1); return n } } return '' };
// the mine works with 'coups' (hits): +1 every 2 minutes, 30 at most; a wall is renewed for free once everything has been dug out
const MINE = { W: 20, H: 12, MAX: 30, REGEN: 2 * 60000 }; Game.MINE = MINE;
const STONES = ['Pierre Feu', 'Pierre Eau', 'Pierre Foudre', 'Pierre Plante', 'Pierre Glace', 'Pierre Lune', 'Pierre Soleil', 'Pierre Éclat', 'Pierre Nuit', 'Pierre Aube'];
const PLATES = ['Plaque Flamme', 'Plaque Hydro', 'Plaque Volt', 'Plaque Herbe', 'Plaque Glace', 'Plaque Poing', 'Plaque Toxicité', 'Plaque Terre', 'Plaque Ciel', 'Plaque Esprit', 'Plaque Insecte', 'Plaque Roc', 'Plaque Fantôme', 'Plaque Draco', 'Plaque Ombre', 'Plaque Fer', 'Plaque Pixie'];
// [item, weight, width, height]
const MINE_LOOT = [['Perle', 13, 2, 2], ['Poussière Étoile', 13, 2, 2], ['Mini Champi', 11, 2, 2], ['Pépite', 8, 2, 2], ['Grosse Perle', 6, 3, 3], ['Gros Champi', 6, 3, 3], ['Morceau d’Étoile', 5, 3, 3], ['Collier Perle', 3, 3, 2], ['Pépite Comète', 2, 3, 3], ['Grosse Pépite', 1.2, 3, 3], ['Pierre Ovale', 2, 2, 3], ['Os Épais', 2, 3, 2], ...STONES.map(n => [n, 3, 2, 2]), ...PLATES.map(n => [n, 0.04, 4, 3])].filter(x => P.IT[x[0]]);
Game.MINE_LOOT = MINE_LOOT;
const mineSt = () => { let m = S.mine; if (!m || !m.v2) m = S.mine = { v2: 1, ch: MINE.MAX, t: Date.now(), cur: null }; return m };
Game.mineOpen = () => Game.badges() >= 1;
Game.mineTick = () => { const m = mineSt(); const now = Date.now(); if (m.ch >= MINE.MAX) { m.t = now; return m } const n = Math.floor((now - m.t) / MINE.REGEN); if (n > 0) { m.ch = Math.min(MINE.MAX, m.ch + n); m.t = m.ch >= MINE.MAX ? now : m.t + n * MINE.REGEN } return m };
Game.mineNext = () => { const m = Game.mineTick(); return m.ch >= MINE.MAX ? 0 : MINE.REGEN - (Date.now() - m.t) };
Game.mineNew = () => {
  const m = Game.mineTick(); if (m.cur && !m.cur.over) return null;
  const { W: w, H: h } = MINE; const cell = [];
  // layered rock: mostly 2-3 hits, with harder veins
  const seeds = Array.from({ length: 9 }, () => [R() * w, R() * h, 1 + R() * 3.5]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 1.4 + R() * 1.2; for (const [sx, sy, r] of seeds) { const d = Math.hypot(x - sx, y - sy); if (d < r) v += (1 - d / r) * 1.8 } cell.push(Math.max(1, Math.min(4, Math.round(v)))) }
  const n = 5 + (R() < 0.6 ? 1 : 0) + (R() < 0.3 ? 1 : 0) + (R() < 0.1 ? 1 : 0);
  const items = []; const occ = new Set(); const tot = MINE_LOOT.reduce((a, x) => a + x[1], 0);
  for (let k = 0; k < n; k++) {
    let r = R() * tot, L = MINE_LOOT[0]; for (const x of MINE_LOOT) { r -= x[1]; if (r < 0) { L = x; break } }
    for (let tries = 0; tries < 60; tries++) {
      const x0 = ri(0, w - L[2]), y0 = ri(0, h - L[3]); let ok = true; const cs = [];
      for (let yy = y0; yy < y0 + L[3] && ok; yy++) for (let xx = x0; xx < x0 + L[2]; xx++) { if (occ.has(yy * w + xx)) { ok = false; break } cs.push(yy * w + xx) }
      if (!ok) continue; cs.forEach(c => { occ.add(c); cell[c] = Math.max(cell[c], 2) }); items.push({ n: L[0], x: x0, y: y0, w: L[2], h: L[3], got: 0 }); break;
    }
  }
  m.cur = { cell, orig: cell.slice(), items, over: '', hits: 0 }; S.stats.mineWalls = (S.stats.mineWalls || 0) + 1; return m.cur;
};
// tools: pickaxe = 2 on the cell + 1 around (cross), costs 1 coup; hammer = 2 on the cell + 1 on the 8 around, costs 2 coups
Game.mineHit = (x, y, tool) => {
  const m = Game.mineTick(); const c = m.cur; if (!c || c.over) return null; const { W: w, H: h } = MINE; const cost = tool === 'hammer' ? 2 : 1; if (m.ch < cost) return { found: [], over: '', noch: true };
  if (m.ch >= MINE.MAX) m.t = Date.now(); m.ch -= cost;
  const hit = (xx, yy, d) => { if (xx < 0 || yy < 0 || xx >= w || yy >= h) return; const i = yy * w + xx; c.cell[i] = Math.max(0, c.cell[i] - d) };
  hit(x, y, 2); const around = tool === 'hammer' ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of around) hit(x + dx, y + dy, 1);
  c.hits++;
  const found = [];
  for (const it of c.items) if (!it.got) { let clear = true; for (let yy = it.y; yy < it.y + it.h && clear; yy++) for (let xx = it.x; xx < it.x + it.w; xx++) if (c.cell[yy * w + xx] > 0) { clear = false; break } if (clear) { it.got = 1; Game.add(it.n, 1); found.push(it.n); S.stats.mineItems = (S.stats.mineItems || 0) + 1 } }
  if (c.items.every(it => it.got)) c.over = 'done';
  return { found, over: c.over };
};

// ---------- trainer mon builder
function natureFor(s) {
  const phys = s.bs[1] >= s.bs[3];
  const fast = s.bs[5] >= 80;
  // [plus, minus]
  const want = phys ? (fast ? [5, 3] : [1, 3]) : (fast ? [5, 1] : [3, 1]);
  const i = P.NAT.findIndex(n => n[1] === want[0] && n[2] === want[1]);
  return i < 0 ? 0 : i;
}
function evsFor(s, lv, tier) {
  if (tier < 2) return [0, 0, 0, 0, 0, 0];
  const f = Math.min(1, lv / 60) * (tier >= 3 ? 1 : 0.5);
  const phys = s.bs[1] >= s.bs[3];
  const e = [4, 0, 0, 0, 0, 0]; e[phys ? 1 : 3] = 252; e[5] = 252;
  if (s.bs[5] < 50) { e[5] = 0; e[0] = 252; e[2] = 4 }
  return e.map(x => Math.floor(x * f));
}
// tier: 1 regular, 2 boss/rival, 3 gym/league/tower
Game.buildMon = (id, lv, tier = 1, item = '', opts = {}) => {
  const s = sp(id);
  let pool = s.lv.filter(x => x[0] <= lv).map(x => x[1]);
  if (tier >= 3) pool = pool.concat(s.tm.filter(k => { const m = mv(k); return m && (m.p <= (lv >= 50 ? 200 : lv >= 35 ? 100 : lv >= 20 ? 85 : 70)) }));
  if (tier >= 2 && !pool.length) pool = s.lv.map(x => x[1]);
  pool = [...new Set(pool)];
  const moves = tier >= 2 ? P.bestMoveset(s, pool, null, lv) : pool.slice(-4);
  const m = P.makeMon(id, lv, { moves: moves.length ? moves : undefined, nat: tier >= 2 ? natureFor(s) : undefined, ev: evsFor(s, lv, tier), perfect: tier >= 3 ? 4 : tier >= 2 ? 2 : 0, maxIV: opts.maxIV, it: item });
  if (tier >= 3 && s.ha && opts.hidden) m.ab = 'h';
  return m;
};
// evolve species to the stage fitting a level
Game.evolveTo = (id, lv) => {
  let cur = id, guard = 0;
  while (guard++ < 4) {
    const L = (G.EVO[cur] || []).filter(e => P.sp(e.to) && !P.sp(e.to).n.includes('Méga'));
    if (!L.length) break;
    const e = L.find(x => x.k === 'lv' && lv >= x.lv) || L.find(x => x.k !== 'lv' && lv >= (P.sp(x.to).rq || 30) + 4);
    if (!e) break; cur = e.to;
  }
  return cur;
};
Game.zoneTrainerTeam = (zid, ti) => {
  const z = Game.zone(zid), t = z.tr[ti]; const tier = t.boss ? 2 : 1;
  return t.team.map(([id, lv]) => Game.buildMon(id, lv, tier));
};
const ITEMS_COMP = ['Restes', 'Orbe Vie', 'Ceinture Force', 'Baie Sitrus', 'Casque Brut', 'Veste de Combat', 'Mouchoir Choix', 'Bandeau Choix', 'Lunettes Choix', 'Ceinture Pro', 'Baie Prine', 'Grelot Coque'];
Game.gymTeam = (gi, rematch) => {
  const g = G.GYMS[gi]; const top0 = Math.max(...g.team.map(x => x[1])); const top = 85 + Math.round(gi * 5 / 7); // rematches: 85 to 90
  const team = g.team.map(([id, lv, it, mega]) => Game.buildMon(id, rematch ? Math.max(80, top - (top0 - lv)) : lv, 3, it || '', { hidden: rematch }));
  if (rematch && team.length < 6) {
    const typ = g.type; const pool = P.ALL_IDS.filter(i => { const s = sp(i); return s.t.includes(typ) && s.rar !== 'legendaire' && s.bst >= 480 && !(G.EVO[i] || []).length && !g.team.some(x => x[0] === i) });
    while (team.length < 6 && pool.length) { const id = pool.splice(Math.floor(R() * pool.length), 1)[0]; team.unshift(Game.buildMon(id, Math.min(100, team[0].lv), 3, pick(ITEMS_COMP))) }
  }
  return team;
};
Game.leagueTeam = (i, rematch) => {
  const L = G.LEAGUE[i]; const top0 = Math.max(...L.team.map(x => x[1])); const top = Math.min(90, 88 + Math.round(i / 2)); // rematch: 88-90
  return L.team.map(([id, lv, it], k) => { const lv2 = rematch ? Math.max(82, top - (top0 - lv)) : lv; const st = L.sets && L.sets[k];
    if (!st) return Game.buildMon(id, lv2, 3, it || '', { hidden: rematch });
    // first run: lighter training (30 % EV — 15 % for the Maître —, 1 perfect IV) so the League stays doable; rematch: better trained (60 % EV, 3 perfect IV)
    const m = P.makeMon(id, lv2, { moves: st.moves, nat: st.nat, ev: st.ev.map(x => Math.floor(x * (rematch ? 0.6 : i === 4 ? 0.15 : 0.3))), perfect: rematch ? 3 : 1, it: it || '', ab: st.ab != null ? st.ab : 0 }); m.fr = 255; return m });
};
// rival: starter strong vs the player's
const TRIO = [[1, 4, 7], [152, 155, 158], [252, 255, 258], [387, 390, 393], [495, 498, 501], [650, 653, 656], [722, 725, 728], [810, 813, 816], [906, 909, 912]];
Game.rivalStarter = () => {
  const st = S.starter; const s = sp(st);
  const trio = TRIO.find(t => t.includes(st)) || TRIO[0];
  // grass -> fire beats, fire -> water beats, water -> grass beats
  const idx = trio.indexOf(st); const ctr = idx < 0 ? 1 : (idx + 1) % 3;
  return trio[ctr];
};
Game.rivalTeam = (ri0) => {
  const zid = G.RIVAL_AT[ri0]; const z = Game.zone(zid);
  // the rival never goes above the zone's level cap (its strongest trainer): his starter is exactly at the cap
  const cap = Math.max(...z.tr[z.tr.length - 1].team.map(x => x[1])); const lv = Math.min(z.lv[1] + 1 + (ri0 >= 3 ? 1 : 0), cap - 1); const size = [2, 3, 4, 5, 6][ri0];
  const team = [];
  const pool = [];
  for (let k = 0; k <= zid; k++) for (const id of Game.zone(k + 1 > 30 ? 30 : k + 1).sp) { const s = sp(id); if (s.rar !== 'legendaire' && s.bst >= 280) pool.push(id) }
  const used = new Set();
  let seed = 7 + ri0 * 13;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 };
  while (team.length < size - 1 && pool.length) {
    const id = pool[Math.floor(rnd() * pool.length)]; const evo = Game.evolveTo(id, lv - 2);
    if (used.has(evo)) continue; used.add(evo); team.push(Game.buildMon(evo, lv - 2 - team.length % 2, 2, ri0 >= 2 ? pick(ITEMS_COMP) : ''));
  }
  team.push(Game.buildMon(Game.evolveTo(Game.rivalStarter(), lv + 1), lv + 1, ri0 >= 3 ? 3 : 2, ri0 >= 1 ? 'Baie Sitrus' : ''));
  return team;
};
// battle tower
Game.towerTeam = (n, streak, type) => {
  const boss = streak === 20 || streak === 48;
  const ok = s => !type || s.t.includes(type);
  let pool = P.ALL_IDS.filter(i => { const s = sp(i); return ok(s) && s.rar !== 'legendaire' && s.bst >= 450 && s.bst <= 600 && !(G.EVO[i] || []).length });
  if (type && pool.length < n + 2) pool = P.ALL_IDS.filter(i => { const s = sp(i); return ok(s) && s.rar !== 'legendaire' && s.bst >= 380 });
  let legs = P.ALL_IDS.filter(i => { const s = sp(i); return ok(s) && s.rar === 'legendaire' && s.bst >= 580 && s.bst <= 680 });
  if (!legs.length) legs = pool;
  const team = []; const used = new Set();
  while (team.length < n) {
    const id = boss && team.length < (streak === 48 ? 2 : 1) ? pick(legs) : pick(pool);
    if (used.has(id)) continue; used.add(id);
    let it = pick(ITEMS_COMP);
    if (P.MEGA_BY_BASE[id] && P.MEGA_BY_BASE[id][0].stone && R() < 0.5) it = P.MEGA_BY_BASE[id][0].stone;
    const m = Game.buildMon(id, 50, 3, it, { maxIV: streak >= 14, hidden: R() < 0.3 });
    if (streak >= 7) m.ev = evsFor(sp(id), 60, 3);
    team.push(m);
  }
  return team;
};

// ---------- eggs
// one-time compensation gift: a random Épique, always chromatique (no Légendaires / Fabuleux)
Game.compEgg = () => { const pool = Game.shTradePool().filter(id => sp(id).rar === 'epique' && !sp(id).from); const id = pick(pool); const m = P.makeMon(id, 5, { sh: true, perfect: 1 }); m.ball = 'Mémoire Ball'; m.fr = 120; m.egg = 1; m.ot = 'Cadeau'; return m };
Game.hatch = (type) => {
  const pool = P.ALL_IDS.filter(id => { const s = sp(id); return s.t.includes(type) && ['rare', 'epique', 'legendaire'].includes(s.rar) });
  const by = t => pool.filter(id => sp(id).rar === t);
  let tier = R() < 1 / 1000 ? 'legendaire' : R() < 1 / 50 ? 'epique' : 'rare';
  let list = by(tier); if (!list.length) list = by('epique'); if (!list.length) list = by('rare'); if (!list.length) list = pool;
  const id = pick(list); const s = sp(id);
  const m = P.makeMon(id, 5, { sh: R() < Game.shinyRate(), perfect: s.rar === 'legendaire' ? 3 : 0 }); m.ball = 'Poké Ball'; m.fr = 120; m.egg = 1; Game.qev('hatch');
  return m;
};
// ---------- Pension (Métamorph + one Pokémon of any species, legendaries included). Two pensions: the 2nd is bought.
const DITTO = 132;
Game.FUSE_COST = 0; Game.EGG_MAX = 12; Game.EGG_SHINY = 1000; Game.DC2_PRICE = 150000;
Object.defineProperty(Game, 'EGG_MS', { get: () => (S && S.flags.oval ? 7 : 10) * 60 * 1000 });
const DC = (i = 0) => i ? S.daycare2 : S.daycare;
Game.dc = DC;
Game.dcCount = () => S.flags.dc2 ? 2 : 1;
Game.dcEggs = () => { let n = 0; for (let i = 0; i < Game.dcCount(); i++) n += DC(i).eggs; return n };
Game.dcPair = (i = 0) => { const d = DC(i); return d.a && d.b && (d.a.s === DITTO) !== (d.b.s === DITTO) ? (d.a.s === DITTO ? [d.a, d.b] : [d.b, d.a]) : null };
Game.dcTick = (i) => {
  if (i == null) { for (let k = 0; k < Game.dcCount(); k++) Game.dcTick(k); return }
  const d = DC(i); if (!Game.dcPair(i)) { d.t = 0; return }
  const now = Date.now(); if (!d.t) d.t = now;
  if (d.eggs >= Game.EGG_MAX) { d.t = now; return }
  const n = Math.floor((now - d.t) / Game.EGG_MS); if (n > 0) { d.eggs = Math.min(Game.EGG_MAX, d.eggs + n); d.t += n * Game.EGG_MS; if (d.eggs >= Game.EGG_MAX) d.t = now }
};
Game.dcLeft = (i = 0) => { const d = DC(i); if (!Game.dcPair(i) || d.eggs >= Game.EGG_MAX) return 0; return Math.max(0, d.t + Game.EGG_MS - Date.now()) };
Game.dcPut = (i, slot, u) => {
  const [m] = Game.findMon(u); if (!m) return 'Pokémon introuvable.';
  if (S.team.includes(m) && S.team.length <= 1) return 'Gardez au moins un Pokémon dans votre équipe.';
  if (slot === 'b' && P.sp(m.s).rar === 'legendaire') return 'Les Pokémon légendaires ne sont pas acceptés à la Pension.';
  Game.dcTake(i, slot); Game.removeMon(m); m.hp = P.maxHP(m); m.st = ''; DC(i)[slot] = m; DC(i).t = 0; Game.dcTick(i); return '';
};
Game.dcTake = (i, slot) => { const d = DC(i); const m = d[slot]; if (!m) return null; d[slot] = null; if (S.team.length < 6) S.team.push(m); else Game.pcAdd(m); d.t = 0; return m };
Game.dcUnlock = () => { if (S.flags.dc2 || S.money < Game.DC2_PRICE) return false; S.money -= Game.DC2_PRICE; S.flags.dc2 = 1; return true };
Game.eggSpecies = id => { let s = sp(id), guard = 0; while (s.from && sp(s.from) && guard++ < 5) s = sp(s.from); return s.id };
Game.breed = (i = 0) => {
  const pr = Game.dcPair(i); if (!pr) return null; const [ditto, mon] = pr; const parents = [ditto, mon];
  const id = Game.eggSpecies(mon.s); const s = sp(id);
  const m = P.makeMon(id, 1, { sh: R() < 1 / Game.EGG_SHINY }); // fixed 1/1000 (the Pension runs on its own): the Charme Chroma does not apply to eggs
  // IVs: 3 inherited (5 with a Nœud Destin), each from a random parent
  const nIv = parents.some(p => p.it === 'Nœud Destin') ? 5 : 3;
  const stats = [0, 1, 2, 3, 4, 5].sort(() => R() - .5).slice(0, nIv);
  for (const k of stats) m.iv[k] = pick(parents).iv[k];
  // nature: Pierre Stase
  const st = parents.filter(p => p.it === 'Pierre Stase'); if (st.length) m.nat = pick(st).nat;
  // ability: from the non-Ditto parent (hidden ability passes 60 % of the time)
  if (mon.ab === 'h' && s.ha) m.ab = R() < 0.6 ? 'h' : ri(0, Math.max(0, s.ab.length - 1));
  else if (R() < 0.8) m.ab = Math.min(mon.ab | 0, Math.max(0, s.ab.length - 1));
  m.ball = (mon.ball && mon.ball !== 'Master Ball') ? mon.ball : 'Poké Ball'; m.fr = 120; m.egg = 1;
  if (m.sh) m.rib = ['pension'];
  return m;
};
Game.dcCollect = (i = 0) => { Game.dcTick(i); const d = DC(i); if (d.eggs <= 0) return null; const m = Game.breed(i); if (!m) return null; d.eggs--; if (d.eggs === Game.EGG_MAX - 1) d.t = Date.now(); Game.qev('hatch'); return m };

// ---------- Halloween palette (20 October – 15 November, from the device's date): 1 encounter in 50 of these species
Game.HW_IDS = [302, 172, 25, 26, 92, 93, 94]; Game.HW_RATE = 1 / 100; Game.HW_PAL = 1 / 50;
// Halloween palettes in the Pokédex (rareté « Événement »): 1 seen, 2 caught, 4 chromatique caught
Game.hwDex = id => (S.dexHW && S.dexHW[id]) || 0; Game.hwDexSet = (id, bits) => { if (!Game.HW_IDS.includes(id)) return; S.dexHW = S.dexHW || {}; S.dexHW[id] = (S.dexHW[id] || 0) | bits };
Game.hwSeason = (d = new Date()) => { const mo = d.getMonth() + 1, day = d.getDate(); return (mo === 10 && day >= 20) || (mo === 11 && day <= 15) };
// Halloween palettes: HD sprites (front for the foe and the Pokédex, back when it is yours)
Game.hwURL = (id, sh, back) => { const T = back ? W.HWB : W.HWF; return (T && T[id] && T[id][sh ? 's' : 'n']) || '' };

// ---------- zone achievements
Game.ZACH = [
  ['coll', 'Collectionneur', 'Capturer toutes les espèces de la zone', z => z.sp.every(id => Game.caught(id)), z => ({ money: 1000 + 150 * z.id })],
  ['trainers', 'Invaincu', 'Battre tous les dresseurs de la zone', z => z.tr.every((t, i) => Game.zst(z.id).tr.includes(i)), z => ({ money: 500 + 100 * z.id })],
  ['shiny', 'Chasseur chromatique', 'Capturer un chromatique d’une espèce de la zone', z => z.sp.some(id => Game.shinyCaught(id)), z => ({ items: [['Hyper Ball', 5]] })],
  ['master', 'Maître de la zone', 'Obtenir les 3 autres succès', z => ['coll', 'trainers', 'shiny'].every(k => Game.ZACH.find(a => a[0] === k)[3](z)), z => ({ money: 2000 + 300 * z.id, items: [['Super Bonbon', 1]] })],
];
Game.zachState = z => { S.zach = S.zach || {}; const got = S.zach[z.id] || []; return Game.ZACH.map(a => ({ k: a[0], n: a[1], d: a[2], ok: a[3](z), claimed: got.includes(a[0]), rw: a[4](z) })) };
Game.zachClaim = (z, k) => { const a = Game.zachState(z).find(x => x.k === k); if (!a || !a.ok || a.claimed) return null; (S.zach[z.id] = S.zach[z.id] || []).push(k); if (a.rw.money) S.money += a.rw.money; for (const [n, q] of a.rw.items || []) Game.add(n, q); return a.rw };

// ---------- ribbons / badges on Pokémon
Game.RIB = {
  starter: ['Partenaire', 'Votre tout premier Pokémon.', '♥', '#e5484d'],
  league: ['Ruban Maître', 'A remporté la Ligue Pokémon.', '♛', '#f5c542'],
  pension: ['Né à la Pension ✦', 'Chromatique éclos à la Pension.', '✦', '#ff9ad5'],
  raid: ['Ruban Téra', 'Capturé dans un Raid Téra.', '◆', '#5fd3f3'],
  tower: ['Ruban Tour', 'A battu Orion, la Tête de la Tour de Combat.', '♜', '#a78bfa'],
  perfect: ['IV parfaits', 'Les 6 IV sont à 31.', '★', '#7ee787'],
  lv100: ['Niveau 100', 'A atteint le niveau maximum.', 'C', '#fb923c'],
  bond: ['Ruban Lien', '5 cœurs avec son Dresseur.', '💗', '#ff6b9a'],
  halloween: ['Halloween', 'Palette spéciale Halloween (20 octobre – 15 novembre).', '☾', '#ff8c2e'],
};
Game.ribbons = m => { const r = [...(m.rib || [])]; if (m.hw) r.push('halloween'); if (m.iv.every(v => v === 31)) r.push('perfect'); if (m.lv >= 100) r.push('lv100'); if (Game.hearts(m) >= 5) r.push('bond'); return r.filter(k => Game.RIB[k]) };
Game.addRib = (m, k) => { if (!m) return; m.rib = m.rib || []; if (!m.rib.includes(k)) m.rib.push(k) };

// ---------- Pokédex counters (seen, caught, shiny seen, shiny caught)
Game.dexInc = (id, i, n = 1) => { const c = S.dexN[id] || (S.dexN[id] = [0, 0, 0, 0]); c[i] += n };
Game.dexN = id => S.dexN[id] || [0, 0, 0, 0];

// ---------- Raids Téra (one every 3 hours, inspired by Scarlet/Violet)
Game.RAID_MS = 3 * 3600 * 1000;
Game.raidStarsRange = () => { const b = Game.badges(); if (S.champ) return [5, 6]; if (b >= 6) return [4, 5]; if (b >= 4) return [3, 4]; if (b >= 2) return [2, 3]; return [1, 2] };
const RAID_LV = [0, 12, 20, 35, 50, 75, 90], RAID_HP = [0, 3, 4, 5, 6, 8, 10];
Game.raidRoll = () => {
  const [a, b] = Game.raidStarsRange(); const stars = ri(a, b);
  // a Légendaire can show up in any raid, 1 time in 1 000
  const want = R() < 1 / 1000 ? ['legendaire'] : stars <= 2 ? ['commun', 'peucommun'] : stars <= 3 ? ['peucommun', 'rare'] : stars === 4 ? ['rare', 'epique'] : ['epique'];
  const pool = P.ALL_IDS.filter(id => want.includes(sp(id).rar) && id !== 132);
  const id = pick(pool); const s0 = sp(id);
  const tera = stars >= 5 || R() < 0.4 ? pick(P.TYPES) : pick(s0.t);
  return { s: id, stars, lv: RAID_LV[stars], hp: RAID_HP[stars], tera, sh: R() < 1 / 300 }; // raids: 1/300
};
Game.raidFresh = () => { if (!S.raid) S.raid = { next: 0, cur: null }; if (!S.raid.cur && Date.now() >= S.raid.next) S.raid.cur = Game.raidRoll(); return S.raid };
Game.raidLeft = () => Math.max(0, (S.raid ? S.raid.next : 0) - Date.now());
Game.raidReady = () => { if (!S) return 0; Game.raidFresh(); return S.raid.cur ? 1 : 0 };
Game.raidRewardInfo = stars => {
  const pool = [['Pépite', 1], ['Super Bonbon', 2], ['Pilule Talent', 1], ['Nœud Destin', 1], ['Pierre Stase', 1], ['Grosse Perle', 2], ['Hyper Ball', 5]];
  if (stars >= 4) pool.push(['Patch Talent', 1], ['Grosse Pépite', 1], ['Encens Épique', 1]);
  return { money: [0, 600, 1200, 2500, 5000, 9000, 15000][stars], candy: ['Bonbon Exp. ' + ['', 'S', 'S', 'M', 'M', 'L', 'XL'][stars], Math.ceil(stars / 2)], picks: Math.ceil(stars / 3), pool, mint: stars >= 4 ? 0.5 : 0, master: stars >= 6 ? 0.05 : 0 };
};
Game.raidRewards = stars => {
  const out = [['Bonbon Exp. ' + ['', 'S', 'S', 'M', 'M', 'L', 'XL'][stars], Math.ceil(stars / 2)]];
  const pool = Game.raidRewardInfo(stars).pool;
  for (let k = 0; k < Math.ceil(stars / 3); k++) out.push(pick(pool));
  const mints = P.NAT.map((n, i) => n[1] !== n[2] ? 'Aromate ' + n[0] : null).filter(Boolean); if (stars >= 4 && R() < 0.5) out.push([pick(mints), 1]);
  if (stars >= 6 && R() < 0.05) out.push(['Master Ball', 1]);
  return { money: [0, 600, 1200, 2500, 5000, 9000, 15000][stars], items: out };
};
Game.raidDone = win => { if (!win) return; S.raid.cur = null; S.raid.next = Date.now() + Game.RAID_MS };

// ---------- quests (daily and weekly, the same for everyone on a given day)
const QT = {
  catch: { n: (q) => `Capturer ${q.goal} Pokémon` },
  catchT: { n: (q) => `Capturer ${q.goal} Pokémon de type ${P.TL[q.ty]}` },
  wild: { n: (q) => `Vaincre ${q.goal} Pokémon sauvages` },
  trainer: { n: (q) => `Battre ${q.goal} dresseurs` },
  enc: { n: (q) => `Combattre ${q.goal} Pokémon sauvages` },
  evtrain: { n: (q) => `Gagner ${q.goal} combats d’entraînement EV` },
  fuse: { n: (q) => `Faire ${q.goal} fusion${q.goal > 1 ? 's' : ''}` },
  hatch: { n: (q) => `Faire éclore ${q.goal} œuf${q.goal > 1 ? 's' : ''} de type (Tour de Combat)` },
  tower: { n: (q) => `Gagner ${q.goal} combats à la Tour` },
};
const DAILY = [['catch', 6], ['catchT', 3], ['wild', 15], ['trainer', 3], ['enc', 20], ['evtrain', 5], ['fuse', 1], ['tower', 3]];
const WEEKLY = [['catch', 40], ['catchT', 12], ['wild', 100], ['trainer', 20], ['enc', 150], ['evtrain', 30], ['fuse', 6], ['tower', 20]];
function dayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function weekKey() { const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return 'W' + dayKey(d) }
function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296 } }
// rewards rebalanced: 1 500 – 3 000 ₽ a day, 12 000 – 20 000 ₽ a week
const questMoney = (x, weekly) => weekly ? 12000 + Math.round(x * 8) * 1000 : 1500 + Math.round(x * 6) * 250;
function makeQuests(key, pool, weekly) {
  const r = seeded(key); const list = pool.slice().sort(() => r() - .5).filter(([k]) => S.champ || k !== 'tower').slice(0, 3);
  return list.map(([k, goal], i) => {
    const q = { k, goal, p: 0, done: 0, rv: 2 };
    if (k === 'catchT') q.ty = P.TYPES[Math.floor(r() * P.TYPES.length)];
    const money = questMoney(r(), weekly);
    const pool2 = weekly ? [['Bonbon Exp. XL', 3], ['Super Bonbon', 5], ['Encens Épique', 1], ['Nœud Destin', 1], ['Pierre Stase', 1], ['Hyper Ball', 20], ['Œuf ' + P.TL[P.TYPES[Math.floor(r() * P.TYPES.length)]], 1]]
      : [['Bonbon Exp. M', 3], ['Bonbon Exp. L', 1], ['Super Bonbon', 1], ['Hyper Ball', 5], ['Baie Sitrus', 2], ['Encens Rare', 1]];
    const it = pool2[Math.floor(r() * pool2.length)];
    q.rw = { money, it: it[0], q: it[1] };
    return q;
  });
}
Game.QT = QT;
Game.questsFresh = () => {
  const d = dayKey(), w = weekKey();
  if (!S.quests.d || S.quests.d.key !== d) S.quests.d = { key: d, list: makeQuests(d, DAILY, false) };
  if (!S.quests.w || S.quests.w.key !== w) S.quests.w = { key: w, list: makeQuests(w, WEEKLY, true) };
  // quests created before the rebalance keep their progress but get the new, smaller money reward
  for (const [g, wk] of [[S.quests.d, false], [S.quests.w, true]]) for (const q of g.list) if (!q.rv) { q.rv = 2; if (!q.done) q.rw.money = Math.min(q.rw.money, questMoney(0.5, wk)) }
  // the Pension is gone: egg quests already given are swapped for a wild-battle quest
  for (const [g, wk] of [[S.quests.d, false], [S.quests.w, true]]) for (const q of g.list) if (q.k === 'hatch' && !q.done) { q.k = 'wild'; q.goal = wk ? 100 : 15; q.p = 0 }
  return S.quests;
};
Game.qev = (k, n = 1, data) => {
  if (!S) return; Game.questsFresh();
  for (const g of [S.quests.d, S.quests.w]) for (const q of g.list) {
    if (q.done) continue;
    let hit = q.k === k; if (q.k === 'catchT') hit = k === 'catch' && data && data.types && data.types.includes(q.ty);
    if (hit) q.p = Math.min(q.goal, q.p + n);
  }
};
Game.qReady = () => { if (!S) return 0; Game.questsFresh(); let n = 0; for (const g of [S.quests.d, S.quests.w]) for (const q of g.list) if (!q.done && q.p >= q.goal) n++; return n };
Game.qClaim = (g, i) => { const q = S.quests[g] && S.quests[g].list[i]; if (!q || q.done || q.p < q.goal) return null; q.done = 1; S.stats.quests = (S.stats.quests || 0) + 1; S.money += q.rw.money; if (q.rw.it && P.IT[q.rw.it]) Game.add(q.rw.it, q.rw.q); return q.rw };
Game.qLabel = q => QT[q.k].n(q);

// ---------- Pokédex rewards
Game.DEX_RW = [
  { at: 100, money: 25000, items: [['Bonbon Exp. L', 5], ['Nœud Destin', 1]] },
  { at: 300, money: 100000, items: [['Charme Ovale', 1], ['Pierre Stase', 1], ['Patch Talent', 1]] },
  { at: 500, money: 250000, items: [['Master Ball', 3], ['Bonbon Exp. XL', 10]] },
  { at: 1025, money: 0, items: [['Charme Chroma', 1]], charm: 1 },
];
Game.dexClaim = i => {
  const r = Game.DEX_RW[i]; if (!r || S.dexRw.includes(i) || Game.dexCount().cb < r.at) return null;
  S.dexRw.push(i); S.money += r.money; const got = [];
  for (const [n, q] of r.items) { if (n === 'Charme Chroma' && S.flags.charm) { S.money += 500000; Game.add('Master Ball', 5); got.push('500 000 ₽ et 5 Master Ball (vous aviez déjà le Charme Chroma)'); continue } Game.add(n, q); got.push(q > 1 ? `${n} ×${q}` : n) }
  if (r.charm) S.flags.charm = 1; if (r.items.some(x => x[0] === 'Charme Ovale')) S.flags.oval = 1;
  return { money: r.money, got };
};
Game.DEX_SH_RW = [
  { at: 1, money: 5000, items: [['Super Bonbon', 1]] },
  { at: 10, money: 15000, items: [['Super Bonbon', 2]] },
  { at: 50, money: 40000, items: [['Pilule Talent', 1]] },
  { at: 100, money: 75000, items: [['Super Bonbon', 5]] },
  { at: 250, money: 150000, items: [['Patch Talent', 1]] },
  { at: 500, money: 300000, items: [['Patch Talent', 1], ['Super Bonbon', 10]] },
  { at: 1025, money: 750000, items: [['Shinyficateur', 1]] },
];
Game.shDexCount = () => P.ALL_IDS.filter(id => id < 10000 && ((S.dex[id] || 0) & 4)).length;
Game.dexShClaim = i => {
  S.dexShRw2 = S.dexShRw2 || []; const r = Game.DEX_SH_RW[i]; if (!r || S.dexShRw2.includes(i) || Game.shDexCount() < r.at) return null;
  S.dexShRw2.push(i); S.money += r.money; const got = []; for (const [n, q] of r.items) { Game.add(n, q); got.push(q > 1 ? `${n} ×${q}` : n) }
  return { money: r.money, got };
};
// ---------- special shop: 3 chromatiques -> 1 random chromatique (no Légendaires / Fabuleux, regional forms included)
Game.shTradePool = () => P.ALL_IDS.filter(id => { const s = sp(id); return s && !['legendaire', 'event'].includes(s.rar) && !s.myth });
Game.SHT_N = 5; Game.SHT_W = [['epique', 8], ['rare', 17], ['peucommun', 30], ['commun', 45]];
Game.shTrade = us => {
  const N = Game.SHT_N; const ms = us.map(u => Game.findMon(u)[0]); if (ms.length !== N || ms.some(m => !m || !m.sh || m.lock) || new Set(us).size !== N) return { err: `Il faut ${N} chromatiques différents et non verrouillés.` };
  if (S.team.filter(m => !ms.includes(m)).length < 1 && Game.pcAll().length === 0) return { err: 'Gardez au moins un Pokémon.' };
  const lv = Math.max(1, Math.round(ms.reduce((a, m) => a + m.lv, 0) / N));
  for (const m of ms) { if (m.it) Game.add(m.it, 1); Game.removeMon(m) }
  if (!S.team.length) { const f = Game.pcAll()[0]; if (f) { Game.pcRemove(f); S.team.push(f) } }
  const pool = Game.shTradePool(); let tier = 'commun', r = R() * 100; for (const [k, w] of Game.SHT_W) { r -= w; if (r < 0) { tier = k; break } }
  const tp = pool.filter(id => sp(id).rar === tier); const id = pick(tp.length ? tp : pool);
  const m = P.makeMon(id, lv, { sh: true }); m.ball = 'Poké Ball'; m.egg = 1; // egg flag keeps the catch combo intact
  Game.addCaught(m); S.stats.shTrades = (S.stats.shTrades || 0) + 1; Game.save();
  return { mon: m, tier: sp(id).rar, where: S.team.includes(m) ? 'team' : 'box' };
};
// ---------- daily login rewards: a fixed calendar of small gifts, one per day of the month (missed days are lost)
const DRW = [null,
  { money: 1000 }, { it: ['Poké Ball', 5] }, { it: ['Potion', 3] }, { money: 1500 }, { it: ['Super Ball', 3] }, { it: ['Bonbon Exp. S', 2] }, { it: ['Super Bonbon', 1] },
  { money: 2000 }, { it: ['Super Potion', 3] }, { it: ['Baie Sitrus', 1] }, { it: ['Super Ball', 5] }, { money: 2500 }, { it: ['Huile', 2] }, { it: ['Super Bonbon', 1] },
  { it: ['Encens Rare', 1] }, { money: 3000 }, { it: ['Hyper Ball', 2] }, { it: ['Bonbon Exp. M', 1] }, { it: ['Rappel', 2] }, { money: 3500 }, { it: ['Super Bonbon', 1] },
  { it: ['Perle', 2] }, { it: ['Hyper Potion', 2] }, { money: 4000 }, { it: ['Hyper Ball', 3] }, { it: ['Total Soin', 2] }, { it: ['Élixir', 1] }, { it: ['Super Bonbon', 2] },
  { money: 5000 }, { it: ['Pépite', 1] }, { money: 10000, it2: ['Hyper Ball', 5] }];
Game.DRW = DRW;
const ymd = () => { const d = new Date(); return { ym: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), d: d.getDate(), n: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() } };
Game.dailyState = () => { const t = ymd(); if (!S.daily || S.daily.ym !== t.ym) S.daily = { ym: t.ym, got: [] }; return { ...t, got: S.daily.got } };
Game.dailyReady = () => { if (!S) return 0; const t = Game.dailyState(); return t.got.includes(t.d) ? 0 : 1 };
Game.dailyClaim = () => {
  const t = Game.dailyState(); if (t.got.includes(t.d)) return null; const r = DRW[t.d]; const got = [];
  if (r.money) { S.money += r.money; got.push(r.money.toLocaleString('fr-FR') + ' ₽') }
  for (const x of [r.it, r.it2]) if (x && P.IT[x[0]]) { Game.add(x[0], x[1]); got.push(x[1] > 1 ? `${x[0]} ×${x[1]}` : x[0]) }
  S.daily.got.push(t.d); S.stats.daily = (S.stats.daily || 0) + 1; Game.save(); return { day: t.d, got };
};
// ---------- Mystery gifts
Game.GIFTS = {
  OCTOBERGIFT: { off: 1, label: 'Pikachu Casquette', mon: 10094, /* event over: kept only to name it in the list of received gifts */ make: () => { const m = P.makeMon(10094, 15, { moves: ['volt-tackle', 'iron-tail', 'quick-attack', 'electro-ball'], perfect: 3, gd: 'm', ball: 'Mémoire Ball' }); m.fr = 120; m.ot = 'Cadeau mystère'; return m } },
};
// signed gift codes ("VG1.<payload>.<signature>"): made with the private generator tool, checked here with the public key.
// New codes need no game update and work offline; nobody can make a valid code without the private key.
const GIFT_PUB = 'hsYGx8/UcaMbNgy1y+9DbZlJwki2Xsr6yc3ZzfAZGUE=';
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
Game.signedGift = code => {
  const m = /^VG1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(code); if (!m) return null;
  let pl, sig, o; try { pl = b64u(m[1]); sig = b64u(m[2]) } catch (e) { return { err: 'Code abîmé.' } }
  let ok = false; try { ok = !!W.nacl && sig.length === 64 && W.nacl.sign.detached.verify(pl, sig, b64u(GIFT_PUB)) } catch (e) { } if (!ok) return { err: 'Ce code n’est pas valide.' };
  try { o = JSON.parse(new TextDecoder().decode(pl)) } catch (e) { return { err: 'Code abîmé.' } }
  return { o };
};
Game.giftClaim = code => {
  const sg = Game.signedGift(code); if (sg) return sg.err ? sg : Game.signedClaim(sg.o);
  code = code.toUpperCase();
  const g = Game.GIFTS[code]; if (!g) return { err: 'Ce code n’existe pas.' }; if (g.off) return { err: 'Ce code n’est plus valable : l’événement est terminé.' };
  S.gifts = S.gifts || {}; if (S.gifts[code]) return { err: 'Ce code a déjà été utilisé.' };
  const m = g.make(); m.egg = 1; // keeps the catch combo intact
  Game.addCaught(m); const where = S.team.includes(m) ? 'team' : 'box';
  S.gifts[code] = Date.now(); Game.save(); return { mon: m, label: g.label, where };
};
Game.signedClaim = o => {
  if (o.cd) return Game.cdayAdd(o);
  const id = 'S:' + String(o.i || '').slice(0, 24); S.gifts = S.gifts || {}; S.giftInfo = S.giftInfo || {};
  if (S.gifts[id]) return { err: 'Ce code a déjà été utilisé.' };
  if (o.x) { const d = new Date(), today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); if (today > o.x) return { err: 'Ce code a expiré.' } }
  const label = String(o.l || 'Cadeau mystère').slice(0, 40); let mon = null, where = '';
  if (o.p && sp(o.p[0])) { const [s0, fm, lv, sh, perfect] = o.p; mon = P.makeMon(s0, Math.max(1, Math.min(100, +lv || 5)), { sh: !!sh, perfect: Math.max(0, Math.min(6, +perfect || 0)), maxIV: +perfect >= 6, smart: true, ball: 'Mémoire Ball' });
    if (fm && G.FORMS[fm] && (!G.FORMS[fm].b || G.FORMS[fm].b === mon.s)) mon.fm = +fm; mon.hp = P.maxHP(mon); mon.fr = 120; mon.ot = 'Cadeau mystère'; mon.egg = 1;
    Game.addCaught(mon); if (mon.fm) Game.dexSet(mon.fm, 3 | (mon.sh ? 12 : 0)); where = S.team.includes(mon) ? 'team' : 'box' }
  const items = (Array.isArray(o.o) ? o.o : []).filter(([n, q]) => P.IT[n] && +q > 0).map(([n, q]) => [n, Math.min(999, +q)]); for (const [n, q] of items) Game.add(n, q);
  const money = Math.max(0, Math.min(10000000, +o.m || 0)); if (money) S.money += money;
  const pco = Math.max(0, Math.min(100000, +o.c || 0)); if (pco) S.tower.pts = (S.tower.pts || 0) + pco;
  S.gifts[id] = Date.now(); S.giftInfo[id] = { l: label, s: mon ? (mon.fm || mon.s) : 0 }; Game.save();
  return { mon, items, money, pco, label, where, signed: 1 };
};
// ---------- Journée Communauté: a signed code (same private key as the gift codes) chooses a Pokémon and a time window.
// During it, that Pokémon shows up in every zone about 1 battle in 3, with a shiny rate ×4 (1/1000 -> 1/250).
// The codes come from the gift box or from evenement.json on the update site (fetched by the game, no update needed).
Game.CD_RATE = 1 / 3; Game.CD_SHINY = 4;
const cdList = () => S && S.cdays ? Object.values(S.cdays) : [];
Game.cdayActive = (t = Date.now()) => cdList().find(c => t >= c.a && t < c.b && sp(c.s)) || null;
Game.cdayNext = (t = Date.now()) => cdList().filter(c => c.a > t && sp(c.s)).sort((x, y) => x.a - y.a)[0] || null;
Game.cdayAdd = (o, quiet) => {
  const c = o.cd || {}; const id = String(o.i || '').slice(0, 24); const a = +c.a, b = +c.b, s0 = +c.s;
  if (!id || !sp(s0) || !(b > a)) return { err: 'Code d’événement abîmé.' };
  S.cdays = S.cdays || {}; const t = Date.now();
  for (const k of Object.keys(S.cdays)) if (S.cdays[k].b < t - 864e5) delete S.cdays[k]; // forget the old ones
  if (b <= t) return { err: 'Cette Journée Communauté est déjà terminée.' };
  const isNew = !S.cdays[id]; S.cdays[id] = { s: s0, a, b, l: String(o.l || 'Journée Communauté').slice(0, 40) };
  if (isNew && !quiet) Game.save(); else if (isNew) Game.save(true);
  return { cd: S.cdays[id], isNew, label: S.cdays[id].l, signed: 1 };
};
Game.dexReady = () => { if (!S) return 0; const c = Game.dexCount().cb, d = Game.shDexCount(), got = S.dexShRw2 || []; return Game.DEX_RW.filter((r, i) => c >= r.at && !S.dexRw.includes(i)).length + Game.DEX_SH_RW.filter((r, i) => d >= r.at && !got.includes(i)).length };

// ---------- money
// prize money like the main games: a base per trainer class × the level of their strongest Pokémon (a few rich classes pay more)
const CLASS_BASE = { 'Fillette': 16, 'Écolier': 20, 'Scout': 16, 'Insectomane': 16, 'Punk': 24, 'Nageuse': 24, 'Fleuriste': 24, 'Pêcheur': 32, 'Randonneur': 32, 'Karatéka': 32, 'Cracheur de Feu': 32, 'Exorciste': 32, 'Mystimaniac': 32, 'Explorateur': 32, 'Marin': 32, 'Fée': 32, 'Skieuse': 32, 'Ornithologue': 32, 'Duo': 32, 'Montagnard': 40, 'Kinésiste': 40, 'Moine': 40, 'Ruiniste': 40, 'Ceinture Noire': 40, 'Ingénieur': 48, 'Scientifique': 48, 'Ultra-Explorateur': 48, 'Topdresseur': 60, 'Dresseur Ace': 60, 'Vétéran': 80, 'Dresseur Élite': 80, 'Rival': 80, 'Maître Pokémon': 100, 'Touriste': 100, 'Dandy': 200 };
Game.classBase = c => CLASS_BASE[c] || 32;
Game.trainerPrize = (cls, mons) => Math.round((typeof cls === 'number' ? cls : Game.classBase(cls)) * Math.max(...mons.map(m => m.lv)));

// ---------- party helpers
Game.healTeam = () => S.team.forEach(P.heal);
Game.teamAlive = () => S.team.some(m => m.hp > 0);
// a Pokémon received outside a capture (shop, reward): team or PC + Pokédex, no catch quest / combo
Game.giveMon = m => { m.t = Date.now(); if (S.team.length < 6) S.team.push(m); else Game.pcAdd(m); Game.dexSet(m.s, 3 | (m.sh ? 12 : 0)); Game.dexInc(m.s, 1); return S.team.includes(m) ? 'team' : 'box' };
// an own Pokémon coming back from a trade deposit (no capture stats)
Game.addMonBack = m => { if (S.team.length < 6) S.team.push(m); else Game.pcAdd(m) };
Game.addCaught = (m) => {
  const isEgg = !!m.egg;
  m.t = Date.now();
  if (m.ball === 'Soin Ball') P.heal(m);
  if (m.ball === 'Luxe Ball') m.fr = Math.min(255, m.fr + 50);
  if (m.ball === 'Copain Ball') m.fr = Math.max(m.fr, 200);
  if (S.team.length < 6) S.team.push(m); else Game.pcAdd(m);
  Game.dexSet(m.s, 3 | (m.sh ? 12 : 0)); Game.dexInc(m.s, 1); if (m.sh) Game.dexInc(m.s, 3); if (m.hw) Game.hwDexSet(m.s, 3 | (m.sh ? 4 : 0));
  S.stats.caught++; if (m.sh) S.stats.shinies++;
  if (m.egg) { delete m.egg; S.stats.eggs = (S.stats.eggs || 0) + 1; if (m.sh) S.stats.eggSh = (S.stats.eggSh || 0) + 1 } else Game.qev('catch', 1, { types: sp(m.s).t, rar: sp(m.s).rar, sh: !!m.sh, s: m.s });
  const s = sp(m.s); if (s.rar === 'legendaire') S.stats.legs++; if (s.rar === 'epique') S.stats.epics++;
  if (!isEgg) { if (S.chain.s === m.s) S.chain.n++; else S.chain = { s: m.s, n: 1 }; S.stats.chainMax = Math.max(S.stats.chainMax || 0, S.chain.n) }
  return S.team.includes(m) ? 'team' : 'box';
};
})(window);
