import OBR from './sdk.js';
const ID='local.forge-combat',CHANNEL=ID+'/targets';
let ids=[];
async function publish(){await OBR.broadcast.sendMessage(CHANNEL,{ids},{destination:'LOCAL'});}
OBR.onReady(async()=>{
  OBR.scene.onReadyChange(()=>{ids=[];publish();});
  OBR.broadcast.onMessage(ID+'/get-targets',()=>publish());
  await OBR.tool.createMode({id:ID+'/pick',icons:[{icon:'/icon.svg',label:'Выбор целей',filter:{activeTools:[ID+'/tool'],roles:['GM']}}],onToolClick:(_,event)=>{
    const item=event.target;
    if(item?.metadata?.['com.battle-system.forge/name']){
      ids=ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id];
      OBR.player.select(ids,true);publish();
    }
    return false;
  }});
  await OBR.tool.create({id:ID+'/tool',defaultMode:ID+'/pick',icons:[{icon:'/icon.svg',label:'Спасы • цели кликом',filter:{roles:['GM']}}],onClick:()=>{
    (async()=>{const selection=await OBR.player.getSelection();if(selection?.length)ids=selection;await OBR.popover.open({id:ID+'/panel',url:'/index.html',width:360,height:460,anchorPosition:{left:Math.max(0,(await OBR.viewport.getWidth())-92),top:90},anchorReference:'POSITION',anchorOrigin:{horizontal:'LEFT',vertical:'TOP'},transformOrigin:{horizontal:'RIGHT',vertical:'TOP'},disableClickAway:true});})().catch(e=>OBR.notification.show(e.message,'ERROR'));
    return true;
  }});
});
