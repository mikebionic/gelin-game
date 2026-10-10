// Прогон win-ветки game2: внедряем временный debug-хук, насильно добиваем
// врагов и держим героиню неуязвимой, чтобы дойти до победы.
const fs = require('fs');
const listeners={}, nodes={};
function fakeNode(id){ if(nodes[id])return nodes[id];
  const n={id,textContent:'',innerHTML:'',className:'',value:'',style:{},dataset:{},width:960,height:600,onclick:null,
    classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},querySelectorAll(){return[];},getContext(){return ctxProxy;}};
  n.parentElement={classList:{add(){},remove(){}}}; nodes[id]=n; return n; }
const ctxProxy=new Proxy({},{get(_,p){ if(p==='measureText')return()=>({width:10}); if(p==='canvas')return{width:960,height:600}; if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}}); return ()=>{}; }});
global.document={getElementById:id=>fakeNode(id),querySelectorAll:()=>[],addEventListener(){}};
global.addEventListener=(t,cb)=>{(listeners[t]=listeners[t]||[]).push(cb);};
global.Image=class{set src(v){this._src=v;this.width=50;this.height=90;if(this.onload)this.onload();}get src(){return this._src;}};
let rafCb=null; global.requestAnimationFrame=cb=>{rafCb=cb;return 1;}; global.cancelAnimationFrame=()=>{};

let code=fs.readFileSync(__dirname+'/../js/game2.js','utf8');
// внедрить хук перед закрытием IIFE
code=code.replace(/\}\)\(\);\s*$/,
  'globalThis.__g={getHero:()=>hero,getEnemies:()=>enemies,hitEnemy,getKills:()=>kills,getToSpawn:()=>toSpawn,getState:()=>state}; })();');
eval(code);
fakeNode('startBtn').onclick();

let ts=0,err=null,frames=0;
try{
  for(frames=0; frames<6000; frames++){
    ts+=16;
    const h=__g.getHero(); if(h) h.inv=99;          // неуязвима
    const es=__g.getEnemies();
    // добить всех живых врагов
    es.forEach(e=>{ if(e.state!=='dead') __g.hitEnemy(e, h.x+1000, h.y, 3, 5); });
    rafCb(ts);
    if(__g.getState()==='over') break;
  }
}catch(e){ err=e; }
const k=__g.getKills();
console.log('кадров:',frames,'| состояние:',__g.getState());
console.log('убито джигитов:',k.jigit,'| фотографов:',k.photo,'| мул:',k.mula);
console.log('осталось в очереди:',__g.getToSpawn().length,'| живых врагов:',__g.getEnemies().length);
console.log('win-экран (endCard len):',((nodes['endCard']&&nodes['endCard'].innerHTML)||'').length, '| содержит «Побег удался»:',/Побег удался/.test((nodes['endCard']&&nodes['endCard'].innerHTML)||''));
if(err){console.error('RUNTIME ERROR:',err&&err.stack||err);process.exit(1);}
else console.log(k.jigit===3&&k.photo===10&&k.mula===4?'OK: достигнута победа, все 17 врагов убиты (вкл. 4 мулы)':'ВНИМАНИЕ: победа не достигнута');
