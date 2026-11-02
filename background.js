import OBR from './sdk.js';
const ID='local.forge-combat';
OBR.onReady(async()=>{
 await OBR.tool.create({id:ID+'/tool',icons:[{icon:'/icon.svg',label:'Спасы и урон',filter:{roles:['GM']}}],onClick:()=>{
  (async()=>{await OBR.popover.open({id:ID+'/panel',url:'/index.html',width:270,height:460,anchorPosition:{left:Math.max(0,(await OBR.viewport.getWidth())-92),top:90},anchorReference:'POSITION',anchorOrigin:{horizontal:'LEFT',vertical:'TOP'},transformOrigin:{horizontal:'RIGHT',vertical:'TOP'},disableClickAway:true});})().catch(e=>OBR.notification.show(e.message,'ERROR'));
  return false;
 }});
});
