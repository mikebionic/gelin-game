/* ===================== Игра 2: «Побег от свадьбы» =====================
   Экшн сверху-сбоку на чистом Canvas 2D. Героиня в красном убегает со
   свадьбы: 3 джигита ловят, 10 фотографов снимают, украшенные машины
   толкают в западню.

   Доработки по фидбэку:
   • фоновая музыка + звуки (WebAudio, без файлов)
   • комбо ударов: рука → рука → нога (разные кадры и сила)
   • героиня поворачивается по движению (перёд/спина/бок)
   • понятные фотографы: ходят с опущенной камерой, наводят видоискатель,
     вспышка + явное «−1», после кадра убегают
   • машины сигналят перед выездом и заметно толкают
   • аккуратный свадебный двор вместо красной полосы
   • больше анимаций раскадровок (ловля/падение/смерть)
   • очки и всплывающие цифры
   • постепенный выход врагов (по одному, немного на экране)
   • явный момент победы с салютом
   ===================================================================== */
(() => {
const cv = document.getElementById('gcanvas');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const BOUND = {l:24, r:W-24, t:96, b:H-24};

// ---------- ассеты ----------
const SRC = {
  g_idle:'girl_idle', g_idle2:'girl_idle_b', g_side:'girl_side',
  g_back:'girl_back', g_back2:'girl_back2',
  g_punch:'girl_punch', g_punch2:'girl_punch_b', g_kick:'girl_kick',
  g_jump:'girl_jump', g_hurt:'girl_fall',
  g_fall0:'girl_fall_0', g_fall1:'girl_fall_1', g_fall2:'girl_fall_2', g_fall3:'girl_fall_3', g_fall4:'girl_fall_4',
  j_idle:'jigit_idle', j_walk:'jigit_walk', j_catch:'jigit_catch', j_fall:'jigit_fall', j_dead:'jigit_dead',
  p_idle:'photo_idle', p_walk:'photo_walk', p_shoot:'photo_shoot', p_fall:'photo_fall', p_dead:'photo_dead',
  m_idle:'mula_idle', m_walk:'mula_walk', m_cast:'mula_cast', m_ring:'mula_ring', m_tired:'mula_tired', m_fall:'mula_fall', m_dead:'mula_dead',
  car1:'car_top', car2:'car_top2', gameover:'gameover'
};
const IMG = {};
let loaded = 0, total = Object.keys(SRC).length;
for (const k in SRC){
  const im = new Image();
  im.onload = im.onerror = () => { loaded++; };
  im.src = 'assets/sprites/' + SRC[k] + (SRC[k]==='gameover' ? '.webp' : '.png');
  IMG[k] = im;
}

// =================== ЗВУК (WebAudio, синтез) ===================
const Sound = (() => {
  let ctx=null, master=null, musicGain=null, musicOn=true, timer=null, next=0, step=0;
  // Хиджаз на ре: D Eb F# G A Bb C# D, восточный колорит
  const S=[293.66,311.13,369.99,392.0,440.0,466.16,554.37,587.33];
  const BASS=146.83; // D2
  function ensure(){
    if(ctx) return;
    const g=(typeof window!=='undefined')?window:(typeof globalThis!=='undefined'?globalThis:{});
    const AC=g.AudioContext||g.webkitAudioContext; if(!AC) return;
    ctx=new AC(); master=ctx.createGain(); master.gain.value=0.9; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=0.22; musicGain.connect(master);
  }
  function tone(freq,dur,type,vol,dest,slide){
    if(!ctx) return; const t=ctx.currentTime;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type||'triangle'; o.frequency.setValueAtTime(freq,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.2,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(dest||master); o.start(t); o.stop(t+dur+0.02);
  }
  function noise(dur,vol,hp){
    if(!ctx) return; const t=ctx.currentTime;
    const b=ctx.createBuffer(1,(ctx.sampleRate*dur)|0,ctx.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const s=ctx.createBufferSource(); s.buffer=b;
    const g=ctx.createGain(); g.gain.setValueAtTime(vol||0.2,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    let node=s;
    if(hp){ const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; s.connect(f); node=f; }
    node.connect(g); g.connect(master); s.start(t);
  }
  // музыкальный цикл (lookahead-планировщик)
  const BEAT=0.26; // длительность восьмой
  const MEL=[0,2,3,4,3,2,0,1, 0,2,3,5,4,3,2,0];      // индексы по шкале
  const DRUM=[1,0,1,0,1,0,1,0, 1,0,1,1,1,0,1,0];
  function sched(){
    if(!ctx) return;
    while(next < ctx.currentTime + 0.12){
      const i=step%16;
      // бас каждые 2 шага
      if(i%2===0) tone(BASS*(i%8<4?1:1.0),BEAT*1.8,'sine',0.18,musicGain);
      // мелодия
      tone(S[MEL[i]], BEAT*0.9,'triangle',0.12,musicGain);
      if(i%4===2) tone(S[MEL[i]]*2,BEAT*0.5,'triangle',0.05,musicGain);
      // перкуссия (дарбука-подобно)
      if(DRUM[i]) noise(0.05,0.12,1200);
      next+=BEAT; step++;
    }
  }
  return {
    unlock(){ ensure(); if(ctx&&ctx.state==='suspended') ctx.resume(); },
    startMusic(){ ensure(); if(!ctx) return; if(ctx.state==='suspended')ctx.resume();
      if(timer) return; next=ctx.currentTime+0.1; step=0; timer=setInterval(sched,40); },
    stopMusic(){ if(timer){clearInterval(timer); timer=null;} },
    toggleMusic(){ musicOn=!musicOn; if(musicGain) musicGain.gain.value=musicOn?0.22:0; return musicOn; },
    hit(){ noise(0.06,0.25,800); tone(180,0.08,'square',0.18,null,90); },
    kick(){ noise(0.08,0.3,500); tone(130,0.12,'sawtooth',0.2,null,70); },
    camera(){ tone(2600,0.03,'square',0.2); noise(0.04,0.18,3000); setTimeout(()=>tone(1800,0.03,'square',0.15),40); },
    honk(){ tone(330,0.18,'square',0.22,null,300); setTimeout(()=>tone(300,0.22,'square',0.22),120); },
    death(){ tone(300,0.3,'sawtooth',0.22,null,80); noise(0.15,0.18,400); },
    hurt(){ tone(400,0.18,'triangle',0.25,null,120); },
    win(){ [0,2,4,7].forEach((n,i)=>setTimeout(()=>tone(S[n%8]*1.0,0.3,'triangle',0.25,musicGain),i*140)); },
  };
})();

// ---------- ввод ----------
const key = {up:0,down:0,left:0,right:0};
const req = {attack:false, jump:false, super:false};
function setKey(k,v){
  if(k in key) key[k]=v?1:0;
  else if((k==='attack'||k==='jump'||k==='super') && v) req[k]=true;
}
const KMAP = {
  ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down',
  ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
  KeyJ:'attack', Space:'attack', KeyK:'jump', ShiftLeft:'jump', ShiftRight:'jump',
  Enter:'super', KeyL:'super'
};
addEventListener('keydown', e=>{ const k=KMAP[e.code]; if(k){ e.preventDefault(); if(!e.repeat) setKey(k,1);} });
addEventListener('keyup',   e=>{ const k=KMAP[e.code]; if(k){ e.preventDefault(); setKey(k,0);} });
document.querySelectorAll('.cbtn').forEach(btn=>{
  const k = btn.dataset.k;
  const down = e=>{ e.preventDefault(); btn.classList.add('pressed'); setKey(k,1); Sound.unlock(); };
  const up   = e=>{ e.preventDefault(); btn.classList.remove('pressed'); if(k in key) setKey(k,0); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
});

// ---------- состояние ----------
let hero, enemies, cars, warns, floats, confetti, hearts, bonuses, toSpawn, spawnTimer, carTimer, heartTimer,
    running, state, flash, shake, kills, score, winSeq, freezeT, superMeter, shock;
const SUPER_MAX = 100;
const TARGETS = {jigit:3, photo:10, mula:4};
const MAXC = 5;                       // максимум живых врагов одновременно
const CAPS = {photo:3, jigit:2, mula:3};   // максимум на экране по типу
const MAXLIVES = 5;
const COMBO = [
  {pose:'g_punch',  range:56, dmg:1, kb:6,  dur:0.20, cd:0.20, snd:'hit'},
  {pose:'g_punch2', range:56, dmg:1, kb:7,  dur:0.20, cd:0.20, snd:'hit'},
  {pose:'g_kick',   range:70, dmg:2, kb:12, dur:0.30, cd:0.36, snd:'kick'},
];

function reset(){
  hero = {x:W/2, y:H-110, vx:0, vy:0, dir:1, face:'down', state:'idle', pose:'g_idle',
          t:0, z:0, zv:0, lives:3, inv:0, anim:0, atkCd:0, combo:0, comboT:0, dyingT:0,
          slowT:0, rapidT:0};
  enemies=[]; cars=[]; warns=[]; floats=[]; confetti=[]; hearts=[]; bonuses=[];
  freezeT=0; superMeter=0; shock=null;
  // очередь: фотографы, джигиты и мулы РАЗНЕСЕНЫ и выходят по ходу
  const pool=[]; for(let i=0;i<TARGETS.photo;i++) pool.push('photo');
  [2,6,10].forEach((pos,n)=>pool.splice(pos+n,0,'jigit'));
  [3,7,11,14].forEach((pos,n)=>pool.splice(pos+n,0,'mula'));
  toSpawn=pool;
  spawnTimer=1.0; carTimer=4.0; heartTimer=16;
  kills={jigit:0, photo:0, mula:0}; score=0;
  flash={t:0,color:'#fff'}; shake=0; winSeq=0;
  state='ready'; running=false;
  updateHud();
}

// ---------- появление ----------
function spawnEnemy(type){
  const edge=(Math.random()*4)|0; let x,y;
  if(edge===0){x=BOUND.l-30; y=rand(BOUND.t+40,BOUND.b-20);}
  else if(edge===1){x=BOUND.r+30; y=rand(BOUND.t+40,BOUND.b-20);}
  else if(edge===2){x=rand(BOUND.l,BOUND.r); y=BOUND.t-20;}
  else {x=rand(BOUND.l,BOUND.r); y=BOUND.b+20;}
  const hp = type==='photo'?2:3;
  enemies.push({type, x, y, vx:0, vy:0, dir:1, state:'walk', t:0,
    hp, maxhp:hp,
    photoT:0, aiming:false, cool:0, flash:0, alpha:1, deadT:0, animT:Math.random()*999, enter:true,
    // мула:
    cast:null, castT:0, castCd:rand(1.8,3.2), beamAng:0, ringR:0,
    stamina:rand(6,10), resting:false, restT:0});
}

// попытка появления с учётом лимитов по типу и общего лимита
function trySpawn(){
  const live={photo:0,jigit:0,mula:0};
  enemies.forEach(e=>{ if(e.state!=='dead') live[e.type]++; });
  if(live.photo+live.jigit+live.mula>=MAXC) return false;
  const idx=toSpawn.findIndex(t=> live[t]<CAPS[t]);
  if(idx<0) return false;
  spawnEnemy(toSpawn.splice(idx,1)[0]); return true;
}

// ---------- утилиты ----------
function rand(a,b){return a+Math.random()*(b-a);}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by);}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function addFloat(x,y,txt,color){ floats.push({x,y,txt,color:color||'#fff',t:1.0,vy:-0.7}); }
function addScore(n,x,y){ score+=n; addFloat(x,y-40,'+'+n,'#e3bd5d'); updateHud(); }
function gainSuper(n){ superMeter=Math.min(SUPER_MAX, superMeter+n); updateHud(); }
const BONUS_TYPES=['slow','slow','rapid','rapid','heart'];   // heart реже
function maybeDropBonus(x,y,chance){
  if(Math.random()<chance){
    const type=BONUS_TYPES[(Math.random()*BONUS_TYPES.length)|0];
    bonuses.push({x:clamp(x,BOUND.l+20,BOUND.r-20), y:clamp(y,BOUND.t+30,BOUND.b-20), type, t:10, bob:Math.random()*6});
  }
}

// ---------- урон ----------
function loseLife(fromX, fromY, color, label){
  if(hero.inv>0 || state!=='play') return;
  hero.lives--; hero.inv=1.5;
  const a=Math.atan2(hero.y-fromY, hero.x-fromX);
  hero.vx+=Math.cos(a)*5; hero.vy+=Math.sin(a)*5;
  flash.t=0.35; flash.color=color; shake=10;
  addFloat(hero.x, hero.y-70, label||'минус жизнь', '#ff6a5a');
  Sound.hurt();
  updateHud();
  if(hero.lives<=0){ state='dying'; hero.state='dying'; hero.dyingT=0; Sound.death(); }
  else { hero.state='hurt'; hero.t=0.4; }
}
function hitEnemy(e, fromX, fromY, dmg, kb){
  if(e.state==='dead') return;
  e.hp-=dmg; e.flash=0.14; e.photoT=0; e.aiming=false;
  const a=Math.atan2(e.y-fromY, e.x-fromX);
  e.vx=Math.cos(a)*kb; e.vy=Math.sin(a)*kb;
  e.cast=null; e.resting=false;                 // удар прерывает молитву мулы
  if(e.hp<=0){ e.state='dead'; e.deadT=0; e.vx*=0.5; e.vy*=0.5;
    const pts=e.type==='jigit'?300:(e.type==='mula'?200:100); addScore(pts, e.x, e.y); Sound.death();
    gainSuper(22); maybeDropBonus(e.x, e.y, 0.5); }          // убийство: заряд супера + шанс бонуса
  else { e.state='hurt'; e.t=0.28; Sound.hit();
    gainSuper(4); maybeDropBonus(e.x, e.y, 0.12); }          // удар: немного заряда + редкий бонус
}

// ---------- Мула: медленный, молится и бьёт лучом/кругом, устают ноги ----------
function mulaAI(e, d, ang, h, dt){
  e.aiming=false;
  if(e.cast){                                   // идёт молитва — стоит на месте
    e.vx=0; e.vy=0; mulaCast(e, dt, h);
    if(e.vx!==0) e.dir=Math.sign(e.vx);
    return;
  }
  if(e.resting){                                // ноги устали — отдыхает
    e.vx=0; e.vy=0; e.restT-=dt;
    if(e.restT<=0){ e.resting=false; e.stamina=rand(5,8); }
    return;
  }
  const spd=1.0;                                // медленный
  if(d>240){ e.vx=Math.cos(ang)*spd; e.vy=Math.sin(ang)*spd; }
  else if(d<150){ e.vx=-Math.cos(ang)*spd; e.vy=-Math.sin(ang)*spd; }
  else { e.vx*=0.4; e.vy*=0.4; }
  e.stamina -= (Math.abs(e.vx)+Math.abs(e.vy))*dt;
  if(e.stamina<=0){ e.resting=true; e.restT=rand(1.6,2.6); addFloat(e.x,e.y-100,'уф…','#cfe6ff'); }
  e.castCd-=dt;
  if(e.castCd<=0 && d<380){
    if(Math.random()<0.55){ e.cast='beam'; e.castT=1.0; e.beamAng=Math.atan2(h.y-e.y, h.x-e.x); }
    else { e.cast='ring'; e.castT=0.8; e.ringR=0; }
  }
  if(e.vx!==0) e.dir=Math.sign(e.vx);
}
function mulaCast(e, dt, h){
  e.castT-=dt;
  if(e.cast==='beam'){                          // прицеливание: тонкий луч, направление зафиксировано
    if(e.castT<=0){ e.cast='beamFire'; e.castT=1.2; }
  } else if(e.cast==='beamFire'){               // луч бьёт по фиксированной линии (увернуться вбок)
    if(onBeam(e,h) && h.inv<=0) loseLife(h.x,h.y,'#8ad0ff','луч!');
    if(e.castT<=0){ e.cast=null; e.castCd=rand(2.6,4.2); }
  } else if(e.cast==='ring'){                   // сидит, телеграф круга
    if(e.castT<=0){ e.cast='ringBurst'; e.castT=1.1; e.ringR=0; }
  } else if(e.cast==='ringBurst'){              // круг расширяется (перепрыгнуть)
    const prev=e.ringR; e.ringR += 300*dt;
    const d=dist(e.x,e.y,h.x,h.y);
    if(d>prev-14 && d<e.ringR+14 && h.z<=24 && h.inv<=0) loseLife(h.x,h.y,'#8ad0ff','круг!');
    if(e.castT<=0 || e.ringR>780){ e.cast=null; e.castCd=rand(2.6,4.2); }
  }
}
// супер-удар: мгновенно убивает врагов рядом и замораживает остальных
function doSuper(){
  superMeter=0; updateHud();
  const h=hero;
  h.state='attack'; h.pose='g_kick'; h.t=0.4;
  shock={x:h.x, y:h.y, r:0, t:0.5};
  flash.t=0.4; flash.color='#bfe3ff'; shake=18; Sound.kick();
  addFloat(h.x, h.y-90, 'СУПЕР!', '#bfe3ff');
  const R=240;
  enemies.forEach(e=>{
    if(e.state==='dead') return;
    const d=dist(e.x,e.y,h.x,h.y);
    if(d<R){                                   // мгновенное убийство рядом
      e.state='dead'; e.deadT=0; e.cast=null; e.resting=false;
      const a=Math.atan2(e.y-h.y, e.x-h.x); e.vx=Math.cos(a)*8; e.vy=Math.sin(a)*8;
      const pts=e.type==='jigit'?300:(e.type==='mula'?200:100); addScore(pts,e.x,e.y);
    }
  });
  Sound.death();
  freezeT=3.0;                                 // остальных заморозить
}
function onBeam(e,h){                            // на линии луча?
  const dx=Math.cos(e.beamAng), dy=Math.sin(e.beamAng);
  const rx=h.x-e.x, ry=h.y-e.y;
  const proj=rx*dx+ry*dy; if(proj<10) return false;     // позади мулы
  return Math.abs(rx*dy-ry*dx) < 26;            // перпендикулярное расстояние до луча
}

// ---------- обновление ----------
function update(dt){
  const h=hero;

  // --- падение Гелин (полная раскадровка PADENIE), затем проигрыш ---
  if(state==='dying'){
    h.dyingT+=dt;
    for(let i=floats.length-1;i>=0;i--){ const f=floats[i]; f.y+=f.vy; f.t-=dt; if(f.t<=0) floats.splice(i,1); }
    flash.t=Math.max(0,flash.t-dt); shake=Math.max(0,shake-dt*30);
    if(h.dyingT>=1.25){ endGame(false); }
    return;
  }

  h.inv=Math.max(0,h.inv-dt); h.atkCd=Math.max(0,h.atkCd-dt); h.comboT=Math.max(0,h.comboT-dt);
  h.slowT=Math.max(0,h.slowT-dt); h.rapidT=Math.max(0,h.rapidT-dt);
  if(freezeT>0) freezeT=Math.max(0,freezeT-dt);
  if(shock){ shock.r+=900*dt; shock.t-=dt; if(shock.t<=0) shock=null; }

  // --- супер-удар (Enter): заморозка всех + мгновенное убийство рядом ---
  if(req.super && superMeter>=SUPER_MAX && h.state!=='hurt'){ doSuper(); }
  req.super=false;

  // --- удар с комбо ---
  if(req.attack && h.state!=='hurt' && h.atkCd<=0){
    h.combo = h.comboT>0 ? (h.combo+1)%COMBO.length : 0;
    h.comboT=0.55;
    const c=COMBO[h.combo];
    h.state='attack'; h.t=c.dur; h.atkCd=c.cd*(h.rapidT>0?0.45:1); h.pose=c.pose;
    Sound[c.snd]();
    const hx=h.x+h.dir*36, hy=h.y-20;
    let hitAny=false;
    enemies.forEach(e=>{
      if(e.state==='dead') return;
      const inFront = dist(hx,hy,e.x,e.y-20)<c.range && (Math.sign(e.x-h.x)===h.dir || Math.abs(e.x-h.x)<20);
      const veryClose = dist(h.x,h.y-20,e.x,e.y-20)<c.range*0.7;
      if(inFront||veryClose){ hitEnemy(e,h.x,h.y,c.dmg,c.kb); hitAny=true; }
    });
    if(h.combo===2 && hitAny) addFloat(h.x,h.y-80,'КОМБО!','#ffd27a');
  }
  // --- прыжок ---
  if(req.jump && h.z<=0 && h.state!=='hurt'){ h.zv=9.0; }
  req.attack=false; req.jump=false;
  if(h.zv!==0 || h.z>0){ h.z+=h.zv; h.zv-=0.6; if(h.z<=0){h.z=0;h.zv=0;} }
  const airborne = h.z>20;

  // --- движение + поворот ---
  let mvx=0,mvy=0;
  if(h.state!=='hurt'){
    mvx=(key.right-key.left); mvy=(key.down-key.up);
    if(mvx||mvy){ const m=Math.hypot(mvx,mvy); mvx/=m; mvy/=m;
      if(Math.abs(mvx)>=Math.abs(mvy)){ h.face='side'; h.dir=Math.sign(mvx); }
      else h.face = mvy<0 ? 'up' : 'down';
    }
  }
  const sp=(h.state==='attack'?1.2:3.3);
  h.vx+=((mvx*sp)-h.vx)*0.3; h.vy+=((mvy*sp)-h.vy)*0.3;
  if(h.state==='hurt'){ h.vx*=0.9; h.vy*=0.9; }
  h.x=clamp(h.x+h.vx,BOUND.l,BOUND.r); h.y=clamp(h.y+h.vy,BOUND.t,BOUND.b);
  if(h.state==='attack'||h.state==='hurt'){ h.t-=dt; if(h.t<=0) h.state='idle'; }
  h.anim+=(Math.abs(h.vx)+Math.abs(h.vy))*dt*4;

  // --- враги ---
  enemies.forEach(e=>{
    e.flash=Math.max(0,e.flash-dt);
    if(e.state==='dead'){ e.deadT+=dt; e.alpha=Math.max(0,1-(e.deadT-0.5)/0.5);
      e.x+=e.vx; e.y+=e.vy; e.vx*=0.85; e.vy*=0.85; return; }
    if(e.state==='hurt'){ e.x+=e.vx; e.y+=e.vy; e.vx*=0.82; e.vy*=0.82; e.t-=dt; if(e.t<=0)e.state='walk'; return; }
    if(freezeT>0){ e.vx=0; e.vy=0; return; }        // заморожен супером
    const efac = hero.slowT>0 ? 0.45 : 1;           // бонус замедления
    const edt = dt*efac;
    e.cool=Math.max(0,e.cool-edt);
    const d=dist(e.x,e.y,h.x,h.y), ang=Math.atan2(h.y-e.y,h.x-e.x);

    if(e.type==='jigit'){
      e.aiming=false;
      // агрессивный: быстро идёт, вблизи ускоряется (рывок на поимку)
      const spd = d<140 ? 3.1 : 2.3;
      e.vx=Math.cos(ang)*spd; e.vy=Math.sin(ang)*spd;
      if(d<38 && h.inv<=0){ loseLife(e.x,e.y,'#caa23a','поймал!'); e.vx=-Math.cos(ang)*4; e.vy=-Math.sin(ang)*4; e.state='hurt'; e.t=0.35; }
    } else if(e.type==='mula'){
      mulaAI(e, d, ang, h, edt);
    } else { // фотограф
      const stand=165;
      if(e.cool>0){ // отходит после кадра («появился и ушёл»)
        e.aiming=false; e.photoT=0; e.vx=-Math.cos(ang)*1.8; e.vy=-Math.sin(ang)*1.8;
      } else if(d>stand+20){ e.aiming=false; e.photoT=0; e.vx=Math.cos(ang)*1.5; e.vy=Math.sin(ang)*1.5; }
      else if(d<stand-55){ e.aiming=false; e.photoT=0; e.vx=-Math.cos(ang)*1.7; e.vy=-Math.sin(ang)*1.7; }
      else { // в зоне съёмки, наводит камеру
        e.aiming=true; e.vx*=0.5; e.vy*=0.5; e.dir=Math.sign(h.x-e.x)||e.dir; e.photoT+=edt;
        if(e.photoT>=1.6){ e.photoT=0; e.aiming=false; e.cool=1.8;
          flash.t=0.3; flash.color='#ffffff'; Sound.camera();
          if(h.inv<=0) loseLife(e.x,e.y,'#ffffff','📸 минус жизнь');
          e.vx=-Math.cos(ang)*2; e.vy=-Math.sin(ang)*2;
        }
      }
    }
    if(!e.aiming && e.vx!==0) e.dir=Math.sign(e.vx);
    // расталкивание
    enemies.forEach(o=>{ if(o!==e && o.state!=='dead'){ const dd=dist(e.x,e.y,o.x,o.y); if(dd>0&&dd<30){ e.x+=(e.x-o.x)/dd*0.8; e.y+=(e.y-o.y)/dd*0.8; } } });
    e.x=clamp(e.x+e.vx*efac,BOUND.l-10,BOUND.r+10); e.y=clamp(e.y+e.vy*efac,BOUND.t-10,BOUND.b+10);
    e.animT+=edt;
  });
  for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i];
    if(e.state==='dead' && e.alpha<=0){ kills[e.type]++; enemies.splice(i,1); updateHud(); } }

  // --- постепенный спавн (лимиты по типу: фотографов не больше 3 на экране) ---
  spawnTimer-=dt;
  if(spawnTimer<=0 && toSpawn.length){
    spawnTimer = trySpawn() ? rand(2.0,3.2) : 0.6;
  }

  // --- машины: сначала предупреждение-сигнал, потом выезд ---
  carTimer-=dt;
  if(carTimer<=0 && state==='play'){
    const fromLeft=Math.random()<0.5, y=rand(BOUND.t+50,BOUND.b-30);
    warns.push({y, fromLeft, t:0.95}); Sound.honk();
    carTimer=rand(4.5,7.0);
  }
  for(let i=warns.length-1;i>=0;i--){ const wn=warns[i]; wn.t-=dt;
    if(wn.t<=0){ spawnCar(wn.fromLeft,wn.y); warns.splice(i,1); } }
  for(let i=cars.length-1;i>=0;i--){ const c=cars[i]; c.x+=c.vx; c.cd=Math.max(0,c.cd-dt);
    // проверяем по центру тела героини (не по ногам) и с запасом
    const hcx=h.x, hcy=h.y-34;
    const hit = c.cd<=0 && Math.abs(hcy-c.y)<(c.h*0.5+26) && Math.abs(hcx-c.x)<(c.len*0.5+10);
    if(hit && !airborne){
      const dir=Math.sign(c.vx)||1;
      h.vx=dir*15; h.vy=(h.y<c.y?-4:4); h.state='hurt'; h.t=0.6; c.cd=1.0;
      shake=16; flash.t=0.2; flash.color='#caa23a'; Sound.honk();
      addFloat(h.x,h.y-70,'Бум!','#ffce6a');
    }
    if(c.x<-220 || c.x>W+220) cars.splice(i,1);
  }

  // --- сердечки-пикапы (восстановление жизни) ---
  heartTimer-=dt;
  if(heartTimer<=0 && hearts.length<2 && hero.lives<MAXLIVES){
    hearts.push({x:rand(BOUND.l+40,BOUND.r-40), y:rand(BOUND.t+40,BOUND.b-30), t:12, bob:Math.random()*6});
    heartTimer=rand(14,22);
  }
  for(let i=hearts.length-1;i>=0;i--){ const ht=hearts[i]; ht.t-=dt; ht.bob+=dt*4;
    if(dist(ht.x,ht.y,h.x,h.y-20)<34){
      if(h.lives<MAXLIVES){ h.lives++; addFloat(h.x,h.y-60,'плюс жизнь','#7ee0a6'); updateHud(); Sound.win(); }
      hearts.splice(i,1); continue;
    }
    if(ht.t<=0) hearts.splice(i,1);
  }

  // --- бонусы (замедление / быстрые удары / жизнь) ---
  for(let i=bonuses.length-1;i>=0;i--){ const bn=bonuses[i]; bn.t-=dt; bn.bob+=dt*4;
    if(dist(bn.x,bn.y,h.x,h.y-20)<36){
      if(bn.type==='slow'){ h.slowT=5; addFloat(h.x,h.y-60,'Замедление!','#9fd0ff'); }
      else if(bn.type==='rapid'){ h.rapidT=6; addFloat(h.x,h.y-60,'Быстрые удары!','#ffd27a'); }
      else { if(h.lives<MAXLIVES){ h.lives++; } addFloat(h.x,h.y-60,'плюс жизнь','#7ee0a6'); }
      updateHud(); Sound.win(); bonuses.splice(i,1); continue;
    }
    if(bn.t<=0) bonuses.splice(i,1);
  }

  // --- всплывающие цифры / эффекты ---
  for(let i=floats.length-1;i>=0;i--){ const f=floats[i]; f.y+=f.vy; f.t-=dt; if(f.t<=0) floats.splice(i,1); }
  flash.t=Math.max(0,flash.t-dt); shake=Math.max(0,shake-dt*30);

  // --- салют победы ---
  if(winSeq>0){
    winSeq-=dt;
    if(confetti.length<120 && Math.random()<0.6) confetti.push({x:rand(0,W),y:-10,vy:rand(2,5),vx:rand(-1,1),c:['#e3bd5d','#d8402f','#f3f1ea','#2aa198'][(Math.random()*4)|0],r:rand(3,6)});
    confetti.forEach(p=>{p.y+=p.vy; p.x+=p.vx;});
    if(winSeq<=0) finishWin();
  }

  // --- победа ---
  if(state==='play' && toSpawn.length===0 && enemies.length===0){ startWinSequence(); }
}

function spawnCar(fromLeft,y){
  const sp=rand(4.2,6.2)*(fromLeft?1:-1);
  cars.push({x:fromLeft?-160:W+160, y, vx:sp, len:150, h:74,
    img:Math.random()<0.5?IMG.car1:IMG.car2, cd:0});
}

// ---------- отрисовка ----------
function drawImg(img, cx, feetY, targetH, flip){
  if(!img||!img.width) return;
  const s=targetH/img.height, w=img.width*s;
  ctx.save(); ctx.translate(cx, feetY-targetH);
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(img, -w/2, 0, w, targetH);
  ctx.restore();
}
function shadow(cx,cy,r){ ctx.save(); ctx.globalAlpha=0.28; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(cx,cy,r,r*0.38,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

// статичные розовые лепестки для двора
const PETALS=[]; for(let i=0;i<40;i++) PETALS.push({x:Math.random()*W,y:BOUND.t+Math.random()*(H-BOUND.t),r:2+Math.random()*3});
const LIGHTS=['#e3bd5d','#d8402f','#f3f1ea','#2aa198','#ef8a2b'];

function drawBackground(){
  // двор: тёплая плитка
  const g=ctx.createLinearGradient(0,BOUND.t,0,H);
  g.addColorStop(0,'#caa876'); g.addColorStop(1,'#b2905f');
  ctx.fillStyle=g; ctx.fillRect(0,BOUND.t-6,W,H);
  // плитка-сетка
  ctx.strokeStyle='rgba(120,90,55,.35)'; ctx.lineWidth=1.5;
  for(let x=0;x<=W;x+=64){ ctx.beginPath(); ctx.moveTo(x,BOUND.t); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=BOUND.t;y<=H;y+=52){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  // лепестки роз
  PETALS.forEach(p=>{ ctx.fillStyle='rgba(200,60,70,.5)'; ctx.beginPath();
    ctx.ellipse(p.x,p.y,p.r,p.r*0.6,0.6,0,Math.PI*2); ctx.fill(); });
  // верхняя стена с гирляндой и вывеской
  ctx.fillStyle='#3a1626'; ctx.fillRect(0,0,W,BOUND.t-6);
  ctx.strokeStyle='rgba(227,189,93,.5)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,22);
  for(let x=0;x<=W;x+=40){ ctx.quadraticCurveTo(x+20,46,x+40,22); } ctx.stroke(); // провисающая гирлянда
  for(let i=0;i<=W/40;i++){ ctx.fillStyle=LIGHTS[i%LIGHTS.length]; ctx.beginPath(); ctx.arc(i*40+20,44,5,0,Math.PI*2); ctx.fill(); }
  ctx.fillStyle='rgba(227,189,93,.95)'; ctx.font='bold 22px Georgia'; ctx.textAlign='center';
  ctx.fillText('۞  СВАДЬБА  ۞', W/2, 26);
}

function heroSprite(){
  const h=hero;
  if(h.state==='dying'){ const f=Math.min(4,Math.floor(h.dyingT/0.22)); return {img:IMG['g_fall'+f], flip:h.dir<0}; }
  if(h.state==='hurt') return {img:IMG.g_hurt, flip:h.dir<0};
  if(h.state==='attack') return {img:IMG[h.pose], flip:h.dir<0};
  if(h.z>6) return {img:IMG.g_jump, flip:h.dir<0};
  const moving=Math.abs(h.vx)+Math.abs(h.vy)>0.4;
  if(h.face==='up')   return {img: moving&&Math.floor(h.anim)%2?IMG.g_back2:IMG.g_back, flip:false};
  if(h.face==='side') return {img:IMG.g_side, flip:h.dir<0}; // базовый кадр смотрит вправо
  return {img: moving&&Math.floor(h.anim)%2?IMG.g_idle2:IMG.g_idle, flip:h.dir<0};
}
function enemySprite(e){
  if(e.type==='mula'){
    if(e.state==='dead') return e.deadT<0.35?IMG.m_fall:IMG.m_dead;
    if(e.state==='hurt') return IMG.m_fall;
    if(e.resting) return IMG.m_tired;
    if(e.cast==='beam'||e.cast==='beamFire') return IMG.m_cast;
    if(e.cast==='ring'||e.cast==='ringBurst') return IMG.m_ring;
    const mv=Math.abs(e.vx)+Math.abs(e.vy)>0.3;
    return mv ? (Math.floor(e.animT*5)%2?IMG.m_walk:IMG.m_idle) : IMG.m_idle;
  }
  const P=e.type==='jigit'
    ? {idle:IMG.j_idle,walk:IMG.j_walk,act:IMG.j_catch,fall:IMG.j_fall,dead:IMG.j_dead}
    : {idle:IMG.p_idle,walk:IMG.p_walk,act:IMG.p_shoot,fall:IMG.p_fall,dead:IMG.p_dead};
  if(e.state==='dead') return e.deadT<0.35?P.fall:P.dead;
  if(e.state==='hurt') return P.fall;
  const d=dist(e.x,e.y,hero.x,hero.y);
  if(e.type==='jigit' && d<64) return P.act;          // ловит
  if(e.type==='photo' && e.aiming) return P.act;      // снимает (камера поднята)
  const moving=Math.abs(e.vx)+Math.abs(e.vy)>0.3;
  return moving ? (Math.floor(e.animT*6)%2?P.walk:P.idle) : P.idle;
}

function render(){
  ctx.save();
  if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  drawBackground();

  // предупреждения о машинах
  warns.forEach(wn=>{
    if(Math.floor(wn.t*8)%2){ const x=wn.fromLeft?BOUND.l+6:BOUND.r-6;
      ctx.fillStyle='#ffce3a'; ctx.font='bold 30px sans-serif'; ctx.textAlign='center';
      ctx.fillText(wn.fromLeft?'🚗▶':'◀🚗', wn.fromLeft?BOUND.l+34:BOUND.r-34, wn.y+10);
      ctx.fillStyle='rgba(255,60,60,.9)'; ctx.font='bold 16px sans-serif';
      ctx.fillText('!', wn.fromLeft?BOUND.l+6:BOUND.r-6, wn.y-18);
    }
  });

  // сердечки-пикапы
  hearts.forEach(ht=>{
    if(ht.t<3 && Math.floor(ht.t*6)%2) return;   // мигает перед исчезновением
    const s=1+0.14*Math.sin(ht.bob*2);
    ctx.save(); ctx.globalAlpha=0.35; ctx.fillStyle='#ff6a8a';
    ctx.beginPath(); ctx.arc(ht.x,ht.y,18,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(ht.x,ht.y); ctx.scale(s,s);
    ctx.font='26px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('❤️',0,0); ctx.restore(); ctx.textBaseline='alphabetic';
  });

  // бонусы
  const BON={slow:{e:'🐌',c:'#9fd0ff'}, rapid:{e:'⚡',c:'#ffd27a'}, heart:{e:'❤️',c:'#ff6a8a'}};
  bonuses.forEach(bn=>{
    if(bn.t<3 && Math.floor(bn.t*6)%2) return;
    const b=BON[bn.type], s=1+0.14*Math.sin(bn.bob*2);
    ctx.save(); ctx.globalAlpha=0.35; ctx.fillStyle=b.c;
    ctx.beginPath(); ctx.arc(bn.x,bn.y,18,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(bn.x,bn.y); ctx.scale(s,s);
    ctx.font='24px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(b.e,0,0); ctx.restore(); ctx.textBaseline='alphabetic';
  });

  const list=[];
  cars.forEach(c=>list.push({y:c.y,k:'car',o:c}));
  enemies.forEach(e=>list.push({y:e.y,k:'en',o:e}));
  list.push({y:hero.y,k:'hero'});
  list.sort((a,b)=>a.y-b.y);
  for(const it of list){ if(it.k==='car')drawCar(it.o); else if(it.k==='en')drawEnemy(it.o); else drawHero(); }

  // эффекты молитвы мулы (луч/круг) — поверх персонажей
  enemies.forEach(e=>{ if(e.type==='mula' && e.state!=='dead') drawMulaFx(e); });

  // ударная волна супера
  if(shock){ ctx.save(); ctx.globalAlpha=Math.max(0,shock.t*1.6);
    ctx.strokeStyle='#bfe3ff'; ctx.lineWidth=10; ctx.beginPath(); ctx.arc(shock.x,shock.y,shock.r,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(shock.x,shock.y,shock.r,0,Math.PI*2); ctx.stroke();
    ctx.restore(); ctx.globalAlpha=1; }

  // всплывающие цифры
  floats.forEach(f=>{ ctx.globalAlpha=Math.max(0,Math.min(1,f.t)); ctx.fillStyle=f.color;
    ctx.font='bold 20px sans-serif'; ctx.textAlign='center'; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1;

  // салют
  confetti.forEach(p=>{ ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,p.r,p.r); });
  if(winSeq>0){ ctx.fillStyle='rgba(227,189,93,.95)'; ctx.font='bold 54px Georgia'; ctx.textAlign='center';
    ctx.fillText('ПОБЕДА!', W/2, H/2); }

  if(flash.t>0){ ctx.globalAlpha=Math.min(0.6,flash.t*1.6); ctx.fillStyle=flash.color; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1; }
  ctx.restore();
}

function drawHero(){
  const h=hero;
  shadow(h.x, h.y, 26);
  if(h.inv>0 && h.state!=='dying' && Math.floor(h.inv*12)%2) return;   // мигание при неуязвимости
  const s=heroSprite(); drawImg(s.img, h.x, h.y-h.z, 96, s.flip);
}
function drawEnemy(e){
  shadow(e.x,e.y,24);
  // видоискатель фотографа (понятная механика съёмки)
  if(e.type==='photo' && e.aiming && e.state!=='dead'){
    const p=Math.min(1,e.photoT/1.6);
    ctx.save();
    ctx.strokeStyle='rgba(255,70,70,'+(0.4+0.4*p)+')'; ctx.lineWidth=2; ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.moveTo(e.x,e.y-70); ctx.lineTo(hero.x,hero.y-40); ctx.stroke(); ctx.setLineDash([]);
    // рамка прицела вокруг героини
    const r=46-14*p;
    ctx.strokeStyle='rgba(255,255,255,'+(0.5+0.5*p)+')'; ctx.lineWidth=2;
    ctx.strokeRect(hero.x-r,hero.y-40-r,r*2,r*2);
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha=e.alpha!=null?e.alpha:1;
  const flip = e.type==='jigit'||e.type==='photo' ? e.dir<0 : false;
  drawImg(enemySprite(e), e.x, e.y, 98, flip);
  ctx.restore();
  // прочность
  if(e.state!=='dead' && e.hp<e.maxhp){
    const bw=40,x=e.x-bw/2,y=e.y-104; ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(x,y,bw,5);
    ctx.fillStyle=e.type==='jigit'?'#e3bd5d':'#6aa9d9'; ctx.fillRect(x,y,bw*e.hp/e.maxhp,5);
  }
  // индикатор зарядки кадра
  if(e.type==='photo' && e.aiming){
    const bw=42,x=e.x-bw/2,y=e.y-116; ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(x,y,bw,5);
    ctx.fillStyle='#ff5a5a'; ctx.fillRect(x,y,bw*Math.min(1,e.photoT/1.6),5);
    ctx.fillStyle='#fff'; ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.fillText('📸',e.x,y-4);
  }
  // заморожен супером
  if(freezeT>0 && e.state!=='dead'){
    ctx.save(); ctx.globalAlpha=0.5+0.3*Math.sin(freezeT*8);
    ctx.font='22px sans-serif'; ctx.textAlign='center'; ctx.fillText('❄️', e.x, e.y-100); ctx.restore();
  }
}
function drawCar(c){
  shadow(c.x,c.y+6,70);
  const img=c.img; if(!img||!img.width) return;
  const s=c.len/img.height, w=img.width*s, hgt=img.height*s;
  ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.vx>0?-Math.PI/2:Math.PI/2);
  ctx.drawImage(img,-w/2,-hgt/2,w,hgt); ctx.restore();
}
function drawMulaFx(e){
  const oy=-32;                                 // поднять эффект на уровень рук
  if(e.cast==='beam' || e.cast==='beamFire'){
    const len=1500, x2=e.x+Math.cos(e.beamAng)*len, y2=e.y+Math.sin(e.beamAng)*len+oy;
    ctx.save();
    if(e.cast==='beam'){                         // телеграф: тонкая пунктирная линия
      const p=1-Math.max(0,e.castT); // мигание нарастает
      ctx.strokeStyle='rgba(140,210,255,'+(0.4+0.4*p)+')'; ctx.lineWidth=3; ctx.setLineDash([14,10]);
      ctx.beginPath(); ctx.moveTo(e.x,e.y+oy); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
    } else {                                     // огонь: толстый светящийся луч
      const w=18+5*Math.sin(e.castT*40);
      ctx.strokeStyle='rgba(120,200,255,.85)'; ctx.lineWidth=w; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(e.x,e.y+oy); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.95)'; ctx.lineWidth=w*0.4;
      ctx.beginPath(); ctx.moveTo(e.x,e.y+oy); ctx.lineTo(x2,y2); ctx.stroke();
    }
    ctx.restore();
  } else if(e.cast==='ring' || e.cast==='ringBurst'){
    ctx.save();
    if(e.cast==='ring'){                         // телеграф круга
      const pr=44+6*Math.sin(e.castT*20);
      ctx.strokeStyle='rgba(140,210,255,.7)'; ctx.lineWidth=3; ctx.setLineDash([9,9]);
      ctx.beginPath(); ctx.arc(e.x,e.y,pr,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    } else {                                     // расширяющийся круг
      ctx.strokeStyle='rgba(120,200,255,.9)'; ctx.lineWidth=12;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.ringR,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.ringR,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- HUD / экраны ----------
function updateHud(){
  document.getElementById('lives').textContent = hero? '❤️'.repeat(Math.max(0,hero.lives)) : '';
  document.getElementById('score').textContent = score|0;
  document.getElementById('jleft').textContent = TARGETS.jigit-(kills?kills.jigit:0);
  document.getElementById('pleft').textContent = TARGETS.photo-(kills?kills.photo:0);
  const ml=document.getElementById('mleft'); if(ml) ml.textContent = TARGETS.mula-(kills?kills.mula:0);
  const sv=document.getElementById('super');
  if(sv){ const pct=Math.floor((superMeter||0)/SUPER_MAX*100);
    sv.textContent = superMeter>=SUPER_MAX ? 'ГОТОВ (Enter)' : pct+'%';
    const st=document.getElementById('superStat'); if(st) st.classList.toggle('ready', superMeter>=SUPER_MAX);
  }
}
function startWinSequence(){ state='winseq'; winSeq=1.8; Sound.win(); Sound.stopMusic(); }
function finishWin(){ endGame(true); }
function endGame(win){
  state='over'; running = win ? true : false;   // при победе оставим анимацию салюта под оверлеем
  if(!win) Sound.stopMusic();
  const card=document.getElementById('endCard');
  card.parentElement.classList.remove('hidden');
  card.className='panel card '+(win?'win':'lose');
  const stars = win ? '⭐'.repeat(Math.max(1,hero.lives)) : '';
  if(win){
    card.innerHTML=`<h2>🎉 Побег удался!</h2>
      <img src="assets/sprites/girl_jump.png" alt="">
      <p>Ты раскидала всех джигитов, фотографов и мул и сбежала со свадьбы!</p>
      <p style="font-size:22px;margin:6px 0">${stars}</p>
      <p>Очки: <b style="color:var(--gold);font-size:22px">${score|0}</b> · осталось жизней: ${hero.lives}</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:10px">
        <button class="btn" id="againBtn">Ещё раз</button>
        <a class="btn ghost" href="index.html">В меню</a></div>`;
  }else{
    card.innerHTML=`<h2>Поймали…</h2>
      <img src="assets/sprites/gameover.webp" alt="">
      <p>Тебя вернули на свадьбу. Осталось: джигитов ${TARGETS.jigit-kills.jigit}, фотографов ${TARGETS.photo-kills.photo}, мул ${TARGETS.mula-kills.mula}.</p>
      <p>Очки: <b style="color:var(--gold)">${score|0}</b></p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:10px">
        <button class="btn" id="againBtn">Попробовать снова</button>
        <a class="btn ghost" href="index.html">В меню</a></div>`;
  }
  document.getElementById('againBtn').onclick=startGame;
}

// ---------- цикл ----------
let last=0;
function loop(ts){
  const dt=Math.min(0.05,(ts-last)/1000||0); last=ts;
  if(running && (state==='play'||state==='winseq'||state==='dying')) update(dt);
  render();
  requestAnimationFrame(loop);
}

// ---------- управление ----------
function startGame(){
  reset(); state='play'; running=true;
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('endScreen').classList.add('hidden');
  Sound.unlock(); Sound.startMusic();
  updateHud();
}
document.getElementById('startBtn').onclick=startGame;
document.getElementById('restart2').onclick=startGame;
document.getElementById('pauseBtn').onclick=()=>{
  if(state!=='play'&&state!=='winseq') return;
  running=!running; document.getElementById('pauseBtn').textContent=running?'Пауза':'Продолжить';
};
document.getElementById('musicBtn').onclick=()=>{
  Sound.unlock(); const on=Sound.toggleMusic();
  document.getElementById('musicBtn').textContent=on?'🔊':'🔇';
};

reset();
requestAnimationFrame(loop);
})();
