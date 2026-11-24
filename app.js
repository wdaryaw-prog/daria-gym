'use strict';
const icons = {
  neck:'<path d="M14 4c-6 0-6 8-2 9v5m3-13c5 1 5 8 1 10v3m-9 6c0-5 4-6 5-6m4 0c3 1 5 3 5 6M9 7l-3 3 3 3"/>',
  back:'<circle cx="14" cy="5" r="2.5"/><path d="M14 9c-5 2 4 7 0 10m-5 5 5-5 5 5M9 12l-5 4m15-4 5 4"/>',
  ankle:'<path d="M11 4v11l-4 6c-1 2 1 3 3 3h10c3 0 3-3 0-3l-4-2V4m-9 8-3 3 3 3"/>',
  pelvic:'<path d="M9 4c2 5 1 8-2 11-3 4 0 9 4 9l3-5 3 5c4 0 7-5 4-9-3-3-4-6-2-11M8 15c4 3 8 3 12 0"/>',
  strength:'<path d="M5 8v12m4-14v16m10-16v16m4-14v12M9 14h10M3 11v6m22-6v6"/>',
  cardio:'<path d="M2 14h5l3-8 5 16 4-11 3 3h4"/>'
};
const complexes = [
  {id:'neck',title:'Растяжка шеи',description:'Повороты, сопротивление и мягкая растяжка.',ready:true,meta:'7 упражнений',detail:''},
  {id:'back',title:'ЛФК спины',description:'Домашний комплекс физического терапевта.',meta:'Около 20 минут',detail:'В переписке сохранён план комплекса на 20 минут. Для интерактивной версии нужны последовательность упражнений, техника и тайминги из видео или его расшифровки.'},
  {id:'ankle',title:'Голеностоп',description:'Два комплекса, объединённые в один.',meta:'Около 15 минут',detail:'В плане объединены упражнения ортопеда и физического терапевта, всего около 15 минут. Для сборки нужны сами упражнения, количество повторов и подходов.'},
  {id:'pelvic',title:'Тазовое дно',description:'Мяч, два движения на боку и боковая планка.',ready:true,partial:true,meta:'4 упражнения · первая часть',detail:''},
  {id:'strength',title:'Силовые А / Б',description:'Три подхода, картинки тренажёров и автосохранение.',ready:true,meta:'А / Б · 2 раза в неделю',detail:''},
  {id:'cardio',title:'Кардио',description:'Разминка перед силовой тренировкой.',meta:'Стартовый план · 7 мин',detail:'В августовском плане старт — одна сессия по 7 минут перед каждой из двух силовых тренировок. Это историческая точка старта. Перед созданием таймера нужно уточнить твою текущую длительность и вид нагрузки.'}
];
const library = document.querySelector('#library');
const session = document.querySelector('#session');
const player = document.querySelector('#player');
const details = document.querySelector('#details');
const exitDialog = document.querySelector('#exit');
let lastFocus,scrollPosition=0,resumeOnStay=false;
function renderCards(filter='all'){
  document.querySelector('#cards').innerHTML=complexes.filter(c=>filter==='all'||c.ready).map(c=>`<button class="card ${c.ready?'ready':'pending'}" data-id="${c.id}" aria-label="${c.ready?'Открыть':'Что нужно для комплекса'}: ${c.title}"><div class="card-top"><span class="card-icon" aria-hidden="true"><svg viewBox="0 0 28 28">${icons[c.id]}</svg></span><span class="status">${c.partial?'Первая часть':c.ready?'Готово':'Ещё не добавлен'}</span></div><h3>${c.title}</h3><p>${c.description}</p><div class="card-bottom"><span>${c.meta}</span><span aria-hidden="true">${c.ready?'↗':'+'}</span></div></button>`).join('');
}
renderCards();
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  renderCards(button.dataset.filter);
}));
function showDetails(c){
  document.querySelector('#detail-tag').textContent='Ещё не добавлен';
  document.querySelector('#detail-title').textContent=c.title;
  document.querySelector('#detail-text').textContent=c.detail;
  document.querySelector('#detail-extra').textContent='Основа карточки — переписка от августа–октября 2026 года. Расписание и длительность здесь пока не являются подтверждением текущей программы.';
  details.showModal();
}
document.querySelector('#cards').addEventListener('click',e=>{
  const card=e.target.closest('[data-id]');if(!card)return;
  const c=complexes.find(c=>c.id===card.dataset.id);c.ready?openSession(c):showDetails(c);
});
document.querySelectorAll('.start-neck').forEach(b=>b.addEventListener('click',()=>openSession(complexes.find(c=>c.id==='neck'))));
function openSession(c){
  lastFocus=document.activeElement;scrollPosition=window.scrollY;
  library.hidden=true;session.hidden=false;document.body.classList.add('in-session');
  document.querySelector('#session-title').textContent=c.title;
  document.querySelector('.session-badge').textContent=c.partial?'Первая часть':'Твой комплекс';
  player.title='Интерактивный комплекс: '+c.title;
  if(window.MOVEMENT_DOCUMENTS)player.srcdoc=window.MOVEMENT_DOCUMENTS[c.id];else player.src=c.id+'.html';
  document.querySelector('#back').focus();
}
function getPlayer(){try{return player.contentWindow.movementPlayer;}catch{return null;}}
function leaveSession(){
  const p=getPlayer();if(p)p.unlock();
  player.removeAttribute('srcdoc');player.src='about:blank';session.hidden=true;library.hidden=false;document.body.classList.remove('in-session');
  window.scrollTo(0,scrollPosition);if(lastFocus)lastFocus.focus({preventScroll:true});
}
document.querySelector('#back').addEventListener('click',()=>{
  const p=getPlayer();
  if(p&&['running','paused'].includes(p.state.status)){
    resumeOnStay=p.state.status==='running';if(resumeOnStay)p.playToggle();
    document.querySelector('#exit-copy').textContent=p.preservesDraft?'Незавершённое занятие сохранено в этом браузере. Его можно продолжить из раздела «Силовые».':'Текущий отсчёт сбросится. Если хочешь продолжить, останься на тренировке.';
    exitDialog.showModal();
  }else leaveSession();
});
function stay(){exitDialog.close();const p=getPlayer();if(resumeOnStay&&p&&p.state.status==='paused')p.playToggle();resumeOnStay=false;}
document.querySelector('#stay').addEventListener('click',stay);
exitDialog.addEventListener('cancel',e=>{e.preventDefault();stay();});
document.querySelector('#leave').addEventListener('click',()=>{resumeOnStay=false;exitDialog.close();leaveSession();});
details.querySelectorAll('.close,.close-detail').forEach(b=>b.addEventListener('click',()=>details.close()));
document.querySelector('.about-trigger').addEventListener('click',()=>{
  document.querySelector('#detail-tag').textContent='Личная библиотека';
  document.querySelector('#detail-title').textContent='Твои комплексы. Один экран.';
  document.querySelector('#detail-text').textContent='В шее и тазовом дне карточки и отсчёт переключаются автоматически. В силовых достаточно внести фактические вес и повторы: запись сохраняется автоматически. Есть картинки и пропуск упражнения. В шее и тазовом дне сохранены таймеры и звуки. При уходе в другую вкладку тренировка встаёт на паузу.';
  document.querySelector('#detail-extra').textContent='Доступны шея, первая часть комплекса тазового дна и силовые А/Б. В силовых три подхода, картинки оборудования, ввод веса и повторов без чекбоксов. Данные сохраняются автоматически; после входа доступна общая база. История включает незавершённые занятия. Копию можно скачать и восстановить. Ещё три комплекса ждут материалов. На iPhone: Safari → «Поделиться» → «На экран Домой». Первый запуск нужен с интернетом. Офлайн-доступ готов после подтверждения внизу библиотеки.';
  details.showModal();
});
document.querySelectorAll('[data-neck-duration]').forEach(el=>el.textContent='около 19 мин');
const offlineStatus=document.querySelector('#offline-status');
if(window.MOVEMENT_DOCUMENTS){
  if(offlineStatus)offlineStatus.textContent='Самостоятельный файл содержит три комплекса. Для установки на телефон нужна версия приложения по HTTPS-ссылке. Для надёжного хранения истории силовых используй одну постоянную ссылку и скачивай копию.';
}else if('serviceWorker'in navigator && /^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').then(async registration=>{
    await navigator.serviceWorker.ready;
    if(offlineStatus)offlineStatus.textContent='Готово для открытия без интернета на этом устройстве.';
    // A new cache is activated on the next launch, after all old windows close.
    registration.addEventListener('updatefound',()=>{
      const next=registration.installing;
      if(next)next.addEventListener('statechange',()=>{
        if(next.state==='installed'&&navigator.serviceWorker.controller&&offlineStatus)
          offlineStatus.textContent='Обновление загружено. Закрой все окна приложения и открой его снова.';
      });
    });
  }).catch(()=>{if(offlineStatus)offlineStatus.textContent='Офлайн-копия пока не загружена. Открой приложение ещё раз с интернетом.';});
}else if(offlineStatus){
  offlineStatus.textContent=location.protocol==='file:'?'Локальный файл. Установка и офлайн-загрузка по ссылке появятся после размещения приложения.':'Офлайн-загрузка недоступна в этом браузере.';
}
