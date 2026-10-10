/* ===================== Игра 1: «Найди S» =====================
   10 девушек в парандже, одна из них S. У игрока есть досье
   из 7 примет. Испытания раскрывают поведение каждой девушки,
   блокнот фиксирует совпадения. Генерация гарантирует, что ровно
   одна девушка (S) совпадает со всеми семью приметами.
   ============================================================= */

// ---------- данные ----------
const COLORS = [
  {id:'red',    name:'красный',   hex:'#d8402f'},
  {id:'yellow', name:'жёлтый',    hex:'#f2c53d'},
  {id:'blue',   name:'синий',     hex:'#2f6fd8'},
  {id:'orange', name:'оранжевый', hex:'#ef8a2b'},
  {id:'pink',   name:'розовый',   hex:'#e86aa6'},
  {id:'green',  name:'зелёный',   hex:'#3fa85b'},
  {id:'teal',   name:'бирюзовый', hex:'#2aa198'},
  {id:'purple', name:'фиолетовый',hex:'#8a52c9'},
  {id:'black',  name:'чёрный',    hex:'#2b2b2b'},
  {id:'white',  name:'белый',     hex:'#f3f1ea'},
  {id:'gray',   name:'серый',     hex:'#9aa0a6'},
  {id:'brown',  name:'коричневый',hex:'#8a5a33'},
  {id:'skyblue',name:'голубой',   hex:'#6cc3e6'},
  {id:'lime',   name:'салатовый', hex:'#a6d24a'},
  {id:'coral',  name:'коралловый',hex:'#ff7f6b'},
  {id:'maroon', name:'бордовый',  hex:'#7c1f33'},
  {id:'gold',   name:'золотой',   hex:'#e3bd5d'},
  {id:'lavender',name:'лавандовый',hex:'#b79be0'},
];
const TOYS = [
  {id:'shark',   name:'акула',    emoji:'🦈'},
  {id:'teddy',   name:'мишка',    emoji:'🧸'},
  {id:'rabbit',  name:'зайка',    emoji:'🐰'},
  {id:'cat',     name:'кошка',    emoji:'🐱'},
  {id:'duck',    name:'уточка',   emoji:'🦆'},
  {id:'dog',     name:'пёсик',    emoji:'🐶'},
  {id:'panda',   name:'панда',    emoji:'🐼'},
  {id:'elephant',name:'слоник',   emoji:'🐘'},
  {id:'lion',    name:'львёнок',  emoji:'🦁'},
  {id:'unicorn', name:'единорог', emoji:'🦄'},
  {id:'penguin', name:'пингвин',  emoji:'🐧'},
  {id:'frog',    name:'лягушка',  emoji:'🐸'},
  {id:'owl',     name:'совёнок',  emoji:'🦉'},
  {id:'octopus', name:'осьминог', emoji:'🐙'},
  {id:'dino',    name:'динозавр', emoji:'🦖'},
  {id:'fox',     name:'лисёнок',  emoji:'🦊'},
];
const P = (id,name,img,emoji)=>({id,name,img:img?`assets/products/${img}`:null,emoji:emoji||null});
const PRODUCTS = [
  // ключевые для улик S
  P('white_bread','белый хлеб','white_bread.png'),
  P('black_bread','чёрный хлеб','black_bread.png'),
  P('salt','соль',null,'🧂'),
  P('oil','масло','oil.png'),
  // остальное (картинки)
  P('meat','мясо','meat.png'),
  P('chicken','курица','chicken.png'),
  P('cheese','сыр','cheese.png'),
  P('fish','рыба','fish.png'),
  P('eggs','яйца','eggs.png'),
  P('milk','молоко','milk.png'),
  P('butter','сл. масло','butter.png'),
  P('sour_cream','сметана','sour_cream.png'),
  P('cottage_cheese','творог','cottage_cheese.png'),
  P('vegetables','овощи','vegetables.png'),
  P('fruits','фрукты','fruits.png'),
  P('corn','кукуруза','corn.png'),
  P('grapes','виноград','grapes.png'),
  P('bananas','бананы','bananas.png'),
  P('honey','мёд','honey.png'),
  P('sausages','сосиски','sausages.png'),
  P('soup','суп','soup.png'),
  P('porridge','каша','porridge.png'),
  // остальное (эмодзи)
  P('spices','специи',null,'🌶️'),
  P('rice','рис',null,'🍚'),
  P('bulgur','булгур',null,'🥣'),
  P('tomato','помидор',null,'🍅'),
  P('cucumber','огурец',null,'🥒'),
  P('carrot','морковь',null,'🥕'),
  P('watermelon','арбуз',null,'🍉'),
  P('nuts','орехи',null,'🥜'),
  P('tea','чай',null,'🍵'),
  P('pelmeni','пельмени',null,'🥟'),
];
const KEY_PRODUCTS = new Set(['white_bread','black_bread','salt','oil']);
const NEUTRAL_PRODUCTS = PRODUCTS.map(p=>p.id).filter(id=>!KEY_PRODUCTS.has(id));
// смешные туркменские слова (каждая группа: варианты написания, лат./кир.)
const FLAVOR_WORDS = [
  ['juro','джуро'],
  ['panda','панда'],
  ['debil','дебил'],
  ['shypbydyk','шыпбыдык','шыпбык'],
  ['samsyk','самсык'],
  ['kelle','келле'],
  ['eshek','эшек','ишак'],
  ['gujuk','гуджук'],
  ['pyshdyk','пышдык'],
  ['bebe','бебе'],
  ['hahata','хахата'],
  ['chuuk','чуук'],
];

