'use strict';
(function(root){
  class Cloud{
    constructor(store){this.store=store;this.config=root.MOVEMENT_CLOUD||{};this.configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(this.config.url||'')&&!!this.config.publishableKey;this.session=null;this.status=this.configured?'Войди, чтобы сохранять в базу':'Облачная база ещё не подключена';this.busy=false;this.timer=null;this.listeners=[];
      try{this.session=JSON.parse(localStorage.getItem('movement-auth-v1')||'null');}catch{}
      root.addEventListener?.('online',()=>this.sync());
    }
    get userId(){return this.session?.user?.id||null;}
    changed(){this.listeners.forEach(fn=>fn());}
    onChange(fn){this.listeners.push(fn);}
    setSession(s){this.session=s;try{if(s)localStorage.setItem('movement-auth-v1',JSON.stringify(s));else localStorage.removeItem('movement-auth-v1');}catch{}this.changed();}
    async request(path,options={},token=null){
      const response=await fetch(this.config.url+path,{...options,headers:{apikey:this.config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers},signal:AbortSignal.timeout(15000)});
      const body=await response.json().catch(()=>null);
      if(!response.ok)throw Error(body?.msg||body?.message||body?.error_description||'Ошибка соединения с базой');return body;
    }
    async sendLink(email,redirect){
      if(!this.configured)throw Error('База ещё не подключена');
      await this.request('/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{method:'POST',body:JSON.stringify({email,create_user:true})});
      this.status='Открой письмо и перейди по ссылке на этом устройстве. Можно также ввести код, если он есть в письме.';this.changed();
    }
    async verify(email,token){const s=await this.request('/auth/v1/verify',{method:'POST',body:JSON.stringify({email,token,type:'email'})});this.setSession(s);await this.sync();}
    async captureCallback(){
      const hash=new URLSearchParams(location.hash.slice(1));if(!hash.has('access_token'))return;
      const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');
      try{const user=await this.request('/auth/v1/user',{},access_token);this.setSession({access_token,refresh_token,user,expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600)});history.replaceState(null,'',location.pathname+location.search);}catch{this.status='Не удалось завершить вход. Запроси новое письмо.';}
    }
    async token(){
      if(!this.session)throw Error('Войди в аккаунт');
      if((this.session.expires_at||0)<Date.now()/1000+60){const fresh=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:this.session.refresh_token})});this.setSession(fresh);}
      return this.session.access_token;
    }
    schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.sync(),800);}
    async sync(){
      if(!this.configured||!this.userId||this.busy)return;this.busy=true;this.status='Сохраняем в базу…';this.changed();
      try{
        const token=await this.token(),ownerId=this.userId;
        // RLS authorizes every request. Pagination never treats a partial result as the complete history.
        const rows=[];for(let offset=0;;offset+=500){const page=await this.request('/rest/v1/movement_sessions?select=id,payload,version&order=id&limit=500&offset='+offset,{},token);rows.push(...page);if(page.length<500)break;}
        await this.store.mergeRemote(rows,ownerId);
        for(const r of [...this.store.records.values()].filter(r=>r.ownerId===ownerId&&r.pending)){
          const payload=JSON.parse(JSON.stringify(r));delete payload.pending;delete payload.cloudVersion;delete payload.ownerId;
          const reply=await this.request('/rest/v1/rpc/save_movement_session',{method:'POST',body:JSON.stringify({p_id:r.id,p_payload:payload,p_expected:r.cloudVersion||0})},token);
          if(reply.conflict){
            if(!reply.payload)throw Error('Запись в базе не найдена; локальная копия сохранена.');
            const current=this.store.records.get(r.id)||r;const id=r.id+'-copy-'+crypto.randomUUID().slice(0,8);
            await this.store.put({...current,id,cloudVersion:0,title:(r.title||r.day)+' · сохранённая копия',conflictOf:r.id});
            await this.store.put({...reply.payload,id:r.id,ownerId,cloudVersion:reply.version,pending:false,localRevision:r.localRevision},{dirty:false});
            this.status='Изменения с двух устройств сохранены отдельными копиями. Ничего не перезаписано.';
          }else await this.store.acknowledge(r.id,r.localRevision,reply.version);
        }
        const pending=[...this.store.records.values()].filter(r=>r.ownerId===ownerId&&r.pending).length;
        this.status=pending?'Изменения сохранены на устройстве; догружаем в базу…':'Сохранено в базе · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
        if(pending)this.schedule();
      }catch(error){this.status='На устройстве сохранено. База недоступна: '+error.message;}
      finally{this.busy=false;this.changed();}
    }
    signOut(){this.setSession(null);this.status='Вход выполнен не был. Локальные копии сохранены.';this.changed();}
  }
  root.StrengthCloud=Cloud;
})(typeof window==='undefined'?globalThis:window);
