'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='movement-strength-v1';
const state={status:'idle'};
let data={version:1,prefs:{smith:0,hyper:0,rest:90,sound:true},history:[],draft:null};
let day='A',draft=null,timer=null,ticker=null,wake=null,audioContext=null,storageUsable=true;
const validNumber=(v,min,max)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max);
function validRecord(r){
  return r&&typeof r.id==='string'&&r.id.length<100&&['A','B'].includes(r.day)&&
    typeof r.started==='string'&&Number.isFinite(Date.parse(r.started))&&
    validNumber(r.painBefore,0,10)&&validNumber(r.painAfter??null,0,10)&&validNumber(r.effort??null,1,10)&&
    (!r.note||(typeof r.note==='string'&&r.note.length<=2000))&&
    (!r.recovery||['better','same','worse'].includes(r.recovery))&&
    Array.isArray(r.exercises)&&r.exercises.length>0&&r.exercises.length<=12&&r.exercises.every(e=>
      e&&typeof e.id==='string'&&typeof e.title==='string'&&e.title.length<150&&Array.isArray(e.sets)&&e.sets.length<=5&&
      e.sets.every(s=>s&&typeof s.done==='boolean'&&validNumber(s.weight,0,1000)&&validNumber(s.reps,0,500)&&validNumber(s.right??null,0,500)));
}
function validData(v){
  return v&&v.version===1&&Array.isArray(v.history)&&v.history.length<=10000&&v.history.every(validRecord)&&
    (!v.draft||validRecord(v.draft));
}
function warning(message){$('#storage-warning').textContent=message;$('#storage-warning').hidden=false;}
try{
  const raw=localStorage.getItem(KEY);
  if(raw){const parsed=JSON.parse(raw);if(!validData(parsed))throw Error('format');data=parsed;}
}catch{
  storageUsable=false;warning('Сохранение недоступно или старая запись повреждена. Она не перезаписана. Данные этого запуска останутся только на экране; скачай копию истории.');
}
data.prefs={smith:0,hyper:0,rest:90,sound:true,...data.prefs};
if(![0,1,2].includes(data.prefs.smith))data.prefs.smith=0;
if(![0,1].includes(data.prefs.hyper))data.prefs.hyper=0;
if(!Number.isInteger(data.prefs.rest)||data.prefs.rest<15||data.prefs.rest>600)data.prefs.rest=90;
function persist(){
  if(!storageUsable)return false;
  try{localStorage.setItem(KEY,JSON.stringify(data));return true;}
  catch{warning('Не удалось сохранить данные в браузере. Не закрывай занятие, пока не скачаешь копию истории.');return false;}
}
function saveDraft(){if(draft){data.draft=draft;persist();}}
function optionalNumber(input){return input.value.trim()===''?null:Number(input.value);}
function checkInputs(section){
  const invalid=[...section.querySelectorAll('input[type=number]')].find(i=>!i.checkValidity());
  if(invalid){invalid.reportValidity();return false;}return true;
}
function target(e){const n=e.sets.length;return e.seconds?'5 минут':`${n} ${n===1?'подход':'подхода'} · ${e.min===null?'повторы не заданы':e.min===e.max?e.min:e.min+'–'+e.max}${e.bilateral?' на каждую сторону':''}`;}
function plannedTarget(e){return e.seconds?'5 минут':`${e.sets} × ${e.min===null?'повторы не заданы':e.min===e.max?e.min:e.min+'–'+e.max}${e.bilateral?' на сторону':''}`;}
for(const kind of ['smith','hyper']){
  $('#'+kind+'-level').innerHTML=StrengthPlan.levels[kind].map((l,i)=>`<option value="${i}">${esc(l.label)}</option>`).join('');
  $('#'+kind+'-level').value=data.prefs[kind];
  $('#'+kind+'-level').addEventListener('change',e=>{data.prefs[kind]=Number(e.target.value);persist();renderPlan();});
}
$('#rest-setting').value=data.prefs.rest;$('#sound').checked=data.prefs.sound;
function renderPlan(){
  $('#levels-panel').hidden=day==='A';
  $('#plan-title').textContent=StrengthPlan.titles[day];
  $('#exercise-list').innerHTML=StrengthPlan.plan(day,data.prefs).map(e=>`<li><strong>${esc(e.title)}</strong><span>${esc(plannedTarget(e))}${e.addition?' · дополнение из чата':''}</span></li>`).join('');
  $('#start').textContent='Начать тренировку '+(day==='A'?'А':'Б');
  $('#resume').hidden=!data.draft;
  if(data.draft)$('#resume').textContent='Продолжить '+(data.draft.day==='A'?'А':'Б')+' · '+formatDate(data.draft.started)+(data.draft.programVersion===2?'':' · прежняя программа');
}
document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{
  day=b.dataset.day;document.querySelectorAll('[data-day]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));renderPlan();
}));
function show(view){
  if(draft&&state.status==='running')pauseSession();
  for(const v of ['plan','workout','finish','history','progress'])$('#'+v+'-view').hidden=v!==view;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===view?'page':'false'));
  if(view==='history')renderHistory();if(view==='progress')renderProgress();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.view==='plan')renderPlan();show(b.dataset.view);}));
