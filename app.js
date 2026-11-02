import OBR from './sdk.js';
import {PREFIX as P,saveModifier,number,damage,health} from './core.js';
import {ready,diceRoll,saveNotation,saveTotals,SOURCE} from './dice.js';
import {RESULT_KEY,publicResults} from './shared.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let targets=[],results=[],undo=null,sceneId=null,busy=false,sceneEpoch=0,targetVersion=0,pendingIds=null,locked=false;
let storageKey=null,totalDamage=0;
let publicState='rolled',publishQueue=Promise.resolve();
const fields=['ability','dc','damage','success','visibility'];
function persist(){
 if(!storageKey)return;
 try{localStorage.setItem(storageKey,JSON.stringify({targets,results,applied:!!results.applied,undo,locked,totalDamage,publicState,fields:Object.fromEntries(fields.map(k=>[k,$(k).value])),status:$('status').textContent}));}
 catch{message('Не удалось сохранить панель в браузере');}
}
async function restore(){
 const epoch=sceneEpoch,meta=await OBR.scene.getMetadata(),key=SOURCE+'/scene-id';
 let id=meta[key];
 if(!id){id=crypto.randomUUID();await OBR.scene.setMetadata({[key]:id});}
 const player=await OBR.player.getId();if(epoch!==sceneEpoch)return false;
 storageKey=SOURCE+'/state/'+id+'/'+player;
 let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{return false;}
 if(!saved)return false;
 for(const k of fields)if(typeof saved.fields?.[k]==='string')$(k).value=saved.fields[k];
 targets=saved.targets||[];results=saved.results||[];results.applied=!!saved.applied;
 undo=saved.undo;sceneId=String(sceneEpoch);if(undo)undo.sceneId=sceneId;
 totalDamage=saved.totalDamage||0;publicState=saved.publicState||'rolled';
 renderTargets();if(results.length)renderResults();
 lock(!!saved.locked);$('apply').disabled=!results.length||!!results.applied;$('undo').disabled=!undo;
 message(saved.status||'');return true;
}
function publish(){
 persist(); const epoch=sceneEpoch,data=results.length?publicResults(results,publicState):null;
 publishQueue=publishQueue.catch(()=>{}).then(async()=>{if(epoch!==sceneEpoch||!await OBR.scene.isReady()||await OBR.player.getRole()!=='GM')return;await OBR.scene.setMetadata({[RESULT_KEY]:data});});
 return publishQueue.catch(()=>message('Не удалось обновить результаты для игроков'));
}
function lock(value){locked=value;if(value){targetVersion++;pendingIds=null;}for(const id of ['ability','dc','damage','success','visibility'])$(id).disabled=value;$('roll').disabled=value&&results.length>0;}
function message(s){$('status').textContent=s;}
function reset(){results=[];$('results').replaceChildren();$('apply').disabled=true;$('targets').hidden=false;}
async function check(){if(await OBR.player.getRole()!=='GM')throw Error('Только для мастера');if(!await OBR.scene.isReady())throw Error('Открой сцену');const id=String(sceneEpoch);if(sceneId&&sceneId!==id){targets=[];undo=null;reset();$('undo').disabled=true;throw Error('Сцена изменилась');}sceneId=id;}
function bind(id,fn){$(id).onclick=async()=>{if(busy)return;busy=true;const version=sceneEpoch;$('controls').disabled=true;try{await check();await fn();}catch(e){message(e.message);}finally{busy=false;$('controls').disabled=false;$('apply').disabled=!results.length||!!results.applied;$('undo').disabled=!undo;if(version!==sceneEpoch){targets=[];undo=null;reset();$('undo').disabled=true;}lock(locked);if(pendingIds&&!locked){const ids=pendingIds;pendingIds=null;await loadTargets(ids).catch(e=>message(e.message));}persist();}};}
$('close').onclick=()=>{persist();return OBR.popover.close(SOURCE+'/panel');};
$('visibility').onchange=persist;
for(const k of ['ability','dc','damage','success'])$(k).oninput=()=>{reset();persist();if(k==='ability'&&targets.length)loadTargets(targets.map(t=>t.id)).catch(e=>message(e.message));};
function renderTargets(){
 $('count').textContent=String(targets.length);
 $('targets').innerHTML=targets.map((t,i)=>`<div class="target"><strong title="${esc(t.notes)}">${esc(t.name)} <small>${t.mod>=0?'+':''}${t.mod}</small></strong><select data-i="${i}" data-field="mode" aria-label="Бросок ${esc(t.name)}"><option value="0">Обыч.</option><option value="1">Преим.</option><option value="-1">Помеха</option></select><select data-i="${i}" data-field="defense" aria-label="Защита ${esc(t.name)}"><option value="normal">×1</option><option value="resist">½</option><option value="immune">0</option><option value="vulnerable">×2</option></select></div>`).join('');
 $('targets').querySelectorAll('select').forEach(el=>{el.value=String(targets[+el.dataset.i][el.dataset.field]);el.onchange=()=>{targets[+el.dataset.i][el.dataset.field]=el.dataset.field==='mode'?+el.value:el.value;reset();persist();};});
}
async function loadTargets(ids){
 if(locked)return;const version=++targetVersion,epoch=sceneEpoch;await check();const items=ids.length?await OBR.scene.items.getItems(ids):[];if(version!==targetVersion||epoch!==sceneEpoch)return;
 const next=items.filter(item=>item.metadata[P+'name']).map(item=>{const m=item.metadata,name=m[P+'name'],old=targets.find(t=>t.id===item.id);return {id:item.id,name,hp:number(m[P+'Z005'],'Хиты '+name),temp:number(m[P+'Z042']??0,'Временные хиты '+name),mod:saveModifier(m,$('ability').value),mode:old?.mode||0,defense:old?.defense||'normal',notes:`Сопротивления: ${m[P+'Z031']||'—'}; иммунитеты: ${m[P+'Z032']||'—'}; уязвимости: ${m[P+'Z030']||'—'}`};});
 targets=next;reset();renderTargets();message(targets.length?'':'Выдели токены на карте');persist();
}
function renderResults(){
 $('targets').hidden=true;
 $('results').innerHTML=`<h2>Урон: ${totalDamage}</h2><table><thead><tr><th>Цель</th><th>Спас</th><th>Урон</th><th>Хиты</th></tr></thead><tbody>${results.map((r,i)=>`<tr><td>${esc(r.name)}</td><td class="${r.save.success?'ok':'fail'}" title="${esc(r.save.dice.join('/'))} + ${r.mod}">${r.save.total} ${r.save.success?'✓':'×'}</td><td><input aria-label="Урон ${esc(r.name)}" type="number" min="0" step="1" data-result="${i}" value="${r.amount}"></td><td id="after${i}"></td></tr>`).join('')}</tbody></table>`;
 const preview=(r,i)=>{const h=health(r.hp,r.temp,r.amount);$('after'+i).textContent=`${r.hp}→${h.hp}`;$('after'+i).title=`Временные: ${r.temp}→${h.temp}`;};results.forEach(preview);
 $('results').querySelectorAll('input').forEach(el=>el.oninput=()=>{try{const r=results[+el.dataset.result];r.amount=number(el.value,'Урон');preview(r,+el.dataset.result);publish();$('apply').disabled=false;}catch(e){$('apply').disabled=true;message(e.message);}});
 $('results').querySelectorAll('input').forEach(el=>el.disabled=!!results.applied);
}
bind('roll',async()=>{
 if(results.length)return;if(!targets.length)throw Error('Выдели токены на карте');lock(true);persist();await check();reset();const epoch=sceneEpoch,snapshot=targets.map(t=>({...t})),dc=number($('dc').value,'СЛ'),onSuccess=$('success').value,visibility=$('visibility').value;
 if(dc<1||dc>100)throw Error('СЛ: 1–100');
 const notation=$('damage').value.toLowerCase().replaceAll('к','d').replace(/\s/g,'');
 if(!/^(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/.test(notation))throw Error('Урон: например 8d6+2');
 for(const [full,n,d] of notation.matchAll(/(\d+)d(\d+)/g))if(+n<1||+n>100||+d<2||+d>1000)throw Error('Слишком много костей');
 await ready(OBR);message('Dice+…');
 const d=/^\d+$/.test(notation)?{totalValue:Number(notation)}:await diceRoll(OBR,notation,visibility);if(epoch!==sceneEpoch)throw Error('Сцена изменилась');
 if(!Number.isSafeInteger(d.totalValue)||d.totalValue<0)throw Error('Некорректный урон Dice+');
 const sr=await diceRoll(OBR,saveNotation(snapshot),visibility);if(epoch!==sceneEpoch)throw Error('Сцена изменилась');
 const saves=saveTotals(sr,snapshot);
 results=snapshot.map((t,i)=>{const s={...saves[i],success:saves[i].total>=dc};return {...t,save:s,amount:damage(d.totalValue,s.success,onSuccess,t.defense)};});
 totalDamage=d.totalValue;renderResults();
 publicState='rolled';await publish();message('');
});
bind('apply',async()=>{await check();if(!results.length||results.applied)throw Error('Нет новых результатов');for(const el of $('results').querySelectorAll('input')){const r=results[+el.dataset.result];r.amount=number(el.value,'Урон');health(r.hp,r.temp,r.amount);}const ids=results.map(r=>r.id);const current=await OBR.scene.items.getItems(ids);if(current.length!==ids.length)throw Error('Одна из целей удалена. Загрузите цели заново.');const changes=[];await OBR.scene.items.updateItems(ids,items=>{for(const r of results){const item=items.find(t=>t.id===r.id);const m=item.metadata;if(number(m[P+'Z005'],'Хиты')!==r.hp||number(m[P+'Z042']??0,'Временные хиты')!==r.temp)throw Error('Хиты изменились: '+r.name+'. Загрузите цели заново.');}for(const r of results){const item=items.find(t=>t.id===r.id),m=item.metadata,h=health(r.hp,r.temp,r.amount);changes.push({id:r.id,before:{hp:m[P+'Z005'],temp:m[P+'Z042']},after:h});m[P+'Z005']=h.hp;m[P+'Z042']=h.temp;}});undo={sceneId,changes};results.applied=true;$('results').querySelectorAll('input').forEach(el=>el.disabled=true);$('undo').disabled=false;publicState='applied';await publish();message('Применено');});
bind('undo',async()=>{await check();if(!undo||undo.sceneId!==sceneId)throw Error('Нет применения для отмены');const ids=undo.changes.map(x=>x.id);if((await OBR.scene.items.getItems(ids)).length!==ids.length)throw Error('Цель удалена — отмена невозможна');await OBR.scene.items.updateItems(ids,items=>{for(const c of undo.changes){const m=items.find(i=>i.id===c.id).metadata;if(Number(m[P+'Z005'])!==c.after.hp||Number(m[P+'Z042']??0)!==c.after.temp)throw Error('После применения хиты изменились. Отмена остановлена.');}for(const c of undo.changes){const m=items.find(i=>i.id===c.id).metadata;m[P+'Z005']=c.before.hp;if(c.before.temp===undefined)delete m[P+'Z042'];else m[P+'Z042']=c.before.temp;}});undo=null;publicState='undone';await publish();message('Урон отменён');});
bind('clear',async()=>{lock(false);pendingIds=null;undo=null;reset();await publish();await loadTargets(await OBR.player.getSelection()||[]);});
OBR.onReady(async()=>{
 if(await OBR.player.getRole()!=='GM'){location.replace('./viewer.html');return;}
 OBR.scene.onReadyChange(async ready=>{storageKey=null;sceneEpoch++;targetVersion++;lock(false);sceneId=null;targets=[];pendingIds=null;undo=null;reset();renderTargets();$('undo').disabled=true;message('Сцена изменилась');if(ready){try{await check();if(!await restore())await loadTargets(await OBR.player.getSelection()||[]);}catch(e){message(e.message);}}});
 let selectionKey=null;
 const sync=ids=>{ids=ids||[];const key=JSON.stringify([...ids].sort());if(key===selectionKey)return;selectionKey=key;if(locked)return;if(busy){pendingIds=ids;return;}loadTargets(ids).catch(e=>{targets=[];reset();renderTargets();message(e.message);});};
 OBR.player.onChange(player=>sync(player.selection));
 try{await check();$('controls').disabled=false;if(!await restore())sync(await OBR.player.getSelection());}catch(e){message(e.message);}
});
