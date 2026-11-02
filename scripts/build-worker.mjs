import { readFile, readdir, mkdir, rm, cp, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const files = ["index.html", "style-v51.css", "hero-poses-v130.css", "version-sync.js", "audio-v131.js", "app-v18.js", "assets/ruined-floor.svg", "assets/run-stone.svg", "assets/run-volcanic.svg", "assets/run-crystal.svg", "assets/run-overgrown.svg"];
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
const assets = {};
async function binaryAsset(name,type){const compact=path.join(root,'public/assets/optimized-v149',name.replace(/^assets\//,'').replaceAll('/','_')+'.webp');try{return {body:(await readFile(compact)).toString('base64'),type:'image/webp',encoding:'base64'}}catch{return {body:(await readFile(path.join(root,'public',name))).toString('base64'),type,encoding:'base64'}}}

for (const name of files) {
  const body = await readFile(path.join(root, "public", name), "utf8");
  assets[`/${name}`] = { body, type: mime[path.extname(name)] };
}
for (const [name, type] of [["assets/tutorial-v147/heroes.webp", "image/webp"], ["assets/tutorial-v147/warden.webp", "image/webp"], ["assets/tutorial-v145/reference.png", "image/png"], ["assets/tutorial-v144/warden.webp", "image/webp"], ["assets/tutorial-v144/chamber.webp", "image/webp"], ["assets/audio/trapbound-theme-v131.mp3", "audio/mpeg"], ["assets/audio/trapbound-run-v138.mp3", "audio/mpeg"], ["assets/audio/trapbound-duel-v138.mp3", "audio/mpeg"], ["assets/audio/trapbound-danger-v133.mp3", "audio/mpeg"], ["assets/maps/volcanic-horizontal.webp", "image/webp"], ["assets/build-scenes/volcanic-reference.webp", "image/webp"], ["assets/build-scenes/crystal-reference.webp", "image/webp"], ["assets/build-scenes/overgrown-reference.webp", "image/webp"], ["assets/build-scenes/volcanic-7x7.webp", "image/webp"], ["assets/build-scenes/crystal-7x7.webp", "image/webp"], ["assets/build-scenes/overgrown-7x7.webp", "image/webp"], ["assets/maps/volcanic-vertical.webp", "image/webp"], ["assets/dungeon-master-pixel-v66.png", "image/png"], ["assets/how-to-play-v65.png", "image/png"], ["assets/how-to-play-v70.png", "image/png"], ["assets/hero-fox.png", "image/png"], ["assets/hero-witch.png", "image/png"], ["assets/hero-golem.png", "image/png"], ["assets/hero-wisp.png", "image/png"], ["assets/hero-goblin.png", "image/png"], ["assets/hero-tinker.png", "image/png"], ["assets/landing-sunset-portal.webp", "image/webp"], ["assets/landing-sunset-portal-v2.webp", "image/webp"], ["assets/trapbound-title.png", "image/png"], ["assets/ruined-city-bg.webp", "image/webp"], ["assets/moss-crypt.webp", "image/webp"], ["assets/harvest-labyrinth.webp", "image/webp"], ["assets/dungeon-stone.webp", "image/webp"], ["assets/monster-sprites.webp", "image/webp"], ["assets/dungeon-stone.png", "image/png"], ["assets/character-atlas.png", "image/png"], ["assets/monster-sprites.png", "image/png"], ["assets/weapons-equipped.png", "image/png"], ["assets/dungeon-master.png", "image/png"], ["assets/monsters/magma-golem.webp", "image/webp"], ["assets/monsters/ember-imp.webp", "image/webp"], ["assets/monsters/crystal-slime.webp", "image/webp"], ["assets/monsters/crystal-wraith.webp", "image/webp"], ["assets/monsters/leaf-sprite.webp", "image/webp"], ["assets/monsters/mushroom-brute.webp", "image/webp"], ["assets/floors/volcanic-ruins.webp", "image/webp"], ["assets/floors/crystal-cavern.webp", "image/webp"], ["assets/floors/overgrown-temple.webp", "image/webp"], ["assets/walls/volcanic-wall-tile.webp", "image/webp"], ["assets/walls/crystal-wall-tile.webp", "image/webp"], ["assets/walls/overgrown-wall-tile.webp", "image/webp"], ["assets/traps/rune-spike-pressure-plate.png", "image/png"]]) {
  assets[`/${name}`] = await binaryAsset(name,type);
}
for (const file of await readdir(path.join(root, "public/assets/equipment-v63"))) {
  if (!/^(fox|witch|golem|wisp|goblin|tinker)-(sword|arrow|sandal|spear|wand|hammer|dagger|crossbow)\.webp$/.test(file)) continue;
  const name = `assets/equipment-v63/${file}`;
  const body = await readFile(path.join(root, "public", name));
  assets[`/${name}`] = { body: body.toString("base64"), type: "image/webp", encoding: "base64" };
}
for (const file of ['witch-potion.png','golem-greatsword.png','wisp-shuriken.png','tinker-bomb.png']) {
  const name = `assets/equipment-v141/${file}`;
  assets[`/${name}`] = await binaryAsset(name,'image/png');
}
for(const file of ['warden-ready.webp','warden-alert.webp']){const name='assets/tutorial-v149/'+file;assets['/'+name]=await binaryAsset(name,'image/webp')}
for(const hero of ['fox','witch','golem','wisp','goblin','tinker','ember','frost']){const name='assets/heroes-v152/'+hero+'.png';assets['/'+name]=await binaryAsset(name,'image/png')}
for(const file of ['a.webp','b.webp']){const name='assets/portraits-v153/'+file;assets['/'+name]=await binaryAsset(name,'image/webp')}
for(const file of ['a.webp','b.webp']){const name='assets/equipped-v156/'+file;assets['/'+name]=await binaryAsset(name,'image/webp')}
for(const file of ['longbow.webp','sandal.webp']){const name='assets/icons-v160/'+file;assets['/'+name]=await binaryAsset(name,'image/webp')}
const stylesheetPath = assets['/index.html'].body.match(/href="(\/v\d+\/style-v51\.css)"/)?.[1];
if (!stylesheetPath) throw new Error('Missing versioned stylesheet in index.html');
assets[stylesheetPath] = assets["/style-v51.css"];
assets["/"] = assets["/index.html"];
const worker = await readFile(path.join(root, "worker", "index.js"), "utf8");
const engine=(await readFile(path.join(root,"worker","game.js"),"utf8")).replaceAll("export function", "function");
const buildId=createHash('sha256').update(JSON.stringify(assets)).update(worker).update(engine).digest('hex').slice(0,20);
for(const asset of Object.values(assets))if(!asset.encoding)asset.body=asset.body.replaceAll('__BUILD_ID__',buildId);
for(const asset of Object.values(assets))asset.etag='\"'+createHash('sha256').update(asset.body).digest('hex').slice(0,24)+'\"';
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "server"), { recursive: true });
await mkdir(path.join(dist, ".openai", "drizzle", "meta"), { recursive: true });
await writeFile(path.join(dist, "server", "index.js"), worker.replace("__ASSETS__", JSON.stringify(assets)).replace("__ENGINE__",engine).replaceAll('__BUILD_ID__',buildId));
await cp(path.join(root, ".openai", "hosting.json"), path.join(dist, ".openai", "hosting.json"));
await cp(path.join(root, "drizzle"), path.join(dist, ".openai", "drizzle"), { recursive: true });
console.log("Built TRAPBOUND Worker and embedded app assets.");
