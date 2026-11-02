/* The build helper inserts a content fingerprint, shared by server and clients. */
(()=>{
 const BUILD='__BUILD_ID__',nativeFetch=window.fetch.bind(window);
 let updating=false,checking=false;
 function update(next){
  if(typeof next!=='string'||!/^[a-f0-9]{20}$/.test(next)||next===BUILD||updating)return;
  updating=true;window.dispatchEvent(new Event('trapbound-before-update'));
  const banner=document.createElement('div');banner.className='game-update-notice';banner.setAttribute('role','alert');document.body.append(banner);
  const target=new URL(location.href);target.searchParams.set('tb_build',next);
  let repeated=false;try{const key='trapboundUpdateAttempt:'+next;repeated=Date.now()-Number(sessionStorage.getItem(key)||0)<30000;sessionStorage.setItem(key,String(Date.now()))}catch{}
  if(repeated){banner.textContent='The update could not finish loading. ';const retry=document.createElement('button');retry.textContent='Reload game';retry.onclick=()=>{target.searchParams.set('tb_retry',String(Date.now()));location.replace(target.href)};banner.append(retry);return}
  banner.textContent='Game update available · reconnecting to your room…';
  setTimeout(()=>location.replace(target.href),200);
 }
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
  const ownApi=url.origin===location.origin&&url.pathname.startsWith('/api/');
  if(!ownApi)return nativeFetch(input,init);
  const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));headers.set('X-Trapbound-Build',BUILD);
  const response=await nativeFetch(input,{...init,headers,cache:'no-store'});
  update(response.headers.get('X-Trapbound-Build'));
  return response;
 };
 async function check(){if(updating||checking||document.hidden)return;checking=true;try{const response=await nativeFetch('/api/version',{cache:'no-store',headers:{'X-Trapbound-Build':BUILD}});if(response.ok)update((await response.json()).build)}catch{}finally{checking=false}}
 window.TrapboundUpdater={build:BUILD,check};
 document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);window.addEventListener('online',check);window.addEventListener('pageshow',check);
 window.addEventListener('load',check,{once:true});setInterval(check,15000);
})();