// 7 признаков (колонки блокнота). flag=true => ведёт себя как S.
const TRAITS = [
  {key:'laughs250', col:'Смеётся над «250»',        icon:'😂'},
  {key:'breadRule', col:'Чёрный хлеб, не белый',    icon:'🍞'},
  {key:'refusesSalt',col:'Не берёт соль',           icon:'🧂'},
  {key:'refusesOil', col:'Не берёт масло',          icon:'🫒'},
  {key:'takesShark', col:'Берёт акулу',             icon:'🦈'},
  {key:'picksNum11', col:'Выбирает число 11',       icon:'🔢'},
  {key:'favTeal',    col:'Любит бирюзовый',         icon:'🎨'},
];

// ---------- утилиты ----------
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const rb=()=>Math.random()<0.5;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
const sample=(arr,n)=>shuffle(arr).slice(0,n);
const uniq=a=>[...new Set(a)];

// ---------- состояние ----------
let state;

function makeFlavor(t){
  // цвета
  let colors = sample(COLORS.filter(c=>c.id!=='teal').map(c=>c.id), ri(2,3));
  if(t.favTeal) colors.push('teal'); else colors = colors.filter(c=>c!=='teal');
  // числа
  let nums = sample([...Array(50)].map((_,i)=>i+1).filter(n=>n!==11), ri(2,3));
  if(t.picksNum11) nums.push(11);
  // игрушки
  let toys = sample(TOYS.filter(x=>x.id!=='shark').map(x=>x.id), ri(1,2));
  if(t.takesShark) toys.push('shark');
  // продукты
  let prods = sample(NEUTRAL_PRODUCTS, ri(3,5));
  if(t.breadRule){ prods.push('black_bread'); }               // как S: чёрный, без белого
  else { prods.push('white_bread'); if(rb()) prods.push('black_bread'); }
  if(!t.refusesSalt) prods.push('salt');
  if(!t.refusesOil)  prods.push('oil');
  // слова для смеха (группы вариантов написания); «250» обрабатывается отдельно по примете
  let words = sample(FLAVOR_WORDS, ri(1,2));
  return {
    likedColors:uniq(colors), likedNumbers:uniq(nums),
    likedToys:uniq(toys), likedProducts:uniq(prods), laughWords:words
  };
}

