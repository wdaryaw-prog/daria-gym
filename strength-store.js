'use strict';
(function(root){
  const KEY='movement-strength-v3',LEGACY='movement-strength-v1';
  const clone=v=>JSON.parse(JSON.stringify(v));
  class Store{
    constructor(){this.records=new Map();this.prefs={smith:0,hyper:0,variants:{}};this.db=null;this.error=null;this.listeners=[];this.ready=this.open();}
    onChange(fn){this.listeners.push(fn);}
    emit(){this.listeners.forEach(fn=>fn());}
    async open(){
      let saved=null,legacy=null;
      try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch{this.error='Не удалось прочитать локальную копию. Исходные данные не перезаписаны.';}
      try{legacy=JSON.parse(localStorage.getItem(LEGACY)||'null');}catch{this.error='Старая запись повреждена. Она сохранена без изменений.';}
      if(!saved&&legacy?.prefs)this.prefs={...this.prefs,...legacy.prefs};
      if(saved?.version===3){this.prefs={...this.prefs,...saved.prefs};for(const r of saved.records||[])if(root.StrengthCore.validateRecord(r))this.records.set(r.id,r);}
      // Legacy key remains untouched. A draft is a real recoverable session, not an empty history.
      for(const r of [...(legacy?.history||[]),...(legacy?.draft?[{...legacy.draft,status:'active'}]:[])]){
        if(root.StrengthCore.validateRecord(r)&&!this.records.has(r.id))this.records.set(r.id,{...r,status:r.status||(r.ended?'finished':'active'),localRevision:1,pending:true,ownerId:null});
      }
      try{
        this.db=await new Promise((resolve,reject)=>{const req=indexedDB.open('movement-strength',1);req.onupgradeneeded=()=>req.result.createObjectStore('sessions',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
        const rows=await new Promise((resolve,reject)=>{const req=this.db.transaction('sessions').objectStore('sessions').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
        for(const r of rows)if(root.StrengthCore.validateRecord(r)){const old=this.records.get(r.id);if(!old||(r.localRevision||0)>(old.localRevision||0))this.records.set(r.id,r);}
        if(this.records.size){const tx=this.db.transaction('sessions','readwrite');for(const r of this.records.values())tx.objectStore('sessions').put(clone(r));await this.txDone(tx);}
      }catch{this.error='Локальная база недоступна. Сохраняем резервную копию в браузере; проверь статус облака.';}
      this.mirror();return this;
    }
    txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
    mirror(){try{localStorage.setItem(KEY,JSON.stringify({version:3,prefs:this.prefs,records:[...this.records.values()]}));return true;}catch{this.error='Не удалось сохранить резервную копию в браузере. Скачай копию истории.';return false;}}
    async write(r){if(this.db){try{const tx=this.db.transaction('sessions','readwrite');tx.objectStore('sessions').put(clone(r));await this.txDone(tx);return true;}catch{this.error='Не удалось записать в локальную базу. Проверь облако и скачай копию.';}}return false;}
    async put(record,{dirty=true}={}){
      if(!root.StrengthCore.validateRecord(record))throw Error('Некорректная запись');
      const previous=this.records.get(record.id),r=clone(record);
      if(dirty){r.cloudVersion=Math.max(previous?.cloudVersion||0,r.cloudVersion||0);r.ownerId=previous?.ownerId??r.ownerId??null;r.localRevision=Math.max(Date.now(),(previous?.localRevision||0)+1);r.pending=true;r.updated=new Date().toISOString();}
      this.records.set(r.id,r);this.mirror();const durable=await this.write(r);this.emit();return {record:r,durable:durable||!this.error};
    }
    async acknowledge(id,revision,cloudVersion){const r=this.records.get(id);if(r?.localRevision!==revision)return;await this.put({...r,pending:false,cloudVersion},{dirty:false});}
    list(ownerId=null){return [...this.records.values()].filter(r=>!r.ownerId||r.ownerId===ownerId).sort((a,b)=>Date.parse(b.started)-Date.parse(a.started));}
    async attachUnbound(ownerId){for(const r of [...this.records.values()])if(!r.ownerId)await this.put({...r,ownerId});}
    async mergeRemote(remote,ownerId){
      for(const row of remote){const r=row.payload;if(!root.StrengthCore.validateRecord(r))continue;const old=this.records.get(r.id);if(old?.pending)continue;
        if(!old||(row.version||0)>(old.cloudVersion||0))await this.put({...r,ownerId,cloudVersion:row.version,pending:false,localRevision:old?.localRevision||0},{dirty:false});
      }
    }
    async importBackup(value){
      const rows=value.version===3?value.records:[...(value.history||[]),...(value.draft?[{...value.draft,status:'active'}]:[])];
      if(!Array.isArray(rows)||rows.length>10000||!rows.every(root.StrengthCore.validateRecord))throw Error('Неверная копия');
      let count=0;for(const r of rows)if(!this.records.has(r.id)){const {ownerId,cloudVersion,pending,...plain}=r;await this.put({...plain,ownerId:null,cloudVersion:0,status:r.status||(r.ended?'finished':'active')});count++;}return count;
    }
    export(){return {version:3,prefs:this.prefs,records:[...this.records.values()]};}
    savePrefs(){this.mirror();}
  }
  root.StrengthStore=Store;
})(typeof window==='undefined'?globalThis:window);
