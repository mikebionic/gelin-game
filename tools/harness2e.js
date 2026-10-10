// Проверка супер-удара: враги рядом мгновенно умирают, дальние замораживаются.
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
code=code.replace(/\}\)\(\);\s*$/,'globalThis.__g={getHero:()=>hero,getEnemies:()=>enemies,spawnEnemy,doSuper,getFreeze:()=>freezeT,getSuper:()=>superMeter}; })();');
eval(code);
fakeNode('startBtn').onclick();

const h=__g.getHero(); h.x=480; h.y=300;
__g.getEnemies().length=0;
__g.spawnEnemy('jigit'); const near=__g.getEnemies()[0]; near.x=560; near.y=300; near.state='walk'; // 80px (в радиусе)
__g.spawnEnemy('photo'); const far =__g.getEnemies()[1]; far.x=480; far.y=720; far.state='walk';  // 420px (вне радиуса)

__g.doSuper();
const nearDead = near.state==='dead';
const farFrozen = __g.getFreeze()>0 && far.state!=='dead';
console.log('ближний враг state =', near.state, '| дальний state =', far.state, '| freeze =', __g.getFreeze().toFixed(1));
console.log(nearDead && farFrozen ? 'OK: супер убил ближнего и заморозил дальнего' : 'ОШИБКА супера');

// проверка заморозки: дальний не двигается несколько кадров
const x0=far.x, y0=far.y;
for(let i=0;i<10;i++){ h.inv=99; rafCb(16*(i+1)); }
const moved = Math.hypot(far.x-x0, far.y-y0);
console.log('дальний сдвинулся за заморозку на', moved.toFixed(1), 'px ->', moved<1?'OK (стоит)':'двигается');