function makeGirl(traits){
  return Object.assign({}, traits, makeFlavor(traits));
}

function genGirls(){
  const N=10, s=ri(0,N-1), girls=[];
  const sTraits={laughs250:true,breadRule:true,refusesSalt:true,refusesOil:true,takesShark:true,picksNum11:true,favTeal:true};
  for(let i=0;i<N;i++){
    if(i===s){ girls.push(makeGirl(sTraits)); continue; }
    let t={}; TRAITS.forEach(tr=>t[tr.key]=rb());
    // не должна совпадать с S по всем 7 признакам
    if(TRAITS.every(tr=>t[tr.key])){ t[TRAITS[ri(0,6)].key]=false; }
    girls.push(makeGirl(t));
  }
  return {girls, s};
}

function newGame(){
  const g=genGirls();
  state={
    girls:g.girls, s:g.s, attempts:2, accusing:false, over:false,
    obs: g.girls.map(()=>({laughs250:'q',breadRule:'q',refusesSalt:'q',refusesOil:'q',takesShark:'q',picksNum11:'q',favTeal:'q'})),
    picks: g.girls.map(()=>[]),
  };
  buildStage(); buildNotebook(); setActiveTab('products');
  document.getElementById('attempts').textContent=state.attempts;
  hint('Запускай испытания слева. Когда будешь уверен, жми «Назвать S».');
  hideOverlay();
}

// ---------- DOM: сцена ----------
function buildStage(){
  const st=document.getElementById('stage');
  st.className='stage panel';
  st.innerHTML='';
  state.girls.forEach((g,i)=>{
    const el=document.createElement('div');
    el.className='girl'; el.dataset.i=i;
    el.innerHTML=`<div class="picks" id="picks${i}"></div>
      <img class="sprite" src="assets/sprites/girl_idle.png" alt="">
      <span class="label">№${i+1}</span>`;
    el.addEventListener('click',()=>onGirlClick(i));
    st.appendChild(el);
  });
}

function hint(t){document.getElementById('hintLine').textContent=t;}

// показать реакции: arr[i] = {react:bool, bubble:string, picks:[{img|emoji|dot}]}
function showReactions(arr){
  // очистить пузыри и пики
  state.girls.forEach((_,i)=>{
    const picks=document.getElementById('picks'+i); picks.innerHTML='';
    const girlEl=document.querySelector('.girl[data-i="'+i+'"]');
    girlEl.querySelectorAll('.bubble').forEach(b=>b.remove());
    girlEl.classList.remove('react');
  });
  arr.forEach((r,i)=>{
    if(!r) return;
    const girlEl=document.querySelector('.girl[data-i="'+i+'"]');
    if(r.react){ void girlEl.offsetWidth; girlEl.classList.add('react'); }
    if(r.bubble){
      const b=document.createElement('div'); b.className='bubble'; b.textContent=r.bubble;
      girlEl.appendChild(b);
      setTimeout(()=>b.remove(),1600);
    }
    if(r.picks&&r.picks.length){
      const pc=document.getElementById('picks'+i);
      r.picks.slice(0,6).forEach(p=>{
        const d=document.createElement('div');
        if(p.dot){ d.className='dot'; d.style.background=p.dot; }
        else{ d.className='pick'; d.innerHTML = p.img?`<img src="${p.img}">`:p.emoji; }
        pc.appendChild(d);
      });
    }
  });
}

// ---------- запись в блокнот ----------
function record(col){
  state.girls.forEach((g,i)=>{
    state.obs[i][col] = g[col] ? 'yes' : 'no';
  });
  buildNotebook();
}

