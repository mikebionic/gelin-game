// Headless-прогон game1.js с мини-DOM: инициализация, все 5 испытаний,
// обвинение верной и неверной девушки. Ловим runtime-ошибки.
const fs=require('fs');
const ALL=[];                         // реестр всех созданных узлов
class Node{
  constructor(tag){ this.tag=tag; this._cls=''; this.dataset={}; this.children=[]; this.style={};
    this._html=''; this.textContent=''; this.value=''; this.onclick=null; this.listeners={}; this.parent=null;
    this.offsetWidth=0; ALL.push(this); }
  set className(v){ this._cls=v||''; } get className(){ return this._cls; }
  get classList(){ const self=this; return {
    add(c){ if(!self._has(c)) self._cls=(self._cls+' '+c).trim(); },
    remove(c){ self._cls=self._cls.split(/\s+/).filter(x=>x&&x!==c).join(' '); },
    toggle(c,f){ const has=self._has(c); const want=f===undefined?!has:f; if(want&&!has)this.add(c); if(!want&&has)this.remove(c); return want; },
    contains(c){ return self._has(c); } }; }
  _has(c){ return this._cls.split(/\s+/).indexOf(c)>=0; }
  set innerHTML(v){ this._html=v; this.children=[]; } get innerHTML(){ return this._html; }
  appendChild(c){ c.parent=this; this.children.push(c); return c; }
  removeChild(c){ const i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); }
  remove(){ if(this.parent) this.parent.removeChild(this); }
  addEventListener(t,cb){ this.listeners[t]=cb; }
  _descendants(out){ for(const c of this.children){ out.push(c); c._descendants(out); } return out; }
  querySelector(sel){ const r=matchList(this._descendants([]),sel); return r[0]||null; }
  querySelectorAll(sel){ return matchList(this._descendants([]),sel); }
}
function parseSimple(part){
  // последний простой селектор: .a.b[data-x="v"]
  const cls=[...part.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);
  const attr=[...part.matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map(m=>[m[1],m[2]]);
  return {cls,attr};
}
function matchNode(n,s){
  for(const c of s.cls) if(!n._has(c)) return false;
  for(const [k,v] of s.attr){ const dk=k.replace(/^data-/,''); if(String(n.dataset[dk])!==v) return false; }
  return true;
}
function matchList(nodes,sel){
  const parts=sel.trim().split(/\s+(?![^\[]*\])/); // по пробелам (грубо)
  const s=parseSimple(parts[parts.length-1]);
  return nodes.filter(n=>matchNode(n,s));
}
const nodes={};
function fakeNode(id){ if(nodes[id])return nodes[id]; const n=new Node('div'); n.id=id;
  n.parentElement={classList:{add(){},remove(){},toggle(){}}}; nodes[id]=n; return n; }
global.document={
  getElementById:id=>fakeNode(id),
  createElement:t=>new Node(t),
  querySelector:sel=>matchList(ALL,sel)[0]||null,
  querySelectorAll:sel=>matchList(ALL,sel),
  addEventListener(){},
};

let code=fs.readFileSync(__dirname+'/../js/game1.js','utf8');
code+='\n;globalThis.__g1={get state(){return state}, newGame};';
eval(code);

function clickByText(txt){
  const n=ALL.find(x=>x.onclick && (x.textContent||'')===txt);
  if(!n){ console.log('  (!) кнопка не найдена:',txt); return; }
  n.onclick();
}
function setTab(id){ document.querySelectorAll('.tab').forEach(()=>{}); // noop
  // вкладки имеют onclick=setActiveTab; найдём по dataset.tab
  const tab=ALL.find(x=>x.dataset && x.dataset.tab===id && x.onclick); if(tab) tab.onclick();
}

let err=null, result={};
try{
  const S=__g1.state.s;
  const fillInput=(type,val)=>{ const n=ALL.filter(x=>x.tag==='input' && x.type===type); if(n.length) n[0].value=val; };
  // пройти все испытания (поля вводим сами: 11 и 250)
  setTab('products'); clickByText('Поставить на стол');
  setTab('colors');   clickByText('Выложить цвета');
  setTab('numbers');  fillInput('number','11'); clickByText('Загадать');
  setTab('toys');     clickByText('Предложить');
  setTab('text');     fillInput('text','250');  clickByText('Сказать');

  // проверить блокнот: ровно одна девушка со всеми ✓ и это S
  const st=__g1.state;
  const suspects=st.obs.map((o,i)=>({i,all:Object.values(o).every(v=>v==='yes')})).filter(x=>x.all).map(x=>x.i);
  result.suspects=suspects; result.S=S;

  // неверное обвинение (не S) -> минус попытка
  fakeNode('accuseBtn').onclick();                  // включить режим обвинения
  const wrong=(S+1)%10;
  document.querySelector('.girl[data-i="'+wrong+'"]').listeners.click();
  result.attemptsAfterWrong=st.attempts;

  // верное обвинение -> победа
  if(!st.accusing) fakeNode('accuseBtn').onclick();
  document.querySelector('.girl[data-i="'+S+'"]').listeners.click();
  result.over=st.over;
  result.overlayShown=!nodes['overlay']._has('hidden');
  result.winText=/нашёл Gelin/.test(nodes['overlayBox'].innerHTML||'');
}catch(e){ err=e; }

console.log('S под индексом:', result.S);
console.log('подозреваемые (все ✓):', result.suspects, '->', JSON.stringify(result.suspects)===JSON.stringify([result.S])?'ровно Gelin ✔':'ОШИБКА');
console.log('попыток после неверного обвинения (было 2):', result.attemptsAfterWrong);
console.log('игра завершена:', result.over, '| оверлей показан:', result.overlayShown, '| текст победы:', result.winText);
if(err){ console.error('RUNTIME ERROR:', err&&err.stack||err); process.exit(1); }
else console.log('OK: game1 отработал без исключений');
