/* Local audio preferences and original score; no autoplay before interaction. */
(()=>{
 const KEY='trapboundAudioV1',defaults={musicVolume:.28,sfxVolume:.65,musicMuted:false,sfxMuted:false,muted:false};
 const clamp=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
 const preferences={musicVolume:clamp(saved.musicVolume,defaults.musicVolume),sfxVolume:clamp(saved.sfxVolume,defaults.sfxVolume),musicMuted:saved.musicMuted===true,sfxMuted:saved.sfxMuted===true,muted:saved.muted===true};
 let music=null,unlocked=false,opener=null,mode='calm',playingMode='';
 const scores={calm:['/assets/audio/trapbound-theme-v131.mp3','Moonstone Passage'],run:['/assets/audio/trapbound-run-v138.mp3','Beyond the Ruins'],duel:['/assets/audio/trapbound-duel-v138.mp3','Rift Pursuit'],danger:['/assets/audio/trapbound-danger-v133.mp3','One Ember Remains']};
 const buses=[];
 function sfxOff(){return preferences.muted||preferences.sfxMuted||preferences.sfxVolume===0||document.hidden}
 function sync(){
  const label=root.querySelector('[data-music-title]');if(label)label.textContent=scores[mode][1]+' · original TRAPBOUND score';
  for(const {context,gain} of buses){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setTargetAtTime(sfxOff()?0:preferences.sfxVolume,context.currentTime,.015)}
  const enabled=unlocked&&!document.hidden&&!preferences.muted&&!preferences.musicMuted&&preferences.musicVolume>0;
  if(!enabled){music?.pause();return}
  if(!music){music=new Audio('/assets/audio/trapbound-theme-v131.mp3');music.loop=true;music.preload='none';music.addEventListener('error',()=>{const status=document.querySelector('[data-audio-status]');if(status)status.textContent='Music unavailable. Sound effects still work.'})}
  if(playingMode!==mode){music.pause();music.src=scores[mode][0];music.currentTime=0;playingMode=mode}
  music.volume=preferences.musicVolume;
  if(music.paused)music.play().catch(()=>{});
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(preferences))}catch{}sync()}
 function unlock(){unlocked=true;sync()}
 function scene(snapshot){const p=snapshot?.players?.find(p=>p.id===snapshot.me),alive=snapshot?.phase==='run'&&p&&!p.eliminated&&!p.escaped,lastLife=alive&&(p.hearts??3)===1,duel=alive&&snapshot.pvpArena?.participants?.includes(p.id);const next=duel?'duel':lastLife?'danger':alive?'run':'calm';const warning=root.querySelector('[data-last-life]');if(warning)warning.hidden=!lastLife;const vignette=root.querySelector('[data-life-vignette]');if(vignette)vignette.hidden=!lastLife;if(next!==mode){mode=next;sync()}}
 function sfxBus(context){let bus=buses.find(b=>b.context===context);if(!bus){const gain=context.createGain();gain.gain.value=sfxOff()?0:preferences.sfxVolume;gain.connect(context.destination);bus={context,gain};buses.push(bus)}return bus.gain}
 const root=document.createElement('div');root.className='audio-settings-root';
 root.innerHTML=`<div class="life-vignette" data-life-vignette hidden aria-hidden="true"></div><button class="audio-settings-launcher" data-settings-open aria-label="Settings" title="Settings">⚙<span>Settings</span></button><dialog class="audio-settings-dialog" aria-labelledby="audioSettingsTitle"><form method="dialog"><header><h2 id="audioSettingsTitle">Settings</h2><button value="close" aria-label="Close settings">×</button></header><p>Audio settings for this device</p><label class="audio-master"><input type="checkbox" data-audio="muted"> Mute all audio</label><section><label class="audio-enable"><input type="checkbox" data-audio="musicMuted"> Music</label><label for="musicVolume">Music volume <output data-audio-output="musicVolume"></output></label><input id="musicVolume" type="range" min="0" max="100" step="1" data-audio="musicVolume" aria-label="Music volume"><small data-music-title>Moonstone Passage · original TRAPBOUND score</small></section><section><label class="audio-enable"><input type="checkbox" data-audio="sfxMuted"> Sound effects</label><label for="sfxVolume">Sound effects volume <output data-audio-output="sfxVolume"></output></label><input id="sfxVolume" type="range" min="0" max="100" step="1" data-audio="sfxVolume" aria-label="Sound effects volume"></section><p class="audio-status" data-audio-status role="status">Music begins after your first tap or key press.</p><button class="btn" value="done">Done</button></form></dialog>`;
 document.body.append(root);
 const dialog=root.querySelector('dialog');
 function refresh(){for(const field of root.querySelectorAll('[data-audio]')){const key=field.dataset.audio;if(field.type==='range'){field.value=Math.round(preferences[key]*100);root.querySelector(`[data-audio-output="${key}"]`).textContent=field.value+'%'}else field.checked=key==='muted'?preferences[key]:!preferences[key]}}
 root.addEventListener('input',e=>{const key=e.target.dataset.audio;if(!key)return;preferences[key]=e.target.type==='range'?clamp(Number(e.target.value)/100,defaults[key]):key==='muted'?e.target.checked:!e.target.checked;unlocked=true;save();refresh()});
 document.addEventListener('click',e=>{const button=e.target.closest('[data-settings-open]');if(!button)return;opener=button;refresh();root.querySelector('[data-audio-status]').textContent='Changes are saved automatically on this device.';if(!dialog.open){dialog.showModal();window.dispatchEvent(new Event('trapbound-settings-open'))}});
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>opener?.focus());
 document.addEventListener('pointerdown',unlock,{once:true,passive:true});document.addEventListener('keydown',unlock,{once:true});
 document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>music?.pause());
 window.TrapboundAudio={sfxBus,sfxOff,scene,open(){refresh();dialog.showModal()},preferences:()=>({...preferences})};
 refresh();
})();
