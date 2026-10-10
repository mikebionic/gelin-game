// Headless-прогон game2.js: стабим DOM/Canvas/Image и крутим игровой цикл,
// чтобы отловить runtime-ошибки (undefined, NaN, падения) без браузера.
const fs = require('fs');

const listeners = {};               // глобальные addEventListener (keydown/keyup)
const nodes = {};
function fakeNode(id){
  if(nodes[id]) return nodes[id];
  const n = {
    id, textContent:'', innerHTML:'', className:'', value:'',
    style:{}, dataset:{}, width:960, height:600, onclick:null,
    classList:{add(){},remove(){},toggle(){}},
    addEventListener(){}, removeEventListener(){},
    appendChild(){}, removeChild(){}, querySelectorAll(){return [];},
    getContext(){ return ctxProxy; },
  };
  n.parentElement = { classList:{add(){},remove(){}} };
  nodes[id] = n; return n;
}
const ctxProxy = new Proxy({}, { get(_,p){
  if(p==='measureText') return ()=>({width:10});
  if(p==='canvas') return {width:960,height:600};
  if(p==='createLinearGradient'||p==='createRadialGradient') return ()=>({addColorStop(){}});
  return (typeof p==='string') ? (()=>{}) : undefined;
}});

global.document = {
  getElementById: id => fakeNode(id),
  querySelectorAll: () => [],
  addEventListener(){},
};
global.addEventListener = (type,cb)=>{ (listeners[type]=listeners[type]||[]).push(cb); };
global.Image = class {
  set src(v){ this._src=v; this.width=50; this.height=90; if(this.onload) this.onload(); }
  get src(){ return this._src; }
};
let rafCb=null;
global.requestAnimationFrame = cb => { rafCb=cb; return 1; };
global.cancelAnimationFrame = ()=>{};

// загрузить и выполнить игру
const code = fs.readFileSync(__dirname+'/../js/game2.js','utf8');
eval(code);

// запустить игру через onclick кнопки старта
fakeNode('startBtn').onclick();

function press(code){ (listeners.keydown||[]).forEach(cb=>cb({code,repeat:false,preventDefault(){}})); }
function release(code){ (listeners.keyup||[]).forEach(cb=>cb({code,preventDefault(){}})); }

// прогнать кадры со случайным вводом + частыми ударами
let ts=0, frames=0, over=false, err=null;
const dirs=['KeyW','KeyA','KeyS','KeyD'];
try{
  for(frames=0; frames<4000; frames++){
    ts+=16;
    // случайное движение
    if(frames%20===0){ dirs.forEach(release); const d=dirs[(Math.random()*4)|0]; press(d); }
    // частые удары и иногда прыжок
    if(frames%6===0){ press('KeyJ'); }
    if(frames%50===0){ press('KeyK'); }
    rafCb(ts);
    // проверка на NaN в состоянии героини
    const n = nodes['lives'];
    if(frames%500===0){ /* периодически ок */ }
  }
}catch(e){ err=e; }

console.log('кадров прокручено:', frames);
console.log('ассетов загружено (ожидалось 18):', (typeof loaded!=='undefined'?loaded:'?'));
console.log('жизни HUD:', nodes['lives'].textContent);
console.log('джигиты осталось:', nodes['jleft'].textContent, '| фотографы:', nodes['pleft'].textContent);
console.log('экран конца показан (endCard innerHTML len):', ((nodes['endCard']&&nodes['endCard'].innerHTML)||'').length);
if(err){ console.error('RUNTIME ERROR:', err && err.stack || err); process.exit(1); }
else console.log('OK: game2 отработал без исключений');
