(function(root){
  'use strict';
  const defaults={squeezeReps:10,squeezeSets:2,hipReps:12,hipRounds:1,plankSeconds:30,repSeconds:6,releaseSeconds:5,restSeconds:20,prepSeconds:10};
  const choices={squeezeReps:[10,12,15],squeezeSets:[2,3],hipReps:[12,15],hipRounds:[1,2],plankSeconds:[30,45],repSeconds:[4,6,8],releaseSeconds:[3,5,8],restSeconds:[15,20,30],prepSeconds:[5,10,15]};
  const exercises=[
    {id:'squeeze',title:'Сжатие мяча бёдрами',source:'IMG_7958.txt',dose:'10–15 повторов · 2–3 подхода · счёт до пяти',equipment:'Мяч для пилатеса 20–25 см или плотная подушка',steps:['Ляг на спину в комфортной позе.','Помести мяч или плотно набитую подушку между внутренними поверхностями бёдер, на середине бедра — не у коленей.','Сожми мяч бёдрами и считай примерно до пяти, сохраняя сильное напряжение. Затем расслабься.','Повтори 10–15 раз. Всего 2–3 подхода с коротким отдыхом между ними.'],note:'В таймере счёт до пяти отображается как 5 секунд. Время расслабления и отдыха можно менять ниже.'},
    {id:'clam',title:'Раскрытие колена на боку',source:'IMG_7959.txt',dose:'12–15 повторов на сторону',equipment:'Коврик',steps:['Ляг на бок: примерно 90° в тазобедренных суставах и коленях.','Немного заверни таз внутрь. Верхнюю руку положи на переход поясницы в таз: она помогает заметить, если таз уходит назад.','Стопы остаются вместе. Раскрывай верхнее колено, как книжку, в небольшой амплитуде от тазобедренного сустава. Таз остаётся неподвижным.','Небольшая пауза наверху. Опусти колено, сделай небольшую паузу внизу. Повтори 12–15 раз.'],note:'Из этой позиции сразу выполняется подъём всей ноги. После двух упражнений — отдых и другая сторона. Дополнительный круг в записи указан как необязательный.'},
    {id:'lift',title:'Подъём согнутой ноги на боку',source:'IMG_7959.txt',dose:'12–15 повторов на сторону',equipment:'Коврик',steps:['Останься в той же позиции на боку, с согнутыми ногами и неподвижным тазом.','Подними верхнюю ногу целиком, в ещё меньшей амплитуде: стопа и бедро движутся вместе.','Стопа не должна обгонять бедро. Опусти ногу; внизу можно расслабиться.','Сделай 12–15 повторов. Затем отдохни, перевернись и повтори оба упражнения на другой стороне.'],note:'Резинка на бёдрах упомянута как усложнение, если легко. В этом плеере сопротивление не добавлено автоматически.'},
    {id:'plank',title:'Боковая планка',source:'IMG_7960.txt',dose:'Удержание 30–45 секунд',equipment:'Коврик',steps:['Нижняя нога согнута. В исходной позиции колено находится на одной линии с туловищем, а не впереди.','Поставь плечо над локтем. Шея длинная, пресс сильный.','Подкрути таз: лобок к рёбрам, таз толкни вперёд. Тазовые косточки на одной линии — таз не разворачивается и не проваливается вниз.','Удерживай 30–45 секунд и дыши. Затем опустись и отдохни.'],note:'Подъём верхней ноги в записи предложен как усложнение, если легко. Здесь по умолчанию вариант с опорой. Число подходов в записи не задано; в этой части плеера — одно удержание на каждой стороне.'}
  ];
  function normalize(input={}){
    const s={...defaults};
    for(const key of Object.keys(defaults))if(input[key]!==undefined){
      const value=Number(input[key]);if(!choices[key].includes(value))throw new Error('Недопустимая настройка: '+key);s[key]=value;
    }
    return s;
  }
  function build(input){
    const s=normalize(input),plan=[];
    function add(ex,kind,dur,label,count='',hint='',side='',cue=''){
      plan.push({ex,kind,dur,label,count,hint,side,cue});
    }
    function prep(ex,hint,side='',count=''){
      add(ex,'prep',s.prepSeconds,'Приготовься',count,hint,side,'exercise');
    }
    for(let set=1;set<=s.squeezeSets;set++){
      if(set===1)prep('squeeze','Ляг на спину. Мяч или подушка — на середине бёдер.');
      else add('squeeze','rest',s.restSeconds,'Отдых между подходами',`Дальше подход ${set} из ${s.squeezeSets}`,'Отпусти напряжение.');
      for(let r=1;r<=s.squeezeReps;r++){
        const count=`Подход ${set} из ${s.squeezeSets} · повтор ${r} из ${s.squeezeReps}`;
        add('squeeze','work',5,'Сожми мяч',count,'Считай до пяти. Напряжение сохраняется.');
        add('squeeze','rest',s.releaseSeconds,'Расслабься',count,'Отпусти сжатие.');
      }
    }
    for(let round=1;round<=s.hipRounds;round++){
      for(const [i,side] of ['Левый бок','Правый бок'].entries()){
        add('clam','transition',s.restSeconds,i===0?'Переход к упражнениям на боку':'Смена стороны',`Круг ${round} из ${s.hipRounds}`,`Ляг на ${i===0?'левый':'правый'} бок.`,side,'side');
        for(const ex of ['clam','lift']){
          prep(ex,ex==='clam'?'Стопы вместе, таз неподвижен.':'Теперь поднимай верхнюю ногу целиком.',side,`Круг ${round} из ${s.hipRounds}`);
          const up=Math.round(s.repSeconds/3),down=s.repSeconds-up-2;
          for(let r=1;r<=s.hipReps;r++){
            const count=`Круг ${round} из ${s.hipRounds} · повтор ${r} из ${s.hipReps}`;
            add(ex,'work',up,ex==='clam'?'Раскрой колено':'Подними ногу',count,ex==='clam'?'Стопы вместе. Таз не уходит назад.':'Стопа и бедро идут вместе.',side);
            add(ex,'work',1,'Пауза наверху',count,'Сохрани небольшую амплитуду.',side);
            add(ex,'work',down,ex==='clam'?'Опусти колено':'Опусти ногу',count,'Вернись в исходное положение.',side);
            add(ex,'rest',1,'Пауза внизу',count,ex==='lift'?'Внизу можно расслабиться.':'Стопы остаются вместе.',side);
          }
        }
      }
    }
    for(const [i,side] of ['Левый бок','Правый бок'].entries()){
      add('plank','transition',s.restSeconds,i===0?'Переход к боковой планке':'Отдых и смена стороны','',`Подготовь опору на ${i===0?'левом':'правом'} боку.`,side,'side');
      prep('plank','Нижняя нога согнута. Плечо над локтем.',side);
      add('plank','work',s.plankSeconds,'Держи планку','Одно удержание на эту сторону','Таз вперёд, шея длинная. Дыши.',side);
    }
    const total=plan.reduce((n,p)=>n+p.dur,0);
    return {settings:s,plan,total};
  }
  class Timer{
    constructor(plan){this.plan=plan;this.state={status:'idle',seg:0,left:plan[0].dur*1000};}
    start(){this.state={status:'running',seg:0,left:this.plan[0].dur*1000};}
    toggle(){if(this.state.status==='running')this.state.status='paused';else if(this.state.status==='paused')this.state.status='running';}
    advance(ms){
      if(this.state.status!=='running')return false;
      this.state.left-=Math.max(0,ms);const previous=this.state.seg;
      while(this.state.left<=0){
        if(this.state.seg===this.plan.length-1){this.state.status='done';this.state.left=0;return true;}
        this.state.seg++;this.state.left+=this.plan[this.state.seg].dur*1000;
      }
      return previous!==this.state.seg;
    }
    seek(seg){if(seg<0||seg>=this.plan.length)return;this.state.seg=seg;this.state.left=this.plan[seg].dur*1000;}
  }
  root.PelvicPlan={defaults,choices,exercises,normalize,build,Timer};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PelvicPlan;
})(typeof window!=='undefined'?window:globalThis);