// ---------- DOM: вкладки испытаний ----------
const TABS=[
  {id:'products',name:'🍽️ Продукты'},
  {id:'colors',  name:'🎨 Цвета'},
  {id:'numbers', name:'🔢 Числа'},
  {id:'toys',    name:'🧸 Игрушки'},
  {id:'text',    name:'💬 Текст'},
];
function buildTabs(){
  const t=document.getElementById('tabs'); t.innerHTML='';
  TABS.forEach(tb=>{
    const b=document.createElement('div'); b.className='tab'; b.dataset.tab=tb.id; b.textContent=tb.name;
    b.onclick=()=>setActiveTab(tb.id); t.appendChild(b);
  });
}
function setActiveTab(id){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  const body=document.getElementById('chBody');
  body.innerHTML=''; body.appendChild(CH[id]());
}

// билдер «опции» (продукт/игрушка)
function optTile(id,label,img,emoji,checked){
  const o=document.createElement('div'); o.className='opt'+(checked?' on':''); o.dataset.id=id;
  o.innerHTML=`<div class="ck">✔</div><div class="ic">${img?`<img src="${img}">`:emoji}</div><div class="nm">${label}</div>`;
  o.onclick=()=>o.classList.toggle('on');
  return o;
}
const selected=box=>[...box.querySelectorAll('.opt.on')].map(o=>o.dataset.id);

// ---------- испытания ----------
const CH={};

CH.products=()=>{
  const w=document.createElement('div'); w.className='ch active';
  w.innerHTML=`<h3 class="title-gold">Накрой стол</h3>
    <p class="hint">Накрой стол и смотри, кто что берёт.</p>`;
  const grid=document.createElement('div'); grid.className='grid-pick';
  const keyset=new Set(['white_bread','black_bread','salt','oil']);
  PRODUCTS.forEach(p=>grid.appendChild(optTile(p.id,p.name,p.img,p.emoji,keyset.has(p.id))));
  const bar=document.createElement('div'); bar.className='row-controls';
  const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Поставить на стол';
  bar.appendChild(btn); w.appendChild(grid); w.appendChild(bar);
  btn.onclick=()=>{
    const onTable=new Set(selected(grid));
    if(onTable.size===0){hint('Сначала выбери хотя бы один продукт.');return;}
    const react=state.girls.map(g=>{
      const got=g.likedProducts.filter(id=>onTable.has(id));
      const picks=got.map(id=>{const d=PRODUCTS.find(x=>x.id===id);return {img:d.img,emoji:d.emoji};});
      return {react:got.length>0, picks, bubble: got.length?null:'🤔'};
    });
    showReactions(react);
    if(onTable.has('white_bread')&&onTable.has('black_bread')) record('breadRule');
    if(onTable.has('salt')) record('refusesSalt');
    if(onTable.has('oil'))  record('refusesOil');
    hint('Готово. Отметки в блокноте обновились.');
  };
  return w;
};

CH.colors=()=>{
  const w=document.createElement('div'); w.className='ch active';
  w.innerHTML=`<h3 class="title-gold">Любимые цвета</h3>
    <p class="hint">Выложи цвета и смотри, кто какие возьмёт.</p>`;
  const grid=document.createElement('div'); grid.className='grid-pick';
  const def=new Set(['teal','red','blue','yellow','black']);
  COLORS.forEach(c=>{
    const o=document.createElement('div'); o.className='opt'+(def.has(c.id)?' on':''); o.dataset.id=c.id;
    o.innerHTML=`<div class="ck">✔</div><div class="ic"><div class="swatch" style="background:${c.hex}"></div></div><div class="nm">${c.name}</div>`;
    o.onclick=()=>o.classList.toggle('on'); grid.appendChild(o);
  });
  const bar=document.createElement('div'); bar.className='row-controls';
  const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Выложить цвета';
  bar.appendChild(btn); w.appendChild(grid); w.appendChild(bar);
  btn.onclick=()=>{
    const onTable=new Set(selected(grid));
    if(!onTable.size){hint('Выбери хотя бы один цвет.');return;}
    const react=state.girls.map(g=>{
      const got=g.likedColors.filter(id=>onTable.has(id));
      const picks=got.map(id=>({dot:COLORS.find(c=>c.id===id).hex}));
      return {react:got.length>0, picks};
    });
    showReactions(react);
    if(onTable.has('teal')) record('favTeal');
    hint('Готово. Отметки в блокноте обновились.');
  };
  return w;
};

