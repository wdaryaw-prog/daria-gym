'use strict';
const $=s=>document.querySelector(s);
const model=window.PelvicPlan;
let built=model.build(),timer=new model.Timer(built.plan),sound=true,audio=null,wake=null,wakePending=null,last=performance.now(),lastSeg=-1,lastSecond=-1,lastExercise='',stopResume=false;
const illustrations={
  squeeze:{src:'assets/pelvic-squeeze-v1.png',alt:'Лёжа на спине с согнутыми ногами: мяч зажат между внутренними поверхностями бёдер, выше коленей.'},
  clam:{src:'assets/pelvic-clam-v1.png',alt:'Лёжа на боку: согнутые ноги, стопы вместе, верхнее колено раскрывается при неподвижном тазе.'},
  lift:{src:'assets/pelvic-lift-v1.png',alt:'Лёжа на боку: верхняя согнутая нога приподнята целиком, стопа и бедро движутся вместе.'},
  plank:{src:'assets/pelvic-plank-v1.png',alt:'Боковая планка с опорой на предплечье и согнутую нижнюю ногу: таз поднят, плечо над локтем.'}
};
function artwork(id){const item=illustrations[id];return '<img src="'+item.src+'" alt="'+item.alt+'">';}
function settings(){return Object.fromEntries([...document.querySelectorAll('select[name]')].map(el=>[el.name,Number(el.value)]));}
function fmt(seconds){return Math.floor(seconds/60)+':'+String(Math.ceil(seconds%60)).padStart(2,'0');}
function updateDuration(){built=model.build(settings());$('#duration').textContent='Эта часть · '+fmt(built.total)+' вместе с выбранными паузами';}
$('#exercise-list').innerHTML=model.exercises.map((ex,i)=>`<li><span class="num">0${i+1}</span><button data-info="${ex.id}"><h2>${ex.title}</h2><p>${ex.dose}</p></button></li>`).join('');
document.querySelectorAll('select[name]').forEach(el=>el.addEventListener('change',updateDuration));
updateDuration();
function initAudio(){try{const A=window.AudioContext||window.webkitAudioContext;if(A&&!audio)audio=new A();if(audio&&audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function beep(freq=740,duration=.15,delay=0){
  if(!sound||!audio)return;
  try{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.13,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.02);}catch{}
}
function signal(p){
  if(p.cue==='side'){beep(784,.13);beep(587,.22,.16);}
  else if(p.cue==='exercise'){beep(523,.13);beep(659,.13,.14);beep(880,.25,.28);}
  else if(p.label.startsWith('Опусти'))beep(520,.1);
  else if(p.kind==='work'&&!p.label.startsWith('Пауза'))beep(780,.13);
  else if(p.ex==='squeeze'&&p.kind==='rest')beep(520,.15);
}
async function lock(){
  if(wake||wakePending||timer.state.status!=='running'||document.hidden)return;
  try{if(navigator.wakeLock){wakePending=navigator.wakeLock.request('screen');wake=await wakePending;if(timer.state.status!=='running'||document.hidden)unlock();}}
  catch{}finally{wakePending=null;}
}
function unlock(){if(wake){const old=wake;wake=null;old.release().catch(()=>{});}}
function showScreen(name){for(const id of ['setup','workout','done'])$('#'+id).hidden=id!==name;}
function start(){
  initAudio();built=model.build(settings());timer=new model.Timer(built.plan);timer.start();last=performance.now();lastSeg=-1;lastSecond=-1;lastExercise='';showScreen('workout');lock();render(true);$('#pause').focus();
}
function toggle(){
  initAudio();timer.toggle();last=performance.now();timer.state.status==='running'?lock():unlock();render();
}
function finish(){unlock();showScreen('done');beep(784,.2);beep(988,.2,.23);beep(1319,.4,.46);$('#again').focus();}
function render(entered=false){
  const state=timer.state,p=built.plan[state.seg],ex=model.exercises.find(ex=>ex.id===p.ex);
  if(state.status==='done'){finish();return;}
  if(p.ex!==lastExercise){
    lastExercise=p.ex;$('#illustration').innerHTML=artwork(p.ex);$('#exercise-tag').textContent=`Тазовое дно · ${model.exercises.indexOf(ex)+1} из 4`;
    $('#exercise-title').textContent=ex.title;$('#exercise-dose').textContent=ex.dose;
    $('#steps').replaceChildren(...ex.steps.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
    $('#exercise-note').textContent=ex.note;
  }
  $('#side').textContent=p.side;
  const paused=state.status==='paused';
  $('#pause').textContent=paused?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',paused?'Продолжить':'Пауза');
  $('#phase').textContent=paused?'Пауза':({prep:'Подготовка',transition:'Переход',work:'Движение',rest:'Отдых'})[p.kind];
  $('#cue').textContent=p.label;$('#repetition').textContent=p.count;$('#hint').textContent=p.hint;
  $('#seconds').textContent=Math.max(0,Math.ceil(state.left/1000));
  $('#timer-ring').style.setProperty('--angle',String(Math.max(0,360*state.left/(p.dur*1000)))+'deg');
  const elapsed=built.plan.slice(0,state.seg).reduce((s,p)=>s+p.dur,0)+p.dur-state.left/1000;
  $('#progress-label').textContent=`Первая часть · осталось ${fmt(Math.max(0,built.total-elapsed))}`;
  $('#progress-fill').style.width=String(Math.min(100,100*elapsed/built.total))+'%';
  if(entered||state.seg!==lastSeg){
    lastSeg=state.seg;lastSecond=-1;if(!paused)signal(p);
    // Announce phase changes, not every second of the countdown.
    $('#announcer').textContent=[ex.title,p.side,p.label,p.count].filter(Boolean).join('. ');
  }
}
function tick(){
  const now=performance.now(),dt=now-last;last=now;
  if(timer.state.status!=='running')return;
  if(dt>2500||document.hidden){timer.toggle();unlock();render();return;}
  const entered=timer.advance(dt);render(entered);
  if(timer.state.status!=='running')return;
  const p=built.plan[timer.state.seg],sec=Math.ceil(timer.state.left/1000);
  if(sec!==lastSecond){lastSecond=sec;if(sec>0&&sec<=3&&p.ex==='plank'&&p.kind==='work')beep(760,.08);}
}
function seek(direction){
  if(!['running','paused'].includes(timer.state.status))return;
  const current=built.plan[timer.state.seg],key=p=>p.ex+'|'+p.side;
  const blocks=[];built.plan.forEach((p,i)=>{if(i===0||key(p)!==key(built.plan[i-1]))blocks.push(i);});
  let n=blocks.findIndex((s,i)=>timer.state.seg>=s&&(i===blocks.length-1||timer.state.seg<blocks[i+1]));
  if(direction<0&&timer.state.seg>blocks[n]){}else n+=direction;
  n=Math.max(0,Math.min(blocks.length-1,n));timer.seek(blocks[n]);last=performance.now();render(true);
}
function source(id,raw=true){
  const ex=model.exercises.find(e=>e.id===id);$('#source-title').textContent=ex.title;
  $('#source-text').textContent=raw?ex.source+'\n\n'+(window.PELVIC_SOURCES||{})[ex.source]:ex.steps.join('\n\n')+'\n\n'+ex.note+'\n\nИсточник: '+ex.source;
  const running=timer.state.status==='running';if(running)toggle();
  $('#source-dialog').showModal();
}
$('#exercise-list').addEventListener('click',e=>{const button=e.target.closest('[data-info]');if(button)source(button.dataset.info,false);});
$('#source').addEventListener('click',()=>source(built.plan[timer.state.seg].ex));
$('#source-close').addEventListener('click',()=>$('#source-dialog').close());
$('#start').addEventListener('click',start);$('#pause').addEventListener('click',toggle);
$('#prev').addEventListener('click',()=>seek(-1));$('#next').addEventListener('click',()=>seek(1));
$('#again').addEventListener('click',()=>{timer=new model.Timer(built.plan);showScreen('setup');$('#start').focus();});
document.querySelectorAll('.sound-toggle').forEach(el=>el.addEventListener('click',()=>{initAudio();sound=!sound;document.querySelectorAll('.sound-toggle').forEach(el=>{el.textContent=sound?'Звук включён':'Звук выключен';el.setAttribute('aria-pressed',String(sound));});if(sound)beep();}));
$('#stop').addEventListener('click',()=>{stopResume=timer.state.status==='running';if(stopResume)toggle();$('#stop-dialog').showModal();});
function keep(){ $('#stop-dialog').close();if(stopResume&&timer.state.status==='paused')toggle();stopResume=false; }
$('#keep').addEventListener('click',keep);$('#stop-dialog').addEventListener('cancel',e=>{e.preventDefault();keep();});
$('#reset').addEventListener('click',()=>{$('#stop-dialog').close();unlock();timer=new model.Timer(built.plan);showScreen('setup');$('#start').focus();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&timer.state.status==='running'){timer.toggle();unlock();render();}});
window.addEventListener('pagehide',()=>{unlock();if(audio)audio.close().catch(()=>{});});
window.movementPlayer={get state(){return timer.state;},playToggle:toggle,unlock};
setInterval(tick,100);
