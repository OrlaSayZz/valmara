// ===== Battle UI (implements the engine's io interface) =====
(function (W) {
'use strict';
const P = W.PK, Gm = W.Game; const { sp, mv, TL, TC } = P; const esc = Gm.esc;
const wait = ms => W.sleep ? W.sleep(W.bgHidden && W.bgHidden() ? Math.min(ms, 30) : ms) : new Promise(r => setTimeout(r, ms));
const SHI = W.SHICO ? '<img class="shi" src="' + W.SHICO + '" alt="chromatique">' : '✦';
const STC = { brn: ['BRÛ', '#e8643a'], par: ['PAR', '#e0b821'], psn: ['PSN', '#a95cc9'], tox: ['PSN+', '#8a3fb0'], slp: ['SOM', '#8a93a8'], frz: ['GEL', '#58b8de'] };
const WX = { sun: '☀ Soleil', rain: '🌧 Pluie', sand: '🌪 Sable', snow: '❄ Neige' };
const TNX = { ele: 'Champ Électrifié', gra: 'Champ Herbu', mist: 'Champ Brumeux', psy: 'Champ Psychique' };

function typeChip(t, small) { return `<span class="tchip${small ? ' sm' : ''}" style="--tc:${TC[t]}">${TL[t]}</span>` }
W.typeChip = typeChip;
function effLabel(e) { if (e === 0) return ['Aucun effet', 'e0']; if (e >= 4) return ['Super efficace ×4', 'e4']; if (e >= 2) return ['Super efficace', 'e2']; if (e < 1) return ['Peu efficace', 'e5']; return ['', ''] }

// shiny sparkle (the player's star animation, drawn from a sprite sheet so it restarts every time)
function playSparkle(host, scale = 1.15) {
  const SP = W.SPARKLE; if (!SP || !host) return;
  const d = document.createElement('div'); d.className = 'sparklefx';
  const size = Math.round(Math.max(host.clientWidth, host.clientHeight, 90) * scale);
  Object.assign(d.style, { width: size + 'px', height: size + 'px', backgroundImage: `url(${SP.src})`, backgroundSize: `${SP.c * size}px ${Math.ceil(SP.n / SP.c) * size}px` });
  host.appendChild(d);
  const t0 = performance.now();
  const step = t => { const i = Math.floor((t - t0) / SP.ms); if (i >= SP.n || !d.isConnected) { d.remove(); return } d.style.backgroundPosition = `${-(i % SP.c) * size}px ${-Math.floor(i / SP.c) * size}px`; requestAnimationFrame(step) };
  requestAnimationFrame(step);
}
W.playSparkle = playSparkle;
// ---------- attack effects by type (projectile for special moves, burst on the target)
const FX = {
  nor: ['star', ['#ffffff', '#f2efe6']], fir: ['flame', ['#ffb347', '#ff6a2a', '#ffd23f']], wat: ['bubble', ['#7fd3ff', '#3a8dff', '#c8f0ff']], ele: ['bolt', ['#ffe14d', '#fff7a8']],
  gra: ['leaf', ['#5fd35f', '#2e9e45', '#b5f08a']], ice: ['shard', ['#bff3ff', '#7fd6ff', '#ffffff']], fig: ['star', ['#ff9a3c', '#ffd27a']], poi: ['bubble', ['#b45cd6', '#d68cff']],
  gro: ['dust', ['#c49a5a', '#8a6a3a']], fly: ['streak', ['#ffffff', '#cfe8ff']], psy: ['ring', ['#ff7ac8', '#ffb3e0']], bug: ['dust', ['#a6d64a', '#6e9e2a']],
  roc: ['rock', ['#a99a7a', '#7a6e58']], gho: ['wisp', ['#8a6ad6', '#4a3a8a']], dra: ['flame', ['#7a6aff', '#3a2ad6', '#c0b0ff']], dar: ['slash', ['#2a2a3a', '#6a5a8a']],
  ste: ['shard', ['#d8dde6', '#9aa3b0']], fai: ['spark', ['#ffb3e6', '#ffffff', '#ff8ad0']],
};
function fxCenter(el, ar) { const r = el.getBoundingClientRect(), a = ar.getBoundingClientRect(); return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height * 0.55, w: r.width } }
async function attackFx(ar, from, to, type, special, k) {
  const conf = FX[type] || FX.nor; const [shape, cols] = conf; const layer = document.createElement('div'); layer.className = 'fxl'; ar.appendChild(layer);
  const A = from ? fxCenter(from, ar) : null, B = fxCenter(to, ar); const dur = 420 * k; const anims = [];
  const mk = (x, y, i) => { const p = document.createElement('i'); p.className = 'fxp fx-' + shape; p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.setProperty('--c', cols[i % cols.length]); layer.appendChild(p); return p };
  if (special && A) {
    for (let i = 0; i < 9; i++) { const p = mk(A.x, A.y, i); const jx = (Math.random() - .5) * 30, jy = (Math.random() - .5) * 30;
      anims.push(p.animate([{ transform: `translate(-50%,-50%) scale(.6)`, opacity: 0 }, { opacity: 1, offset: .15 }, { transform: `translate(calc(-50% + ${B.x - A.x + jx}px), calc(-50% + ${B.y - A.y + jy}px)) scale(1.1) rotate(${(Math.random() - .5) * 180}deg)`, opacity: 1 }], { duration: dur, delay: i * 35 * k, easing: 'ease-in', fill: 'forwards' }).finished) }
    await Promise.race([Promise.all(anims), wait(2500)]); anims.length = 0; layer.innerHTML = '';
  }
  const n = shape === 'ring' ? 3 : 12;
  for (let i = 0; i < n; i++) { const p = mk(B.x, B.y, i); const ang = (i / n) * Math.PI * 2 + Math.random() * .4, dist = (shape === 'ring' ? 0 : B.w * (0.25 + Math.random() * .3));
    const end = shape === 'ring' ? `translate(-50%,-50%) scale(${2.5 + i})` : shape === 'flame' || shape === 'wisp' || shape === 'bubble' ? `translate(calc(-50% + ${Math.cos(ang) * dist * .6}px), calc(-50% + ${-Math.abs(Math.sin(ang)) * dist - 20}px)) scale(.4)` : `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(.5) rotate(${ang * 57}deg)`;
    anims.push(p.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: end, opacity: 0 }], { duration: dur * 1.2, delay: (shape === 'ring' ? i * 90 : 0) * k, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).finished) }
  await Promise.race([Promise.all(anims), wait(2500)]); layer.remove();
}
class BUI {
  constructor(opts) {
    this.opts = opts; const S = Gm.get();
    this.baseSpeed = [0, 1000, 560, 280, 90][S.set.speed || 2]; this.k = S.set.fast ? 0.5 : 1; this.speed = this.baseSpeed * this.k;
    const root = document.getElementById('battle'); root.innerHTML = ''; root.hidden = false; root.className = 'battle bio-' + (opts.bio || 'meadow') + (Gm.isNight() && !opts.indoor ? ' night' : '');
    document.body.classList.add('in-battle');
    root.innerHTML = `
      <div class="arena" id="arena">
        <div class="bfield" id="bfield"></div>
        <div class="stage"><div class="bside foe" id="bs1"></div>
        <div class="bside me" id="bs0"></div></div>
        <div class="ballfx" id="ballfx" hidden></div>
        <div class="sndbar">${opts.farm ? '<button type="button" class="wide farmb on" id="bfarm" title="Arrêter le farm après ce combat">∞ Stop</button>' : ''}<button type="button" class="wide" id="bauto" aria-pressed="false" title="Combat automatique">Auto</button><button type="button" class="wide" id="bfast" aria-pressed="false" title="Vitesse ×2">×2</button><button type="button" id="sndv" aria-label="Volume" aria-expanded="false">🔊</button><div class="volpop" id="volpop" hidden><div class="vrow"><button type="button" class="vtg" id="sndm">♪ Musique</button><input type="range" min="0" max="100" step="1" data-vol="mvol" aria-label="Volume de la musique"><output></output></div><div class="vrow"><button type="button" class="vtg" id="snds">🔈 Bruitages</button><input type="range" min="0" max="100" step="1" data-vol="svol" aria-label="Volume des bruitages"><output></output></div><div class="vrow"><button type="button" class="vtg" id="sndd">🌙 Sombre</button><input type="range" min="10" max="85" step="1" data-dim="1" aria-label="Intensité de l’assombrissement"><output></output></div></div></div>
      </div>
      <div class="bbottom">
        <div class="bmsg" id="bmsg" tabindex="0" aria-live="polite"><span id="bmsgt"></span><i class="bnext"></i></div>
        <div class="bact" id="bact"></div>
      </div>`;
    this.root = root; this.msgEl = root.querySelector('#bmsgt'); this.act = root.querySelector('#bact');
    this.skip = null;
    root.querySelector('#bmsg').addEventListener('click', () => { if (this.skip) this.skip() });
    this.keyH = e => { if ((e.key === ' ' || e.key === 'Enter') && this.skip && (this.act.classList.contains('busy') || !this.act.innerHTML.trim())) { e.preventDefault(); this.skip() } };
    if (W.Sound) { W.Sound.unlock(); W.Sound.play(opts.music || (opts.kind === 'wild' ? 'wild' : 'trainer')) }
    document.addEventListener('keydown', this.keyH);
    this.slotsBuilt = false;
    const sb = () => { const st = Gm.get().set; root.querySelector('#sndm').classList.toggle('off', st.music === 0); root.querySelector('#snds').classList.toggle('off', st.sfx === 0); root.querySelector('#sndv').classList.toggle('off', st.music === 0 && st.sfx === 0);
      const r = root.querySelectorAll('#volpop input[data-vol]'); r.forEach(el => { const v = st[el.dataset.vol]; el.value = v == null ? (el.dataset.vol === 'mvol' ? 50 : 80) : v; el.nextElementSibling.textContent = el.value + ' %' }); const dd = root.querySelector('#sndd'), di = root.querySelector('#volpop input[data-dim]'); if (dd) { dd.classList.toggle('off', !st.bdim); di.value = st.bdimv || 45; di.nextElementSibling.textContent = di.value + ' %' } };
    const pop = root.querySelector('#volpop'), vb = root.querySelector('#sndv');
    vb.addEventListener('click', e => { e.stopPropagation(); pop.hidden = !pop.hidden; vb.setAttribute('aria-expanded', String(!pop.hidden)); sb() });
    pop.addEventListener('click', e => e.stopPropagation()); root.querySelector('#sndd').addEventListener('click', () => { const st = Gm.get().set; st.bdim = st.bdim ? 0 : 1; Gm.save(true); if (W.applyShCol) W.applyShCol(); sb() });
    this.rootClick = () => { if (!pop.hidden) { pop.hidden = true; vb.setAttribute('aria-expanded', 'false') } }; root.addEventListener('click', this.rootClick);
    const ab = root.querySelector('#bauto'), fb = root.querySelector('#bfast');
    const paint = () => { const st = Gm.get().set; const on = this.opts.farm ? !this.manual : !!st.auto; ab.classList.toggle('on', on); ab.setAttribute('aria-pressed', String(on)); fb.classList.toggle('on', !!st.fast); fb.setAttribute('aria-pressed', String(!!st.fast)) };
    paint();
    const fbtn = root.querySelector('#bfarm');
    if (fbtn) fbtn.addEventListener('click', e => { e.stopPropagation(); if (W.FARM) W.FARM.on = false; fbtn.classList.remove('on'); fbtn.textContent = 'Dernier combat'; fbtn.disabled = true; UI.toast('Le farm s’arrête après ce combat.') });
    ab.addEventListener('click', e => { e.stopPropagation(); const st = Gm.get().set;
      if (this.opts.farm) { this.manual = !this.manual; paint(); if (this.manual) { if (W.FARM) W.FARM.on = false; const fb2 = root.querySelector('#bfarm'); if (fb2) { fb2.classList.remove('on'); fb2.textContent = 'Dernier combat'; fb2.disabled = true } UI.toast('Mode auto désactivé : à vous de jouer. Le farm s’arrête après ce combat.') } else if (this.autoKick) this.autoKick(); return }
      st.auto = st.auto ? 0 : 1; Gm.save(true); paint(); if (!st.auto) UI.toast('Mode auto désactivé : à vous de jouer.');
      if (st.auto && this.opts.autoBlock) UI.toast('Combat auto en pause : Pokémon recherché, rare ou chromatique, à vous de jouer !');
      else if (st.auto && this.autoKick) this.autoKick() });
    fb.addEventListener('click', e => { e.stopPropagation(); const st = Gm.get().set; st.fast = st.fast ? 0 : 1; Gm.save(true); this.k = st.fast ? 0.5 : 1; this.speed = this.baseSpeed * this.k; paint() });
    if (Gm.get().set.auto && opts.autoBlock) setTimeout(() => UI.toast('Combat auto en pause : Pokémon recherché, rare ou chromatique, à vous de jouer !'), 300);
    root.querySelector('#sndm').addEventListener('click', e => { e.stopPropagation(); const st = Gm.get().set; st.music = st.music === 0 ? 1 : 0; if (W.Sound) W.Sound.play(st.music !== 0 ? (opts.music || (opts.kind === 'wild' ? 'wild' : 'trainer')) : false); Gm.save(true); sb() });
    root.querySelector('#snds').addEventListener('click', e => { e.stopPropagation(); const st = Gm.get().set; st.sfx = st.sfx === 0 ? 1 : 0; Gm.save(true); sb() });
    sb();
  }
  close() { if (this.rootClick) { this.root.removeEventListener('click', this.rootClick); this.rootClick = null } this.skip = null; this.autoKick = null; this.b = null; if (W.Sound) W.Sound.play(false); if (this.ro) this.ro.disconnect(); W.Scene && W.Scene.unmount(this.root.querySelector('#arena')); document.removeEventListener('keydown', this.keyH); this.root.hidden = true; this.root.innerHTML = ''; document.body.classList.remove('in-battle') }
  buildSlots(b) {
    for (const s of b.sides) {
      const el = this.root.querySelector('#bs' + s.i); el.innerHTML = '';
      el.classList.toggle('dbl', b.n === 2);
      for (let k = 0; k < b.n; k++) {
        el.insertAdjacentHTML('beforeend', `<div class="bslot" data-s="${s.i}" data-k="${k}"><div class="binfo"><div class="bname"><b></b><span class="blv"></span></div><div class="hpbar"><u></u><i></i></div><div class="bhpn"></div><div class="xpbar"><i></i></div></div><div class="bspr"><img alt=""><div class="stfx"></div></div></div>`);
      }
    }
    this.slotsBuilt = true;
    this.b = b; this.paintScene();
    const f0 = b.sides[0].act.find(Boolean);
    if (f0 && !this.lastMenu) this.lastMenu = '<div class="bmoves">' + f0.m.m.map(([k, pp, up]) => { const m = mv(k); return m ? `<button class="mvb" disabled style="--tc:${TC[m.t]}"><b>${esc(m.n)}</b><small><span class="tl">${TL[m.t]}</span> · ${m.c === 0 ? 'Statut' : m.c === 1 ? 'Phys.' : 'Spé.'}${m.p ? ' · ' + m.p : ''}<span class="pp">${pp}/${P.ppMax([k, pp, up])}</span></small></button>` : '' }).join('') + '</div><div class="bcmds"><button disabled>Sac</button><button disabled>Pokémon</button>' + (b.kind === 'wild' ? '<button disabled>Fuite</button>' : '') + '</div>';
    this.resH = () => { clearTimeout(this.rt); this.rt = setTimeout(() => { this.paintScene(); this.root.querySelectorAll('.bspr img').forEach(i => this.sizeImg(i)) }, 150) };
    this.ro = new ResizeObserver(this.resH); this.ro.observe(this.root.querySelector('#arena'));
  }
  paintScene() {
    const ar = this.root.querySelector('#arena'); if (!ar || !W.Scene) return;
    const plats = [...this.root.querySelectorAll('.bspr')].map(el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - r.height * 0.08, w: Math.min(r.width * 0.95, 220) } });
    const r = ar.getBoundingClientRect();
    W.Scene.mount(ar, this.opts.bio || 'meadow', { night: Gm.isNight() && !this.opts.indoor, platforms: plats, px: r.width < 600 ? 2 : 3, horizon: r.height > r.width ? 0.36 : 0.46 });
  }
  // battle sprite size follows the Pokémon's real height (like the main games): a Joltik stays small, a Wailord fills its spot.
  // The size is measured on what is really drawn (one frame of an animation can use only part of its canvas) and flat
  // Pokémon (Limonde…) are measured on their width too.
  sizeImg(img) {
    if (!img.naturalHeight) return; const box = img.parentElement; const back = img.dataset.back === '1';
    const bh = box.clientHeight * (back ? 1.2 : 1), bw = box.clientWidth;
    const [fh0, fw0] = (img.dataset.fill || '').split(',').map(Number); const fh = fh0 || 1, fw = fw0 || 1;
    const hm = W.PH && W.PH[img.dataset.pid] != null ? W.PH[img.dataset.pid] / 10 : 1;
    const t = Math.max(0, Math.min(1, (Math.log(Math.max(0.1, hm)) - Math.log(0.25)) / (Math.log(6) - Math.log(0.25))));
    const want = bh * (0.32 + 0.66 * t); // visible size wanted, in px
    const visH = img.naturalHeight * fh, visW = img.naturalWidth * fw;
    let hgt = img.naturalHeight * want / Math.max(visH, visW * 0.55);
    hgt = Math.max(hgt, img.naturalHeight * bh * 0.24 / visH); // very flat Pokémon stay readable
    const wMax = bw * 1.9; if (img.naturalWidth * hgt / img.naturalHeight * fw > wMax) hgt = wMax / fw * img.naturalHeight / img.naturalWidth;
    hgt = Math.min(hgt, bh * 1.05 / fh);
    img.style.height = Math.round(hgt) + 'px'; img.classList.toggle('pix', img.naturalHeight < 110 && img.dataset.home !== '1');
  }
  slotEl(bm) { const s = bm.side; const k = s.act.indexOf(bm); if (k < 0) return null; return this.root.querySelector(`.bslot[data-s="${s.i}"][data-k="${k}"]`) }
  async msg(t) {
    this.msgEl.textContent = t; this.idle();
    const ms = W.bgHidden && W.bgHidden() ? 40 : this.speed + Math.min(500, t.length * (this.speed / 110));
    await new Promise(r => { const tm = W.tmo ? W.tmo(r, ms) : { t: setTimeout(r, ms) }; this.skip = () => { if (W.untmo) W.untmo(tm); else clearTimeout(tm.t); r() } });
    this.skip = null;
  }
  async update(b) {
    if (!this.slotsBuilt) { this.buildSlots(b); if (b.kind !== 'wild' && !this.introDone) { this.introDone = true; this.trainerIntro(b) } }
    const fl = this.root.querySelector('#bfield'); const f = b.field; const chips = [];
    if (b.weather()) chips.push(WX[b.weather()]); if (f.terrain) chips.push(TNX[f.terrain]); if (f.trick) chips.push('Distorsion');
    for (const s of b.sides) { const p = s.isPlayer ? 'Vous' : 'Adv.'; if (s.f.reflect) chips.push(p + ' : Protection'); if (s.f.light) chips.push(p + ' : Mur Lumière'); if (s.f.veil) chips.push(p + ' : Voile Aurore'); if (s.f.tail) chips.push(p + ' : Vent Arrière'); if (s.f.rocks) chips.push(p + ' : Piège de Roc'); if (s.f.spikes) chips.push(p + ' : Picots ×' + s.f.spikes) }
    fl.innerHTML = chips.map(c => `<span>${esc(c)}</span>`).join('');
    if (W.WxFX) { const vis = b.weather() || (['fog', 'wind'].includes(this.opts.wxv) ? this.opts.wxv : ''); const ar = this.root.querySelector('#arena'); try { W.WxFX.mount(ar, this.opts.indoor ? { kind: vis, night: false, dusk: 0, dawn: 0, z: 2 } : { kind: vis, night: Gm.isNight(), z: 2 }) } catch (e) { } }
    for (const s of b.sides) {
      for (let k = 0; k < b.n; k++) {
        const el = this.root.querySelector(`.bslot[data-s="${s.i}"][data-k="${k}"]`); if (!el) continue;
        const bm = s.act[k];
        if (!bm) { el.classList.add('empty'); continue }
        el.classList.remove('empty');
        if (el.dataset.u !== bm.m.u) { el.dataset.u = bm.m.u; el.classList.remove('a-faint', 'a-shine', 'a-hit', 'fainted'); if (bm.alive && (s.isPlayer || b.kind !== 'wild')) this.sendOut(el, bm.m.ball || 'Poké Ball') }
        const L0 = bm.v.illusion || bm; // Illusion: show the disguise (sprite, shiny, gender…)
        const img = el.querySelector('.bspr img') || el.querySelector('img:not(.shi)'); const ix = bm.v.transIx != null ? bm.v.transIx : bm.ix;
        let src = Gm.spriteURL(ix, L0.m.sh); let back = false; let animK = '';
        if (bm.v.transIx == null) {
          const ak = (s.isPlayer ? 'b' : 'f') + (L0.m.sh ? 's' : 'n'); const re = () => { if (!this.root.hidden) this.update(b) };
          const an = Gm.animURL(ak, bm.backId, re) || (bm.backId !== L0.base.id && !L0.form && !L0.megaData ? Gm.animURL(ak, L0.base.id, re) : '');
          const animSet = W.ANIX && W.ANIX.fn && Object.keys(W.ANIX.fn).length; const ak2 = 'f' + (L0.m.sh ? 's' : 'n');
          const hasAnim = id => W.ANIX && W.ANIX[ak2] && W.ANIX[ak2][id] != null;
          const homeOnly = animSet && !hasAnim(bm.backId) && !hasAnim(L0.base.id) && !(L0.base.id === 10094);
          // no animated sprite: the still pixel sprite (same style as the animated ones), the HOME render only as a last resort
          // no animated sprite (9th gen): the sharp HOME render on both sides, turned towards the foe for the player
          const hd = !an && (Gm.homeHD(bm.backId, L0.m.sh) || Gm.homeHD(L0.base.id, L0.m.sh));
          if (hd) src = hd;
          else if (s.isPlayer) { const bu = an || Gm.backURL(bm.backId, L0.m.sh) || Gm.backURL(L0.base.id, L0.m.sh); if (bu) { src = bu; back = true } }
          else { const fu = an || Gm.frontURL(bm.backId, L0.m.sh) || Gm.frontURL(L0.base.id, L0.m.sh); if (fu) src = fu }
          if (an && src === an) animK = ak;
          // Halloween palette: its own still sprites (front for the foe, back for the player)
          const hu = L0.m.hw && !L0.megaData && !L0.form && Gm.hwURL(L0.base.id, L0.m.sh, s.isPlayer); if (hu) { src = hu; back = s.isPlayer; animK = '' }
        }
        img.classList.toggle('front', s.isPlayer && !back); img.dataset.back = back ? '1' : '0';
        { const F = animK && W.AFILL && W.AFILL[animK]; const fl = F ? (F[bm.backId] || F[L0.base.id]) : null; img.dataset.fill = fl ? fl.join(',') : ''; img.dataset.pid = (W.PH && W.PH[bm.backId] != null) ? bm.backId : L0.base.id } img.dataset.home = (animK && W.ANIM_SMOOTH && (W.ANIM_SMOOTH.includes(bm.backId) || W.ANIM_SMOOTH.includes(L0.base.id))) || src === Gm.spriteURL(ix, L0.m.sh) || src.startsWith('blob:') && src === (Gm.homeHD(bm.backId, L0.m.sh) || Gm.homeHD(L0.base.id, L0.m.sh)) ? '1' : '0'; if (img.dataset.src !== src) { img.classList.remove('pix'); img.onload = () => this.sizeImg(img); const fb = Gm.spriteURL(ix, L0.m.sh); img.onerror = () => { if (img.src !== fb) { img.dataset.src = fb; img.dataset.home = '1'; img.src = fb } }; img.src = src; img.dataset.src = src; el.classList.remove('fainted', 'caught') }
        el.classList.toggle('fainted', !bm.alive); el.classList.toggle('shiny', !!L0.m.sh); if (L0.m.sh && !bm.v.shinyShown) { bm.v.shinyShown = true; el.classList.remove('a-shine'); void el.offsetWidth; el.classList.add('a-shine'); setTimeout(() => playSparkle(el.querySelector('.bspr') || el), 120); if (W.Sound) setTimeout(() => W.Sound.sfx('shiny'), 150) } el.classList.toggle('mega', !!L0.megaData);
        el.querySelector('.bname b').innerHTML = esc(bm.name) + (L0.m.gd === 'f' ? ' <i class="gd f">♀</i>' : L0.m.gd === 'm' ? ' <i class="gd m">♂</i>' : '') + (L0.m.hw ? ' <em class="hwtag">☾</em>' : '') + (L0.m.sh ? ' <em class="shs">' + SHI + '</em>' : '') + (L0.megaData ? ' <em class="mg">M</em>' : '');
        el.classList.toggle('tera', !!bm.tera); el.classList.toggle('raidboss', !!bm.raidBoss); if (bm.tera) { el.style.setProperty('--tera', TC[bm.tera]); el.querySelector('.bname b').innerHTML += ` <em class="terac" style="--tera:${TC[bm.tera]}">Téra ${TL[bm.tera]}</em>` }
        const st = bm.status ? `<span class="stx" style="--sc:${STC[bm.status][1]}">${STC[bm.status][0]}</span>` : '';
        el.querySelector('.blv').innerHTML = st + 'N.' + bm.L;
        { const sf = el.querySelector('.stfx'); const want = bm.alive && bm.status ? (bm.status === 'tox' ? 'psn' : bm.status) : ''; if (sf && sf.dataset.s !== want) { sf.dataset.s = want; sf.className = 'stfx' + (want ? ' st-' + want : ''); sf.innerHTML = want ? Array.from({ length: want === 'slp' ? 3 : 6 }, (_, i) => `<i style="--i:${i}">${want === 'slp' ? 'z' : ''}</i>`).join('') : '' } }
        const pct = Math.max(0, bm.hp / bm.mhp * 100);
        const bar = el.querySelector('.hpbar i'); bar.style.width = pct + '%'; bar.className = pct > 50 ? '' : pct > 20 ? 'mid' : 'low';
        { const tr = el.querySelector('.hpbar u'); if (tr) { const prev = tr.dataset.p != null && tr.dataset.u === bm.m.u ? +tr.dataset.p : pct; tr.style.transition = pct >= prev ? 'none' : ''; tr.style.width = pct + '%'; tr.dataset.p = pct; tr.dataset.u = bm.m.u } }
        { const hn = el.querySelector('.bhpn'); if (!s.isPlayer) hn.textContent = ''; else { const to = bm.hp, from = hn.dataset.hp != null && hn.dataset.u === bm.m.u ? +hn.dataset.hp : to; hn.dataset.hp = to; hn.dataset.u = bm.m.u; if (from === to) hn.textContent = `${to} / ${bm.mhp}`; else { const t0 = performance.now(), D = 850 * this.k; const stp = t => { const q = Math.min(1, (t - t0) / D); if (hn.dataset.hp != to) return; hn.textContent = `${Math.round(from + (to - from) * (1 - Math.pow(1 - q, 2)))} / ${bm.mhp}`; if (q < 1) requestAnimationFrame(stp) }; requestAnimationFrame(stp) } } }
        const xp = el.querySelector('.xpbar');
        if (s.isPlayer && !b.o.fixedLevel) { const sp0 = sp(bm.m.s); const a = P.expFor(sp0.gr, bm.m.lv), z = P.expFor(sp0.gr, bm.m.lv + 1); xp.hidden = false; xp.querySelector('i').style.width = (bm.m.lv >= 100 ? 100 : Math.max(0, Math.min(100, (bm.m.xp - a) / Math.max(1, z - a) * 100))) + '%' } else xp.hidden = true;
      }
    }
    await wait(0);
  }
  // stat changes: arrows rising (red) or falling (blue) over the Pokémon
  statArrows(el, up) {
    const host = el.querySelector('.bspr'); if (!host) return; const L = document.createElement('div'); L.className = 'starr ' + (up ? 'up' : 'dn'); host.appendChild(L);
    for (let i = 0; i < 7; i++) { const a = document.createElement('i'); a.style.left = (12 + i * 12 + Math.random() * 6) + '%'; a.style.animationDelay = (i % 3) * 0.12 + Math.random() * 0.1 + 's'; L.appendChild(a) }
    setTimeout(() => L.remove(), 1300);
  }
  // Mega Evolution: a rainbow sphere of energy wraps the Pokémon, then shatters
  async megaFx(el) {
    const host = el.querySelector('.bspr'); if (!host) return; const k = this.k || 1;
    const f = document.createElement('div'); f.className = 'megafx'; f.innerHTML = '<i class="orbm"></i>' + Array.from({ length: 14 }, (_, i) => `<b style="--a:${i * 360 / 14}deg;--d:${50 + (i % 3) * 25}px"></b>`).join(''); host.appendChild(f);
    await wait(1100 * k); f.classList.add('break'); await wait(650 * k); f.remove();
  }
  // physical moves: the attacker dashes toward its target and back
  async lunge(fromEl, toEl) {
    const a = fromEl.querySelector('.bspr img'), t = toEl.querySelector('.bspr'); if (!a || !t) return;
    const r1 = a.getBoundingClientRect(), r2 = t.getBoundingClientRect(); const dx = (r2.left + r2.width / 2 - (r1.left + r1.width / 2)) * .28, dy = (r2.top + r2.height / 2 - (r1.top + r1.height / 2)) * .28;
    try { await a.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-dx * .15}px,${-dy * .15}px)`, offset: .3 }, { transform: `translate(${dx}px,${dy}px)`, offset: .62 }, { transform: 'translate(0,0)' }], { duration: 380 * this.k, easing: 'ease-in-out' }).finished } catch (e) { }
  }
  // trainer battles: a banner crosses the screen with the trainer's name and one ball per Pokémon
  trainerIntro(b) {
    const ar = this.root.querySelector('#arena'); if (!ar || (W.bgHidden && W.bgHidden())) return; const foe = b.sides[1];
    const name = (foe.cls ? foe.cls + ' ' : '') + (foe.name || 'Dresseur'); const balls = foe.mons.map(m => `<i class="tib ${m.alive ? '' : 'ko'}"></i>`).join('');
    const d = document.createElement('div'); d.className = 'tintro'; d.innerHTML = `<div class="tiband"><span class="tiname">${esc(name)}</span><span class="tiballs">${balls}</span></div>`; ar.appendChild(d);
    setTimeout(() => d.remove(), 2600 * (this.k || 1));
  }
  // a Poké Ball pops open in a flash when a Pokémon is sent out
  sendOut(el, ball) {
    const host = el.querySelector('.bspr'); if (!host) return; const u = Gm.itemURL(ball) || Gm.itemURL('Poké Ball'); const k = this.k || 1;
    const fx = document.createElement('div'); fx.className = 'sendfx'; fx.innerHTML = (u ? `<img src="${u}" alt="">` : '') + '<i class="flash"></i><i class="ring"></i>' + Array.from({ length: 8 }, (_, i) => `<i class="spk" style="--a:${i * 45}deg"></i>`).join(''); host.appendChild(fx);
    fx.querySelector('.ring').animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(0)', opacity: 0, offset: .4 }, { transform: 'translate(-50%,-50%) scale(.6)', opacity: .9, offset: .55 }, { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0 }], { duration: 800 * k, fill: 'forwards' });
    fx.querySelectorAll('.spk').forEach(s => s.animate([{ transform: `translate(-50%,-50%) rotate(${s.style.getPropertyValue('--a')}) translateY(0) scale(0)`, opacity: 0 }, { opacity: 0, offset: .42 }, { transform: `translate(-50%,-50%) rotate(${s.style.getPropertyValue('--a')}) translateY(-10px) scale(1)`, opacity: 1, offset: .55 }, { transform: `translate(-50%,-50%) rotate(${s.style.getPropertyValue('--a')}) translateY(-60px) scale(.3)`, opacity: 0 }], { duration: 850 * k, easing: 'ease-out', fill: 'forwards' }));
    const img = host.querySelector('img:not(.shi)'); if (img && img.parentElement === host) img.animate([{ transform: 'scale(0)', filter: 'brightness(4)', opacity: 0 }, { transform: 'scale(0)', opacity: 0, offset: .45 }, { transform: 'scale(1.08)', filter: 'brightness(2.2)', opacity: 1, offset: .75 }, { transform: 'scale(1)', filter: 'none', opacity: 1 }], { duration: 900 * k, easing: 'ease-out' });
    const bi = fx.querySelector('img'); if (bi) bi.animate([{ transform: 'translate(-50%,-160%) scale(.6) rotate(-200deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1, offset: .4 }, { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 0 }], { duration: 650 * k, easing: 'ease-out', fill: 'forwards' });
    fx.querySelector('.flash').animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(0)', opacity: 0, offset: .35 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .55 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 750 * k, fill: 'forwards' });
    setTimeout(() => fx.remove(), 950 * k);
  }
  autoOn() { if (this.opts.farm) return !this.manual; return !!Gm.get().set.auto && !this.opts.autoBlock }
  idle() { if (this.act.classList.contains('busy')) return; this.act.innerHTML = this.lastMenu || ''; this.act.classList.add('busy') }
  show(html) { this.act.innerHTML = html; this.act.classList.remove('busy') }
  async anim(kind, bm, b, opt = {}) {
    if (kind === 'weather') return;
    if (W.Sound && !(kind === 'hit' && opt.mt)) W.Sound.sfx(kind, opt);
    const el = bm ? this.slotEl(bm) : null; const fast = this.speed <= 150;
    if (W.bgHidden && W.bgHidden()) return; // tab in the background: no visuals, the fight keeps going
    if (kind === 'ball') return this.ballAnim(bm, opt);
    if (!el) return;
    const cls = { hit: 'a-hit', faint: 'a-faint', up: 'a-up', down: 'a-down', status: 'a-status', heal: 'a-heal', mega: 'a-mega', lvl: 'a-lvl' }[kind];
    if (!cls) return;
    if (kind === 'hit' && opt.mt && this.root.querySelector('#arena')) { try { const ae = opt.u ? this.slotEl(opt.u) : null; const m = opt.k && mv(opt.k); if (m && m.c === 1 && ae) await this.lunge(ae, el); await attackFx(this.root.querySelector('#arena'), ae && ae.querySelector('.bspr'), el.querySelector('.bspr') || el, opt.mt, m && m.c === 2, this.k * (this.speed <= 150 ? 0.5 : 1)) } catch (e) { } if (W.Sound) W.Sound.sfx('hit', opt) }
    if (kind === 'hit' && !fast) { const ar = this.root.querySelector('#arena'); if (ar && (opt.e > 1 || opt.crit)) ar.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }], { duration: 260 * this.k }); if (opt.crit && ar) { const f = document.createElement('i'); f.className = 'critflash'; ar.appendChild(f); setTimeout(() => f.remove(), 400) } }
    if ((kind === 'up' || kind === 'down') && !fast) this.statArrows(el, kind === 'up');
    if (kind === 'mega') await this.megaFx(el);
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    const d = { hit: 380, faint: 760, up: 380, down: 380, status: 320, heal: 380, mega: 1100, lvl: 300 }[kind];
    await wait((fast ? d / 3 : d) * this.k);
    if (kind !== 'faint') el.classList.remove(cls);
  }
  async ballAnim(bm, { shakes, caught, ball }) {
    const el = this.slotEl(bm); const fx = this.root.querySelector('#ballfx');
    const col = (P.IT[ball] && P.IT[ball].col) || '#e0483e';
    fx.hidden = false; const bu = Gm.itemURL(ball); fx.innerHTML = bu ? `<img class="orb ballimg" src="${bu}" alt="">` : `<span class="orb" style="--bc:${col}"></span>`;
    const orb = fx.firstChild;
    const r = el.querySelector('.bspr').getBoundingClientRect(), a = this.root.querySelector('#arena').getBoundingClientRect();
    fx.style.left = (r.left - a.left + r.width / 2 - 14) + 'px'; fx.style.top = (r.top - a.top + r.height * 0.55) + 'px';
    if (W.Sound) W.Sound.sfx('throw'); orb.classList.add('throw'); await wait(450 * this.k);
    el.classList.add('inball'); await wait(350);
    for (let i = 0; i < shakes; i++) { orb.classList.remove('shake'); void orb.offsetWidth; orb.classList.add('shake'); if (W.Sound) W.Sound.sfx('shake'); await wait(520) }
    if (caught) { orb.classList.add('lock'); if (W.Sound) W.Sound.sfx('catch'); const rar = sp(bm.base.id).rar; const n = rar === 'legendaire' ? 26 : rar === 'epique' ? 18 : rar === 'rare' ? 12 : 8; for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'cstar' + (rar === 'legendaire' || rar === 'epique' ? ' big' : ''); fx.appendChild(s); const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * (n * 3 + 30); s.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 20}px)) scale(1) rotate(${a * 120}deg)`, opacity: 1, offset: .6 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d + 10}px)) scale(.4)`, opacity: 0 }], { duration: 900 + Math.random() * 400, easing: 'ease-out', fill: 'forwards' }) } await wait(1000) }
    else { el.classList.remove('inball'); orb.classList.add('burst'); await wait(320) }
    fx.hidden = true; fx.innerHTML = '';
    if (caught) el.classList.add('caught');
  }

  // ---------- choices
  async choose(b) {
    const side = b.sides[0]; const acts = []; const slots = side.act.map((x, k) => ({ x, k })).filter(o => o.x && o.x.alive);
    let i = 0;
    while (i < slots.length) {
      const bm = slots[i].x;
      if (bm.v.charging || bm.v.rampage || bm.v.recharge) { acts[i] = { kind: 'move', user: bm, k: bm.v.charging ? bm.v.charging.k : bm.v.rampage ? bm.v.rampage.k : 'struggle', tgt: bm.v.charging ? bm.v.charging.tgt : null }; i++; continue }
      if (this.autoOn()) { await wait(120 * this.k); acts[i] = b.autoChoose(bm); i++; continue }
      const r = await new Promise(res => { this.autoKick = () => { this.autoKick = null; res(b.autoChoose(bm)) }; this.menu(b, bm, i > 0, acts).then(v => { this.autoKick = null; res(v) }) });
      if (r === 'back') { i = Math.max(0, i - 1); acts.length = i; continue }
      acts[i] = r;
      if (r.kind === 'run') return [r];
      i++;
    }
    this.idle();
    return acts;
  }
  menu(b, bm, canBack, prev) {
    return new Promise(res => {
      const S = Gm.get(); const foes = b.active(b.sides[1]);
      const megaOK = b.sides[0].megaRing && !b.sides[0].megaUsed && b.megaFor(bm) && !prev.some(a => a && a.mega);
      let megaOn = false;
      const draw = () => {
        this.msgEl.textContent = `Que doit faire ${bm.name} ?`;
        const moves = bm.m.m;
        const allOut = moves.every(x => x[1] <= 0 || !b.canSelect(bm, x[0]));
        let html = '<div class="bmoves">';
        if (allOut) html += `<button class="mvb" data-a="struggle" style="--tc:${TC.nor}"><b>Lutte</b><small>Plus aucune capacité utilisable</small></button>`;
        else moves.forEach((x, idx) => {
          const m = mv(x[0]); if (!m) return; const ok = x[1] > 0 && b.canSelect(bm, x[0]);
          let el = ['', '']; if (m.p > 0 && foes.length === 1) { const t = b.moveType(bm, x[0], m); let e = P.eff(t, (foes[0].v.illusion || foes[0]).types); if (t === 'gro' && !foes[0].grounded(b)) e = 0; el = effLabel(e) }
          html += `<button class="mvb" data-a="mv" data-i="${idx}" ${ok ? '' : 'disabled'} style="--tc:${TC[m.t]}"><b>${esc(m.n)}</b><small><span class="tl">${TL[m.t]}</span> · ${m.c === 0 ? 'Statut' : m.c === 1 ? 'Phys.' : 'Spé.'}${m.p ? ' · ' + m.p : ''}<span class="pp">${x[1]}/${P.ppMax(x)}</span></small>${el[0] ? `<span class="eff ${el[1]}">${el[0]}</span>` : ''}</button>`;
        });
        html += '</div><div class="bcmds">';
        if (b.o.allowItems !== false) html += `<button data-a="bag">Sac</button>`;
        { const S0 = Gm.get(); const lb = S0.lastBall; const n = lb ? (S0.items[lb] || 0) : 0; if (b.kind === 'wild' && b.o.allowItems !== false && lb && n > 0) html += `<button data-a="lastball" class="lastb" title="Relancer la dernière Ball utilisée (touche ${esc((S0.set.ballKey || 'b').toUpperCase())})">${W.UI.itemIcon(lb, 'ii sm')}<span>${esc(lb)} <small>×${n}</small></span><kbd>${esc((S0.set.ballKey || 'b').toUpperCase())}</kbd></button>` }
        html += `<button data-a="pkmn">Pokémon</button>`;
        if (b.kind === 'wild' || b.o.canFlee) html += `<button data-a="run">Fuite</button>`; else html += `<button data-a="run" class="forfeit">Abandonner</button>`;
        if (megaOK) html += `<button data-a="mega" class="megab${megaOn ? ' on' : ''}">Méga-Évolution ${megaOn ? '✓' : ''}</button>`;
        if (canBack) html += `<button data-a="back">Retour</button>`;
        html += '</div>';
        this.lastMenu = html; this.show(html);
      };
      draw();
      const onClick = async e => {
        const btn = e.target.closest('button'); if (!btn || btn.disabled) return; const a = btn.dataset.a;
        if (a === 'mega') { megaOn = !megaOn; draw(); return }
        if (a === 'back') { done('back'); return }
        if (a === 'run') { if (b.kind !== 'wild' && !b.o.canFlee && !(await W.UI.confirm('Abandonner ce combat ? Il comptera comme une défaite.', 'Abandonner'))) return; done({ kind: 'run', user: bm }); return }
        if (a === 'struggle') { done({ kind: 'move', user: bm, k: 'struggle', tgt: foes[0] }); return }
        if (a === 'mv') {
          const k = bm.m.m[+btn.dataset.i][0]; const m = mv(k);
          let tgt = null;
          if (b.n === 2 && [10, 2, 5, 3].includes(m.tg) && m.tg !== 3) {
            const cands = m.tg === 5 ? b.active(b.sides[0]) : [...foes, ...b.active(b.sides[0]).filter(x => x !== bm)];
            if (cands.length > 1) { tgt = await this.pickTarget(b, bm, k, cands); if (tgt === 'back') { draw(); return } }
            else tgt = cands[0];
          } else tgt = foes[0];
          done({ kind: 'move', user: bm, k, tgt, mega: megaOn }); return;
        }
        if (a === 'pkmn') { const idx = await this.teamPicker(b, bm, false); if (idx == null) { draw(); return } done({ kind: 'switch', user: bm, to: idx }); return }
        if (a === 'bag') { const r = await this.bagPicker(b, bm); if (!r) { draw(); return } done(r); return }
        if (a === 'lastball') { const lb = Gm.get().lastBall; if (lb && Gm.get().items[lb] > 0) done({ kind: 'ball', item: lb, user: bm }); return }
      };
      const done = v => { this.act.removeEventListener('click', onClick); res(v) };
      this.act.addEventListener('click', onClick);
    });
  }
  pickTarget(b, bm, k, cands) {
    return new Promise(res => {
      const m = mv(k);
      this.msgEl.textContent = `${m.n} : quelle cible ?`;
      this.act.classList.remove('busy'); this.act.innerHTML = '<div class="btargets">' + cands.map((c, i) => { const t = b.moveType(bm, k, m); const e = c.side !== bm.side ? effLabel(P.eff(t, (c.v.illusion || c).types))[0] : 'Allié'; return `<button data-i="${i}" class="${c.side === bm.side ? 'ally' : ''}"><b>${esc(c.name)}</b><small>${esc(e || 'Normal')}</small></button>` }).join('') + '<button data-i="-1">Retour</button></div>';
      const h = e => { const btn = e.target.closest('button'); if (!btn) return; this.act.removeEventListener('click', h); const i = +btn.dataset.i; res(i < 0 ? 'back' : cands[i]) };
      this.act.addEventListener('click', h);
    });
  }
  teamPicker(b, bm, forced, title) {
    return new Promise(res => {
      const side = b.sides[0];
      this.msgEl.textContent = title || (forced ? 'Choisissez le prochain Pokémon.' : 'Quel Pokémon envoyer ?');
      let html = '<div class="bteam">';
      side.mons.forEach((x, i) => {
        const active = side.act.includes(x); const ok = x.alive && !active;
        html += `<button data-i="${i}" ${ok ? '' : 'disabled'}><img src="${(x.m.hw && !x.megaData && !x.form && ((W.HWI && W.HWI[x.base.id] && W.HWI[x.base.id][x.m.sh ? 's' : 'n']) || Gm.hwURL(x.base.id, x.m.sh))) || Gm.spriteURL(x.ix, x.m.sh)}" alt=""><span><b>${esc(x.name)}</b><small>N.${x.L} · ${x.hp}/${x.mhp} PV${x.status ? ' · ' + STC[x.status][0] : ''}${active ? ' · au combat' : ''}</small></span><i class="mini-hp"><i style="width:${x.hp / x.mhp * 100}%"></i></i></button>`;
      });
      html += '</div>' + (forced ? '' : '<div class="bcmds"><button data-i="-1">Retour</button></div>');
      this.show(html);
      const h = e => { const btn = e.target.closest('button'); if (!btn || btn.disabled) return; this.act.removeEventListener('click', h); const i = +btn.dataset.i; res(i < 0 ? null : i) };
      this.act.addEventListener('click', h);
    });
  }
  async offerShift(b, next) {
    if (this.autoOn()) return -1;
    const who = b.sides[1].cls ? `${b.sides[1].cls} ${b.sides[1].name}` : (b.sides[1].name || 'L’adversaire');
    this.msgEl.textContent = `${who} va envoyer ${next.name}. Voulez-vous changer de Pokémon ?`;
    const r = await new Promise(res => { this.show(`<div class="bcmds shift"><button data-y="1">Changer de Pokémon</button><button data-y="0">Garder ${esc(b.sides[0].act[0].name)}</button></div>`); const h = e => { const t = e.target.closest('button'); if (!t || t.dataset.y == null) return; this.act.removeEventListener('click', h); res(t.dataset.y === '1') }; this.act.addEventListener('click', h) });
    this.idle();
    if (!r) return -1;
    const i = await this.teamPicker(b, null, false, 'Quel Pokémon envoyer ?');
    return i == null ? -1 : i;
  }
  async chooseSwitch(b, slot, forced) {
    const side = b.sides[0];
    const bench = side.mons.filter(x => x.alive && !side.act.includes(x));
    if (!bench.length) return -1;
    if (bench.length === 1 && forced) return side.mons.indexOf(bench[0]);
    if (forced && this.autoOn()) { const best = bench.slice().sort((x, y) => y.hp / y.mhp - x.hp / x.mhp)[0]; return side.mons.indexOf(best) }
    const r = await this.teamPicker(b, null, true, forced ? 'Choisissez le prochain Pokémon.' : 'Quel Pokémon prend le relais ?');
    return r;
  }
  bagPicker(b, bm) {
    return new Promise(res => {
      const S = Gm.get(); const wild = b.kind === 'wild' && b.active(b.sides[1]).length === 1;
      const cats = [['ball', 'Balls'], ['heal', 'Soins'], ['status', 'Statut'], ['revive', 'Rappels'], ['pp', 'PP'], ['battle', 'Combat']];
      const items = Object.keys(S.items).filter(n => S.items[n] > 0 && P.IT[n] && cats.some(c => c[0] === P.IT[n].cat) && (P.IT[n].cat !== 'ball' || wild));
      this.msgEl.textContent = items.length ? 'Quel objet utiliser ?' : 'Aucun objet utilisable.';
      let html = '<div class="bbag">';
      for (const [c, label] of cats) {
        const list = items.filter(n => P.IT[n].cat === c); if (!list.length) continue;
        html += `<div class="bbcat"><h4>${label}</h4>` + list.map(n => `<button data-n="${esc(n)}">${W.UI.itemIcon(n)}<span>${esc(n)}</span><em>×${S.items[n]}</em></button>`).join('') + '</div>';
      }
      html += '</div><div class="bcmds"><button data-n="">Retour</button></div>';
      this.show(html);
      const h = async e => {
        const btn = e.target.closest('button'); if (!btn) return; const n = btn.dataset.n;
        if (!n) { this.act.removeEventListener('click', h); res(null); return }
        const info = P.IT[n];
        this.act.removeEventListener('click', h);
        if (info.cat === 'ball') { Gm.get().lastBall = n; res({ kind: 'ball', item: n, user: bm }); return }
        // pick target
        const side = b.sides[0];
        const tgts = side.mons.filter(x => info.cat === 'revive' ? !x.alive : info.cat === 'battle' ? side.act.includes(x) && x.alive : x.alive);
        if (!tgts.length) { res(null); return }
        const r = await new Promise(rr => {
          this.msgEl.textContent = `Utiliser ${n} sur… ?`;
          this.act.classList.remove('busy'); this.act.innerHTML = '<div class="bteam">' + tgts.map((x, i) => `<button data-i="${i}"><img src="${(x.m.hw && !x.megaData && !x.form && ((W.HWI && W.HWI[x.base.id] && W.HWI[x.base.id][x.m.sh ? 's' : 'n']) || Gm.hwURL(x.base.id, x.m.sh))) || Gm.spriteURL(x.ix, x.m.sh)}" alt=""><span><b>${esc(x.name)}</b><small>N.${x.L} · ${x.hp}/${x.mhp} PV${x.status ? ' · ' + STC[x.status][0] : ''}</small></span></button>`).join('') + '</div><div class="bcmds"><button data-i="-1">Retour</button></div>';
          const h2 = ev => { const bt = ev.target.closest('button'); if (!bt) return; this.act.removeEventListener('click', h2); const i = +bt.dataset.i; rr(i < 0 ? null : tgts[i]) };
          this.act.addEventListener('click', h2);
        });
        if (!r) { res(null); return }
        res({ kind: 'item', item: n, target: r, user: bm });
      };
      this.act.addEventListener('click', h);
    });
  }
  learnPrompt(m, k) { if (this.opts.farm) return Promise.resolve(-1); return W.UI.learnPrompt(m, k) }
}
W.BUI = BUI;

document.addEventListener('keydown', e => {
  const root = document.getElementById('battle'); if (!root || root.hidden || e.target.closest && e.target.closest('input,textarea,select')) return;
  const S = W.Game && W.Game.get && W.Game.get(); if (!S) return; const K = W.UI.keysOf ? W.UI.keysOf() : { ball: (S.set.ballKey || 'b').toLowerCase(), run: 'r' }; const key = e.key && e.key.toLowerCase();
  if (key === K.ball) { const btn = root.querySelector('[data-a="lastball"]'); if (btn && !btn.disabled) { e.preventDefault(); btn.click() } }
  else if (key === K.run) { const btn = root.querySelector('[data-a="run"]:not(.forfeit)'); if (btn && !btn.disabled) { e.preventDefault(); btn.click() } }
});
})(window);