CH.numbers=()=>{
  const w=document.createElement('div'); w.className='ch active';
  w.innerHTML=`<h3 class="title-gold">Загадай числа</h3>
    <p class="hint">Введи до трёх чисел (от 1 до 50) и смотри, кто что выберет.</p>`;
  const bar=document.createElement('div'); bar.className='row-controls';
  const inputs=['','',''].map(()=>{const inp=document.createElement('input');inp.type='number';inp.min=1;inp.max=50;inp.placeholder='1-50';return inp;});
  inputs.forEach(i=>bar.appendChild(i));
  const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Загадать'; bar.appendChild(btn);
  w.appendChild(bar);
  btn.onclick=()=>{
    const nums=inputs.map(i=>parseInt(i.value)).filter(n=>n>=1&&n<=50);
    if(!nums.length){hint('Введи хотя бы одно число от 1 до 50.');return;}
    const set=new Set(nums);
    const react=state.girls.map(g=>{
      const got=g.likedNumbers.filter(n=>set.has(n));
      const picks=got.map(n=>({emoji:String(n)}));
      return {react:got.length>0, picks, bubble: got.length?null:'🤷‍♀️'};
    });
    showReactions(react);
    if(set.has(11)) record('picksNum11');
    hint('Готово. Отметки в блокноте обновились.');
  };
  return w;
};

CH.toys=()=>{
  const w=document.createElement('div'); w.className='ch active';
  w.innerHTML=`<h3 class="title-gold">Плюшевые игрушки</h3>
    <p class="hint">Предложи игрушки и смотри, кто что схватит.</p>`;
  const grid=document.createElement('div'); grid.className='grid-pick';
  const def=new Set(['shark','teddy','cat']);
  TOYS.forEach(t=>grid.appendChild(optTile(t.id,t.name,null,t.emoji,def.has(t.id))));
  const bar=document.createElement('div'); bar.className='row-controls';
  const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Предложить'; bar.appendChild(btn);
  w.appendChild(grid); w.appendChild(bar);
  btn.onclick=()=>{
    const onTable=new Set(selected(grid));
    if(!onTable.size){hint('Выбери хотя бы одну игрушку.');return;}
    const react=state.girls.map(g=>{
      const got=g.likedToys.filter(id=>onTable.has(id));
      const picks=got.map(id=>({emoji:TOYS.find(t=>t.id===id).emoji}));
      return {react:got.length>0, picks};
    });
    showReactions(react);
    if(onTable.has('shark')) record('takesShark');
    hint('Готово. Отметки в блокноте обновились.');
  };
  return w;
};

CH.text=()=>{
  const w=document.createElement('div'); w.className='ch active';
  w.innerHTML=`<h3 class="title-gold">Скажи что-нибудь</h3>
    <p class="hint">Напиши слово или число и смотри, кто засмеётся.</p>`;
  const bar=document.createElement('div'); bar.className='row-controls';
  const inp=document.createElement('input'); inp.type='text'; inp.placeholder='Ваш текст'; inp.style.flex='1';
  const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Сказать';
  bar.appendChild(inp); bar.appendChild(btn); w.appendChild(bar);
  const say=()=>{
    const txt=inp.value.trim().toLowerCase();
    if(!txt){hint('Введи слово или число.');return;}
    const react=state.girls.map(g=>{
      const laughs = (txt.includes('250') && g.laughs250)
        || g.laughWords.some(gr=>gr.some(wd=>txt.includes(wd)));
      return {react:laughs, bubble: laughs?'😂':null};
    });
    showReactions(react);
    if(txt.includes('250')) record('laughs250');
    hint('Готово. Отметки в блокноте обновились.');
  };
  btn.onclick=say;
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')say();});
  return w;
};

