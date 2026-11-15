'use strict';
// Agreed A/B programme. Levels are alternatives across sessions, never combined sets.
(function(root){
  const exercise=(id,title,sets,min,max,weight,note,extra={})=>({id,title,sets,min,max,weight,note,...extra});
  const warmup=()=>[
    exercise('bike','Велосипед',1,null,null,null,'5 минут разминки.',{seconds:300}),
    exercise('elliptical','Эллипс',1,null,null,null,'5 минут разминки.',{seconds:300})
  ];
  const levels={
    smith:[{label:'2 × 5 кг · 5 повторений',weight:10,reps:5},
      {label:'2 × 10 кг · 5 повторений',weight:20,reps:5},
      {label:'2 × 7,5 кг · 3 повторения',weight:15,reps:3}],
    hyper:[{label:'Собственный вес · 2 × 5–10',weight:0,sets:2},
      {label:'Блин 5 кг · 3 × 5–10',weight:5,sets:3}]
  };
  function plan(day,selection={smith:0,hyper:0}){
    const smith=levels.smith[selection.smith]||levels.smith[0];
    const hyper=levels.hyper[selection.hyper]||levels.hyper[0];
    return day==='A'?[...warmup(),
      exercise('leg-press','Жим ногами в тренажёре',2,10,15,null,'Новое упражнение: сначала подбери настройку и нагрузку с инструктором. Спина и таз остаются на опоре; не отрывай таз и не выпрямляй колени с усилием до упора. Внеси вес, указанный на тренажёре.',{addition:true}),
      exercise('vertical','Вертикальная тяга широким хватом',2,7,10,null,'Согласованный ориентир: до 25 кг.'),
      exercise('bridge','Ягодичный мост',3,12,15,null,'Вес в программе не задан. Внеси фактическую нагрузку.'),
      exercise('chest','Жим от груди в тренажёре',2,10,15,null,'Вес в программе не задан.'),
      exercise('abduction','Разведение ног',2,12,15,null,'Вес в программе не задан.'),
      exercise('lateral-raise','Подъёмы рук с гантелями в стороны',2,12,15,null,'Новое упражнение: подбери комфортную нагрузку с инструктором. Поднимай руки плавно, не выше уровня плеч, без раскачивания и прогиба в пояснице. В поле веса укажи вес ОДНОЙ гантели.',{addition:true,weightUnit:'кг/гантель'}),
      exercise('dead-bug','Пресс · Dead bug',2,6,8,0,'Лёжа на спине, подними согнутые ноги и руки. Медленно опускай противоположные руку и ногу, сохраняя положение таза и поясницы, затем возвращайся и меняй сторону. Дыши свободно. Уменьши размах, если трудно удерживать корпус. Сторона в записи — по движущейся ноге. Сначала освой с инструктором.',{bilateral:true,addition:true})
    ]:[...warmup(),
      exercise('squat-warmup','Приседания без веса',1,null,null,0,'Один разминочный подход. Число повторений в согласованной программе не указано.'),
      exercise('smith','Приседания в Смите',2,smith.reps,smith.reps,smith.weight,'Указан суммарный вес блинов с двух сторон, без грифа. '+smith.label+'. Порядок уровней: 2 × 5 → 2 × 10 → 2 × 7,5 кг. Выбран только один уровень.'),
      exercise('row-wide','Горизонтальная тяга широким хватом',2,7,10,null,'Согласованный диапазон: 15–20 кг.'),
      exercise('chest','Жим от груди в тренажёре',2,10,15,null,'Теперь жим есть в обеих тренировках. Вес подбирается вручную; он не увеличивается автоматически.',{addition:true}),
      exercise('hyper','Гиперэкстензия',hyper.sets,5,10,hyper.weight,hyper.label+'. Это один из двух вариантов: без веса ИЛИ с блином. Отдых 1,5 минуты.',{rest:90}),
      exercise('curl','Сгибание ног сидя',2,10,15,null,'Вес в программе не задан.',{addition:true}),
      exercise('calf','Подъёмы на носки',2,15,15,null,'Вес в программе не задан.'),
      exercise('pallof','Pallof press',2,10,10,null,'Встань боком к блоку. Выжимай рукоять перед собой, удерживая корпус без поворота. В каждом подходе 10 на каждую сторону.',{bilateral:true,addition:true})
    ];
  }
  function progressExercises(history=[],draft=null){
    const current=[...plan('A'),...plan('B')];
    const saved=[...history,...(draft?[draft]:[])].flatMap(r=>r.exercises||[]);
    // Retired exercises stay inspectable; stored workouts and drafts are never rebuilt.
    const result=new Map();
    for(const e of [...current,...saved])if(!e.seconds&&!result.has(e.id))result.set(e.id,e);
    return [...result.values()];
  }
  const api={version:2,titles:{A:'А · Всё тело',B:'Б · Всё тело'},levels,plan,progressExercises};
  root.StrengthPlan=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
