// ===== Screens =====
(function (W) {
'use strict';
const P = W.PK, Gm = W.Game, G = W.GD; const { sp, mv, TL, TC, IT } = P; const esc = Gm.esc, fmt = Gm.fmt;
const $ = s => document.querySelector(s);
const wait = ms => W.sleep ? W.sleep(ms) : new Promise(r => setTimeout(r, ms));
const SHI = W.SHICO ? '<img class="shi" src="' + W.SHICO + '" alt="chromatique">' : '✦';
const RAR = { event: ['Événement', 'r-l'], commun: ['Commun', 'r-c'], peucommun: ['Peu commun', 'r-p'], rare: ['Rare', 'r-r'], epique: ['Épique', 'r-e'], legendaire: ['Légendaire', 'r-l'] };
const BIO_NAME = { meadow: 'Prairie', forest: 'Forêt', cave: 'Grotte', beach: 'Plage', swamp: 'Marais', hills: 'Collines', flowers: 'Fleurs', power: 'Centrale', canyon: 'Canyon', lake: 'Lac', volcano: 'Volcan', peaks: 'Montagne', desert: 'Désert', oasis: 'Oasis', grave: 'Cimetière', jungle: 'Jungle', city: 'Ville', magma: 'Magma', tundra: 'Toundra', glacier: 'Glacier', ruins: 'Ruines', abyss: 'Abysses', fairy: 'Féerie', dragon: 'Dragons', victory: 'Victoire', storm: 'Tempête', sky: 'Ciel', distortion: 'Distorsion', ultra: 'Ultra', origin: 'Origine' };
const REGION = 'Valmara';
const typeChip = W.typeChip;
const view = { tab: 'map', zid: 1, dexPage: 1, dexF: { q: '', t: '', z: '', s: '' }, shopTab: 'ball', bagTab: 'all', pcF: { q: '', t: '', sort: 'recent', sh: 0 }, pcPage: 1 };
let busy = false;

const UI = W.UI = {};
UI.itemIcon = (n, cls = 'ii') => {
  const it = IT[n]; const u = Gm.itemURL(n);
  if (u) return `<img class="${cls}${it && it.cat === 'ball' ? ' ballic' : ''}" src="${u}" alt="">`;
  if (it && it.cat === 'ball') return `<span class="${cls} orb-i" style="--bc:${it.col}"></span>`;
  if (n.startsWith('CT ')) { const m = mv(n.slice(3)); const cu = m && Gm.itemURL('CT:' + m.t); if (cu) return `<img class="${cls}" src="${cu}" alt="">`; return `<span class="${cls} ct-i" style="--tc:${m ? TC[m.t] : '#999'}"></span>` }
  const col = it ? ({ revive: '#f4c542', pp: '#6fc3ff', incense: '#c58cff', key: '#ffd23f', held: '#9bd36b', status: '#ff9a8b', heal: '#ff7a9a', mega: '#d96bff', evo: '#7fe0c8' }[it.cat] || '#bbb') : '#bbb';
  return `<span class="${cls} gen-i" style="--gc:${col}"></span>`;
};
const spr = (ix, sh, cls = 'spr') => `<img class="${cls}" src="${Gm.spriteURL(ix, sh)}" alt="" loading="lazy">`;
const monIcon = (m, cls) => { const u = m.hw && !m.fm && ((W.HWI && W.HWI[m.s] && W.HWI[m.s][m.sh ? 's' : 'n']) || Gm.hwURL(m.s, m.sh)); return u ? `<img class="${cls || 'spr'} hwspr" src="${u}" alt="">` : spr(P.monIx(m), m.sh, cls) };
const monName = m => m.nick || (m.fm && G.FORMS[m.fm] ? G.FORMS[m.fm].n : sp(m.s).n);
const gdTag = m => m.gd === 'f' ? ' <i class="gd f" title="Femelle">♀</i>' : m.gd === 'm' ? ' <i class="gd m" title="Mâle">♂</i>' : '';
W.gdTag = gdTag;

// ---------- toast / modal
UI.toast = (t, kind) => { const el = $('#toast'); const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.innerHTML = t; el.appendChild(d); setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3100) };
let modalStack = [];
UI.modal = (html, opts = {}) => new Promise(res => {
  const wrap = document.createElement('div'); wrap.className = 'modal-wrap'; wrap.innerHTML = `<div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true">${opts.noClose ? '' : '<button class="mclose" data-mclose aria-label="Fermer">✕</button>'}${html}</div>`;
  $('#modals').appendChild(wrap); modalStack.push(wrap);
  const close = v => { wrap.remove(); modalStack = modalStack.filter(x => x !== wrap); res(v) };
  wrap.addEventListener('click', e => {
    if (e.target === wrap && !opts.noClose) return close(null);
    const c = e.target.closest('[data-mclose]'); if (c) return close(null);
    const r = e.target.closest('[data-ret]'); if (r && !r.disabled) return close(r.dataset.ret);
    if (opts.onClick) opts.onClick(e, close, wrap);
  });
  if (opts.onOpen) opts.onOpen(wrap, close);
});
UI.confirm = (txt, yes = 'Confirmer', no = 'Annuler') => UI.modal(`<p class="mtxt">${txt}</p><div class="mbtns"><button class="btn" data-ret="0">${no}</button><button class="btn pri" data-ret="1">${yes}</button></div>`, { cls: 'small' }).then(v => v === '1');
UI.alert = (txt, ok = 'OK') => UI.modal(`<div class="mtxt">${txt}</div><div class="mbtns"><button class="btn pri" data-ret="1">${ok}</button></div>`, { cls: 'small', noClose: true });
UI.pickMon = (title, filter, list) => {
  const S = Gm.get(); list = list || S.team;
  const html = `<h3>${title}</h3><div class="pick-list">` + list.map((m, i) => { const ok = !filter || filter(m); const hp = P.maxHP(m); return `<button class="pick" data-ret="${i}" ${ok ? '' : 'disabled'}>${monIcon(m)}<span><b>${esc(monName(m))}</b><small>N.${m.lv} · ${m.hp}/${hp} PV${m.it ? ' · ' + esc(m.it) : ''}</small></span></button>` }).join('') + '</div>';
  return UI.modal(html).then(v => v == null ? null : list[+v]);
};

// ---------- learn move prompt (used in & out of battle)
UI.learnPrompt = (m, k) => {
  const M = mv(k);
  const row = (key, i) => { const x = mv(key); return `<button class="mvrow" data-ret="${i}" style="--tc:${TC[x.t]}"><b>${esc(x.n)}</b><span>${TL[x.t]} · ${x.c === 0 ? 'Statut' : x.c === 1 ? 'Physique' : 'Spécial'} · Puiss. ${x.p || '—'} · Préc. ${x.a || '—'} · PP ${x.pp}</span></button>` };
  const html = `<h3>${esc(monName(m))} veut apprendre ${esc(M.n)}</h3><p class="mdesc">${esc(M.d || '')}</p><div class="mvnew" style="--tc:${TC[M.t]}"><b>${esc(M.n)}</b><span>${TL[M.t]} · ${M.c === 0 ? 'Statut' : M.c === 1 ? 'Physique' : 'Spécial'} · Puiss. ${M.p || '—'} · Préc. ${M.a || '—'} · PP ${M.pp}</span></div><p class="mtxt">Quelle capacité oublier ?</p><div class="mvlist">${m.m.map((x, i) => row(x[0], i)).join('')}</div><div class="mbtns"><button class="btn" data-ret="-1">Ne pas apprendre ${esc(M.n)}</button></div>`;
  return UI.modal(html, { noClose: true }).then(v => v == null ? -1 : +v);
};



// ---------- avatar borders, unlocked by achievements (drawn in borders/gen.js)
const BD_URL = {};
const bdMeta = id => (W.BORDERS || []).find(x => x.id === id);
function borderURL(id) {
  if (!id || !W.BORDER_SVG || !W.BORDER_SVG[id]) return ''; const lite = Gm.get() && Gm.get().set.spr === 'home';
  const k = (lite ? 's:' : 'a:') + id; if (!BD_URL[k]) { const src = (lite && W.BORDER_STILL && W.BORDER_STILL[id]) || W.BORDER_SVG[id]; try { BD_URL[k] = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })) } catch (e) { BD_URL[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src) } }
  return BD_URL[k];
}
const borderOK = id => { const b = bdMeta(id); const S = Gm.get(); return !!b && (!b.ach || !!(S && S.ach && S.ach[b.ach])) };
const myBorder = () => { const S = Gm.get(); const id = S && S.card && S.card.bd; return id && borderOK(id) ? id : '' };
const withBorder = (html, id, cls = '') => id && borderURL(id) ? `<span class="avw ${cls}">${html}<img class="avb" src="${borderURL(id)}" alt="" aria-hidden="true"></span>` : html;
Object.assign(UI, { borderURL, borderOK, myBorder, withBorder });
async function borderPick() {
  const S = Gm.get(); const c = S.card || (S.card = { motto: '', theme: 'nuit', fav: '' }); const cur = myBorder();
  const L = W.BORDERS || []; const okN = L.filter(b => borderOK(b.id)).length; const ph = W.ON && W.ON.myPhoto ? W.ON.myPhoto() : '';
  const face = ph ? `<img class="bdface" src="${esc(ph)}" alt="">` : `<span class="bdface bdi">${esc((S.name || '?')[0].toUpperCase())}</span>`;
  const r = await UI.modal(`<h3>Bordure d’avatar <small class="mut">${okN} / ${L.length} débloquées</small></h3><div class="bdgrid">
    <button class="bdc ${cur ? '' : 'on'}" data-ret="__none"><span class="bdav">${face}</span><b>Aucune</b><small>Sans bordure</small></button>
    ${[...L.filter(b => borderOK(b.id)), ...L.filter(b => !borderOK(b.id))].map(b => { const ok = borderOK(b.id); return `<button class="bdc ${cur === b.id ? 'on' : ''} ${ok ? '' : 'locked'}" ${ok ? `data-ret="${b.id}"` : 'disabled'} title="${esc(b.d)}"><span class="bdav">${face}<img class="avb" src="${borderURL(b.id)}" alt=""></span><b>${ok ? '' : '🔒 '}${esc(b.n)}${b.an ? ' <i class="bdan">✦</i>' : ''}</b><small>${esc(b.d)}</small></button>` }).join('')}</div><p class="mut keep">✦ = bordure animée. Les bordures se débloquent avec les succès.</p><div class="mbtns"><button class="btn" data-ret="">Fermer</button></div>`, { cls: 'wide' });
  if (!r) return; c.bd = r === '__none' ? '' : r; Gm.save(true); header(); render(); if (W.ON && W.ON.syncProfile) W.ON.syncProfile(true);
}
UI.borderPick = borderPick;


// ---------- animated profile banners (drawn in banners/gen.js), open to every player
const BN_URL = {};
function bannerURL(id) {
  if (!id || !W.BANNER_SVG || !W.BANNER_SVG[id]) return ''; const lite = Gm.get() && Gm.get().set.spr === 'home';
  const k = (lite ? 's:' : 'a:') + id; if (!BN_URL[k]) { const src = (lite && W.BANNER_STILL && W.BANNER_STILL[id]) || W.BANNER_SVG[id]; try { BN_URL[k] = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })) } catch (e) { BN_URL[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src) } }
  return BN_URL[k];
}
const bnOK = id => { const b = (W.BANNERS || []).find(x => x.id === id); if (!b) return false; if (b.ex == null) return true; const S = Gm.get(); return !!(S && S.on && (S.on.seasons || []).some(x => x.tier === b.ex)) };
const myBanner = () => { const S = Gm.get(); const id = S && S.card && S.card.bn; return id && W.BANNER_SVG && W.BANNER_SVG[id] && bnOK(id) ? id : '' };
const bannerImg = id => id && bannerURL(id) ? `<img class="bnimg" src="${bannerURL(id)}" alt="" aria-hidden="true"><i class="bnfade"></i>` : '';
Object.assign(UI, { bannerURL, myBanner, bannerImg });
async function bannerPick() {
  const S = Gm.get(); const c = S.card || (S.card = { motto: '', theme: 'nuit', fav: '' }); const cur = myBanner();
  const r = await UI.modal(`<h3>Bannière de profil</h3><div class="bngrid"><button class="bnc ${cur ? '' : 'on'}" data-ret="__none"><span class="bnprev bnnone"></span><b>Aucune</b></button>${(W.BANNERS || []).filter(b => b.ex == null || !W.ONLINE_OFF || bnOK(b.id)).map(b => { const ok = bnOK(b.id); return `<button class="bnc ${cur === b.id ? 'on' : ''} ${ok ? '' : 'locked'}" ${ok ? `data-ret="${b.id}"` : 'disabled'}><span class="bnprev">${bannerImg(b.id)}</span><b>${ok ? '' : '🔒 '}${esc(b.n)}</b>${b.ex != null ? `<small>${ok ? 'Exclusive : rang de fin de saison' : 'Terminez une saison classée à ce rang'}</small>` : ''}</button>` }).join('')}</div><p class="mut keep">Elle s’affiche derrière votre profil et sur votre Carte de Dresseur.</p><div class="mbtns"><button class="btn" data-ret="">Fermer</button></div>`, { cls: 'wide' });
  if (!r) return; c.bn = r === '__none' ? '' : r; Gm.save(true); render(); if (W.ON && W.ON.syncProfile) W.ON.syncProfile(true);
}
UI.bannerPick = bannerPick;


// ---------- profile photo (PNG, JPG, WebP or animated GIF), kept in the save so it also works in the offline zip
async function pickPhoto() {
  const f = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/gif'; i.onchange = () => res(i.files[0] || null); i.click() }); if (!f) return null;
  if (f.size > 8e6) { UI.toast('Image trop lourde (8 Mo max).', 'bad'); return null }
  if (f.type === 'image/gif') { // animated GIFs are kept as they are, so they keep moving
    if (f.size > 500e3) { UI.toast('GIF trop lourd : 500 Ko maximum pour garder l’animation.', 'bad'); return null }
    return await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(null); r.readAsDataURL(f) });
  }
  const url = URL.createObjectURL(f); const img = new Image(); await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url }).catch(() => null); URL.revokeObjectURL(url);
  if (!img.naturalWidth) { UI.toast('Image illisible.', 'bad'); return null }
  const N = 160, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const k = Math.max(N / img.naturalWidth, N / img.naturalHeight); const w = img.naturalWidth * k, h = img.naturalHeight * k; x.drawImage(img, (N - w) / 2, (N - h) / 2, w, h);
  let d = c.toDataURL('image/webp', 0.86); if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/png'); return d;
}
async function setPhoto(clear) {
  const S = Gm.get(); const c = S.card || (S.card = { motto: '', theme: 'nuit', fav: '' });
  const d = clear ? '' : await pickPhoto(); if (d == null) return;
  c.ph = d; Gm.save(true); try { localStorage.setItem('valmara_ph', d) } catch (e) { }
  if (W.ON && W.ON.st === 'on' && W.ON.put) { await W.ON.put('players/' + W.ON.pid, { ph: d }); if (W.ON.D.players[W.ON.pid]) W.ON.D.players[W.ON.pid].ph = d }
  UI.toast(clear ? 'Photo retirée.' : 'Photo de profil mise à jour.'); header(); render();
}
const myFace = (cls = 'tcav') => { const S = Gm.get(); const ph = W.ON && W.ON.myPhoto ? W.ON.myPhoto() : (S.card && S.card.ph) || ''; return withBorder(ph ? `<img class="${cls}" src="${esc(ph)}" alt="">` : `<span class="${cls} tcavi">${esc((S.name || '?')[0].toUpperCase())}</span>`, myBorder(), 'tcavw') };
Object.assign(UI, { pickPhoto, setPhoto });



// ---------- settings helpers
const KEYS = [['explore', 'Explorer'], ['fight', 'Combattre le Pokémon trouvé'], ['ball', 'Dernière Ball (combat)'], ['run', 'Fuir (combat)']];
const keysOf = () => { const S = Gm.get(); const k = (S && S.set.keys) || {}; return { explore: k.explore || 'e', fight: k.fight || 'f', ball: k.ball || (S && S.set.ballKey) || 'b', run: k.run || 'r' } };
const NOTIFS = [['inv', 'Invitations aux combats et échanges'], ['msg', 'Messages, cadeaux et cœurs d’amis'], ['gts', 'Ventes à la GTS'], ['dc', 'Défis du jour réussis'], ['feed', 'Captures rares des autres joueurs']];
const notifOn = k => { const S = Gm.get(); return !(S && S.set.nt && S.set.nt[k] === 0) };
Object.assign(UI, { keysOf, notifOn });
document.addEventListener('change', e => { const o = e.target && e.target.dataset && e.target.dataset.opt; if (!o) return; const S = Gm.get(); if (!S) return; const v = e.target.checked;
  if (o.startsWith('nt.')) { S.set.nt = { ...(S.set.nt || {}), [o.slice(3)]: v ? 1 : 0 } } else if (o === 'cbuy' || o === 'frep') S.set[o] = v ? 1 : 0; else S.set[o] = v ? 1 : 0;
  Gm.save(); applyShCol(); header(); if (o === 'strm' || o === 'hidecos') render() });

// ---------- title screen (shown at every launch)
UI.titleScreen = ({ onContinue, onNew }) => {
  document.getElementById('title')?.remove();
  const S = Gm.get(); const el = document.createElement('div'); el.id = 'title';
  const bg = W.BANNER_SVG ? (bannerURL('aurore') || '') : '';
  const canNew = !S || S.champ || W.ASSET_ROOT;
  const save = S ? `<div class="tsave"><div class="tsav">${(() => { const ph = (S.card && S.card.ph) || (W.ON && W.ON.myPhoto ? W.ON.myPhoto() : ''); return withBorder(ph ? `<img class="tcav" src="${esc(ph)}" alt="">` : `<span class="tcav tcavi">${esc((S.name || '?')[0].toUpperCase())}</span>`, myBorder(), 'tcavw') })()}</div><div><b>${esc(S.name)}</b><small>${Gm.badges()} badge${Gm.badges() > 1 ? 's' : ''} · ${Gm.dexCount().cb} / 1025 au Pokédex · ${Math.floor((S.stats.play || 0) / 3600)} h de jeu</small><div class="tteam">${S.team.map(m => monIcon(m, 'tri')).join('')}</div></div></div>` : '';
  el.innerHTML = `${bg ? `<img class="tbg" src="${bg}" alt="">` : ''}<div class="tshade"></div>
    <div class="tbox"><div class="tlogo"><span class="tl1">Pokémon</span><span class="tl2">${'VALMARA'.split('').map((c, i) => `<i style="--d:${i * .08}s">${c}</i>`).join('')}</span><span class="tl3">Une aventure à 1 025 Pokémon</span></div>
    ${save}<div class="tbtns">${S ? '<button class="btn pri xl" data-t="cont">Continuer</button>' : ''}<button class="btn ${S ? '' : 'pri xl'}" data-t="new" ${canNew ? '' : 'disabled title="Disponible après avoir battu la Ligue"'}>Nouvelle partie</button></div>
    ${!canNew && S ? '<p class="tnote">Nouvelle partie : disponible après avoir battu la Ligue.</p>' : ''}<p class="tfoot">Version ${esc(NEWS[0].v)} · jeu de fans non officiel</p></div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 380) };
  el.addEventListener('pointerdown', () => { try { menuMusic(true) } catch (e) { } }, { once: true });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-t]'); if (!b || b.disabled) return; const t = b.dataset.t;
    if (t === 'cont') { close(); onContinue() }
    else if (t === 'online') { close(); W.ON && (W.ON.tab = 'home'); UI.go('online') }
    else if (t === 'new') { if (S) { if (!(await UI.confirm('Recommencer depuis le début ? Votre partie actuelle sera effacée.', 'Recommencer'))) return; try { await Gm.cloudWipe() } catch (err) { } Gm.reset(); location.reload(); return } close(); onNew() }
  });
};
UI.titleOpen = () => !!document.getElementById('title');

// ---------- end-of-farm report
function farmReport(f, why) {
  if (!f || f.n < 3) return;
  const S = Gm.get(); const xp = Math.max(0, f.xp1 - f.xp0);
  const seen = f.seen || []; const lvUp = f.lv1 - f.lv0;
  return UI.modal(`<div class="frep"><p class="eyebrow">Bilan du farm${why ? ' · ' + esc(why) : ''}</p><h3>${fmt(f.n)} combat${f.n > 1 ? 's' : ''} en ${Math.max(1, Math.round((Date.now() - f.t0) / 60000))} min</h3>
    <div class="frgrid"><div><b>${fmt(f.win)}</b><small>victoires</small></div><div><b>${fmt(f.money)} ₽</b><small>gagnés</small></div><div><b>${fmt(xp)}</b><small>points d’Exp.</small></div><div><b>${lvUp > 0 ? '+' + lvUp : 0}</b><small>niveaux gagnés</small></div><div><b>${fmt(f.items)}</b><small>objets trouvés</small></div><div><b>${fmt(f.skip || 0)}</b><small>passés sans combat</small></div></div>
    <h4>Pokémon remarquables vus</h4>${seen.length ? `<div class="frseen">${seen.slice(-24).map(e => `<span class="frs ${e.sh ? 'sh' : ''}" title="${esc(sp(e.id).n)} · ${RAR[sp(e.id).rar][0]}">${spr(sp(e.id).ix, e.sh, 'tri')}<small>${esc(sp(e.id).n)}${e.sh ? ' ' + SHI : ''}</small><em class="${RAR[sp(e.id).rar][1]}">${RAR[sp(e.id).rar][0]}</em></span>`).join('')}</div>` : '<p class="mut">Aucun rare, épique, légendaire ni chromatique cette fois.</p>'}</div>
    <div class="mbtns"><button class="btn pri" data-ret="ok">OK</button></div>`, { cls: 'wide' });
}

// ---------- news feed (what changed in each update) and the short tutorial for new players
const NEWS = [
  { v: '1.0.0', d: '31/10/2026', t: 'Bienvenue dans Pokémon Valmara !', items: [
    ['🗺️', 'Une région entière', '30 zones à explorer, 8 Champions d’Arène, le Conseil 4 et la Ligue Pokémon, avec la météo et le cycle jour / nuit qui changent les Pokémon que vous croisez'],
    ['📖', '1025 Pokémon', 'les 9 générations, leurs formes régionales et le Pokédex complet : zones, niveaux, rareté, jour ou nuit et le bouton « Manquants dans ma zone »'],
    ['✨', 'Sprites animés', 'tous les Pokémon animés de face, de dos et en chromatique, Méga-Évolutions comprises'],
    ['💫', 'Chromatiques et raretés', 'chromatique 1/1000, rare, épique et légendaire, catch combo pour faire revenir l’espèce que vous chassez et talent caché'],
    ['⚡', 'Farm auto', 'enchaînez les combats pour gagner de l’Exp. et de l’argent : il s’arrête tout seul sur un Pokémon rare ou chromatique, avec un bilan à la fin'],
    ['🌙', 'Combat sombre', 'une option qui assombrit l’écran en combat pour les longues sessions de farm, avec une jauge d’intensité'],
    ['🔥', 'Méga-Évolution et Raids Téra', 'Méga-Évolutions en combat, Raids Téra et Revanches des Champions au niveau 82-90'],
    ['🗼', 'Tour de Combat', 'gagnez des PCo et échangez-les contre des objets et des Pokémon exclusifs comme Floette Éternel ou Sachanobi'],
    ['🥚', 'Pension et Fusion', 'faites éclore des œufs et fusionnez les IV de vos Pokémon pour les rendre parfaits'],
    ['💿', 'Toutes les CT', 'plus de 700 CT avec toutes les attaques apprenables, y compris les attaques signatures'],
    ['⛏', 'Mine souterraine', 'creusez pour trouver des trésors et des objets rares'],
    ['📜', 'Quêtes, succès et récompense du jour', 'des objectifs chaque jour et des succès pour toute l’aventure'],
    ['📡', 'Poké Radar', 'cherchez les Pokémon d’une zone dans les hautes herbes et trouvez des Pokémon aux IV parfaits'],
    ['💗', 'Compagnon', 'votre Pokémon préféré vous suit et trouve parfois des objets'],
    ['🔁', 'Échanges sécurisés', 'après la Ligue, échangez vos Pokémon avec vos amis grâce au système en 3 codes anti-arnaque'],
    ['🎁', 'Cadeaux mystère et Journées Communauté', 'entrez les codes publiés sur le Discord pour recevoir des cadeaux, et profitez des Journées Communauté : un Pokémon apparaît partout avec un taux de chromatique de 1/250'],
    ['🎨', 'Personnalisation', '7 thèmes, carte de Dresseur, bordures d’avatar, bannières animées, titres et couleur des étoiles chromatiques'],
    ['💾', 'Sauvegarde', 'automatique, avec export dans un fichier et copies de secours dans l’application Windows'],
    ['🔄', 'Mises à jour automatiques', 'l’application Windows se met à jour toute seule au lancement'],
    ['💬', 'Discord officiel', 'échanges, codes cadeaux, annonces et aide : discord.gg/6uA7gVc3eV'],
  ] },
];
UI.NEWS = NEWS;
const newsHTML = n => `<div class="nwv"><div class="nwh"><b>Version ${esc(n.v)}</b><span>${esc(n.t)}</span><small>${esc(n.d)}</small></div><ul class="nwl">${n.items.map(([ic, t, d]) => `<li><i>${ic}</i><span><b>${esc(t)}</b><small>${esc(d)}</small></span></li>`).join('')}</ul></div>`;
function renderNews() { return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Nouveautés</h1></section><div class="nwfeed">${NEWS.map(newsHTML).join('')}</div>` }
function newsModal(since) { const i = NEWS.findIndex(n => n.v === since); const L = i > 0 ? NEWS.slice(0, i) : NEWS; return UI.modal(`<div class="pnhead"><p class="eyebrow">Notes de mise à jour</p><h3>Pokémon Valmara · version ${esc(NEWS[0].v)}</h3></div><div class="nwfeed pnfeed">${L.map(newsHTML).join('')}</div><div class="mbtns"><button class="btn" data-ret="all">Tout l’historique</button><button class="btn pri" data-ret="ok">Super !</button></div>`, { cls: 'wide' }).then(r => { if (r === 'all') UI.go('news') }) }
const TUTO = [
  ['🌿', 'Bienvenue dans Pokémon Valmara !', 'Dans <b>Aventure</b>, choisissez une zone et touchez <b>Explorer</b> pour rencontrer des Pokémon sauvages. Affaiblissez-les puis lancez une Ball pour les capturer.'],
  ['🎯', 'Suivez l’objectif', 'La barre en haut de l’écran indique toujours la prochaine étape : battez les dresseurs de la zone puis son Champion d’Arène pour ouvrir la suite et augmenter le niveau maximum.'],
  ['🐾', 'Votre équipe', 'L’onglet <b>Pokémon</b> regroupe votre équipe (6 Pokémon), la Boîte PC, le Pokédex et <b>Strat</b> pour la fusion et les EV.'],
  ['🏥', 'Soins et achats', 'Le <b>Centre Pokémon</b> soigne gratuitement. La <b>Boutique</b> vend des Balls, des soins et des CT, le <b>Sac</b> contient vos objets.'],
  ['⚡', 'Farm auto', 'Dans une zone, le farm auto enchaîne les combats pour vous faire gagner de l’Exp. et de l’argent. Il s’arrête tout seul sur un Pokémon rare ou chromatique.'],
  ['🔁', 'Échanger avec ses amis', 'Après avoir battu la Ligue, <b>Plus → Échanges</b> permet d’envoyer et de recevoir des Pokémon avec un code.'],
];
const WELCOME = { money: 3000, items: [['Super Ball', 10], ['Potion', 5], ['Rappel', 2]] };
async function tutorial(replay) {
  const S = Gm.get(); if (!S || W.__tutoOn) return; W.__tutoOn = 1;
  try {
    for (let i = 0; i < TUTO.length; i++) {
      const [ic, t, d] = TUTO[i];
      const r = await UI.modal(`<div class="tuto"><span class="tuic">${ic}</span><p class="eyebrow">Tutoriel · ${i + 1} / ${TUTO.length}</p><h3>${t}</h3><p>${d}</p><div class="tudots">${TUTO.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div></div><div class="mbtns"><button class="btn" data-ret="skip">Passer</button><button class="btn pri" data-ret="next">${i === TUTO.length - 1 ? 'Terminer' : 'Suivant'}</button></div>`, { cls: 'small' });
      if (r !== 'next') break;
    }
    if (!replay && S.flags.tuto === 0) {
      S.flags.tuto = 1; S.newsV = NEWS[0].v; S.money += WELCOME.money; for (const [n, q] of WELCOME.items) Gm.add(n, q); Gm.save(true); header();
      await UI.alert(`<h3>🎁 Cadeau de bienvenue</h3><p>Pour bien commencer : <b>${fmt(WELCOME.money)} ₽</b>, ${WELCOME.items.map(([n, q]) => `<b>${n} ×${q}</b>`).join(', ')}.</p><p class="mut">Vous pouvez revoir le tutoriel dans Plus.</p>`, 'Merci !');
    }
  } finally { W.__tutoOn = 0 }
}
// ---------- header / nav
function header() {
  const S = Gm.get(); const night = Gm.isNight(); const left = Gm.phaseLeft();
  const inc = S.inc ? (() => { const mx = (IT[S.inc.n] && IT[S.inc.n].left) || S.inc.left; return `<span class="chip inc" title="${esc(S.inc.n)} : encore ${S.inc.left} rencontres">${UI.itemIcon(S.inc.n, 'ii sm')}<b>${S.inc.left}</b><i class="incbar"><u style="width:${Math.max(3, Math.min(100, S.inc.left / mx * 100))}%"></u></i></span>` })() : '';
  const chain = '';
  const nl = notifList(); const bell = `<button class="chip bellc ${nl.length ? 'on' : ''}" id="bellc" title="Notifications"><svg class="bico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/></svg>${nl.length ? `<b>${nl.reduce((a, x) => a + (x.n || 1), 0)}</b>` : ''}</button>`;
  $('#top').innerHTML = `<div class="top-l"><button class="pname" data-go="profile" title="Carte de Dresseur">${(() => { const ph = W.ON && W.ON.myPhoto ? W.ON.myPhoto() : ''; const bd = ''; return withBorder(ph ? `<img class="pav onav${bd ? ' bd-' + bd : ''}" src="${esc(ph)}" alt="">` : `<span class="pav pavi onav${bd ? ' bd-' + bd : ''}">${esc((S.name || '?')[0].toUpperCase())}</span>`, myBorder(), 'avhd') })()}<span class="pnm"><b>${S.set.strm ? 'Dresseur' : esc(S.name)}</b>${S.card && S.card.title ? `<small>${esc(S.card.title)}</small>` : ''}</span></button><span class="money">${fmt(S.money)} ₽</span><span class="bdg" title="Badges">${S.gyms.map((g, i) => W.GYMB && W.GYMB[G.GYMS[i].type] ? `<img class="gbi ${g ? 'on' : ''}" src="${W.GYMB[G.GYMS[i].type]}" alt="" title="${esc(G.GYMS[i].badge)}${g ? '' : ' (pas encore obtenu)'}">` : `<i class="${g ? 'on' : ''}" style="--tc:${TC[G.GYMS[i].type]}"></i>`).join('')}</span></div><div class="top-r">${W.ON && W.ON.st === 'on' && W.ONL ? (() => { const n = W.ONL.onlineCount() + 1; return `<button class="chip onlc" data-go="online" title="${n} joueur${n > 1 ? 's' : ''} connecté${n > 1 ? 's' : ''} en ce moment (vous compris)"><i class="ondot"></i><b>${n}</b> en ligne</button>` })() : ''}${bell}${(() => { const c = Gm.levelCap(); return c < 100 ? `<span class="chip lcap" title="Niveau maximum actuel : battez le dernier dresseur et l’Arène de votre zone la plus avancée pour l’augmenter">N. max ${c}</span>` : '' })()}${S.chain && S.chain.n >= 2 ? `<span class="chip chainc" title="Série de captures : ce Pokémon apparaît plus souvent${S.chain.n >= 50 ? ', talent caché 1/100' : ' (talent caché 1/100 à partir de 50 captures)'}">${esc(sp(S.chain.s).n)} ×${S.chain.n} · +${(v => v < 0.01 ? (v * 100).toFixed(1).replace('.', ',') : Math.round(v * 100))(Gm.chainBoost())} %${S.chain.n >= 50 ? ' · ★ 1/100' : ''}</span>` : ''}${chain}${inc}<span class="chip phase ${night ? 'n' : 'd'}" title="${night ? 'Le jour' : 'La nuit'} revient dans ${dnFmt(left)}">${night ? '☾ Nuit' : '☀ Jour'} <b class="dnt">${dnFmt(left)}</b></span></div>`;
}
// 5 main groups in the bottom bar; inside a group, sub-tabs at the top of the page
const NAVG = [['aventure', 'Aventure', 'map', ['map', 'zone', 'radar', 'mine']], ['pokemon', 'Pokémon', 'team', ['team', 'pc', 'dex', 'fusion']], ['sac', 'Sac', 'bag', ['bag']], ['shop', 'Boutique', 'shop', ['shop']], ['more', 'Plus', 'more', []]];
const SUBS = { pokemon: [['team', 'Équipe'], ['pc', 'Boîte PC'], ['dex', 'Pokédex'], ['fusion', 'Strat']] };
const groupOf = tab => (NAVG.find(g => g[3].includes(tab)) || NAVG[NAVG.length - 1])[0];
const lastIn = {};
function nav() {
  const cur = groupOf(view.tab); lastIn[cur] = view.tab; Gm.dcTick();
  $('#nav').innerHTML = NAVG.map(([k, l, first]) => `<button data-go="${k === cur ? first : (lastIn[k] && !['zone', 'radar', 'mine'].includes(lastIn[k]) ? lastIn[k] : first)}" class="${cur === k ? 'on' : ''}"><span class="ni ni-${k}"></span>${l}</button>`).join('');
}
function subnav() { const g = SUBS[groupOf(view.tab)]; if (!g) return ''; return `<nav class="subnav">${g.map(([k, l]) => `<button data-go="${k}" class="${view.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>` }
UI.go = (tab, arg) => {
  { const t = document.getElementById('title'); if (t) t.remove() }
  // during a League run, only the League, the Sac, the Équipe and a few info pages are open; any other button leads back to the League
  { const S0 = Gm.get(); if (S0 && S0.lr && !LEAGUE_OK.includes(tab)) { if (view.tab !== 'league') { view.tab = 'league'; render(); window.scrollTo(0, 0); UI.toast('Ligue en cours : retour au Plateau de la Ligue.') } else UI.toast('Impossible de quitter la Ligue avant d’avoir gagné ou perdu. Le Sac et l’Équipe restent accessibles.', 'bad'); return } }
  if (view.tab === 'radar' && tab !== 'radar') { const r = Gm.get().radar; if (r && r.n >= 2 && !UI._radOk) { UI.confirm(`Quitter le Poké Radar brise votre chaîne de <b>${r.n}</b>. Quitter quand même ?`, 'Quitter', 'Rester').then(ok => { if (ok) { UI._radOk = 1; UI.go(tab, arg); UI._radOk = 0 } }); return } radBreak() }
  const enterRad = tab === 'radar' && view.tab !== 'radar';
  view.tab = tab; if (tab === 'zone' || tab === 'radar') view.zid = arg || view.zid; if (enterRad) { const r = radState(); r.grid = []; r.steps = RAD_CHARGE } render(); window.scrollTo(0, 0) };
function render() {
  try { applyShCol() } catch (e) { }
  const S = Gm.get(); if (!S) return;
  if (S.lr && !LEAGUE_OK.includes(view.tab)) view.tab = 'league';
  header(); nav();
  const v = $('#view');
  { const oz = v.querySelector('.zhero'); if (oz && W.Scene) W.Scene.unmount(oz) }
  const f = { map: renderMap, zone: renderZone, team: renderTeam, pc: renderPC, fusion: renderFusion, bag: renderBag, shop: renderShop, dex: renderDex, more: renderMore, league: renderLeague, tower: renderTower, rematch: renderRematch, save: renderSave, opts: renderOpts, stats: renderStats, help: renderHelp, news: renderNews, tuto: () => { setTimeout(() => tutorial(true), 0); view.tab = 'more'; return renderMore() }, quests: renderQuests, raid: renderRaid, profile: renderProfile, ach: renderAch, radar: renderRadar, mine: renderMine, gift: renderGift, daily: renderDaily, trade: () => (S.champ ? renderTrade() : (view.tab = 'more', renderMore())), pvp: () => (view.tab = 'more', renderMore()), online: () => (view.tab = 'more', renderMore()) }[view.tab] || renderMap;
  v.innerHTML = subnav() + (S.lr && view.tab !== 'league' ? `<div class="lgbanner"><span>🏆 <b>Ligue en cours</b> · combat ${S.lr.i + 1}/${G.LEAGUE.length} contre ${esc(G.LEAGUE[S.lr.i] ? G.LEAGUE[S.lr.i].n : '')}</span><button class="btn sm pri" data-go="league">Retour à la Ligue</button></div>` : '') + (view.tab === 'zone' ? zoneLayout(f()) : f()); v.dataset.tab = view.tab; goalBar();
  if (render._tab !== view.tab + ':' + (view.zid || '')) { render._tab = view.tab + ':' + (view.zid || ''); v.classList.remove('pgin'); void v.offsetWidth; v.classList.add('pgin') }
  if (view.tab === 'zone') { const zh = v.querySelector('.zhero'); if (zh && W.Scene) W.Scene.mount(zh, Gm.zone(view.zid).bio, { night: Gm.isNight(), px: 3, horizon: 0.55, focus: 0.5 }); if (zh && W.WxFX) try { W.WxFX.mount(zh, { kind: Gm.zoneWeather(view.zid).k, live: true }) } catch (e) { } }
  if (view.tab === 'dex') bindDex();
  if (view.tab === 'opts') refreshTracks();
  
  // players who became Champion before these rewards existed get them now, with a little message
  if (S.champ && !S.flags.radarGift && !busy && !modalStack.length) { S.flags.radarGift = 1; Gm.add('Poké Radar', 1); Gm.save(true); setTimeout(() => UI.alert(`<h3>🎁 Nouveaux objets de la Ligue</h3><p>Vous avez déjà battu la Ligue Pokémon : vous recevez le <b>Poké Radar</b> (rangé dans le Sac, objets rares).</p><p class="mut">Utilisez-le depuis le bouton « Poké Radar » de n’importe quelle zone pour faire des chaînes et trouver des chromatiques.</p>`, 'Super !'), 400) }
  setTimeout(() => { try { achCheck() } catch (e) { } }, 50);
  if (!busy && !modalStack.length && !W.__tutoOn) { if (S.flags.tuto === 0) setTimeout(() => tutorial(false), 700); else if (S.newsV !== NEWS[0].v) { const old = S.newsV; S.newsV = NEWS[0].v; Gm.save(true); setTimeout(() => newsModal(old), 900) } }
}
setTimeout(() => { try { const S0 = Gm.get(); if (S0) for (const m of S0.team) { const id = m.fm && G.FORMS[m.fm] ? G.FORMS[m.fm].id : m.s; Gm.animURL('f' + (m.sh ? 's' : 'n'), id) } } catch (e) { } }, 300);
UI.profileEdit = profileEdit; UI.render = render; UI.__sb = cfg => startBattle(cfg); UI.view = view; UI.isBusy = () => busy; UI.__evo = (m, to) => evolveFlow(m, to);
const LEAGUE_OK = ['league', 'bag', 'team', 'opts', 'help', 'stats', 'ach', 'profile', 'save'];


// ---------- notifications: everything that waits for the player, in one list (bell in the header)
function notifList() {
  const S = Gm.get(); if (!S) return []; const L = [];
  const add = (ic, t, go, n, sub) => L.push({ ic, t, go, n, sub });
  try { if (W.ON && W.ON.st === 'on') { const inv = W.ONL ? W.ONL.pendingInv() : 0; if (inv) add('⚔️', `${inv} invitation${inv > 1 ? 's' : ''} en ligne`, 'online', inv, 'battle'); const m = W.ON.count ? W.ON.count() - inv : 0; if (m > 0) add('📬', `${m} message${m > 1 ? 's' : ''} dans la Boîte aux lettres`, 'online', m, 'mail') } } catch (e) { }
  try { if (Gm.dailyReady()) add('🎁', 'Récompense du jour à récupérer', 'daily') } catch (e) { }
  try { const q = Gm.qReady(); if (q) add('📜', `${q} quête${q > 1 ? 's' : ''} terminée${q > 1 ? 's' : ''}`, 'quests', q) } catch (e) { }
  try { if (Gm.raidReady()) add('💎', 'Un Raid Téra est disponible', 'raid') } catch (e) { }
  try { const d = Gm.dexReady(); if (d) add('📖', 'Récompense du Pokédex à récupérer', 'dex', d) } catch (e) { }
  try { if (Gm.mineOpen() && Gm.mineTick().ch >= Gm.MINE.MAX) add('⛏', 'Mine : tous vos coups sont rechargés', 'mine') } catch (e) { }
  return L;
}
UI.notifList = notifList;
function bellPanel(btn) {
  let p = document.getElementById('bellp'); if (p) { p.remove(); return }
  const L = notifList(); p = document.createElement('div'); p.id = 'bellp';
  p.innerHTML = `<b class="bph">Notifications</b>${L.length ? L.map((x, i) => `<button class="bpi" data-i="${i}"><span class="bpd"></span><span>${esc(x.t)}</span><i>›</i></button>`).join('') : '<p class="mut">Rien en attente pour l’instant.</p>'}`;
  document.body.appendChild(p); const r = btn.getBoundingClientRect(); p.style.top = (r.bottom + 8) + 'px'; p.style.right = Math.max(8, innerWidth - r.right) + 'px';
  p.addEventListener('click', e => { const b = e.target.closest('.bpi'); if (!b) return; const x = L[+b.dataset.i]; p.remove(); if (x.sub && W.ON) W.ON.tab = x.sub; if (x.go === 'fusion') fv.tab = 'pension'; UI.go(x.go) });
  setTimeout(() => document.addEventListener('click', function off(e) { if (!e.target.closest('#bellp') && !e.target.closest('#bellc')) { const q = document.getElementById('bellp'); if (q) q.remove(); document.removeEventListener('click', off) } }), 0);
}
document.addEventListener('click', e => { const b = e.target.closest('#bellc'); if (b) { e.stopPropagation(); bellPanel(b) } });
// ---------- objective bar: what to do next in the adventure
function nextGoal() {
  const S = Gm.get(); if (!S) return null;
  if (S.lr) return { t: `Ligue en cours : combat ${S.lr.i + 1} sur ${G.LEAGUE.length}`, go: 'league' };
  for (const z of G.ZONES) {
    if (!Gm.zoneUnlocked(z.id) || Gm.zoneCleared(z.id)) continue;
    const nx = Gm.zone(z.id + 1); let need = nx ? lockReason(z.id + 1).replace(/^Zone \d+ : /, '') : ''; if (!need) need = 'terminer la zone';
    return { t: need.charAt(0).toUpperCase() + need.slice(1), where: `Zone ${z.id} · ${z.n}`, go: 'zone', arg: z.id };
  }
  if (!S.champ) return { t: 'Affronter la Ligue Pokémon', where: 'Plateau de la Ligue', go: 'league' };
  return { t: `Maître de la Ligue ×${S.champTimes} : visez la Tour de Combat (record ${S.tower.best1})`, where: 'Après la Ligue', go: 'tower' };
}
function goalBar() {
  let el = document.getElementById('goalbar'); const g = nextGoal(); const show = g && ['map', 'zone', 'team', 'pc', 'bag', 'shop', 'dex', 'more'].includes(view.tab);
  if (!show) { if (el) el.remove(); return }
  if (!el) { el = document.createElement('div'); el.id = 'goalbar'; $('#top').after(el) }
  const b = Gm.badges();
  el.innerHTML = `<button class="gbar" data-go="${g.go}" ${g.arg ? `data-arg="${g.arg}"` : ''}><span class="gbt"><b>${esc(g.t)}</b>${g.where ? `<small>${esc(g.where)}</small>` : ''}</span><span class="gbp"><i style="width:${b / 8 * 100}%"></i></span><small class="gbn">${b}/8 badges</small><span class="gbgo">Y aller ›</span></button>`;
}
// ---------- zone page on a wide screen: team on the left, quests / events / clan on the right
function zoneLayout(main) { return `<div class="zlay"><aside class="zside zl" id="zsl">${sideLeft()}</aside><div class="zmain">${main}</div><aside class="zside zr" id="zsr">${sideRight()}</aside></div>` }
function sideLeft() {
  const S = Gm.get(); const pu = S.partner;
  return `<div class="sbox"><h3>Équipe <button class="btn sm" data-act="heal" ${S.lr ? 'disabled' : ''} title="Centre Pokémon">Soigner</button></h3>${S.team.map(m => { const mx = P.maxHP(m); const pct = Math.max(0, m.hp / mx * 100); return `<button class="sbm" data-go="team">${monIcon(m, 'sbi')}<span><b>${esc(monName(m))}${m.sh ? ' ' + SHI : ''}${m.u === pu ? ' <em class="sbh">♥</em>' : ''}</b><small>N.${m.lv}${m.st ? ' · ' + esc(m.st.toUpperCase()) : ''}</small><i class="sbhp ${pct > 50 ? '' : pct > 20 ? 'mid' : 'low'}"><u style="width:${pct}%"></u></i></span></button>` }).join('')}</div>
  <div class="sbox"><h3>Actions rapides</h3><div class="sbq"><button class="btn sm" data-act="qbag">Utiliser un objet</button><button class="btn sm" data-go="pc">Boîte PC</button><button class="btn sm" data-go="map">Carte</button></div></div>`;
}
function sideRight() {
  const S = Gm.get(); let h = '';
  try { const Q = Gm.questsFresh(); h += `<div class="sbox"><h3>Quêtes du jour <button class="btn sm" data-go="quests">Tout voir</button></h3>${Q.d.list.map(q => `<div class="sbqst ${q.done ? 'done' : q.p >= q.goal ? 'ready' : ''}"><span>${esc(Gm.qLabel(q))}</span><i class="sbhp"><u style="width:${Math.min(100, q.p / q.goal * 100)}%"></u></i><small>${q.done ? 'Reçue' : q.p >= q.goal ? 'À récupérer !' : `${q.p} / ${q.goal}`}</small></div>`).join('')}</div>` } catch (e) { }
  try { if (W.ON && W.ON.st === 'on') { const c = W.ON.comm && W.ON.comm(); const n = W.ONL ? W.ONL.onlineCount() + 1 : 1; h += `<div class="sbox"><h3>En ligne <button class="btn sm" data-go="online">Ouvrir</button></h3><p class="sbtx"><i class="ondot"></i> ${n} joueur${n > 1 ? 's' : ''} connecté${n > 1 ? 's' : ''}</p>${c ? `<p class="sbev">Journée communauté <b>${esc(sp(c.sp).n)}</b> en cours !</p>` : ''}${W.ON.clanFeed ? W.ON.clanFeed() : ''}</div>` } } catch (e) { }
  const nl = notifList(); if (nl.length) h += `<div class="sbox"><h3>À faire</h3>${nl.map(x => `<button class="sbn" data-go="${x.go}">${esc(x.t)}</button>`).join('')}</div>`;
  return h;
}
function refreshSides() { if (view.tab !== 'zone') return; const l = $('#zsl'), r = $('#zsr'); if (l) l.innerHTML = sideLeft(); if (r) r.innerHTML = sideRight() }
UI.refreshSides = refreshSides;
document.addEventListener('change', e => { const t = e.target.closest && e.target.closest('[data-tsel]'); if (t) { view.tsel = +t.value; render() } });
document.addEventListener('change', e => { const q = e.target.closest && e.target.closest('[data-qball]'); if (!q) return; Gm.get().lastBall = q.value; Gm.save(true); refreshEnc(); UI.toast(`Ball par défaut : ${esc(q.value)}`) });
setInterval(() => { if (document.visibilityState === 'visible' && !busy) refreshSides() }, 5000);

// ---------- MAP
const cdMon = id => ({ s: id }); // same ids as the wild encounters
const cdName = id => esc(sp(id) ? sp(id).n : '?');
const cdWhen = t => new Date(t).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
function cdChip() {
  const c = Gm.cdayActive(); const n = c ? null : Gm.cdayNext(); if (!c && !(n && n.a - Date.now() < 7 * 864e5)) return '';
  const x = c || n; return `<div class="cdchip ${c ? 'live' : ''}">${monIcon(cdMon(x.s), 'cdi')}<span><b>${c ? '🎉 Journée Communauté en cours' : '📅 Journée Communauté à venir'} : ${cdName(x.s)}</b><small>${c ? `Dans toutes les zones, environ 1 combat sur 3 · chromatique 1/${Math.round(Gm.RATE.shiny / Gm.CD_SHINY)} · fin dans <b class="cdt" data-t="${x.b}">${dnFmt(x.b - Date.now())}</b>` : `Commence ${esc(cdWhen(x.a))} · chromatique 1/${Math.round(Gm.RATE.shiny / Gm.CD_SHINY)}`}</small></span></div>`;
}
function cdModal(c, isNew) {
  const live = Date.now() >= c.a; return UI.modal(`<div class="evo"><p class="eyebrow">${esc(c.l || 'Journée Communauté')}</p><h2 style="margin:4px 0 8px">${isNew ? 'Journée Communauté activée !' : 'Journée Communauté déjà activée'}</h2><div class="giftart">${monIcon(cdMon(c.s), 'big')}</div><p class="mtxt"><b>${cdName(c.s)}</b> apparaît dans toutes les zones environ 1 combat sur 3, avec un taux de chromatique de <b>1/${Math.round(Gm.RATE.shiny / Gm.CD_SHINY)}</b>.</p><p class="mut">${live ? 'C’est maintenant !' : 'Début : ' + esc(cdWhen(c.a))}<br>Fin : ${esc(cdWhen(c.b))}</p><div class="mbtns"><button class="btn pri" data-ret="1">C’est parti !</button></div></div>`, { cls: 'evom' });
}
// community day codes published on the update site: every copy of the game picks them up by itself (no update, no code to type)
const CD_URL = 'https://orlasayzz.github.io/valmara/evenement.json';
async function fetchEvents() {
  if (!Gm.get()) return; try {
    const r = await fetch(CD_URL + '?t=' + Math.floor(Date.now() / 6e4), { cache: 'no-store' }); if (!r.ok) return; const j = await r.json(); let got = null;
    for (const code of (Array.isArray(j.codes) ? j.codes : []).slice(0, 20)) { const sg = Gm.signedGift(String(code).trim()); if (sg && sg.o && sg.o.cd) { const res = Gm.cdayAdd(sg.o, true); if (res.isNew) got = res.cd } }
    if (got) { UI.toast(`🎉 Journée Communauté : ${cdName(got.s)} ${Date.now() >= got.a ? 'commence maintenant !' : 'le ' + cdWhen(got.a)}`); if (!busy && (view.tab === 'zone' || view.tab === 'map')) render() }
  } catch (e) { }
}
setTimeout(fetchEvents, 4000); setInterval(fetchEvents, 15 * 60000);
function wxChip(zid) { const w = Gm.zoneWeather(zid); const TLs = w.types.map(t => TL[t]).join(', '); return `<div class="wxchip wx-${w.k}"><span class="wxi">${w.ic}</span><span><b>${esc(w.n)}</b><small>${w.types.length ? `Plus de Pokémon ${TLs}` : 'Aucun effet sur les apparitions'}${w.battle ? ' · actif en combat' : ''} · change dans <b class="wxt" data-z="${zid}">${dnFmt(w.left)}</b></small></span></div>` }
function zoneProgress(z) { const S = Gm.get(); const c = z.sp.filter(id => Gm.caught(id)).length; return [c, z.sp.length] }
function lockReason(zid) {
  if (zid === 26) return 'Devenez Maître de la Ligue';
  const prev = zid - 1; const z = Gm.zone(prev); const st = Gm.zst(prev); const need = [];
  if (!st.tr.includes(z.tr.length - 1)) need.push('battre ' + z.tr[z.tr.length - 1].c + ' ' + z.tr[z.tr.length - 1].n);
  const gi = Gm.gymIndexForZone(prev); if (gi >= 0 && !Gm.get().gyms[gi]) need.push('obtenir le ' + G.GYMS[gi].badge);
  if (Gm.rivalIndexForZone(prev) >= 0 && !st.rival) need.push('battre ' + Gm.get().rival);
  return 'Zone ' + prev + ' : ' + need.join(', ');
}
let cdWas = null;
const dnFmt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0') };
function dnCard() { const night = Gm.isNight(), left = Gm.phaseLeft(); return `<div class="dncard ${night ? 'n' : 'd'}"><span class="dni">${night ? '☾' : '☀'}</span><div><b>${night ? 'Il fait nuit' : 'Il fait jour'}</b><small>${night ? 'Le jour se lève' : 'La nuit tombe'} dans <b class="dnt">${dnFmt(left)}</b> (cycle de 40 min)</small></div></div>` }
let dnWas = null;
setInterval(() => { if (!Gm.get() || document.visibilityState !== 'visible') return; if (view.tab === 'mine') { const t = document.querySelector('.minet'); if (t) { const nx = Gm.mineNext(); if (nx <= 1000 && !busy) mineRefresh(); else t.textContent = dnFmt(nx) } } { const ca = !!(Gm.get() && Gm.cdayActive()); if (cdWas !== null && ca !== cdWas && !busy && (view.tab === 'zone' || view.tab === 'map')) { cdWas = ca; render(); return } cdWas = ca } document.querySelectorAll('.cdt').forEach(e => { e.textContent = dnFmt(+e.dataset.t - Date.now()) }); document.querySelectorAll('.wxt').forEach(e => { const w = Gm.zoneWeather(+e.dataset.z); if (w.left > Gm.WX_MS - 1500 && !busy && (view.tab === 'zone' || view.tab === 'map')) { render(); return } e.textContent = dnFmt(w.left) }); const night = Gm.isNight(); if (dnWas !== null && night !== dnWas) { dnWas = night; if (!busy) render(); return } dnWas = night; const t = dnFmt(Gm.phaseLeft()); document.querySelectorAll('.dnt').forEach(e => { e.textContent = t }) }, 1000);
function renderMap() {
  const S = Gm.get(); const dc = Gm.dexCount();
  let h = `<section class="hero map-hero"><div><p class="eyebrow">Région de ${REGION}</p><h1>Carte des zones</h1><p class="sub">${Gm.badges()} badge${Gm.badges() > 1 ? 's' : ''} · Pokédex ${dc.c}/${dc.tot} capturés · ${dc.sh} chromatique${dc.sh > 1 ? 's' : ''}</p></div><div class="dexbar"><i style="width:${dc.c / dc.tot * 100}%"></i></div>${cdChip()}<div class="maprow">${dnCard()}${(() => { const op = Gm.mineOpen(); const m = op ? Gm.mineTick() : null; return `<button class="minecard ${op ? '' : 'locked'}" ${op ? 'data-go="mine"' : 'disabled'}><span class="mci">⛏</span><span><b>Mine souterraine</b><small>${op ? `${m.ch}/${Gm.MINE.MAX} coups${m.cur ? ` · ${m.cur.items.filter(i => i.got).length}/${m.cur.items.length} trésors` : ''}` : '🔒 Après le premier badge'}</small></span></button>` })()}</div></section><div class="zgrid">`;
  for (const z of G.ZONES) {
    const un = Gm.zoneUnlocked(z.id); const cl = Gm.zoneCleared(z.id); const [c, t] = zoneProgress(z);
    const gi = Gm.gymIndexForZone(z.id); const ri0 = Gm.rivalIndexForZone(z.id);
    if (z.id === 26) h += leagueCard();
    h += `<button class="zcard bio-${z.bio} ${un ? '' : 'locked'} ${cl ? 'done' : ''} ${S.cur === z.id ? 'cur' : ''}" ${un ? `data-go="zone" data-arg="${z.id}"` : 'disabled'}>
      <span class="znum">${z.id}</span>${un ? (() => { const w = Gm.zoneWeather(z.id); return `<span class="zwx" title="${esc(w.n)}">${w.ic}</span>` })() : ''}<span class="zbody"><b>${esc(z.n)}</b><small>N. ${z.lv[0]}–${z.lv[1]} · ${BIO_NAME[z.bio]}</small>
      <span class="zmeta">${un ? `<span class="zprog"><i style="width:${c / t * 100}%"></i></span><em>${c}/${t}</em>` : `<em class="lockr">🔒 ${esc(lockReason(z.id))}</em>`}</span>
      <span class="ztags">${gi >= 0 ? `<span class="ztag gym" style="--tc:${TC[G.GYMS[gi].type]}">Arène ${TL[G.GYMS[gi].type]}${S.gyms[gi] ? ' ✓' : ''}</span>` : ''}${ri0 >= 0 ? `<span class="ztag riv">Rival${Gm.zst(z.id).rival ? ' ✓' : ''}</span>` : ''}${cl ? '<span class="ztag ok">Terminée</span>' : ''}</span></span></button>`;
  }
  h += '</div>';
  return h;
}

// ---------- REGION MAP (drawn like a Pokémon region: places linked by routes, in the order of the adventure)
const MAPXY = { 1: [110, 610], 2: [225, 560], 3: [335, 625], 4: [455, 645], 5: [560, 585], 6: [665, 625], 7: [765, 560], 8: [705, 470], 9: [590, 455], 10: [470, 500], 11: [350, 470], 12: [225, 440], 13: [120, 375], 14: [165, 280], 15: [285, 320], 16: [405, 360], 17: [530, 330], 18: [650, 355], 19: [765, 300], 20: [725, 200], 21: [625, 238], 22: [478, 205], 23: [340, 228], 24: [228, 158], 25: [370, 95], L: [505, 75], 26: [650, 85], 27: [800, 70], 28: [905, 185], 29: [925, 320], 30: [895, 460] };
const MAP_DECO = { meadow: 'tree', forest: 'tree', jungle: 'tree', fairy: 'tree', flowers: 'flower', peaks: 'mount', dragon: 'mount', victory: 'mount', glacier: 'snowm', tundra: 'snowm', volcano: 'volc', magma: 'volc', desert: 'dune', canyon: 'dune', lake: 'wave', beach: 'wave', abyss: 'wave', oasis: 'palm', cave: 'rock', ruins: 'rock', grave: 'grave', city: 'tower', power: 'tower', swamp: 'reed', hills: 'tree', storm: 'wave', sky: 'cloud', distortion: 'rift', ultra: 'rift', origin: 'cloud' };
function mapBlob(cx, cy, r, seed, n = 11) {
  let a = seed * 9301 + 49297; const rn = () => { a = (a * 9301 + 49297) % 233280; return a / 233280 };
  const pts = Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2, rr = r * (0.78 + rn() * 0.38); return [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.82] });
  let d = ''; for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; if (!i) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`; d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}` }
  return d + 'Z';
}
function mapDeco(kind, x, y, k) {
  switch (kind) {
    case 'tree': return `<g class="dk tree"><rect x="${x - 1.5}" y="${y}" width="3" height="7" rx="1"/><circle cx="${x}" cy="${y - 3}" r="${7 + k % 3}"/></g>`;
    case 'flower': return `<g class="dk flower"><circle cx="${x}" cy="${y}" r="3.2"/><circle cx="${x + 7}" cy="${y + 3}" r="2.6"/><circle cx="${x - 6}" cy="${y + 4}" r="2.4"/></g>`;
    case 'mount': return `<g class="dk mount"><path d="M${x - 16},${y + 8}L${x},${y - 16}L${x + 16},${y + 8}Z"/><path class="cap" d="M${x - 5},${y - 8}L${x},${y - 16}L${x + 5},${y - 8}L${x + 1},${y - 6}Z"/></g>`;
    case 'snowm': return `<g class="dk snowm"><path d="M${x - 15},${y + 8}L${x},${y - 14}L${x + 15},${y + 8}Z"/></g>`;
    case 'volc': return `<g class="dk volc"><path d="M${x - 18},${y + 8}L${x - 5},${y - 12}L${x + 5},${y - 12}L${x + 18},${y + 8}Z"/><path class="lava" d="M${x - 5},${y - 12}L${x + 5},${y - 12}L${x + 2},${y - 4}L${x - 1},${y - 7}Z"/><circle class="smoke" cx="${x + 3}" cy="${y - 20}" r="5"/></g>`;
    case 'dune': return `<path class="dk dune" d="M${x - 16},${y + 4}Q${x - 6},${y - 8} ${x + 4},${y + 4}Q${x + 10},${y - 3} ${x + 18},${y + 4}"/>`;
    case 'wave': return `<path class="dk wave" d="M${x - 12},${y}q4,-4 8,0t8,0t8,0"/>`;
    case 'palm': return `<g class="dk palm"><path d="M${x},${y + 8}Q${x + 2},${y} ${x},${y - 8}" /><path class="lf" d="M${x},${y - 8}q-8,-2 -11,4M${x},${y - 8}q8,-2 11,4M${x},${y - 8}q-2,-7 -8,-8M${x},${y - 8}q3,-7 8,-8"/></g>`;
    case 'rock': return `<path class="dk rock" d="M${x - 9},${y + 6}L${x - 6},${y - 3}L${x + 1},${y - 6}L${x + 8},${y - 1}L${x + 9},${y + 6}Z"/>`;
    case 'grave': return `<g class="dk grave"><path d="M${x - 5},${y + 6}V${y - 3}a5,5 0 0 1 10,0V${y + 6}Z"/></g>`;
    case 'tower': return `<g class="dk tower"><rect x="${x - 4}" y="${y - 12}" width="8" height="20" rx="1"/><rect x="${x + 5}" y="${y - 5}" width="6" height="13" rx="1"/></g>`;
    case 'reed': return `<path class="dk reed" d="M${x - 4},${y + 6}V${y - 6}M${x},${y + 6}V${y - 9}M${x + 4},${y + 6}V${y - 5}"/>`;
    case 'cloud': return `<g class="dk cloud"><circle cx="${x - 6}" cy="${y}" r="6"/><circle cx="${x + 2}" cy="${y - 3}" r="8"/><circle cx="${x + 10}" cy="${y + 1}" r="5"/></g>`;
    case 'rift': return `<path class="dk rift" d="M${x - 3},${y - 12}L${x + 4},${y - 2}L${x - 2},${y + 2}L${x + 3},${y + 12}"/>`;
  }
  return '';
}
function regionMapHTML() {
  if (!W.RegionMap) return '';
  const S = Gm.get(); const RM = W.RegionMap; const pos = {}; const tile = id => { const [x, y] = MAPXY[id]; return [Math.round(x / 1000 * RM.GW), Math.round(y / 720 * RM.GH)] };
  for (const z of G.ZONES) pos[z.id] = tile(z.id);
  const lp = tile('L'); const img = RM.image(G.ZONES, pos, lp);
  const at = ([gx, gy]) => `left:${(gx + 0.5) / RM.GW * 100}%;top:${(gy - 0.6) / RM.GH * 100}%`;
  // the next place to go (first open place not finished yet), highlighted with a glowing ring
  const order = [...G.ZONES.filter(z => z.id <= 25).map(z => z.id), 'L', ...G.ZONES.filter(z => z.id > 25).map(z => z.id)];
  const done = id => id === 'L' ? !!S.champ : Gm.zoneCleared(id), open = id => id === 'L' ? Gm.leagueOpen() : Gm.zoneUnlocked(id);
  const goal = order.find(id => open(id) && !done(id)); const P = id => id === 'L' ? lp : pos[id];
  let h = '';
  for (const z of G.ZONES) {
    const u = Gm.zoneUnlocked(z.id), cl = Gm.zoneCleared(z.id), cur = S.cur === z.id; const gi = Gm.gymIndexForZone(z.id);
    h += `<button class="pmk ${u ? '' : 'locked'} ${cl ? 'done' : ''} ${cur ? 'cur' : ''} ${goal === z.id ? 'goal' : ''}" style="${at(pos[z.id])}" ${u ? `data-go="zone" data-arg="${z.id}"` : 'disabled'} aria-label="${esc(z.n)}"><i class="pmn">${u ? z.id : '🔒'}</i>${gi >= 0 ? `<i class="pmg ${S.gyms[gi] ? 'won' : ''}" style="--tc:${TC[G.GYMS[gi].type]}"></i>` : ''}${cl ? '<i class="pmc">✓</i>' : ''}${cur ? '<i class="pmp"></i>' : ''}<span class="pml"><b>${esc(z.n)}</b><small>N. ${z.lv[0]}–${z.lv[1]}${u ? (gi >= 0 ? ` · Arène ${TL[G.GYMS[gi].type]}${S.gyms[gi] ? ' ✓' : ''}` : '') : ' · ' + esc(lockReason(z.id))}</small></span></button>`;
  }
  if (goal != null) { const [gx, gy] = P(goal); h += `<div class="pgoal" style="left:${(gx + 0.5) / RM.GW * 100}%;top:${(gy + 0.5) / RM.GH * 100}%;width:${3.6 / RM.GW * 100}%"><span>Prochaine étape</span></div>` }
  // every route drawn again on top, bright: travelled routes, the route toward the goal, routes still locked
  let rs = '';
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i], b = order[i + 1]; const [x1, y1] = P(a), [x2, y2] = P(b); const c = v => v + 0.5;
    const d = i % 2 === 0 ? `M${c(x1)},${c(y1)}H${c(x2)}V${c(y2)}` : `M${c(x1)},${c(y1)}V${c(y2)}H${c(x2)}`;
    const sea = b === 26 || (typeof a === 'number' && a >= 26); const st = b === goal ? 'goal' : open(a) && open(b) ? 'open' : 'locked';
    rs += `<path class="prt ${st} ${sea ? 'sea' : ''}" d="${d}"/>`;
  }
  h = `<svg class="proutes" viewBox="0 0 ${RM.GW} ${RM.GH}" preserveAspectRatio="none" aria-hidden="true">${rs}</svg>` + h;
  const op = Gm.leagueOpen();
  h += `<button class="pmk league ${op ? '' : 'locked'} ${S.champ ? 'done' : ''}" style="${at(lp)}" ${op ? 'data-go="league"' : 'disabled'} aria-label="Ligue Pokémon"><i class="pmn">★</i><span class="pml"><b>Ligue Pokémon</b><small>${S.champ ? 'Vous êtes Maître' : op ? 'Ouverte' : '8 badges et Route Victoire terminée'}</small></span></button>`;
  return `<div class="pmapw"><div class="pmap" style="aspect-ratio:${RM.GW}/${RM.GH}"><img src="${img}" alt="Carte de la région de ${REGION}">${h}</div></div>`;
}
function leagueCard() {
  const S = Gm.get(); const open = Gm.leagueOpen();
  return `<button class="zcard league ${open ? '' : 'locked'} ${S.champ ? 'done' : ''}" ${open ? 'data-go="league"' : 'disabled'}><span class="znum">★</span><span class="zbody"><b>Ligue Pokémon</b><small>Conseil 4 et Maître · N. ${Math.min(...G.LEAGUE.flatMap(L => L.team.map(x => x[1])))}–${Math.max(...G.LEAGUE.flatMap(L => L.team.map(x => x[1])))}</small><span class="zmeta"><em>${S.champ ? 'Vous êtes Maître de la Ligue' : open ? 'Ouverte' : '🔒 8 badges et Route Victoire terminée'}</em></span></span></button>`;
}

// ---------- ZONE
let pendingEnc = null, pendingZ = 0;
// the wild Pokémon found by exploring stays there (even after visiting other menus or reloading) until fought or replaced
// the Pokémon the player is hunting in this zone (farm target, or a rarity they asked the farm to stop on): never fought in auto mode
function wantedFoe(m) { try { const c = farmCfg(view.zid); const r = sp(m.s).rar; return (!!c.id && (m.s === c.id || sp(m.s).dn === sp(c.id).dn)) || (c.stopR && r === 'rare') } catch (e) { return false } }
function setPend(e, z) { pendingEnc = e || null; pendingZ = e ? (z || view.zid) : 0; const S = Gm.get(); if (S) S.pend = e ? { z: pendingZ, e } : null }
function curPend() { const S = Gm.get(); const p = S && S.pend; if (!p || !p.e) { pendingEnc = null; return null } pendingEnc = p.e; pendingZ = p.z; return p.z === view.zid ? p.e : null }
function renderZone() {
  const S = Gm.get(); const z = Gm.zone(view.zid); S.cur = z.id; const st = Gm.zst(z.id); const night = Gm.isNight();
  const rate = Gm.shinyRate();
  let h = `<section class="zhero bio-${z.bio}${night ? ' night' : ''}"><button class="back" data-go="map">← Carte</button><p class="eyebrow">Zone ${z.id} · N. ${z.lv[0]}–${z.lv[1]}</p><h1>${esc(z.n)}</h1><p class="sub">${esc(z.desc)}</p><div class="ztypes">${z.types.map(t => typeChip(t, 1)).join('')}</div>${wxChip(z.id)}${cdChip()}${partnerZoneHTML(z.id)}</section>`;
  // encounter panel
  h += `<section class="encp" id="encp">${encPanel()}</section>`;
  h += S.champ ? `<button class="radbtn" data-go="radar" data-arg="${z.id}"><span class="radic">📡</span><span><b>Poké Radar</b><small>Faites des chaînes dans les herbes qui bougent : jusqu’à 1/${Math.round(1 / Gm.radarShRate(40))} de chance chromatique par herbe à 40 de chaîne</small></span>${S.stats.radarBest ? `<em>Record ${S.stats.radarBest}</em>` : ''}</button>` : `<div class="radbtn locked"><span class="radic">📡</span><span><b>Poké Radar</b><small>🔒 Devenez Maître de la Ligue pour l’obtenir</small></span></div>`;
  h += `<p class="rates">Chromatique 1/${Math.round(1 / rate)} · Épique 1/${Gm.RATE.epic} · Légendaire 1/${fmt(Gm.RATE.leg)}${S.inc ? ` · ${esc(S.inc.n)} actif (${S.inc.left})` : ''}</p>`;
  // trainers
  h += `<section class="blk"><h2>Dresseurs</h2><div class="trlist">`;
  const ri0 = Gm.rivalIndexForZone(z.id);
  if (ri0 >= 0) { const team = Gm.rivalTeam(ri0); h += trRow({ c: 'Rival', n: S.rival, team: team.map(m => [m.s, m.lv]), boss: 1 }, 'rival', st.rival) }
  z.tr.forEach((t, i) => h += trRow(t, i, st.tr.includes(i)));
  h += '</div></section>';
  const gi = Gm.gymIndexForZone(z.id);
  if (gi >= 0) { const g = G.GYMS[gi]; h += `<section class="blk gymb" style="--tc:${TC[g.type]}"><div><p class="eyebrow">Arène ${TL[g.type]}</p><h2>Champion ${esc(g.n)}</h2><p class="sub">${g.team.length} Pokémon · N. ${Math.min(...g.team.map(x => x[1]))}–${Math.max(...g.team.map(x => x[1]))}${gi >= 6 ? ' · utilise la Méga-Évolution' : ''}</p><div class="trteam">${g.team.map(x => spr(sp(x[0]).ix, 0, 'tri')).join('')}</div></div><button class="btn pri" data-act="gym" data-i="${gi}">${S.gyms[gi] ? 'Rejouer (sans récompense)' : 'Défier l’Arène'}</button>${S.gyms[gi] ? `<span class="badge-got">${W.GYMB && W.GYMB[g.type] ? `<img class="gbig" src="${W.GYMB[g.type]}" alt="">` : ''}${esc(g.badge)} obtenu</span>` : (W.GYMB && W.GYMB[g.type] ? `<img class="gbig dim" src="${W.GYMB[g.type]}" alt="" title="${esc(g.badge)}">` : '')}</section>` }
  // species grid
  const list = z.sp.slice().sort((a, b) => ['commun', 'peucommun', 'rare', 'epique', 'legendaire'].indexOf(sp(a).rar) - ['commun', 'peucommun', 'rare', 'epique', 'legendaire'].indexOf(sp(b).rar) || sp(a).dn - sp(b).dn);
  const shv = !!view.zshiny; const shc = z.sp.filter(id => Gm.shinyCaught(id)).length;
  h += `<section class="blk"><h2>Pokémon de la zone <small>${shv ? `${shc}/${z.sp.length} chromatiques capturés` : `${zoneProgress(z)[0]}/${z.sp.length} capturés`}</small><button class="btn sm shtoggle ${shv ? 'on' : ''}" data-act="zshiny" title="Afficher les Pokémon de la zone en chromatique">${SHI} ${shv ? 'Vue normale' : 'Voir en chromatique'}</button></h2><div class="spgrid ${shv ? 'shview' : ''}">`;
  for (const id of list) {
    const s = sp(id); const seen = Gm.seen(id), cg = shv ? Gm.shinyCaught(id) : Gm.caught(id); const r = RAR[s.rar];
    const hidden = !seen && (s.rar === 'legendaire' || s.rar === 'epique');
    const vis = cg ? 'cg' : (shv ? (Gm.get().dex[id] || 0) & 8 : seen) ? 'gray' : 'blk';
    h += `<button class="spc ${r[1]} ${seen ? '' : 'unseen'} ${cg ? 'cg' : ''} v-${vis}" data-act="dexd" data-id="${id}" title="${seen ? esc(s.n) : '???'}">${spr(s.ix, shv && seen ? 1 : 0)}<b>${seen ? esc(s.n) : '???'}</b><small>${r[0]}${s.tod ? (s.tod === 'n' ? ' · ☾' : ' · ☀') : ''}</small>${cg ? '<i class="cgm">●</i>' : ''}${hidden ? '<i class="q">?</i>' : ''}</button>`;
  }
  h += '</div></section>';
  // zone achievements
  const za = Gm.zachState(z);
  h += `<section class="blk"><h2>Succès de la zone <small>${za.filter(a => a.ok).length}/${za.length}</small></h2><div class="zach">${za.map(a => `<div class="zac ${a.ok ? 'ok' : ''} ${a.claimed ? 'done' : ''}"><i>${a.ok ? '★' : '☆'}</i><span><b>${a.n}</b><small>${a.d}</small><small class="mut">Récompense : ${[a.rw.money ? fmt(a.rw.money) + ' ₽' : '', ...(a.rw.items || []).map(([n, q]) => q > 1 ? n + ' ×' + q : n)].filter(Boolean).join(' + ')}</small></span>${a.claimed ? '<span class="chip">Reçu</span>' : a.ok ? `<button class="btn sm pri" data-act="zach" data-k="${a.k}">Récupérer</button>` : ''}</div>`).join('')}</div></section>`;
  return h;
}
function trRow(t, i, beaten) {
  const S = Gm.get();
  const lv = Math.max(...t.team.map(x => x[1]));
  return `<div class="tr ${beaten ? 'beat' : ''} ${t.boss ? 'boss' : ''}"><div class="trinfo"><b>${esc(t.c)} ${esc(t.n)}</b><small>${t.team.length} Pokémon · N. ${lv}${t.dbl ? ' · Combat Duo' : ''}</small><div class="trteam">${t.team.map(x => spr(sp(x[0]).ix, 0, 'tri' + (beaten || Gm.seen(x[0]) ? '' : ' unseen'))).join('')}</div></div><button class="btn ${beaten ? '' : 'pri'}" data-act="trainer" data-i="${i}">${beaten ? 'Revanche' : 'Combattre'}</button></div>`;
}
function encPanel() {
  const S = Gm.get();
  if (curPend()) {
    const e = pendingEnc; const s = sp(e.id); const r = RAR[s.rar];
    return `<div class="enccard ${r[1]} ${e.sh ? 'shiny' : ''} ${e.hw ? 'hw' : ''}"><button class="encx" data-act="encclose" title="Laisser ce Pokémon et revenir à la zone (Centre Pokémon…)" aria-label="Fermer">✕</button><div class="encspr">${e.hw ? `<img class="big hwspr" src="${Gm.hwURL(e.id, e.sh) || (W.HWI && W.HWI[e.id] && W.HWI[e.id][e.sh ? 's' : 'n'])}" alt="">` : spr(s.ix, e.sh, 'big')}${e.sh ? '<span class="sparkle"></span>' : ''}</div><div class="encinfo"><p class="eyebrow">${e.hw ? '<span class="hwtag">☾ Palette Halloween</span> · ' : ''}${e.sh ? '' + SHI + ' Chromatique ' + SHI + ' · ' : ''}${r[0]}</p><h2>${esc(s.n)} <small>N.${e.lv}</small></h2><div>${s.t.map(t => typeChip(t, 1)).join('')} ${Gm.caught(e.id) ? '<span class="chip">Déjà capturé</span>' : '<span class="chip new">Nouveau</span>'}${e.ha ? ` <span class="chip hach" title="Talent caché">★ ${esc(s.ha)}</span>` : ''}</div><div class="encbtns"><button class="btn pri" data-act="fight" id="bfight">Combattre <kbd>F</kbd></button><button class="btn" data-act="explore">Fuir et continuer <kbd>E</kbd></button><button class="btn" data-act="farm" title="Fuir et relancer le farm auto">Fuir et farm ∞</button></div></div></div>`;
  }
  const can = Gm.teamAlive();
  if (farm.on) return `<div class="explore farming"><div class="farminfo"><b>Farm auto en cours…${farm.target ? ` <span class="mut">(cible : ${esc(Gm.seen(farm.target) ? sp(farm.target).n : '???')})</span>` : ''}</b><small>${farm.n} combat${farm.n > 1 ? 's' : ''} · ${farm.win} victoire${farm.win > 1 ? 's' : ''}${farm.skip ? ` · ${fmt(farm.skip)} passé${farm.skip > 1 ? 's' : ''} sans combat` : ''} · ${fmt(farm.money)} ₽ gagnés${farm.items ? ` · ${farm.items} objet${farm.items > 1 ? 's' : ''}` : ''}</small></div><button class="btn danger" data-act="farmstop">Arrêter</button></div>`;
  const balls = Object.keys(S.items).filter(n => IT[n] && IT[n].cat === 'ball' && S.items[n] > 0);
  return `<div class="explore"><button class="btn xl" data-act="explore" ${can ? '' : 'disabled'}>Explorer <kbd>E</kbd></button><button class="btn" data-act="heal" ${S.lr ? 'disabled' : ''}>Centre Pokémon</button><button class="btn" data-act="qbag">Objet</button>${balls.length ? `<label class="qball" title="Ball proposée en premier en combat (bouton « dernière Ball »)">${S.lastBall && S.items[S.lastBall] ? UI.itemIcon(S.lastBall, 'ii sm') : ''}<select data-qball>${balls.map(n => `<option value="${esc(n)}" ${S.lastBall === n ? 'selected' : ''}>${esc(n)} ×${S.items[n]}</option>`).join('')}</select></label>` : ''}</div>${farmCardHTML(can && !S.lr)}${incCardHTML()}${can ? '' : '<p class="warn">Votre équipe est K.O. Passez au Centre Pokémon.</p>'}`;
}
function refreshEnc() { const el = $('#encp'); if (el) el.innerHTML = encPanel(); header(); refreshSides(); if (curPend() && pendingEnc.sh && W.playSparkle) { const h = el && el.querySelector('.encspr'); if (h && !h.dataset.sp) { h.dataset.sp = 1; W.playSparkle(h, 1.3) } } }
async function doExplore() {
  const S = Gm.get(); if (busy) return; if (!Gm.teamAlive()) { UI.toast('Votre équipe est K.O.', 'bad'); return }
  setPend(Gm.rollEncounter(view.zid)); Gm.save(true); refreshEnc(); Gm.preloadAnim(pendingEnc.id, pendingEnc.sh);
}
// ---------- endless auto farm (one settings menu per zone)
const farm = { on: false, n: 0, win: 0, money: 0, items: 0, skip: 0 };
W.FARM = farm;
// settings of a zone, upgraded from the older format
function farmCfg(zid) {
  const S = Gm.get(); S.farmT = S.farmT || {}; const o = S.farmT[zid] || (S.farmT[zid] = { id: 0 });
  if (!o.v) { const st = S.set.farmStop || 'els'; o.tgt = o.haOnly ? 'ha' : o.shOnly ? 'shiny' : 'stop'; o.others = 'fight'; o.stopS = o.shOnly || o.haOnly ? 0 : (o.noSh ? 0 : st.includes('s') ? 1 : 0); o.stopE = o.shOnly || o.haOnly || o.only ? 0 : st.includes('e') ? 1 : 0; o.stopL = o.shOnly || o.haOnly || o.only ? 0 : st.includes('l') ? 1 : 0; o.v = 2 }
  o.others = 'fight'; // every Pokémon is fought (no skipping)
  if (o.id && !Gm.zone(zid).sp.includes(o.id)) o.id = 0; if (o.tgt === 'ha' && !(o.id && sp(o.id).ha)) o.tgt = 'stop';
  return o;
}
const FT_TGT = { stop: 'S’arrêter dessus', shiny: 'Seulement s’il est chromatique', ha: 'Seulement avec son talent caché', fight: 'Le combattre en boucle' };
function farmSummary(c) {
  const t = c.id ? (Gm.seen(c.id) ? sp(c.id).n : '???') : null; const stops = [c.stopS && 'chromatique', c.stopR && 'Rare', c.stopE && 'Épique', c.stopL && 'Légendaire'].filter(Boolean);
  const parts = [];
  if (t) parts.push(c.tgt === 'fight' ? `combat ${esc(t)} en boucle` : c.tgt === 'shiny' ? `s’arrête sur ${esc(t)} chromatique` : c.tgt === 'ha' ? `s’arrête sur ${esc(t)} avec talent caché` : `s’arrête sur ${esc(t)}`);
  parts.push(c.others === 'skip' ? (t ? 'passe tous les autres sans combattre' : 'passe les Pokémon sans combattre') : (t ? 'combat les autres' : 'combat tout'));
  if (stops.length) parts.push(`${t ? 'et ' : ''}s’arrête sur ${stops.join(', ')}`);
  return parts.join(' · ');
}
// incense counter on the zone page
function incCardHTML() {
  const S = Gm.get(); const inc = S.inc;
  if (inc) { const it = IT[inc.n] || {}; const mx = it.left || inc.left; const pct = Math.max(2, Math.min(100, inc.left / mx * 100)); const eff = inc.k === 'rare' ? 'Pokémon rares ×' + inc.x : inc.k === 'epique' ? 'Épiques ×' + inc.x : inc.k === 'legendaire' ? 'Légendaires ×' + inc.x : '';
    return `<div class="inccard on ${pct < 15 ? 'low' : ''}"><span class="incic">${UI.itemIcon(inc.n, 'ii')}</span><div class="incinfo"><b>${esc(inc.n)} actif <small>${eff}</small></b><span class="incmeter"><u style="width:${pct}%"></u></span><small><b>${fmt(inc.left)}</b> / ${fmt(mx)} rencontres restantes</small></div></div>` }
  const own = Object.keys(S.items).filter(n => IT[n] && IT[n].cat === 'incense' && S.items[n] > 0);
  return own.length ? `<div class="inccard"><span class="incic">${UI.itemIcon(own[0], 'ii')}</span><div class="incinfo"><b>Aucun encens actif</b><small>Vous en avez ${own.map(n => `${esc(n)} ×${S.items[n]}`).join(', ')}.</small></div><button class="btn sm" data-act="incopen">Allumer un encens</button></div>` : '';
}
function farmCardHTML(ok) {
  const c = farmCfg(view.zid); const s = c.id ? sp(c.id) : null;
  return `<div class="farmcard"><div class="fcicon">${s ? spr(s.ix, c.tgt === 'shiny' ? 1 : 0, 'tri' + (Gm.seen(c.id) ? '' : ' unseen')) : '<span>∞</span>'}</div><div class="fcinfo"><b>Farm auto${s ? ` · 🎯 ${esc(Gm.seen(c.id) ? s.n : '???')}` : ''}</b><small>${farmSummary(c)}</small></div><div class="fcbtns"><button class="btn" data-act="farmcfg">⚙ Régler</button><button class="btn pri" data-act="farm" ${ok ? '' : 'disabled'}>▶ Lancer</button></div></div>`;
}
async function farmPick(cur0) {
  const S = Gm.get(); const zid = view.zid; const order = ['commun', 'peucommun', 'rare', 'epique', 'legendaire'];
  const zsp = Gm.zone(zid).sp.slice().sort((a, b) => order.indexOf(sp(a).rar) - order.indexOf(sp(b).rar) || sp(a).dn - sp(b).dn);
  const cur = cur0 != null ? cur0 : farmCfg(zid).id;
  const card = id => { const s = sp(id), seen = Gm.seen(id); return `<button class="ftc ${RAR[s.rar][1]} ${cur === id ? 'on' : ''}" data-ret="${id}" data-q="${esc((seen ? s.n : '???').toLowerCase())}">${spr(s.ix, 0, 'tri' + (seen ? '' : ' unseen'))}<b>${seen ? esc(s.n) : '???'}</b><small>${s.tod === 'n' ? '☾ nuit' : s.tod === 'd' ? '☀ jour' : '&nbsp;'}</small>${Gm.caught(id) ? '<i class="cgm">●</i>' : ''}</button>` };
  const html = `<h3>Choisir la cible</h3><p class="mut">● = déjà capturée. Les Pokémon jamais vus restent cachés.</p><input id="ftq" type="search" placeholder="Rechercher…" autocomplete="off"><div class="ftlist">${order.map(r => { const ids = zsp.filter(id => sp(id).rar === r); return ids.length ? `<div class="ftgrp" data-r="${r}"><h4>${RAR[r][0]} <small>${ids.length}</small></h4><div class="ftgrid">${ids.map(card).join('')}</div></div>` : '' }).join('')}</div><div class="mbtns"><button class="btn" data-ret="0">Aucune cible</button></div>`;
  const r = await UI.modal(html, { cls: 'wide', onOpen: w => { const q = w.querySelector('#ftq'); q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); w.querySelectorAll('.ftc').forEach(b => { b.hidden = !!v && !b.dataset.q.includes(v) }); w.querySelectorAll('.ftgrp').forEach(g => { g.hidden = ![...g.querySelectorAll('.ftc')].some(b => !b.hidden) }) }); setTimeout(() => q.focus(), 50) } });
  return r == null ? null : +r;
}
// the mini menu: target, what to do with it, the other Pokémon, and when to stop
async function farmMenu() {
  const zid = view.zid; const c0 = farmCfg(zid); const d = Object.assign({}, c0);
  const seg = (k, opts) => `<div class="fmseg">${opts.map(([v, l, dis, tip]) => `<button type="button" class="${d[k] === v ? 'on' : ''}" data-k="${k}" data-v="${v}" ${dis ? 'disabled' : ''} title="${esc(tip || '')}">${l}</button>`).join('')}</div>`;
  const body = () => { const s = d.id ? sp(d.id) : null; const hasHA = !!(s && s.ha); const noTime = s && !Gm.zoneSpecies(zid, Gm.isNight()).includes(d.id);
    const bad = d.others === 'skip' && !d.id && !d.stopS && !d.stopR && !d.stopE && !d.stopL;
    return `<div class="fmsec"><h4>1 · Cible</h4><div class="fmtgt">${s ? `${spr(s.ix, 0, 'tri' + (Gm.seen(d.id) ? '' : ' unseen'))}<span><b>${esc(Gm.seen(d.id) ? s.n : '???')}</b><small>${RAR[s.rar][0]}${s.tod === 'n' ? ' · ☾ la nuit' : s.tod === 'd' ? ' · ☀ le jour' : ''}${noTime ? ' · <em class="warnc">n’apparaît pas en ce moment</em>' : ''}</small></span>` : '<span class="ftnone">＋</span><span><b>Aucune cible</b><small>Le farm combat ce qui vient</small></span>'}<button type="button" class="btn sm" data-pick="1">${s ? 'Changer' : 'Choisir'}</button>${s ? '<button type="button" class="mini" data-clear="1">✕</button>' : ''}</div></div>
    <div class="fmsec ${s ? '' : 'off'}"><h4>2 · Quand la cible apparaît</h4>${seg('tgt', [['stop', '🛑 S’arrêter dessus', !s, 'Pour la capturer'], ['shiny', SHI + ' Seulement chromatique', !s, 'Chasse chromatique : les versions normales sont combattues comme les autres'], ['ha', '★ Seulement talent caché', !hasHA, hasHA ? 'Talent caché : ' + s.ha : 'Pas de talent caché'], ['fight', '⚔ La combattre en boucle', !s, 'Pour l’Exp. ou les EV sur une seule espèce']])}</div>
    <div class="fmsec"><h4>3 · Toujours s’arrêter sur</h4><div class="fmcks"><label class="ck"><input type="checkbox" data-ck="stopS" ${d.stopS ? 'checked' : ''}> ${SHI} Chromatique (et palette Halloween)</label><label class="ck"><input type="checkbox" data-ck="stopR" ${d.stopR ? 'checked' : ''}> Rare</label><label class="ck"><input type="checkbox" data-ck="stopE" ${d.stopE ? 'checked' : ''}> Épique</label><label class="ck"><input type="checkbox" data-ck="stopL" ${d.stopL ? 'checked' : ''}> Légendaire</label></div></div>
    <p class="fmsum">${bad ? '⚠ Sans cible ni arrêt, le farm passerait tout à l’infini : choisissez une cible ou un arrêt.' : '➜ ' + farmSummary(d)}</p>
    <div class="mbtns"><button type="button" class="btn" data-save="1">Enregistrer</button><button type="button" class="btn pri" data-go3="1" ${bad || !Gm.teamAlive() ? 'disabled' : ''}>▶ Lancer le farm</button></div>` };
  let go = false;
  const r = await UI.modal(`<h3>Farm auto ∞</h3><div class="fmbody">${body()}</div>`, { cls: 'wide fmmodal', onClick: async (e, close, w) => {
    const re = () => { w.querySelector('.fmbody').innerHTML = body() };
    const b = e.target.closest('[data-k]'); if (b && !b.disabled) { d[b.dataset.k] = b.dataset.v; re(); return }
    if (e.target.closest('[data-clear]')) { d.id = 0; d.tgt = 'stop'; re(); return }
    if (e.target.closest('[data-pick]')) { w.style.display = 'none'; const id = await farmPick(d.id); w.style.display = ''; if (id != null) { d.id = id; if (!id || (d.tgt === 'ha' && !sp(id).ha)) d.tgt = 'stop' } re(); return }
    if (e.target.closest('[data-save]')) { close('save'); return } if (e.target.closest('[data-go3]')) { close('go'); return }
  }, onOpen: w => { w.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.ck; if (k) { d[k] = e.target.checked ? 1 : 0; w.querySelector('.fmbody').innerHTML = body() } }) } });
  if (r !== 'save' && r !== 'go') return;
  Object.assign(c0, d); Gm.save(true); refreshEnc(); if (r === 'go') doFarm();
}
async function doFarm() {
  const S = Gm.get(); if (busy || farm.on) return;
  if (S.lr) { UI.toast('Impossible pendant la Ligue.', 'bad'); return }
  const zid = view.zid; const c = farmCfg(zid); if (view.tab !== 'zone') return;
  if (c.others === 'skip' && !c.id && !c.stopS && !c.stopR && !c.stopE && !c.stopL) { farmMenu(); return }
  farm.target = c.id || 0;
  const tXp = () => Gm.get().team.reduce((a, m) => a + (m.xp || 0), 0), tLv = () => Gm.get().team.reduce((a, m) => a + m.lv, 0);
  Object.assign(farm, { on: true, n: 0, win: 0, money: 0, items: 0, skip: 0, seen: [], t0: Date.now(), xp0: tXp(), lv0: tLv() }); setPend(null); refreshEnc(); let fwhy = '';
  let lastPaint = 0;
  try {
    while (farm.on) {
      if (view.tab !== 'zone' || view.zid !== zid) { farm.on = false; break }
      // skipping only works if something can still stop the farm right now
      if (c.others === 'skip' && c.id && !c.stopS && !c.stopR && !c.stopE && !c.stopL && !Gm.zoneSpecies(zid, Gm.isNight()).includes(c.id)) { farm.on = false; UI.toast(`${esc(sp(c.id).n)} n’apparaît pas en ce moment (${sp(c.id).tod === 'n' ? 'la nuit seulement' : 'le jour seulement'}) : farm arrêté.`, 'bad'); break }
      Gm.healTeam(); // the Centre Pokémon is free: heal between fights
      const e = Gm.rollEncounter(zid); const s = sp(e.id); const isT = !!c.id && e.id === c.id; if (e.sh || e.hw || ['rare', 'epique', 'legendaire'].includes(s.rar)) farm.seen.push({ id: e.id, sh: e.sh });
      let act = null;
      if (isT) act = c.tgt === 'stop' ? 'stop' : c.tgt === 'shiny' ? (e.sh ? 'stop' : null) : c.tgt === 'ha' ? (e.ha ? 'stop' : null) : (e.sh && c.stopS ? 'stop' : 'fight');
      if (!act) act = (c.stopS && (e.sh || e.hw)) || (c.stopR && s.rar === 'rare') || (c.stopE && s.rar === 'epique') || (c.stopL && s.rar === 'legendaire') ? 'stop' : 'fight';
      if (act === 'stop') {
        fwhy = 'arrêté sur ' + s.n;
        farm.on = false; setPend(e, zid); const wasAuto = !!S.set.auto; S.set.auto = 0; Gm.save(true); refreshEnc(); Gm.preloadAnim(e.id, e.sh);
        if (e.sh && W.Sound) W.Sound.sfx('shiny');
        await UI.alert(`Farm arrêté après ${farm.n} combat${farm.n > 1 ? 's' : ''}${farm.skip ? ` et ${fmt(farm.skip)} Pokémon passés` : ''} : ${e.hw ? '<b>palette Halloween</b> ' : ''}${e.sh ? '<b>' + SHI + ' chromatique ' + SHI + '</b> ' : ''}<b>${esc(s.n)}</b>${e.ha ? ` avec son talent caché <b>★ ${esc(s.ha)}</b>` : ''} ${s.rar === 'legendaire' ? '(Légendaire)' : s.rar === 'epique' ? '(Épique)' : ''} apparaît ! À vous de jouer.${wasAuto ? '<br><small>Le mode auto a été désactivé pour ne pas mettre votre cible K.O. par erreur.</small>' : ''}`);
        break;
      }
      const m0 = S.money, it0 = Object.values(S.items).reduce((a, b) => a + b, 0);
      const wild = Gm.makeWild(e);
      const out = await startBattle({ kind: 'wild', foe: [wild], bio: Gm.zone(zid).bio, wildLv: e.lv, farm: true });
      farm.n++; farm.money += Math.max(0, S.money - m0); const it1 = Object.values(S.items).reduce((a, b) => a + b, 0); if (it1 > it0) farm.items += it1 - it0;
      if (!out) { farm.on = false; break }
      if (out.res === 'win' || out.res === 'catch') farm.win++;
      if (out.res === 'lose') { farm.on = false; fwhy = 'équipe K.O.'; UI.toast('Farm arrêté : votre équipe a perdu.', 'bad'); break }
      refreshEnc();
      await wait(250);
    }
  } finally { farm.on = false; Gm.save(); if (view.tab === 'zone') refreshEnc(); menuMusic() }
  farm.xp1 = tXp(); farm.lv1 = tLv(); if (Gm.get().set.frep !== 0) await farmReport({ ...farm }, fwhy);
  // evolutions were put on hold during the farm
  for (const m of Gm.get().team.slice()) { const ev = P.evoOptions(m, { night: Gm.isNight() }); if (ev.length) await evolveFlow(m, ev[0].to) }
  Gm.save(); if (view.tab === 'zone') refreshEnc();
  if (farm.n || farm.skip) UI.toast(`Farm terminé : ${farm.n} combats, ${farm.win} victoires${farm.skip ? `, ${fmt(farm.skip)} passés` : ''}, ${fmt(farm.money)} ₽${farm.items ? `, ${farm.items} objet${farm.items > 1 ? 's' : ''}` : ''}.`);
}
async function doQuick() {
  const S = Gm.get(); if (busy || !Gm.teamAlive()) return; let n = 0; S.stats.quick++;
  while (n < 60) {
    n++; const e = Gm.rollEncounter(view.zid); const s = sp(e.id);
    if (e.sh || s.rar === 'epique' || s.rar === 'legendaire' || !Gm.caught(e.id)) { setPend(e); break }
  }
  Gm.save(true);
  if (!pendingEnc) UI.toast(`${n} rencontres : rien de nouveau.`);
  else UI.toast(`Après ${n} rencontre${n > 1 ? 's' : ''} : ${esc(sp(pendingEnc.id).n)}${pendingEnc.sh ? ' chromatique ' + SHI + '' : ''} !`, pendingEnc.sh ? 'shiny' : '');
  refreshEnc();
}
async function doFight() {
  if (!curPend() || busy) return; const e = pendingEnc; setPend(null); Gm.save(true);
  const z = Gm.zone(view.zid);
  const wild = Gm.makeWild(e);
  await startBattle({ kind: 'wild', foe: [wild], bio: z.bio, legendary: sp(e.id).rar === 'legendaire', wildLv: e.lv });
}

// ---------- BATTLE orchestration
const CONSUMABLE = n => /^Baie /.test(n) || n === 'Ceinture Force' || n === 'Herbe Pouvoir' || n === 'Ballon';
async function startBattle(cfg) {
  const S = Gm.get(); if (busy) return; busy = true;
  try {
    const ui = new BUI({ wxv: cfg.kind === 'wild' && cfg.evTrain == null && (view.tab === 'zone' || view.tab === 'radar') ? Gm.zoneWeather(view.zid).k : '', farm: !!cfg.farm, bio: cfg.bio, indoor: cfg.indoor, kind: cfg.kind, music: cfg.music || (cfg.kind === 'wild' ? 'wild' : 'trainer'), autoBlock: !!cfg.noAuto || cfg.kind === 'wild' && !cfg.evTrain && cfg.foe.some(m => m.sh || m.hw || ['epique', 'legendaire'].includes(sp(m.s).rar) || wantedFoe(m)) });
    const playerMons = cfg.playerMons || S.team;
    if (!cfg.playerMons) { const first = playerMons.findIndex(m => m.hp > 0); if (first > 0) { } }
    // put healthy mons first in battle order without altering team order
    const order = cfg.playerMons ? playerMons : [...playerMons.filter(m => m.hp > 0), ...playerMons.filter(m => m.hp <= 0)];
    for (const m of cfg.foe) { Gm.dexSet(m.s, 1 | (m.sh ? 8 : 0)); if (m.hw && !cfg.pvp) Gm.hwDexSet(m.s, 1); if (!cfg.pvp) { Gm.dexInc(m.s, 0); if (m.sh) Gm.dexInc(m.s, 2) } }
    if (cfg.kind === 'wild' && cfg.evTrain == null) { S.stats.enc++; Gm.qev('enc') }
    const io = cfg.ioWrap ? cfg.ioWrap(ui) : ui;
    const bt = new PB.Battle({ remote: cfg.remote, kind: cfg.kind, dbl: cfg.dbl && order.filter(m => m.hp > 0).length >= 2, io, zone: view.zid,
      player: { mons: order, name: S.name, megaRing: !!S.flags.ring && cfg.allowMega !== false },
      foe: { mons: cfg.foe, name: cfg.name, cls: cfg.cls, ai: cfg.ai || 1, megaRing: !!cfg.megaRing },
      fixedLevel: cfg.fixedLevel, lvCap: Gm.levelCap(), expShare: !!S.flags.share, noExp: !!cfg.noExp, night: Gm.isNight(), isCaught: id => !!Gm.caught(id),
      onUseItem: n => Gm.add(n, -1), canFlee: !!cfg.raid, allowItems: cfg.allowItems, legendary: cfg.legendary, evTrain: cfg.evTrain, evAmt: cfg.evAmt, noMega: cfg.noMega, partner: !cfg.pvp && Gm.partner() ? Gm.partner().u : '', pH: !cfg.pvp && Gm.partner() ? Gm.hearts(Gm.partner()) : 0, weather: cfg.kind === 'wild' && cfg.evTrain == null && (view.tab === 'zone' || view.tab === 'radar') ? Gm.zoneWeather(view.zid).battle : '' });
    if (cfg.raid) { const b = bt.sides[1].mons[0]; b.teraOrig = [...b.types]; b.tera = cfg.raid.tera; b.types = [cfg.raid.tera]; b.raidBoss = true; b.mhp = Math.round(b.mhp * cfg.raid.hp); b._hp = b.mhp }
    const snap = { items: JSON.parse(JSON.stringify(S.items)), mons: S.team.map(m => ({ m, hp: m.hp, st: m.st, pp: m.m.map(x => x[1]), it: m.it })) };
    const res = await bt.start();
    // a Pokémon that fainted while Mega-Evolved cannot Mega-Evolve again during the rest of the run (League)
    if (cfg.megaKO) for (const b of bt.sides[0].mons) if (b.megaData && !b.alive && !cfg.megaKO.includes(b.m.u)) cfg.megaKO.push(b.m.u);
    if (res === 'draw') {
      for (const b of bt.sides[0].mons) if (b.v.movesBackup) b.m.m = b.v.movesBackup;
      if (!cfg.playerMons) { S.items = snap.items; for (const x of snap.mons) { x.m.hp = x.hp; x.m.st = x.st; x.m.m.forEach((mv0, i) => { if (x.pp[i] != null) mv0[1] = x.pp[i] }); x.m.it = x.it } }
      if (cfg.megaKO) cfg.megaKO.length = cfg.megaKOn || 0;
      await ui.msg('Les deux équipes sont K.O. en même temps : match nul !');
      await ui.msg('Le combat est annulé. Vos Pokémon et votre Sac reviennent comme avant le combat : il faudra le refaire.');
      ui.close(); busy = false; Gm.save(); render(); menuMusic(); return { res, bt };
    }
    if (res === 'win') { if (cfg.kind === 'wild') { Gm.qev('wild'); if (cfg.evTrain != null) Gm.qev('evtrain') } else if (cfg.pvp) { } else if (cfg.kind === 'tower') Gm.qev('tower'); else Gm.qev('trainer') }
    // partner: +1 bond per victory where it took part, and sometimes an object found after the battle
    if (res === 'win' && !cfg.pvp && Gm.partner()) { const pm = Gm.partner(); W.__prtJoy = Date.now(); const beat = bt.sides[1].mons.filter(f => !f.alive && [...(bt.participants.get(f) || [])].some(b => b.m === pm)).length; if (beat) { pm.pfW = (pm.pfW || 0) + 1; const up = Gm.partnerGain(beat); if (up) { await ui.msg(`💗 Votre lien avec ${monName(pm)} se renforce : ${up} cœur${up > 1 ? 's' : ''} !`); UI.toast(`💗 ${esc(monName(pm))} : <span class="hearts sm">${HEART('on').repeat(up)}</span> (${up}/5)`) } } const it = Gm.partnerFind(!!cfg.farm); if (it) await ui.msg(`${monName(pm)} a trouvé quelque chose : ${it} !`) }
    // restore per-mon temporary state
    for (const b of bt.sides[0].mons) { if (b.v.movesBackup) b.m.m = b.v.movesBackup; if (!cfg.playerMons && b.m.it && b._it !== b.m.it && CONSUMABLE(b.m.it)) b.m.it = '' }
    S.stats.battles = (S.stats.battles || 0) + 1;
    if (cfg.kind === 'wild' && cfg.evTrain == null) { const coins = bt.sides[1].mons.filter(b => b.base.id === 999 && !b.alive).length; if (coins) { Gm.add('Pièce de Mordudor', coins); UI.toast(`+${coins} Pièce${coins > 1 ? 's' : ''} de Mordudor (${Gm.get().items['Pièce de Mordudor']} / 250)`) } }
    let out = { res, bt };
    if (cfg.after) await cfg.after(res, bt, ui);
    else await defaultAfter(res, bt, ui, cfg);
    ui.close();
    busy = false;
    menuMusic();
    if (!cfg.playerMons && !cfg.farm) await postEvolutions(bt);
    Gm.save();
    render();
    return out;
  } catch (err) { console.error(err); busy = false; const b = $('#battle'); b.hidden = true; document.body.classList.remove('in-battle'); UI.alert('Une erreur est survenue pendant le combat : ' + esc(err.message)); render() }
}
async function defaultAfter(res, bt, ui, cfg) {
  const S = Gm.get();
  if (res === 'catch') {
    const m = bt.captured; const where = Gm.addCaught(m);
    await ui.msg(`${sp(m.s).n} a été ajouté ${where === 'team' ? 'à votre équipe' : 'au PC'}.`);
    if (!Gm.caught(m.s)) { }
  }
  if (res === 'win' && cfg.kind === 'wild') {
    const g = Math.round(cfg.wildLv || 5); S.money += g; S.stats.wins++; await ui.msg(`Vous trouvez ${g} ₽.`);
    const f = bt.sides[1].mons[0]; const it = cfg.evTrain == null ? Gm.rollWildItem() : '';
    if (f && it && P.IT[it]) { Gm.add(it, 1); await ui.msg(`${f.name} a laissé tomber : ${it} !`) }
  }
  if (res === 'win' && cfg.kind !== 'wild') { S.stats.wins++; if (cfg.onWinPaid) (S.paid = S.paid || {})[cfg.onWinPaid] = 1; if (cfg.prize) { S.money += cfg.prize; await ui.msg(`Vous remportez ${fmt(cfg.prize)} ₽ !`) } if (cfg.onWin) await cfg.onWin(ui) }
  if (res === 'lose') {
    await ui.msg(cfg.kind === 'wild' ? 'Vous n’avez plus de Pokémon en forme…' : `Vous avez perdu contre ${cfg.cls ? cfg.cls + ' ' : ''}${cfg.name}…`);
    await ui.msg('Vous filez au Centre Pokémon soigner votre équipe.');
    Gm.healTeam(); if (cfg.onLose) await cfg.onLose(ui);
  }
}
async function postEvolutions(bt) {
  const S = Gm.get(); const done = new Set();
  for (const e of bt.expLog) {
    const m = e.m; if (done.has(m.u) || !S.team.includes(m)) continue; done.add(m.u);
    const opts = P.evoOptions(m, { night: Gm.isNight() }); if (!opts.length) continue;
    await evolveFlow(m, opts[0].to);
  }
  for (const m of S.team) await checkMoveForms(m);
}
// animated sprite for a Pokémon of the player (team cards); still icon while loading or when none exists
let monAnimT = 0;
function monAnim(m, cls) {
  if (m.hw || Gm.get().set.spr === 'home') return monIcon(m, cls);
  const id = m.fm && G.FORMS[m.fm] ? G.FORMS[m.fm].id : m.s;
  const u = Gm.animURL('f' + (m.sh ? 's' : 'n'), id, () => { clearTimeout(monAnimT); monAnimT = setTimeout(() => { if (view.tab === 'team' || view.tab === 'pc') render(); else document.querySelectorAll('.animwait').forEach(el => { const md = el.closest('.md2-art'); if (md && md.dataset.u) { const [mm] = Gm.findMon(md.dataset.u); if (mm) md.innerHTML = monAnim(mm, 'big') } }) }, 120) });
  // the animation is still loading: an empty frame (not the still sprite) until it arrives, so the sprite does not switch style
  if (!u) { const k = 'f' + (m.sh ? 's' : 'n'); if (W.ANIX && W.ANIX[k] && W.ANIX[k][id] != null) return `<span class="${cls} animwait"></span>`;
    // no animated sprite for this Pokémon: its still pixel sprite, sized like the animated ones (sharper than a blown-up HOME render)
    const hd = Gm.homeHD(id, m.sh) || Gm.homeHD(m.s, m.sh); return hd ? `<img class="${cls} anim hd" src="${hd}" alt="" onload="UI.fitAnim(this)">` : monIcon(m, cls) }
  const F = W.AFILL && W.AFILL['f' + (m.sh ? 's' : 'n')]; const fl = F && F[id] ? F[id].join(',') : '';
  const sm = W.ANIM_SMOOTH && W.ANIM_SMOOTH.includes(id) ? ' hd' : ''; // 3D renders sent for the 9th gen: smooth, not pixel art
  return `<img class="${cls} anim${sm}" src="${u}" alt="" data-fill="${fl}" onload="UI.fitAnim(this)">`;
}
// an animated sprite takes the same visible size as the others, whatever the empty space around it in its frames
const ANIM_BB = {};
UI.fitAnim = img => {
  const box = img.parentElement; if (!box || !img.naturalWidth) return; const key = img.src.slice(-80) + img.naturalWidth;
  const place = bb => { const bw = box.clientWidth, bh = box.clientHeight; if (!bw || !bh) return; const d = Math.max(img.naturalWidth, img.naturalHeight), u = img.classList.contains('hd') ? Math.min(bw, bh) * 0.7 / d : Math.min(bw, bh) * 0.86 * Math.sqrt(Math.min(d, 150) / 150) / d; const k = Math.min(bh * 0.86 / bb.h, bw * 0.92 / bb.w, u);
    Object.assign(img.style, { position: 'absolute', width: Math.round(img.naturalWidth * k) + 'px', height: Math.round(img.naturalHeight * k) + 'px', left: Math.round(bw / 2 - (bb.x + bb.w / 2) * k) + 'px', top: Math.round(bh * 0.88 - (bb.y + bb.h) * k) + 'px', maxWidth: 'none', maxHeight: 'none' }); img.classList.add('fit') };
  if (ANIM_BB[key]) return place(ANIM_BB[key]);
  // what is really drawn in the frame (animated sprites have a lot of empty space, not always centred)
  try { const c = document.createElement('canvas'); const w = c.width = img.naturalWidth, h = c.height = img.naturalHeight; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) if (d[(y * w + xx) * 4 + 3] > 24) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y }
    const bb = x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: Math.max(1, x1 - x0 + 1), h: Math.max(1, y1 - y0 + 1) };
    // the first frame is not always the largest one: keep a little margin
    bb.x -= bb.w * 0.06; bb.w *= 1.12; bb.y -= bb.h * 0.08; bb.h *= 1.08; ANIM_BB[key] = bb; place(bb) } catch (e) { const [fh, fw] = (img.dataset.fill || '').split(',').map(Number); place({ x: img.naturalWidth * (1 - (fw || 0.8)) / 2, y: img.naturalHeight * (1 - (fh || 0.8)), w: img.naturalWidth * (fw || 0.8), h: img.naturalHeight * (fh || 0.8) }) }
};
// big animated front sprite when there is one (falls back to the still sprite)
function bigSprURL(id, sh) { const ix = sp(id).ix; return Gm.animURL('f' + (sh ? 's' : 'n'), id) || Gm.homeHD(id, sh) || Gm.frontURL(id, sh) || Gm.spriteURL(ix, sh) }
async function preloadBig(ids, sh) { if (Gm.get() && Gm.get().set.spr === 'home') return; await Promise.race([Promise.all(ids.map(id => new Promise(r => { if (Gm.animURL('f' + (sh ? 's' : 'n'), id, r)) r() }))), wait(900)]) }
// evolution: the Pokémon glows white, then flickers between its two silhouettes faster and faster before the new form appears
async function evolveFlow(m, to) {
  const s0 = sp(m.s), s1 = sp(to); const name0 = monName(m);
  await preloadBig([m.s, to], m.sh);
  const A = bigSprURL(m.s, m.sh), B = bigSprURL(to, m.sh);
  let cancelled = false, finished = false;
  const ok = await UI.modal(`<div class="evo2"><div class="evobg"></div><p class="mtxt evotxt">Quoi ? <b>${esc(name0)}</b> évolue !</p><div class="evostage2"><div class="evorays"></div><img class="ea" src="${A}" alt=""><img class="eb" src="${B}" alt=""><i class="evoflash"></i></div><div class="mbtns"><button class="btn" id="evostop">Annuler</button><button class="btn pri" data-ret="1" id="evook" hidden>Continuer</button></div></div>`, { noClose: true, cls: 'evom2', onOpen: (w, close) => {
    const st = w.querySelector('.evostage2'), ea = w.querySelector('.ea'), eb = w.querySelector('.eb'), txt = w.querySelector('.evotxt');
    w.querySelector('#evostop').addEventListener('click', () => { if (finished) return; cancelled = true; close('0') });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    (async () => {
      if (W.Sound) W.Sound.sfx('up');
      await sleep(1100); if (cancelled) return;
      st.classList.add('glow'); ea.classList.add('sil'); eb.classList.add('sil'); await sleep(900); if (cancelled) return;
      // flicker, faster and faster
      let gap = 520, showB = false; const t0 = performance.now();
      while (performance.now() - t0 < 4200) { if (cancelled) return; showB = !showB; st.classList.toggle('showb', showB); if (W.Sound && gap > 120) W.Sound.sfx('select'); await sleep(gap); gap = Math.max(55, gap * 0.8) }
      if (cancelled) return;
      finished = true; w.querySelector('#evostop').hidden = true;
      st.classList.add('showb', 'flash'); await sleep(260); ea.classList.remove('sil'); eb.classList.remove('sil'); st.classList.remove('glow'); st.classList.add('done');
      if (W.Sound) W.Sound.sfx('lvl'); if (W.playSparkle) W.playSparkle(st, 1.3);
      txt.innerHTML = `Félicitations ! <b>${esc(name0)}</b> a évolué en <b>${esc(s1.n)}</b> !`;
      w.querySelector('#evook').hidden = false; w.querySelector('#evook').focus();
    })();
  } });
  if (ok !== '1') { UI.toast(`${esc(monName(m))} n’a pas évolué.`); return false }
  const learn = P.evolve(m, to); { const S0 = Gm.get(); S0.stats.evos = (S0.stats.evos || 0) + 1 } if (m.hw) Gm.hwDexSet(to, 3 | (m.sh ? 4 : 0)); Gm.dexSet(to, 3 | (m.sh ? 12 : 0));
  for (const k of learn) await learnOutside(m, k);
  Gm.save(); return true;
}
// ---------- form changes (legendary form items, Keldeo + Lame Sainte)
async function formFlow(m, to, why) {
  const fromIx = P.monIx(m); const toIx = to ? G.FORMS[to].ix : sp(m.s).ix; const toName = to ? G.FORMS[to].n : sp(m.s).n;
  await UI.modal(`<div class="evo"><p class="mtxt">${why || `${esc(monName(m))} change de forme !`}</p><div class="evostage"><div class="evo-a">${spr(fromIx, m.sh, 'big')}</div><div class="evo-b">${spr(toIx, m.sh, 'big')}</div></div><p class="mtxt" id="fmtxt">&nbsp;</p><div class="mbtns"><button class="btn pri" data-ret="1" id="evogo" disabled>…</button></div></div>`,
    { cls: 'evom', noClose: true, onOpen: w => { if (W.Sound) setTimeout(() => W.Sound.sfx('mega'), 300); setTimeout(() => { w.querySelector('.evostage').classList.add('go'); setTimeout(() => { w.querySelector('#fmtxt').textContent = `${sp(m.s).n} est maintenant ${toName} !`; const b = w.querySelector('#evogo'); b.disabled = false; b.textContent = 'Génial !' }, 1500) }, 200) } });
  const mh = P.maxHP(m); if (to) m.fm = to; else delete m.fm; if (m.hp > 0) m.hp = Math.max(1, Math.min(P.maxHP(m), m.hp + P.maxHP(m) - mh));
  Gm.dexSet(to || m.s, 3 | (m.sh ? 12 : 0)); Gm.save();
}
async function checkMoveForms(m) {
  for (const r of P.MOVE_FORMS) {
    if (m.s !== r.base || !G.FORMS[r.form]) continue; const knows = m.m.some(x => x[0] === r.move);
    if (knows && m.fm !== r.form) await formFlow(m, r.form, `${esc(monName(m))} réagit à ${esc(mv(r.move).n)} !`);
    else if (!knows && m.fm === r.form) await formFlow(m, null, `${esc(monName(m))} a oublié ${esc(mv(r.move).n)}…`);
  }
}
UI.checkMoveForms = m => checkMoveForms(m);
async function useFormItem(n, m) {
  const opts = P.formsFor(n, m.s); if (!opts.length) { UI.toast(`${esc(n)} n’a aucun effet sur ${esc(monName(m))}.`, 'bad'); return false }
  const choices = [null, ...opts].filter(f => (f || null) !== (m.fm || null));
  let to = choices[0];
  if (choices.length > 1) { const r = await UI.modal(`<h3>Quelle forme ?</h3><div class="ilist">${choices.map(f => `<button class="irow" data-ret="f${f || 0}">${spr(f ? G.FORMS[f].ix : sp(m.s).ix, m.sh, 'tri')}<span><b>${esc(f ? G.FORMS[f].n : sp(m.s).n + ' (forme de base)')}</b><small>${(f ? G.FORMS[f].t : sp(m.s).t).map(t => TL[t]).join(' / ')}</small></span></button>`).join('')}</div>`, { cls: 'small' }); if (!r) return false; to = +r.slice(1) || null }
  await formFlow(m, to, `${esc(n)} réagit avec ${esc(monName(m))} !`);
  if (m.s === 479) await rotomMove(m, to);
  return true;
}
// Motisma: each appliance form comes with its own move (like in the games); the base form gets Éclair back
const ROTOM_SIG = { 10008: 'overheat', 10009: 'hydro-pump', 10010: 'blizzard', 10011: 'air-slash', 10012: 'leaf-storm' };
async function rotomMove(m, to) {
  const want = to ? ROTOM_SIG[to] : 'thunder-shock'; const sigs = Object.values(ROTOM_SIG); if (!mv(want) || m.m.some(x => x[0] === want)) return;
  const i = m.m.findIndex(x => sigs.includes(x[0]));
  if (i >= 0) { const old = m.m[i]; const nx = [want, Math.min(old[1], mv(want).pp)]; m.m[i] = nx; UI.toast(`${esc(monName(m))} oublie ${esc(mv(old[0]).n)} et apprend ${esc(mv(want).n)} !`); return }
  if (!to) return; await learnOutside(m, want);
}
async function learnOutside(m, k) {
  const M = mv(k); if (!M || m.m.some(x => x[0] === k)) return;
  // a move forgotten then learned again keeps the PP it had (no free PP refill); the memory is cleared by healing
  const mem = m.ppMem && m.ppMem[k]; const slot = () => { if (!mem) return [k, M.pp]; delete m.ppMem[k]; const x = [k, 0, mem[1] || 0]; x[1] = Math.min(mem[0], P.ppMax(x)); if (!x[2]) x.length = 2; return x };
  const remember = x => { if (!x) return; m.ppMem = m.ppMem || {}; m.ppMem[x[0]] = [x[1], x[2] || 0] };
  if (m.m.length < 4) { m.m.push(slot()); UI.toast(`${esc(monName(m))} apprend ${esc(M.n)} !`); await checkMoveForms(m); return }
  const r = await UI.learnPrompt(m, k); if (r >= 0) { remember(m.m[r]); m.m[r] = slot(); UI.toast(`${esc(monName(m))} apprend ${esc(M.n)} !`); await checkMoveForms(m) }
}
UI.evolveFlow = evolveFlow;

// trainer battles
async function fightTrainer(i) {
  const S = Gm.get(); const z = Gm.zone(view.zid); const st = Gm.zst(z.id);
  if (!Gm.teamAlive()) { UI.toast('Votre équipe est K.O.', 'bad'); return }
  if (i === 'rival') {
    const ri0 = Gm.rivalIndexForZone(z.id); const team = Gm.rivalTeam(ri0);
    await startBattle({ kind: 'trainer', foe: team, name: S.rival, cls: 'Rival', ai: ri0 >= 3 ? 3 : 2, bio: z.bio, dbl: false, prize: st.rival ? 0 : Math.round(Game.trainerPrize('Rival', team)), megaRing: ri0 >= 4,
      onWin: async ui => { if (!st.rival) { st.rival = 1; await ui.msg(`${S.rival} : « Pas mal… Je vais m’entraîner encore plus dur ! »`) } } });
    return;
  }
  const t = z.tr[i]; const team = Gm.zoneTrainerTeam(z.id, i); const beaten = st.tr.includes(i);
  await startBattle({ kind: 'trainer', foe: team, name: t.n, cls: t.c, ai: t.boss ? 2 : 1, bio: z.bio, dbl: !!t.dbl, prize: beaten ? 0 : Math.round(Game.trainerPrize(t.c, team)),
    onWin: async () => { if (!beaten) st.tr.push(i) } });
}
const Game = Gm;
async function fightGym(gi, rematch) {
  const S = Gm.get(); const g = G.GYMS[gi];
  if (!Gm.teamAlive()) { UI.toast('Votre équipe est K.O.', 'bad'); return }
  const team = Gm.gymTeam(gi, rematch); const z = Gm.zone(g.zone);
  const first = !S.gyms[gi] && !rematch;
  await startBattle({ music: 'gym', kind: 'trainer', foe: team, name: g.n, cls: rematch ? 'Champion (revanche)' : 'Champion', ai: 3, bio: z.bio, megaRing: gi >= 6 || rematch, prize: first ? 80 * Math.max(...team.map(m => m.lv)) : 0, dbl: rematch && gi % 2 === 1,
    onWin: async ui => {
      if (rematch) { S.rematch[gi] = (S.rematch[gi] || 0) + 1; await ui.msg(`${g.n} : « Impressionnant. Revenez quand vous voulez ! »`); return }
      if (!first) return;
      S.gyms[gi] = 1; await ui.msg(`${g.n} : « Tu as mérité ceci. »`); if (W.GYMB && W.GYMB[g.type]) badgeFx(W.GYMB[g.type], gi); if (W.GYMB && W.GYMB[g.type]) UI.modal(`<div class="badgewin"><img src="${W.GYMB[g.type]}" alt=""><h3>${esc(g.badge)}</h3><p class="mtxt">Arène ${TL[g.type]} · Champion ${esc(g.n)}</p><div class="mbtns"><button class="btn pri" data-ret="1">Génial !</button></div></div>`, { cls: 'small' }); await ui.msg(`Vous obtenez le ${g.badge} !`);
      if (gi === 0) { S.flags.share = 1; Gm.add('Multi Exp', 1); await ui.msg('Vous recevez le Multi Exp ! Toute l’équipe gagne de l’expérience (activable dans le Sac).') }
      if (gi === 2) { Gm.add('Super Ball', 10); await ui.msg('Vous recevez 10 Super Balls.') }
      if (gi === 4) { S.flags.ring = 1; Gm.add('Méga-Anneau', 1); await ui.msg('Vous recevez le Méga-Anneau ! Les Méga-Gemmes sont désormais en vente.') }
      if (gi === 6) { Gm.add('Hyper Ball', 10); await ui.msg('Vous recevez 10 Hyper Balls.') }
    } });
}

// ---------- TEAM / PC
function statLine(m) { return P.calcStats(m) }
const ivTot = m => m.iv.reduce((a, b) => a + b, 0);
const ivP = m => P.ivPct(m);
const ivTag = m => { const p = ivP(m); return `<span class="ivp ${p >= 100 ? 'i5' : p >= 90 ? 'i4' : p >= 75 ? 'i3' : p >= 55 ? 'i2' : 'i1'}">${p} %</span>` };
function abDesc(ab) { return (W.ABD && W.ABD[ab.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')]) || '' }
function moveChip(k, pp, up) { const x = mv(k); if (!x) return ''; return `<span class="mchip" style="--tc:${TC[x.t]}" title="${esc(TL[x.t])} · ${x.c === 0 ? 'Statut' : x.c === 1 ? 'Physique' : 'Spécial'}${x.d ? ' — ' + esc(x.d) : ''}"><b>${esc(x.n)}</b><em><i class="mcat c${x.c}"></i>${x.c === 0 ? 'Statut' : (x.p || '—')}${pp != null ? ` · ${pp}/${P.ppMax([k, pp, up])}` : ''}</em></span>` }
function renderTeam() {
  const S = Gm.get(); const SN = ['PV', 'Atq', 'Déf', 'ASp', 'DSp', 'Vit']; const SN2 = ['PV', 'Att.', 'Déf.', 'Att.Spé', 'Déf.Spé', 'Vit.'];
  const alive = S.team.filter(m => m.hp > 0).length; const avg = S.team.length ? Math.round(S.team.reduce((a, m) => a + m.lv, 0) / S.team.length) : 0;
  let h = `<section class="hero teamhero"><div><p class="eyebrow">${S.team.length}/6 Pokémon · ${Gm.pcAll().length} au PC</p><h1>Équipe</h1><p class="sub">Niveau moyen ${avg} · ${alive}/${S.team.length} en forme. Glissez une carte sur une autre pour échanger leur place.</p></div><div class="teamacts"><button class="btn pri" data-act="heal" ${S.lr ? 'disabled' : ''}>Centre Pokémon</button><button class="btn" data-go="pc">Boîte PC</button></div></section><div class="team3">`;
  S.team.forEach((m, i) => {
    const s = sp(m.s), mh = P.maxHP(m); const pct = m.hp / mh * 100; const a = P.expFor(s.gr, m.lv), b = P.expFor(s.gr, m.lv + 1); const st = P.calcStats(m); const n = P.NAT[m.nat]; const ab = P.abilityOf(m); const ty = P.monTypes(m);
    const xp = m.lv >= 100 ? 100 : (m.xp - a) / Math.max(1, b - a) * 100; const mx = Math.max(...st, 1);
    const moves = [0, 1, 2, 3].map(k => m.m[k] ? moveChip(m.m[k][0], m.m[k][1], m.m[k][2]) : '<span class="mchip empty">—</span>').join('');
    h += `<article class="tm3 ${m.hp <= 0 ? 'ko' : ''} ${S.partner === m.u ? 'isprt' : ''} ${S.partner === m.u && Gm.hearts(m) >= 5 ? 'prt5' : ''}" data-dnd="tm:${i}" style="--t1:${TC[ty[0]]};--t2:${TC[ty[1] || ty[0]]}">
      <button class="tm3-top" data-act="mon" data-u="${m.u}" title="Voir le résumé">
        <span class="tm3-art"><span class="tm3-slot">${i + 1}</span>${monAnim(m, 'tspr')}</span>
        <span class="tm3-id"><b class="tm3-name">${esc(monName(m))}${gdTag(m)}${m.sh ? ' <em class="shs">' + SHI + '</em>' : ''}${m.hw ? ' <em class="hwtag">☾</em>' : ''}${m.lock ? ' 🔒' : ''}</b><span class="tm3-lv">N.${m.lv}</span>${m.pf || S.partner === m.u ? heartsHTML(m, 'sm') : ''}
          <span class="tm3-types">${ty.map(t => typeChip(t, 1)).join('')}${m.st ? `<span class="chip">${PB.STATUS_N[m.st]}</span>` : ''}</span>
          <span class="tm3-hp"><span class="hpbar sm"><i class="${pct > 50 ? '' : pct > 20 ? 'mid' : 'low'}" style="width:${pct}%"></i></span><small>${m.hp}/${mh}</small></span>
          <span class="xpbar sm" title="Expérience"><i style="width:${xp}%"></i></span></span></button>
      <div class="tm3-info"><span><em>Talent</em><b title="${esc(abDesc(ab))}">${esc(ab)}${m.ab === 'h' ? ' ★' : ''}</b></span><span><em>Nature</em><b>${n[0]}${n[1] !== n[2] ? ` <small class="natfx">+${SN2[n[1]]} / −${SN2[n[2]]}</small>` : ''}</b></span><span><em>Objet</em><b class="itm">${m.it ? UI.itemIcon(m.it, 'ii sm') + esc(m.it) : '—'}</b></span><span><em>IV ${ivTag(m)}</em><b class="ivev">${m.iv.join('/')}</b></span></div>
      <div class="tm3-evs"><em>EV</em><b>${(m.ev || [0, 0, 0, 0, 0, 0]).map(v => v || '–').join('/')}</b><small>${(m.ev || []).reduce((x, y) => x + y, 0)}/510</small></div>
      <div class="tm3-sth"><em>Stats N.${m.lv}</em><b>Total ${st.reduce((x, y) => x + y, 0)}</b></div>
      <div class="tm3-tiles">${st.map((v, j) => { const up = n[1] !== n[2] && n[1] === j, dn = n[1] !== n[2] && n[2] === j; const r = v / mx; return `<span class="${up ? 'up' : dn ? 'dn' : ''}"><em>${SN2[j]}</em><b>${v}${up ? ' ▲' : dn ? ' ▼' : ''}</b><i><u class="${r > 0.8 ? 'hi' : r > 0.55 ? 'md' : 'lo'}" style="width:${Math.round(r * 100)}%"></u></i></span>` }).join('')}</div>
      <div class="tm3-moves">${moves}</div>
      ${Gm.ribbons(m).length ? `<div class="ribrow2">${Gm.ribbons(m).map(k => ribImg(k, 'ribi')).join('')}</div>` : ''}
      <div class="tm3-act"><button class="mini" data-act="tmup" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button><button class="mini" data-act="tmdown" data-i="${i}" ${i === S.team.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button><button class="mini prtb ${S.partner === m.u ? 'on' : ''}" data-act="setpartner" data-u="${m.u}" title="${S.partner === m.u ? 'Partenaire actif (cliquer pour retirer)' : 'Choisir comme partenaire'}">${S.partner === m.u ? '💗 Partenaire' : '🤍'}</button><button class="btn sm" data-act="mon" data-u="${m.u}">Détails</button></div>
    </article>`;
  });
  h += `</div>${teamSlotsHTML()}`;
  return h;
}

// ---------- PC BOXES
const pcv = { held: null, q: '', f: { iv: 0, nat: '', ha: 0, sh: 0, rib: '', hw: 0 }, multi: false, sel: new Set() };
const pcfActive = () => { const f = pcv.f; return f.iv > 0 || f.nat !== '' || f.ha || f.sh || f.rib || f.hw };
const pcMatch = m => { const f = pcv.f, q = pcv.q.trim().toLowerCase(); if (q && !(monName(m).toLowerCase().includes(q) || sp(m.s).n.toLowerCase().includes(q))) return false; if (f.iv && P.ivPct(m) < f.iv) return false; if (f.nat !== '' && m.nat !== +f.nat) return false; if (f.ha && m.ab !== 'h') return false; if (f.sh && !m.sh) return false; if (f.hw && !m.hw) return false; if (f.rib && !Gm.ribbons(m).includes(f.rib)) return false; return true };
function renderPC() {
  const S = Gm.get(); const cur = S.pc.cur || 0; const bx = Gm.pcBox(cur); const total = Gm.pcAll().length; const filled = bx.filter(Boolean).length;
  let h = `<section class="hero"><p class="eyebrow">${total} Pokémon stockés · 200 boîtes</p><h1>Boîte PC</h1></section>`;
  if (pcv.held) { const [m] = Gm.findMon(pcv.held); if (m) h += `<div class="heldbar">${monIcon(m, 'tri')}<span>Vous déplacez <b>${esc(monName(m))}</b>. Touchez une case de boîte ou un membre de l’équipe.</span><button class="mini" data-act="pcdrop">Annuler</button></div>`; else pcv.held = null }
  h += `<div class="pcwrap"><div class="pcmain"><div class="pcbar"><div class="boxnav"><button class="btn sm" data-act="pcbox" data-d="-1" aria-label="Boîte précédente">◀</button><select id="pcsel" aria-label="Boîte">${Array.from({ length: Gm.NB }, (_, i) => `<option value="${i}" ${i === cur ? 'selected' : ''}>${esc(Gm.pcName(i))}${S.pc.b[i] ? ` (${S.pc.b[i].filter(Boolean).length})` : ''}</option>`).join('')}</select><button class="btn sm" data-act="pcbox" data-d="1" aria-label="Boîte suivante">▶</button><span class="pccount" title="Pokémon dans cette boîte">${filled}/30</span></div>
  <div class="pctools"><div class="pcgroup"><span class="pclbl">Boîte</span><button class="mini" data-act="pcrename">✎ Renommer</button><button class="mini" data-act="pcsort">Trier par n°</button><button class="mini" data-act="pcsortiv">Trier par IV</button></div><div class="pcgroup"><span class="pclbl">Tout le PC</span><button class="mini" data-act="pcsortall" title="Range tout le PC par numéro, boîte après boîte">Tout trier (n°)</button><button class="mini" data-act="pcdexsort" data-f="0" title="1 025 cases : une par espèce, sans les formes">📘 Pokédex (sans formes)</button><button class="mini" data-act="pcdexsort" data-f="1" title="Une case pour chaque forme aussi : régionales, légendaires, Halloween…">📗 Pokédex (avec formes)</button><button class="mini ${pcv.multi ? 'on' : ''}" data-act="pcmulti">${pcv.multi ? '✓ Terminer la sélection' : '☐ Sélection multiple'}</button></div></div>
  ${pcv.multi ? `<div class="multibar on">${pcv.moving ? `<span class="movehint">📦 Touchez la case où poser les ${pcv.sel.size} Pokémon (changez de boîte avec ◀ ▶ si besoin)</span><button class="btn sm" data-act="pcmove">Annuler</button>` : `<span>${pcv.sel.size} sélectionné${pcv.sel.size > 1 ? 's' : ''} · glissez-les où vous voulez</span><button class="btn sm" data-act="pcselbox">Toute la boîte</button><button class="btn sm" data-act="pcselnone">Rien</button><button class="btn sm pri" data-act="pcmove" ${pcv.sel.size ? '' : 'disabled'}>Déplacer (${pcv.sel.size})</button><button class="btn sm danger" data-act="pcrelsel" ${pcv.sel.size ? '' : 'disabled'}>Relâcher (${pcv.sel.size})</button>`}</div>` : ''}</div><div class="boxgrid">`;
  bx.forEach((m, j) => {
    if (!m) { h += `<button class="bxs empty ${pcv.held ? 'drop' : ''}" data-act="pcslot" data-b="${cur}" data-j="${j}" data-dnd="box:${cur}:${j}" aria-label="Case vide"></button>`; return }
    const s = sp(m.s);
    h += `<button class="bxs ${RAR[s.rar][1]} ${pcv.held === m.u ? 'held' : ''} ${pcv.multi && pcv.sel.has(m.u) ? 'sel' : ''}" data-act="pcslot" data-b="${cur}" data-j="${j}" data-dnd="box:${cur}:${j}" title="${esc(monName(m))} N.${m.lv}">${monIcon(m)}<small>N.${m.lv}</small><em class="ivs">${ivP(m)}%</em>${m.sh ? '<i class="shm">' + SHI + '</i>' : ''}${m.it ? '<i class="itm-dot"></i>' : ''}${m.lock ? '<i class="lockdot">🔒</i>' : ''}</button>`;
  });
  const f = pcv.f;
  const search = `<div class="pcsearch"><h3>Rechercher</h3><input id="pcsearch" type="search" placeholder="Nom d’un Pokémon" value="${esc(pcv.q)}">
    <label>IV min <select data-pcf="iv">${[0, 50, 60, 70, 80, 90, 100].map(v => `<option value="${v}" ${+f.iv === v ? 'selected' : ''}>${v ? v + ' %' : 'tous'}</option>`).join('')}</select></label>
    <label>Nature <select data-pcf="nat"><option value="">toutes</option>${P.NAT.map((n, i) => `<option value="${i}" ${f.nat !== '' && +f.nat === i ? 'selected' : ''}>${n[0]}</option>`).join('')}</select></label>
    <label>Ruban <select data-pcf="rib"><option value="">tous</option>${Object.entries(Gm.RIB).map(([k, r]) => `<option value="${k}" ${f.rib === k ? 'selected' : ''}>${r[0]}</option>`).join('')}</select></label>
    <div class="cks"><label class="ck"><input type="checkbox" data-pcf="ha" ${f.ha ? 'checked' : ''}> Talent caché</label><label class="ck"><input type="checkbox" data-pcf="sh" ${f.sh ? 'checked' : ''}> Chromatique</label><label class="ck"><input type="checkbox" data-pcf="hw" ${f.hw ? 'checked' : ''}> Halloween</label></div></div>`;
  h += `</div></div><aside class="pcside"><div class="pcteam"><h3>Équipe <small>${S.team.length}/6</small></h3>${S.team.map((m, i) => `<div class="pctw"><button class="pct ${pcv.held === m.u ? 'held' : ''}" data-act="pcteam" data-i="${i}" data-dnd="pt:${i}">${monIcon(m, 'tri')}<span><b>${esc(monName(m))}</b><small>N.${m.lv}</small></span></button><button class="pcinfo" data-act="mon" data-u="${m.u}" title="Voir le résumé" aria-label="Résumé de ${esc(monName(m))}">i</button></div>`).join('')}${S.team.length < 6 ? `<button class="pct empty ${pcv.held ? 'drop' : ''}" data-act="pcteam" data-i="${S.team.length}" data-dnd="pt:${S.team.length}"><span>Place libre</span></button>` : ''}</div>${search}</aside></div>`;
  const q = pcv.q.trim().toLowerCase();
  h += `<section class="blk pcres">`;
  if (q || pcfActive()) { h += '<h2>Résultats de la recherche</h2>';
    const res = []; S.pc.b.forEach((b, i) => b && b.forEach((m, j) => { if (m && pcMatch(m)) res.push([m, i, j]) }));
    h += `<p class="mut">${res.length} résultat${res.length > 1 ? 's' : ''}${res.length > 120 ? ' (120 affichés)' : ''}${res.length && pcv.multi ? ` · <button class="mini" data-act="pcselres">Sélectionner les résultats</button>` : ''}</p><div class="pcgrid">${res.slice(0, 120).map(([m, i, j]) => `<button class="pcc ${RAR[sp(m.s).rar][1]}" data-act="pcgoto" data-b="${i}">${monIcon(m)}<b>${esc(monName(m))}${m.sh ? ' ' + SHI + '' : ''}</b><small>${esc(Gm.pcName(i))} · N.${m.lv} · ${ivP(m)}%</small></button>`).join('') || '<p class="mut">Aucun résultat.</p>'}</div>`;
  }
  h += '</section>';
  return h;
}
// move several Pokémon at once: they keep their order and fill the free slots from the chosen one
function pcMoveGroup(us, b0, j0) {
  const S = Gm.get(); const all = []; for (const u of us) { const f = Gm.pcFind(u); if (f) all.push([f[0], f[1], S.pc.b[f[0]][f[1]]]) }
  if (!all.length) { pcv.moving = false; render(); return }
  all.sort((x, y) => x[0] - y[0] || x[1] - y[1]); for (const [b, j] of all) S.pc.b[b][j] = null;
  let k = b0 * Gm.NS + j0; const end = Gm.NB * Gm.NS; let placed = 0;
  for (const [, , m] of all) { while (k < end && Gm.pcBox(Math.floor(k / Gm.NS))[k % Gm.NS]) k++; if (k >= end) { Gm.pcAdd(m, 0); continue } Gm.pcBox(Math.floor(k / Gm.NS))[k % Gm.NS] = m; k++; placed++ }
  pcv.moving = false; pcv.sel.clear(); Gm.save(); UI.toast(`${all.length} Pokémon déplacé${all.length > 1 ? 's' : ''}.`); render();
}
// "Pokédex order": every Pokémon goes to the slot of its Pokédex number, counted from the first chosen box (30 slots per box)
// the full order "with forms": the Pokédex order (forms included) with each Halloween palette right after its species
function dexOrderForms() { const out = []; const L = P.ALL_IDS; for (let i = 0; i < L.length; i++) { out.push(L[i]); const dn = sp(L[i]).dn; if (Gm.HW_IDS.includes(dn) && (i + 1 >= L.length || sp(L[i + 1]).dn !== dn)) out.push('hw' + dn) } return out }
async function pcDexSort(withForms) {
  const S = Gm.get(); const nb = Gm.NB; const ORD = withForms ? dexOrderForms() : null; const total = withForms ? ORD.length : 1025; const opt = i => `<option value="${i}">${esc(Gm.pcName(i))}${S.pc.b[i] ? ` (${S.pc.b[i].filter(Boolean).length})` : ''}</option>`;
  const need = () => Math.ceil(total / Gm.NS);
  const r = await UI.modal(`<h3>${withForms ? '📗 Ordre du Pokédex avec les formes' : '📘 Ordre du Pokédex sans les formes'}</h3><p class="mtxt">${withForms ? `Une case pour chaque espèce <b>et chaque forme</b> (Alola, Galar, Hisui, Paldea, formes légendaires, palettes Halloween…), dans l’ordre du Pokédex : ${fmt(total)} cases.` : `Une case par espèce, de n°1 à n°1025 : les formes (régionales, Halloween…) ne comptent pas et vont avec les doublons.`} Les cases se comptent 30 par boîte à partir de la première boîte choisie.</p>
    <div class="dexsortf"><label>De la boîte <select id="dsa">${Array.from({ length: nb }, (_, i) => opt(i)).join('')}</select></label><label>à la boîte <select id="dsb">${Array.from({ length: nb }, (_, i) => opt(i)).join('')}</select></label>
    <label class="ck"><input type="checkbox" id="dsall"> Prendre aussi les Pokémon des autres boîtes</label></div>
    <p class="mut" id="dsinfo"></p><div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-go2="1">Ranger</button></div>`, { onOpen: w => {
      const a = w.querySelector('#dsa'), b = w.querySelector('#dsb'); a.value = S.pc.cur; b.value = Math.min(nb - 1, S.pc.cur + need() - 1);
      const upd = () => { const n = need(), have = +b.value - +a.value + 1; w.querySelector('#dsinfo').innerHTML = have < 1 ? '⚠ La boîte de fin doit être après celle de début.' : `Il faut ${n} boîtes pour tout le Pokédex${withForms ? ' avec les formes' : ''}. Vous en avez choisi ${have}.${have < n ? ' Les numéros qui dépassent iront dans les cases libres après la dernière boîte.' : ''} Les doublons vont aussi après la dernière boîte.` };
      [a, b].forEach(e => e.addEventListener('change', () => { if (e === a && +b.value < +a.value) b.value = Math.min(nb - 1, +a.value + need() - 1); upd() })); upd();
    }, onClick: (e, close, w) => { if (e.target.dataset.go2) close({ a: +w.querySelector('#dsa').value, b: +w.querySelector('#dsb').value, f: withForms, all: w.querySelector('#dsall').checked }) } });
  if (!r || typeof r !== 'object' || r.b < r.a) return;
  const ord = new Map(); if (r.f) ORD.forEach((k, i) => ord.set(k, i));
  const pos = m => { if (!r.f) return sp(m.s).dn - 1; const k = m.hw && Gm.HW_IDS.includes(m.s) && !m.fm ? 'hw' + m.s : m.s; return ord.has(k) ? ord.get(k) : (ord.has(m.s) ? ord.get(m.s) : -1) };
  const cap = (r.b - r.a + 1) * Gm.NS; const inR = b => b >= r.a && b <= r.b;
  const mons = []; for (let b = 0; b < nb; b++) { if (!inR(b) && !r.all) continue; const bx = S.pc.b[b]; if (bx) for (let j = 0; j < bx.length; j++) if (bx[j]) { mons.push(bx[j]); bx[j] = null } }
  // the best one of each species gets its Pokédex slot: base species first (without forms), chromatique, then IV, then level
  const isBase = m => (m.s === sp(m.s).dn && !m.fm && !m.hw) ? 1 : 0; // without forms, the base species keeps the slot (Pikachu before Pikachu Casquette)
  mons.sort((x, y) => (r.f ? 0 : isBase(y) - isBase(x)) || (y.sh ? 1 : 0) - (x.sh ? 1 : 0) || P.ivPct(y) - P.ivPct(x) || y.lv - x.lv);
  const extra = [];
  for (const m of mons) { const k = pos(m); if (k < 0 || k >= cap) { extra.push(m); continue } const bx = Gm.pcBox(r.a + Math.floor(k / Gm.NS)); if (bx[k % Gm.NS]) extra.push(m); else bx[k % Gm.NS] = m }
  // the others: free slots after the range, then before it
  extra.sort((x, y) => sp(x.s).dn - sp(y.s).dn || x.s - y.s);
  for (const m of extra) { let ok = false; for (const b of [...Array.from({ length: nb - r.b - 1 }, (_, i) => r.b + 1 + i), ...Array.from({ length: r.a }, (_, i) => i)]) { const bx = Gm.pcBox(b); const j = bx.indexOf(null); if (j >= 0) { bx[j] = m; ok = true; break } } if (!ok) Gm.pcAdd(m, r.a) }
  S.pc.cur = r.a; Gm.save(); render();
  UI.toast(`${mons.length - extra.length} Pokémon rangés à leur place du Pokédex${extra.length ? `, ${extra.length} doublon${extra.length > 1 ? 's' : ''} ou hors plage rangés après « ${esc(Gm.pcName(r.b))} »` : ''}.`);
}
async function pcSlot(b, j) {
  const S = Gm.get(); const bx = Gm.pcBox(b); const m = bx[j];
  if (pcv.held) {
    const [h0, where] = Gm.findMon(pcv.held); pcv.held = null; if (!h0) { render(); return }
    if (h0 === m) { render(); return }
    if (where === 'team') {
      const ti = S.team.indexOf(h0);
      if (m) S.team[ti] = m; else { if (S.team.length <= 1) { UI.toast('Il faut garder au moins un Pokémon dans l’équipe.', 'bad'); render(); return } S.team.splice(ti, 1) }
      bx[j] = h0;
    } else { const f = Gm.pcFind(h0.u); S.pc.b[f[0]][f[1]] = m || null; bx[j] = h0 }
    Gm.save(); render(); return;
  }
  if (!m) return;
  const r = await UI.modal(`<div class="mhead">${monIcon(m, 'big')}<div><h3>${esc(monName(m))} <small>N.${m.lv}</small>${ribbonsHTML(m, 1)}</h3><p class="sub">${esc(P.abilityOf(m))} · ${P.NAT[m.nat][0]} · IV ${ivTag(m)}${m.it ? ' · ' + esc(m.it) : ''}</p></div></div><div class="mbtns wrap"><button class="btn" data-ret="see">Voir le résumé</button><button class="btn" data-ret="move">Déplacer</button><button class="btn" data-ret="team">${S.team.length < 6 ? 'Mettre dans l’équipe' : 'Échanger avec l’équipe'}</button><button class="btn" data-ret="fuse">Fusionner</button><button class="btn danger" data-ret="rel">Relâcher</button></div>`, { cls: 'small' });
  if (r === 'see') return monDetail(m.u);
  if (r === 'move') { pcv.held = m.u; render(); return }
  if (r === 'fuse') { fv.sp = m.s; fv.a = m.u; fv.b = null; UI.go('fusion'); return }
  if (r === 'team') { if (S.team.length < 6) { bx[j] = null; S.team.push(m) } else { const o = await UI.pickMon('Échanger avec…'); if (o) { const ti = S.team.indexOf(o); S.team[ti] = m; bx[j] = o } } }
  if (r === 'rel') { const w = [m.sh ? '⚠ C’est un Pokémon chromatique !' : '', Gm.ribbons(m).length ? `⚠ Il a ${Gm.ribbons(m).length} ruban${Gm.ribbons(m).length > 1 ? 's' : ''}.` : ''].filter(Boolean).join('<br>'); if (await UI.confirm(`Relâcher ${esc(monName(m))} ? Cette action est définitive.${w ? '<br><br><b>' + w + '</b>' : ''}`, 'Relâcher')) { bx[j] = null; if (m.it) Gm.add(m.it, 1) } }
  Gm.save(); render();
}
async function pcTeam(i) {
  const S = Gm.get(); const t = S.team[i];
  if (pcv.held) {
    const [h0, where] = Gm.findMon(pcv.held); pcv.held = null; if (!h0) { render(); return }
    if (where === 'team') { const hi = S.team.indexOf(h0); if (t) { S.team[hi] = t; S.team[i] = h0 } }
    else { const f = Gm.pcFind(h0.u); if (t) { S.pc.b[f[0]][f[1]] = t; S.team[i] = h0 } else { S.pc.b[f[0]][f[1]] = null; S.team.push(h0) } }
    Gm.save(); render(); return;
  }
  if (!t) return;
  pcv.held = t.u; render();
}

// ---------- drag & drop (team page, PC boxes, PC team list). Mouse: drag directly. Touch: hold ~0.3 s, then drag.
const dnd = { st: null, on: false, ghost: null, over: null, swallow: false }; W.__dnd = dnd;
const dndSrc = el => { const [k, a, b] = el.dataset.dnd.split(':'); return { k, a: +a, b: +b, el } };
const dndMon = s => { const S = Gm.get(); if (s.k === 'box') return Gm.pcBox(s.a)[s.b]; return S.team[s.a] };
function dndStart(x, y) {
  const s = dnd.st; const m = dndMon(s); if (!m) { dnd.st = null; return }
  dnd.on = true; s.el.classList.add('dnd-src'); document.body.classList.add('dnd-on');
  const g = document.createElement('div'); g.className = 'dnd-ghost'; g.innerHTML = monIcon(m, 'tri') + (dnd.group && dnd.group.length > 1 ? `<b class="dnd-n">${dnd.group.length}</b>` : ''); document.body.appendChild(g); dnd.ghost = g; dndMove(x, y);
  if (navigator.vibrate) try { navigator.vibrate(15) } catch (e) { }
}
function dndMove(x, y) {
  if (dnd.ghost) { dnd.ghost.style.left = x + 'px'; dnd.ghost.style.top = y + 'px' }
  const t = document.elementFromPoint(x, y); const d = t && t.closest('[data-dnd]');
  if (dnd.over && dnd.over !== d) dnd.over.classList.remove('dnd-over');
  dnd.over = d && d !== dnd.st.el && (dnd.st.k === 'tm') === d.dataset.dnd.startsWith('tm:') && !(dnd.group && !d.dataset.dnd.startsWith('box:')) ? d : null;
  if (dnd.over) dnd.over.classList.add('dnd-over');
  // holding a Pokémon over ◀ / ▶ flips the boxes
  const nav = dnd.st.k !== 'tm' || view.tab === 'pc' ? t && t.closest('[data-act="pcbox"]') : null; const dir = nav ? +nav.dataset.d : 0;
  if (dir !== dnd.navD) { clearInterval(dnd.navT); dnd.navT = null; dnd.navD = dir; document.querySelectorAll('.navhot').forEach(e => e.classList.remove('navhot'));
    if (dir) { nav.classList.add('navhot'); dnd.navT = setInterval(() => { const S = Gm.get(); S.pc.cur = (S.pc.cur + dnd.navD + Gm.NB) % Gm.NB; render(); const n2 = document.querySelector(`[data-act="pcbox"][data-d="${dnd.navD}"]`); if (n2) n2.classList.add('navhot') }, 650) } }
}
function dndEnd() {
  const s = dnd.st, d = dnd.over; if (dnd.ghost) dnd.ghost.remove(); dnd.ghost = null; if (s && s.el) s.el.classList.remove('dnd-src'); if (d) d.classList.remove('dnd-over'); document.body.classList.remove('dnd-on');
  const was = dnd.on; dnd.on = false; dnd.st = null; dnd.over = null; clearTimeout(dnd.timer); clearInterval(dnd.navT); dnd.navT = null; dnd.navD = 0; document.querySelectorAll('.navhot').forEach(e => e.classList.remove('navhot'));
  const grp = dnd.group; dnd.group = null;
  if (!was) return; dnd.swallow = true; setTimeout(() => { dnd.swallow = false }, 50);
  if (!d) { if (grp) render(); return } const t = dndSrc(d); const S = Gm.get();
  if (grp) { if (t.k === 'box') pcMoveGroup(grp, t.a, t.b); return }
  if (s.k === 'tm' && t.k === 'tm') { [S.team[s.a], S.team[t.a]] = [S.team[t.a], S.team[s.a]]; Gm.save(); render(); return } // the two Pokémon swap places
  const m = dndMon(s); if (!m) return; pcv.held = m.u; pcv.multi = false;
  if (t.k === 'box') pcSlot(t.a, t.b); else pcTeam(t.a);
}
document.addEventListener('pointerdown', e => {
  if (e.button > 0) return; const el = e.target.closest('[data-dnd]'); if (!el || e.target.closest('input,select,textarea')) return;
  const m0 = dndMon(dndSrc(el)); if (!m0) return;
  // multiple selection: dragging one of the selected Pokémon carries the whole selection
  dnd.group = null; if (pcv.multi) { if (!el.dataset.dnd.startsWith('box:') || !pcv.sel.has(m0.u)) return; dnd.group = [...pcv.sel] }
  dnd.st = Object.assign(dndSrc(el), { x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' });
  if (dnd.st.touch) { clearTimeout(dnd.timer); dnd.timer = setTimeout(() => { if (dnd.st && !dnd.on) dndStart(dnd.st.x, dnd.st.y) }, 320) }
});
document.addEventListener('pointermove', e => {
  if (!dnd.st) return;
  if (!dnd.on) { const far = Math.hypot(e.clientX - dnd.st.x, e.clientY - dnd.st.y) > 8; if (!far) return; if (dnd.st.touch) { clearTimeout(dnd.timer); dnd.st = null; return } dndStart(e.clientX, e.clientY); return }
  dndMove(e.clientX, e.clientY);
});
document.addEventListener('touchmove', e => { if (dnd.on) { e.preventDefault(); const t = e.touches[0]; if (t) dndMove(t.clientX, t.clientY) } }, { passive: false });
document.addEventListener('pointerup', () => { if (dnd.st || dnd.on) dndEnd() });
document.addEventListener('pointercancel', () => { if (dnd.on) return; clearTimeout(dnd.timer); dnd.st = null });
document.addEventListener('touchend', () => { if (dnd.on) dndEnd() });
document.addEventListener('click', e => { if (dnd.swallow) { e.stopPropagation(); e.preventDefault(); dnd.swallow = false } }, true);
document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('[data-dnd]')) e.preventDefault() });
document.addEventListener('contextmenu', e => { if (dnd.on || (dnd.st && dnd.st.touch)) e.preventDefault() });
// ---------- FUSION
const fv = { sp: null, a: null, b: null, opt: 'iv', tab: 'fuse' };
function fusionGroups() {
  const S = Gm.get(); const all = [...S.team, ...Gm.pcAll()]; const g = {};
  for (const m of all) (g[m.s] = g[m.s] || []).push(m);
  return g;
}
function ivBars(m, other) { return `<div class="ivrow">${P.STN.map((nm, i) => { const v = m.iv[i]; const up = other && other[i] > v; return `<span class="${v === 31 ? 'max' : ''} ${up ? 'up' : ''}"><em>${['PV', 'Atq', 'Déf', 'ASp', 'DSp', 'Vit'][i]}</em>${v}${up ? `→${other[i]}` : ''}</span>` }).join('')}</div>` }
function fuseCard(m, role, sel) {
  return `<button class="fcard ${sel ? 'on' : ''}" data-act="fpick" data-role="${role}" data-u="${m.u}">${monIcon(m, 'tri')}<span><b>${esc(monName(m))}${m.sh ? ' ' + SHI + '' : ''}${m.lock ? ' 🔒' : ''} <small>N.${m.lv}</small></b><small>${esc(P.abilityOf(m))}${m.ab === 'h' ? ' ★' : ''} · ${P.NAT[m.nat][0]} · IV ${ivTag(m)}</small>${ivBars(m)}</span></button>`;
}
// ---------- EV training (second tab of Fusion)
const EVT = [[0, 320], [1, 66], [2, 74], [3, 92], [4, 72], [5, 19]]; // stat index, training species
const EV_SHORT = ['PV', 'Atq', 'Déf', 'ASp', 'DSp', 'Vit'];
function evTrainLv() { const t = Gm.get().team.filter(m => m.hp > 0); if (!t.length) return 5; return P.clamp(Math.round(t.reduce((a, m) => a + m.lv, 0) / t.length * 0.8), 3, 95) }
function evBars(m) { return `<div class="evrow">${EV_SHORT.map((nm, i) => `<span class="${m.ev[i] >= 252 ? 'max' : ''}"><em>${nm}</em><u><i style="width:${m.ev[i] / 252 * 100}%"></i></u><b>${m.ev[i]}</b></span>`).join('')}</div>` }
function renderEV() {
  const S = Gm.get(); const lv = evTrainLv();
  let h = `<section class="blk"><h2>Combats d’entraînement <small>N.${lv} · +6 EV par victoire</small></h2><p class="mut">Choisissez la stat à travailler. Chaque victoire donne +6 EV dans cette stat au Pokémon qui a combattu, et à toute l’équipe si le Multi Exp est activé. Les adversaires ne connaissent que Charge. Limites : 252 EV par stat et 510 au total.</p><label class="chk evauto"><input type="checkbox" id="evauto" ${view.evAuto ? 'checked' : ''}> <b>Farm auto ∞</b> <span class="mut">enchaîne les combats en automatique (équipe soignée entre chaque) jusqu’à ce que le Pokémon en tête (ou toute l’équipe avec le Multi Exp) atteigne 252 EV dans la stat ou 510 au total. Si c’est déjà le cas, le farm tourne jusqu’à ce que vous l’arrêtiez. Bouton « ∞ Stop » en combat pour arrêter.</span></label><div class="evtrain">${EVT.map(([i, id]) => `<button class="evt" data-act="evfight" data-i="${i}">${spr(sp(id).ix, 0)}<b>${P.STN[i]}</b><small>${esc(sp(id).n)} · ${view.evAuto ? '∞ farm auto' : '+6 EV'}</small></button>`).join('')}</div></section>`;
  h += `<div class="row-btns"><button class="btn" data-act="heal">Centre Pokémon (soigner l’équipe)</button></div>`;
  h += `<section class="blk"><h2>EV de l’équipe <small>maximum 252 par stat, 510 au total</small></h2><div class="evteam">${S.team.map(m => { const tot = m.ev.reduce((a, b) => a + b, 0); return `<div class="evcard">${monIcon(m, 'tri')}<div class="evinfo"><b>${esc(monName(m))} <small>N.${m.lv}</small></b>${evBars(m)}<small class="mut">Total ${tot} / 510</small></div><button class="btn sm" data-act="evreset" data-u="${m.u}" ${tot ? '' : 'disabled'}>Réinitialiser…</button></div>` }).join('')}</div></section>`;
  return h;
}
async function evReset(u) {
  const [m] = Gm.findMon(u); if (!m) return;
  const r = await UI.modal(`<h3>Réinitialiser les EV de ${esc(monName(m))}</h3><p class="mtxt">Choisissez la stat à remettre à 0, ou toutes d’un coup. C’est gratuit.</p><div class="mbtns wrap">${P.STN.map((nm, i) => `<button class="btn" data-ret="${i}" ${m.ev[i] ? '' : 'disabled'}>${nm} (${m.ev[i]})</button>`).join('')}<button class="btn danger" data-ret="all">Toutes les stats</button></div>`, { cls: 'small' });
  if (r == null || r === '') return;
  const mh = P.maxHP(m);
  if (r === 'all') m.ev = [0, 0, 0, 0, 0, 0]; else m.ev[+r] = 0;
  if (m.hp > 0) m.hp = Math.max(1, Math.min(P.maxHP(m), m.hp - (mh - P.maxHP(m))));
  Gm.save(); UI.toast(r === 'all' ? `EV de ${esc(monName(m))} remis à 0.` : `EV ${P.STN[+r]} de ${esc(monName(m))} remis à 0.`); render();
}
async function evFight(i) {
  if (busy) return; if (!Gm.teamAlive()) { UI.toast('Soignez votre équipe avant de vous entraîner.', 'bad'); return }
  const id = EVT.find(x => x[0] === i)[1]; const lv = evTrainLv();
  const wild = evDummy(id, lv);
  await startBattle({ kind: 'wild', foe: [wild], bio: 'peaks', wildLv: lv, evTrain: i, evAmt: 6 });
}
// endless EV farm: auto fights in a loop until the lead Pokémon is capped in that stat (252) or overall (510)
const evCapped = (m, i) => !m || m.ev[i] >= 252 || m.ev.reduce((a, b) => a + b, 0) >= 510;
const evDummy = (id, lv) => { const w = P.makeMon(id, lv, { sh: false }); w.m = [['tackle', 35]]; w.it = ''; return w };
// who can still gain EVs in that stat: the lead, or the whole team with the Multi Exp
const evOpen = i => { const S = Gm.get(); const L = S.flags.share ? S.team : S.team.filter(m => m.hp > 0).slice(0, 1); return L.some(m => !evCapped(m, i)) };
async function evFarm(i) {
  const S = Gm.get(); if (busy || farm.on) return;
  Gm.healTeam(); const capStop = evOpen(i);
  if (!capStop) UI.toast(`Plus personne ne peut gagner d’EV en ${P.STN[i]} : le farm continue pour l’Exp. jusqu’à ce que vous l’arrêtiez.`);
  Object.assign(farm, { on: true, n: 0, win: 0, money: 0, items: 0 }); let why = '';
  try {
    while (farm.on) {
      if (view.tab !== 'fusion' || fv.tab !== 'ev') { why = ''; break }
      Gm.healTeam();
      if (capStop && !evOpen(i)) { why = `maximum d’EV atteint en ${P.STN[i]}${S.flags.share ? ' pour toute l’équipe' : ''}.`; break }
      const id = EVT.find(x => x[0] === i)[1]; const lv = evTrainLv();
      const out = await startBattle({ kind: 'wild', foe: [evDummy(id, lv)], bio: 'peaks', wildLv: lv, evTrain: i, evAmt: 6, farm: true });
      farm.n++; if (!out) break;
      if (out.res === 'win') farm.win++;
      if (out.res === 'lose') { why = 'votre équipe a perdu.'; break }
      Gm.save(true); if (view.tab === 'fusion') render(); await wait(250);
    }
  } finally { farm.on = false; Gm.save(); menuMusic() }
  for (const m of S.team.slice()) { const ev = P.evoOptions(m, { night: Gm.isNight() }); if (ev.length) await evolveFlow(m, ev[0].to) }
  Gm.save(); if (view.tab === 'fusion') render();
  if (farm.n) UI.toast(`Farm EV terminé : ${farm.win} victoire${farm.win > 1 ? 's' : ''}${why ? ' · ' + why : ''}`);
}
// ---------- PENSION
const mmss = ms => { const t = Math.ceil(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') };
function dcCard(m, slot, i) {
  if (!m) return `<div class="dcslot empty"><b>${slot === 'a' ? 'Métamorph' : 'Partenaire'}</b><p class="mut">${slot === 'a' ? 'Confiez un Métamorph.' : 'N’importe quel Pokémon, sauf les légendaires.'}</p><button class="btn pri" data-act="dcput" data-i="${i}" data-s="${slot}">Choisir…</button></div>`;
  return `<div class="dcslot">${monIcon(m, 'big')}<div><b>${esc(monName(m))}${m.sh ? ' ' + SHI + '' : ''} <small>N.${m.lv}</small></b><small class="mut">${esc(P.abilityOf(m))}${m.ab === 'h' ? ' ★' : ''} · ${P.NAT[m.nat][0]} · IV ${ivTag(m)}</small><small class="mut">Objet : ${m.it ? UI.itemIcon(m.it, 'ii sm') + esc(m.it) : 'aucun'}</small></div><div class="iact"><button class="btn sm" data-act="dcput" data-i="${i}" data-s="${slot}">Changer</button><button class="btn sm" data-act="dctake" data-i="${i}" data-s="${slot}">Reprendre</button></div></div>`;
}
function dcBlock(i) {
  const d = Gm.dc(i); const pr = Gm.dcPair(i);
  const partner = d.b; const eggId = partner && partner.s !== 132 ? Gm.eggSpecies(partner.s) : null;
  let h = `<section class="blk"><h2>Pension ${i + 1}</h2><div class="dcgrid">${dcCard(d.a, 'a', i)}<span class="plus">+</span>${dcCard(d.b, 'b', i)}</div></section><section class="blk dcstat">`;
  if (!pr) h += `<p class="empty">${!d.a ? 'Placez un Métamorph à gauche.' : d.a.s !== 132 ? 'La place de gauche est réservée à Métamorph.' : 'Placez un Pokémon partenaire à droite.'}</p>`;
  else {
    const left = Gm.dcLeft(i);
    h += `<div class="dcrow"><div class="dcegg">${spr(sp(eggId).ix, 0)}<span><b>Œuf de ${esc(sp(eggId).n)}</b><small class="mut">${d.eggs} œuf${d.eggs > 1 ? 's' : ''} en attente (max ${Gm.EGG_MAX})</small></span></div>
      <div class="dctimer">${d.eggs >= Gm.EGG_MAX ? '<b>Pension pleine</b><small>Récupérez des œufs</small>' : `<small>Prochain œuf dans</small><b id="dctime${i}">${mmss(left)}</b>`}</div></div>
      <div class="dcbar"><i id="dcbar${i}" style="width:${d.eggs >= Gm.EGG_MAX ? 100 : (1 - left / Gm.EGG_MS) * 100}%"></i></div>
      <div class="row-btns"><button class="btn xl pri" data-act="dcegg" data-i="${i}" ${d.eggs ? '' : 'disabled'}>Récupérer un œuf</button>${d.eggs > 1 ? `<button class="btn" data-act="dcall" data-i="${i}">Tout récupérer (${d.eggs})</button>` : ''}</div>`;
  }
  return h + '</section>';
}
const ribImg = (k, cls = 'ribi') => { const [n, d, ic, c] = Gm.RIB[k]; const src = W.RIBI && W.RIBI[k]; return src ? `<img class="${cls}" src="${src}" alt="${esc(n)}" title="${esc(n + ' — ' + d)}">` : `<i class="rib" style="--rc:${c}" title="${esc(n + ' — ' + d)}">${ic}</i>` };
function ribbonsHTML(m, big) { const r = Gm.ribbons(m); if (!r.length) return ''; return `<span class="ribs${big ? ' big' : ''}">${r.map(k => ribImg(k)).join('')}</span>` }
UI.ribbonsHTML = ribbonsHTML;
// ---------- saved teams (4 slots)
function teamsList() { const S = Gm.get(); S.teams = (S.teams || []).filter(Boolean); return S.teams }
function teamSlotsHTML() {
  const L = teamsList(); const i = Math.min(view.tsel || 0, Math.max(0, L.length - 1)); const t = L[i]; const ms = t ? t.us.map(u => Gm.findMon(u)[0]).filter(Boolean) : [];
  return `<section class="blk tslots"><h2>Équipes enregistrées</h2><div class="tsbar">${L.length ? `<select class="tssel" data-tsel>${L.map((x, j) => `<option value="${j}" ${j === i ? 'selected' : ''}>${esc(x.n)} (${x.us.length})</option>`).join('')}</select><span class="tsmons">${ms.map(m => monIcon(m, 'tri')).join('')}</span><button class="btn sm pri" data-act="tload" data-i="${i}">Charger</button><button class="btn sm" data-act="tsave" data-i="${i}">Remplacer</button><button class="btn sm" data-act="tname" data-i="${i}">Renommer</button><button class="btn sm danger" data-act="tdel" data-i="${i}">Supprimer</button>` : '<span class="mut">Aucune équipe enregistrée.</span>'}<button class="btn sm" data-act="tnew">+ Enregistrer l’équipe actuelle</button></div></section>`;
}
async function teamSave(i) {
  const L = teamsList(); const old = L[i]; if (!old) return;
  if (!(await UI.confirm(`Remplacer « ${esc(old.n)} » par l’équipe actuelle ?`, 'Remplacer'))) return;
  old.us = Gm.get().team.map(m => m.u); Gm.save(); UI.toast('Équipe enregistrée.'); render();
}
function teamLoad(i) {
  const S = Gm.get(); const t = teamsList()[i]; if (!t) return;
  const want = t.us.map(u => Gm.findMon(u)).filter(x => x[0] && (x[1] === 'team' || x[1] === 'box')).map(x => x[0]);
  if (!want.length) { UI.toast('Ces Pokémon ne sont plus dans le PC.', 'bad'); return }
  for (const m of S.team.slice()) if (!want.includes(m)) { S.team.splice(S.team.indexOf(m), 1); Gm.pcAdd(m) }
  for (const m of want) if (!S.team.includes(m)) { Gm.pcRemove(m); S.team.push(m) }
  S.team.sort((a, b) => want.indexOf(a) - want.indexOf(b));
  Gm.save(); UI.toast(`Équipe « ${esc(t.n)} » chargée${want.length < t.us.length ? ' (certains Pokémon ont disparu)' : ''}.`); render();
}
function renderPension() {
  Gm.dcTick(); const S = Gm.get();
  let h = dcBlock(0);
  if (S.flags.dc2) h += dcBlock(1);
  else h += `<section class="blk dclock"><h2>Pension 2</h2><p>Faites éclore deux espèces en même temps. Débloquez une deuxième Pension pour ${fmt(Gm.DC2_PRICE)} ₽.</p><button class="btn pri" data-act="dcunlock" ${S.money < Gm.DC2_PRICE ? 'disabled' : ''}>Débloquer (${fmt(Gm.DC2_PRICE)} ₽)</button></section>`;
  h += `<section class="blk"><h2>Règles</h2><ul class="rules">
    <li>Un œuf toutes les <b>${S.flags.oval ? 7 : 10} minutes</b>${S.flags.oval ? ' (Charme Ovale)' : ''}, jusqu’à ${Gm.EGG_MAX} en attente par Pension. Le minuteur continue quand le jeu est fermé.</li>
    <li>L’œuf donne la <b>première forme</b> du partenaire, au niveau 1.</li>
    <li>Chromatique : <b>1/${Gm.EGG_SHINY}</b> fixe. Le Charme Chroma ne change pas ce taux. Un chromatique né à la Pension reçoit un ruban spécial.</li>
    <li>IV : <b>3</b> stats héritées au hasard des deux parents, <b>5</b> si un parent tient un <b>Nœud Destin</b>.</li>
    <li>Nature : celle du parent qui tient une <b>Pierre Stase</b>.</li>
    <li>Talent : celui du partenaire le plus souvent ; un talent caché passe 6 fois sur 10.</li>
    ${S.flags.oval ? '' : '<li>Le <b>Charme Ovale</b> (récompense du Pokédex à 300 espèces) fait passer la ponte à 7 minutes.</li>'}</ul></section>`;
  return h;
}
async function dcPick(i, slot) {
  const S = Gm.get(); const all = [...S.team, ...Gm.pcAll()].filter(m => slot === 'a' ? m.s === 132 : m.s !== 132 && sp(m.s).rar !== 'legendaire');
  if (!all.length) { UI.toast(slot === 'a' ? 'Vous n’avez pas de Métamorph. Capturez-en un !' : 'Aucun Pokémon disponible.', 'bad'); return }
  all.sort((x, y) => slot === 'a' ? P.ivPct(y) - P.ivPct(x) : sp(x.s).dn - sp(y.s).dn || P.ivPct(y) - P.ivPct(x));
  const row = m => `<button class="irow dcpick" data-ret="${m.u}" data-q="${esc((sp(m.s).n + ' ' + (m.nick || '')).toLowerCase())}">${monIcon(m, 'tri')}<span><b>${esc(monName(m))}${m.sh ? ' ' + SHI + '' : ''} <small>N.${m.lv}</small></b><small>${S.team.includes(m) ? 'Équipe' : 'PC'} · ${P.NAT[m.nat][0]} · IV ${ivTag(m)}${m.it ? ' · ' + esc(m.it) : ''}</small></span></button>`;
  const u = await UI.modal(`<h3>${slot === 'a' ? 'Choisir un Métamorph' : 'Choisir le partenaire'}</h3>${all.length > 8 ? '<input id="dcq" type="search" placeholder="Rechercher un Pokémon" class="dcq">' : ''}<div class="ilist dclist">${all.map(row).join('')}</div>`,
    { cls: 'wide', onOpen: w => { const q = w.querySelector('#dcq'); if (q) q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); w.querySelectorAll('.dcpick').forEach(b => b.hidden = v && !b.dataset.q.includes(v)) }) } });
  if (!u) return; const err = Gm.dcPut(i, slot, u); if (err) { UI.toast(err, 'bad'); return } Gm.save(); render();
}
async function dcHatch(i, all) {
  if (all) {
    const got = []; let m; while ((m = Gm.dcCollect(i))) { Gm.addCaught(m); got.push(m) }
    Gm.save(); render(); if (!got.length) return;
    const sh = got.filter(x => x.sh).length; const best = got.reduce((a, b) => P.ivPct(b) > P.ivPct(a) ? b : a);
    if (sh && W.Sound) W.Sound.sfx('shiny');
    const ar = await UI.modal(`<h3>${got.length} œufs éclos !</h3><div class="eggsum">${got.map(x => monIcon(x, 'tri')).join('')}</div><p class="mtxt">${sh ? `<b>${sh} chromatique${sh > 1 ? 's' : ''} ' + SHI + ' !</b><br>` : ''}Meilleurs IV : ${P.ivPct(best)} %. Les Pokémon sont dans votre équipe ou au PC.</p><div class="mbtns">${got.length > sh ? `<button class="btn danger" data-ret="relall">Relâcher les ${got.length - sh} non chromatiques</button>` : ''}<button class="btn pri" data-ret="1">Super !</button></div>`, { cls: 'small' });
    if (ar === 'relall') { const rel = got.filter(x => !x.sh && !x.lock); if (await UI.confirm(`Relâcher ${rel.length} Pokémon non chromatiques ?`, 'Relâcher')) { for (const x of rel) Gm.removeMon(x); Gm.add('Bonbon Exp. XS', rel.length); Gm.save(); UI.toast(`${rel.length} Pokémon relâchés · +${rel.length} Bonbon Exp. XS`); render() } }
    return;
  }
  const m = Gm.dcCollect(i); if (!m) return; const where = Gm.addCaught(m); const s = sp(m.s); Gm.save();
  if (m.sh && W.Sound) setTimeout(() => W.Sound.sfx('shiny'), 2600);
  const hr = await UI.modal(`<div class="evo"><p class="mtxt">Oh ? L’œuf bouge…</p><div class="evostage"><div class="evo-a"><span class="eggart${m.sh ? ' shiny' : ''}"></span></div><div class="evo-b">${monIcon(m, 'big')}</div></div><p class="mtxt" id="hatchtxt">&nbsp;</p><div class="mbtns"><button class="btn danger" data-ret="rel" id="hatchrel" disabled>Relâcher</button><button class="btn pri" data-ret="1" id="evogo" disabled>…</button></div></div>`, { cls: 'evom', noClose: true, onOpen: w => { setTimeout(() => { w.querySelector('.evostage').classList.add('go'); const hb = w.querySelector('#hatchrel'); setTimeout(() => { if (hb) hb.disabled = false }, 1600); if (m.sh && W.playSparkle) setTimeout(() => W.playSparkle(w.querySelector('.evo-b'), 1.2), 900); w.querySelector('#hatchtxt').innerHTML = `${esc(s.n)}${m.sh ? ' ' + SHI + ' chromatique' : ''} est né ! IV ${P.ivPct(m)} % · ${P.NAT[m.nat][0]} · ${esc(P.abilityOf(m))}${m.ab === 'h' ? ' ★' : ''}<br><small>${where === 'team' ? 'Il rejoint votre équipe.' : 'Il est envoyé au PC.'}</small>`; const b = w.querySelector('#evogo'); b.disabled = false; b.textContent = 'Super !' }, 1600) } });
  if (hr === 'rel' && (!m.sh || await UI.confirm(`${esc(s.n)} est <b>chromatique</b> ! Le relâcher quand même ?`, 'Relâcher'))) { Gm.removeMon(m); Gm.add('Bonbon Exp. XS', 1); Gm.save(); UI.toast(`${esc(s.n)} a été relâché · +1 Bonbon Exp. XS`) }
  render();
}
// live timer for the Pension screen
setInterval(() => {
  const S = Gm.get(); if (!S || busy || view.tab !== 'fusion' || fv.tab !== 'pension' || document.querySelector('.modal-wrap, .modal')) return;
  const before = Gm.dcEggs(); Gm.dcTick(); if (Gm.dcEggs() !== before) { Gm.save(true); render(); return }
  for (let i = 0; i < Gm.dcCount(); i++) { const el = document.getElementById('dctime' + i), bar = document.getElementById('dcbar' + i); const left = Gm.dcLeft(i);
    if (el) el.textContent = mmss(left); if (bar) bar.style.width = (1 - left / Gm.EGG_MS) * 100 + '%' }
}, 1000);

// ---------- QUESTS
function untilTxt(ms) { const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return h >= 24 ? `${Math.floor(h / 24)} j ${h % 24} h` : `${h} h ${String(m).padStart(2, '0')}` }
function renderQuests() {
  const Q = Gm.questsFresh(); const now = new Date();
  const mid = new Date(now); mid.setHours(24, 0, 0, 0); const mon = new Date(now); mon.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7)); mon.setHours(0, 0, 0, 0);
  const sec = (g, title, ms) => `<section class="blk"><h2>${title} <small>renouvelées dans ${untilTxt(ms)}</small></h2><div class="qlist">${Q[g].list.map((q, i) => { const ok = q.p >= q.goal; return `<div class="qrow ${q.done ? 'done' : ok ? 'ready' : ''}"><div class="qinfo"><b>${esc(Gm.qLabel(q))}</b><div class="qbar"><i style="width:${q.p / q.goal * 100}%"></i></div><small class="mut">${q.p} / ${q.goal} · Récompense : ${fmt(q.rw.money)} ₽ + ${UI.itemIcon(q.rw.it, 'ii sm')}${esc(q.rw.it)}${q.rw.q > 1 ? ' ×' + q.rw.q : ''}</small></div>${q.done ? '<span class="chip">Récupérée</span>' : `<button class="btn sm ${ok ? 'pri' : ''}" data-act="qclaim" data-g="${g}" data-i="${i}" ${ok ? '' : 'disabled'}>Récupérer</button>`}</div>` }).join('')}</div></section>`;
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Objectifs</p><h1>Quêtes</h1><p class="sub">Trois quêtes par jour et trois par semaine. La progression compte toute seule pendant que vous jouez.</p></section>` + sec('d', 'Quêtes du jour', mid - now) + sec('w', 'Quêtes de la semaine', mon - now);
}

// ---------- RAIDS TÉRA
const hms = ms => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 3600)}:${String(Math.floor(t % 3600 / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` };
setInterval(() => { const el = document.getElementById('raidtime'); if (!el || busy) return; const left = Gm.raidLeft(); if (left <= 0) { render(); return } el.textContent = hms(left) }, 1000);
function renderRaid() {
  const R = Gm.raidFresh(); const S = Gm.get();
  let h = `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Inspiré d’Écarlate et Violet</p><h1>Raids Téra</h1><p class="sub">Un Pokémon téracristallisé géant apparaît toutes les 3 heures. Battez-le avec votre équipe pour gagner des objets rares et le capturer.</p></section>`;
  if (!R.cur) return h + `<section class="blk raidwait"><p class="mut">Prochain raid dans</p><b id="raidtime">${hms(Gm.raidLeft())}</b><p class="mut">Les étoiles du raid dépendent de votre progression (${Gm.raidStarsRange().join(' à ')} ★ en ce moment).</p></section>`;
  const c = R.cur; const s = sp(c.id || c.s); const rw = Gm.raidRewards(c.stars);
  return h + `<section class="raidcard" style="--tera:${TC[c.tera]}"><div class="raidstars">${'★'.repeat(c.stars)}<span>${'★'.repeat(6 - c.stars)}</span></div>
    <div class="raidspr">${spr(s.ix, c.sh, 'big')}</div>
    <div class="raidinfo"><h2>${esc(s.n)}${c.sh ? ' ' + SHI + '' : ''} <small>N.${c.lv}</small></h2><p>Type Téra : ${typeChip(c.tera)} · ${s.t.map(t => typeChip(t, 1)).join('')}</p><p class="mut">PV ×${c.hp} · ses attaques de type ${TL[c.tera]} sont renforcées.</p>
    <p class="mut">Récompenses : ${fmt(rw.money)} ₽, ${c.stars + 1} ${esc(rw.items[0][0])}, ${Math.ceil(c.stars / 2) + 1} objets rares au hasard (Pépite, Nœud Destin, Pierre Stase, Pilule Talent${c.stars >= 4 ? ', Patch Talent, Grosse Pépite' : ''}…)${c.stars >= 3 ? ', un Aromate' : ''}${c.stars >= 5 ? ', parfois une Master Ball' : ''}, et la capture du Pokémon.</p>
    <div class="row-btns"><button class="btn xl pri" data-act="raidgo" ${Gm.teamAlive() ? '' : 'disabled'}>Lancer le raid</button></div><p class="mut">Le raid reste disponible jusqu’à ce que vous le gagniez ; le minuteur de 3 h démarre après la victoire.</p>${Gm.teamAlive() ? '' : '<p class="warn">Soignez votre équipe d’abord.</p>'}</div></section>${(() => { const I = Gm.raidRewardInfo(c.stars); return `<section class="blk raidrw"><h2>Récompenses du raid ${'★'.repeat(c.stars)}</h2><div class="rwgrid"><div><span>Toujours</span><b>${fmt(I.money)} ₽</b><b>${UI.itemIcon(I.candy[0], 'ii sm')}${esc(I.candy[0])} ×${I.candy[1]}</b></div><div><span>${I.picks} objet${I.picks > 1 ? 's' : ''} au hasard parmi</span>${I.pool.map(([n, q]) => `<b>${UI.itemIcon(n, 'ii sm')}${esc(n)}${q > 1 ? ' ×' + q : ''}</b>`).join('')}</div>${I.mint || I.master ? `<div><span>Bonus possibles</span>${I.mint ? `<b>Aromate au hasard (${Math.round(I.mint * 100)} %)</b>` : ''}${I.master ? `<b>${UI.itemIcon('Master Ball', 'ii sm')}Master Ball (${Math.round(I.master * 100)} %)</b>` : ''}</div>` : ''}<div><span>Le Pokémon du raid</span><b>1 chance sur 2 de le capturer avec la Ball de raid</b><b>Niveau ${Math.min(c.lv, Gm.levelCap())} (votre niveau max)${c.lv > Gm.levelCap() ? ` au lieu de ${c.lv}` : ''}</b><b>Ruban Téra et son type Téra</b></div></div></section>` })()}`;
}
async function raidCatch(c) {
  const lv = Math.max(1, Math.min(c.lv, Gm.levelCap())); const ok = P.R() < 0.5; const s = sp(c.s);
  await UI.modal(`<div class="evo rcatch" style="--tera:${TC[c.tera]}"><p class="eyebrow">Raid Téra ${'★'.repeat(c.stars)}</p><h2 style="margin:4px 0">${esc(s.n)}${c.sh ? ' ' + SHI : ''}</h2><div class="rcstage"><div class="rcmon">${spr(s.ix, c.sh, 'big')}</div><div class="rball"><i></i></div></div><p class="mtxt" id="rctxt">Vous lancez une Ball de raid…</p><div class="mbtns"><button class="btn pri" data-ret="1" id="rcok" disabled>…</button></div></div>`,
    { cls: 'evom', noClose: true, onOpen: w => { const st = w.querySelector('.rcstage'); const t = w.querySelector('#rctxt'); const b = w.querySelector('#rcok'); if (W.Sound) W.Sound.sfx('throw');
      setTimeout(() => { st.classList.add('in'); if (W.Sound) W.Sound.sfx('shake') }, 500);
      setTimeout(() => { if (W.Sound) W.Sound.sfx('shake') }, 1300); setTimeout(() => { if (W.Sound) W.Sound.sfx('shake') }, 2100);
      setTimeout(() => { st.classList.add(ok ? 'caught' : 'broke'); if (W.Sound) W.Sound.sfx(ok ? 'catch' : 'hit'); t.innerHTML = ok ? `Et hop ! <b>${esc(s.n)}</b> est capturé !` : `Oh non ! <b>${esc(s.n)}</b> s’est échappé…`; b.disabled = false; b.textContent = ok ? 'Génial !' : 'Dommage'; if (ok && c.sh && W.playSparkle) W.playSparkle(st, 1.2) }, ok ? 2900 : 2500) } });
  if (!ok) { UI.toast(`${esc(s.n)} s’est échappé de la Ball de raid.`); return }
  const m = P.makeMon(c.s, lv, { sh: c.sh, perfect: c.stars >= 5 ? 4 : c.stars >= 3 ? 2 : 0 }); m.ball = 'Poké Ball'; m.tera = c.tera; Gm.addRib(m, 'raid');
  const where = Gm.addCaught(m); Gm.save(); UI.toast(`${esc(s.n)}${m.sh ? ' chromatique' : ''} N.${lv} (Téra ${TL[c.tera]}) est ${where === 'team' ? 'dans votre équipe' : 'au PC'}.`); render();
}
async function doRaid() {
  const S = Gm.get(); const R = Gm.raidFresh(); const c = R.cur; if (!c || busy) return; let catchAfter = null;
  if (!Gm.teamAlive()) { UI.toast('Votre équipe est K.O.', 'bad'); return }
  const boss = P.makeMon(c.s, c.lv, { sh: c.sh, perfect: c.stars >= 5 ? 4 : c.stars >= 3 ? 2 : 0, smart: true });
  await startBattle({ kind: 'trainer', foe: [boss], name: 'Raid Téra', cls: '★'.repeat(c.stars), ai: 3, bio: 'origin', music: c.stars >= 5 ? 'champion' : 'gym', raid: { hp: c.hp, tera: c.tera },
    after: async (res, bt, ui) => {
      if (res === 'win') {
        S.stats.wins++; S.stats.raids = (S.stats.raids || 0) + 1; if (c.stars >= 6) S.stats.raid6 = (S.stats.raid6 || 0) + 1; const rw = Gm.raidRewards(c.stars); S.money += rw.money;
        for (const [n, q] of rw.items) if (P.IT[n]) Gm.add(n, q);
        Gm.raidDone(true);
        await ui.msg(`Le raid est réussi ! Vous gagnez ${fmt(rw.money)} ₽ et ${rw.items.map(([n, q]) => q > 1 ? n + ' ×' + q : n).join(', ')} !`);
        catchAfter = c;
      } else { await ui.msg('Le raid a échoué… Le Pokémon Téra vous attend toujours : retentez quand vous voulez.'); Gm.healTeam() }
    } });
  if (catchAfter) await raidCatch(catchAfter);
}

// ---------- CARTE DE DRESSEUR
const playTxt = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return `${h} h ${String(m).padStart(2, '0')} min` };
const CARD_THEMES = { nuit: ['Nuit', 'linear-gradient(135deg,#27306a,#161b3d 55%,#2a1f4a)'], feu: ['Braise', 'linear-gradient(135deg,#6a2a17,#2a1416 55%,#5a2a10)'], ocean: ['Océan', 'linear-gradient(135deg,#0f4a6a,#0f1d3d 55%,#114a5a)'], foret: ['Forêt', 'linear-gradient(135deg,#1f5a2a,#14251a 55%,#3a5a14)'], rose: ['Fée', 'linear-gradient(135deg,#6a2a5a,#2a1630 55%,#7a3a6a)'], or: ['Or', 'linear-gradient(135deg,#6a5212,#2a2214 55%,#7a5a10)'], acier: ['Acier', 'linear-gradient(135deg,#4a5566,#1c222c 55%,#5a6170)'] };
const TITLES = [['Dresseur débutant', () => true], ['Collectionneur', S => Gm.dexCount().cb >= 100], ['Encyclopédiste', S => Gm.dexCount().cb >= 500], ['Chasseur de chromatiques', S => S.stats.shinies >= 1, S => [S.stats.shinies, 1, 'chromatiques']], ['Collectionneur d’éclats', S => S.stats.shinies >= 5, S => [S.stats.shinies, 5, 'chromatiques']], ['Chasseur aguerri', S => S.stats.shinies >= 10, S => [S.stats.shinies, 10, 'chromatiques']], ['Roi des chromatiques', S => S.stats.shinies >= 25, S => [S.stats.shinies, 25, 'chromatiques']], ['Maître des chromatiques', S => S.stats.shinies >= 50, S => [S.stats.shinies, 50, 'chromatiques']], ['Légende chromatique', S => S.stats.shinies >= 100, S => [S.stats.shinies, 100, 'chromatiques']], ['Dresseur Ace', S => Gm.badges() >= 8], ['Maître de la Ligue', S => !!S.champ], ['Éleveur', S => (S.stats.eggs || 0) >= 10, S => [S.stats.eggs || 0, 10, 'œufs éclos']], ['Explorateur Téra', S => [...S.team, ...Gm.pcAll()].some(m => (m.rib || []).includes('raid'))], ['Témoin des légendes', S => S.stats.legs >= 1, S => [S.stats.legs, 1, 'légendaires']], ['Dompteur de légendes', S => S.stats.legs >= 5, S => [S.stats.legs, 5, 'légendaires']], ['Gardien des légendes', S => S.stats.legs >= 10, S => [S.stats.legs, 10, 'légendaires']], ['Légende de Valmara', S => S.stats.legs >= 25, S => [S.stats.legs, 25, 'légendaires']], ['Mythe vivant', S => S.stats.legs >= 50, S => [S.stats.legs, 50, 'légendaires']]];
{ const own = () => [...Gm.get().team, ...Gm.pcAll()]; const st = (k, n, l) => [S => (S.stats[k] || 0) >= n, S => [S.stats[k] || 0, n, l]];
  const X = (t, ok, pr) => TITLES.push(pr ? [t, ok, pr] : [t, ok]);
  const XO = (t, ok, pr) => TITLES.push([t, ok, pr, 1]); // online-only title: hidden while the online mode is off, unless already earned
  X('Attrapeur', ...st('caught', 1000, 'captures')); X('Maître attrapeur', ...st('caught', 10000, 'captures')); X('Collectionneur ultime', ...st('caught', 50000, 'captures'));
  X('Chasseur d’épiques', ...st('epics', 100, 'épiques')); X('Seigneur des légendes', ...st('legs', 100, 'légendaires')); X('Panthéon vivant', ...st('legs', 200, 'légendaires'));
  X('Étoile filante', ...st('shinies', 250, 'chromatiques')); X('Constellation vivante', ...st('shinies', 500, 'chromatiques')); X('Galaxie chromatique', ...st('shinies', 1000, 'chromatiques'));
  X('Maître Pokédex', S => Gm.dexCount().cb >= 1025, S => [Gm.dexCount().cb, 1025, 'espèces']); X('Collectionneur chromatique', S => Gm.dexCount().sh >= 500, S => [Gm.dexCount().sh, 500, 'chromatiques au Pokédex']);
  X('Vétéran', ...st('wins', 10000, 'victoires')); X('Invincible', ...st('wins', 100000, 'victoires'));
  X('Dynastie', S => (S.champTimes || 0) >= 10, S => [S.champTimes || 0, 10, 'victoires à la Ligue']); X('Empereur de Valmara', S => (S.champTimes || 0) >= 50, S => [S.champTimes || 0, 50, 'victoires à la Ligue']);
  X('As de la Tour', S => Math.max(S.tower.best1 || 0, S.tower.best2 || 0, S.tower.best3 || 0) >= 50, S => [Math.max(S.tower.best1 || 0, S.tower.best2 || 0, S.tower.best3 || 0), 50, 'victoires de suite']);
  X('Briseur de cristaux', ...st('raids', 100, 'raids'));
  X('Maître du Radar', ...st('radarBest', 40, 'de chaîne')); X('Jardinier étoilé', ...st('radarSh', 10, 'chromatiques au Radar'));
  X('Éleveur d’élite', ...st('eggs', 1000, 'œufs')); X('Couveuse légendaire', ...st('eggs', 10000, 'œufs')); X('Généticien', ...st('fusions', 500, 'fusions'));
  X('Obsessionnel', ...st('chainMax', 100, 'captures de suite'));
  X('Perfectionniste', S => own().filter(m => P.ivPct(m) >= 100).length >= 10, S => [own().filter(m => P.ivPct(m) >= 100).length, 10, 'IV parfaits']);
  X('Citrouille', S => own().some(m => m.hw)); X('Roi d’Halloween', S => own().some(m => m.hw && m.sh));
  X('Habitant de Valmara', S => (S.stats.play || 0) >= 360000, S => [Math.floor((S.stats.play || 0) / 3600), 100, 'heures']);
  X('Magnat', S => S.money >= 10000000, S => [S.money, 10000000, '₽']);
  // online titles
  const onp = () => (W.ON && W.ON.me ? W.ON.me() : {}) || {}; const dcs = S => (S.on && S.on.dcn) || 0;
  XO('Marchand', ...st('gtsSold', 5, 'ventes à la GTS')); XO('Grand marchand', ...st('gtsSold', 50, 'ventes à la GTS')); XO('Magnat de la GTS', ...st('gtsSold', 250, 'ventes à la GTS'));
  XO('Compétiteur', S => (onp().rw || 0) >= 10, S => [onp().rw || 0, 10, 'victoires classées']); XO('Gladiateur', S => (onp().rw || 0) >= 100, S => [onp().rw || 0, 100, 'victoires classées']);
  XO('Diamant', S => (onp().mmr || 0) >= 1600, S => [Math.round(onp().mmr || 1000), 1600, 'MMR']); XO('Maître classé', S => (onp().mmr || 0) >= 1750, S => [Math.round(onp().mmr || 1000), 1750, 'MMR']);
  XO('Relevé de défis', S => dcs(S) >= 10, S => [dcs(S), 10, 'défis du jour']); XO('Assidu', S => ((S.on && S.on.dcs && S.on.dcs.best) || 0) >= 7, S => [(S.on && S.on.dcs && S.on.dcs.best) || 0, 7, 'jours de suite']); XO('Infatigable', S => ((S.on && S.on.dcs && S.on.dcs.best) || 0) >= 30, S => [(S.on && S.on.dcs && S.on.dcs.best) || 0, 30, 'jours de suite']);
  ['Bronze', 'Argent', 'Or', 'Platine', 'Diamant', 'Maître'].forEach((n, i) => XO(n + ' de saison', S => !!(S.on && (S.on.seasons || []).some(x => x.tier === i))));
  XO('Chef de clan', S => { const p = onp(); const c = p.clan && W.ON && W.ON.D.clans[p.clan]; return !!(c && c.own === W.ON.pid) });
  X('Chasseur de succès', S => Object.keys(S.ach || {}).length >= 100, S => [Object.keys(S.ach || {}).length, 100, 'succès']);
  X('Légende absolue', S => Object.keys(S.ach || {}).length >= ACH.length, S => [Object.keys(S.ach || {}).length, ACH.length, 'succès']);
}
const titlesFor = S => TITLES.filter(([t, ok, , on]) => !on || !W.ONLINE_OFF || ok(S) || (S.card && S.card.title === t));
async function profileEdit() {
  const S = Gm.get(); const c = S.card || (S.card = { motto: '', theme: 'nuit', fav: '' });
  const own = [...S.team, ...Gm.pcAll()];
  const favOpts = own.slice().sort((a, b) => sp(a.s).dn - sp(b.s).dn).slice(0, 400).map(m => `<option value="${m.u}" ${c.fav === m.u ? 'selected' : ''}>${esc(monName(m))}${m.sh ? ' (chromatique)' : ''} · N.${m.lv}</option>`).join('');
  const r = await UI.modal(`<h3>Modifier ma carte</h3>
    <label class="fld"><span>Nom de Dresseur</span><input id="pfname" maxlength="12" value="${esc(S.name)}"></label>
    <label class="fld"><span>Devise</span><input id="pfmotto" maxlength="40" placeholder="Attrapez-les tous !" value="${esc(c.motto || '')}"></label>
    <div class="fld"><span>Titre <small class="mut">(${titlesFor(S).filter(([, ok]) => ok(S)).length}/${titlesFor(S).length} débloqués)</small></span><input type="hidden" id="pftitle" value="${esc(c.title || 'Dresseur débutant')}"><div class="ttlgrid">${[...titlesFor(S).filter(([, ok]) => ok(S)), ...titlesFor(S).filter(([, ok]) => !ok(S))].map(([t, ok, pr]) => { const on = ok(S); const pv = pr ? pr(S) : null; return on ? `<button type="button" class="ttl ${(c.title || 'Dresseur débutant') === t ? 'on' : ''}" data-ttl="${esc(t)}">${esc(t)}</button>` : `<span class="ttl locked" title="${pv ? `${fmt(Math.min(pv[0], pv[1]))} / ${fmt(pv[1])} ${esc(pv[2])}` : 'Verrouillé'}">🔒 ${esc(t)}${pv ? `<i style="width:${Math.min(100, pv[0] / pv[1] * 100)}%"></i>` : ''}</span>` }).join('')}</div></div>
    <div class="fld"><span>Thème de la carte</span><div class="themes">${Object.entries(CARD_THEMES).map(([k, [n, g]]) => `<button class="thm ${c.theme === k ? 'on' : ''}" data-th="${k}" style="background:${g}" title="${n}">${n}</button>`).join('')}</div></div>
    <div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-ok="1">Enregistrer</button></div>`,
    { cls: 'wide', onClick: (ev, close, w) => { const tl = ev.target.closest('[data-ttl]'); if (tl) { w.querySelectorAll('.ttl.on').forEach(x => x.classList.remove('on')); tl.classList.add('on'); w.querySelector('#pftitle').value = tl.dataset.ttl } const th = ev.target.closest('[data-th]'); if (th) { w.querySelectorAll('.thm').forEach(b => b.classList.toggle('on', b === th)); w._th = th.dataset.th } if (ev.target.dataset.ok) close(JSON.stringify({ n: w.querySelector('#pfname').value, m: w.querySelector('#pfmotto').value, t: w._th || c.theme, ti: w.querySelector('#pftitle').value })) } });
  if (!r) return; const o = JSON.parse(r);
  const nm = o.n.trim().slice(0, 12); if (nm) S.name = nm; c.motto = o.m.trim().slice(0, 40); if (CARD_THEMES[o.t]) c.theme = o.t; if (TITLES.some(([t, ok]) => t === o.ti && ok(S))) c.title = o.ti;
  Gm.save(); UI.toast('Carte de Dresseur mise à jour.'); render();
}
function renderProfile() {
  const S = Gm.get(); const dc = Gm.dexCount();
  const started = new Date(S.stats.started || S.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const stat = (v, l) => `<div class="pcst"><b>${v}</b><small>${l}</small></div>`;
  const pv = Object.values(S.pvp || {}); const pw = pv.reduce((a, x) => a + x.w, 0), pl = pv.reduce((a, x) => a + x.l, 0);
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Carte de Dresseur</h1></section>
  ${(() => { return '' })()}<div class="row-btns"><button class="btn sm" data-act="profedit">Modifier ma carte (nom, devise, thème, titre)</button><button class="btn sm" data-act="bdpick">Bordure d’avatar</button><button class="btn sm" data-act="bnpick">Bannière</button><button class="btn sm" data-act="phset">Photo de profil (PNG / GIF)</button>${(Gm.get().card || {}).ph ? '<button class="btn sm" data-act="phdel">Retirer la photo</button>' : ''}</div>
  <section class="trcard ${S.champ ? 'champ' : ''} ${myBanner() ? 'hasbn' : ''}" style="${S.card && CARD_THEMES[S.card.theme] && S.card.theme !== 'nuit' ? 'background:' + CARD_THEMES[S.card.theme][1] : ''}">${bannerImg(myBanner())}<div class="tchead"><div class="tcwho">${myFace()}<div><p class="eyebrow">Région de ${REGION} · ID ${esc(S.tid || '000000')}</p><h2>${esc(S.name)}</h2>${S.card && S.card.title ? `<p class="tctitle">${esc(S.card.title)}</p>` : ''}${S.card && S.card.motto ? `<p class="tcmotto">« ${esc(S.card.motto)} »</p>` : ''}<p class="mut">${S.champ ? `Maître de la Ligue ×${S.champTimes}` : `${Gm.badges()} badge${Gm.badges() > 1 ? 's' : ''}`} · aventure commencée le ${started}</p></div></div><div class="tcmoney"><small>Argent</small><b>${fmt(S.money)} ₽</b></div></div>
    <div class="tcteam">${S.team.map(m => `<div class="tcmon">${monIcon(m, 'tri')}<small>${esc(monName(m))}${m.sh ? ' ' + SHI : ''}</small><em>N.${m.lv}</em></div>`).join('')}${Array.from({ length: 6 - S.team.length }, () => '<div class="tcmon empty"></div>').join('')}</div>
    <div class="tcbadges">${G.GYMS.map((g, i) => `<div class="tcb ${S.gyms[i] ? 'on' : ''}" title="${esc(g.badge)} — ${esc(g.n)}">${W.GYMB && W.GYMB[g.type] ? `<img src="${W.GYMB[g.type]}" alt="">` : ''}<small>${esc(g.badge.replace('Badge ', ''))}</small></div>`).join('')}</div>
    <div class="tcstats">${stat(playTxt(S.stats.play || 0), 'temps de jeu')}${stat(dc.cb + ' / 1025', 'Pokédex')}${stat(fmt(S.stats.shinies), 'chromatiques')}${stat(fmt(S.stats.legs), 'légendaires')}${stat(fmt(S.stats.caught), 'captures')}${stat(fmt(S.stats.wins), 'victoires')}${stat(`${S.tower.best1} / ${S.tower.best2}`, 'record Tour')}${stat((() => { const p = W.ON && W.ON.me ? W.ON.me() : {}; return `${(p.rw || 0) + (p.fw || 0)} – ${(p.rl || 0) + (p.fl || 0)}` })(), 'combats en ligne')}</div>
  </section>`;
}

// ---------- codes for trades and friend battles (work online and offline: you send the code to your friend)
const CODE_V = 'VAL1';
async function packCode(kind, obj) {
  const json = JSON.stringify({ k: kind, v: 1, ...obj });
  let bytes = new TextEncoder().encode(json), z = 0;
  if (W.CompressionStream) { try { const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')); bytes = new Uint8Array(await new Response(cs).arrayBuffer()); z = 1 } catch (e) { bytes = new TextEncoder().encode(json); z = 0 } }
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return `${CODE_V}${z ? 'z' : 'j'}-${kind}-` + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpackCode(code) {
  code = (code || '').replace(/\s+/g, '');
  const m = code.match(/^VAL1([zj])-([a-z]+)-([A-Za-z0-9_-]+)$/); if (!m) throw new Error('Ce code n’est pas un code Valmara valide.');
  const b64 = m[3].replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  let bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  if (m[1] === 'z') { if (!W.DecompressionStream) throw new Error('Votre navigateur ne sait pas lire ce code.'); const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); bytes = new Uint8Array(await new Response(ds).arrayBuffer()) }
  const o = JSON.parse(new TextDecoder().decode(bytes)); if (!o || o.k !== m[2]) throw new Error('Code abîmé.'); return o;
}
// rebuild a Pokémon from untrusted data, keeping only legal values
function cleanMon(x) {
  if (!x || !sp(x.s)) throw new Error('Pokémon inconnu dans le code.');
  const n = (v, a, b, d) => { v = Math.round(+v); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d };
  const lv = n(x.lv, 1, 100, 5); const m = P.makeMon(+x.s, lv);
  m.iv = Array.from({ length: 6 }, (_, i) => n((x.iv || [])[i], 0, 31, 0));
  let ev = Array.from({ length: 6 }, (_, i) => n((x.ev || [])[i], 0, 252, 0)); let tot = 0; ev = ev.map(v => { const k = Math.min(v, 510 - tot); tot += k; return k }); m.ev = ev;
  m.nat = n(x.nat, 0, 24, 0); m.ab = x.ab === 'h' && sp(m.s).ha ? 'h' : n(x.ab, 0, 2, 0); m.sh = !!x.sh;
  const mvs = (x.m || []).map(k => Array.isArray(k) ? k[0] : k).filter(k => typeof k === 'string' && mv(k)).slice(0, 4); if (mvs.length) m.m = mvs.map(k => [k, mv(k).pp]);
  m.it = typeof x.it === 'string' && IT[x.it] && IT[x.it].cat !== 'key' ? x.it : '';
  m.ball = typeof x.ball === 'string' && IT[x.ball] && IT[x.ball].cat === 'ball' ? x.ball : 'Poké Ball';
  if (typeof x.nick === 'string' && x.nick.trim()) m.nick = x.nick.slice(0, 12);
  m.rib = Array.isArray(x.rib) ? x.rib.filter(k => Gm.RIB[k] && !['perfect', 'lv100'].includes(k)) : [];
  if (x.tera && P.TYPES.includes(x.tera)) m.tera = x.tera;
  if (x.fm && G.FORMS[x.fm] && (!G.FORMS[x.fm].b || G.FORMS[x.fm].b === m.s)) { m.fm = +x.fm; m.hp = P.maxHP(m) } // special form (Floette Éternel, Sachanobi…)
  if (x.hw && Gm.hwURL(m.s, false)) m.hw = 1; else if (x.hw && Gm.HW_IDS.includes(m.s)) m.hw = 1;
  m.xp = P.expFor(sp(m.s).gr, lv); m.hp = P.maxHP(m); m.st = ''; m.fr = 70;
  return m;
}
const monData = m => ({ hw: m.hw ? 1 : 0, s: m.s, lv: m.lv, iv: m.iv, ev: m.ev, nat: m.nat, ab: m.ab, sh: m.sh ? 1 : 0, m: m.m.map(x => x[0]), it: m.it, ball: m.ball, nick: m.nick, rib: m.rib, tera: m.tera, fm: m.fm });
const monLine = (m, extra) => `<div class="irow">${monIcon(m, 'tri')}<span><b>${esc(monName(m))}${m.sh ? ' ' + SHI : ''} <small>N.${m.lv}</small></b><small>${esc(P.abilityOf(m))}${m.ab === 'h' ? ' ★' : ''} · ${P.NAT[m.nat][0]} · IV ${ivTag(m)}${m.it ? ' · ' + esc(m.it) : ''}${extra ? ' · ' + extra : ''}</small></span></div>`;
async function copyBox(title, code, note) {
  await UI.modal(`<h3>${title}</h3><p class="mtxt">${note}</p><textarea class="codebox" rows="5" readonly id="cbx">${esc(code)}</textarea><div class="mbtns"><button class="btn pri" data-copy="1">Copier le code</button><button class="btn" data-ret="1">Fermer</button></div>`,
    { cls: 'wide', onClick: (ev) => { if (ev.target.dataset.copy) { const t = document.getElementById('cbx'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => UI.toast('Code copié !'), () => { document.execCommand && document.execCommand('copy'); UI.toast('Code sélectionné : copiez-le.') }) } } });
}

// ---------- ÉCHANGES (sécurisés, en 3 codes)
// 1. A propose : son Pokémon part en dépôt, le code d'offre le montre mais il est chiffré (inutilisable sans la clé de A).
// 2. B répond avec son Pokémon (mis en dépôt chez B). Le code de réponse ne marche que dans le jeu de A, pour cette offre.
// 3. A colle la réponse : il reçoit le Pokémon de B et son jeu crée le code final (la clé) qui libère son Pokémon chez B.
// A peut annuler tant qu'il n'a pas collé de réponse : il récupère son Pokémon et obtient un code d'annulation qui rembourse B.
const SHA = (() => { // SHA-256 (synchronous, works offline and in every browser)
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  return bytes => {
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(bytes); m[l] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64); const r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) | 0 }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0 }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32); const ov = new DataView(out.buffer); H.forEach((v, i) => ov.setUint32(i * 4, v)); return out;
  };
})();
const tenc = s => new TextEncoder().encode(s);
const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const shaHex = s => hex(SHA(tenc(s)));
const rndKey = () => { const a = new Uint8Array(16); (W.crypto && crypto.getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256 | 0)); return hex(a) };
const b64e = u => { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s) };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function xcrypt(bytes, key) { const out = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i += 32) { const ks = SHA(tenc(key + ':' + (i >> 5))); for (let j = 0; j < 32 && i + j < bytes.length; j++) out[i + j] = bytes[i + j] ^ ks[j] } return out }
const lockMon = (m, key) => b64e(xcrypt(tenc(JSON.stringify(monData(m))), key));
const unlockMon = (enc, key) => JSON.parse(new TextDecoder().decode(xcrypt(b64d(enc), key)));
const TX_ST = { offer: 'Offre envoyée · en attente de la réponse', got: 'Terminé · envoyez le code final', cancel: 'Annulé · Pokémon récupéré', answered: 'Réponse envoyée · en attente du code final', done: 'Terminé', refund: 'Annulé · Pokémon récupéré' };
function txList() { const S = Gm.get(); S.tx = S.tx || {}; return Object.values(S.tx).sort((a, b) => b.t - a.t) }
function renderTrade() {
  const S = Gm.get(); const L = txList().slice(0, 12);
  const row = x => { const m = x.role === 'A' ? x.mon : x.mon; const btns = [];
    if (x.role === 'A' && x.st === 'offer') btns.push(`<button class="btn sm" data-act="txcode" data-id="${x.id}" data-c="offer">Revoir l’offre</button><button class="btn sm" data-act="txcancel" data-id="${x.id}">Annuler</button>`);
    if (x.role === 'A' && x.st === 'got') btns.push(`<button class="btn sm pri" data-act="txcode" data-id="${x.id}" data-c="rel">Code final</button>`);
    if (x.role === 'A' && x.st === 'cancel') btns.push(`<button class="btn sm" data-act="txcode" data-id="${x.id}" data-c="can">Code d’annulation</button>`);
    if (x.role === 'B' && x.st === 'answered') btns.push(`<button class="btn sm" data-act="txcode" data-id="${x.id}" data-c="ans">Revoir la réponse</button>`);
    return `<div class="irow">${m ? monIcon(m, 'tri') : ''}<span><b>${esc(m ? monName(m) : '?')} ${x.role === 'A' ? '→' : '⇄'} ${esc(x.partner || 'un joueur')}</b><small>${TX_ST[x.st] || x.st} · ${new Date(x.t).toLocaleString('fr-FR')}</small></span><span class="iact">${btns.join('')}</span></div>` };
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Entre amis</p><h1>Échanges</h1><p class="sub">Les échanges se font avec des codes à envoyer à votre ami (Discord, message…). Le système en 3 étapes protège les deux joueurs.</p></section>
  <section class="blk txrules"><h2>Comment ça marche</h2>
    <ol class="txsteps">
      <li><b>Joueur 1 · Proposer.</b> Choisissez votre Pokémon : il est mis en dépôt (il quitte votre équipe mais reste à vous) et vous obtenez un <b>code d’offre</b>. Votre ami voit exactement le Pokémon proposé (IV, nature, chromatique…), sans pouvoir le prendre.</li>
      <li><b>Joueur 2 · Répondre.</b> Collez le code d’offre, vérifiez le Pokémon, puis choisissez le vôtre. Vous obtenez un <b>code de réponse</b> à renvoyer. Votre Pokémon est alors parti : ne répondez que si l’offre vous convient.</li>
      <li><b>Joueur 1 · Valider.</b> Collez le code de réponse : vous recevez le Pokémon et le jeu affiche le <b>code final</b>. Envoyez-le tout de suite au joueur 2, qui le colle pour recevoir votre Pokémon.</li>
    </ol>
    <p class="mut">Tant qu’il n’a pas collé de réponse, le joueur 1 peut <b>annuler</b> : il récupère son Pokémon et obtient un code d’annulation. Si le joueur 2 avait déjà répondu, ce code lui rend son Pokémon. Chaque code ne marche qu’une fois et uniquement pour cet échange.</p>
    <div class="txwarn">⚠️ <b>Règle du jeu :</b> celui qui garde le Pokémon reçu sans envoyer le code final (ou le code d’annulation) triche. Signalez-le sur le Discord avec une capture de votre historique d’échanges : <b>il sera banni du Discord et ne pourra plus échanger avec personne.</b></div>
  </section>
  <section class="blk"><h2>Proposer un échange</h2><button class="btn pri" data-act="txoffer">Choisir le Pokémon à proposer…</button></section>
  <section class="blk"><h2>Coller un code</h2><p class="mut">Code d’offre, de réponse, final ou d’annulation : le jeu reconnaît tout seul ce que c’est.</p><textarea id="tradein" class="codebox" rows="4" placeholder="Collez ici le code de votre ami (VAL1…)"></textarea><div class="row-btns"><button class="btn pri" data-act="txpaste">Valider le code</button></div></section>
  ${L.length ? `<section class="blk"><h2>Mes échanges</h2><div class="ilist">${L.map(row).join('')}</div></section>` : ''}
  <section class="blk"><h2>Donner un Pokémon</h2><p class="mut">Cadeau sans contrepartie : le Pokémon part dès que le code est créé. N’utilisez jamais ce bouton pour un échange.</p><button class="btn" data-act="tradesend">Donner un Pokémon…</button></section>`;
}
async function pickOwnMon(title) {
  const S = Gm.get(); const all = [...S.team, ...Gm.pcAll()];
  const row = m => `<button class="irow dcpick" data-ret="${m.u}" data-q="${esc((sp(m.s).n + ' ' + (m.nick || '')).toLowerCase())}">${monIcon(m, 'tri')}<span><b>${esc(monName(m))}${m.sh ? ' ' + SHI : ''} <small>N.${m.lv}</small></b><small>${S.team.includes(m) ? 'Équipe' : 'PC'} · IV ${ivTag(m)}</small></span></button>`;
  const u = await UI.modal(`<h3>${title}</h3><input id="dcq" type="search" placeholder="Rechercher" class="dcq"><div class="ilist dclist">${all.map(row).join('')}</div>`, { cls: 'wide', onOpen: w => { const q = w.querySelector('#dcq'); q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); w.querySelectorAll('.dcpick').forEach(b => b.style.display = !v || b.dataset.q.includes(v) ? '' : 'none') }) } });
  if (!u) return null; const [m] = Gm.findMon(u); if (!m) return null;
  if (m.lock) { UI.toast(`${esc(monName(m))} est verrouillé 🔒.`, 'bad'); return null }
  if (S.team.includes(m) && S.team.length <= 1) { UI.toast('Gardez au moins un Pokémon dans votre équipe.', 'bad'); return null }
  return m;
}
const txCodeBox = (x, c) => { const t = { offer: ['Code d’offre', `Envoyez ce code à votre ami. Votre ${esc(monName(x.mon))} reste en dépôt en attendant sa réponse.`], ans: ['Code de réponse', `Renvoyez ce code à ${esc(x.partner)}. Il vous enverra ensuite le code final.`], rel: ['Code final', `Envoyez ce code à ${esc(x.partner)} : il lui permet de recevoir votre Pokémon. Sans lui, l’échange n’est pas terminé.`], can: ['Code d’annulation', `Si ${esc(x.partner || 'votre ami')} vous avait déjà répondu, envoyez-lui ce code : il lui rend son Pokémon.`] }[c]; return copyBox(t[0], x.codes[c], t[1]) };
async function txOffer() {
  const S = Gm.get(); const m = await pickOwnMon('Quel Pokémon proposer ?'); if (!m) return;
  if (!(await UI.confirm(`Proposer ${esc(monName(m))} ? Il est mis en dépôt jusqu’à la fin de l’échange (vous pourrez annuler tant que vous n’avez pas collé de réponse).`, 'Créer l’offre'))) return;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8), key = rndKey(), can = rndKey();
  const code = await packCode('toffer', { id, from: S.name, tid: S.tid, pv: monData(m), enc: lockMon(m, key), h: shaHex(key), hc: shaHex(can) });
  Gm.removeMon(m); S.tx = S.tx || {}; S.tx[id] = { id, role: 'A', st: 'offer', t: Date.now(), mon: m, key, can, partner: '', codes: { offer: code } };
  Gm.save(); render(); await txCodeBox(S.tx[id], 'offer');
}
async function txCancel(id) {
  const S = Gm.get(); const x = S.tx && S.tx[id]; if (!x || x.role !== 'A' || x.st !== 'offer') return;
  if (!(await UI.confirm(`Annuler l’offre ? ${esc(monName(x.mon))} revient dans votre jeu.`, 'Annuler l’offre', 'Garder l’offre'))) return;
  x.codes.can = await packCode('tcan', { id, c: x.can }); x.st = 'cancel'; x.t = Date.now();
  Gm.addMonBack(x.mon); Gm.save(); render(); UI.toast(`${esc(monName(x.mon))} est de retour.`); await txCodeBox(x, 'can');
}
async function txPaste() {
  const S = Gm.get(); S.tx = S.tx || {}; const el = document.getElementById('tradein'); let o;
  try { o = await unpackCode(el.value) } catch (e) { UI.toast(esc(e.message), 'bad'); return }
  const x = o.id && S.tx[o.id];
  if (o.k === 'trade') return tradeRecv(o);
  if (o.k === 'toffer') { // step 2 (player 2): look at the offer, answer with a Pokémon
    if (o.tid === S.tid) { UI.toast('C’est votre propre offre : envoyez-la à votre ami.', 'bad'); return }
    if (x) { UI.toast('Vous avez déjà répondu à cette offre.', 'bad'); return }
    let pv; try { pv = cleanMon(o.pv) } catch (e) { UI.toast(esc(e.message), 'bad'); return }
    const ok = await UI.modal(`<h3>Offre de ${esc(o.from)}</h3>${monLine(pv)}<p class="mut">Si cette offre vous convient, choisissez le Pokémon que vous donnez en échange. Il partira dès la création du code de réponse.</p><div class="mbtns"><button class="btn" data-ret="">Refuser</button><button class="btn pri" data-ret="1">Répondre…</button></div>`, { cls: 'small' });
    if (!ok) return; const m = await pickOwnMon(`En échange de ${esc(monName(pv))}, vous donnez…`); if (!m) return;
    if (!(await UI.confirm(`Donner ${esc(monName(m))} contre ${esc(monName(pv))} de ${esc(o.from)} ? ${esc(monName(m))} part maintenant.`, 'Créer la réponse'))) return;
    const code = await packCode('tans', { id: o.id, from: S.name, tid: S.tid, to: o.tid, mon: monData(m) });
    Gm.removeMon(m); S.tx[o.id] = { id: o.id, role: 'B', st: 'answered', t: Date.now(), mon: m, pv: o.pv, enc: o.enc, h: o.h, hc: o.hc, partner: String(o.from || '?').slice(0, 14), codes: { ans: code } };
    el.value = ''; Gm.save(); render(); await txCodeBox(S.tx[o.id], 'ans'); return;
  }
  if (o.k === 'tans') { // step 3 (player 1): receive the Pokémon, give the final code
    if (!x || x.role !== 'A' || o.to !== S.tid) { UI.toast('Ce code de réponse ne correspond à aucune de vos offres.', 'bad'); return }
    if (x.st === 'cancel') { UI.toast('Vous avez annulé cette offre : envoyez votre code d’annulation à votre ami.', 'bad'); return }
    if (x.st !== 'offer') { UI.toast('Cet échange est déjà terminé.', 'bad'); return }
    let m; try { m = cleanMon(o.mon) } catch (e) { UI.toast(esc(e.message), 'bad'); return }
    m.ot = String(o.from || '?').slice(0, 12);
    const ok = await UI.modal(`<h3>Réponse de ${esc(o.from)}</h3><p class="mtxt">Contre votre ${esc(monName(x.mon))}, vous recevez :</p>${monLine(m, 'Dresseur d’origine : ' + esc(m.ot))}<p class="mut">En validant, vous recevez ce Pokémon et le jeu affiche le code final, à envoyer tout de suite à ${esc(o.from)}.</p><div class="mbtns"><button class="btn" data-ret="">Pas maintenant</button><button class="btn pri" data-ret="1">Valider l’échange</button></div>`, { cls: 'small' });
    if (!ok) return;
    x.codes.rel = await packCode('trel', { id: x.id, key: x.key, to: o.tid }); x.st = 'got'; x.partner = String(o.from || '?').slice(0, 14); x.t = Date.now(); x.got = monData(m);
    el.value = ''; await txReceive(m); await txCodeBox(x, 'rel'); return;
  }
  if (o.k === 'trel' || o.k === 'tcan') { // final step (player 2): receive the Pokémon, or get yours back
    if (!x || x.role !== 'B' || (o.k === 'trel' && o.to !== S.tid)) { UI.toast('Ce code ne correspond à aucun de vos échanges.', 'bad'); return }
    if (x.st !== 'answered') { UI.toast('Cet échange est déjà terminé.', 'bad'); return }
    if (o.k === 'tcan') { if (shaHex(String(o.c)) !== x.hc) { UI.toast('Code d’annulation invalide.', 'bad'); return } x.st = 'refund'; x.t = Date.now(); Gm.addMonBack(x.mon); el.value = ''; Gm.save(); render(); UI.toast(`Échange annulé : ${esc(monName(x.mon))} est de retour.`); return }
    if (shaHex(String(o.key)) !== x.h) { UI.toast('Code final invalide.', 'bad'); return }
    let m; try { m = cleanMon(unlockMon(x.enc, String(o.key))) } catch (e) { UI.toast('Code final invalide.', 'bad'); return }
    m.ot = x.partner; x.st = 'done'; x.t = Date.now(); el.value = ''; await txReceive(m); UI.toast(`Échange terminé avec ${esc(x.partner)} !`); return;
  }
  UI.toast('Ce code n’est pas un code d’échange.', 'bad');
}
async function txReceive(m) {
  const S = Gm.get(); m.egg = 1; const where = Gm.addCaught(m); Gm.dexSet(m.s, 3 | (m.sh ? 12 : 0)); { const c = Gm.dexN(m.s); if (!c[0]) Gm.dexInc(m.s, 0) }
  Gm.save(); if (m.sh && W.Sound) W.Sound.sfx('shiny');
  UI.toast(`${esc(monName(m))} est arrivé ${where === 'team' ? 'dans votre équipe' : 'au PC'} !`);
  const ev = P.evoOptions(m, { night: Gm.isNight(), trade: true }); if (ev.length) await evolveFlow(m, ev[0].to);
  Gm.dexSync(); Gm.save(); render();
}
async function tradeSend() {
  const S = Gm.get(); const m = await pickOwnMon('Quel Pokémon donner ?'); if (!m) return;
  if (!(await UI.confirm(`Donner ${esc(monName(m))} ? Il quittera votre jeu tout de suite, sans contrepartie.`, 'Créer le code de don'))) return;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const code = await packCode('trade', { id, from: S.name, tid: S.tid, mon: monData(m) });
  Gm.removeMon(m); S.tradesOut = S.tradesOut || []; S.tradesOut.push({ id, n: monName(m), t: Date.now(), code }); if (S.tradesOut.length > 30) S.tradesOut.shift();
  Gm.save(); render();
  await copyBox('Code de don', code, `${esc(monName(m))} est prêt à partir. Envoyez ce code à votre ami.`);
}
async function tradeRecv(o) {
  const S = Gm.get(); const el = document.getElementById('tradein');
  S.tradesIn = S.tradesIn || [];
  if (S.tradesIn.includes(o.id) || (S.tradesOut || []).some(x => x.id === o.id)) { UI.toast('Ce code a déjà été utilisé.', 'bad'); return }
  let m; try { m = cleanMon(o.mon) } catch (e) { UI.toast(esc(e.message), 'bad'); return }
  m.ot = String(o.from || '?').slice(0, 12);
  const ok = await UI.modal(`<h3>Cadeau de ${esc(m.ot)}</h3>${monLine(m, 'Dresseur d’origine : ' + esc(m.ot))}<div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-ret="1">Recevoir</button></div>`, { cls: 'small' });
  if (!ok) return;
  S.tradesIn.push(o.id); el.value = ''; await txReceive(m);
}

// ---------- COMBAT ENTRE AMIS
function renderPvp() {
  const S = Gm.get(); const rec = Object.entries(S.pvp || {});
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Entre amis</p><h1>Combat entre amis</h1><p class="sub">Échangez vos codes d’équipe : chacun affronte l’équipe de l’autre, jouée par l’IA la plus forte du jeu. Tous les Pokémon sont mis au niveau 50, sans objets du Sac.</p></section>
  <section class="blk"><h2>Mon équipe de combat</h2><div class="tcteam">${S.team.map(m => `<div class="tcmon">${monIcon(m, 'tri')}<small>${esc(monName(m))}</small></div>`).join('')}</div><div class="row-btns"><button class="btn pri" data-act="pvpcode">Créer mon code d’équipe</button></div></section>
  <section class="blk"><h2>Défier un ami</h2><textarea id="pvpin" class="codebox" rows="4" placeholder="Collez ici le code d’équipe de votre ami (VAL1…)"></textarea><div class="seg" style="margin:8px 0"><button class="${view.pvpDbl ? '' : 'on'}" data-act="pvpmode" data-v="0">Combat Simple</button><button class="${view.pvpDbl ? 'on' : ''}" data-act="pvpmode" data-v="1">Combat Double</button></div><div class="row-btns"><button class="btn xl pri" data-act="pvpgo">Combattre</button></div></section>
  ${rec.length ? `<section class="blk"><h2>Bilan</h2><div class="ilist">${rec.map(([k, r]) => `<div class="irow"><span><b>${esc(r.n)}</b><small>ID ${esc(k.split('|')[1] || '?')}</small></span><em>${r.w} victoire${r.w > 1 ? 's' : ''} · ${r.l} défaite${r.l > 1 ? 's' : ''}</em></div>`).join('')}</div></section>` : ''}`;
}
async function pvpCode() {
  const S = Gm.get(); const code = await packCode('team', { from: S.name, tid: S.tid, team: S.team.map(monData) });
  await copyBox('Code d’équipe', code, 'Envoyez ce code à votre ami : il pourra affronter votre équipe actuelle. Refaites un code si vous changez d’équipe.');
}
async function pvpGo() {
  const S = Gm.get(); let o;
  try { o = await unpackCode(document.getElementById('pvpin').value) } catch (e) { UI.toast(esc(e.message), 'bad'); return }
  if (o.k !== 'team') { UI.toast('C’est un code d’échange, pas un code d’équipe.', 'bad'); return }
  let foe; try { foe = (o.team || []).slice(0, 6).map(cleanMon) } catch (e) { UI.toast(esc(e.message), 'bad'); return }
  if (!foe.length) { UI.toast('Équipe vide.', 'bad'); return }
  const name = String(o.from || 'Ami').slice(0, 12); const key = name + '|' + String(o.tid || '');
  const mine = S.team.map(m => { const c = JSON.parse(JSON.stringify(m)); P.heal(c); return c });
  const dbl = !!view.pvpDbl && mine.length >= 2 && foe.length >= 2;
  await startBattle({ kind: 'tower', foe, playerMons: mine, fixedLevel: 50, noExp: true, allowItems: false, dbl, name, cls: 'Ami', ai: 3, megaRing: true, bio: 'league', indoor: true, music: 'champion', pvp: true,
    after: async (res, bt, ui) => {
      S.pvp = S.pvp || {}; const r = S.pvp[key] || (S.pvp[key] = { n: name, w: 0, l: 0 });
      if (res === 'win') { r.w++; await ui.msg(`Vous avez battu l’équipe de ${name} !`) } else { r.l++; await ui.msg(`L’équipe de ${name} l’emporte…`) }
    } });
}

// ---------- POKÉDEX rewards
function dexShRewards() {
  const S = Gm.get(); const c = Gm.shDexCount(); const gotL = S.dexShRw2 || [];
  return `<div class="dexrw">${Gm.DEX_SH_RW.map((r, i) => { const got = gotL.includes(i), ok = c >= r.at; const txt = [r.money ? fmt(r.money) + ' ₽' : '', ...r.items.map(([n, q]) => q > 1 ? `${n} ×${q}` : n)].filter(Boolean).join(' + ');
    return `<div class="dxr ${got ? 'done' : ok ? 'ready' : ''}"><b>${r.at} ${SHI}</b><small>${esc(txt)}</small>${got ? '<span class="chip">Reçu</span>' : ok ? `<button class="btn sm pri" data-act="dexshrw" data-i="${i}">Récupérer</button>` : `<small class="mut">${c} / ${r.at}</small>`}</div>` }).join('')}</div>`;
}
function dexRewards() {
  const S = Gm.get(); const c = Gm.dexCount().cb;
  return `<div class="dexrw">${Gm.DEX_RW.map((r, i) => { const got = S.dexRw.includes(i), ok = c >= r.at; const txt = [r.money ? fmt(r.money) + ' ₽' : '', ...r.items.map(([n, q]) => q > 1 ? `${n} ×${q}` : n)].filter(Boolean).join(' + ');
    return `<div class="dxr ${got ? 'done' : ok ? 'ready' : ''}"><b>${r.at} espèces</b><small>${esc(txt)}</small>${got ? '<span class="chip">Reçu</span>' : ok ? `<button class="btn sm pri" data-act="dexrw" data-i="${i}">Récupérer</button>` : `<small class="mut">${c} / ${r.at}</small>`}</div>` }).join('')}</div>`;
}

function renderFusion() {
  { const S0 = Gm.get(); if (S0.flags.dcLegBack) { delete S0.flags.dcLegBack; Gm.save(true); setTimeout(() => UI.alert('Les Pokémon légendaires ne sont plus acceptés à la Pension : le vôtre a été renvoyé dans votre équipe ou au PC. Le Shinyficateur s’obtient désormais à la Tour de Combat.'), 50) } }
  const eg = Gm.dcEggs();
  const tabs = `<div class="seg ftabs"><button class="${fv.tab === 'fuse' || !fv.tab ? 'on' : ''}" data-act="ftab" data-v="fuse">Fusion</button><button class="${fv.tab === 'ev' ? 'on' : ''}" data-act="ftab" data-v="ev">EV</button></div>`;
  if (fv.tab === 'pension') fv.tab = 'fuse';
  if (fv.tab === 'ev') return `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Améliorer un Pokémon</p><h1>EV</h1><p class="sub">Entraînez une stat précise en battant des Pokémon d’entraînement, ou remettez les EV à zéro pour changer de répartition.</p>${tabs}</section>` + renderEV();
  return renderFuse(tabs);
}
function renderFuse(tabs) {
  const S = Gm.get(); const g = fusionGroups();
  const eligible = Object.keys(g).filter(k => g[k].length >= 2).sort((a, b) => sp(a).dn - sp(b).dn);
  let h = `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Améliorer un Pokémon</p><h1>Fusion</h1><p class="sub">Fusionnez deux Pokémon de la même espèce. Le second disparaît. Au choix, le premier gagne des IV, ou reçoit la nature ou le talent du second. La fusion est gratuite ; un chromatique n’est jamais perdu.</p>${tabs}</section>`;
  if (!fv.sp || !g[fv.sp] || g[fv.sp].length < 2) { fv.sp = null; fv.a = fv.b = null }
  h += `<section class="blk"><h2>1. Choisir l’espèce <small>${eligible.length} espèce${eligible.length > 1 ? 's' : ''} en double</small></h2>`;
  if (!eligible.length) h += `<div class="emptystate"><span>🧬</span><b>Aucune espèce en double</b><p>Capturez au moins deux Pokémon de la même espèce pour pouvoir les fusionner.</p></div>`;
  else h += `<div class="pcgrid">${eligible.map(k => `<button class="pcc ${fv.sp == k ? 'sel' : ''} ${RAR[sp(k).rar][1]}" data-act="fsp" data-id="${k}">${spr(sp(k).ix, 0)}<b>${esc(sp(k).n)}</b><small>×${g[k].length} · max ${Math.max(...g[k].map(ivP))}%</small></button>`).join('')}</div>`;
  h += '</section>';
  if (fv.sp) {
    const list = g[fv.sp].slice().sort((a, b) => ivTot(b) - ivTot(a));
    const selA = fv.a && list.find(m => m.u === fv.a), selB = fv.b && list.find(m => m.u === fv.b);
    h += `<section class="blk"><h2>2. Pokémon à améliorer ${selA ? '<button class="mini" data-act="fchg" data-r="a">Changer</button>' : `<small>${list.length} disponibles, meilleurs IV en premier</small>`}</h2><div class="flist ${selA ? '' : 'scroll'}">${selA ? fuseCard(selA, 'a', true) : list.map(m => fuseCard(m, 'a', false)).join('')}</div></section>`;
    if (selA) {
      const lockedN = list.filter(m => m.u !== fv.a && m.lock).length; const rest = list.filter(m => m.u !== fv.a && !m.lock);
      h += `<section class="blk"><h2>3. Pokémon à sacrifier ${selB ? '<button class="mini" data-act="fchg" data-r="b">Changer</button>' : ''}</h2><div class="flist ${selB ? '' : 'scroll'}">${!selB && !rest.length ? `<p class="empty">Tous les autres ${esc(sp(fv.sp).n)} sont verrouillés 🔒.</p>` : ''}${!selB && lockedN && rest.length ? `<p class="mut">${lockedN} verrouillé${lockedN > 1 ? 's' : ''} 🔒 masqué${lockedN > 1 ? 's' : ''}.</p>` : ''}${selB ? fuseCard(selB, 'b', true) : rest.map(m => fuseCard(m, 'b', false)).join('')}</div></section>`;
    }
    if (fv.a && fv.b) {
      const [A] = Gm.findMon(fv.a), [Bm] = Gm.findMon(fv.b);
      if (A && Bm) {
        const tgt = Math.round(P.fuseTarget(A, Bm) * 100); const gain = tgt - ivP(A);
        const abA = P.abilityOf(A), abB = P.abilityOf(Bm);
        const opts = [
          ['iv', 'IV', (() => { const [l, h] = P.fuseRange(A, Bm).map(v => Math.round(v * 100)); return `${ivP(A)} % + ${ivP(Bm)} % → entre ${l} et ${h} %${h < ivP(A) ? ' ⚠ baisse' : l < ivP(A) ? ' (peut baisser)' : ''}` })(), ivP(A) < 100],
          ['nat', 'Nature', `${P.NAT[A.nat][0]} → ${P.NAT[Bm.nat][0]}`, A.nat !== Bm.nat],
          ['ab', 'Talent', `${abA} → ${abB}${Bm.ab === 'h' ? ' (caché)' : ''}`, abA !== abB || A.ab !== Bm.ab],
          ['sh', 'Chromatique seulement', `${monName(A)} devient chromatique, rien d’autre ne change (IV, nature, talent, niveau…)`, !!Bm.sh && !A.sh],
        ];
        if (Bm.sh && !A.sh && !fv.optTouched) fv.opt = 'sh';
        if (!opts.find(o => o[0] === fv.opt && o[3])) { const f = opts.find(o => o[3]); fv.opt = f ? f[0] : 'iv' }
        h += `<section class="blk fuse-go"><h2>4. Ce qui est transmis</h2><div class="fopts">${opts.map(([k, l, d, ok]) => `<button class="fopt ${fv.opt === k ? 'on' : ''}" data-act="fopt" data-k="${k}" ${ok ? '' : 'disabled'}><b>${l}</b><small>${esc(d)}</small>${ok ? '' : '<em>Rien à gagner</em>'}</button>`).join('')}</div>
          <div class="fpreview"><div>${monIcon(A, 'big')}<b>${esc(monName(A))}</b></div><span class="plus">+</span><div class="sac">${monIcon(Bm, 'big')}<b>${esc(monName(Bm))}</b></div></div>
          ${fv.opt === 'iv' ? `<div class="ivgo"><span>${ivTag(A)}</span><b>→</b><span class="ivp big">≈ ${tgt} %</span></div><p class="mut">Le résultat part de la moyenne des deux Pokémon, avec un bonus de +4,5 % à chaque fusion et une petite part de hasard. Plus le Pokémon sacrifié est bon, plus le résultat est élevé. Les points sont répartis au hasard entre les stats qui ne sont pas encore à 31.</p>` : ''}
          <div class="row-btns"><button class="btn xl pri" data-act="fgo" ${opts.find(o => o[0] === fv.opt)[3] ? '' : 'disabled'}>Fusionner</button></div>
          <p class="mut">${esc(monName(Bm))} disparaîtra définitivement${Bm.it ? ` (son objet ${esc(Bm.it)} retourne dans le Sac)` : ''}.</p></section>`;
      }
    }
  }
  return h;
}
async function doFusion() {
  const S = Gm.get(); const [A] = Gm.findMon(fv.a), [Bm, wb] = Gm.findMon(fv.b); if (!A || !Bm || A === Bm || A.s !== Bm.s) return;
  if (Bm.lock) { UI.toast(`${esc(monName(Bm))} est verrouillé 🔒 : il ne peut pas être sacrifié.`, 'bad'); fv.b = null; render(); return }
  if (wb === 'team' && S.team.length <= 1) { UI.toast('Il faut garder au moins un Pokémon dans l’équipe.', 'bad'); return }
  const cost = Gm.FUSE_COST; if (S.money < cost) { UI.toast(`Une fusion coûte ${fmt(cost)} ₽.`, 'bad'); return }
  const warn = [Bm.sh && !A.sh ? `${esc(monName(Bm))} est chromatique : le Pokémon gardé deviendra chromatique.` : '', Gm.ribbons(Bm).filter(k => !['perfect', 'lv100'].includes(k)).length ? `⚠ ${esc(monName(Bm))} a des rubans qui seront perdus.` : ''].filter(Boolean).join('<br>');
  if (!(await UI.confirm(`Fusionner ${esc(monName(Bm))} dans ${esc(monName(A))} ? ${esc(monName(Bm))} disparaîtra.${warn ? '<br><br>' + warn : ''}`, 'Fusionner'))) return;
  S.money -= cost;
  const oldHp = P.maxHP(A);
  const before = ivP(A); if (fv.opt === 'iv') A.iv = P.fuseIV(A, Bm);
  if (fv.opt === 'nat') A.nat = Bm.nat;
  if (fv.opt === 'ab') A.ab = Bm.ab;
  if (Bm.sh) A.sh = true; if (Bm.hw && !A.hw) A.hw = 1; // a shiny (or Halloween palette) is never lost in a fusion
  if (A.hp > 0) A.hp = Math.max(1, A.hp + P.maxHP(A) - oldHp);
  if (Bm.it) Gm.add(Bm.it, 1);
  Gm.removeMon(Bm); S.stats.fusions = (S.stats.fusions || 0) + 1; Gm.qev('fuse');
  fv.b = null; Gm.save();
  await UI.modal(`<div class="evo"><p class="mtxt">Fusion réussie !</p><div class="evostage go"><div class="evo-a">${monIcon(Bm, 'big')}</div><div class="evo-b">${monIcon(A, 'big')}</div></div><p class="mtxt">${esc(monName(A))} : ${fv.opt === 'sh' ? 'il est maintenant chromatique !' : fv.opt === 'iv' ? `IV ${before} % → ${ivP(A)} %` : fv.opt === 'nat' ? `nature ${P.NAT[A.nat][0]}` : `talent ${esc(P.abilityOf(A))}`}</p><div class="mbtns"><button class="btn pri" data-ret="1">Super !</button></div></div>`, { cls: 'evom', noClose: true });
  render();
}
function findMon(u) { return Gm.findMon(u) }
async function monDetail(u) {
  const S = Gm.get(); const [m, where] = findMon(u); if (!m) return;
  const s = sp(m.s); const st = P.calcStats(m); const n = P.NAT[m.nat]; const ab = P.abilityOf(m); const types = P.monTypes(m);
  const fs = m.fm && G.FORMS[m.fm] ? G.FORMS[m.fm] : null; const bs = fs ? fs.bs : s.bs;
  const abd = W.ABD && W.ABD[ab.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')] || '';
  const a = P.expFor(s.gr, m.lv), b = P.expFor(s.gr, m.lv + 1); const xpw = m.lv >= 100 ? 100 : (m.xp - a) / Math.max(1, b - a) * 100;
  const evo = P.evoOptions(m, { night: Gm.isNight() });
  const SHORT = ['PV', 'Attaque', 'Défense', 'Atq. Spé.', 'Déf. Spé.', 'Vitesse'];
  const bcol = v => v >= 130 ? '#36d6b5' : v >= 100 ? '#5fd36b' : v >= 75 ? '#c9d84a' : v >= 55 ? '#ffb347' : '#ff7a6b';
  const stRows = SHORT.map((nm, i) => { const mod = n[1] !== n[2] ? (n[1] === i ? 'up' : n[2] === i ? 'down' : '') : ''; return `<div class="sr ${mod}"><span class="sn">${nm}${mod === 'up' ? ' <i>▲</i>' : mod === 'down' ? ' <i>▼</i>' : ''}</span><span class="sbar"><i style="width:${Math.min(100, bs[i] / 1.8)}%;background:${bcol(bs[i])}"></i></span><b>${st[i]}</b><em>${bs[i]}</em><em class="${m.iv[i] === 31 ? 'max' : ''}">${m.iv[i]}</em><em class="${m.ev[i] >= 252 ? 'max' : ''}">${m.ev[i]}</em></div>` }).join('');
  const tot = bs.reduce((x, y) => x + y, 0);
  const moves = m.m.map(([k, pp, up]) => { const x = mv(k); if (!x) return ''; const mx = P.ppMax([k, pp, up]); return `<div class="mv2" style="--tc:${TC[x.t]}" title="${esc(x.d || '')}"><div class="mv2-top"><b>${esc(x.n)}</b><span class="pp ${pp === 0 ? 'out' : pp <= mx / 4 ? 'low' : ''}">${pp}/${mx}${up ? ` <em>+${up}</em>` : ''}</span></div><div class="mv2-meta"><span class="tpill">${TL[x.t]}</span><span>${x.c === 0 ? 'Statut' : x.c === 1 ? 'Physique' : 'Spécial'}</span>${x.p ? `<span>Puiss. ${x.p}</span>` : ''}${x.a ? `<span>Préc. ${x.a}</span>` : ''}</div>${x.d ? `<p>${esc(x.d)}</p>` : ''}</div>` }).join('');
  const html = `<div class="md2" style="--tc:${TC[types[0]]}">
  <div class="md2-head">
    <div class="md2-art" data-u="${m.u}">${monAnim(m, 'big')}</div>
    <div class="md2-id">
      <p class="eyebrow">N°${String(s.dn).padStart(4, '0')} · ${RAR[s.rar][0]}${m.sh ? ' · <span class="shtxt">' + SHI + ' Chromatique</span>' : ''}</p>
      <h2>${esc(monName(m))}${gdTag(m)}<span class="lvb">N.${m.lv}</span>${m.lock ? '<span class="lockb" title="Verrouillé">🔒</span>' : ''}</h2>
      ${m.nick ? `<p class="md2-sp">${esc(s.n)}</p>` : ''}
      <div class="md2-types">${types.map(t => typeChip(t)).join('')}</div>
      <div class="md2-xp"><div class="xpbar"><i style="width:${xpw}%"></i></div><small>${m.lv >= 100 ? 'Niveau maximum' : fmt(b - m.xp) + ' Exp. avant le niveau ' + (m.lv + 1)}</small></div>
    </div>
  </div>
  <div class="md2-facts">
    <div><span>Nature</span><b>${n[0]}</b><small>${n[1] !== n[2] ? `+${SHORT[n[1]]} · −${SHORT[n[2]]}` : 'neutre'}</small></div>
    <div><span>IV</span><b>${ivTag(m)}</b><small>${P.ivSum(m)} / 186</small></div>
    <div><span>Objet</span><b>${m.it ? UI.itemIcon(m.it, 'ii sm') + esc(m.it) : 'Aucun'}</b></div>
    <div><span>Amitié</span><b>${m.fr}</b><small>${m.ball ? esc(m.ball) : ''}</small></div>
    <div><span>Lien partenaire${S.partner === m.u ? ' · actif' : ''}</span><b>${heartsHTML(m)}</b><small>${Gm.hearts(m) >= 5 ? 'Lien au maximum' : `${fmt(m.pf || 0)} / ${fmt(Gm.heartNeed(m))} vers ${Gm.hearts(m) + 1} cœur${Gm.hearts(m) ? 's' : ''}`}</small></div>
    ${Gm.ribbons(m).length ? `<div class="wide"><span>Rubans</span><div class="md2-ribs">${Gm.ribbons(m).map(k => `<span class="md2-rib">${ribImg(k, 'ribi lg')}<small>${esc(Gm.RIB[k][0])}</small></span>`).join('')}</div></div>` : ''}
    <div class="wide"><span>Talent${m.ab === 'h' ? ' caché ★' : ''}</span><b>${esc(ab)}</b>${abd ? `<small>${esc(abd)}</small>` : ''}</div>
  </div>
  <div class="md2-sec"><h3>Statistiques <small>total de base ${tot}</small></h3><div class="md2-stats"><div class="sr hd"><span></span><span></span><b>Stat</b><em>Base</em><em>IV</em><em>EV</em></div>${stRows}</div></div>
  <div class="md2-sec"><h3>Capacités</h3><div class="md2-moves">${moves}</div></div>
  <div class="md2-act">
    ${evo.length ? `<button class="btn pri" data-ret="evo">Évoluer en ${esc(sp(evo[0].to).n)}</button>` : ''}
    <button class="btn" data-ret="moves">Capacités</button>
    <button class="btn" data-ret="item">${m.it ? 'Retirer l’objet' : 'Donner un objet'}</button>
    <button class="btn" data-ret="use">Utiliser un objet</button>
    <button class="btn" data-ret="nick">Surnom</button>
    <button class="btn ${m.lock ? 'on' : ''}" data-ret="lock" title="Un Pokémon verrouillé ne peut pas être sacrifié en fusion ni relâché">${m.lock ? '🔒 Déverrouiller' : '🔓 Verrouiller'}</button>
    ${where === 'team' ? `<button class="btn" data-ret="up">Mettre en tête</button><button class="btn" data-ret="tobox" ${S.team.length <= 1 ? 'disabled' : ''}>Envoyer au PC</button>` : `<button class="btn" data-ret="toteam">${S.team.length < 6 ? 'Ajouter à l’équipe' : 'Échanger avec un membre'}</button><button class="btn danger" data-ret="release" ${m.lock ? 'disabled title="Verrouillé"' : ''}>Relâcher</button>`}
  </div></div>`;
  const r = await UI.modal(html, { cls: 'wide' });
  if (!r) return;
  if (r === 'moves') await moveManager(m);
  if (r === 'item') { if (m.it) { Gm.add(m.it, 1); UI.toast(`${esc(m.it)} retourne dans le Sac.`); m.it = '' } else await giveItem(m) }
  if (r === 'use') await useItemOn(m);
  if (r === 'evo') await evolveFlow(m, evo[0].to);
  if (r === 'lock') { m.lock = m.lock ? 0 : 1; UI.toast(m.lock ? `${esc(monName(m))} est verrouillé 🔒` : `${esc(monName(m))} est déverrouillé`); Gm.save(); render(); return monDetail(u) }
  if (r === 'nick') { const v = await UI.modal(`<h3>Surnom</h3><input id="nickin" maxlength="12" value="${esc(m.nick || '')}" placeholder="${esc(s.n)}"><div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-act-nick="1">Valider</button></div>`, { cls: 'small', onClick: (e, close, w) => { if (e.target.dataset.actNick) close('=' + w.querySelector('#nickin').value) }, onOpen: w => setTimeout(() => w.querySelector('#nickin').focus(), 50) }); if (v && v[0] === '=') { m.nick = v.slice(1).trim() } }
  if (r === 'up') { S.team.splice(S.team.indexOf(m), 1); S.team.unshift(m) }
  if (r === 'tobox') { S.team.splice(S.team.indexOf(m), 1); Gm.pcAdd(m) }
  if (r === 'toteam') { const f = Gm.pcFind(m.u); if (S.team.length < 6) { S.pc.b[f[0]][f[1]] = null; S.team.push(m) } else { const o = await UI.pickMon('Échanger avec…'); if (o) { const ti = S.team.indexOf(o); S.pc.b[f[0]][f[1]] = o; S.team[ti] = m } } }
  if (r === 'release' && !m.lock) { if (await UI.confirm(`Relâcher ${esc(monName(m))} ? Cette action est définitive.`, 'Relâcher')) { Gm.pcRemove(m); if (m.it) Gm.add(m.it, 1); UI.toast(`${esc(monName(m))} a été relâché.`) } }
  Gm.save(); render();
}
async function moveManager(m) {
  const S = Gm.get(); const s = sp(m.s);
  const lvMoves = [...new Set(s.lv.filter(x => x[0] <= m.lv).map(x => x[1]))].filter(k => !m.m.some(y => y[0] === k));
  const tmMoves = S.tms.filter(k => P.canLearnTM(m.s, k) && !m.m.some(y => y[0] === k) && !lvMoves.includes(k));
  const row = (k, tag) => { const x = mv(k); return `<button class="mvrow" data-ret="${tag}:${k}" style="--tc:${TC[x.t]}"><b>${esc(x.n)}</b><span>${TL[x.t]} · ${x.c === 0 ? 'Statut' : x.c === 1 ? 'Physique' : 'Spécial'} · ${x.p || '—'} / ${x.a || '—'} · PP ${x.pp}</span></button>` };
  const html = `<h3>Capacités de ${esc(monName(m))}</h3><p class="mtxt">Actuelles :</p><div class="mvlist">${m.m.map((x, i) => `<div class="mvcur">${row(x[0], 'cur').replace('<button', '<div').replace('</button>', '</div>')}<span class="ord">${i > 0 ? `<button class="mini" data-ret="upm:${i}">↑</button>` : ''}${m.m.length > 1 ? `<button class="mini" data-ret="del:${i}">Oublier</button>` : ''}</span></div>`).join('')}</div>
    <p class="mtxt">Réapprendre (capacités par niveau) :</p><div class="mvlist">${lvMoves.length ? lvMoves.map(k => row(k, 'lv')).join('') : '<p class="mut">Aucune.</p>'}</div>
    <p class="mtxt">Vos CT compatibles :</p><div class="mvlist">${tmMoves.length ? tmMoves.map(k => row(k, 'tm')).join('') : '<p class="mut">Aucune CT compatible. Achetez-en à la Boutique.</p>'}</div>`;
  const r = await UI.modal(html, { cls: 'wide' }); if (!r) return;
  const [tag, val] = r.split(':');
  if (tag === 'upm') { const i = +val; [m.m[i - 1], m.m[i]] = [m.m[i], m.m[i - 1]]; return moveManager(m) }
  if (tag === 'del') { const x = m.m[+val]; if (x) { m.ppMem = m.ppMem || {}; m.ppMem[x[0]] = [x[1], x[2] || 0] } m.m.splice(+val, 1); await checkMoveForms(m); Gm.save(); return moveManager(m) }
  if (tag === 'lv' || tag === 'tm') { await learnOutside(m, val); Gm.save(); return moveManager(m) }
}
async function giveItem(m) {
  const S = Gm.get(); const list = Object.keys(S.items).filter(n => IT[n] && ['held', 'mega', 'evo'].includes(IT[n].cat) && S.items[n] > 0);
  if (!list.length) { UI.toast('Aucun objet à tenir dans le Sac.'); return }
  const r = await UI.modal(`<h3>Donner un objet à ${esc(monName(m))}</h3><div class="ilist">${list.map(n => `<button class="irow" data-ret="${esc(n)}">${UI.itemIcon(n)}<span><b>${esc(n)}</b><small>${esc(IT[n].desc)}</small></span><em>×${S.items[n]}</em></button>`).join('')}</div>`, { cls: 'wide' });
  if (!r) return; if (m.it) Gm.add(m.it, 1); m.it = r; Gm.add(r, -1); UI.toast(`${esc(monName(m))} tient ${esc(r)}.`);
}
async function useItemOn(m) {
  const S = Gm.get(); const cats = ['heal', 'status', 'revive', 'pp', 'vit', 'candy', 'evo', 'mint', 'ability', 'form', 'ppup', 'evberry', 'shinyfy'];
  const list = Object.keys(S.items).filter(n => IT[n] && cats.includes(IT[n].cat) && S.items[n] > 0);
  if (!list.length) { UI.toast('Aucun objet utilisable.'); return }
  const r = await UI.modal(`<h3>Utiliser sur ${esc(monName(m))}</h3><div class="ilist">${list.map(n => `<button class="irow" data-ret="${esc(n)}">${UI.itemIcon(n)}<span><b>${esc(n)}</b><small>${esc(IT[n].desc)}</small></span><em>×${S.items[n]}</em></button>`).join('')}</div>`, { cls: 'wide' });
  if (r) await applyItem(r, m);
}
// quantity picker with a text field, −/+ and Min / Max (used to buy and sell)
async function qtyDialog({ title, max, price, verb, icon }) {
  let v = 1;
  const r = await UI.modal(`<div class="qtyhead">${icon || ''}<h3>${title}</h3></div><p class="mtxt">Prix unitaire : ${fmt(price)} ₽ · maximum ${max}</p><div class="qtyrow"><button class="btn sm" data-q="min">Min</button><button class="btn sm" data-q="-1">−</button><input type="number" id="qtyin" min="1" max="${max}" value="1" inputmode="numeric"><button class="btn sm" data-q="1">+</button><button class="btn sm" data-q="max">Max</button></div><p class="qtytot">Total : <b id="qtytot">${fmt(price)} ₽</b></p><div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-ok="1">${verb}</button></div>`,
    { cls: 'small', onOpen: w => { const i = w.querySelector('#qtyin'), t = w.querySelector('#qtytot'); const set = x => { v = Math.max(1, Math.min(max, Math.round(+x) || 1)); if (+i.value !== v) i.value = v; t.textContent = fmt(price * v) + ' ₽' }; i.addEventListener('input', () => { if (i.value !== '') set(i.value) }); i.addEventListener('change', () => set(i.value)); i.focus(); i.select(); w._set = set },
      onClick: (ev, close, w) => { const d = ev.target.dataset; if (d.q) w._set(d.q === 'max' ? max : d.q === 'min' ? 1 : v + +d.q); if (d.ok) close(String(v)) } });
  return r ? +r : 0;
}
async function askQty(n, max) {
  let v = 1;
  const r = await UI.modal(`<h3>Combien de ${esc(n)} ?</h3><p class="mtxt">Vous pouvez en utiliser jusqu’à <b>${max}</b>.</p><div class="qtyrow"><button class="btn sm" data-q="-10">−10</button><button class="btn sm" data-q="-1">−1</button><input type="number" id="qtyin" min="1" max="${max}" value="1"><button class="btn sm" data-q="1">+1</button><button class="btn sm" data-q="10">+10</button><button class="btn sm" data-q="max">Max</button></div><input type="range" id="qtyr" min="1" max="${max}" value="1"><div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-ok="1">Utiliser</button></div>`,
    { cls: 'small', onOpen: w => { const i = w.querySelector('#qtyin'), rg = w.querySelector('#qtyr'); const set = x => { v = Math.max(1, Math.min(max, Math.round(+x) || 1)); i.value = v; rg.value = v }; i.addEventListener('input', () => set(i.value)); rg.addEventListener('input', () => set(rg.value)); w._set = set },
      onClick: (ev, close, w) => { const d = ev.target.dataset; if (d.q) w._set(d.q === 'max' ? max : v + +d.q); if (d.ok) close(String(v)) } });
  return r ? +r : 0;
}
async function hatchEgg(n) {
  const S = Gm.get(); const it = IT[n]; if (!it || !Gm.has(n)) return;
  Gm.add(n, -1); const m = Gm.hatch(it.egg); const where = Gm.addCaught(m); const s = sp(m.s);
  Gm.save();
  await UI.modal(`<div class="evo"><p class="mtxt">Oh ? L’${esc(n)} bouge…</p><div class="evostage"><div class="evo-a${m.sh ? ' eggsh' : ''}">${UI.itemIcon(n, 'big egg-i')}</div><div class="evo-b">${monIcon(m, 'big')}</div></div><p class="mtxt" id="hatchtxt">&nbsp;</p><div class="mbtns"><button class="btn pri" data-ret="1" id="evogo" disabled>…</button></div></div>`, { cls: 'evom', noClose: true, onOpen: w => { setTimeout(() => { w.querySelector('.evostage').classList.add('go'); w.querySelector('#hatchtxt').innerHTML = `${esc(s.n)}${m.sh ? ' ' + SHI + ' chromatique' : ''} est né ! <span class="chip">${RAR[s.rar][0]}</span> IV ${P.ivPct(m)} %<br><small>${where === 'team' ? 'Il rejoint votre équipe.' : 'Il est envoyé au PC.'}</small>`; const b = w.querySelector('#evogo'); b.disabled = false; b.textContent = 'Super !' }, 1600) } });
  render();
}
async function applyItem(n, m) {
  const S = Gm.get(); const it = IT[n]; const s = sp(m.s); const mh = P.maxHP(m); let used = false; let msg = '';
  switch (it.cat) {
    case 'form': { const ok = await useFormItem(n, m); render(); return ok }
    case 'ppup': {
      const r = await UI.modal(`<h3>${esc(n)} sur quelle capacité ?</h3><div class="ilist">${m.m.map((x, i) => { const M = mv(x[0]); const up = x[2] || 0; return `<button class="irow" data-ret="m${i}" ${up >= 3 ? 'disabled' : ''}><span><b>${esc(M.n)}</b><small>PP ${x[1]}/${P.ppMax(x)}${up ? ` · ${up}/3 PP Plus` : ''}${up >= 3 ? ' · maximum atteint' : ''}</small></span></button>` }).join('')}</div>`, { cls: 'small' });
      if (!r) return false; const x = m.m[+r.slice(1)]; const before = P.ppMax(x); x[2] = it.max ? 3 : Math.min(3, (x[2] || 0) + 1); const add = P.ppMax(x) - before; x[1] += add;
      used = true; msg = `Les PP max de ${mv(x[0]).n} passent à ${P.ppMax(x)} !`; break;
    }
    case 'shinyfy': {
      if (m.sh) { UI.toast(`${esc(monName(m))} est déjà chromatique.`, 'bad'); return false }
      m.sh = true; Gm.dexSet(m.s, 3 | 12); if (W.Sound) W.Sound.sfx('shiny');
      used = true; msg = `${monName(m)} brille de mille feux : il est maintenant chromatique !`; break;
    }
    case 'evberry': {
      const i = it.ev; if (!m.ev[i]) { UI.toast(`${esc(monName(m))} n’a aucun EV en ${P.STN[i]}.`, 'bad'); return false }
      const mh = P.maxHP(m); m.ev[i] = Math.max(0, m.ev[i] - 10); m.fr = Math.min(255, (m.fr || 0) + 10); if (i === 0) m.hp = Math.max(1, Math.min(P.maxHP(m), m.hp - (mh - P.maxHP(m))));
      used = true; msg = `${monName(m)} : EV en ${P.STN[i]} → ${m.ev[i]}. Il semble plus amical !`; break;
    }
    case 'heal': if (m.hp <= 0 || (m.hp >= mh && !(it.cure && m.st))) break; m.hp = Math.min(mh, m.hp + it.hp); if (it.cure) m.st = ''; used = true; msg = `${monName(m)} est soigné.`; break;
    case 'status': if (!m.st || m.hp <= 0) break; if (it.cure === 1 || it.cure === m.st || (it.cure === 'psn' && m.st === 'tox')) { m.st = ''; used = true; msg = `${monName(m)} va mieux.` } break;
    case 'revive': if (m.hp > 0) break; m.hp = Math.max(1, Math.floor(mh * it.rev)); m.st = ''; used = true; msg = `${monName(m)} est ranimé !`; break;
    case 'pp': m.m.forEach(x => x[1] = Math.min(P.ppMax(x), x[1] + it.pp)); used = true; msg = 'PP restaurés.'; break;
    case 'vit': { const tot = m.ev.reduce((a, b) => a + b, 0); if (m.ev[it.vit] >= 252 || tot >= 510) break; const add = Math.min(10, 252 - m.ev[it.vit], 510 - tot); m.ev[it.vit] += add; used = true; msg = `${P.STN[it.vit]} de ${monName(m)} augmente (+${add} EV).`; const nh = P.maxHP(m); if (it.vit === 0 && m.hp > 0) m.hp += nh - mh; break }
    case 'mint': if (m.nat === it.nat) break; m.nat = it.nat; used = true; msg = `La nature de ${monName(m)} agit maintenant comme ${P.NAT[it.nat][0]}.`; break;
    case 'ability': if (it.hidden) { if (!s.ha || m.ab === 'h') break; m.ab = 'h'; used = true; msg = `${monName(m)} a maintenant le talent ${s.ha}.` } else { if (s.ab.length < 2 && m.ab !== 'h') break; m.ab = m.ab === 'h' ? 0 : ((m.ab | 0) + 1) % s.ab.length; used = true; msg = `${monName(m)} a maintenant le talent ${P.abilityOf(m)}.` } break;
    case 'candy': {
      const cap = Gm.levelCap(); if (m.lv >= cap) { UI.toast(cap < 100 ? `${esc(monName(m))} est au niveau maximum actuel (${cap}). Progressez dans l’aventure pour le dépasser.` : `${esc(monName(m))} est déjà au niveau 100.`, 'bad'); return false }
      used = false; const lv0 = m.lv; const have = Gm.get().items[n] || 0;
      const maxQ = it.exp ? Math.min(have, Math.ceil((P.expFor(s.gr, cap) - m.xp) / it.exp)) : Math.min(have, cap - m.lv);
      let q = 1; if (maxQ > 1) { q = await askQty(n, maxQ); if (!q) return false }
      Gm.add(n, -q);
      const evs = P.addExp(m, Math.min(P.expFor(s.gr, cap) - m.xp, it.exp ? it.exp * q : (P.expFor(s.gr, Math.min(cap, m.lv + q)) - m.xp))); if (m.hp <= 0) m.hp = 0;
      UI.toast(m.lv > lv0 ? `${esc(monName(m))} monte au niveau ${m.lv} !${q > 1 ? ` (${q} ${esc(n)})` : ''}` : `${esc(monName(m))} gagne ${fmt(it.exp * q)} points d’Exp.`);
      for (const e of evs) for (const k of e.learn) await learnOutside(m, k);
      const ev = P.evoOptions(m, { night: Gm.isNight() }); if (ev.length) await evolveFlow(m, ev[0].to);
      Gm.save(); return true;
    }
    case 'evo': {
      const ev = P.evoOptions(m, { night: Gm.isNight(), item: n });
      if (!ev.length) break;
      if (it.coin) { const have = Gm.get().items[n] || 0; if (have < it.coin) { UI.toast(`Il faut ${it.coin} ${esc(n)} (vous en avez ${have}).`, 'bad'); return false } if (!(await evolveFlow(m, ev[0].to))) return false; Gm.add(n, -it.coin); Gm.save(); return true }
      Gm.add(n, -1); await evolveFlow(m, ev[0].to); Gm.save(); return true;
    }
  }
  if (used) { Gm.add(n, -1); UI.toast(esc(msg)); Gm.save(); return true }
  UI.toast('Ça n’aurait aucun effet.', 'bad'); return false;
}

// ---------- BAG
function renderBag() {
  const S = Gm.get();
  const cats = [['all', 'Tout'], ['ball', 'Balls'], ['heal', 'Soins'], ['held', 'Objets tenus'], ['evo', 'Évolution'], ['mega', 'Méga-Gemmes'], ['egg', 'Œufs'], ['vit', 'Boosts'], ['berry', 'Baies'], ['treasure', 'Trésors'], ['form', 'Formes'], ['key', 'Rares'], ['tm', 'CT']];
  const tab = view.bagTab;
  const grp = n => { const c = IT[n] ? IT[n].cat : ''; if (IT[n] && IT[n].berry) return 'berry'; if (c === 'shinyfy') return 'key'; if (c === 'egg') return 'egg'; if (c === 'ppup') return 'vit'; if (['heal', 'status', 'revive', 'pp'].includes(c)) return 'heal'; if (['vit', 'candy', 'mint', 'ability', 'battle', 'incense'].includes(c)) return 'vit'; return c };
  let names = Object.keys(S.items).filter(n => S.items[n] > 0 && IT[n]);
  if (tab !== 'all' && tab !== 'tm') names = names.filter(n => grp(n) === tab);
  names.sort((a, b) => a.localeCompare(b, 'fr'));
  let h = `<section class="hero"><p class="eyebrow">${names.length} objet${names.length > 1 ? 's' : ''}</p><h1>Sac</h1></section><div class="tabs2">${cats.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="bagtab" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (tab === 'tm') {
    h += `<div class="ilist">${S.tms.length ? S.tms.map(k => { const x = mv(k); return `<div class="irow">${UI.itemIcon('CT ' + k)}<span><b>CT ${esc(x.n)}</b><small>${TL[x.t]} · ${x.c === 0 ? 'Statut' : x.c === 1 ? 'Physique' : 'Spécial'} · ${x.p || '—'} / ${x.a || '—'} — ${esc(x.d || '')}</small></span></div>` }).join('') : '<p class="empty">Aucune CT. Les CT achetées sont permanentes : apprenez-les depuis « Gérer les capacités ».</p>'}</div>`;
    return h;
  }
  h += '<div class="ilist">';
  for (const n of names) {
    const it = IT[n]; let act = '';
    if (['heal', 'status', 'revive', 'pp', 'vit', 'candy', 'evo', 'mint', 'ability', 'form', 'ppup', 'evberry', 'shinyfy'].includes(it.cat)) act += `<button class="btn sm" data-act="iuse" data-n="${esc(n)}">Utiliser</button>`;
    if (['held', 'mega', 'evo'].includes(it.cat)) act += `<button class="btn sm" data-act="igive" data-n="${esc(n)}">Donner</button>`;
    if (it.cat === 'egg') act += `<button class="btn sm pri" data-act="ihatch" data-n="${esc(n)}">Faire éclore</button>`;
    if (it.cat === 'incense') act += `<button class="btn sm" data-act="iinc" data-n="${esc(n)}">Allumer</button>`;
    if (n === 'Multi Exp') act += `<button class="btn sm" data-act="share">${S.flags.share ? 'Désactiver' : 'Activer'}</button>`;
    h += `<div class="irow">${UI.itemIcon(n)}<span><b>${esc(n)}</b><small>${esc(it.desc)}${n === 'Multi Exp' ? (S.flags.share ? ' (activé)' : ' (désactivé)') : ''}</small></span><em>×${S.items[n]}</em><span class="iact">${act}</span></div>`;
  }
  h += names.length ? '</div>' : '<p class="empty">Rien ici pour l’instant.</p></div>';
  return h;
}

// ---------- SHOP
function shopItems(tab) {
  const S = Gm.get(); const b = Gm.badges();
  const by = c => Object.values(IT).filter(i => (Array.isArray(c) ? c.includes(i.cat) : i.cat === c) && i.price > 0 && !i.noShop);
  switch (tab) {
    case 'ball': return by('ball');
    case 'heal': return by(['heal', 'status', 'revive', 'pp', 'battle']).filter(i => !i.berry);
    case 'held': return by('held').filter(i => !i.berry);
    case 'berry': return Object.values(IT).filter(i => i.berry && i.price > 0);
    case 'evo': return by('evo');
    case 'boost': return by(['vit', 'candy', 'mint', 'ability', 'incense', 'ppup']);
    case 'mega': return by('mega');
    case 'form': return by('form');
  }
  return [];
}
function lockedItem(i) { const S = Gm.get(); if (i.league && !S.champ) return 'Après la Ligue'; if (i.ring && !S.flags.ring) return 'Méga-Anneau requis'; if (i.b && Gm.badges() < i.b) return `${i.b} badge${i.b > 1 ? 's' : ''} requis`; return '' }
// ---------- Special shop: 3 chromatiques -> 1 chromatique au hasard (hors légendaires)
function specialShopHTML() {
  const sel = view.shx || (view.shx = []); const all = [...Gm.get().team, ...Gm.pcAll()].filter(m => m.sh); const ok = all.filter(m => !m.lock);
  const chosen = sel.map(u => findMon(u)[0]).filter(Boolean);
  return `<section class="blk special"><h2>${SHI} Échange chromatique</h2><p class="sub">Donnez <b>${Gm.SHT_N} Pokémon chromatiques</b> et recevez <b>1 chromatique au hasard</b> parmi toutes les espèces, formes régionales comprises (${Gm.shTradePool().length} possibles). La rareté est tirée d’abord : <b>Épique 8 %</b>, Rare 17 %, Peu commun 30 %, Commun 45 %. Les légendaires et fabuleux ne sont jamais tirés. Les Pokémon verrouillés 🔒 ne peuvent pas être donnés.</p>
  <div class="shx-slots">${Array.from({ length: Gm.SHT_N }, (_, i) => i).map(i => { const m = chosen[i]; return m ? `<button class="shx-slot on" data-act="shxdel" data-i="${i}" title="Retirer">${monIcon(m, 'tri')}<b>${esc(monName(m))}</b><small>N.${m.lv} · IV ${ivP(m)} %</small></button>` : `<button class="shx-slot" data-act="shxadd" ${ok.length > chosen.length ? '' : 'disabled'}><span class="plus">+</span><small>Choisir un chromatique</small></button>` }).join('<span class="shx-op">+</span>')}<span class="shx-op">=</span><div class="shx-slot res"><span class="plus">?</span><small>Chromatique mystère</small></div></div>
  <div class="row-btns"><button class="btn pri xl" data-act="shxgo" ${chosen.length === Gm.SHT_N ? '' : 'disabled'}>Échanger</button>${chosen.length ? '<button class="btn" data-act="shxclr">Vider</button>' : ''}</div>
  <p class="mut">${ok.length} chromatique${ok.length > 1 ? 's' : ''} disponible${ok.length > 1 ? 's' : ''}${all.length > ok.length ? ` · ${all.length - ok.length} verrouillé${all.length - ok.length > 1 ? 's' : ''}` : ''}.</p></section>`;
}
async function shxAdd() {
  const S = Gm.get(); view.shx = view.shx || []; if (view.shx.length >= Gm.SHT_N) return; const list = [...S.team, ...Gm.pcAll()].filter(m => m.sh && !m.lock && !view.shx.includes(m.u));
  if (!list.length) { UI.toast('Aucun autre chromatique disponible.', 'bad'); return }
  const m = await UI.pickMon('Choisir un chromatique à donner', null, list.slice(0, 200)); if (!m) return;
  if (S.team.includes(m) && S.team.filter(x => !view.shx.includes(x.u) && x !== m).length < 1) { UI.toast('Gardez au moins un Pokémon dans votre équipe.', 'bad'); return }
  view.shx.push(m.u); render();
}
async function shxGo() {
  const ms = (view.shx || []).map(u => findMon(u)[0]).filter(Boolean); if (ms.length !== Gm.SHT_N) return;
  const rb = ms.filter(m => Gm.ribbons(m).some(k => !['perfect', 'lv100'].includes(k))).length;
  if (!(await UI.confirm(`Donner ${ms.map(m => '<b>' + esc(monName(m)) + '</b>').join(', ')} contre 1 chromatique au hasard ? Ils disparaîtront définitivement.${rb ? `<br><br>⚠ ${rb} d’entre eux ont des rubans.` : ''}`, 'Échanger'))) return;
  const r = Gm.shTrade(ms.map(m => m.u)); if (r.err) { UI.toast(r.err, 'bad'); return }
  view.shx = []; const m = r.mon; await shxRoulette(r);
  if (W.Sound) W.Sound.sfx('shiny');
  await UI.modal(`<div class="evo"><p class="eyebrow">Échange chromatique</p><div class="giftart shx">${monIcon(m, 'big')}<span class="sparkle"></span></div><p class="mtxt">Vous recevez <b>${esc(monName(m))}</b> ${SHI} N.${m.lv} !</p><p class="mut">${RAR[sp(m.s).rar][0]} · IV ${ivP(m)} % · envoyé ${r.where === 'team' ? 'dans votre équipe' : 'au PC'}.</p><div class="mbtns"><button class="btn pri" data-ret="1">Génial !</button></div></div>`, { cls: 'evom', onOpen: w => { const h = w.querySelector('.giftart'); if (h && W.playSparkle) setTimeout(() => W.playSparkle(h, 1.3), 150) } });
  render();
}
// roulette: the rarity spins first, then the Pokémon of that rarity
async function shxRoulette(r) {
  const tiers = [['commun', 'Commun'], ['peucommun', 'Peu commun'], ['rare', 'Rare'], ['epique', 'Épique']];
  const pool = Gm.shTradePool(); const byT = {}; for (const [k] of tiers) byT[k] = pool.filter(id => sp(id).rar === k);
  let skip = false;
  await UI.modal(`<div class="shxr"><p class="eyebrow">Échange chromatique</p><h3>Tirage en cours…</h3><div class="shxr-lab">Rareté</div><div class="shxr-rar"><span id="shxrr" class="shxr-t">?</span></div><div class="shxr-lab">Pokémon</div><div class="shxr-mon"><div id="shxrm" class="shxr-strip"></div><i class="shxr-cur"></i></div><div class="mbtns"><button class="btn" id="shxskip">Passer</button><button class="btn pri" data-ret="1" id="shxok" disabled>…</button></div></div>`, { cls: 'small', noClose: true, onOpen: async (w) => {
    w.querySelector('#shxskip').onclick = () => { skip = true };
    const rr = w.querySelector('#shxrr'); const strip = w.querySelector('#shxrm');
    const tick = () => { if (W.Sound) try { W.Sound.sfx('select') } catch (e) { } };
    // 1. rarity reel
    const fin = tiers.findIndex(t => t[0] === r.tier); const steps = 24 + fin + (tiers.length - (24 % tiers.length)) % tiers.length; let d = 55;
    for (let i = 0; i <= steps && !skip; i++) { const t = tiers[i % tiers.length]; rr.textContent = t[1]; rr.className = 'shxr-t ' + RAR[t[0]][1]; tick(); await wait(d); if (i > steps - 8) d *= 1.28 }
    rr.textContent = RAR[r.tier][0]; rr.className = 'shxr-t ' + RAR[r.tier][1] + ' done';
    if (!skip) await wait(450);
    // 2. Pokémon reel: a strip of icons scrolling, slowing down on the result
    const L = byT[r.tier].length ? byT[r.tier] : pool; const n = 34; const ids = Array.from({ length: n }, () => L[Math.floor(Math.random() * L.length)]); ids[n - 3] = r.mon.s;
    strip.innerHTML = ids.map((id, i) => `<span class="shxr-c">${i === n - 3 ? monIcon(r.mon, 'tri') : spr(sp(id).ix, 1, 'tri')}</span>`).join('');
    const cw = 64, target = (n - 3) * cw - (strip.parentElement.clientWidth / 2 - cw / 2);
    if (skip) { strip.style.transform = `translateX(${-target}px)` } else {
      strip.style.transition = 'transform 3.2s cubic-bezier(.12,.75,.15,1)'; void strip.offsetWidth; strip.style.transform = `translateX(${-target}px)`;
      for (let t = 0; t < 32 && !skip; t++) await wait(100);
      if (skip) { strip.style.transition = 'none'; strip.style.transform = `translateX(${-target}px)` }
    }
    strip.children[n - 3].classList.add('win'); w.querySelector('#shxskip').hidden = true; const ok = w.querySelector('#shxok'); ok.disabled = false; ok.textContent = 'Voir mon chromatique';
  } });
}
// resale: half the price, berries only 50 ₽
const sellPrice = n => IT[n] && IT[n].berry ? 50 : Math.floor(IT[n].price / 2);
const canSell = n => !!IT[n] && IT[n].price > 0 && IT[n].cat !== 'key' && IT[n].cat !== 'candy'; // candies (Super Bonbon, Bonbons Exp.) cannot be sold
function renderShop() {
  const S = Gm.get(); const tab = view.shopTab;
  const tabs = [['ball', 'Balls'], ['heal', 'Soins'], ['held', 'Objets tenus'], ['evo', 'Évolution'], ['boost', 'Boosts & Encens'], ['mega', 'Méga-Gemmes'], ['berry', 'Baies'], ['form', 'Formes'], ['tm', 'CT'], ['special', '✦ Spécial'], ['sell', 'Vendre']];
  let h = `<section class="hero"><p class="eyebrow">Solde : ${fmt(S.money)} ₽</p><h1>Boutique</h1><p class="sub">Les articles se débloquent avec les badges.</p></section><div class="tabs2">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="shoptab" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (tab === 'special') return h + specialShopHTML();
  if (tab === 'tm') {
    const nq = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-’'\s]/g, ''); const q = nq(view.tmq || ''), tt = view.tmt || '';
    const list = P.TMS.filter(k => { const x = mv(k); return (!q || nq(x.n).includes(q) || nq(k).includes(q)) && (!tt || x.t === tt) });
    h += `<div class="filters"><input id="tmq" type="search" placeholder="Rechercher une capacité" value="${esc(view.tmq || '')}"><select id="tmt"><option value="">Tous types</option>${P.TYPES.map(t => `<option value="${t}" ${tt === t ? 'selected' : ''}>${TL[t]}</option>`).join('')}</select></div><p class="mut">${list.length} CT${list.length > 1 ? 's' : ''} (${P.TMS.filter(k => S.tms.includes(k)).length} / ${P.TMS.length} possédées). Une CT achetée est permanente et peut être apprise par tous les Pokémon compatibles.</p><div class="ilist">`;
    for (const k of list) {
      const x = mv(k); const own = S.tms.includes(k); const need = P.tmBadge(k); const lock = Gm.badges() < need; const pr = P.tmPrice(k);
      h += `<div class="irow ${lock ? 'lock' : ''}">${UI.itemIcon('CT ' + k)}<span><b>CT ${esc(x.n)}</b><small>${TL[x.t]} · ${x.c === 0 ? 'Statut' : x.c === 1 ? 'Physique' : 'Spécial'} · Puiss. ${x.p || '—'} · Préc. ${x.a || '—'} — ${esc(x.d || '')}</small></span><em>${fmt(pr)} ₽</em><span class="iact">${own ? '<span class="chip">Possédée</span>' : lock ? `<span class="chip">${need} badges</span>` : `<button class="btn sm pri" data-act="buytm" data-k="${k}" ${S.money < pr ? 'disabled' : ''}>Acheter</button>`}</span></div>`;
    }
    h += '</div>' + (list.length > 200 ? `<p class="mut">${list.length - 200} autres : affinez la recherche.</p>` : '');
    return h;
  }
  const nrm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-’'\s]/g, ''); const sq = nrm((view.shopq || '').trim()); const sMatch = (n, d) => !sq || nrm(n).includes(sq) || nrm(d).includes(sq);
  h += `<div class="filters"><input id="shopq" type="search" placeholder="Rechercher un objet" value="${esc(view.shopq || '')}"></div>`;
  if (tab === 'sell') {
    const names = Object.keys(S.items).filter(n => S.items[n] > 0 && canSell(n) && sMatch(n, IT[n].desc)).sort((a, b) => a.localeCompare(b, 'fr'));
    h += `<div class="ilist">${names.map(n => `<div class="irow">${UI.itemIcon(n)}<span><b>${esc(n)}</b><small>Prix de revente : ${fmt(sellPrice(n))} ₽</small></span><em>×${S.items[n]}</em><span class="iact"><button class="btn sm" data-act="sell" data-n="${esc(n)}">Vendre</button></span></div>`).join('') || '<p class="empty">Rien à vendre.</p>'}</div>`;
    return h;
  }
  h += '<div class="ilist">'; const shown = shopItems(tab).filter(i => sMatch(i.n, i.desc)); if (!shown.length) h += '<p class="empty">Aucun objet ne correspond.</p>';
  for (const i of shown) {
    const lock = lockedItem(i); const q = S.items[i.n] || 0;
    h += `<div class="irow ${lock ? 'lock' : ''}">${UI.itemIcon(i.n)}<span><b>${esc(i.n)}</b><small>${esc(i.desc)}</small></span><em>${fmt(i.price)} ₽${q ? `<br><small>possédé ×${q}</small>` : ''}</em><span class="iact">${lock ? `<span class="chip">${lock}</span>` : `<button class="btn sm pri" data-act="buy" data-n="${esc(i.n)}" ${S.money < i.price ? 'disabled' : ''}>Acheter</button>`}</span></div>`;
  }
  return h + '</div>';
}

// ---------- DEX
function dexList() {
  const S = Gm.get(); const f = view.dexF;
  let ids = P.ALL_IDS;
  if (f.q) { const q = f.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); ids = ids.filter(id => { const s = sp(id); return (Gm.seen(id) && s.n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)) || String(s.dn) === q.replace('#', '') }) }
  if (f.t) ids = ids.filter(id => Gm.seen(id) && sp(id).t.includes(f.t));
  if (f.z) ids = ids.filter(id => Gm.zone(+f.z).sp.includes(id));
  const cgf = view.dexMode === 'shiny' ? Gm.shinyCaught : Gm.caught;
  if (f.s === 'caught') ids = ids.filter(id => cgf(id)); else if (f.s === 'missing') ids = ids.filter(id => !cgf(id)); else if (f.s === 'seen') ids = ids.filter(id => Gm.seen(id) && !Gm.caught(id)); else if (f.s === 'shiny') ids = ids.filter(id => Gm.shinyCaught(id));
  else if (['legendaire', 'epique'].includes(f.s)) ids = ids.filter(id => sp(id).rar === f.s);
  return ids;
}
function renderDex() {
  const dc = Gm.dexCount(); const f = view.dexF; const ids = dexList(); const shown = ids.slice(0, 150 * view.dexPage); const shm = view.dexMode === 'shiny';
  const shB = P.ALL_IDS.filter(id => id < 10000 && Gm.shinyCaught(id)).length;
  const tabs = `<div class="seg dextabs"><button class="${shm ? '' : 'on'}" data-act="dexmode" data-v="normal">Normal</button><button class="${shm ? 'on' : ''}" data-act="dexmode" data-v="shiny">${SHI} Chromatique</button></div>`;
  let h = shm
    ? `<section class="hero"><p class="eyebrow">${dc.sh} chromatiques capturés</p><h1>Pokédex chromatique</h1><div class="dexbar sh"><i style="width:${dc.sh / dc.tot * 100}%"></i></div><p class="sub">${shB}/1025 espèces en chromatique · ${dc.sh}/${dc.tot} avec les formes régionales</p>${tabs}${dexShRewards()}</section>`
    : `<section class="hero"><p class="eyebrow">${dc.s} vus · ${dc.c} capturés · ${dc.sh} chromatiques</p><h1>Pokédex</h1><div class="dexbar"><i style="width:${dc.c / dc.tot * 100}%"></i></div><p class="sub">${dc.cb}/1025 espèces · ${dc.c}/${dc.tot} avec les formes régionales</p>${tabs}${dexRewards()}</section>`;
  h += `<div class="filters"><input id="dq" type="search" placeholder="Nom ou numéro" value="${esc(f.q)}"><select id="dt"><option value="">Tous types</option>${P.TYPES.map(t => `<option value="${t}" ${f.t === t ? 'selected' : ''}>${TL[t]}</option>`).join('')}</select><button class="btn sm" id="dxzm" type="button" title="Espèces de votre zone actuelle que vous n’avez pas encore capturées">Manquants dans ma zone</button><select id="dz"><option value="">Toutes zones</option>${G.ZONES.map(z => `<option value="${z.id}" ${+f.z === z.id ? 'selected' : ''}>${z.id}. ${esc(z.n)}</option>`).join('')}</select><select id="ds"><option value="">Tous</option><option value="caught" ${f.s === 'caught' ? 'selected' : ''}>Capturés</option><option value="seen" ${f.s === 'seen' ? 'selected' : ''}>Vus seulement</option><option value="missing" ${f.s === 'missing' ? 'selected' : ''}>Manquants</option><option value="shiny" ${f.s === 'shiny' ? 'selected' : ''}>Chromatiques</option><option value="epique" ${f.s === 'epique' ? 'selected' : ''}>Épiques</option><option value="legendaire" ${f.s === 'legendaire' ? 'selected' : ''}>Légendaires</option></select></div><p class="mut">${ids.length} résultat${ids.length > 1 ? 's' : ''}</p><div class="dexgrid">`;
  for (const id of shown) {
    const s = sp(id); const seen = Gm.seen(id), sh = Gm.shinyCaught(id), cg = shm ? sh : Gm.caught(id);
    const vis = cg ? 'cg' : (shm ? (Gm.get().dex[id] || 0) & 8 : seen) ? 'gray' : 'blk';
    h += `<button class="dxc ${seen ? '' : 'unseen'} ${cg ? 'cg' : ''} v-${vis} ${RAR[s.rar][1]}" data-act="dexd" data-id="${id}"><span class="dn">${String(s.dn).padStart(4, '0')}</span>${spr(s.ix, shm ? seen : 0)}<b>${seen ? esc(s.n) : '???'}</b>${cg ? '<i class="cgm">●</i>' : ''}${shm && sh ? '<i class="shm">' + SHI + '</i>' : ''}</button>`;
    // the Halloween palette comes right after the species and its forms (Pikachu, Pikachu Casquette, Pikachu Halloween…)
    const nx = shown[shown.indexOf(id) + 1]; if (Gm.HW_IDS.includes(s.dn) && (!nx || sp(nx).dn !== s.dn) && (!f.s || ['caught', 'seen', 'missing', 'shiny', 'epique'].includes(f.s))) h += dexHwCard(s.dn, shm, f.s);
  }
  h += '</div>' + (ids.length > shown.length ? `<button class="btn more" data-act="dexmore">Afficher plus (${ids.length - shown.length})</button>` : '');
  return h;
}
function hwIcon(id, sh, cls) { const u = (/big/.test(cls) && Gm.hwURL(id, sh)) || (W.HWI && W.HWI[id] && W.HWI[id][sh ? 's' : 'n']) || Gm.hwURL(id, sh); return u ? `<img class="${cls} hwspr" src="${u}" alt="" loading="lazy">` : spr(sp(id).ix, sh, cls) }
function dexHwCard(id, shm, fs) {
  const b = Gm.hwDex(id), seen = b & 1, cg = shm ? b & 4 : b & 2; const s = sp(id);
  if (fs === 'caught' && !(b & 2)) return ''; if (fs === 'seen' && (!(b & 1) || (b & 2))) return ''; if (fs === 'missing' && (b & 2)) return ''; if (fs === 'shiny' && !(b & 4)) return '';
  return `<button title="Rareté : Événement (palette Halloween)" class="dxc hwc ${seen ? '' : 'unseen'} ${cg ? 'cg' : ''} ${shm && !(b & 4) ? 'shmiss' : ''} r-ev" data-act="dexhw" data-id="${id}"><span class="dn">${String(s.dn).padStart(4, '0')}</span>${hwIcon(id, shm && seen, 'spr')}<b>${seen ? esc(s.n) + ' Halloween' : '???'}</b><small class="evt" title="Rareté : Événement">☾</small>${cg ? '<i class="cgm">●</i>' : ''}${shm && (b & 4) ? '<i class="shm">' + SHI + '</i>' : ''}</button>`;
}
async function dexHwDetail(id) {
  const s = sp(id); const b = Gm.hwDex(id); const on = Gm.hwSeason(); const wild = G.ZONES.filter(z => z.sp.includes(id));
  await UI.modal(`<div class="mond"><div class="mhead">${hwIcon(id, 0, 'big' + (b & 1 ? '' : ' unseen'))}${b & 4 ? hwIcon(id, 1, 'big') : ''}<div><p class="eyebrow">N°${String(s.dn).padStart(4, '0')} · <span class="hwtag">☾ Palette Halloween</span></p><h2>${b & 1 ? esc(s.n) + ' Halloween' : '???'}</h2><p class="sub">Rareté : Événement · ${b & 2 ? 'capturé' : b & 1 ? 'vu' : 'pas encore rencontré'}${b & 4 ? ' · chromatique capturé ' + SHI : ''}</p></div></div>
  <p class="mtxt">Événement Halloween du 20 octobre au 15 novembre${on ? ' (en cours !)' : ''}. ${wild.length ? `Pendant l’événement, ${esc(s.n)} apparaît 1 fois sur 100 dans ${wild.map(z => esc(z.n)).join(', ')}, et 1 fois sur 10 avec sa palette Halloween.` : `S’obtient en faisant évoluer un Pokémon de sa famille qui a la palette Halloween (elle est conservée).`} Le taux de chromatique reste le taux normal.</p></div>`, { cls: 'wide' });
}
function bindDex() {
  const on = (id, k) => { const el = $('#' + id); if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { view.dexF[k] = el.value; view.dexPage = 1; const pos = el.selectionStart; render(); const n = $('#' + id); if (n) { n.focus(); if (n.setSelectionRange && pos != null) try { n.setSelectionRange(pos, pos) } catch (e) { } } }) };
  on('dq', 'q'); on('dt', 't'); on('dz', 'z'); on('ds', 's');
  const zb = document.getElementById('dxzm'); if (zb) zb.onclick = () => { const S = Gm.get(); view.dexF.z = String(S.cur || 1); view.dexF.s = 'missing'; view.dexPage = 1; render() };
}
function evoText(e) {
  if (e.k === 'lv') return 'Niveau ' + e.lv + (e.tod === 'n' ? ', la nuit' : e.tod === 'd' ? ', le jour' : '');
  if (e.k === 'fr') return 'Amitié élevée' + (e.tod === 'n' ? ', la nuit' : e.tod === 'd' ? ', le jour' : '') + (e.to === 700 ? ' + capacité Fée' : '');
  if (e.k === 'it') return e.it;
  return '?';
}
async function dexDetail(id) {
  const s = sp(id); const seen = Gm.seen(id); const cg = Gm.caught(id); const shs = (Gm.get().dex[id] || 0) & 12;
  if (!seen) { await UI.modal(`<div class="mond"><div class="mhead">${spr(s.ix, 0, 'big unseen')}<div><p class="eyebrow">N°${String(s.dn).padStart(4, '0')}</p><h2>???</h2><p class="sub">Pas encore rencontré.${s.zone ? '' : ''}</p><p class="sub">Rareté : ${RAR[s.rar][0]}</p></div></div></div>`, { cls: 'wide' }); return }
  const zones = G.ZONES.filter(z => z.sp.includes(id)).map(z => `<button class="chip link" data-ret="z${z.id}">${z.id}. ${esc(z.n)} <small>N.${z.lv[0]}–${z.lv[1]}</small></button>`).join(' ');
  const when = s.tod === 'n' ? '☾ la nuit seulement' : s.tod === 'd' ? '☀ le jour seulement' : 'le jour et la nuit';
  const tms = s.tm.map(k => mv(k)).filter(Boolean).sort((a, b) => a.n.localeCompare(b.n, 'fr'));
  const evFrom = s.from && sp(s.from) ? (() => { const e = (G.EVO[s.from] || []).find(x => x.to === id); return `<div class="evline">${spr(sp(s.from).ix, 0, 'tri')}<span>Évolue de <b>${esc(sp(s.from).n)}</b>${e ? ' · ' + esc(evoText(e)) : ''}</span></div>` })() : '';
  const evTo = (G.EVO[id] || []).filter(e => sp(e.to)).map(e => `<div class="evline">${spr(sp(e.to).ix, 0, 'tri')}<span>Évolue en <b>${Gm.seen(e.to) ? esc(sp(e.to).n) : '???'}</b> · ${esc(evoText(e))}</span></div>`).join('');
  const megas = (P.MEGA_BY_BASE[id] || []).map(m => `<div class="evline">${spr(m.ix, 0, 'tri')}<span><b>${esc(m.n)}</b> · ${m.move ? 'connaître ' + esc(mv(m.move).n) : 'tenir ' + esc(m.stone)} · ${m.t.map(t => TL[t]).join('/')} · ${esc(m.a)}</span></div>`).join('');
  const bars = P.STN.map((n, i) => `<tr><th>${n}</th><td class="bar"><i style="width:${Math.min(100, s.bs[i] / 2.3)}%;--bc:${s.bs[i] >= 100 ? 'var(--ok)' : s.bs[i] >= 70 ? 'var(--acc)' : 'var(--warn)'}"></i></td><td>${s.bs[i]}</td></tr>`).join('') + `<tr><th>Total</th><td></td><td><b>${s.bst}</b></td></tr>`;
  const lvl = s.lv.map(([l, k]) => { const x = mv(k); return x ? `<div class="lvm" style="--tc:${TC[x.t]}"><em>N.${l}</em><b>${esc(x.n)}</b><span>${TL[x.t]} · ${x.p || '—'}</span></div>` : '' }).join('');
  const shv = view.tab === 'dex' && view.dexMode === 'shiny' ? 1 : 0; await preloadBig([id], 0); await preloadBig([id], 1);
  const html = `<div class="mond"><div class="mhead dexhero" style="--t1:${TC[s.t[0]]};--t2:${TC[s.t[1] || s.t[0]]}"><div class="dxart"><img class="dxa" src="${bigSprURL(id, shv)}" data-sh="${shv}" alt=""><button class="dxsh ${shv ? 'on' : ''}" type="button" data-dxsh title="Voir en ${shv ? 'normal' : 'chromatique'}">${SHI}</button></div><div><p class="eyebrow">N°${String(s.dn).padStart(4, '0')} · ${RAR[s.rar][0]}${s.tod ? (s.tod === 'n' ? ' · la nuit' : ' · le jour') : ''}</p><h2>${esc(s.n)}</h2><div>${s.t.map(t => typeChip(t)).join('')}</div><p class="sub">${cg ? 'Capturé' : 'Vu'}${Gm.shinyCaught(id) ? ' · ' + SHI + ' chromatique capturé' : ''} · Taux de capture ${s.cr}</p><p class="sub">Talents : ${s.ab.map(esc).join(', ')}${s.ha ? ` · caché : ${esc(s.ha)}` : ''}</p></div></div>
    ${(() => { const n = Gm.dexN(id); return `<div class="dexcnt"><div><b>${fmt(n[0])}</b><small>fois vu</small></div><div><b>${fmt(n[1])}</b><small>capturé${n[1] > 1 ? 's' : ''}</small></div><div class="sh"><b>${fmt(n[2])}</b><small>chromatique${n[2] > 1 ? 's' : ''} vu${n[2] > 1 ? 's' : ''}</small></div><div class="sh"><b>${fmt(n[3])}</b><small>chromatique${n[3] > 1 ? 's' : ''} capturé${n[3] > 1 ? 's' : ''}</small></div></div>` })()}
    <h3>Où le trouver</h3><p class="dxwhere"><span class="rarb ${RAR[s.rar][1]}">${RAR[s.rar][0]}</span> Apparaît ${when}${zones ? '' : ' · uniquement par évolution, œuf ou échange'}</p><div class="zl">${zones}</div>
    ${evFrom || evTo || megas ? `<h3>Évolutions</h3>${evFrom}${evTo}${megas}` : ''}
    <h3>Stats de base</h3><table class="stt base"><tbody>${bars}</tbody></table>
    <h3>Capacités par niveau</h3><div class="lvms">${lvl || '<span class="mut">Aucune</span>'}</div>${s.rar === 'legendaire' && Gm.sigMove(id) ? `<p class="mut keep">Attaque signature (connue dès la rencontre à l’état sauvage) : <b>${esc(mv(Gm.sigMove(id)).n)}</b></p>` : ''}<details class="dxct"><summary>${tms.length} CT compatibles</summary><div class="lvms">${tms.map(x => `<div class="lvm" style="--tc:${TC[x.t]}"><em>CT</em><b>${esc(x.n)}</b><span>${TL[x.t]} · ${x.p || '—'}</span></div>`).join('')}</div></details></div>`;
  const r = await UI.modal(html, { cls: 'wide dexm', onClick: (e, close, w) => { const b = e.target.closest('[data-dxsh]'); if (!b) return; const im = w.querySelector('.dxa'); const sh = im.dataset.sh === '1' ? 0 : 1; im.dataset.sh = sh; im.src = bigSprURL(id, sh); b.classList.toggle('on', !!sh); b.title = 'Voir en ' + (sh ? 'normal' : 'chromatique'); if (sh && W.playSparkle) W.playSparkle(w.querySelector('.dxart'), 1.1) } });
  if (r && r[0] === 'z') { const zid = +r.slice(1); if (Gm.zoneUnlocked(zid)) UI.go('zone', zid); else UI.toast('Cette zone est encore verrouillée.') }
}

// ---------- MORE
// ---------- daily rewards calendar
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function renderDaily() {
  const t = Gm.dailyState(); const mo = MOIS[+t.ym.slice(5) - 1];
  const lab = r => [r.money ? fmt(r.money) + ' ₽' : '', r.it ? (r.it[1] > 1 ? `${r.it[0]} ×${r.it[1]}` : r.it[0]) : '', r.it2 ? `${r.it2[0]} ×${r.it2[1]}` : ''].filter(Boolean).join(' + ');
  const ico = r => r.it ? UI.itemIcon(r.it[0], 'ii') : '<span class="dmoney">₽</span>';
  let h = `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">${mo} ${t.ym.slice(0, 4)}</p><h1>Récompense du jour</h1><p class="sub">Un petit cadeau chaque jour du mois. Un jour manqué est perdu, le calendrier repart le 1er du mois.</p></section><div class="dgrid">`;
  for (let d = 1; d <= t.n; d++) { const r = Gm.DRW[d]; const got = t.got.includes(d), today = d === t.d, past = d < t.d;
    h += `<div class="dday ${got ? 'got' : today ? 'today' : past ? 'miss' : ''}"><span class="dn">${d}</span>${ico(r)}<small>${esc(lab(r))}</small>${got ? '<i class="dck">✓</i>' : today ? '<button class="btn sm pri" data-act="dailygo">Récupérer</button>' : ''}</div>` }
  return h + '</div>';
}
// ---------- Mystery gifts (each code works once per save)
function renderGift() {
  const S = Gm.get(); const got = Object.keys(S.gifts || {});
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Codes cadeaux</p><h1>Cadeaux mystère</h1><p class="sub">Entrez un code pour recevoir un cadeau. Chaque code ne fonctionne qu’une seule fois.</p></section>
  <section class="blk giftbox"><div class="giftrow"><input id="giftcode" type="text" maxlength="600" placeholder="Code cadeau" autocomplete="off" spellcheck="false"><button class="btn pri" data-act="giftgo">Recevoir</button></div></section>
  ${got.length ? `<section class="blk"><h2>Cadeaux reçus</h2><div class="ilist">${got.map(k => { const gi = (S.giftInfo || {})[k]; const g = Gm.GIFTS[k] || (gi ? { label: gi.l, mon: gi.s } : null); const ix = g && g.mon ? (G.FORMS[g.mon] ? G.FORMS[g.mon].ix : sp(g.mon) && sp(g.mon).ix) : null; return `<div class="irow">${ix != null ? spr(ix, 0, 'tri') : ''}<span><b>${esc(g ? g.label : k)}</b><small>${k.startsWith('S:') ? 'Reçu le' : 'Code ' + esc(k) + ' ·'} ${new Date(S.gifts[k]).toLocaleDateString('fr-FR')}</small></span></div>` }).join('')}</div></section>` : ''}`;
}
async function claimGift() {
  const el = $('#giftcode'); const code = (el ? el.value : '').trim().replace(/\s+/g, ''); if (!code) return;
  const r = Gm.giftClaim(code);
  if (r.err) { UI.toast(r.err, 'bad'); return }
  if (r.cd) { if (el) el.value = ''; if (W.Sound) W.Sound.sfx('catch'); await cdModal(r.cd, r.isNew); render(); return }
  if (r.signed && !r.mon) { if (W.Sound) W.Sound.sfx('catch'); const parts = [...r.items.map(([n, q]) => `${UI.itemIcon(n)} ${esc(n)} ×${q}`), r.money ? `💰 ${fmt(r.money)} ₽` : '', r.pco ? `🗼 ${fmt(r.pco)} PCo` : ''].filter(Boolean);
    await UI.modal(`<div class="evo"><p class="eyebrow">Cadeau mystère</p><h2 style="margin:4px 0 8px">${esc(r.label)}</h2><p class="mtxt">Vous recevez :<br>${parts.join('<br>')}</p><div class="mbtns"><button class="btn pri" data-ret="1">Génial !</button></div></div>`, { cls: 'small' }); render(); return }
  const m = r.mon; if (W.Sound) W.Sound.sfx('catch');
  await UI.modal(`<div class="evo"><p class="eyebrow">Cadeau mystère</p><h2 style="margin:4px 0 8px">${esc(r.label)}</h2><div class="giftart">${monIcon(m, 'big')}</div><p class="mtxt">Vous recevez <b>${esc(monName(m))}</b> N.${m.lv} !<br><small class="mut">${m.m.map(x => mv(x[0]).n).join(' · ')}</small></p><p class="mut">Il a été envoyé ${r.where === 'team' ? 'dans votre équipe' : 'au PC'}.</p><div class="mbtns"><button class="btn pri" data-ret="1">Génial !</button></div></div>`, { cls: 'evom' });
  render();
}
// what is waiting in the "Plus" menu (quests to claim, a Tera raid ready)
// ---------- ACHIEVEMENTS (no rewards: just for the glory)
const GENS = [['Kanto', 1, 151], ['Johto', 152, 251], ['Hoenn', 252, 386], ['Sinnoh', 387, 493], ['Unys', 494, 649], ['Kalos', 650, 721], ['Alola', 722, 809], ['Galar', 810, 905], ['Paldea', 906, 1025]];
const ACH_CATS = [['cap', 'Captures'], ['dex', 'Pokédex'], ['shiny', 'Chromatiques'], ['fight', 'Combats'], ['league', 'Arènes et Ligue'], ['radar', 'Poké Radar'], ['breed', 'Œufs, fusion et évolution'], ['team', 'Équipe et collection'], ['misc', 'Divers']];
function achCtx() {
  const S = Gm.get(); const dc = Gm.dexCount(); const all = S.team.concat(Gm.pcAll());
  const gen = GENS.map(([, a, b]) => { let c = 0; for (let i = a; i <= b; i++) if (Gm.caught(i)) c++; return [c, b - a + 1] });
  const typ = {}; for (const t of Object.keys(TL)) typ[t] = [0, 0];
  for (let i = 1; i <= 1025; i++) { const s = sp(i); if (!s) continue; const ok = Gm.caught(i); for (const t of s.t) { typ[t][1]++; if (ok) typ[t][0]++ } }
  let lv100 = 0, perf = 0, ha = 0, hw = 0, hwSh = 0, nick = 0; for (const m of all) { if (m.lv >= 100) lv100++; if (P.ivPct(m) >= 100) perf++; if (m.ab === 'h') ha++; if (m.hw) { hw++; if (m.sh) hwSh++ } if (m.nick) nick++ }
  return { S, dc, all, gen, typ, lv100, perf, ha, hw, hwSh, nick, zc: G.ZONES.filter(z => Gm.zoneCleared(z.id)).length };
}
const ACH = (() => {
  const L = []; const st = k => c => c.S.stats[k] || 0;
  const tier = (cat, key, get, list) => list.forEach(([n, goal, name]) => L.push({ k: key + n, cat, n: name, d: goal(n), p: c => [Math.min(n, get(c)), n] }));
  const one = (cat, k, n, d, ok, p) => L.push({ k, cat, n, d, p: p || (c => [ok(c) ? 1 : 0, 1]) });
  const f = n => fmt(n);
  tier('cap', 'cap', st('caught'), [[1, () => 'Capturer votre premier Pokémon', 'Premier pas'], [10, n => `Capturer ${n} Pokémon`, 'Apprenti dresseur'], [50, n => `Capturer ${n} Pokémon`, 'Bon lanceur'], [100, n => `Capturer ${n} Pokémon`, 'Collectionneur'], [500, n => `Capturer ${n} Pokémon`, 'Chasseur assidu'], [1000, n => `Capturer ${f(n)} Pokémon`, 'Mille Balls'], [5000, n => `Capturer ${f(n)} Pokémon`, 'Filet géant'], [10000, n => `Capturer ${f(n)} Pokémon`, 'Arche de Valmara']]);
  tier('cap', 'enc', st('enc'), [[100, n => `Rencontrer ${n} Pokémon sauvages`, 'Promeneur'], [1000, n => `Rencontrer ${f(n)} Pokémon sauvages`, 'Explorateur'], [10000, n => `Rencontrer ${f(n)} Pokémon sauvages`, 'Coureur des herbes'], [50000, n => `Rencontrer ${f(n)} Pokémon sauvages`, 'Les hautes herbes, c’est chez moi']]);
  tier('cap', 'leg', st('legs'), [[1, () => 'Capturer un Pokémon Légendaire', 'Légende vivante'], [5, n => `Capturer ${n} Légendaires`, 'Mythologue'], [10, n => `Capturer ${n} Légendaires`, 'Gardien des mythes'], [25, n => `Capturer ${n} Légendaires`, 'Panthéon'], [50, n => `Capturer ${n} Légendaires`, 'Dompteur de dieux']]);
  tier('cap', 'epi', st('epics'), [[1, () => 'Capturer un Pokémon Épique', 'Coup de chance'], [10, n => `Capturer ${n} Épiques`, 'Épopée'], [50, n => `Capturer ${n} Épiques`, 'Chasseur d’exception']]);
  tier('cap', 'chain', st('chainMax'), [[10, n => `Faire une série de ${n} captures de la même espèce`, 'Obstiné'], [50, n => `Série de ${n} captures de la même espèce`, 'Monomaniaque'], [100, n => `Série de ${n} captures de la même espèce`, 'Obsession totale']]);
  tier('dex', 'dex', c => c.dc.cb, [[10, n => `Enregistrer ${n} espèces capturées`, 'Pokédex en main'], [50, n => `${n} espèces capturées`, 'Curieux'], [100, n => `${n} espèces capturées`, 'Chercheur'], [250, n => `${n} espèces capturées`, 'Assistant du Professeur'], [500, n => `${n} espèces capturées`, 'Encyclopédiste'], [750, n => `${n} espèces capturées`, 'Savant'], [1000, n => `${f(n)} espèces capturées`, 'Presque tout'], [1025, () => 'Compléter le Pokédex national (1 025 espèces)', 'Maître Pokédex']]);
  one('dex', 'forms', 'Toutes les formes', 'Capturer toutes les espèces ET toutes les formes du Pokédex', c => c.dc.c >= c.dc.tot, c => [c.dc.c, c.dc.tot]);
  GENS.forEach(([g], i) => one('dex', 'gen' + i, `Pokédex de ${g}`, `Capturer les ${GENS[i][2] - GENS[i][1] + 1} Pokémon de ${g}`, null, c => c.gen[i]));
  Object.keys(TL).forEach(t => one('dex', 'type_' + t, `Maître du type ${TL[t]}`, `Capturer toutes les espèces de type ${TL[t]}`, null, c => c.typ[t]));
  tier('shiny', 'sh', st('shinies'), [[1, () => 'Capturer votre premier chromatique', 'Ça brille !'], [5, n => `Capturer ${n} chromatiques`, 'Éclats'], [10, n => `Capturer ${n} chromatiques`, 'Chasseur de chromatiques'], [25, n => `Capturer ${n} chromatiques`, 'Pluie d’étoiles'], [50, n => `Capturer ${n} chromatiques`, 'Constellation'], [100, n => `Capturer ${n} chromatiques`, 'Centurion scintillant'], [250, n => `Capturer ${n} chromatiques`, 'Galaxie'], [500, n => `Capturer ${n} chromatiques`, 'Supernova']]);
  tier('shiny', 'dexsh', c => c.dc.sh, [[10, n => `${n} espèces chromatiques au Pokédex`, 'Album doré'], [50, n => `${n} espèces chromatiques au Pokédex`, 'Collection brillante'], [100, n => `${n} espèces chromatiques au Pokédex`, 'Vitrine étincelante'], [250, n => `${n} espèces chromatiques au Pokédex`, 'Musée chromatique'], [500, n => `${n} espèces chromatiques au Pokédex`, 'Arc-en-ciel']]);
  one('shiny', 'shteam', 'Équipe de rêve', 'Avoir 6 chromatiques dans votre équipe', c => c.S.team.length >= 6 && c.S.team.every(m => m.sh), c => [c.S.team.filter(m => m.sh).length, 6]);
  one('shiny', 'charm', 'Charme Chroma', 'Obtenir le Charme Chroma', c => !!c.S.flags.charm);
  one('shiny', 'eggsh', 'Œuf en or', 'Faire éclore un œuf chromatique', null, c => [Math.min(1, c.S.stats.eggSh || 0), 1]);
  one('shiny', 'trade', 'Échange brillant', 'Obtenir un chromatique à la boutique d’échange', null, c => [Math.min(1, c.S.stats.shTrades || 0), 1]);
  one('shiny', 'hwsh', 'Citrouille dorée', 'Posséder un Pokémon palette Halloween chromatique', null, c => [Math.min(1, c.hwSh), 1]);
  tier('fight', 'win', st('wins'), [[10, n => `Gagner ${n} combats`, 'Premières victoires'], [100, n => `Gagner ${n} combats`, 'Combattant'], [1000, n => `Gagner ${f(n)} combats`, 'Vétéran'], [5000, n => `Gagner ${f(n)} combats`, 'Machine de guerre'], [20000, n => `Gagner ${f(n)} combats`, 'Invaincu… presque']]);
  tier('fight', 'tw', c => Math.max(c.S.tower.best1 || 0, c.S.tower.best2 || 0, c.S.tower.best3 || 0), [[7, n => `Série de ${n} victoires à la Tour de Combat`, 'Tour : 1er étage'], [21, n => `Série de ${n} victoires à la Tour`, 'Tour : Tête de la Tour'], [50, n => `Série de ${n} victoires à la Tour`, 'Tour : légende'], [100, n => `Série de ${n} victoires à la Tour`, 'Tour : intouchable']]);
  tier('fight', 'raid', st('raids'), [[1, () => 'Réussir un Raid Téra', 'Cristal brisé'], [10, n => `Réussir ${n} Raids Téra`, 'Raider'], [50, n => `Réussir ${n} Raids Téra`, 'Fléau des Téracristaux'], [200, n => `Réussir ${n} Raids Téra`, 'Roi des raids']]);
  one('fight', 'raid6', 'Six étoiles', 'Réussir un Raid Téra 6★', null, c => [Math.min(1, c.S.stats.raid6 || 0), 1]);
  G.GYMS.forEach((g, i) => one('league', 'gym' + i, g.badge, `Battre ${g.n}, Champion·ne de type ${TL[g.type]}`, c => !!c.S.gyms[i]));
  one('league', 'champ', 'Maître de la Ligue', 'Battre le Conseil 4 et le Maître', c => !!c.S.champ);
  tier('league', 'champx', c => c.S.champTimes || 0, [[5, n => `Devenir Maître ${n} fois`, 'Règne durable'], [10, n => `Devenir Maître ${n} fois`, 'Dynastie'], [25, n => `Devenir Maître ${n} fois`, 'Légende de Valmara']]);
  tier('league', 'zone', c => c.zc, [[5, n => `Terminer ${n} zones`, 'Voyageur'], [15, n => `Terminer ${n} zones`, 'Globe-trotter'], [25, n => `Terminer ${n} zones`, 'Route Victoire'], [G.ZONES.length, () => 'Terminer toutes les zones, y compris après la Ligue', 'Cartographe']]);
  tier('radar', 'rad', st('radarBest'), [[5, n => `Faire une chaîne de ${n} au Poké Radar`, 'Bip bip'], [10, n => `Chaîne de ${n} au Poké Radar`, 'Ça bouge !'], [20, n => `Chaîne de ${n} (1 IV parfait garanti)`, 'Pisteur'], [40, n => `Chaîne de ${n} (chance chromatique au maximum)`, 'Chaîne parfaite'], [60, n => `Chaîne de ${n} (3 IV parfaits garantis)`, 'Radar en surchauffe'], [100, n => `Chaîne de ${n}`, 'Centenaire du Radar']]);
  tier('radar', 'radsh', st('radarSh'), [[1, () => 'Capturer un chromatique dans une herbe scintillante', 'L’herbe qui brille'], [5, n => `Capturer ${n} chromatiques au Poké Radar`, 'Jardinier étoilé'], [20, n => `Capturer ${n} chromatiques au Poké Radar`, 'Maître du Radar']]);
  tier('breed', 'egg', st('eggs'), [[1, () => 'Faire éclore un œuf', 'Oh ? L’œuf bouge…'], [50, n => `Faire éclore ${n} œufs`, 'Éleveur'], [500, n => `Faire éclore ${n} œufs`, 'Couveuse'], [2000, n => `Faire éclore ${f(n)} œufs`, 'Pension 5 étoiles']]);
  tier('breed', 'fus', st('fusions'), [[1, () => 'Faire une fusion', 'Deux en un'], [50, n => `Faire ${n} fusions`, 'Alchimiste'], [500, n => `Faire ${n} fusions`, 'Généticien']]);
  tier('breed', 'evo', st('evos'), [[1, () => 'Faire évoluer un Pokémon', 'Quoi ?!'], [100, n => `Faire évoluer ${n} Pokémon`, 'Darwin en herbe'], [1000, n => `Faire évoluer ${f(n)} Pokémon`, 'Évolution permanente']]);
  one('breed', 'oval', 'Charme Ovale', 'Obtenir le Charme Ovale', c => !!c.S.flags.oval);
  one('breed', 'dc2', 'Agrandissement', 'Débloquer la deuxième Pension', c => !!c.S.flags.dc2);
  one('team', 'lv100', 'Niveau 100', 'Monter un Pokémon au niveau 100', null, c => [Math.min(1, c.lv100), 1]);
  one('team', 'lv100t', 'Équipe au sommet', 'Avoir 6 Pokémon niveau 100 dans votre équipe', c => c.S.team.length >= 6 && c.S.team.every(m => m.lv >= 100), c => [c.S.team.filter(m => m.lv >= 100).length, 6]);
  one('team', 'perf', 'Perfection', 'Posséder un Pokémon avec 6 IV à 31', null, c => [Math.min(1, c.perf), 1]);
  tier('team', 'perfn', c => c.perf, [[10, n => `Posséder ${n} Pokémon aux IV parfaits`, 'Élevage d’élite']]);
  one('team', 'ha', 'Caché', 'Posséder un Pokémon avec son talent caché', null, c => [Math.min(1, c.ha), 1]);
  tier('team', 'han', c => c.ha, [[25, n => `Posséder ${n} Pokémon avec leur talent caché`, 'Talents cachés']]);
  one('team', 'nick', 'Baptême', 'Donner un surnom à un Pokémon', null, c => [Math.min(1, c.nick), 1]);
  tier('team', 'own', c => c.all.length, [[100, n => `Posséder ${n} Pokémon`, 'Petite ménagerie'], [1000, n => `Posséder ${f(n)} Pokémon`, 'Boîtes pleines'], [3000, n => `Posséder ${f(n)} Pokémon`, 'Bill est débordé']]);
  one('team', 'ring', 'Méga-Évolution', 'Obtenir le Méga-Anneau', c => !!c.S.flags.ring);
  one('team', 'hw', 'Des bonbons ou un sort', 'Posséder un Pokémon palette Halloween', null, c => [Math.min(1, c.hw), 1]);
  tier('misc', 'money', c => c.S.money, [[100000, n => `Avoir ${f(n)} ₽ en poche`, 'Économe'], [1000000, n => `Avoir ${f(n)} ₽ en poche`, 'Millionnaire'], [10000000, n => `Avoir ${f(n)} ₽ en poche`, 'Magnat']]);
  tier('misc', 'play', c => Math.floor((c.S.stats.play || 0) / 3600), [[1, () => 'Jouer 1 heure', 'Juste une partie'], [10, n => `Jouer ${n} heures`, 'Passionné'], [50, n => `Jouer ${n} heures`, 'Accro'], [100, n => `Jouer ${n} heures`, 'Une vie à Valmara']]);
  tier('misc', 'q', st('quests'), [[10, n => `Terminer ${n} quêtes`, 'Serviable'], [100, n => `Terminer ${n} quêtes`, 'Héros du quotidien']]);
  tier('misc', 'day', st('daily'), [[7, n => `Récupérer ${n} récompenses du jour`, 'Fidèle'], [30, n => `Récupérer ${n} récompenses du jour`, 'Abonné']]);
  tier('misc', 'tm', c => (c.S.tms || []).length, [[25, n => `Posséder ${n} CT`, 'Bibliothèque de CT'], [100, n => `Posséder ${n} CT`, 'Encyclopédie des attaques']]);
  tier('misc', 'pco', c => c.S.tower.pts || 0, [[1500, n => `Avoir ${f(n)} PCo en réserve`, 'Économies de la Tour']]);
  return L;
})();

// ---------- even more achievements, for the dedicated (still no rewards)
(() => {
  const st = k => c => c.S.stats[k] || 0; const f = n => fmt(n);
  const T = (cat, key, get, list) => list.forEach(([n, d, name]) => ACH.push({ k: key + n, cat, n: name, d: typeof d === 'function' ? d(n) : d, p: c => [Math.min(n, get(c)), n] }));
  T('cap', 'cap', st('caught'), [[20000, n => `Capturer ${f(n)} Pokémon`, 'Arche de Noé'], [50000, n => `Capturer ${f(n)} Pokémon`, 'Filet infini'], [100000, n => `Capturer ${f(n)} Pokémon`, 'Cent mille Balls']]);
  T('cap', 'enc', st('enc'), [[100000, n => `Rencontrer ${f(n)} Pokémon sauvages`, 'Tondeuse à hautes herbes'], [250000, n => `Rencontrer ${f(n)} Pokémon sauvages`, 'Les herbes te connaissent']]);
  T('cap', 'leg', st('legs'), [[75, n => `Capturer ${n} Légendaires`, 'Collection divine'], [100, n => `Capturer ${n} Légendaires`, 'Centaine légendaire'], [150, n => `Capturer ${n} Légendaires`, 'Olympe'], [200, n => `Capturer ${n} Légendaires`, 'Créateur de mythes']]);
  T('cap', 'epi', st('epics'), [[100, n => `Capturer ${n} Épiques`, 'Épique de chez épique'], [250, n => `Capturer ${n} Épiques`, 'Chasseur d’élite'], [500, n => `Capturer ${n} Épiques`, 'L’exception devient la règle'], [1000, n => `Capturer ${f(n)} Épiques`, 'Mille épopées']]);
  T('cap', 'chain', st('chainMax'), [[250, n => `Série de ${n} captures de la même espèce`, 'Concentration absolue'], [500, n => `Série de ${n} captures de la même espèce`, 'Rien d’autre n’existe']]);
  T('shiny', 'sh', st('shinies'), [[750, n => `Capturer ${n} chromatiques`, 'Nébuleuse'], [1000, n => `Capturer ${f(n)} chromatiques`, 'Mille étoiles'], [2000, n => `Capturer ${f(n)} chromatiques`, 'Voie lactée'], [5000, n => `Capturer ${f(n)} chromatiques`, 'Big Bang']]);
  T('shiny', 'dexsh', c => c.dc.sh, [[750, n => `${n} espèces chromatiques au Pokédex`, 'Trésor scintillant'], [1000, n => `${f(n)} espèces chromatiques au Pokédex`, 'Presque tout brille']]);
  ACH.push({ k: 'dexshall', cat: 'shiny', n: 'Pokédex doré', d: 'Avoir toutes les espèces et formes du Pokédex en chromatique', p: c => [c.dc.sh, c.dc.tot] });
  T('shiny', 'eggshn', st('eggSh'), [[10, n => `Faire éclore ${n} œufs chromatiques`, 'Couvée dorée'], [50, n => `Faire éclore ${n} œufs chromatiques`, 'Poule aux œufs d’or']]);
  T('shiny', 'radshx', st('radarSh'), [[50, n => `Capturer ${n} chromatiques au Poké Radar`, 'Prairie étincelante'], [100, n => `Capturer ${n} chromatiques au Poké Radar`, 'Le Radar, c’est moi']]);
  T('fight', 'win', st('wins'), [[50000, n => `Gagner ${f(n)} combats`, 'Légion'], [100000, n => `Gagner ${f(n)} combats`, 'Cent mille victoires'], [250000, n => `Gagner ${f(n)} combats`, 'Dieu de la guerre']]);
  T('fight', 'tw', c => Math.max(c.S.tower.best1 || 0, c.S.tower.best2 || 0, c.S.tower.best3 || 0), [[200, n => `Série de ${n} victoires à la Tour`, 'Tour : mythique'], [500, n => `Série de ${n} victoires à la Tour`, 'Tour : divin']]);
  T('fight', 'raid', st('raids'), [[500, n => `Réussir ${n} Raids Téra`, 'Tempête de cristaux'], [1000, n => `Réussir ${f(n)} Raids Téra`, 'Empereur des raids']]);
  T('fight', 'raid6n', st('raid6'), [[10, n => `Réussir ${n} Raids Téra 6★`, 'Six étoiles, dix fois'], [50, n => `Réussir ${n} Raids Téra 6★`, 'Firmament']]);
  T('league', 'champx', c => c.S.champTimes || 0, [[50, n => `Devenir Maître ${n} fois`, 'Empereur de Valmara'], [100, n => `Devenir Maître ${n} fois`, 'Siècle de règne'], [250, n => `Devenir Maître ${n} fois`, 'Éternel Maître']]);
  T('radar', 'rad', st('radarBest'), [[150, n => `Chaîne de ${n} au Poké Radar`, 'Chaîne infinie'], [255, n => `Chaîne de ${n} au Poké Radar`, 'Compteur au maximum']]);
  T('breed', 'egg', st('eggs'), [[5000, n => `Faire éclore ${f(n)} œufs`, 'Ferme d’élevage'], [10000, n => `Faire éclore ${f(n)} œufs`, 'Usine à œufs'], [25000, n => `Faire éclore ${f(n)} œufs`, 'Berceau du monde']]);
  T('breed', 'fus', st('fusions'), [[1000, n => `Faire ${f(n)} fusions`, 'Laboratoire secret'], [2500, n => `Faire ${f(n)} fusions`, 'Savant fou']]);
  T('breed', 'evo', st('evos'), [[2500, n => `Faire évoluer ${f(n)} Pokémon`, 'Accélérateur d’évolution'], [5000, n => `Faire évoluer ${f(n)} Pokémon`, 'Darwin approuve']]);
  T('team', 'lv100n', c => c.lv100, [[10, n => `Posséder ${n} Pokémon niveau 100`, 'Dix au sommet'], [50, n => `Posséder ${n} Pokémon niveau 100`, 'Armée d’élite'], [100, n => `Posséder ${n} Pokémon niveau 100`, 'Centurie'], [500, n => `Posséder ${n} Pokémon niveau 100`, 'Légion de champions']]);
  T('team', 'perfn', c => c.perf, [[25, n => `Posséder ${n} Pokémon aux IV parfaits`, 'Génétique parfaite'], [50, n => `Posséder ${n} Pokémon aux IV parfaits`, 'Haras d’exception'], [100, n => `Posséder ${n} Pokémon aux IV parfaits`, 'Perfection en série']]);
  T('team', 'han', c => c.ha, [[100, n => `Posséder ${n} Pokémon avec leur talent caché`, 'Collection secrète'], [250, n => `Posséder ${n} Pokémon avec leur talent caché`, 'Maître des secrets']]);
  T('team', 'own', c => c.all.length, [[5000, n => `Posséder ${f(n)} Pokémon`, 'PC plein à craquer']]);
  T('team', 'hwn', c => c.hw, [[10, n => `Posséder ${n} Pokémon palette Halloween`, 'Fête des citrouilles'], [50, n => `Posséder ${n} Pokémon palette Halloween`, 'Roi d’Halloween']]);
  T('team', 'hwshn', c => c.hwSh, [[5, n => `Posséder ${n} Pokémon Halloween chromatiques`, 'Citrouilles dorées']]);
  T('misc', 'money', c => c.S.money, [[50000000, n => `Avoir ${f(n)} ₽ en poche`, 'Banque de Valmara'], [100000000, n => `Avoir ${f(n)} ₽ en poche`, 'Fortune légendaire']]);
  T('misc', 'play', c => Math.floor((c.S.stats.play || 0) / 3600), [[250, n => `Jouer ${n} heures`, 'Résident permanent'], [500, n => `Jouer ${n} heures`, 'Citoyen d’honneur'], [1000, n => `Jouer ${f(n)} heures`, 'Une vie entière']]);
  T('misc', 'q', st('quests'), [[500, n => `Terminer ${n} quêtes`, 'Infatigable'], [1000, n => `Terminer ${f(n)} quêtes`, 'Légende des quêtes']]);
  T('misc', 'day', st('daily'), [[100, n => `Récupérer ${n} récompenses du jour`, 'Habitué'], [365, n => `Récupérer ${n} récompenses du jour`, 'Une année à Valmara']]);
  T('misc', 'prt', st('prtMax'), [[1, () => 'Gagner un premier cœur avec votre partenaire', 'Nouveaux amis'], [3, () => 'Atteindre 3 cœurs avec un partenaire', 'Complices'], [5, () => 'Atteindre 5 cœurs avec un partenaire', 'Inséparables']]);
  T('misc', 'minew', st('mineWalls'), [[1, () => 'Creuser votre première paroi', 'Premier coup de pioche'], [25, n => `Creuser ${n} parois`, 'Mineur'], [100, n => `Creuser ${n} parois`, 'Maître mineur'], [500, n => `Creuser ${n} parois`, 'Taupe humaine']]);
  T('misc', 'minei', st('mineItems'), [[50, n => `Déterrer ${n} objets`, 'Chercheur de trésors'], [500, n => `Déterrer ${n} objets`, 'Mine d’or']]);
  ACH.push({ k: 'tmall', cat: 'misc', n: 'Toutes les CT', d: 'Posséder toutes les CT du jeu', p: c => [(c.S.tms || []).length, P.TMS.length] });
  ACH.push({ k: 'achhalf', cat: 'misc', n: 'Chasseur de succès', d: 'Débloquer la moitié des succès', p: c => { const n = Object.keys(c.S.ach || {}).length; const t = ACH.length; return [Math.min(n, Math.ceil(t / 2)), Math.ceil(t / 2)] } });
  ACH.push({ k: 'achall', cat: 'misc', n: 'Légende absolue', d: 'Débloquer tous les autres succès', p: c => { const t = ACH.length - 1; const n = Object.keys(c.S.ach || {}).filter(k => k !== 'achall').length; return [Math.min(n, t), t] } });
})();
function achState() { const c = achCtx(); return ACH.map(a => { let p; try { p = a.p(c) } catch (e) { p = [0, 1] } return { ...a, cur: p[0], goal: p[1], ok: p[0] >= p[1] } }) }
let achLast = 0;
// ---------- celebration effects (badge, achievements, purchases)
const UITHEMES = [['', 'Valmara', '#10142a', '#212850', '#ffcf3a'], ['nuit', 'Nuit', '#07070f', '#1a1a2e', '#b9a6ff'], ['ocean', 'Océan', '#06202e', '#0f3a52', '#3fd6e8'], ['foret', 'Forêt', '#0c1d12', '#1c3a24', '#9be15d'], ['halloween', 'Halloween', '#150b1e', '#2e1840', '#ff8c2e'], ['sakura', 'Sakura', '#1e0f1a', '#3a1f33', '#ff8fc8'], ['braise', 'Braise', '#1c0c0a', '#3a1a14', '#ffb347']];
function confetti(n, x, y) {
  const cols = ['#ffd23f', '#ff5d8a', '#4fd18b', '#4ea8ff', '#b67bff', '#ffffff'];
  for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'confetti'; c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.background = cols[i % cols.length]; document.body.appendChild(c);
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260; c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v * .6 - 80}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: .45 }, { transform: `translate(${Math.cos(a) * v * 1.2}px, ${Math.sin(a) * v * .6 + 260}px) rotate(${Math.random() * 1080}deg)`, opacity: 0 }], { duration: 1800 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => c.remove() }
}
// a new badge spins in the middle of the screen with confetti, then flies to its place in the top bar
function badgeFx(src, gi) {
  const d = document.createElement('div'); d.className = 'badgefx'; d.innerHTML = `<div class="bfglow"></div><img src="${src}" alt="">`; document.body.appendChild(d);
  const img = d.querySelector('img'); const cx = innerWidth / 2, cy = innerHeight / 2; confetti(70, cx, cy);
  img.animate([{ transform: 'translate(-50%,-50%) scale(0) rotateY(0)' }, { transform: 'translate(-50%,-50%) scale(1.2) rotateY(540deg)', offset: .5 }, { transform: 'translate(-50%,-50%) scale(1) rotateY(720deg)' }], { duration: 1500, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => { header(); const tgt = document.querySelectorAll('#top .bdg .gbi, #top .bdg i')[gi]; const r = tgt ? tgt.getBoundingClientRect() : { left: 40, top: 10, width: 20, height: 20 };
    img.animate([{ left: cx + 'px', top: cy + 'px', transform: 'translate(-50%,-50%) scale(1)' }, { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', transform: 'translate(-50%,-50%) scale(.18)' }], { duration: 700, easing: 'cubic-bezier(.5,0,.7,1)', fill: 'forwards' }).onfinish = () => { d.remove(); if (tgt) tgt.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.8)', filter: 'brightness(2)' }, { transform: 'scale(1)' }], { duration: 500 }) };
    d.querySelector('.bfglow').style.opacity = 0 }, 2200);
}
// achievements: a golden banner slides from the top
function achBanner(title, sub) {
  const d = document.createElement('div'); d.className = 'achban'; d.innerHTML = `<span class="achic">🏆</span><span class="achtx"><small>Succès débloqué !</small><b>${esc(title)}</b>${sub ? `<em>${esc(sub)}</em>` : ''}</span><i class="achshine"></i>`; document.body.appendChild(d);
  setTimeout(() => d.classList.add('out'), 3800); setTimeout(() => d.remove(), 4400);
}
// a purchase jumps into a little bag that pops up near the Bag tab
function bagFly(n, from) {
  const tab = document.querySelector('#nav [data-go="bag"]'); const r = tab ? tab.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight - 40, width: 0, height: 0 };
  const bag = document.createElement('div'); bag.className = 'bagpop'; bag.innerHTML = '🎒'; bag.style.left = r.left + r.width / 2 + 'px'; bag.style.top = r.top - 18 + 'px'; document.body.appendChild(bag);
  const it = document.createElement('div'); it.className = 'bagitem'; it.innerHTML = UI.itemIcon(n, 'ii'); document.body.appendChild(it);
  const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2, x1 = r.left + r.width / 2, y1 = r.top - 22;
  it.animate([{ left: x0 + 'px', top: y0 + 'px', transform: 'translate(-50%,-50%) scale(1)' }, { left: (x0 + x1) / 2 + 'px', top: Math.min(y0, y1) - 120 + 'px', transform: 'translate(-50%,-50%) scale(1.3) rotate(180deg)', offset: .5 }, { left: x1 + 'px', top: y1 + 'px', transform: 'translate(-50%,-50%) scale(.4) rotate(360deg)' }], { duration: 750, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => { it.remove(); bag.classList.add('gulp'); if (W.Sound) W.Sound.sfx('select') };
  setTimeout(() => bag.remove(), 1500);
}
UI.__fx = { badgeFx: (s, g) => badgeFx(s, g), achBanner: (a, b) => achBanner(a, b), bagFly: (n, r) => bagFly(n, r) };
function achCheck(force) {
  const S = Gm.get(); if (!S || busy) return; const now = Date.now(); if (!force && now - achLast < 4000) return; achLast = now;
  S.ach = S.ach || {}; const first = !S.achInit; const nw = [];
  for (const a of achState()) if (a.ok && !S.ach[a.k]) { S.ach[a.k] = now; nw.push(a) }
  if (first) { S.achInit = 1; Gm.save(true); return } // an old save: unlock silently what was already done
  if (!nw.length) return; Gm.save(true); if (W.Sound) W.Sound.sfx('lvl');
  achBanner(nw.length === 1 ? nw[0].n : `${nw.length} succès débloqués`, nw.length === 1 ? nw[0].d : nw.slice(0, 3).map(a => a.n).join(' · ') + (nw.length > 3 ? '…' : ''));
}
UI.achCheck = achCheck;
function renderAch() {
  const S = Gm.get(); S.ach = S.ach || {}; const all = achState(); const ok = all.filter(a => a.ok).length; const cat = view.achCat || 'all';
  const list = cat === 'all' ? all : all.filter(a => a.cat === cat);
  const dt = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const row = a => `<div class="achr ${a.ok ? 'ok' : ''}"><i class="achi">${a.ok ? '🏆' : '🔒'}</i><span><b>${esc(a.n)}</b><small>${esc(a.d)}</small>${a.ok ? `<small class="achd">Débloqué${S.ach[a.k] ? ' le ' + dt(S.ach[a.k]) : ''}</small>` : a.goal > 1 ? `<span class="achbar"><i style="width:${Math.min(100, a.cur / a.goal * 100)}%"></i></span><small class="achd">${fmt(a.cur)} / ${fmt(a.goal)}</small>` : ''}</span></div>`;
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Succès</h1><p class="sub">${ok} / ${all.length} débloqués · ${Math.floor(ok / all.length * 100)} %</p><div class="dexbar"><i style="width:${ok / all.length * 100}%"></i></div></section>
  <div class="achtabs"><button class="btn sm ${cat === 'all' ? 'on' : ''}" data-act="achcat" data-v="all">Tous</button>${ACH_CATS.map(([k, l]) => { const g = all.filter(a => a.cat === k); return `<button class="btn sm ${cat === k ? 'on' : ''}" data-act="achcat" data-v="${k}">${l} <small>${g.filter(a => a.ok).length}/${g.length}</small></button>` }).join('')}</div>
  ${(cat === 'all' ? ACH_CATS : ACH_CATS.filter(x => x[0] === cat)).map(([k, l]) => { const g = list.filter(a => a.cat === k); return g.length ? `<section class="blk"><h2>${l} <small>${g.filter(a => a.ok).length}/${g.length}</small></h2><div class="achl">${g.map(row).join('')}</div></section>` : '' }).join('')}`;
}

// ---------- POKÉ RADAR (X/Y style chains; you walk around the grass, the view follows you)
const RAD_N = 9, RAD_C = 4, RAD_CHARGE = 40;
const radRing = (r, px, py) => { const out = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) out.push([px + dx, py + dy]); return out };
const radState = () => { const S = Gm.get(); if (!S.radar || S.radar.z !== view.zid) S.radar = { z: view.zid, s: 0, n: 0, grid: [] }; const r = S.radar; if (r.px == null) { r.px = 0; r.py = 0 } if (r.steps == null) r.steps = RAD_CHARGE; return r };
// shiny chance of a rapidly-shaking patch: the base rate (1/350) at the start, down to 1/75 at chain 40 (Charme Chroma: halved)
Gm.radarShRate = n => (1 / Math.max(100, Math.round(Gm.RATE.shiny - (Gm.RATE.shiny - 100) * Math.min(40, n) / 40))) * (Gm.get().flags.charm ? 2 : 1);
const radPerfect = n => n >= 60 ? 3 : n >= 40 ? 2 : n >= 20 ? 1 : 0;
function radBreak(why) { const S = Gm.get(); const r = S.radar; if (!r) return; const had = r.n; r.s = 0; r.n = 0; r.grid = []; if (why && had >= 2) UI.toast(`Chaîne brisée (${had}) : ${why}`, 'bad') }
// grass decoration from the world position, so you can see yourself moving
const radTile = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h = (h ^ (h >>> 16)) >>> 0; const v = h % 100; return v < 7 ? 'fl' : v < 12 ? 'fl2' : v < 30 ? 'g2' : v < 40 ? 'g3' : '' };
function radPulse(afterCatch, tries = 0) {
  const r = radState(); const g = []; const used = new Set([r.px + ',' + r.py]);
  const pAct = [0.23, 0.43, 0.63, 0.83], pRapid = [0.35, 0.5, 0.65, 0.8];
  for (let ring = 1; ring <= 4; ring++) {
    const cells = radRing(ring, r.px, r.py).sort(() => Math.random() - 0.5).slice(0, 1); // one patch per ring at most (up to 5 with the decoy), like X/Y
    for (const [x, y] of cells) {
      if (Math.random() >= pAct[ring - 1] + (afterCatch ? 0.1 : 0)) continue;
      const kind = Math.random() < pRapid[ring - 1] ? 'rapid' : 'normal';
      const look = kind === 'rapid' ? (Math.random() < 0.2 ? 'normal' : 'rapid') : (Math.random() < 0.1 ? 'rapid' : 'normal');
      const sh = kind === 'rapid' && r.s && Math.random() < Gm.radarShRate(r.n);
      g.push({ x, y, kind, look: sh ? 'shiny' : look, sh: !!sh }); used.add(x + ',' + y);
    }
  }
  const real = g.length;
  if (!real && !r.n && tries < 20) return radPulse(afterCatch, tries + 1); // a fresh Radar always shows something
  if (Math.random() < 0.6) { const ring = 1 + Math.floor(Math.random() * 3); const free = radRing(ring, r.px, r.py).filter(([x, y]) => !used.has(x + ',' + y)); if (free.length) { const [x, y] = free[Math.floor(Math.random() * free.length)]; g.push({ x, y, kind: 'weak', look: 'weak' }) } }
  r.grid = g; r.steps = 0;
  if (!real && r.n) { radBreak('aucune herbe ne s’est mise à bouger'); r.grid = g }
  if (g.some(p => p.sh) && W.Sound) W.Sound.sfx('shiny');
}
function radEnc(p) {
  const r = radState(); const z = Gm.zone(view.zid);
  if (p.kind === 'rapid' && r.s) {
    const s = sp(r.s); let lv = ri(z.lv[0], z.lv[1]); if (s.rq > lv) lv = Math.min(100, s.rq + ri(0, 2));
    const hw = Gm.hwSeason() && !!Gm.hwURL(r.s, false) && Math.random() < 1 / 50;
    return { id: r.s, lv: Math.min(100, lv), sh: p.sh, tier: s.rar, hw, ha: !!(s.ha && Math.random() < Gm.haRate(r.s)), perfect: radPerfect(r.n) };
  }
  let e; for (let k = 0; k < 40; k++) { e = Gm.rollEncounter(view.zid); if (!radLeg(e.id)) break }
  if (radLeg(e.id)) { const ok = Gm.zoneSpecies(view.zid, Gm.isNight()).filter(id => !radLeg(id)); if (!ok.length) return null; const id = ok[Math.floor(Math.random() * ok.length)]; const s = sp(id); let lv = ri(z.lv[0], z.lv[1]); if (s.rq > lv) lv = Math.min(100, s.rq + ri(0, 2)); e = { id, lv, sh: Math.random() < Gm.shinyRate(), tier: s.rar, hw: false, ha: !!(s.ha && Math.random() < Gm.haRate(id)) } }
  if (e.id === r.s) e.perfect = radPerfect(r.n);
  return e;
}
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// no Légendaires (nor Fabuleux / event Pokémon) on the Poké Radar
const radLeg = id => { const s = sp(id); return !s || s.rar === 'legendaire' || s.rar === 'event' || !!s.myth };
async function radStep(i) {
  const S = Gm.get(); if (busy) return; const r = radState(); const p = r.grid[i]; if (!p) return;
  if (p.kind === 'weak') { const had = r.n; radBreak(); render(); await UI.alert(`Rien du tout… l’herbe ne faisait que trembler au vent.${had >= 1 ? `<br><b>La chaîne de ${had} est brisée.</b>` : ''}`); return }
  if (!Gm.teamAlive()) { UI.toast('Votre équipe est K.O. : passez au Centre Pokémon.', 'bad'); return }
  const e = radEnc(p); if (!e) { r.grid = []; render(); UI.toast('Aucun Pokémon ne peut apparaître au Poké Radar ici.', 'bad'); return } const z = Gm.zone(view.zid); r.grid = []; Gm.save(true); render();
  const wild = Gm.makeWild(e);
  const out = await startBattle({ kind: 'wild', foe: [wild], bio: z.bio, wildLv: e.lv });
  const r2 = radState();
  if (!out) { radBreak('le combat a été interrompu'); render(); return }
  if (out.res === 'win' || out.res === 'catch') {
    if (radLeg(e.id)) { radBreak('les Légendaires ne peuvent pas être pistés') } else if (r2.s === e.id) r2.n++; else { if (r2.n >= 2) UI.toast(`Chaîne de ${r2.n} brisée : un autre Pokémon est apparu.`, 'bad'); r2.s = e.id; r2.n = 1 }
    S.stats.radarBest = Math.max(S.stats.radarBest || 0, r2.n);
    if (out.res === 'catch' && e.sh) S.stats.radarSh = (S.stats.radarSh || 0) + 1;
    radPulse(out.res === 'catch');
  } else radBreak(out.res === 'run' ? 'vous avez pris la fuite' : 'votre équipe a perdu');
  Gm.save(); render(); achCheck(true);
}
// one step: returns true when it started an encounter (or found an empty patch)
async function radMove(dx, dy) {
  if (busy || modalStack.length) return true; const r = radState();
  r.px += dx; r.py += dy; if (r.steps < RAD_CHARGE) r.steps++;
  radDir = dx > 0 ? 'r' : dx < 0 ? 'l' : dy > 0 ? 'd' : 'u';
  const k = r.grid.findIndex(p => p.x === r.px && p.y === r.py);
  if (k >= 0) { await radStep(k); return true }
  // patches that leave the screen are gone; walking away from all of them ends the chain
  const before = r.grid.some(p => p.kind !== 'weak');
  r.grid = r.grid.filter(p => Math.max(Math.abs(p.x - r.px), Math.abs(p.y - r.py)) <= RAD_C);
  if (r.n && before && !r.grid.some(p => p.kind !== 'weak')) { radBreak('vous vous êtes éloigné des herbes qui bougent'); radRefresh(); return true }
  radRefresh(); return false;
}
let radWalking = false, radDir = '';
async function radWalkTo(tx, ty) {
  if (radWalking || busy) return; radWalking = true;
  try { const r = radState(); for (let i = 0; i < 12 && (r.px !== tx || r.py !== ty); i++) { const dx = Math.sign(tx - r.px), dy = dx ? 0 : Math.sign(ty - r.py); if (await radMove(dx, dy)) break; await wait(90) } }
  finally { radWalking = false; Gm.save(true) }
}
function radGridHTML() {
  const r = radState(); const night = Gm.isNight(); const cells = [];
  for (let vy = 0; vy < RAD_N; vy++) for (let vx = 0; vx < RAD_N; vx++) {
    const x = r.px + vx - RAD_C, y = r.py + vy - RAD_C; const me = vx === RAD_C && vy === RAD_C;
    const k = r.grid.findIndex(p => p.x === x && p.y === y); const p = r.grid[k]; const t = radTile(x, y);
    cells.push(me ? `<div class="rcell ${t}"></div>` : `<button class="rcell ${t}${p ? ' rp ' + p.look : ''}" data-act="radwalk" data-x="${x}" data-y="${y}" aria-label="${p ? 'Herbe qui bouge' : 'Herbe'}">${p && p.look === 'shiny' ? '<i class="rspk"></i>' : ''}</button>`);
  }
  const d = radDir; radDir = '';
  return `<div class="radgrid${night ? ' night' : ''}" style="--rn:${RAD_N}"><div class="radin${d ? ' mv-' + d : ''}">${cells.join('')}</div><span class="rme"></span></div>`;
}
function radCtlHTML() {
  const r = radState(); const ch = Math.min(RAD_CHARGE, r.steps); const ready = ch >= RAD_CHARGE;
  return `<div class="radbar"><span>🔋 Radar ${ready ? '<b>chargé</b>' : `${ch} / ${RAD_CHARGE} pas`}</span><span class="radchg"><i style="width:${ch / RAD_CHARGE * 100}%"></i></span></div>
    <button class="btn ${ready && !r.grid.some(p => p.kind !== 'weak') ? 'pri' : ''}" data-act="radon" ${ready && Gm.teamAlive() ? '' : 'disabled'}>📡 ${r.grid.length || r.n ? 'Relancer le Radar' : 'Activer le Radar'}</button>`;
}
function radRefresh() { const g = document.querySelector('.radgrid'); if (g) g.outerHTML = radGridHTML(); const c = document.querySelector('#radctl'); if (c) c.innerHTML = radCtlHTML(); const ch = document.querySelector('#radchain'); if (ch) ch.innerHTML = radChainHTML() }
function radChainHTML() { const r = radState(); const s = r.s ? sp(r.s) : null; return s ? `${spr(s.ix, 0, 'tri')}<div><small>Chaîne en cours</small><b>${esc(s.n)} <span class="rcn">×${r.n}</span></b></div>` : `<div><small>Chaîne en cours</small><b>Aucune</b><small class="mut">Le premier Pokémon battu ou capturé lance la chaîne.</small></div>` }
function renderRadar() {
  const S = Gm.get(); const z = Gm.zone(view.zid); const r = radState();
  const rate = Gm.radarShRate(r.n); const pf = radPerfect(r.n);
  return `<section class="hero radhero bio-${z.bio}"><button class="back" data-go="zone" data-arg="${z.id}">← ${esc(z.n)}</button><p class="eyebrow">Zone ${z.id} · N. ${z.lv[0]}–${z.lv[1]}</p><h1>📡 Poké Radar</h1><p class="sub">Déplacez-vous avec les flèches du clavier (ou ZQSD), la croix ou en touchant une case. Marchez dans une herbe qui bouge pour la combattre. Battez ou capturez le même Pokémon pour faire grandir la chaîne : plus elle est longue, plus une herbe peut scintiller (chromatique garanti).</p></section>
  <div class="radwrap">
    <div class="radmap">${radGridHTML()}
      <div class="dpad" aria-label="Se déplacer"><button class="btn" data-act="radmv" data-d="u" aria-label="Haut">▲</button><button class="btn" data-act="radmv" data-d="l" aria-label="Gauche">◀</button><button class="btn" data-act="radmv" data-d="d" aria-label="Bas">▼</button><button class="btn" data-act="radmv" data-d="r" aria-label="Droite">▶</button></div>
    </div>
    <div class="radside">
      <div class="radchain" id="radchain">${radChainHTML()}</div>
      <div id="radctl" class="radctl">${radCtlHTML()}</div>
      <table class="kv radkv"><tr><th>Herbe scintillante (par herbe qui bouge fort)</th><td>${r.s ? '1 / ' + Math.round(1 / rate) : '—'}</td></tr><tr><th>IV parfaits garantis</th><td>${r.s ? pf : 0}${pf < 3 ? ` <small class="mut">(${pf + 1} dès ${[20, 40, 60][pf]})</small>` : ''}</td></tr><tr><th>Record</th><td>${S.stats.radarBest || 0}</td></tr></table>
      <button class="btn" data-act="heal">Centre Pokémon</button>
      <div class="radleg"><p><span class="lg rapid"></span><b>Bouge fort</b> : presque toujours le Pokémon de la chaîne (plus souvent loin de vous).</p><p><span class="lg normal"></span><b>Bouge doucement</b> : un Pokémon au hasard de la zone ; si ce n’est pas le même, la chaîne repart à zéro.</p><p><span class="lg weak"></span><b>Frémit à peine</b> : du vent, rien dedans. La chaîne est brisée.</p><p><span class="lg shiny"></span><b>Scintille</b> : chromatique garanti !</p><p class="mut">Les Légendaires et Fabuleux n’apparaissent jamais au Poké Radar. Après chaque victoire ou capture, de nouvelles herbes bougent toutes seules. Le Radar se recharge en ${RAD_CHARGE} pas ; le relancer à la main brise la chaîne en cours, comme dans les jeux. S’éloigner de toutes les herbes qui bougent (elles sortent de l’écran), fuir ou perdre brise aussi la chaîne. Les herbes peuvent tromper : une herbe qui bouge fort a parfois l’air de bouger doucement, et l’inverse.</p></div>
    </div>
  </div>`;
}



// ---------- menu theme: the player's own track, played outside battles (nothing if no track imported)
function menuMusic(force) { const S = Gm.get(); if (!W.Sound || busy || farm.on || !S || S.set.music === 0) return; if (!force && W.Sound._want === 'menu' && W.Sound._el) return; W.Sound.unlock(); W.Sound.play('menu') }
document.addEventListener('pointerdown', () => menuMusic(), { once: true, capture: true });

// ---------- POKÉMON PARTENAIRE
const PRT_PERKS = [[1, '+5 % d’Exp. pour votre partenaire'], [2, 'Trouve parfois un objet après une victoire (1 fois sur 15)'], [3, 'Peut tenir à 1 PV sur un coup fatal (10 %, 1 fois par combat)'], [4, '+10 % d’Exp. pour toute l’équipe'], [5, 'Peut repousser une altération de statut (20 %) · ruban et aura']];
const HEART = cls => `<svg class="hrt ${cls || ''}" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21.3s-7.6-4.7-10.2-9.5C.1 8.4 2 3.6 6.4 3.6c2.4 0 4 1.3 5.6 3.4 1.6-2.1 3.2-3.4 5.6-3.4 4.4 0 6.3 4.8 4.6 8.2C19.6 16.6 12 21.3 12 21.3z"/></svg>`;
const heartsHTML = (m, cls = '') => { const h = Gm.hearts(m); return `<span class="hearts ${cls}" title="Lien : ${h}/5 cœurs">${HEART('on').repeat(h)}${HEART().repeat(5 - h)}</span>` };
function partnerLine(m, zid) {
  const n = monName(m); const h = Gm.hearts(m); const L = [`${n} vous suit de près.`, `${n} regarde autour de lui avec curiosité.`];
  if (zid) { const w = Gm.zoneWeather(zid); if (w.k === 'rain') L.push(`${n} s’ébroue sous la pluie.`); if (w.k === 'sun') L.push(`${n} profite du soleil.`); if (w.k === 'snow') L.push(`${n} attrape des flocons.`); if (w.k === 'fog') L.push(`${n} reste tout près de vous dans le brouillard.`); if (w.k === 'wind') L.push(`${n} lutte contre le vent.`); if (w.k === 'sand') L.push(`${n} plisse les yeux dans le sable.`) }
  if (Gm.isNight()) L.push(`${n} bâille… il se fait tard.`);
  if (m.hp <= 0) return `${n} est épuisé… un passage au Centre Pokémon ?`;
  if (m.hp < P.maxHP(m) / 3) L.push(`${n} a l’air fatigué.`);
  if (h >= 3) L.push(`${n} vous fait entièrement confiance.`, `${n} a hâte du prochain combat !`);
  if (h >= 5) L.push(`${n} ne vous quitterait pour rien au monde. 💗`);
  if (h === 0) L.push(`${n} apprend encore à vous connaître.`);
  return P.pick(L);
}
function partnerZoneHTML(zid) { const m = Gm.partner(); if (!m) return ''; const joy = W.__prtJoy && Date.now() - W.__prtJoy < 8000; const h5 = Gm.hearts(m) >= 5; return `<button class="prtz ${joy ? 'joy' : ''} ${h5 ? 'h5' : ''}" data-act="partner" title="Votre partenaire">${monIcon(m, 'prtspr')}${joy && h5 ? `<span class="joyh">${HEART('on')}</span>` : ''}<span class="bub">${esc(joy ? (h5 ? `${monName(m)} saute de joie ! 💗` : `${monName(m)} est content de cette victoire !`) : partnerLine(m, zid))}</span></button>` }
async function partnerMenu() {
  const S = Gm.get();
  const body = () => {
    const pm = Gm.partnerMon(); const act = Gm.partner();
    const pickGrid = `<div class="prtpick">${S.team.map(m => `<button class="${m.u === S.partner ? 'on' : ''}" data-pp="${m.u}">${monIcon(m, 'tri')}<b>${esc(monName(m))}</b>${heartsHTML(m, 'sm')}</button>`).join('')}</div>`;
    if (!pm) return `<h3>🤝 Pokémon partenaire</h3><p class="mut">Choisissez un Pokémon de votre équipe : il vous accompagne partout, et votre lien grandit à chaque victoire où il combat. Le lien reste sur le Pokémon même si vous en changez, mais seuls les bonus du partenaire actif comptent.</p>${pickGrid}`;
    const h = Gm.hearts(pm); const need = Gm.heartNeed(pm); const p = pm.pf || 0; const pct = h >= 5 ? 100 : p / need * 100; const days = pm.pfD ? Math.max(1, Math.ceil((Date.now() - pm.pfD) / 864e5)) : 1;
    const fl = Gm.feedLeft(); const br = Gm.berries();
    return `<div class="prthead ${h >= 5 ? 'max' : ''}"><div class="prtart">${monIcon(pm, 'big')}</div><div><p class="eyebrow">Votre partenaire${act ? '' : ' · <span class="bad">au PC : bonus inactifs</span>'}</p><h3>${esc(monName(pm))} <small>N.${pm.lv}</small></h3>${heartsHTML(pm, 'hlg')}<div class="prtbar"><u style="width:${pct}%"></u></div><small class="mut">${h >= 5 ? 'Lien au maximum !' : `${fmt(p)} / ${fmt(need)} Pokémon battus vers ${h + 1} cœur${h + 1 > 1 ? 's' : ''}`}</small></div></div>
    <div class="prtstats"><span><b>${fmt(pm.pfW || 0)}</b><small>victoires ensemble</small></span><span><b>${fmt(pm.pfK || 0)}</b><small>K.O. infligés</small></span><span><b>${fmt(days)}</b><small>jour${days > 1 ? 's' : ''} ensemble</small></span></div>
    <div class="prthow"><b>Comment monter le lien ?</b><span>⚔ <b>+1</b> par Pokémon adverse battu dans un combat où il a combattu (sauvages, dresseurs, Arènes, Tour…)</span><span>🍓 <b>+5</b> par baie donnée, ${Gm.PRT_FEED} par jour maximum</span><span>${HEART('on')} ${Gm.PRT_T.map((n, i) => `${i + 1} : ${fmt(n)}`).join(' · ')} <span class="mut">(le compteur repart à 0 à chaque cœur)</span></span><span class="mut">Il doit être dans l’équipe. Le lien ne baisse jamais.</span></div>
    <div class="prtperks">${PRT_PERKS.map(([n, t]) => `<div class="${h >= n ? 'on' : ''}"><em class="hearts sm">${HEART('on').repeat(n)}</em><span>${t}</span></div>`).join('')}</div>
    <div class="prtfeed"><button class="btn" data-pfeed ${act && fl > 0 && br.length ? '' : 'disabled'}>🍓 Donner une baie${br.length ? ` (${esc(br[0])})` : ''}</button><small class="mut">${!br.length ? 'Aucune baie dans le Sac.' : `+5 de lien · encore ${fl}/${Gm.PRT_FEED} aujourd’hui`}</small></div>
    <h4>Changer de partenaire</h4><p class="mut small">Chaque Pokémon garde son lien et ses cœurs. Seul le partenaire actif donne ses bonus, ils ne s’additionnent pas.</p>${pickGrid}${S.partner ? '<button class="mini" data-pp="">Ne plus avoir de partenaire</button>' : ''}`;
  };
  await UI.modal(`<div class="prtbox">${body()}</div>`, { cls: 'prtmodal', onClick: (e, close, wrap) => {
    const box = wrap.querySelector('.prtbox');
    const pp = e.target.closest('[data-pp]'); if (pp) { Gm.setPartner(pp.dataset.pp); Gm.save(true); box.innerHTML = body(); header(); return }
    if (e.target.closest('[data-pfeed]')) { const r = Gm.partnerFeed(); if (r) { const m = Gm.partner(); UI.toast(`${esc(monName(m))} a mangé la ${esc(r.b)} ! ${r.up ? `💗 ${r.up} cœur${r.up > 1 ? 's' : ''} !` : `<span class="hearts sm">${HEART('on')}</span> +5`}`); Gm.save(true); box.innerHTML = body(); header() } }
  } });
  render();
}

// ---------- MINE SOUTERRAINE
const minev = { tool: 'pick' };
function mineBoxHTML() {
  const m = Gm.mineTick(); if (!m.cur) Gm.mineNew(); const c = m.cur; const M = Gm.MINE; const nx = Gm.mineNext();
  const pct = m.ch / M.MAX * 100;
  const coups = `<div class="minech"><span class="mcoup">⛏ <b>${m.ch}</b>/${M.MAX} coups</span><i class="mcbar"><u style="width:${pct}%"></u></i><small>${m.ch < M.MAX ? `+1 coup dans <b class="minet">${dnFmt(nx)}</b> (1 toutes les 2 min, même jeu fermé)` : 'Réserve pleine'}</small></div>`;
  const got = c.items.filter(i => i.got);
  const peek = it => { for (let y = it.y; y < it.y + it.h; y++) for (let x = it.x; x < it.x + it.w; x++) if (!c.cell[y * M.W + x]) return true; return false };
  const items = c.items.map(it => `<div class="mitem ${it.got ? 'got' : peek(it) ? 'peek' : ''}" style="grid-column:${it.x + 1} / span ${it.w};grid-row:${it.y + 1} / span ${it.h}">${UI.itemIcon(it.n, 'mii')}</div>`).join('');
  const cells = c.cell.map((v, i) => `<button class="mcell h${v}${v && c.orig && c.orig[i] > v ? ' cr' + Math.min(3, c.orig[i] - v) : ''}" data-act="minehit" data-i="${i}" aria-label="Roche" ${c.over ? 'disabled' : ''}></button>`).join('');
  return `${coups}
  <div class="minebar"><span class="mfound">${got.length}/${c.items.length} trésors trouvés</span>
    <div class="mtools"><button class="${minev.tool === 'pick' ? 'on' : ''}" data-act="minetool" data-t="pick" title="2 sur la case, 1 autour en croix">⛏ Pioche <small>précise · 1 coup</small></button><button class="${minev.tool === 'hammer' ? 'on' : ''}" data-act="minetool" data-t="hammer" title="2 sur la case, 1 sur les 8 autour">🔨 Marteau <small>large · 2 coups</small></button></div></div>
  <div class="minewall ${c.over ? 'over' : ''} ${!c.over && m.ch < 1 ? 'nocoup' : ''}" style="--mw:${M.W};--mh:${M.H}"><div class="mlayer items">${items}</div><div class="mlayer cells">${cells}</div>
    ${c.over ? `<div class="mineover"><b>✨ Tout a été déterré !</b><p>Trouvé : ${got.map(i => `${UI.itemIcon(i.n, 'ii sm')} ${esc(i.n)}`).join(', ')}</p><button class="btn pri" data-act="minenew">Paroi suivante</button></div>` : ''}</div>
  <p class="mut minehint">${c.over ? '' : `Un trésor est récupéré quand toutes ses cases sont dégagées. La paroi se renouvelle quand tous ses trésors ont été trouvés.${m.ch < 1 ? ' <b>Plus de coups : revenez plus tard !</b>' : ''}`}</p>`;
}
function renderMine() {
  const S = Gm.get();
  if (!Gm.mineOpen()) return `<section class="hero"><button class="back" data-go="map">← Carte</button><h1>⛏ Mine souterraine</h1></section><div class="emptystate"><span>🔒</span><b>Mine fermée</b><p>Obtenez votre premier badge pour y accéder.</p></div>`;
  return `<section class="hero minehero"><button class="back" data-go="map">← Carte</button><p class="eyebrow">Sous la région de ${REGION}</p><h1>⛏ Mine souterraine</h1><p class="sub">Creusez la paroi pour déterrer des trésors, des Pierres évolutives et des Plaques. Les Pokémon sauvages ne laissent plus d’objets : tout se trouve ici. Chaque coup se recharge avec le temps.</p><p class="mut">Parois creusées : ${fmt(S.stats.mineWalls || 0)} · objets trouvés : ${fmt(S.stats.mineItems || 0)}</p></section><div id="minebox">${mineBoxHTML()}</div>
  <section class="blk"><h2>Ce qu’on peut trouver</h2><div class="minelist">${Gm.MINE_LOOT.filter((x, i, a) => !/^Plaque /.test(x[0]) || a.findIndex(y => /^Plaque /.test(y[0])) === i).map(([n, w]) => `<span class="mloot">${UI.itemIcon(/^Plaque /.test(n) ? n : n, 'ii')}<b>${/^Plaque /.test(n) ? 'Plaques (×17)' : esc(n)}</b><small>${w >= 8 ? 'courant' : w >= 3 ? 'peu courant' : w >= 1 ? 'rare' : 'très rare'}</small></span>`).join('')}</div></section>`;
}
function mineDebris(wall, i, tool) {
  const M = Gm.MINE; const x = (i % M.W + 0.5) / M.W * 100, y = (Math.floor(i / M.W) + 0.5) / M.H * 100; const n = tool === 'hammer' ? 14 : 8;
  for (let k = 0; k < n; k++) { const d = document.createElement('i'); d.className = 'mdeb'; d.style.left = x + '%'; d.style.top = y + '%'; const sz = 3 + Math.random() * 5; d.style.width = d.style.height = sz + 'px'; d.style.background = ['#8a6a48', '#6f5236', '#a88a64', '#563e28'][k % 4]; wall.appendChild(d);
    const ang = Math.random() * Math.PI * 2, dist = 20 + Math.random() * (tool === 'hammer' ? 70 : 45);
    d.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist * .6 - 10}px)) rotate(${ang * 90}deg)`, opacity: 1, offset: .5 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.3}px), calc(-50% + ${Math.sin(ang) * dist * .6 + 40}px)) rotate(${ang * 180}deg)`, opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.6,.5,1)' }).onfinish = () => d.remove() }
  const dust = document.createElement('i'); dust.className = 'mdust'; dust.style.left = x + '%'; dust.style.top = y + '%'; wall.appendChild(dust); setTimeout(() => dust.remove(), 700);
}
function mineRefresh() { const b = document.getElementById('minebox'); if (b) b.innerHTML = mineBoxHTML() }
function moreNotes() { const S = Gm.get(); if (!S) return {}; const o = {}; try { if (Gm.dailyReady()) o.daily = 1 } catch (e) { } try { const q = Gm.qReady(); if (q) o.quests = q } catch (e) { } try { if (Gm.raidReady()) o.raid = 1 } catch (e) { } return o }
function renderMore() {
  const S = Gm.get(); const mn = moreNotes();
  const card = (go, ic, t, d, lock) => `<button class="mcard ${lock ? 'locked' : ''} ${!lock && mn[go] ? 'notif' : ''}" ${lock ? 'disabled' : `data-go="${go}"`}>${!lock && mn[go] ? '<i class="mdot"></i>' : ''}<span class="mic">${lock ? '🔒' : ic}</span><span class="mtx"><b>${t}</b><small>${lock || d}</small></span></button>`;
  const grp = (t, cards) => `<section class="mgrp"><h2>${t}</h2><div class="mgrid">${cards.join('')}</div></section>`;
  const nAch = Object.keys(S.ach || {}).filter(k => ACH.some(a => a.k === k)).length;
  const C = {
    league: card('league', '🏆', 'Ligue Pokémon', S.champ ? `Maître ${S.champTimes} fois · revanche niveau 87-90` : 'Conseil 4 puis Maître de la Ligue', Gm.leagueOpen() ? '' : '8 badges et Route Victoire terminée'),
    raid: card('raid', '💎', 'Raids Téra', (() => { const R = Gm.raidFresh(); return R.cur ? `Raid ${'★'.repeat(R.cur.stars)} disponible !` : `Prochain raid dans ${untilTxt(Gm.raidLeft())}` })()),
    tower: card('tower', '🗼', 'Tour de Combat', `Record : ${S.tower.best1} (simple) · ${S.tower.best2} (double) · ${S.tower.pts} PCo`, S.champ ? '' : 'Après la Ligue'),
    rematch: card('rematch', '⚔️', 'Revanches des Champions', 'Les 8 Champions, niveau 82-90', S.champ ? '' : 'Après la Ligue'),
    daily: card('daily', '🎁', 'Récompense du jour', (() => { try { return Gm.dailyReady() ? 'Votre cadeau du jour vous attend !' : 'Déjà récupérée · revenez demain' } catch (e) { return '' } })()),
    quests: card('quests', '📜', 'Quêtes', (() => { const n = Gm.qReady(); return n ? `${n} récompense${n > 1 ? 's' : ''} à récupérer !` : '3 quêtes du jour et 3 de la semaine' })()),
    ach: card('ach', '🏅', 'Succès', `${nAch} / ${ACH.length} débloqués`),
    gift: card('gift', '✉️', 'Cadeaux mystère', 'Entrez un code pour recevoir un cadeau'),
    trade: card('trade', '🔁', 'Échanges', 'Envoyez et recevez des Pokémon avec un code', S.champ ? '' : 'Après la Ligue'),
    mine: card('mine', '⛏', 'Mine souterraine', (() => { try { const m = Gm.mineTick(); return `${m.ch}/${Gm.MINE.MAX} coups disponibles` } catch (e) { return '' } })(), Gm.mineOpen() ? '' : 'Après le premier badge'),
    fusion: card('fusion', '🥚', 'Pension et Fusion', (() => { const e = Gm.dcEggs(); return e ? `${e} œuf${e > 1 ? 's' : ''} à récupérer !` : 'Œufs, EV et fusion de Pokémon' })()),
    profile: card('profile', '🪪', 'Carte de Dresseur', 'Profil, équipe, badges et temps de jeu'),
    stats: card('stats', '📊', 'Statistiques', `${fmt(S.stats.enc)} rencontres · ${fmt(S.stats.caught)} captures`),
    help: card('help', '📖', 'Règles et taux', 'Raretés, chromatiques, séries, événements'),
    save: card('save', '💾', 'Sauvegarde', W.claude && W.claude.use && !W.ASSET_ROOT ? 'Automatique, sur cet appareil et en ligne' : 'Automatique · export dans un fichier'),
    opts: card('opts', '⚙️', 'Options', 'Vitesse du texte, son, thème, couleurs'),
    news: card('news', '📰', 'Nouveautés', `Version ${NEWS[0].v} · ${NEWS[0].t}`),
    tuto: card('tuto', '🧭', 'Tutoriel', 'Revoir les bases du jeu') };
  if (W.__plusV2) { const nl = notifList(); const g = nextGoal();
    return `<section class="hero"><p class="eyebrow">Tableau de bord</p><h1>Plus</h1></section>
    <section class="todo"><h2>À faire maintenant</h2><div class="todog">${g ? `<button class="todoc main" data-go="${g.go}" ${g.arg ? `data-arg="${g.arg}"` : ''}><span class="tdi">🎯</span><span><small>Objectif de l’aventure</small><b>${esc(g.t)}</b>${g.where ? `<em>${esc(g.where)}</em>` : ''}</span><i>›</i></button>` : ''}${nl.map(x => `<button class="todoc" data-go="${x.go}"><span class="tdi">${x.ic}</span><span><b>${esc(x.t)}</b></span><i>›</i></button>`).join('') || '<p class="mut">Rien d’autre en attente : tout est à jour !</p>'}</div></section>
    <div class="mcols">${grp('Combats', [C.league, C.raid, C.tower, C.rematch])}${grp('Récompenses', [C.daily, C.quests, C.ach, C.gift])}${grp('Mon dresseur', [C.profile, C.stats, C.mine, C.trade])}${grp('Réglages', [C.news, C.tuto, C.opts, C.save, C.help])}</div>
    <p class="mut foot">Jeu de fans non officiel, sans lien avec The Pokémon Company ni Nintendo.</p>` }
  return `<section class="hero"><p class="eyebrow">Menu</p><h1>Plus</h1></section>
  ${grp('Combats', [C.league, C.raid, C.tower, C.rematch])}
  ${grp('Récompenses', [C.daily, C.quests, C.gift, C.ach])}
  ${grp('Activités', [C.mine, C.trade])}
  ${grp('Mon dresseur', [C.profile, C.stats])}
  ${grp('Réglages', [C.news, C.tuto, C.opts, C.save, C.help])}
  <p class="mut foot">Jeu de fans non officiel, sans lien avec The Pokémon Company ni Nintendo. Données d’attaques et d’évolutions : PokéAPI ; sprites : votre Pokédex.</p>`;
}
function renderStats() {
  const S = Gm.get(); const dc = Gm.dexCount(); const t = Math.round((Date.now() - S.stats.started) / 86400000);
  const rows = [['Rencontres', S.stats.enc], ['Captures', S.stats.caught], ['Chromatiques capturés', S.stats.shinies], ['Légendaires capturés', S.stats.legs], ['Épiques capturés', S.stats.epics], ['Combats', S.stats.battles || 0], ['Victoires', S.stats.wins], ['Pokédex (espèces)', dc.cb + ' / 1025'], ['Pokédex (avec formes)', dc.c + ' / ' + dc.tot], ['Badges', Gm.badges() + ' / 8'], ['Maître de la Ligue', S.champTimes + ' fois'], ['Tour de Combat', `${S.tower.best1} / ${S.tower.best2}`], ['Aventure commencée', `il y a ${t} jour${t > 1 ? 's' : ''}`]];
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Statistiques</h1></section><table class="kv">${rows.map(r => `<tr><th>${r[0]}</th><td>${typeof r[1] === 'number' ? fmt(r[1]) : r[1]}</td></tr>`).join('')}</table>`;
}
function renderHelp() {
  const S = Gm.get(); const R0 = Gm.RATE; const T = (a, rows) => `<h3>${a}</h3><table class="kv">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>`;
  const fr = n => '1 / ' + fmt(n);
  const ch = S.chain && S.chain.n >= 2 ? `${esc(sp(S.chain.s).n)} ×${S.chain.n}` : 'aucune';
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Règles et taux</h1><p class="sub">Tous les taux du jeu, à jour.</p></section><div class="prose">
  <p>Chaque exploration tire d’abord la rareté, puis une espèce de cette rareté parmi celles de la zone et de l’heure (☀ jour, ☾ nuit).</p>
  ${T('Rencontres sauvages', [['Légendaire', fr(R0.leg) + ' (zones qui en ont)'], ['Épique', fr(R0.epic)], ['Rare', fr(R0.rare)], ['Peu commun', '≈ 35 % du reste'], ['Commun', '≈ 65 % du reste']])}
  ${T('Chromatiques', [['Taux de base', fr(R0.shiny)], ['Avec le Charme Chroma (Pokédex complet : 1 025 espèces)', fr(R0.shiny / 2)], ['Série de captures (même espèce)', 'chance ×1 à ×1,75 selon la série (max à 30 captures) : ≈ 1/570 sans Charme'], ['Œufs de la Pension', `1 / ${fmt(Gm.EGG_SHINY)} fixe (le Charme ne compte pas)`], ['Œufs de type (Tour)', 'taux de base (Charme compris)'], ['Raids Téra', '1 / 300'], ['Starter (réinitialisation)', fr(R0.shiny)], ['Shinyficateur', 'garanti : 1 500 PCo à la Tour de Combat']])}
  ${T('Série de captures (catch combo)', [['Votre série actuelle', ch], ['Apparition de l’espèce', 'Commun : jusqu’à +25 % · Peu commun : jusqu’à +20 % · Rare : jusqu’à +4 % · Épique : jusqu’à +1,5 % (hors légendaires)'], ['Talent caché', '1 / 300, puis 1 / 100 à partir de 50 captures d’affilée'], ['Rupture', 'capturer une autre espèce remet la série à 1']])}
  ${T('Poké Radar (après la Ligue)', [['Herbe qui bouge fort', 'le Pokémon de la chaîne'], ['Herbe scintillante', `chromatique garanti ; chance par herbe : ${fr(350)} au début, puis de mieux en mieux jusqu’à ${fr(75)} à 40 de chaîne (Charme Chroma : ×2)`], ['IV parfaits garantis', '1 dès 20 de chaîne, 2 dès 40, 3 dès 60'], ['Rupture', 'fuir, perdre, herbe vide, autre espèce, quitter le Radar, aucune herbe qui bouge']])}
  ${T('Talent caché', [['Pokémon sauvage', '1 / 300'], ['Série de 50 captures et plus', '1 / 100'], ['Patch Talent', 'donne le talent caché']])}
  ${T('Encens (un seul à la fois, 500 rencontres)', [['Encens Rare', 'rares ×2'], ['Encens Épique', 'épiques ×3'], ['Encens Légendaire', 'légendaires ×2 (après la Ligue)']])}
  ${T('Journée Communauté (annoncée sur le Discord)', [['Apparition', 'le Pokémon choisi apparaît dans toutes les zones, environ 1 combat sur 3'], ['Chromatique', `1 / ${Math.round(R0.shiny / Gm.CD_SHINY)} pour ce Pokémon (au lieu de 1 / ${R0.shiny})`], ['Activation', 'automatique dans l’application Windows et la version zip, ou avec le code publié sur le Discord dans Plus → Cadeaux mystère'], ['Légendaires', 'ils gardent leur place, la Journée Communauté ne les remplace pas']])}
  ${T('Événement Halloween (20 octobre – 15 novembre)', [['Apparition', 'Ténéfix, Pichu et Fantominus apparaissent 1 fois sur 100 dans leur zone'], ['Palette Halloween', '1 / 10 quand on en rencontre un (Ténéfix, famille Pichu, famille Fantominus)'], ['Chromatique', 'taux normal'], ['Évolution', 'la palette est conservée']])}
  ${T('Pension', [['Œuf', `toutes les ${Gm.EGG_MS / 60000} minutes (10, ou 7 avec le Charme Ovale), ${Gm.EGG_MAX} en attente au maximum`], ['Chromatique', `1 / ${fmt(Gm.EGG_SHINY)}`], ['IV hérités', '3 (5 avec un Nœud Destin)'], ['Nature', 'transmise avec une Pierre Stase'], ['Pokémon acceptés', 'Métamorph + n’importe quel Pokémon sauf les légendaires'], ['2ᵉ Pension', fmt(Gm.DC2_PRICE) + ' ₽']])}
  ${T('Œufs de type (Tour, mode Monotype)', [['Rare', 'au minimum'], ['Épique', '1 / 50'], ['Légendaire', '1 / 1 000']])}
  ${T('Raids Téra (un toutes les 3 h)', [['Légendaire', '1 / 1 000'], ['Étoiles', '1–2★ au début, jusqu’à 5–6★ après la Ligue'], ['Master Ball', '5 % sur un raid 6★'], ['Capture du Pokémon', '1 chance sur 2 avec la Ball de raid, quelle que soit sa rareté, au niveau max actuel']])}
  ${T('Sommeil', [['Durée', '1 à 3 tours au hasard (Repos : 2 tours), comme depuis la 5ᵉ génération'], ['Réveil', 'le Pokémon agit le tour où il se réveille ; le compteur ne baisse que quand il essaie d’agir et il est conservé s’il est remplacé'], ['Matinal', 'dort deux fois moins longtemps']])}
  ${T('Récompense du jour', [['Calendrier', 'un petit cadeau par jour du mois (menu Plus), les jours manqués sont perdus']])}
  ${T('Objets', [['Ultra-Chimères', 'capture ×5 avec l’Ultra Ball, ×0,1 avec toute autre Ball (sauf Master Ball)'], ['Trésors (Perles, Pépites, Champis…)', 'dans la Mine souterraine (les Pokémon sauvages n’en laissent plus)'], ['Pokémon sauvages', 'ne tiennent plus d’objet'], ['Pièces de Mordudor', '1 par Mordudor battu dans la nature ; 250 pour l’évolution en Gromago']])}
  ${T('Statistiques', [['IV', '0 à 31 par stat ; légendaires sauvages : 3 IV à 31, épiques : 1'], ['EV (zone EV)', '+6 par victoire dans la stat choisie, toute l’équipe avec le Multi Exp ; 252 par stat, 510 au total'], ['Baies EV', '−10 EV dans une stat'], ['PP Plus', '+20 % de PP max, 3 fois maximum (PP Max : directement +60 %)'], ['Fusion (IV)', 'environ la moyenne des deux Pokémon, avec un petit bonus et un peu de chance : le résultat peut baisser ou monter (ex. 60 % + 37 % → 50 à 57 %). Au-dessus du meilleur des deux, le gain est faible : +5 % max sous 80 %, +3 % de 80 à 90 %, +2 % au-delà. Pour améliorer un 90 %, il faut un autre Pokémon vers 87-90 %. Un chromatique n’est jamais perdu']])}
  ${T('Expérience et niveaux', [['Multi Exp', '50 % de l’Exp. aux Pokémon qui n’ont pas combattu'], ['Œuf Chance', '+50 % d’Exp.'], ['Niveau maximum', 'dépend de votre zone la plus avancée (jusqu’à la zone 25), puis de la Ligue ; aucun après la Ligue'], ['Super Bonbon', 'ne dépasse jamais le niveau maximum']])}
  ${T('Tour de Combat (niveau 50)', [['Équipes', '6 Pokémon dans tous les modes'], ['PCo par victoire (Solo / Duo)', '3, +2 tous les 7 combats de série, +20 contre la Tête de la Tour'], ['Monotype', '2 PCo, 2 000 ₽ et un Œuf de type par victoire'], ['Shinyficateur', '1 500 PCo']])}
  ${T('Genres', [['Répartition', 'celle des jeux officiels (ex. Apitrini femelle 1 / 8)'], ['Évolutions', 'certaines dépendent du genre (Apitrini ♀ → Apireine, Kirlia ♂ + Pierre Aube → Gallame…)']])}
  ${T('Jour et nuit', [['Cycle', '40 minutes : 28 min de jour puis 12 min de nuit']])}
  ${T('Pokémon partenaire (bouton 🤍 sur une carte de l’Équipe)', [['Lien', '+1 par Pokémon adverse battu quand il combat · +5 par baie (3 par jour) · le compteur repart à 0 à chaque cœur'], ...PRT_PERKS.map(([n, t]) => ['<span class="hearts sm">' + HEART('on').repeat(n) + '</span> (' +  fmt(Gm.PRT_T[n - 1]) + ' de plus)', t]), ['Changer', 'chaque Pokémon garde ses cœurs ; seuls les bonus du partenaire actif comptent']])}
  ${T('Météo des zones (change toutes les 5 minutes)', [['🌤 Temps clair', 'Électrik ×1,4'], ['🌧 Pluie', 'Eau et Insecte ×1,4 · pluie en combat'], ['☀ Grand soleil', 'Feu, Plante et Normal ×1,4 · soleil en combat'], ['❄ Neige', 'Glace ×1,4 · neige en combat'], ['🌪 Tempête de sable', 'Roche, Sol et Acier ×1,4 · tempête de sable en combat'], ['🌫 Brouillard', 'Spectre, Psy, Fée et Ténèbres ×1,4'], ['🍃 Grand vent', 'Vol et Dragon ×1,4'], ['Selon la zone', 'chaque zone a sa météo probable : neige en montagne, sable dans le désert, brouillard au cimetière…']])}
  <h3>Combat auto</h3><p>Le mode auto choisit l’attaque qui fait le plus de dégâts et change d’attaque si elle ne fait rien. Il ne consomme pas de PP. Il se met en pause face à un chromatique, un Épique ou un Légendaire (sauf en farm auto).</p></div>`;
}
const MCATS = [['menu', 'Thème du menu (hors combat)'], ['wild', 'Pokémon sauvages'], ['trainer', 'Dresseurs'], ['gym', 'Champions d’Arène'], ['e4', 'Conseil 4'], ['champion', 'Maître de la Ligue']];
async function refreshSfx() { if (!W.Sound) return; for (const [k] of W.Sound.SFX_SLOTS) { const el = document.querySelector(`.trk[data-sk="${k}"] .tname`); if (!el) continue; const t = await W.Sound.getTrack('sfx:' + k); el.textContent = t ? t.name : 'Bruitage du jeu' } }
async function refreshTracks() { if (!W.Sound) return; refreshSfx(); for (const [k] of MCATS) { const el = document.querySelector(`.trk[data-k="${k}"] .tname`); if (!el) continue; const t = await W.Sound.getTrack(k); el.textContent = t ? t.name : 'Musique du jeu'; const r = document.querySelector(`.trk[data-k="${k}"] input[data-tv]`), o = document.querySelector(`.trk[data-k="${k}"] output`); if (r) { r.disabled = !t; r.value = t ? (t.vol == null ? 100 : t.vol) : 100; if (o) o.textContent = t ? r.value + ' %' : '—' } } }
function volCtl(st) { const mv = st.mvol == null ? 50 : st.mvol, svv = st.svol == null ? 80 : st.svol; return `<div class="vols"><div class="vrow"><button class="btn sm ${st.music === 0 ? '' : 'on'}" data-act="optsnd" data-k="music">${st.music === 0 ? 'Musique coupée' : 'Musique'}</button><input type="range" min="0" max="100" step="1" value="${mv}" data-vol="mvol" aria-label="Volume de la musique"><output>${mv} %</output></div><div class="vrow"><button class="btn sm ${st.sfx === 0 ? '' : 'on'}" data-act="optsnd" data-k="sfx">${st.sfx === 0 ? 'Bruitages coupés' : 'Bruitages'}</button><input type="range" min="0" max="100" step="1" value="${svv}" data-vol="svol" aria-label="Volume des bruitages"><output>${svv} %</output></div></div>` }
W.volCtl = volCtl;
const SHCOL = [['jaune', 'Jaune', 'hue-rotate(0deg)', '#ffcf3a'], ['bleu', 'Bleu', 'hue-rotate(170deg) saturate(1.2)', '#4aa3ff'], ['rouge', 'Rouge', 'hue-rotate(-45deg) saturate(1.4)', '#ff4d4d'], ['violet', 'Violet', 'hue-rotate(230deg) saturate(1.2)', '#a970ff'], ['rose', 'Rose', 'hue-rotate(285deg) saturate(1.1) brightness(1.1)', '#ff7ac3'], ['vert', 'Vert', 'hue-rotate(80deg) saturate(1.2)', '#47d16c']];
function applyShCol() { const S = Gm.get(); try { const R = document.documentElement; R.dataset.ui = (S && S.set.ui) || ''; R.dataset.cb = S && S.set.cb ? '1' : ''; R.dataset.bdim = S && S.set.bdim ? '1' : ''; R.style.setProperty('--bdim', String(((S && S.set.bdimv) || 45) / 100)); R.style.zoom = S && S.set.fs && S.set.fs !== 100 ? S.set.fs / 100 : '' } catch (e) { } const c = SHCOL.find(x => x[0] === ((S && S.set.shc) || 'jaune')) || SHCOL[0]; document.documentElement.style.setProperty('--shf', c[2]); document.documentElement.style.setProperty('--shc', c[3]) }
W.applyShCol = applyShCol;
function renderOpts() {
  const S = Gm.get();
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Options</h1></section><div class="prose">
  <h3>Dresseur</h3><p>Nom actuel : <b>${esc(S.name)}</b></p><div class="row-btns"><button class="btn" data-act="profedit">Renommer / personnaliser ma carte</button></div>
  <h3>Vitesse du texte en combat</h3><div class="seg">${[[1, 'Lente'], [2, 'Normale'], [3, 'Rapide'], [4, 'Éclair']].map(([v, l]) => `<button class="${S.set.speed === v ? 'on' : ''}" data-act="optspeed" data-v="${v}">${l}</button>`).join('')}</div>
  <h3>Raccourcis clavier</h3><div class="keyl">${KEYS.map(([k, l]) => `<div class="keyr"><span>${l}</span><span class="keycap">${esc(keysOf()[k].toUpperCase())}</span><button class="btn sm" data-act="optkey" data-k="${k}">Changer</button></div>`).join('')}</div>
  <h3>Notifications</h3><div class="ckl">${NOTIFS.map(([k, l]) => `<label class="ck"><input type="checkbox" data-opt="nt.${k}" ${notifOn(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
  <h3>Affichage</h3><p class="mut keep">Taille du texte</p><div class="seg">${[[90, 'Petit'], [100, 'Normal'], [115, 'Grand'], [130, 'Très grand']].map(([v, l]) => `<button class="${(S.set.fs || 100) === v ? 'on' : ''}" data-act="optfs" data-v="${v}">${l}</button>`).join('')}</div><div class="ckl"><label class="ck"><input type="checkbox" data-opt="cb" ${S.set.cb ? 'checked' : ''}> Mode daltonien (barres de PV bleu / orange / violet, types avec motif)</label><label class="ck"><input type="checkbox" data-opt="cbuy" ${S.set.cbuy !== 0 ? 'checked' : ''}> Demander confirmation pour les achats de 50 000 ₽ et plus</label><label class="ck"><input type="checkbox" data-opt="frep" ${S.set.frep !== 0 ? 'checked' : ''}> Afficher le bilan à la fin du farm auto</label></div><h3>Combat sombre</h3><div class="ckl"><label class="ck"><input type="checkbox" data-opt="bdim" ${S.set.bdim ? 'checked' : ''}> Assombrir l’écran pendant les combats (repose les yeux pendant les longues sessions de farm)</label></div><div class="vrow dimrow"><span>Intensité</span><input type="range" min="10" max="85" step="1" value="${S.set.bdimv || 45}" data-dim="1" aria-label="Intensité de l’assombrissement"><output>${S.set.bdimv || 45} %</output></div><p class="mut keep">Réglable aussi pendant un combat avec le bouton 🔊.</p>
  <h3>Thème de l’interface</h3><div class="uithemes">${UITHEMES.map(([k, l, c1, c2, c3]) => `<button class="uith ${(S.set.ui || '') === k ? 'on' : ''}" data-act="optui" data-v="${k}" style="--c1:${c1};--c2:${c2};--c3:${c3}"><span class="uisw"><i></i><i></i><i></i></span>${l}</button>`).join('')}</div>
  <h3>Couleur des étoiles chromatiques</h3><div class="shcols">${SHCOL.map(([k, l, f, c]) => `<button class="shcol ${(S.set.shc || 'jaune') === k ? 'on' : ''}" data-act="optshc" data-v="${k}" style="--c:${c}"><span style="filter:${f}">${SHI}</span>${l}</button>`).join('')}</div>
  <h3>Sprites des Pokémon</h3><div class="seg">${[['gif', 'Animés (GIF)'], ['home', 'Fixes (HOME, plus léger)']].map(([v, l]) => `<button class="${(S.set.spr || 'gif') === v ? 'on' : ''}" data-act="optspr" data-v="${v}">${l}</button>`).join('')}</div><p class="mut keep">Le mode fixe charge moins de données et soulage les petits PC et les téléphones. Les bordures animées deviennent aussi fixes.</p>
  <h3>Son</h3>${volCtl(S.set)}
  <h3>Recommencer</h3>${S.champ || W.ASSET_ROOT ? `<p>Efface votre partie${W.ASSET_ROOT ? '' : ' (sur ce navigateur et la copie en ligne)'} pour recommencer l’aventure depuis le début.</p><button class="btn danger" data-act="wipe">Recommencer une partie</button>` : '<p class="mut">Disponible une fois la Ligue Pokémon remportée.</p>'}</div>`;
}
function renderSave() {
  const S = Gm.get(); const c = Gm.cloud; const nat = W.valmaraNative; const online = !!(W.claude && W.claude.use) && !W.ASSET_ROOT;
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Sauvegarde</h1></section><div class="prose">
  <p>La partie est sauvegardée automatiquement après chaque action, sur cet appareil${c.ok ? ' et en ligne avec votre compte' : ''}.</p>
  ${online ? `<h3>Sauvegarde en ligne</h3><p>${c.ok ? `Active : copie privée liée à votre compte${c.last ? ', dernière synchro à ' + new Date(c.last).toLocaleTimeString('fr-FR') : ''}. Elle permet de reprendre sur un autre appareil.` : 'Indisponible dans cet affichage.'}${c.err ? ` (${esc(c.err)})` : ''}</p>${c.ok ? '<div class="row-btns"><button class="btn" data-act="cloudsave">Synchroniser maintenant</button><button class="btn" data-act="cloudload">Charger la sauvegarde en ligne</button></div>' : ''}`
    : `<h3>Version hors ligne</h3><p>Cette version n’a pas de sauvegarde en ligne : la partie reste sur cet ordinateur. Exportez-la de temps en temps dans un fichier, pour pouvoir la récupérer si besoin ou la copier sur un autre PC.</p>`}
  ${nat ? `<h3>Copies de secours automatiques</h3><p>Le jeu garde tout seul les ${nat.keep || 10} dernières copies de votre partie (une toutes les 10 minutes de jeu)${nat.last ? `, dernière à ${new Date(nat.last).toLocaleTimeString('fr-FR')}` : ''}.</p><div class="row-btns"><button class="btn" data-act="natbackup">Faire une copie maintenant</button><button class="btn" data-act="natfolder">Ouvrir le dossier des sauvegardes</button></div>` : ''}
  <h3>Fichier de sauvegarde</h3><p>Exportez votre partie dans un fichier, ou chargez une partie exportée (elle remplace la partie actuelle).</p>
  <div class="row-btns"><button class="btn pri" data-act="export">Exporter dans un fichier</button><button class="btn" data-act="importfile">Importer un fichier</button><button class="btn" data-act="importtxt">Coller une sauvegarde</button></div>
  <input type="file" id="impfile" accept=".json,.txt,application/json" hidden>
</div>`;
}

// ---------- LEAGUE
function renderLeague() {
  const S = Gm.get(); const run = S.lr;
  const re = S.champ ? 1 : 0;
  let h = `<section class="hero league-hero"><button class="back" data-go="map">← Carte</button><p class="eyebrow">Plateau de la Ligue</p><h1>Ligue Pokémon</h1><p class="sub">${run ? 'Défi en cours : impossible de quitter la Ligue avant d’avoir gagné ou perdu. Pas de Centre Pokémon ni de PC entre les combats ; le Sac et l’Équipe restent utilisables.' : re ? 'Revanche : tous les Pokémon gagnent 12 niveaux.' : 'Cinq combats d’affilée. Une défaite et il faut tout recommencer.'}</p></section><div class="lgl">`;
  G.LEAGUE.forEach((L, i) => {
    const st = run ? (i < run.i ? 'done' : i === run.i ? 'next' : '') : '';
    const lv = L.team.map(x => x[1] + (re ? 12 : 0));
    h += `<div class="lgc ${st}" style="--tc:${L.type ? TC[L.type] : 'var(--acc)'}"><p class="eyebrow">${esc(L.title)}${L.strat ? ' · ' + esc(L.strat) : L.type ? ' · ' + TL[L.type] : ''}</p><b>${esc(L.n)}</b><small>${L.team.length} Pokémon · N. ${Math.min(...lv)}–${Math.max(...lv)}${L.desc ? '<br>' + esc(L.desc) : ''}</small><div class="trteam">${L.team.map(x => spr(sp(x[0]).ix, 0, 'tri' + (Gm.seen(x[0]) ? '' : ' unseen'))).join('')}</div>${st === 'done' ? '<span class="chip ok">Vaincu</span>' : ''}</div>`;
  });
  h += '</div><div class="row-btns">';
  if (!run) h += `<button class="btn xl pri" data-act="lstart" ${Gm.teamAlive() ? '' : 'disabled'}>${re ? 'Lancer la revanche' : 'Entrer dans la Ligue'}</button>`;
  else h += `<button class="btn xl pri" data-act="lnext" ${Gm.teamAlive() ? '' : 'disabled'}>Affronter ${esc(G.LEAGUE[run.i].n)}</button><button class="btn" data-go="bag">Ouvrir le Sac</button><button class="btn" data-go="team">Équipe</button>${Gm.teamAlive() ? '' : '<button class="btn danger" data-act="lquit">Abandonner</button>'}`;
  h += '</div>';
  return h;
}
const LEAGUE_REPRIZE = 10000;
async function leagueNext() {
  const S = Gm.get(); const run = S.lr; if (!run) return; const L = G.LEAGUE[run.i]; const re = run.re;
  const team = Gm.leagueTeam(run.i, re); run.noMega = run.noMega || [];
  await startBattle({ noMega: run.noMega, megaKO: run.noMega, megaKOn: run.noMega.length, music: run.i === 4 ? 'champion' : 'e4', kind: 'trainer', foe: team, name: L.n, cls: L.title, ai: 3, bio: 'league', indoor: true, megaRing: true, prize: (S.paid = S.paid || {})['L' + run.i] ? 0 : 110 * Math.max(...team.map(m => m.lv)), onWinPaid: 'L' + run.i, dbl: re && run.i % 2 === 1,
    onWin: async ui => {
      run.i++;
      if (run.i >= G.LEAGUE.length) {
        S.lr = null; S.champTimes++; for (const m of S.team) Gm.addRib(m, 'league');
        await ui.msg('Félicitations ! Vous êtes le nouveau Maître de la Ligue Pokémon !');
        if (!S.champ) {
          S.champ = 1; Gm.add('Master Ball', 1); S.money += 50000; Gm.add('Poké Radar', 1); S.flags.radarGift = 1;
          await ui.msg('Vous recevez une Master Ball et 50 000 ₽ ! (Le Charme Chroma s’obtient en complétant le Pokédex.)');
          await ui.msg('Vous recevez aussi le Poké Radar ! Utilisez-le depuis n’importe quelle zone.');
          await ui.msg('Les Îles Tempête, la Tour de Combat et les revanches sont débloquées.');
        } else { S.money += LEAGUE_REPRIZE; await ui.msg(`Vous recevez ${fmt(LEAGUE_REPRIZE)} ₽ en récompense. (La Master Ball n’est donnée qu’à la première victoire.)`) }
        Gm.healTeam();
      }
    },
    onLose: async ui => { S.lr = null; await ui.msg('Le défi de la Ligue est terminé. Il faudra recommencer depuis le début.') } });
}

// ---------- TOWER
const TOWER_SHOP = [['Super Bonbon', 25], ['Ceinture Force', 45], ['Aromate Rigide', 45], ['Aromate Modeste', 45], ['Aromate Jovial', 45], ['Aromate Timide', 45], ['Restes', 70], ['Veste de Combat', 70], ['Orbe Vie', 90], ['Bandeau Choix', 90], ['Lunettes Choix', 90], ['Mouchoir Choix', 90], ['Patch Talent', 120], ['Encens Légendaire', 160], ['Master Ball', 450], ['Shinyficateur', 1500]];
const TOWER_MEGA = 140;
// special forms sold at the Battle Tower (Eternal Floette can Mega Evolve with the Floettite; Ash-Greninja cannot)
const TOWER_MONS = [{ fm: 10061, s: 670, c: 2000, n: 'Floette Éternel', d: 'Forme légendaire de Floette, niveau 50. Peut méga-évoluer avec la Floettite.' },
  { fm: 10117, s: 658, c: 2000, moves: ['water-shuriken', 'dark-pulse', 'ice-beam', 'extrasensory'], n: 'Sachanobi', d: 'Amphinobi Forme Sacha, niveau 50. Ne peut pas méga-évoluer.' }];
const TMODES = { solo: { n: 6, dbl: 0, label: 'Solo', desc: '6 Pokémon, combats simples.', best: 'best1' }, duo: { n: 6, dbl: 1, label: 'Duo', desc: '6 Pokémon, combats doubles.', best: 'best2' }, mono: { n: 6, dbl: 0, label: 'Solo Monotype', desc: '6 Pokémon partageant un même type, contre des équipes monotypes. Chaque victoire : 2 000 ₽ et un Œuf du type adverse.', best: 'best3' } };
const TMILESTONE = { 7: ['Bonbon Exp. L', 2], 14: ['Hyper Ball', 10], 21: ['Bonbon Exp. XL', 1], 28: ['Super Bonbon', 3], 35: ['Bonbon Exp. XL', 2], 42: ['Pilule Talent', 1], 49: ['Master Ball', 1] };
function towerMilestone(k) { return TMILESTONE[k] || (k % 7 === 0 ? ['Bonbon Exp. XL', 2] : null) }
function renderTower() {
  const S = Gm.get(); const T = S.tower; const run = T.run; if (run && !run.mode) run.mode = run.dbl ? 'duo' : 'solo';
  let h = `<section class="hero tower-hero"><button class="back" data-go="more">← Plus</button><p class="eyebrow">Tous les Pokémon au niveau 50 · sans objets du Sac</p><h1>Tour de Combat</h1><p class="sub">Records : Solo ${T.best1} · Duo ${T.best2} · Monotype ${T.best3 || 0} · ${T.pts} PCo</p></section>`;
  if (run) {
    const md = TMODES[run.mode]; const ms = towerMilestone(run.streak + 1 + (7 - (run.streak + 1) % 7) % 7);
    h += `<section class="blk"><h2>${md.label} : ${run.streak} victoire${run.streak > 1 ? 's' : ''}</h2><div class="trteam big">${run.picks.map(u => { const [m] = findMon(u); return m ? monIcon(m, 'tri') : '' }).join('')}</div>
      <p class="sub">${run.streak === 20 || run.streak === 48 ? 'Prochain combat : la Tête de la Tour !' : `Prochain adversaire : combat n°${run.streak + 1}`}${run.mode === 'mono' && run.next ? ` · équipe ${typeChip(run.next, 1)}` : ''}</p>
      <p class="mut">${run.mode === 'mono' ? `Récompense par victoire : 2 000 ₽, un Œuf ${P.TL[run.next] || ''} et 2 PCo.` : `Récompense par victoire : ${fmt(Math.min(2500, 300 + 100 * (run.streak + 1)))} ₽ et des PCo.${ms ? ` Palier suivant : ${esc(ms[0])} ×${ms[1]}.` : ''}`}</p>
      <div class="row-btns"><button class="btn xl pri" data-act="tnext">Combattre</button><button class="btn" data-act="tquit">Arrêter la série</button></div></section>`;
  } else {
    h += `<section class="blk"><h2>Nouvelle série</h2><p class="sub">Vos Pokémon sont soignés entre chaque combat. Une défaite arrête la série, sans rien perdre.</p><div class="tmodes">${Object.entries(TMODES).map(([k, m]) => `<button class="fopt" data-act="tstart" data-m="${k}"><b>${m.label}</b><small>${m.desc}</small><em>Record : ${T[m.best] || 0}</em></button>`).join('')}</div>
      <p class="mut">Solo et Duo : ${fmt(400)} ₽ à la 1re victoire puis +100 ₽ par victoire (jusqu’à 2 500 ₽), des PCo, et un objet tous les 7 combats.</p></section>`;
  }
  h += `<section class="blk"><h2>Échanges PCo <small>${T.pts} PCo</small></h2><div class="ilist">${TOWER_SHOP.map(([n, c]) => `<div class="irow">${UI.itemIcon(n)}<span><b>${esc(n)}</b><small>${esc(IT[n] ? IT[n].desc : '')}</small></span><em>${c} PCo</em><span class="iact"><button class="btn sm pri" data-act="tbuy" data-n="${esc(n)}" data-c="${c}" ${T.pts < c ? 'disabled' : ''}>Échanger</button></span></div>`).join('')}
  ${TOWER_MONS.map((t, i) => `<div class="irow">${spr(G.FORMS[t.fm].ix, 0, 'tri')}<span><b>${esc(t.n)}</b><small>${esc(t.d)}</small></span><em>${fmt(t.c)} PCo</em><span class="iact"><button class="btn sm pri" data-act="tmon" data-i="${i}" ${T.pts < t.c ? 'disabled' : ''}>Échanger</button></span></div>`).join('')}
  <div class="irow">${UI.itemIcon('Florizarrite')}<span><b>Méga-Gemme au choix</b><small>N’importe quelle Méga-Gemme.</small></span><em>${TOWER_MEGA} PCo</em><span class="iact"><button class="btn sm pri" data-act="tmega" ${T.pts < TOWER_MEGA ? 'disabled' : ''}>Choisir</button></span></div></div></section>`;
  return h;
}
async function towerStart(mode) {
  const S = Gm.get(); const md = TMODES[mode]; const n = md.n;
  const box = Gm.pcAll();
  if (S.team.length + box.length < n) { UI.toast(`Il faut au moins ${n} Pokémon.`, 'bad'); return }
  const picks = [];
  const common = () => { const ms = picks.map(u => findMon(u)[0]); return P.TYPES.filter(t => ms.every(m => sp(m.s).t.includes(t))) };
  while (picks.length < n) {
    const ct = mode === 'mono' && picks.length ? common() : null;
    const okF = m => !picks.includes(m.u) && (!ct || sp(m.s).t.some(t => ct.includes(t)));
    const left = S.team.filter(okF);
    const list = left.length >= n - picks.length ? S.team : [...S.team, ...box.filter(okF).slice(0, 80)];
    if (ct && ![...S.team, ...box].some(okF)) { UI.toast(`Aucun autre Pokémon ne partage le type ${ct.map(t => P.TL[t]).join(' ou ')}. Choisissez d’autres Pokémon.`, 'bad'); return }
    const r = await UI.pickMon(`${md.label} : Pokémon ${picks.length + 1}/${n}${ct ? ' (type ' + ct.map(t => P.TL[t]).join(' ou ') + ')' : ''}`, okF, list);
    if (!r) return; picks.push(r.u);
  }
  S.tower.run = { mode, n, dbl: md.dbl, picks, streak: 0, next: mode === 'mono' ? P.pick(P.TYPES) : null }; Gm.save(); render();
}
async function towerNext() {
  const S = Gm.get(); const run = S.tower.run; if (!run) return; const md = TMODES[run.mode || (run.dbl ? 'duo' : 'solo')];
  const mons = run.picks.map(u => findMon(u)[0]).filter(Boolean).map(m => { const c = JSON.parse(JSON.stringify(m)); P.heal(c); return c });
  const tn = run.n || run.picks.length; // series started before the 6-Pokémon rule keep their size
  if (mons.length < tn) { UI.toast('Un Pokémon de la série a disparu.', 'bad'); S.tower.run = null; render(); return }
  const type = run.mode === 'mono' ? (run.next || P.pick(P.TYPES)) : null;
  const foe = Gm.towerTeam(tn, run.streak, type);
  const boss = run.streak === 20 || run.streak === 48;
  await startBattle({ kind: 'tower', foe, playerMons: mons, fixedLevel: 50, noExp: true, allowItems: false, dbl: !!md.dbl, name: boss ? 'Orion' : pick(['Léa', 'Marc', 'Yuki', 'Sven', 'Amir', 'Nell', 'Iko', 'Tara', 'Bastien', 'Ombeline']), cls: boss ? 'Tête de la Tour' : type ? 'Spécialiste ' + P.TL[type] : pick(['Vétéran', 'Dresseur Ace', 'Stratège', 'Dompteuse', 'Expert']), ai: 3, megaRing: run.streak >= 7, bio: 'city', indoor: true,
    after: async (res, bt, ui) => {
      if (res === 'win') {
        run.streak++; if (boss) for (const u of run.picks) Gm.addRib(Gm.findMon(u)[0], 'tower');
        if (run.mode === 'mono') {
          S.money += 2000; Gm.add('Œuf ' + P.TL[type], 1); S.tower.pts += 2;
          await ui.msg(`Victoire n°${run.streak} ! Vous gagnez 2 000 ₽, un Œuf ${P.TL[type]} et 2 PCo.`);
          let nt = P.pick(P.TYPES); while (nt === type) nt = P.pick(P.TYPES); run.next = nt;
        } else {
          const gain = 3 + Math.floor(run.streak / 7) * 2 + (boss ? 20 : 0); const money = Math.min(2500, 300 + 100 * run.streak);
          S.tower.pts += gain; S.money += money;
          await ui.msg(`Victoire n°${run.streak} ! Vous gagnez ${fmt(money)} ₽ et ${gain} PCo.`);
          const ms = run.streak % 7 === 0 ? towerMilestone(run.streak) : null;
          if (ms) { Gm.add(ms[0], ms[1]); await ui.msg(`Palier de ${run.streak} victoires : vous recevez ${ms[0]} ×${ms[1]} !`) }
        }
        const k = md.best; if (run.streak > (S.tower[k] || 0)) S.tower[k] = run.streak;
      } else {
        await ui.msg(`La série s’arrête à ${run.streak} victoire${run.streak > 1 ? 's' : ''}.`); S.tower.run = null;
      }
    } });
}
function pick(a) { return a[Math.floor(Math.random() * a.length)] }

// ---------- REMATCH
function renderRematch() {
  const S = Gm.get();
  return `<section class="hero"><button class="back" data-go="more">← Plus</button><h1>Revanches des Champions</h1><p class="sub">Équipes complètes, niveau 85 à 90, stratégies affinées.</p></section><div class="lgl">${G.GYMS.map((g, i) => `<div class="lgc" style="--tc:${TC[g.type]}"><p class="eyebrow">Arène ${TL[g.type]}${S.rematch[i] ? ' · battu ×' + S.rematch[i] : ''}</p><b>${esc(g.n)}</b><small>N. ${Math.min(...g.team.map(x => x[1])) + 25}–${Math.max(...g.team.map(x => x[1])) + 25}</small><button class="btn pri" data-act="rematch" data-i="${i}">Défier</button></div>`).join('')}</div>`;
}

// ---------- global click handling
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('.rmap [data-go]') ) { e.preventDefault(); e.target.closest('[data-go]').dispatchEvent(new MouseEvent('click', { bubbles: true })) } });
document.addEventListener('click', async e => {
  const go = e.target.closest('[data-go]'); if (go && !go.disabled && !e.target.closest('.modal-wrap')) { UI.go(go.dataset.go, go.dataset.arg ? +go.dataset.arg : undefined); return }
  const a = e.target.closest('[data-act]'); if (!a || a.disabled || e.target.closest('.modal-wrap') || e.target.closest('#battle')) return;
  const S = Gm.get(); const act = a.dataset.act;
  switch (act) {
    case 'explore': doExplore(); break;
    case 'qbag': { for (;;) { const m = await UI.pickMon('Utiliser un objet sur…'); if (!m) break; await useItemOn(m); Gm.save(); refreshEnc() } break }
    case 'farm': doFarm(); break;
    case 'farmcfg': farmMenu(); break;
    case 'mapview': try { localStorage.setItem('mapView', a.dataset.v) } catch (e) { } render(); break;
    case 'encclose': setPend(null); Gm.save(true); render(); break;
    case 'partner': partnerMenu(); break;
    case 'setpartner': { const u = a.dataset.u; Gm.setPartner(Gm.get().partner === u ? '' : u); Gm.save(true); render(); if (Gm.get().partner) UI.toast(`🤝 ${esc(monName(Gm.partner()))} est votre partenaire !`); break }
    case 'minetool': minev.tool = a.dataset.t; mineRefresh(); break;
    case 'minenew': { Gm.mineNew(); Gm.save(true); mineRefresh(); break }
    case 'minehit': { const i = +a.dataset.i; const r = Gm.mineHit(i % Gm.MINE.W, Math.floor(i / Gm.MINE.W), minev.tool); if (!r) break; if (r.noch) { UI.toast(minev.tool === 'hammer' && Gm.mineTick().ch === 1 ? 'Il faut 2 coups pour le Marteau : utilisez la Pioche.' : 'Plus de coups : revenez plus tard !', 'bad'); break } Gm.save(true); mineRefresh(); const wall = document.querySelector('.minewall'); if (wall) { wall.classList.remove('shake'); void wall.offsetWidth; wall.classList.add('shake'); mineDebris(wall, i, minev.tool); for (const it of Gm.mineTick().cur.items) if (it.got && r.found.includes(it.n) && W.playSparkle) { const el = wall.querySelectorAll('.mitem')[Gm.mineTick().cur.items.indexOf(it)]; if (el) W.playSparkle(el, 1.4) } } if (W.Sound) try { W.Sound.sfx(r.found.length ? 'catch' : 'hit', { e: 0.5 }) } catch (e) { } for (const n of r.found) UI.toast(`⛏ Trouvé : ${UI.itemIcon(n, 'ii sm')} <b>${esc(n)}</b> !`); break }
    case 'incopen': view.bagTab = 'vit'; UI.go('bag'); break;
    case 'farmstop': farm.on = false; refreshEnc(); UI.toast('Le farm s’arrête après ce combat.'); break;
    case 'fight': doFight(); break;
    case 'heal': if (S.lr) { UI.toast('Impossible pendant la Ligue.', 'bad'); break } Gm.healTeam(); Gm.save(); UI.toast('Votre équipe est en pleine forme !'); render(); break;
    case 'trainer': fightTrainer(a.dataset.i === 'rival' ? 'rival' : +a.dataset.i); break;
    case 'gym': fightGym(+a.dataset.i, false); break;
    case 'rematch': fightGym(+a.dataset.i, true); break;
    case 'dexd': dexDetail(+a.dataset.id); break;
    case 'dexhw': dexHwDetail(+a.dataset.id); break;
    case 'dexmore': view.dexPage++; render(); break;
    case 'pcmore': view.pcPage++; render(); break;
    case 'tmup': case 'tmdown': { const i = +a.dataset.i, j = act === 'tmup' ? i - 1 : i + 1; [S.team[i], S.team[j]] = [S.team[j], S.team[i]]; Gm.save(); render(); break }
    case 'pcbox': S.pc.cur = (S.pc.cur + +a.dataset.d + Gm.NB) % Gm.NB; Gm.save(); render(); break;
    case 'pcgoto': S.pc.cur = +a.dataset.b; pcv.q = ''; render(); window.scrollTo(0, 0); break;
    case 'pcslot': if (pcv.multi && pcv.moving) { pcMoveGroup([...pcv.sel], +a.dataset.b, +a.dataset.j); break } if (pcv.multi) { const m = Gm.pcBox(+a.dataset.b)[+a.dataset.j]; if (m) { pcv.sel.has(m.u) ? pcv.sel.delete(m.u) : pcv.sel.add(m.u); render() } break } pcSlot(+a.dataset.b, +a.dataset.j); break;
    case 'pcmulti': pcv.multi = !pcv.multi; pcv.moving = false; pcv.sel.clear(); render(); break;
    case 'pcmove': pcv.moving = !pcv.moving; render(); break;
    case 'pcdexsort': pcDexSort(a.dataset.f === '1'); break;
    case 'pcselbox': for (const m of Gm.pcBox(S.pc.cur)) if (m) pcv.sel.add(m.u); render(); break;
    case 'pcselnone': pcv.sel.clear(); render(); break;
    case 'pcselres': for (const m of Gm.pcAll()) if (pcMatch(m)) pcv.sel.add(m.u); render(); break;
    case 'pcrelsel': {
      const lk = Gm.pcAll().filter(m => pcv.sel.has(m.u) && m.lock).length; const ms = Gm.pcAll().filter(m => pcv.sel.has(m.u) && !m.lock); if (!ms.length) { if (lk) UI.toast('Les Pokémon sélectionnés sont verrouillés 🔒.', 'bad'); break }
      const sh = ms.filter(m => m.sh).length, rb = ms.filter(m => Gm.ribbons(m).length).length;
      const w = [sh ? `⚠ ${sh} chromatique${sh > 1 ? 's' : ''} dans la sélection !` : '', rb ? `⚠ ${rb} Pokémon avec des rubans.` : ''].filter(Boolean).join('<br>');
      if (!(await UI.confirm(`Relâcher ${ms.length} Pokémon ? Cette action est définitive. Vous recevez 1 Bonbon Exp. XS par Pokémon relâché.${lk ? `<br>${lk} Pokémon verrouillé${lk > 1 ? 's sont ignorés' : ' est ignoré'} 🔒.` : ''}${w ? '<br><br><b>' + w + '</b>' : ''}`, `Relâcher ${ms.length}`))) break;
      for (const m of ms) { if (m.it) Gm.add(m.it, 1); Gm.removeMon(m) } Gm.add('Bonbon Exp. XS', ms.length); pcv.sel.clear(); Gm.save(); UI.toast(`${ms.length} Pokémon relâchés · +${ms.length} Bonbon Exp. XS`); render(); break }
    case 'pcteam': pcTeam(+a.dataset.i); break;
    case 'giftgo': claimGift(); break;
    case 'dailygo': { const r = Gm.dailyClaim(); if (r) { if (W.Sound) W.Sound.sfx('lvl'); UI.toast(`Jour ${r.day} : ${esc(r.got.join(', '))} !`); render() } break }
    case 'shxadd': shxAdd(); break;
    case 'shxdel': view.shx.splice(+a.dataset.i, 1); render(); break;
    case 'shxclr': view.shx = []; render(); break;
    case 'shxgo': shxGo(); break;
    case 'pcdrop': pcv.held = null; render(); break;
    case 'pcrename': { const v = await UI.modal(`<h3>Renommer la boîte</h3><input id="bxname" maxlength="16" value="${esc(Gm.pcName(S.pc.cur))}"><div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-okb="1">Valider</button></div>`, { cls: 'small', onClick: (e, close, w) => { if (e.target.dataset.okb) close('=' + w.querySelector('#bxname').value) } }); if (v && v[0] === '=') { S.pc.names[S.pc.cur] = v.slice(1).trim(); Gm.save(); render() } break }
    case 'pcsortiv': { const bx = Gm.pcBox(S.pc.cur); const ms = bx.filter(Boolean).sort((x, y) => ivTot(y) - ivTot(x)); for (let i = 0; i < bx.length; i++) bx[i] = ms[i] || null; Gm.save(); render(); break }
    case 'pcsortall': { if (!(await UI.confirm('Trier tout le PC par numéro du Pokédex ? Les Pokémon seront rangés à la suite, boîte après boîte.', 'Tout trier'))) break; const all = Gm.pcAll().sort((x, y) => sp(x.s).dn - sp(y.s).dn || x.s - y.s || (y.sh ? 1 : 0) - (x.sh ? 1 : 0) || y.lv - x.lv); for (let b = 0; b < S.pc.b.length; b++) { const bx = Gm.pcBox(b); for (let i = 0; i < bx.length; i++) bx[i] = null } all.forEach((m, k) => { Gm.pcBox(Math.floor(k / 30))[k % 30] = m }); S.pc.cur = 0; Gm.save(); UI.toast(`${all.length} Pokémon rangés par numéro.`); render(); break }
    case 'zshiny': view.zshiny = !view.zshiny; render(); break;
    case 'zach': { const z = Gm.zone(view.zid); const rw = Gm.zachClaim(z, a.dataset.k); if (rw) { Gm.save(); UI.toast(`Succès récompensé : ${[rw.money ? fmt(rw.money) + ' ₽' : '', ...(rw.items || []).map(([n, q]) => q > 1 ? n + ' ×' + q : n)].filter(Boolean).join(' + ')} !`); render() } break }
    case 'pcsort': { const bx = Gm.pcBox(S.pc.cur); const ms = bx.filter(Boolean).sort((x, y) => sp(x.s).dn - sp(y.s).dn || y.lv - x.lv); for (let i = 0; i < bx.length; i++) bx[i] = ms[i] || null; Gm.save(); render(); break }
    case 'fsp': fv.sp = +a.dataset.id; fv.a = fv.b = null; render(); break;
    case 'fpick': fv.optTouched = 0; if (a.dataset.role === 'a') { fv.a = a.dataset.u; if (fv.b === fv.a) fv.b = null } else fv.b = a.dataset.u; render(); break;
    case 'fopt': fv.opt = a.dataset.k; fv.optTouched = 1; render(); break;
    case 'fchg': if (a.dataset.r === 'a') { fv.a = null; fv.b = null } else fv.b = null; render(); break;
    case 'fgo': doFusion(); break;
    case 'ftab': fv.tab = a.dataset.v; render(); break;
    case 'raidgo': doRaid(); break;
    case 'achcat': view.achCat = a.dataset.v; render(); break;
    case 'radon': { if (!Gm.teamAlive()) { UI.toast('Votre équipe est K.O.', 'bad'); break } const r = radState(); if (r.steps < RAD_CHARGE) { UI.toast(`Le Radar se recharge : encore ${RAD_CHARGE - r.steps} pas.`); break } if (r.n >= 1 && !(await UI.confirm(`Relancer le Radar brise votre chaîne de <b>${r.n}</b>. Continuer ?`, 'Relancer', 'Annuler'))) break; radBreak(); radPulse(false); Gm.save(true); radRefresh(); break }
    case 'radwalk': radWalkTo(+a.dataset.x, +a.dataset.y); break;
    case 'radmv': { const d = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[a.dataset.d]; if (!radWalking) { radWalking = true; try { await radMove(d[0], d[1]) } finally { radWalking = false; Gm.save(true) } } break }
    case 'dexmode': view.dexMode = a.dataset.v; view.dexPage = 1; render(); break;
    case 'tsave': teamSave(+a.dataset.i); break;
    case 'tnew': { const L = teamsList(); if (!S.team.length) break; L.push({ n: 'Équipe ' + (L.length + 1), us: S.team.map(m => m.u) }); view.tsel = L.length - 1; Gm.save(); UI.toast('Équipe enregistrée.'); render(); break }
    case 'tdel': { const L = teamsList(); const t = L[+a.dataset.i]; if (t && await UI.confirm(`Supprimer « ${esc(t.n)} » ? (les Pokémon restent dans votre PC)`, 'Supprimer')) { L.splice(+a.dataset.i, 1); view.tsel = 0; Gm.save(); render() } break }
    case 'tload': teamLoad(+a.dataset.i); break;
    case 'tname': { const t = teamsList()[+a.dataset.i]; if (!t) break; const v = await UI.modal(`<h3>Renommer l’équipe</h3><input id="tnm" maxlength="20" value="${esc(t.n)}"><div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-ok="1">OK</button></div>`, { cls: 'small', onClick: (ev, close, w) => { if (ev.target.dataset.ok) close('=' + w.querySelector('#tnm').value) } }); if (v && v.length > 1) { t.n = v.slice(1).trim().slice(0, 20) || t.n; Gm.save(); render() } break }
    case 'profedit': profileEdit(); break;
    case 'bdpick': borderPick(); break;
    case 'bnpick': bannerPick(); break;
    case 'phset': setPhoto(); break;
    case 'phdel': setPhoto(true); break;
    case 'optspr': S.set.spr = a.dataset.v; Gm.save(); render(); break;
    case 'tradesend': if (S.champ) tradeSend(); break;
    case 'txoffer': if (S.champ) txOffer(); break;
    case 'txpaste': if (S.champ) txPaste(); break;
    case 'txcancel': if (S.champ) txCancel(a.dataset.id); break;
    case 'txcode': { const x = S.tx && S.tx[a.dataset.id]; if (x && x.codes[a.dataset.c]) txCodeBox(x, a.dataset.c); break }
    case 'tradecode': { const x = (Gm.get().tradesOut || []).find(t => t.id === a.dataset.id); if (x) copyBox('Code d’échange', x.code, `Code pour ${esc(x.n)}.`); break }
    case 'pvpcode': pvpCode(); break;
    case 'pvpgo': pvpGo(); break;
    case 'pvpmode': view.pvpDbl = a.dataset.v === '1'; render(); break;
    case 'dcput': dcPick(+a.dataset.i || 0, a.dataset.s); break;
    case 'dcunlock': { if (!(await UI.confirm(`Débloquer la Pension 2 pour ${fmt(Gm.DC2_PRICE)} ₽ ?`, 'Débloquer'))) break; if (Gm.dcUnlock()) { Gm.save(); UI.toast('Pension 2 débloquée !'); render() } else UI.toast('Pas assez d’argent.', 'bad'); break }
    case 'dctake': { const m = Gm.dcTake(+a.dataset.i || 0, a.dataset.s); if (m) { UI.toast(`${esc(monName(m))} revient ${Gm.get().team.includes(m) ? 'dans l’équipe' : 'au PC'}.`); Gm.save(); render() } break }
    case 'dcegg': dcHatch(+a.dataset.i || 0, false); break;
    case 'dcall': dcHatch(+a.dataset.i || 0, true); break;
    case 'qclaim': { const rw = Gm.qClaim(a.dataset.g, +a.dataset.i); if (rw) { Gm.save(); UI.toast(`Quête terminée : +${fmt(rw.money)} ₽ et ${esc(rw.it)}${rw.q > 1 ? ' ×' + rw.q : ''} !`); render() } break }
    case 'dexshrw': { const r = Gm.dexShClaim(+a.dataset.i); if (r) { Gm.save(); await UI.alert(`Récompense du Pokédex chromatique : ${r.money ? fmt(r.money) + ' ₽, ' : ''}${esc(r.got.join(', '))} !`); render() } break }
    case 'dexrw': { const r = Gm.dexClaim(+a.dataset.i); if (r) { Gm.save(); await UI.alert(`Récompense du Pokédex : ${r.money ? fmt(r.money) + ' ₽, ' : ''}${esc(r.got.join(', '))} !`); render() } break }
    case 'evreset': evReset(a.dataset.u); break;
    case 'evfight': if (view.evAuto) evFarm(+a.dataset.i); else evFight(+a.dataset.i); break;
    case 'mon': monDetail(a.dataset.u); break;
    case 'bagtab': view.bagTab = a.dataset.k; render(); break;
    case 'shoptab': view.shopTab = a.dataset.k; view.shopq = ''; render(); break;
    case 'buy': { const n = a.dataset.n; const it = IT[n]; const max = Math.min(999, Math.floor(S.money / it.price)); if (max < 1) { UI.toast('Pas assez d’argent.', 'bad'); break } const q = await qtyDialog({ title: `Acheter ${esc(n)}`, max, price: it.price, verb: 'Acheter', icon: UI.itemIcon(n) }); if (!q) break; if (S.set.cbuy !== 0 && it.price * q >= 50000 && !(await UI.confirm(`Acheter ${esc(n)} ×${q} pour ${fmt(it.price * q)} ₽ ?`, 'Acheter'))) break; S.money -= it.price * q; Gm.add(n, q); if (q >= 10 && it.cat === 'ball') { Gm.add('Poké Ball', 0) } Gm.save(); const r0 = a.getBoundingClientRect(); UI.toast(`Acheté : ${esc(n)} ×${q}`); render(); bagFly(n, r0); break }
    case 'buytm': { const k = a.dataset.k; const pr = P.tmPrice(k); if (S.money < pr) break; if (!(await UI.confirm(`Acheter la CT ${esc(mv(k).n)} pour ${fmt(pr)} ₽ ?`, 'Acheter'))) break; S.money -= pr; S.tms.push(k); Gm.save(); UI.toast(`CT ${esc(mv(k).n)} achetée.`); render(); break }
    case 'sell': { const n = a.dataset.n; if (!Gm.has(n) || !canSell(n)) break; const pr = sellPrice(n); const q = await qtyDialog({ title: `Vendre ${esc(n)}`, max: S.items[n], price: pr, verb: 'Vendre', icon: UI.itemIcon(n) }); if (!q) break; Gm.add(n, -q); S.money += pr * q; UI.toast(`Vendu : ${q} × ${esc(n)} (+${fmt(pr * q)} ₽)`); Gm.save(); render(); break }
    case 'iuse': { const n = a.dataset.n; const it = IT[n];
      // care items (potions, revives, candies…): the team list stays open after each use, no need to go back through the Bag
      const again = ['heal', 'status', 'revive', 'pp', 'candy', 'vit', 'ppup', 'evberry'].includes(it.cat);
      while ((Gm.get().items[n] || 0) > 0) {
        const m = await UI.pickMon(`Utiliser ${esc(n)} sur… <small class="mut">(×${Gm.get().items[n]})</small>`, x => it.cat === 'revive' ? x.hp <= 0 : it.cat === 'form' ? P.formsFor(n, x.s).length > 0 : true); if (!m) break;
        if (again || await UI.confirm(`Utiliser ${esc(n)} sur ${esc(monName(m))} ?`, 'Utiliser')) await applyItem(n, m);
        Gm.save(); if (!again) break;
      }
      render(); break }
    case 'igive': { const n = a.dataset.n; const m = await UI.pickMon(`Donner ${esc(n)} à…`); if (m && await UI.confirm(`Donner ${esc(n)} à ${esc(monName(m))} ?${m.it ? ` Il rendra ${esc(m.it)}.` : ''}`, 'Donner')) { if (m.it) Gm.add(m.it, 1); m.it = n; Gm.add(n, -1); UI.toast(`${esc(monName(m))} tient ${esc(n)}.`); Gm.save() } render(); break }
    case 'iinc': { const n = a.dataset.n; const it = IT[n]; if (S.inc && !(await UI.confirm(`Remplacer ${esc(S.inc.n)} (${S.inc.left} rencontres restantes) ?`, 'Remplacer'))) break; S.inc = { n, k: it.inc, x: it.x, left: it.left }; Gm.add(n, -1); Gm.save(); UI.toast(`${esc(n)} allumé pour ${it.left} rencontres.`); render(); break }
    case 'ihatch': hatchEgg(a.dataset.n); break;
    case 'share': S.flags.share = S.flags.share ? 0 : 1; Gm.save(); render(); break;
    case 'optspeed': S.set.speed = +a.dataset.v; Gm.save(); render(); break;
    case 'sfxtest': if (W.Sound) { W.Sound.unlock(); const k = a.dataset.k; if (k.startsWith('hit')) W.Sound.sfx('hit', { e: k === 'hit_super' ? 2 : k === 'hit_weak' ? 0.5 : 1 }); else if (k === 'crit') W.Sound.sfx('hit', { e: 1, crit: true }); else W.Sound.sfx(k) } break;
    case 'sfxdel': if (W.Sound) { await W.Sound.setTrack('sfx:' + a.dataset.k, null); delete W.Sound._sfxBuf[a.dataset.k]; UI.toast('Bruitage retiré.'); refreshSfx() } break;
    case 'trktest': if (W.Sound) { W.Sound.unlock(); W.Sound.play(a.dataset.k) } break;
    case 'trkstop': if (W.Sound) W.Sound.play(false); break;
    case 'trkdel': if (W.Sound) { await W.Sound.setTrack(a.dataset.k, null); UI.toast('Musique retirée.'); refreshTracks(); if (a.dataset.k === 'menu') W.Sound.play(false) } break;
    case 'optsnd': { const k = a.dataset.k; S.set[k] = S.set[k] === 0 ? 1 : 0; Gm.save(); if (k === 'sfx' && S.set.sfx && W.Sound) W.Sound.sfx('select'); if (k === 'music') { if (S.set.music === 0) { if (W.Sound) W.Sound.play(false) } else menuMusic(true) } render(); break }
    case 'optshc': S.set.shc = a.dataset.v; Gm.save(); applyShCol(); render(); break;
    case 'optui': S.set.ui = a.dataset.v; Gm.save(); applyShCol(); render(); break;
    case 'optkey': { const kk = a.dataset.k; const lab = (KEYS.find(x => x[0] === kk) || [, ''])[1]; const k = await new Promise(res => { UI.modal(`<h3>Nouvelle touche</h3><p class="mtxt">Appuyez sur la touche pour « ${esc(lab)} »…</p><p class="mut">(Échap pour annuler)</p>`, { cls: 'small', onOpen: w => { const h = ev => { if (ev.key === 'Escape') { document.removeEventListener('keydown', h, true); res(null); return } if (ev.key.length !== 1 || /\s/.test(ev.key)) return; ev.preventDefault(); ev.stopPropagation(); document.removeEventListener('keydown', h, true); res(ev.key.toLowerCase()); const c = w.closest('.modal-wrap'); const x = c && c.querySelector('.mclose'); if (x) x.click() }; document.addEventListener('keydown', h, true) } }) });
      if (k) { const cur = keysOf(); const other = Object.entries(cur).find(([x, v]) => x !== kk && v === k); if (other) { UI.toast(`La touche ${esc(k.toUpperCase())} sert déjà à « ${esc(KEYS.find(x => x[0] === other[0])[1])} ».`, 'bad'); break } S.set.keys = { ...cur, [kk]: k }; if (kk === 'ball') S.set.ballKey = k; Gm.save(); UI.toast(`« ${esc(lab)} » : ${esc(k.toUpperCase())}`) } render(); break }
    case 'optfs': S.set.fs = +a.dataset.v; Gm.save(); applyShCol(); render(); break;
    case 'wipe': if (!S.champ && !W.ASSET_ROOT) { UI.toast('Disponible une fois la Ligue remportée.', 'bad'); break } if (await UI.confirm('Recommencer depuis le début ? Votre partie actuelle sera effacée, ici et en ligne. Vos données en ligne (classement, GTS, amis) sont gardées.', 'Recommencer')) { try { await Gm.cloudWipe() } catch (e) { } Gm.reset(); location.reload() } break;
    case 'export': exportSave(); break;
    case 'importfile': { const inp = document.getElementById('impfile'); if (!inp) break; inp.value = ''; inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return; const t = await f.text(); if (await UI.confirm(`Charger la sauvegarde « ${esc(f.name)} » ? Elle remplace votre partie actuelle.`, 'Charger')) importText(t) }; inp.click(); break }
    case 'natbackup': if (W.valmaraNative) { await W.valmaraNative.backup(Gm.exportText(), true); UI.toast('Copie de secours créée.'); render() } break;
    case 'natfolder': if (W.valmaraNative) W.valmaraNative.openFolder(); break;
    case 'importtxt': { const v = await UI.modal(`<h3>Coller une sauvegarde</h3><textarea id="imptxt" rows="8" placeholder="Collez le contenu du fichier ici"></textarea><div class="mbtns"><button class="btn" data-ret="">Annuler</button><button class="btn pri" data-imp="1">Importer</button></div>`, { onClick: (ev, close, w) => { if (ev.target.dataset.imp) close('=' + w.querySelector('#imptxt').value) } }); if (v && v[0] === '=') importText(v.slice(1)); break }
    case 'cloudsave': await Gm.cloudSaveNow(); UI.toast(Gm.cloud.err ? 'Échec : ' + esc(Gm.cloud.err) : 'Sauvegarde en ligne à jour.'); render(); break;
    case 'cloudload': { const c = await Gm.cloudLoad(); if (!c) { UI.toast('Aucune sauvegarde en ligne.', 'bad'); break } if (await UI.confirm(`Charger la sauvegarde en ligne de ${esc(c.name)} (${new Date(c.t).toLocaleString('fr-FR')}) ? La partie actuelle sera remplacée.`, 'Charger')) { Gm.adopt(c.data); render() } break }
    case 'lstart': S.lr = { i: 0, re: S.champ ? 1 : 0 }; Gm.save(); render(); break;
    case 'lnext': leagueNext(); break;
    case 'lquit': if (await UI.confirm('Abandonner le défi de la Ligue ?', 'Abandonner')) { S.lr = null; Gm.save(); render() } break;
    case 'tstart': towerStart(a.dataset.m); break;
    case 'tnext': towerNext(); break;
    case 'tquit': if (await UI.confirm('Arrêter la série en cours ?', 'Arrêter')) { S.tower.run = null; Gm.save(); render() } break;
    case 'tbuy': { const n = a.dataset.n, c = +a.dataset.c; if (S.tower.pts < c) break; S.tower.pts -= c; Gm.add(n, 1); Gm.save(); const r0 = a.getBoundingClientRect(); UI.toast(`Obtenu : ${esc(n)}`); render(); bagFly(n, r0); break }
    case 'tmon': { const t = TOWER_MONS[+a.dataset.i]; if (!t || S.tower.pts < t.c) break;
      if (!await UI.confirm(`Échanger ${fmt(t.c)} PCo contre ${esc(t.n)} (niveau 50) ?`)) break;
      if (S.tower.pts < t.c) break; S.tower.pts -= t.c;
      const m = P.makeMon(t.s, 50, { perfect: 3, smart: true, ball: 'Poké Ball', moves: t.moves }); m.fm = t.fm; m.hp = P.maxHP(m); m.fr = 120;
      const where = Gm.giveMon(m); Gm.dexSet(t.fm, 3); Gm.save();
      UI.toast(`${esc(t.n)} a rejoint ${where === 'team' ? 'votre équipe' : 'le PC'} !`); render(); break }
    case 'tmega': { const list = Object.values(G.MEGA).map(m => m.stone).filter((v, i, a) => v && a.indexOf(v) === i).sort((x, y) => x.localeCompare(y, 'fr')); const r = await UI.modal(`<h3>Choisir une Méga-Gemme</h3><div class="ilist">${list.map(n => `<button class="irow" data-ret="${esc(n)}">${UI.itemIcon(n)}<span><b>${esc(n)}</b><small>${esc(IT[n] ? IT[n].desc : '')}</small></span></button>`).join('')}</div>`, { cls: 'wide' }); if (r && S.tower.pts >= TOWER_MEGA) { S.tower.pts -= TOWER_MEGA; Gm.add(r, 1); Gm.save(); UI.toast(`Obtenu : ${esc(r)}`); render() } break }
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'pcq') { view.pcF.q = e.target.value; view.pcPage = 1; const pos = e.target.selectionStart; render(); const n = $('#pcq'); n.focus(); try { n.setSelectionRange(pos, pos) } catch (x) { } }
  if (e.target.id === 'farmmode') { const S2 = Gm.get(); S2.farmT = S2.farmT || {}; const c = S2.farmT[view.zid] || (S2.farmT[view.zid] = { id: 0, only: 0 }); const v = +e.target.value; c.only = v === 1 || v === 2 ? 1 : 0; c.noSh = v === 2 ? 1 : 0; c.shOnly = v === 3 ? 1 : 0; c.haOnly = v === 4 ? 1 : 0; Gm.save(true); refreshEnc(); return }
  if (e.target.id === 'farmtgt' || e.target.id === 'farmonly' || e.target.id === 'farmnosh') { const S2 = Gm.get(); S2.farmT = S2.farmT || {}; const c = S2.farmT[view.zid] || (S2.farmT[view.zid] = { id: 0, only: 0 }); if (e.target.id === 'farmtgt') c.id = +e.target.value; else if (e.target.id === 'farmnosh') c.noSh = e.target.checked ? 1 : 0; else { c.only = e.target.checked ? 1 : 0; if (!c.only) c.noSh = 0 } Gm.save(true); refreshEnc(); return }
  if (e.target.dataset && e.target.dataset.pcf) { const k = e.target.dataset.pcf; pcv.f[k] = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value; render(); return }
  if (e.target.id === 'pcsearch') { pcv.q = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#pcsearch'); n.focus(); try { n.setSelectionRange(pos, pos) } catch (x) { } }
  if (e.target.id === 'shopq') { view.shopq = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#shopq'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos) } catch (x) { } } }
  if (e.target.id === 'tmq') { view.tmq = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#tmq'); n.focus(); try { n.setSelectionRange(pos, pos) } catch (x) { } }
});
document.addEventListener('change', e => {
  if (e.target.id === 'pct') { view.pcF.t = e.target.value; render() }
  if (e.target.id === 'pcs') { view.pcF.sort = e.target.value; render() }
  if (e.target.id === 'pcsh') { view.pcF.sh = e.target.checked ? 1 : 0; render() }
  if (e.target.id === 'evauto') { view.evAuto = e.target.checked ? 1 : 0; render() }
  if (e.target.id === 'tmt') { view.tmt = e.target.value; render() }
  if (e.target.id === 'pcsel') { Gm.get().pc.cur = +e.target.value; render() }
  if (e.target.dataset && e.target.dataset.sfx) { const f = e.target.files[0], k = e.target.dataset.sfx; if (!f) return; if (f.size > 5e6) { UI.toast('Fichier trop lourd (5 Mo maximum).', 'bad'); return } W.Sound.unlock(); W.Sound.setTrack('sfx:' + k, f).then(() => W.Sound.loadSfx(k)).then(() => { UI.toast(`Bruitage enregistré : ${esc(f.name)}`); refreshSfx(); W.Sound.sfx(k.startsWith('hit') ? 'hit' : k === 'crit' ? 'hit' : k, { e: k === 'hit_super' ? 2 : k === 'hit_weak' ? 0.5 : 1, crit: k === 'crit' }) }, async err => { await W.Sound.setTrack('sfx:' + k, null); UI.alert('Impossible d’utiliser ce fichier : ' + esc(err && err.message || err)) }) }
  if (e.target.dataset && e.target.dataset.trk) { const f = e.target.files[0]; if (!f) return; if (f.size > 40e6) { UI.toast('Fichier trop lourd (40 Mo maximum).', 'bad'); return } W.Sound.setTrack(e.target.dataset.trk, f).then(() => { UI.toast(`Musique enregistrée : ${esc(f.name)}`); refreshTracks(); if (e.target.dataset.trk === 'menu') menuMusic(true) }, err => UI.alert('Impossible d’enregistrer ce fichier : ' + esc(err && err.message || err))) }
  if (e.target.id === 'impf') { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importText(String(r.result)); r.readAsText(f) }
});
// volume sliders (options screen and battle pop-up): live while dragging, saved on release
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset) return;
  if (t.dataset.vol) { const st = Gm.get().set; st[t.dataset.vol] = +t.value; const o = t.parentNode.querySelector('output'); if (o) o.textContent = t.value + ' %'; if (W.Sound) { W.Sound.unlock(); W.Sound.applyVol() } }
  if (t.dataset.tv) { const o = t.parentNode.querySelector('output'); if (o) o.textContent = t.value + ' %'; if (W.Sound) W.Sound.previewTrackVol(t.dataset.tv, +t.value) }
  if (t.dataset.dim) { const st = Gm.get().set; st.bdimv = +t.value; document.querySelectorAll('input[data-dim]').forEach(x => { if (x !== t) x.value = t.value; const o = x.parentNode.querySelector('output'); if (o) o.textContent = t.value + ' %' }); applyShCol() }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset) return;
  if (t.dataset.vol) { Gm.save(true); if (t.dataset.vol === 'svol' && W.Sound) W.Sound.sfx('select') }
  if (t.dataset.dim) Gm.save(true);
  if (t.dataset.tv && W.Sound) W.Sound.setTrackVol(t.dataset.tv, +t.value);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'giftcode') { e.preventDefault(); claimGift(); return }
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if (busy || modalStack.length) return;
  if (view.tab === 'radar') { const d = { arrowup: [0, -1], z: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], q: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[e.key.toLowerCase()]; if (d) { e.preventDefault(); if (!radWalking) { radWalking = true; radMove(d[0], d[1]).finally(() => { setTimeout(() => { radWalking = false }, 70); Gm.save(true) }) } } return }
  if (view.tab !== 'zone') return;
  const k = e.key.toLowerCase(); const K = keysOf();
  if (k === K.explore) { e.preventDefault(); doExplore() }
  else if (k === K.fight && curPend()) { e.preventDefault(); doFight() }
});
async function exportSave() {
  const txt = Gm.exportText(); const fn = `pokemon-${REGION.toLowerCase()}-${Gm.get().name.replace(/[^a-z0-9]+/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
  try { const d = W.claude && W.claude.use && !W.ASSET_ROOT ? await W.claude.use('downloads') : null; if (d) { await d.save({ filename: fn, data: txt }); UI.toast('Sauvegarde exportée.'); return } } catch (err) { if (err && err.code === 'cancelled') return }
  if (W.valmaraNative && W.valmaraNative.exportFile) { try { const ok = await W.valmaraNative.exportFile(fn, txt); if (ok) UI.toast('Sauvegarde exportée.'); return } catch (e) { } }
  if (!W.claude) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = fn; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 2000); UI.toast('Sauvegarde exportée dans vos téléchargements.'); return } catch (e) { } }
  await UI.modal(`<h3>Exporter la sauvegarde</h3><p class="mtxt">Copiez ce texte et gardez-le dans un fichier.</p><textarea rows="8" readonly id="exptxt">${esc(txt)}</textarea><div class="mbtns"><button class="btn pri" data-copy="1">Copier</button></div>`, { onClick: (ev, close, w) => { if (ev.target.dataset.copy) { const t = w.querySelector('#exptxt'); navigator.clipboard && navigator.clipboard.writeText(t.value).then(() => UI.toast('Copié.'), () => { t.select() }) } } });
}
function importText(t) { try { Gm.importText(t); UI.toast('Sauvegarde importée.'); render() } catch (err) { UI.alert('Import impossible : ' + esc(err.message)) } }

// ---------- NEW GAME
const GEN_N = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unys', 'Kalos', 'Alola', 'Galar', 'Paldea'];
UI.newGameScreen = (onDone) => {
  const root = $('#view'); $('#top').innerHTML = ''; $('#nav').innerHTML = '';
  let chosen = null;
  const st = G.STARTERS;
  root.innerHTML = `<section class="intro"><p class="eyebrow">Région de ${REGION}</p><h1>Pokémon Valmara</h1><p class="sub">Une aventure à 1 025 Pokémon : 30 zones, 8 Arènes, la Ligue, la Tour de Combat. Les Légendaires apparaissent une fois sur ${fmt(Gm.RATE.leg)}.</p>
    <label class="fld"><span>Votre nom de Dresseur</span><input id="pname" maxlength="12" placeholder="Sacha" autocomplete="off"></label>
    <h2>Choisissez votre premier Pokémon</h2>
    <div class="row-btns"><button class="btn pri" id="wheelbtn">Roue des starters</button><span class="mut">ou touchez un Pokémon</span></div>
    <div class="stgrid" id="stgrid">${st.map((id, i) => { const s = sp(id); return `<button class="stc" data-id="${id}" data-i="${i}">${spr(s.ix, 0)}<b>${esc(s.n)}</b><small>${GEN_N[Math.floor(i / 3)]} · ${s.t.map(t => TL[t]).join('/')}</small></button>` }).join('')}</div>
    <div class="stpick" id="stpick"><p class="mut">Aucun Pokémon choisi.</p></div>
    <button class="btn xl pri" id="gostart" disabled>Commencer l’aventure</button>
    <p class="mut">Vous avez déjà une sauvegarde ? <label class="link">Importer un fichier<input type="file" id="impf" accept=".json,application/json,text/plain" hidden></label></p></section>`;
  const grid = root.querySelector('#stgrid'); const pickEl = root.querySelector('#stpick'); const go = root.querySelector('#gostart');
  // starter reset: each reset rolls a new starter (IV, nature, talent, chromatique 1/350)
  let mon = null, resets = 0, auto = false;
  const showMon = () => {
    const s = sp(chosen);
    pickEl.innerHTML = `<div class="stspr">${spr(s.ix, mon.sh, 'big')}</div><div class="stinfo"><h3>${esc(s.n)}${mon.sh ? ' <span class="shtag">' + SHI + ' Chromatique</span>' : ''}</h3><div>${s.t.map(t => typeChip(t)).join('')}</div>
      <p class="sub">${esc(P.abilityOf(mon))}${mon.ab === 'h' ? ' ★' : ''} · ${P.NAT[mon.nat][0]} · IV ${ivTag(mon)}</p>
      <div class="row-btns"><button class="btn" id="streset" ${auto ? 'disabled' : ''}>Reset</button><button class="btn ${auto ? 'danger' : ''}" id="stauto">${auto ? 'Arrêter' : 'Reset auto jusqu’au chromatique'}</button></div>
      <p class="mut">${resets ? `${fmt(resets)} reset${resets > 1 ? 's' : ''}` : 'Pas satisfait ? Faites un reset, comme dans les jeux.'} · chromatique 1/${Gm.RATE.shiny}</p></div>`;
    pickEl.querySelector('#streset').onclick = () => { if (auto) return; resets++; mon = Gm.rollStarter(chosen); showMon(); if (mon.sh) shinyFx() };
    pickEl.querySelector('#stauto').onclick = () => { if (auto) { auto = false; showMon(); return } auto = true; showMon(); runAuto() };
  };
  const shinyFx = () => { if (W.Sound) { W.Sound.unlock(); W.Sound.sfx('shiny') } const h = pickEl.querySelector('.stspr'); if (h && W.playSparkle) W.playSparkle(h, 1.2) };
  const runAuto = async () => {
    while (auto) {
      for (let k = 0; k < 25 && auto; k++) { resets++; mon = Gm.rollStarter(chosen); if (mon.sh) { auto = false; break } }
      showMon(); if (mon.sh) { shinyFx(); break } await wait(40);
    }
  };
  const setPick = id => { auto = false; chosen = id; resets = 0; mon = Gm.rollStarter(id); grid.querySelectorAll('.stc').forEach(b => b.classList.toggle('on', +b.dataset.id === id)); showMon(); if (mon.sh) shinyFx(); go.disabled = false };
  grid.addEventListener('click', e => { const b = e.target.closest('.stc'); if (b && !spinning) setPick(+b.dataset.id) });
  let spinning = false;
  root.querySelector('#wheelbtn').addEventListener('click', async () => {
    if (spinning) return; spinning = true; go.disabled = true;
    const btns = [...grid.querySelectorAll('.stc')]; const target = Math.floor(Math.random() * btns.length);
    const steps = 27 * 2 + target + Math.floor(Math.random() * 3) * 0; let delay = 40;
    let cur = 0;
    for (let i = 0; i <= steps; i++) {
      cur = i % btns.length; btns.forEach((b, j) => b.classList.toggle('spin', j === cur));
      await wait(delay); if (i > steps - 14) delay *= 1.22; else if (i > steps - 30) delay *= 1.05;
    }
    btns.forEach(b => b.classList.remove('spin'));
    setPick(+btns[cur].dataset.id); btns[cur].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); spinning = false;
  });
  go.addEventListener('click', () => { const n = (root.querySelector('#pname').value || '').trim() || 'Sacha'; if (!chosen) return; auto = false; onDone(n, chosen, mon) });
};

// ---------- one-time gift for everyone: a chromatique Épique egg, as an apology for the bugs
let compOpen = false;
async function compGift() {
  const S = Gm.get(); if (W.NO_COMP || !S || S.flags.compEgg || compOpen || busy || modalStack.length || !document.querySelector('#nav button')) return; compOpen = true;
  try {
    let m = null;
    await UI.modal(`<div class="evo compg"><p class="eyebrow">🎁 Cadeau pour tous les dresseurs</p><h3>Merci pour votre patience !</h3><p class="mtxt">Pour s’excuser des divers bugs trouvés ces derniers temps, voici un <b>œuf de rareté Épique</b>… et il est <b>chromatique</b> ${SHI} !</p><div class="evostage"><div class="evo-a"><span class="eggart shiny"></span></div><div class="evo-b" id="compmon"></div></div><p class="mtxt" id="comptxt">&nbsp;</p><div class="mbtns"><button class="btn pri xl" id="compopen">Ouvrir</button><button class="btn pri" data-ret="1" id="compok" hidden>Super !</button></div></div>`, { cls: 'evom', noClose: true, onOpen: w => {
      w.querySelector('#compopen').onclick = () => {
        if (m) return; m = Gm.compEgg(); S.flags.compEgg = 1; const where = Gm.addCaught(m); Gm.save(); const s = sp(m.s);
        w.querySelector('#compopen').hidden = true; w.querySelector('#compmon').innerHTML = monIcon(m, 'big');
        w.querySelector('.evostage').classList.add('go'); if (W.Sound) setTimeout(() => W.Sound.sfx('shiny'), 1300);
        setTimeout(() => { const h = w.querySelector('.evo-b'); if (h && W.playSparkle) W.playSparkle(h, 1.3); w.querySelector('#comptxt').innerHTML = `<b>${esc(s.n)}</b> ${SHI} chromatique est né ! <span class="chip">${RAR[s.rar][0]}</span><br><small class="mut">IV ${P.ivPct(m)} % · envoyé ${where === 'team' ? 'dans votre équipe' : 'au PC'}.</small>`; w.querySelector('#compok').hidden = false }, 1700);
      };
    } });
    render();
  } finally { compOpen = false }
}
// (the one-time chromatique Épique gift is over: compGift is no longer offered)

// ---------- play time (counted while the page is visible)
let lastTick = Date.now();
setInterval(() => { const now = Date.now(), S = Gm.get(); if (S && document.visibilityState === 'visible') S.stats.play = (S.stats.play || 0) + Math.min(60, Math.round((now - lastTick) / 1000)); lastTick = now }, 10000);
// ---------- tick
setInterval(() => { if (Gm.get() && !busy) { header(); try { nav() } catch (e) { } } }, 30000);
UI.header = () => { try { header() } catch (e) { } };
UI.H = { monIcon, monName, monLine, monData, cleanMon, ivTag, evolveFlow, SHI, gdTag, spr, dnFmt, menuMusic, HEART, RAR };
})(window);