// ---------- блокнот ----------
function buildNotebook(){
  const wrap=document.getElementById('nbWrap');
  const m=v=>v==='yes'?'<span class="mark yes">✓</span>':v==='no'?'<span class="mark no">✗</span>':'<span class="mark q">·</span>';
  let html='<table class="nb"><tr><th>№</th>'+TRAITS.map(t=>'<th title="'+t.col+'">'+t.icon+'</th>').join('')+'</tr>';
  state.girls.forEach((g,i)=>{
    const o=state.obs[i];
    const dead=TRAITS.some(t=>o[t.key]==='no');
    const allKnown=TRAITS.every(t=>o[t.key]!=='q');
    const suspect=!dead && TRAITS.some(t=>o[t.key]==='yes');
    const lone = suspect && allKnown;
    let cls=dead?'dead':(suspect?'suspect':'');
    if(state.over && i===state.s) cls+=' suspect';
    const crown = (lone||(state.over&&i===state.s)) ? ' 👑' : '';
    html+='<tr class="'+cls+'"><td class="gname">'+(i+1)+crown+'</td>';
    TRAITS.forEach(t=>html+='<td>'+m(o[t.key])+'</td>');
    html+='</tr>';
  });
  html+='</table>';
  wrap.innerHTML=html;
}

// ---------- обвинение ----------
document.getElementById('accuseBtn').onclick=()=>{
  if(state.over) return;
  state.accusing=!state.accusing;
  document.getElementById('stage').classList.toggle('accuse',state.accusing);
  document.getElementById('accuseBtn').textContent=state.accusing?'Отмена':'Назвать S';
  hint(state.accusing?'👉 Кликни по девушке, которую считаешь S.':'Продолжай испытания.');
};
function onGirlClick(i){
  if(!state.accusing||state.over) return;
  if(i===state.s){ endGame(true,i); }
  else{
    state.attempts--;
    document.getElementById('attempts').textContent=state.attempts;
    // пометить как выбывшую
    const girlEl=document.querySelector('.girl[data-i="'+i+'"]');
    girlEl.style.opacity=.4; girlEl.style.filter='grayscale(1)';
    const b=document.createElement('div'); b.className='bubble'; b.textContent='не я!'; girlEl.appendChild(b);
    setTimeout(()=>b.remove(),1600);
    if(state.attempts<=0){ endGame(false,i); }
    else{ hint('Мимо! Это не S. Осталось попыток: '+state.attempts+'. Проверь блокнот.'); }
  }
}

function endGame(win,clicked){
  state.over=true; state.accusing=false;
  document.getElementById('stage').classList.remove('accuse');
  buildNotebook();
  const box=document.getElementById('overlayBox');
  box.className='panel box '+(win?'win':'lose');
  if(win){
    box.innerHTML=`<h2>🎉 Ты раскрыл S!</h2>
      <img src="assets/sprites/girl_portrait.png" alt="S">
      <p>S пряталась под №${state.s+1}. Ты точно сопоставил все семь примет.</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:12px">
        <button class="btn" onclick="newGame()">Сыграть ещё</button>
        <a class="btn ghost" href="index.html">В меню</a></div>`;
  }else{
    box.innerHTML=`<h2>Эх, не угадал…</h2>
      <img src="assets/sprites/gameover.webp" alt="">
      <p>Настоящая S была под <b>№${state.s+1}</b>. В блокноте видно: только у неё везде ✓.</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:12px">
        <button class="btn" onclick="newGame()">Ещё раз</button>
        <a class="btn ghost" href="index.html">В меню</a></div>`;
  }
  document.getElementById('overlay').classList.remove('hidden');
  // подсветить S
  const sEl=document.querySelector('.girl[data-i="'+state.s+'"] .sprite');
  if(sEl) sEl.style.filter='drop-shadow(0 0 12px var(--gold))';
}
function hideOverlay(){document.getElementById('overlay').classList.add('hidden');}

document.getElementById('restartBtn').onclick=newGame;

// ---------- старт ----------
buildTabs();
newGame();
