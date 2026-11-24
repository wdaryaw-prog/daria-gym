'use strict';
(function(root){
  const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const optional=(v,min,max)=>v===null||v===undefined||finite(v,min,max);
  function validateRecord(r){
    if(!r||typeof r.id!=='string'||r.id.length>120||!['A','B'].includes(r.day)||!Number.isFinite(Date.parse(r.started))||!optional(r.painBefore,0,10)||!optional(r.painAfter,0,10)||!optional(r.effort,1,10))return false;
    if(r.note!=null&&(typeof r.note!=='string'||r.note.length>2000))return false;
    return Array.isArray(r.exercises)&&r.exercises.length>0&&r.exercises.length<=16&&r.exercises.every(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&e.title.length<=180&&Array.isArray(e.sets)&&e.sets.length<=8&&e.sets.every(s=>s&&optional(s.weight,0,1000)&&optional(s.reps,0,500)&&optional(s.right,0,500)));
  }
  function setDone(s,e,r){
    if(e.skipped)return false;
    if((r.programVersion||1)<3)return s.done===true;
    return finite(s.reps,1,500)&&Number.isInteger(s.reps)&&(!e.bilateral||(finite(s.right,1,500)&&Number.isInteger(s.right)))&&(['body','band'].includes(e.weightMode)||finite(s.weight,0,1000));
  }
  function createSession(day,prefs,previous=[]){
    const p=typeof module!=='undefined'?require('./strength-plan.js'):root.StrengthPlan;
    return {id:root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),day,title:p.titles[day],programVersion:3,started:new Date().toISOString(),position:0,status:'active',painBefore:null,painAfter:null,effort:null,note:'',recovery:null,
      exercises:p.plan(day,prefs).map(e=>({...e,skipped:false,sets:Array.from({length:3},()=>({weight:e.weightMode==='body'?0:null,reps:null,right:null}))}))};
  }
  function stats(r){const completed=r.exercises.filter(e=>!e.seconds&&!e.skipped&&e.sets.some(s=>setDone(s,e,r)));return {exercises:completed.length,sets:completed.reduce((n,e)=>n+e.sets.filter(s=>setDone(s,e,r)).length,0),skipped:r.exercises.filter(e=>e.skipped).length};}
  function mergeRecords(left,right){
    const result=new Map(left.map(r=>[r.id,r]));
    for(const r of right){const old=result.get(r.id);if(!old)result.set(r.id,r);else if((r.localRevision||0)>(old.localRevision||0))result.set(r.id,r);}
    return [...result.values()];
  }
  const api={validateRecord,setDone,createSession,stats,mergeRecords};root.StrengthCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
