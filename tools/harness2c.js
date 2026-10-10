// Проверка коллизии с машиной: ставим машину на героиню и прокручиваем кадр,
// ждём, что героиня получит состояние 'hurt' и отлетит.
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
code=code.replace(/\}\)\(\);\s*$/,'globalThis.__g={getHero:()=>hero,getCars:()=>cars,getState:()=>state}; })();');
eval(code);
fakeNode('startBtn').onclick();

const h=__g.getHero(); h.x=480; h.y=400; h.z=0; h.state='idle';
__g.getCars().push({x:480, y:h.y-34, vx:5, len:150, h:74, img:{width:50,height:90}, cd:0});
rafCb(16); rafCb(32);
const after=__g.getHero();
console.log('после наезда: state =', after.state, '| vx =', after.vx.toFixed(1));
console.log(after.state==='hurt' && Math.abs(after.vx)>8 ? 'OK: машина сбила и отбросила Гелин' : 'ОШИБКА: наезд не сработал');