function latest(id){
  for(const r of [...data.history].sort((a,b)=>Date.parse(b.started)-Date.parse(a.started))){
    const e=r.exercises.find(e=>e.id===id&&e.sets.some(s=>s.done));if(e)return {record:r,exercise:e};
  }return null;
}
function newSession(){
  if(!checkInputs($('#start-panel')))return;
  data.prefs.rest=Number($('#rest-setting').value);
  const exercises=StrengthPlan.plan(day,data.prefs).map(e=>{
    const previous=latest(e.id)?.exercise;
    return {...e,sets:Array.from({length:e.sets},(_,i)=>{
      const last=previous?.sets[i];const fixed=['smith','hyper'].includes(e.id);
      return {weight:fixed?e.weight:(last?.weight??e.weight),reps:fixed?e.min:(last?.reps??e.min),right:e.bilateral?(last?.right??e.min):null,done:false};
    })};
  });
  draft={id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),
    day,title:StrengthPlan.titles[day],programVersion:StrengthPlan.version,started:new Date().toISOString(),position:0,painBefore:optionalNumber($('#pain-before')),painAfter:null,effort:null,note:'',recovery:null,
    levels:{smith:data.prefs.smith,hyper:data.prefs.hyper},rest:data.prefs.rest,exercises,timer:null};
  state.status='running';saveDraft();show('workout');state.status='running';renderWorkout();requestWake();
}
$('#start').addEventListener('click',()=>{if(!checkInputs($('#start-panel')))return;if(data.draft)$('#replace-dialog').showModal();else newSession();});
$('#replace-confirm').addEventListener('click',()=>{$('#replace-dialog').close();stopTimer();newSession();});
$('#replace-cancel').addEventListener('click',()=>$('#replace-dialog').close());
$('#resume').addEventListener('click',()=>{
  draft=data.draft;draft.position=Math.max(0,Math.min(draft.exercises.length-1,Number(draft.position)||0));
  show('workout');state.status='paused';renderWorkout(true);
});
function setDescription(s,e){
  if(e.seconds)return '5 мин';
  return `${s.weight===null?'вес не отмечен':s.weight+' '+(e.weightUnit||'кг')} × ${s.reps??'?'}${e.bilateral?' / '+(s.right??'?'):''}`;
}
function renderWorkout(restore=false){
  const e=draft.exercises[draft.position];
  $('#position').textContent=`${draft.day==='A'?'А':'Б'} · ${draft.position+1} / ${draft.exercises.length}`;
  $('#exercise-tag').textContent=e.addition?'Дополнение из согласованной программы':'Согласованная программа';
  $('#exercise-title').textContent=e.title;$('#exercise-target').textContent=target(e);
  $('#exercise-note').textContent=e.note;
  const last=latest(e.id);
  $('#previous').textContent=last?'В прошлый раз · '+formatDate(last.record.started)+': '+last.exercise.sets.filter(s=>s.done).map(s=>setDescription(s,last.exercise)).join('; '):'Первое занятие: предыдущей записи пока нет.';
  $('#sets').innerHTML=e.sets.map((s,i)=>`<div class="set-row ${e.bilateral?'bilateral':''} ${s.done?'done-row':''}" data-set="${i}"><span>${i+1}</span>${e.seconds?'<p>5 минут</p><span></span>':`<label>Вес · кг<input aria-label="Вес, подход ${i+1}" data-field="weight" type="number" min="0" max="1000" step="0.25" placeholder="—" value="${s.weight??''}"></label><label>${e.bilateral?'Левая':'Повторы'}<input aria-label="Повторы${e.bilateral?', левая сторона':''}, подход ${i+1}" data-field="reps" type="number" min="1" max="500" step="1" placeholder="—" value="${s.reps??''}"></label>${e.bilateral?`<label>Правая<input aria-label="Повторы, правая сторона, подход ${i+1}" data-field="right" type="number" min="1" max="500" step="1" value="${s.right??''}"></label>`:''}` }<label class="done"><input aria-label="Выполнен подход ${i+1}" data-field="done" type="checkbox" ${s.done?'checked':''}>Готово</label></div>`).join('');
  $('#prev').disabled=draft.position===0;$('#next').textContent=draft.position===draft.exercises.length-1?'К итогу →':'Дальше →';
  const duration=e.seconds||e.rest||draft.rest;
  timer=restore&&draft.timer?{...draft.timer,running:false}:{duration,remaining:duration,running:false};
  $('#timer-label').textContent=e.seconds?'Разминка · 5 минут':'Таймер отдыха'+(e.rest?' · по схеме':'');
  $('#pause-session').textContent=state.status==='paused'?'Продолжить':'Пауза';
  renderTimer();saveDraft();
}
$('#sets').addEventListener('input',event=>{
  const input=event.target;const row=input.closest('[data-set]');if(!row||!input.dataset.field)return;
  const e=draft.exercises[draft.position],s=e.sets[Number(row.dataset.set)];
  if(input.dataset.field==='done'){
    if(input.checked&&!e.seconds){
      const required=[...row.querySelectorAll('input[type=number]')].filter(i=>i.dataset.field!=='weight');
      const missing=required.find(i=>i.value===''||!i.checkValidity());
      if(missing){input.checked=false;missing.focus();$('#notice').textContent='Укажи фактические повторы перед отметкой подхода.';return;}
    }
    if(!checkInputs(row)){input.checked=false;return;}
    s.done=input.checked;row.classList.toggle('done-row',s.done);
  }else{
    if(!input.checkValidity())return;
    s[input.dataset.field]=optionalNumber(input);
    if(s.done){s.done=false;row.querySelector('[data-field=done]').checked=false;row.classList.remove('done-row');}
  }
  $('#notice').textContent='';saveDraft();
});
async function requestWake(){try{if(navigator.wakeLock&&!document.hidden)wake=await navigator.wakeLock.request('screen');}catch{}}
function releaseWake(){if(wake){wake.release().catch(()=>{});wake=null;}}
function initAudio(){try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}}
function ding(){
  if(!data.prefs.sound)return;
  try{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.frequency.value=660;gain.gain.setValueAtTime(.15,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.4);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.4);}catch{}
}
function renderTimer(){
  $('#timer-value').textContent=String(Math.floor(timer.remaining/60)).padStart(2,'0')+':'+String(timer.remaining%60).padStart(2,'0');
  $('#timer-toggle').textContent=timer.running?'Пауза':timer.remaining===0?'Ещё раз':'Запустить';
  $('#timer-status').textContent=timer.remaining===0?'Время вышло. Отметь выполненное вручную.':timer.running?'Идёт отсчёт':state.status==='paused'?'Занятие на паузе':'Готов к запуску';
  if(draft)draft.timer={duration:timer.duration,remaining:timer.remaining,running:false};
}
function stopTimer(){if(ticker!==null){clearInterval(ticker);ticker=null;}if(timer)timer.running=false;}
function pauseTimer(){
  if(timer?.running)timer.remaining=Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));
  stopTimer();if(timer)renderTimer();saveDraft();
}
$('#timer-toggle').addEventListener('click',()=>{
  if(timer.running){pauseTimer();return;}
  state.status='running';$('#pause-session').textContent='Пауза';requestWake();initAudio();
  if(timer.remaining===0)timer.remaining=timer.duration;
  timer.deadline=Date.now()+timer.remaining*1000;timer.running=true;renderTimer();saveDraft();
  ticker=setInterval(()=>{
    timer.remaining=Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));renderTimer();
    if(timer.remaining===0){stopTimer();renderTimer();ding();saveDraft();}
  },200);
});
$('#timer-reset').addEventListener('click',()=>{stopTimer();timer.remaining=timer.duration;renderTimer();saveDraft();});
$('#sound').addEventListener('change',e=>{data.prefs.sound=e.target.checked;if(e.target.checked)initAudio();persist();});
function pauseSession(){state.status='paused';pauseTimer();releaseWake();$('#pause-session').textContent='Продолжить';}
function playToggle(){if(!draft)return;if(state.status==='running')pauseSession();else{state.status='running';$('#pause-session').textContent='Пауза';renderTimer();requestWake();}}
$('#pause-session').addEventListener('click',playToggle);
function move(offset){
  if(!checkInputs($('#sets')))return;
  pauseTimer();if(draft.position+offset>=draft.exercises.length){openFinish();return;}
  draft.position+=offset;renderWorkout();$('#exercise-title').scrollIntoView({block:'start',behavior:'smooth'});
}
$('#prev').addEventListener('click',()=>move(-1));$('#next').addEventListener('click',()=>move(1));
function openFinish(){
  if(!checkInputs($('#sets')))return;
  pauseSession();show('finish');
  const done=draft.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);
  const total=draft.exercises.reduce((n,e)=>n+e.sets.length,0);
  $('#completion-summary').textContent=`Отмечено ${done} из ${total} подходов и блоков разминки. Неотмеченное не считается выполненным.`;
  $('#pain-after').value=draft.painAfter??'';$('#effort').value=draft.effort??'';$('#session-note').value=draft.note;
}
$('#finish-open').addEventListener('click',openFinish);
for(const [id,key] of [['pain-after','painAfter'],['effort','effort'],['session-note','note']])$('#'+id).addEventListener('input',e=>{
  if(e.target.checkValidity()){draft[key]=key==='note'?e.target.value:optionalNumber(e.target);saveDraft();}
});
$('#return-workout').addEventListener('click',()=>{show('workout');renderWorkout(true);});
$('#save-session').addEventListener('click',()=>{
  if(!draft||!checkInputs($('#finish-view')))return;
  draft.painAfter=optionalNumber($('#pain-after'));draft.effort=optionalNumber($('#effort'));draft.note=$('#session-note').value;
  const record={...draft,ended:new Date().toISOString()};delete record.timer;
  const history=data.history.filter(r=>r.id!==record.id);
  data.history=[...history,record];data.draft=null;
  const saved=persist();draft=null;state.status='idle';releaseWake();renderPlan();show('history');
  $('#notice').textContent=saved?'Занятие сохранено в этом браузере.':'Занятие осталось в памяти этой вкладки. Скачай копию, прежде чем закрывать её.';
});
function formatDate(date){return new Date(date).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
const recoveryText={better:'Лучше',same:'Так же',worse:'Хуже'};
function renderHistory(){
  $('#history-list').innerHTML=[...data.history].sort((a,b)=>Date.parse(b.started)-Date.parse(a.started)).map(r=>{
    const done=r.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);
    return `<article class="history-card"><h3>${esc(r.title||(r.day==='A'?'А · Спина и ягодицы':'Б · Ноги и спина'))}</h3><p>${esc(formatDate(r.started))} · ${done} отмечено · ${r.exercises.every(e=>e.sets.every(s=>s.done))?'Полностью':'Частично'}</p><p>Боль: ${r.painBefore??'—'} → ${r.painAfter??'—'} · тяжесть: ${r.effort??'—'}</p>${r.note?`<p>${esc(r.note)}</p>`:''}<label>Следующее утро<select data-recovery="${esc(r.id)}"><option value="">Не отмечено</option>${Object.entries(recoveryText).map(([v,label])=>`<option value="${v}" ${r.recovery===v?'selected':''}>${label}</option>`).join('')}</select></label><details><summary>Записанные подходы</summary>${r.exercises.map(e=>`<p>${esc(e.title)}: ${e.sets.filter(s=>s.done).map(s=>esc(setDescription(s,e))).join('; ')||'не отмечено'}</p>`).join('')}</details></article>`;
  }).join('')||'<p>Сохранённых занятий пока нет.</p>';
}
$('#history-list').addEventListener('change',e=>{
  const id=e.target.dataset.recovery;if(!id)return;
  const record=data.history.find(r=>r.id===id);record.recovery=e.target.value||null;persist();
});
function renderProgress(){
  const selected=$('#progress-exercise').value;
  const exercises=StrengthPlan.progressExercises(data.history,data.draft);
  $('#progress-exercise').innerHTML=exercises.map(e=>`<option value="${esc(e.id)}">${esc(e.title)}</option>`).join('');
  if(exercises.some(e=>e.id===selected))$('#progress-exercise').value=selected;
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  const week=new Date(today+'T00:00:00+03:00');
  const weekday=new Date(today+'T12:00:00Z').getUTCDay();week.setUTCDate(week.getUTCDate()-((weekday+6)%7));
  const count=data.history.filter(r=>Date.parse(r.started)>=week.getTime()&&Date.parse(r.started)<week.getTime()+7*86400000&&r.exercises.some(e=>e.sets.some(s=>s.done))).length;
  $('#weekly-count').textContent=`Занятий с отмеченными подходами на этой неделе: ${count} · план 2 занятия: А и Б.`;
  const id=$('#progress-exercise').value;
  $('#progress-rows').innerHTML=[...data.history].sort((a,b)=>Date.parse(a.started)-Date.parse(b.started)).map(r=>{
    const e=r.exercises.find(e=>e.id===id);if(!e||!e.sets.some(s=>s.done))return '';
    return `<tr><td>${esc(formatDate(r.started))}</td><td>${e.sets.filter(s=>s.done).map(s=>esc(setDescription(s,e))).join('<br>')}</td><td>${r.painBefore??'—'} → ${r.painAfter??'—'}</td><td>${recoveryText[r.recovery]||'—'}</td></tr>`;
  }).join('')||'<tr><td colspan="4">Пока нет выполненных подходов этого упражнения.</td></tr>';
}
$('#progress-exercise').addEventListener('change',renderProgress);
$('#export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='movement-history-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('#import').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>5*1024*1024)throw Error('size');
    const imported=JSON.parse(await file.text());if(!validData(imported))throw Error('format');
    const existing=new Set(data.history.map(r=>r.id));const added=imported.history.filter(r=>{if(existing.has(r.id))return false;existing.add(r.id);return true;});
    data.history.push(...added);
    // A backup can restore a draft only when this browser has no active draft.
    if(!data.draft&&imported.draft)data.draft=imported.draft;
    const saved=persist();renderHistory();renderPlan();$('#notice').textContent=`Добавлено занятий: ${added.length}. `+(saved?'Копия восстановлена.':'Данные только в памяти вкладки.');
  }catch{$('#notice').textContent='Не удалось прочитать копию. Нужен JSON, скачанный из этого приложения. История не изменена.';}
  event.target.value='';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&draft)pauseSession();});
window.addEventListener('pagehide',()=>{if(draft)pauseSession();});
window.movementPlayer={state,playToggle,unlock:()=>{if(draft)pauseSession();else releaseWake();},preservesDraft:true};
renderPlan();
