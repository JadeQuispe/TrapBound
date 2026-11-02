const assets = __ASSETS__;
const GAME_BUILD='__BUILD_ID__';
__ENGINE__
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','X-Trapbound-Build':GAME_BUILD}});
const bad=(message,status=400)=>json({error:message},status);
const codeChars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode(){return Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>codeChars[b%codeChars.length]).join('')}
async function body(request){try{return await request.json()}catch{return null}}
async function readRoom(env,code){
 const row=await env.DB.prepare('SELECT state, revision, host_id, host_seen, created_at FROM rooms WHERE code = ?').bind(code).first();
 if(!row?.state)throw new Error('Room was not found. Check the code or create a new room.');
 const state=JSON.parse(row.state);
 if(state.protocol!==2)throw new Error('This room uses an older version. Create a fresh room for the updated game.');
 return {row,state};
}
function roomReply(out,id,after=NaN){
 if(out.revision===after)return json({unchanged:true,revision:out.revision,serverNow:Date.now()});
 return json({state:playerView(out.state,id),serverNow:Date.now(),revision:out.revision,...(out.result?.errors?.length?{errors:out.result.errors}:{})});
}
async function updateRoom(env,code,operate){
 for(let attempt=0;attempt<12;attempt++){
  const {row,state:initial}=await readRoom(env,code);
  const game=createGame(initial);const result=operate(game);const state=game.snapshot();state.simulationAt=Date.now();
  const changed=await env.DB.prepare('UPDATE rooms SET state = ?, revision = revision + 1, host_seen = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(state),Date.now(),code,row.revision).run();
  if(changed.meta?.changes)return {state,revision:row.revision+1,result};
 }
 throw new Error('The room is busy. Try that action again.');
}
async function route(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path.startsWith('/api/')){
  if(request.method==='GET'&&path==='/api/version')return json({build:GAME_BUILD});
  if(request.headers.get('X-Trapbound-Build')!==GAME_BUILD)return json({error:'Game updated. Reload once to install automatic updates and reconnect to your room.',updateRequired:true,build:GAME_BUILD},426);
  if(!env.DB)return bad('The room service is temporarily unavailable. Reconnecting…',503);
  if(request.method==='GET'&&path==='/api/resume'){
   const code=String(url.searchParams.get('code')||'').toUpperCase(),id=url.searchParams.get('id');
   if(!/^[A-Z0-9]{6}$/.test(code)||!id)return json({exists:false});
   try{const {row,state}=await readRoom(env,code);return json({exists:Date.now()-row.created_at<86400000&&state.players.some(p=>p.id===id)})}catch{return json({exists:false})}
  }
  if(request.method==='POST'&&path==='/api/create'){
   const data=await body(request);if(!data?.id||!String(data.name||'').trim())return bad('Enter your name.');
   await env.DB.prepare('DELETE FROM actions WHERE created_at < ?').bind(Date.now()-86400000).run();
   await env.DB.prepare('DELETE FROM rooms WHERE created_at < ?').bind(Date.now()-86400000).run();
   let code;for(let i=0;i<8;i++){code=roomCode();if(!await env.DB.prepare('SELECT code FROM rooms WHERE code = ?').bind(code).first())break;code=null}
   if(!code)return bad('Could not create a room. Try again.',503);
   const now=Date.now(),state=lobbyState(code,data.id,String(data.name).trim().slice(0,18));
   await env.DB.prepare('INSERT INTO rooms (code, host_id, state, revision, host_seen, created_at) VALUES (?, ?, ?, 0, ?, ?)').bind(code,data.id,JSON.stringify(state),now,now).run();
   state.me=data.id;return json({code,state,revision:0});
  }
  if(request.method==='POST'&&(path==='/api/join'||path==='/api/action')){
   const data=await body(request),code=String(data?.code||'').toUpperCase();
   if(!data?.id)return bad('Join a room first.');
   if(path==='/api/action'&&Array.isArray(data.actions)){
    if(!data.actions.length||data.actions.length>8||data.actions.some(action=>action?.type!=='place'))return bad('Only up to eight placement actions can be sent together.');
    try{
     const out=await updateRoom(env,code,game=>{const errors=[];for(const [index,action] of data.actions.entries()){try{game.act(data.id,action)}catch(error){errors.push({index,message:error.message})}}return {errors}});
     return roomReply(out,data.id);
    }catch(error){return bad(error.message,409)}
   }
   const action=path==='/api/join'?{type:'join',name:data.name}:data.action;
   if(!action||!['join','loadout','ready','switchTeam','start','playAgain','backLobby','ability','place','finishBuild','dodge','turn','aim','move','rally','shoot','duel','spectate','viewMode'].includes(action.type))return bad('That action is not valid.');
   try{const out=await updateRoom(env,code,game=>game.act(data.id,action));return roomReply(out,data.id)}catch(error){return bad(error.message,409)}
  }
  if(request.method==='GET'&&path==='/api/poll'){
   const code=String(url.searchParams.get('code')||'').toUpperCase(),id=url.searchParams.get('id');
   try{
    const {row,state}=await readRoom(env,code),player=state.players.find(player=>player.id===id),now=Date.now();
    if(!player)throw new Error('Join this room first.');
    const after=url.searchParams.has('after')?Number(url.searchParams.get('after')):NaN;
    // Waiting/building clients usually need only a read, not competing DB writes.
    const readOnly=['lobby','build','build2'].includes(state.phase)&&now-(player.lastSeen||0)<2000&&player.connected!==false&&(!state.deadline||now<state.deadline)&&!state.players.some(p=>p.connected!==false&&now-(p.lastSeen||now)>=8000);
    const dueSimulation=state.deadline<=now||state.nextMonsterStep<=now||state.pvpArena?.until<=now||state.pvpArena?.monster?.windupAt>0&&state.pvpArena.monster.windupAt<=now||state.players.some(p=>p.respawnAt>0&&p.respawnAt<=now||p.burnTicks>0&&p.nextBurnAt<=now||p.poisonTicks>0&&p.nextPoisonAt<=now)||(state.monsterProjectiles||[]).some(p=>!p.resolved&&p.impactAt<=now);
    const freshSimulation=!dueSimulation&&state.phase==='run'&&now-(state.simulationAt||0)<120&&now-(player.lastSeen||0)<1500&&player.connected!==false;
    if(readOnly||freshSimulation)return roomReply({state,revision:row.revision},id,after);
    const out=await updateRoom(env,code,game=>game.heartbeat(id));return roomReply(out,id,after);
   }catch(error){return bad(error.message,409)}
  }
  return bad('The room service has been updated. Reload and create a new room.',409);
 }
 const file=assets[path==='/'?'/index.html':path];if(!file)return new Response('Not found',{status:404});
 const headers={'content-type':file.type,'cache-control':path==='/'||path.endsWith('.html')?'no-store':'no-cache, must-revalidate',ETag:file.etag};if(file.etag&&request.headers.get('If-None-Match')===file.etag)return new Response(null,{status:304,headers});
 return new Response(file.encoding==='base64'?Uint8Array.from(atob(file.body),c=>c.charCodeAt(0)):file.body,{headers});
}
export default {fetch(request,env){return route(request,env).catch(error=>{console.error('Room request failed',error.message);return bad('Room service unavailable. Your device will retry automatically.',503)})}};
