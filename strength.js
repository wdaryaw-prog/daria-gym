'use strict';
const $=s=>document.querySelector(s),Core=StrengthCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store=new StrengthStore(),cloud=new StrengthCloud(store),state={status:'idle'};
let day='A',draft=null,saving=Promise.resolve();
const records=()=>store.list(cloud.userId);
const n=input=>input.value.trim()===''?null:Number(input.value);
const fmt=date=>new Date(date).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
function valid(section){const bad=[...section.querySelectorAll('input[type=number]')].find(i=>!i.checkValidity());if(bad){bad.reportValidity();return false;}return true;}
function notify(text){$('#notice').textContent=text;}
function status(){
  $('#save-status').textContent=cloud.userId?cloud.status:(store.error||'Автосохранение на этом устройстве · войди для общей истории');
  $('#cloud-status').textContent=cloud.status;
  $('#storage-warning').hidden=!store.error;if(store.error)$('#storage-warning').textContent=store.error;
  $('#auth-form').hidden=!!cloud.userId;$('#auth-connected').hidden=!cloud.userId;$('#auth-name').textContent=cloud.session?.user?.email||'';
  $('#auth-send').disabled=!cloud.configured;$('#auth-verify').disabled=!cloud.configured;
  $('#cloud-import').hidden=!cloud.userId||![...store.records.values()].some(r=>!r.ownerId);
}
function persist(){
  if(!draft)return Promise.resolve();
  const record=JSON.parse(JSON.stringify(draft));
  saving=saving.catch(()=>{}).then(async()=>{await store.put(record);cloud.schedule();}).catch(e=>{notify('Не удалось сохранить: '+e.message);});return saving;
}
function show(view){
  for(const v of ['plan','workout','finish','history','progress'])$('#'+v+'-view').hidden=v!==view;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===view?'page':'false'));
  if(view==='plan')renderPlan();if(view==='history')renderHistory();if(view==='progress')renderProgress();
}
function dosage(e){return `3 × ${e.min===e.max?e.min:e.min+'–'+e.max}${e.bilateral?' на сторону':''}`;}
function renderPlan(){
  $('#plan-title').textContent=StrengthPlan.titles[day];
  $('#exercise-list').innerHTML=StrengthPlan.plan(day,store.prefs).map(e=>`<li><strong>${esc(e.title)}</strong><span>${dosage(e)}${e.weightMode==='band'?' · '+esc(e.loadText):e.weightMode==='assistance'?' · помощь 55–60 кг':e.weight!=null&&e.weight!==0?' · ориентир '+e.weight+' '+esc(e.weightUnit||'кг'):''}</span></li>`).join('');
  $('#start').textContent='Начать тренировку '+(day==='A'?'А':'Б');
  const active=records().find(r=>r.status==='active');$('#resume').hidden=!active;if(active){$('#resume').dataset.id=active.id;$('#resume').textContent='Продолжить '+active.day+' · '+fmt(active.started);}
}
function setDescription(s,e){if(e.seconds)return 'разминка';return `${e.weightMode==='band'?e.loadText:s.weight===null?'вес не указан':s.weight+' '+(e.weightUnit||'кг')} × ${s.reps??'—'}${e.bilateral?' / '+(s.right??'—'):''}`;}
function latest(id){for(const r of records()){if(draft&&r.id===draft.id)continue;const e=r.exercises.find(e=>e.id===id&&e.sets.some(s=>Core.setDone(s,e,r)));if(e)return {r,e};}return null;}
function renderWorkout(){
  const e=draft.exercises[draft.position];
  $('#position').textContent=`${draft.day} · ${draft.position+1} / ${draft.exercises.length}`;
  $('#exercise-tag').textContent=e.source==='trainer'?'Из записи тренера':'Твоя программа';$('#exercise-title').textContent=e.title;
  const known=StrengthPlan.catalogue(store.prefs)[e.id];const tile=e.image??known?.image;
  $('#exercise-art').hidden=tile===undefined;$('#exercise-art').dataset.exercise=e.id;
  if(tile!==undefined){$('#exercise-art').style.backgroundPosition=`${(tile%4)*100/3}% ${Math.floor(tile/4)*100/3}%`;$('#exercise-art').setAttribute('aria-label','Схема: '+e.title);}
  $('#exercise-target').textContent=`${e.sets.length} подхода · ${e.min===e.max?e.min:e.min+'–'+e.max}${e.bilateral?' на каждую сторону':''}`;
  $('#exercise-note').textContent=e.note||'';
  const previous=latest(e.id);$('#previous').textContent=previous?'В прошлый раз · '+fmt(previous.r.started)+': '+previous.e.sets.filter(s=>Core.setDone(s,previous.e,previous.r)).map(s=>setDescription(s,previous.e)).join('; '):'Предыдущей записи этого упражнения пока нет.';
  $('#load-note').textContent=e.weightMode==='band'?e.loadText:e.weightMode==='assistance'?'В поле — килограммы ПОМОЩИ.':e.weightMode==='body'?'0 кг — собственный вес.':e.weightUnit==='кг/гантель'?'В поле — вес ОДНОЙ гантели.':'В поле — фактический вес на этом тренажёре.';
  $('#sets').innerHTML=e.sets.map((s,i)=>`<div class="set-row ${e.bilateral?'bilateral':''}" data-set="${i}"><span>${i+1}</span>${e.weightMode==='band'?`<span class="band-label">${esc(e.loadText)}</span>`:`<label>${e.weightMode==='assistance'?'Помощь · кг':e.weightUnit==='кг/гантель'?'Одна гантель · кг':'Вес · кг'}<input aria-label="Вес, подход ${i+1}" data-field="weight" type="number" min="0" max="1000" step="0.25" placeholder="${esc(e.weightHint??e.weight??'—')}" value="${s.weight??''}"></label>`}<label>${e.bilateral?'Левая':'Повторы'}<input aria-label="Повторы${e.bilateral?', левая сторона':''}, подход ${i+1}" data-field="reps" type="number" min="1" max="500" step="1" placeholder="${esc(e.min??'—')}" value="${s.reps??''}"></label>${e.bilateral?`<label>Правая<input aria-label="Повторы, правая сторона, подход ${i+1}" data-field="right" type="number" min="1" max="500" step="1" placeholder="${esc(e.min??'—')}" value="${s.right??''}"></label>`:''}</div>`).join('');
  $('#prev').disabled=draft.position===0;$('#next').textContent=draft.position===draft.exercises.length-1?'К итогу →':'Дальше →';$('#skip').textContent=e.skipped?'Вернуть упражнение':'Пропустить это упражнение';renderExerciseStatus();
}
function renderExerciseStatus(){const e=draft.exercises[draft.position];const count=e.sets.filter(s=>Core.setDone(s,e,draft)).length;$('#exercise-status').textContent=e.skipped?'Пропущено. Введённые значения сохранены.':`Записано подходов: ${count} из ${e.sets.length}`;}
function focusExercise(){window.scrollTo({top:Math.max(0,$('#workout-view').offsetTop-12),behavior:'instant'});}
function start(){
  if(!valid($('#start-panel')))return;draft=Core.createSession(day,store.prefs);draft.ownerId=cloud.userId;draft.painBefore=n($('#pain-before'));state.status='running';persist();show('workout');renderWorkout();focusExercise();notify('');
}
function resume(id){const record=store.records.get(id);if(!record||!records().some(r=>r.id===id))return;draft=JSON.parse(JSON.stringify(record));draft.exercises=draft.exercises.filter(e=>!e.seconds&&e.id!=='squat-warmup');draft.position=Math.max(0,Math.min(draft.exercises.length-1,draft.position||0));state.status='running';show('workout');renderWorkout();focusExercise();}
function move(offset){if(!valid($('#sets')))return;draft.position=Math.max(0,draft.position+offset);if(draft.position>=draft.exercises.length){draft.position=draft.exercises.length-1;openFinish();return;}persist();renderWorkout();focusExercise();}
function openFinish(){if(!valid($('#sets')))return;show('finish');const s=Core.stats(draft);$('#completion-summary').textContent=`Подходов записано: ${s.sets}. Упражнений с записью: ${s.exercises}. Пропущено: ${s.skipped}.`;$('#pain-after').value=draft.painAfter??'';$('#effort').value=draft.effort??'';$('#session-note').value=draft.note||'';persist();}
function skip(){const e=draft.exercises[draft.position];e.skipped=true;persist();move(1);}
$('#sets').addEventListener('input',event=>{
  const input=event.target,row=input.closest('[data-set]');if(!row||!input.dataset.field)return;
  const e=draft.exercises[draft.position],s=e.sets[Number(row.dataset.set)];
  // Invalid visible edits clear the persisted field instead of leaving an older valid number marked done.
  s[input.dataset.field]=input.checkValidity()?n(input):null;e.skipped=false;if((draft.programVersion||1)<3)s.done=Number.isInteger(s.reps)&&s.reps>0&&(!e.bilateral||(Number.isInteger(s.right)&&s.right>0))&&typeof s.weight==='number';renderExerciseStatus();persist();
});
$('#start').addEventListener('click',start);$('#resume').addEventListener('click',e=>resume(e.target.dataset.id));
$('#prev').addEventListener('click',()=>move(-1));$('#next').addEventListener('click',()=>move(1));$('#finish-open').addEventListener('click',openFinish);
$('#skip').addEventListener('click',()=>{const e=draft.exercises[draft.position];if(e.skipped){e.skipped=false;persist();renderWorkout();}else if(e.sets.some(s=>Core.setDone(s,e,draft)))$('#skip-dialog').showModal();else skip();});
$('#skip-confirm').addEventListener('click',()=>{$('#skip-dialog').close();skip();});$('#skip-cancel').addEventListener('click',()=>$('#skip-dialog').close());
$('#return-workout').addEventListener('click',()=>{show('workout');renderWorkout();focusExercise();});
for(const [id,key] of [['pain-after','painAfter'],['effort','effort'],['session-note','note']])$('#'+id).addEventListener('input',event=>{draft[key]=key==='note'?event.target.value:(event.target.checkValidity()?n(event.target):null);persist();});
$('#save-session').addEventListener('click',async()=>{if(!draft||!valid($('#finish-view')))return;$('#save-session').disabled=true;draft.status='finished';draft.ended=new Date().toISOString();await persist();draft=null;state.status='idle';$('#save-session').disabled=false;show('history');notify('Тренировка завершена. '+cloud.status);});
document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{day=b.dataset.day;document.querySelectorAll('[data-day]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));renderPlan();}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
function renderHistory(){
  $('#history-storage').textContent=cloud.userId?cloud.status:'На этом устройстве доступны локальные записи. Войди, чтобы увидеть общую историю.';
  $('#history-list').innerHTML=records().map(r=>{const s=Core.stats(r);return `<article class="history-card"><h3>${esc(r.title||r.day)}</h3><p>${esc(fmt(r.started))} · подходов: ${s.sets} · ${r.status==='active'?'Незавершённое занятие':'Завершено'}</p><p>Боль: ${r.painBefore??'—'} → ${r.painAfter??'—'} · тяжесть: ${r.effort??'—'}</p>${r.note?`<p>${esc(r.note)}</p>`:''}${r.status==='active'?`<button data-resume="${esc(r.id)}">Продолжить</button>`:''}<label>Следующее утро<select data-recovery="${esc(r.id)}"><option value="">Не отмечено</option>${Object.entries({better:'Лучше',same:'Так же',worse:'Хуже'}).map(([v,label])=>`<option value="${v}" ${r.recovery===v?'selected':''}>${label}</option>`).join('')}</select></label><details><summary>Упражнения</summary>${r.exercises.filter(e=>!e.seconds).map(e=>`<p>${esc(e.title)}: ${e.skipped?'пропущено · ':''}${e.sets.filter(s=>Core.setDone(s,e,r)).map(s=>esc(setDescription(s,e))).join('; ')||((r.programVersion||1)<3?e.sets.filter(s=>s.reps!=null||s.weight!=null).map(s=>esc(setDescription(s,e))+' (без подтверждения в старой версии)').join('; '):'подходы не записаны')}</p>`).join('')}</details></article>`;}).join('')||'<p>На этом устройстве записи не найдены. Посмотри подсказку выше: прежняя история могла остаться в другом браузере.</p>';
}
$('#history-list').addEventListener('click',e=>{const b=e.target.closest('[data-resume]');if(b)resume(b.dataset.resume);});
$('#history-list').addEventListener('change',async e=>{const id=e.target.dataset.recovery;if(!id)return;const r=store.records.get(id);await store.put({...r,recovery:e.target.value||null});cloud.schedule();});
function renderProgress(){
  const selected=$('#progress-exercise').value,all=records(),exercises=StrengthPlan.progressExercises(all);
  $('#progress-exercise').innerHTML=exercises.map(e=>`<option value="${esc(e.id)}">${esc(e.title)}</option>`).join('');if(exercises.some(e=>e.id===selected))$('#progress-exercise').value=selected;
  const id=$('#progress-exercise').value,today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'}),week=new Date(today+'T00:00:00+03:00'),weekday=new Date(today+'T12:00:00Z').getUTCDay();week.setUTCDate(week.getUTCDate()-((weekday+6)%7));
  const count=all.filter(r=>Date.parse(r.started)>=week.getTime()&&Date.parse(r.started)<week.getTime()+7*86400000&&Core.stats(r).sets>0).length;$('#weekly-count').textContent=`На этой неделе занятий с записанными подходами: ${count}.`;
  $('#progress-rows').innerHTML=[...all].reverse().map(r=>{const e=r.exercises.find(e=>e.id===id);if(!e||!e.sets.some(s=>Core.setDone(s,e,r)))return '';return `<tr><td>${esc(fmt(r.started))}</td><td>${e.sets.filter(s=>Core.setDone(s,e,r)).map(s=>esc(setDescription(s,e))).join('<br>')}</td><td>${r.painBefore??'—'} → ${r.painAfter??'—'}</td><td>${({better:'Лучше',same:'Так же',worse:'Хуже'})[r.recovery]||'—'}</td></tr>`;}).join('')||'<tr><td colspan="4">Подходов этого упражнения пока нет.</td></tr>';
}
$('#progress-exercise').addEventListener('change',renderProgress);
$('#export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(store.export(),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='movement-history-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);});
$('#import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('Слишком большая копия');const count=await store.importBackup(JSON.parse(await file.text()));renderHistory();renderPlan();notify('Восстановлено записей: '+count+'. Существующие записи сохранены.');}catch(e){notify('Копия не восстановлена: '+e.message);}event.target.value='';});
$('#account-open').addEventListener('click',()=>{status();$('#account-dialog').showModal();});$('#account-close').addEventListener('click',()=>$('#account-dialog').close());
$('#auth-send').addEventListener('click',async()=>{const email=$('#auth-email');if(!email.value||!email.reportValidity())return;$('#auth-send').disabled=true;try{const base=location.protocol==='about:'?parent.location.href:location.href;if(!/^https?:/.test(base))throw Error('Для входа открой тренажёр по постоянной HTTPS-ссылке.');const redirect=new URL('strength.html',base).href;await cloud.sendLink(email.value.trim(),redirect);}catch(e){$('#cloud-status').textContent=e.message;}finally{$('#auth-send').disabled=!cloud.configured;}});
$('#auth-verify').addEventListener('click',async()=>{try{await cloud.verify($('#auth-email').value.trim(),$('#auth-code').value.trim());status();renderPlan();renderHistory();}catch(e){$('#cloud-status').textContent=e.message;}});
$('#cloud-sync').addEventListener('click',()=>cloud.sync());$('#cloud-import').addEventListener('click',async()=>{await store.attachUnbound(cloud.userId);await cloud.sync();renderPlan();renderHistory();});
$('#auth-out').addEventListener('click',()=>{if(draft){persist();draft=null;state.status='idle';}cloud.signOut();show('plan');});
cloud.onChange(()=>{status();if(!$('#history-view').hidden)renderHistory();if(!$('#progress-view').hidden)renderProgress();});store.onChange(status);
window.addEventListener('pagehide',()=>{if(draft)persist();});
window.movementPlayer={state,preservesDraft:true,playToggle:()=>{state.status=state.status==='running'?'paused':'running';},unlock:()=>{if(draft)persist();}};
(async()=>{await store.ready;for(const kind of ['smith','hyper']){const select=$('#'+kind+'-level');select.innerHTML=StrengthPlan.levels[kind].map((l,i)=>`<option value="${i}">${esc(l.label)}</option>`).join('');select.value=store.prefs[kind]||0;select.addEventListener('change',()=>{store.prefs[kind]=Number(select.value);store.savePrefs();renderPlan();});}
for(const [id,key,fallback] of [['pull-variant','pullA','gravitron'],['glute-variant','gluteA','kickback']]){const select=$('#'+id);select.value=store.prefs.variants?.[key]||fallback;select.addEventListener('change',()=>{store.prefs.variants={...store.prefs.variants,[key]:select.value};store.savePrefs();renderPlan();});}
await cloud.captureCallback();$('#start').disabled=false;renderPlan();status();await cloud.sync();renderPlan();})();
