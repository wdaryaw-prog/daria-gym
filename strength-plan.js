'use strict';
(function(root){
  const ex=(id,title,min,max,weight,note,extra={})=>({id,title,sets:3,min,max,weight,note,...extra});
  const levels={smith:[{label:'2 × 5 кг · 5 повторений',weight:10,reps:5},{label:'2 × 10 кг · 5 повторений',weight:20,reps:5},{label:'2 × 7,5 кг · 3 повторения',weight:15,reps:3}],hyper:[{label:'Собственный вес · 3 × 5–10',weight:0,sets:3},{label:'Блин 5 кг · 3 × 5–10',weight:5,sets:3}]};
  function catalogue(selection={}){
    const smith=levels.smith[selection.smith]||levels.smith[0],hyper=levels.hyper[selection.hyper]||levels.hyper[0];
    return {
      'leg-press':ex('leg-press','Жим ногами',15,15,5,'Тренажёр с сиденьем и большой платформой для стоп. Спина и таз на опоре. В записи тренера: 5 кг, 3 × 15.',{image:0,source:'trainer'}),
      gravitron:ex('gravitron','Подтягивания в гравитроне',12,12,null,'Высокая рама с верхними рукоятками и опорой под колени. 55–60 кг в записи тренера — ПРОТИВОВЕС, который помогает подтягиваться. Больше помощи — легче, а не тяжелее.',{image:1,source:'trainer',weightMode:'assistance',weightUnit:'кг помощи',weightHint:'55–60'}),
      chest:ex('chest','Жим от груди в тренажёре',10,15,null,'Сиденье со спинкой, рукоятки на высоте груди: выжимай их вперёд. Вес — показание выбранного тренажёра.',{image:2,source:'agreed'}),
      kickback:ex('kickback','Отведение ноги назад',15,15,9,'Нижний блок с манжетой на ноге. Опора — фиолетовый кубик для йоги, нагрузка 9 кг. Отводи ногу назад, сохраняя корпус устойчивым. Записывай повторы каждой ноги отдельно. Схема показывает типовое упражнение; крепление и настройку повторяй как показывала тренер.',{image:3,source:'trainer',bilateral:true}),
      'lateral-raise':ex('lateral-raise','Махи с гантелями в стороны',12,12,3,'Стоя, плавно поднимай руки в стороны без раскачивания. В записи тренера — гантели по 3 кг, 3 × 12. Записывай вес ОДНОЙ гантели.',{image:4,source:'trainer',weightUnit:'кг/гантель'}),
      'dead-bug':ex('dead-bug','Пресс · Dead bug',6,8,0,'Лёжа на спине, медленно опускай противоположные руку и ногу, сохраняя положение таза и поясницы. Дыши свободно. Сторону считай по движущейся ноге.',{image:5,source:'agreed',bilateral:true,weightMode:'body'}),
      smith:ex('smith','Приседания в Смите',smith.reps,smith.reps,smith.weight,'Гриф движется по направляющим. В поле веса — сумма блинов с двух сторон БЕЗ грифа. Выбран один уровень: '+smith.label+'. Порядок уровней: 2 × 5 → 2 × 10 → 2 × 7,5 кг. Переход только вручную.',{image:6,source:'agreed'}),
      'row-wide':ex('row-wide','Горизонтальная тяга широким хватом',7,10,null,'Сидя на скамье перед нижним блоком, тяни широкую рукоятку к корпусу. Прежний ориентир: 15–20 кг.',{image:7,source:'agreed',weightHint:'15–20'}),
      hyper:ex('hyper','Гиперэкстензия',5,10,hyper.weight,'Наклонная скамья с упорами под бёдра и голени. Выбран вариант: '+hyper.label+'. Собственный вес ИЛИ блин, не оба варианта подряд. Отдых по прежней схеме — 1,5 минуты; без таймера и отметок.',{image:8,source:'agreed',weightMode:hyper.weight===0?'body':'external'}),
      curl:ex('curl','Сгибание ног сидя',10,15,null,'Тренажёр с сиденьем, фиксатором над бёдрами и валиком у голеней. Сгибай ноги, перемещая нижний валик под сиденье.',{image:9,source:'agreed'}),
      calf:ex('calf','Подъёмы на носки',15,15,0,'Поднимай пятки и плавно опускай, удерживая равновесие. При добавлении внешнего веса внеси его в поле.',{image:10,source:'agreed',weightMode:'body'}),
      pallof:ex('pallof','Жим Паллофа с резинкой',15,15,null,'Оранжевая резинка закреплена сбоку на высоте груди. Выжимай руки перед собой, удерживая корпус без поворота. В записи тренера 2 × 15; в текущей программе 3 подхода по твоему уточнению от 24 ноября.',{image:11,source:'trainer',bilateral:true,weightMode:'band',loadText:'Оранжевая резинка'}),
      bridge:ex('bridge','Ягодичный мост',12,15,null,'Лёжа на спине с согнутыми ногами, поднимай таз. Вариант ягодичного блока вместо отведения ноги; не дополнительное упражнение.',{image:12,source:'agreed'}),
      abduction:ex('abduction','Разведение ног',12,15,null,'Сидя в тренажёре с упорами у наружной стороны коленей, разводи ноги. Вариант ягодичного блока вместо отведения ноги.',{image:13,source:'agreed'}),
      vertical:ex('vertical','Вертикальная тяга широким хватом',7,10,null,'Верхний блок с длинной рукояткой и упором над бёдрами. Вариант вместо гравитрона, не вместе с ним. Прежний ориентир: до 25 кг.',{image:14,source:'agreed',weightHint:'до 25'})
    };
  }
  function plan(day,selection={}){
    const c=catalogue(selection),v=selection.variants||{};
    const pull=['gravitron','vertical'].includes(v.pullA)?v.pullA:'gravitron';
    const glute=['kickback','bridge','abduction'].includes(v.gluteA)?v.gluteA:'kickback';
    return (day==='A'?['leg-press',pull,'chest',glute,'lateral-raise','dead-bug']:['smith','row-wide','chest','hyper','curl','calf','pallof']).map(id=>c[id]);
  }
  function progressExercises(history=[],draft=null){
    const result=new Map();for(const e of [...plan('A'),...plan('B'),...[...history,...(draft?[draft]:[])].flatMap(r=>r.exercises||[])])if(!e.seconds&&!result.has(e.id))result.set(e.id,e);return [...result.values()];
  }
  const api={version:3,titles:{A:'А · Всё тело',B:'Б · Всё тело'},levels,plan,catalogue,progressExercises};root.StrengthPlan=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
