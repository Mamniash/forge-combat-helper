import OBR from './sdk.js';
import {RESULT_KEY} from './shared.js';
const $=id=>document.getElementById(id);
$('close').onclick=()=>OBR.popover.close('local.forge-combat/panel');
function render(metadata){
 const data=metadata[RESULT_KEY];
 $('results').replaceChildren();
 $('status').textContent= data?.rows?.length?({rolled:'Ожидает применения',applied:'Урон применён',undone:'Урон отменён'}[data.state]||''):'Пока нет результатов';
 if(!Array.isArray(data?.rows)||!data.rows.length)return;
 const table=document.createElement('table'),head=table.createTHead().insertRow();
 for(const text of ['Цель','Спас','Урон']){const th=document.createElement('th');th.textContent=text;head.append(th);}
 const body=table.createTBody();
 for(const r of data.rows){const row=body.insertRow();row.insertCell().textContent=r.name;const save=row.insertCell();save.textContent=r.total+' '+(r.success?'✓':'×');save.className=r.success?'ok':'fail';row.insertCell().textContent=r.damage;}
 $('results').append(table);
}
OBR.onReady(async()=>{
 let version=0;
 const refresh=async()=>{const v=++version;render({});try{if(await OBR.scene.isReady()){const m=await OBR.scene.getMetadata();if(v===version)render(m);}}catch(e){$('status').textContent=e.message;}};
 OBR.scene.onMetadataChange(m=>{version++;render(m);});
 OBR.scene.onReadyChange(refresh);
 await refresh();
});
