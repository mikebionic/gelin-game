// Проверка механики Мула: луч бьёт по линии (и мимо не бьёт), круг бьёт на земле
// и НЕ бьёт в прыжке. Используем debug-хук.
const fs=require('fs');
const listeners={},nodes={};
function fakeNode(id){ if(nodes[id])return nodes[id];
  const n={id,textContent:'',innerHTML:'',className:'',value:'',style:{},dataset:{},width:960,height:600,onclick:null,
    classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},querySelectorAll(){return[];},getContext(){return ctxProxy;}};
  n.parentElement={classList:{add(){},remove(){}}}; nodes[id]=n; return n; }
const ctxProxy=new Proxy({},{get(_,p){ if(p==='measureText')return()=>({width:10}); if(p==='canvas')return{width:960,height:600}; if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}}); return ()=>{}; }});
global.document={getElementById:id=>fakeNode(id),querySelectorAll:()=>[],addEventListener(){}};
global.addEventListener=(t,cb)=>{(listeners[t]=listeners[t]||[]).push(cb);};
global.Image=class{set src(v){this.width=50;this.height=90;if(this.onload)this.onload();}};
let rafCb=null; global.requestAnimationFrame=cb=>{rafCb=cb;return 1;};
let code=fs.readFileSync(__dirname+'/../js/game2.js','utf8');
code=code.replace(/\}\)\(\);\s*$/,'globalThis.__g={getHero:()=>hero,getEnemies:()=>enemies,onBeam,spawnEnemy,getState:()=>state}; })();');
eval(code);
fakeNode('startBtn').onclick();
const h=__g.getHero();

// --- тест луча: мула в (300,300), герой на линии вправо и в стороне ---
__g.getEnemies().length=0;
__g.spawnEnemy('mula');
const m=__g.getEnemies()[0]; m.x=300; m.y=300; m.state='walk'; m.cast=null;
m.beamAng=0; // луч строго вправо
let onLine, offLine;
{ h.x=500; h.y=300; onLine=__g.onBeam(m,h); }          // прямо на линии
{ h.x=500; h.y=380; offLine=__g.onBeam(m,h); }         // в 80px в стороне
{ h.x=100; h.y=300; var behind=__g.onBeam(m,h); }      // позади мулы
console.log('луч: на линии =', onLine, '| в стороне =', offLine, '| позади =', behind);

// --- тест круга: добьём кадрами fire, проверим урон на земле vs в прыжке ---
function lives(){ return __g.getHero().lives; }
// ставим кольцо почти на радиусе героя
function ringHit(zHigh){
  const H=__g.getHero(); H.lives=3; H.inv=0; H.z = zHigh?60:0;
  __g.getEnemies().length=0; __g.spawnEnemy('mula');
  const mm=__g.getEnemies()[0]; mm.x=400; mm.y=300; mm.state='walk';
  H.x=460; H.y=300;                     // на расстоянии 60 от мулы
  mm.cast='ringBurst'; mm.castT=1.0; mm.ringR=40;   // кольцо подходит к 60
  // прокрутим несколько кадров, пока кольцо проходит радиус 60
  for(let i=0;i<30;i++){ H.inv=Math.max(0,H.inv); if(__g.getState()!=='play')break; rafCb(16*(i+1)); if(lives()<3)break; }
  return lives()<3;
}
const hitGround = ringHit(false);
const hitAir = ringHit(true);
console.log('круг: попал на земле =', hitGround, '| попал в прыжке =', hitAir);

const ok = onLine && !offLine && !behind && hitGround && !hitAir;
console.log(ok ? 'OK: луч бьёт по линии (мимо/позади нет), круг бьёт на земле и НЕ в прыжке' : 'ОШИБКА в механике Мула');
