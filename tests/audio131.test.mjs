import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/audio-v131.js',import.meta.url),'utf8');
function audio(saved={}){
 const events={},rootEvents={},outputs={},tracks=[],stored=[];
 const fields=['muted','musicMuted','sfxMuted','musicVolume','sfxVolume'].map(key=>({dataset:{audio:key},type:key.endsWith('Volume')?'range':'checkbox',value:'',checked:false}));
 const dialog={open:false,showModal(){this.open=true},close(){this.open=false},addEventListener(){}};
 const root={querySelector:s=>s==='dialog'?dialog:outputs[s]??=( {}),querySelectorAll:()=>fields,addEventListener:(n,f)=>rootEvents[n]=f};
 const document={hidden:false,body:{append(){}},createElement:()=>root,querySelector:()=>null,addEventListener:(n,f)=>events[n]=f};
 class Audio{constructor(src){this.src=src;this.paused=true;tracks.push(this)}addEventListener(){}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}}
 const window={addEventListener(){},dispatchEvent(){}};
 vm.runInNewContext(source,{document,window,Audio,Event:class{},localStorage:{getItem:()=>JSON.stringify(saved),setItem:(k,v)=>stored.push(JSON.parse(v))}});
 const input=(key,value)=>{const field=fields.find(f=>f.dataset.audio===key);if(field.type==='range')field.value=value;else field.checked=value;rootEvents.input({target:field})};
 return {api:window.TrapboundAudio,tracks,events,document,input,stored,fields,outputs};
}
test('original music waits for interaction, loops one player, pauses when hidden and respects music mute',()=>{
 const a=audio();assert.equal(a.tracks.length,0);a.events.pointerdown();assert.equal(a.tracks.length,1);assert.equal(a.tracks[0].loop,true);assert.equal(a.tracks[0].volume,.28);a.events.keydown();assert.equal(a.tracks.length,1);
 a.document.hidden=true;a.events.visibilitychange();assert.equal(a.tracks[0].paused,true);a.document.hidden=false;a.events.visibilitychange();assert.equal(a.tracks[0].paused,false);
 a.input('musicMuted',false);assert.equal(a.tracks[0].paused,true);assert.equal(a.api.sfxOff(),false);a.input('musicMuted',true);assert.equal(a.tracks[0].paused,false);
});
test('independent volumes, master mute and persistent preferences clamp safely',()=>{
 const a=audio({musicVolume:20,sfxVolume:-1});assert.equal(a.api.preferences().musicVolume,1);assert.equal(a.api.preferences().sfxVolume,0);assert.equal(a.api.sfxOff(),true);
 a.input('sfxVolume','42');a.input('musicVolume','17');assert.equal(a.api.preferences().sfxVolume,.42);assert.equal(a.tracks[0].volume,.17);
 a.input('muted',true);assert.equal(a.api.sfxOff(),true);assert.equal(a.tracks[0].paused,true);a.input('muted',false);assert.equal(a.api.sfxOff(),false);
 const restored=audio(a.stored.at(-1));assert.equal(restored.api.preferences().musicVolume,.17);assert.equal(restored.api.preferences().sfxVolume,.42);
});
test('all gameplay tones share a controllable effects bus, including already playing effects',()=>{
 const a=audio(),changes=[],gain={gain:{value:0,cancelScheduledValues(){},setTargetAtTime:v=>changes.push(v)},connect(){}};
 const context={currentTime:1,destination:{},createGain:()=>gain};assert.equal(a.api.sfxBus(context),gain);assert.equal(a.api.sfxBus(context),gain);assert.equal(gain.gain.value,.65);
 a.input('sfxMuted',false);assert.equal(changes.at(-1),0);a.input('sfxMuted',true);assert.equal(changes.at(-1),.65);a.input('sfxVolume','0');assert.equal(changes.at(-1),0);
});
test('landing has a single top tutorial link and no inactive reconnect placeholder',async()=>{
 const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8'),html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const home=client.slice(client.indexOf('function home()'),client.indexOf('function rank()'));
 assert.ok(!home.includes('data-how-open'));assert.equal((html.match(/data-how-open/g)||[]).length,1);assert.ok(home.includes('savedRoomAvailable()'));assert.ok(html.indexOf('/audio-v131.js')<html.indexOf('/app-v18.js'));
});
test('saved-room checks run once and never remount a form while typing',async()=>{
 const client=await readFile(new URL('../public/app-v18.js',import.meta.url),'utf8'),requests=[];let homes=0;
 const context=vm.createContext({profile:null,state:null,landingMode:'',howOpen:false,encodeURIComponent,api:url=>new Promise(resolve=>requests.push({url,resolve})),home:()=>homes++});
 vm.runInContext(client.slice(client.indexOf('let savedRoomCheck='),client.indexOf('function heroLineup')),context);
 assert.equal(context.savedRoomAvailable(),false);assert.equal(requests.length,0);
 context.profile={code:'ABCDEF',id:'a'};assert.equal(context.savedRoomAvailable(),false);context.savedRoomAvailable();assert.equal(requests.length,1);
 requests[0].resolve({exists:false});await Promise.resolve();assert.equal(context.savedRoomAvailable(),false);assert.equal(homes,0);
 context.profile={code:'ABCDEF',id:'b'};context.landingMode='join';context.savedRoomAvailable();requests[1].resolve({exists:true});await Promise.resolve();assert.equal(context.savedRoomAvailable(),true);assert.equal(requests.length,2);assert.equal(homes,0);
});
test('music changes for combat and last life, then returns after escape without losing volume preferences',()=>{
 const a=audio();a.events.pointerdown();a.input('musicVolume','34');
 const state={phase:'run',me:'a',players:[{id:'a',hearts:3}],pvpArena:{type:'rival',participants:['a','b']}};
 a.api.scene(state);assert.match(a.tracks[0].src,/duel-v138/);assert.equal(a.tracks[0].volume,.34);assert.equal(a.tracks.length,1);
 state.players[0].hearts=1;a.api.scene(state);assert.match(a.tracks[0].src,/duel-v138/);state.pvpArena=null;a.api.scene(state);assert.match(a.tracks[0].src,/danger-v133/);state.players[0].hearts=3;a.api.scene(state);assert.match(a.tracks[0].src,/run-v138/);
 a.input('musicMuted',false);state.players[0].escaped=true;a.api.scene(state);assert.equal(a.tracks[0].paused,true);
 a.input('musicMuted',true);assert.match(a.tracks[0].src,/theme-v131/);assert.equal(a.tracks[0].volume,.34);
});
test('one-life edge warning remains visible with muted audio in the maze and PvP, and clears on recovery',()=>{
 const a=audio({muted:true}),s={phase:'run',me:'a',players:[{id:'a',hearts:1}]};
 a.api.scene(s);assert.equal(a.outputs['[data-life-vignette]'].hidden,false);
 s.pvpArena={type:'rival',participants:['a','b']};a.api.scene(s);
 assert.equal(a.outputs['[data-life-vignette]'].hidden,false);
 s.players[0].eliminated=true;a.api.scene(s);assert.equal(a.outputs['[data-life-vignette]'].hidden,true);
 s.players[0].eliminated=false;s.players[0].hearts=2;a.api.scene(s);assert.equal(a.outputs['[data-life-vignette]'].hidden,true);
 s.players[0].hearts=1;s.phase='build';a.api.scene(s);assert.equal(a.outputs['[data-life-vignette]'].hidden,true);
 assert.equal(a.tracks.length,0);
});
