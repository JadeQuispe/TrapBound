export function readyAndStart(game,host='a'){
 for(const p of game.snapshot().players.filter(p=>p.connected!==false))game.act(p.id,{type:'ready',ready:true});
 game.act(host,{type:'start'});
 const intro=game.snapshot().buildIntro;if(intro){intro.until=Date.now();game.tick();}
}
