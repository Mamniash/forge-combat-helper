import OBR from './sdk.js';
OBR.onReady(async()=>{await OBR.tool.create({id:'local.forge-combat/tool',icons:[{icon:'/icon.svg',label:'Массовые спасы и урон',filter:{roles:['GM']}}],onClick:(_,elementId)=>{OBR.popover.open({id:'local.forge-combat/panel',url:'/index.html',width:520,height:700,anchorElementId:elementId});return false;}});});
