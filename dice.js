export const SOURCE='local.forge-combat';
export function ready(obr,timeout=2500){const requestId=crypto.randomUUID();return new Promise((resolve,reject)=>{let off=()=>{},timer;const finish=(e)=>{clearTimeout(timer);off();e?reject(e):resolve();};off=obr.broadcast.onMessage('dice-plus/isReady',({data})=>{if(data?.requestId===requestId&&data.ready===true)finish();});timer=setTimeout(()=>finish(Error('Включи Dice+ в комнате')),timeout);obr.broadcast.sendMessage('dice-plus/isReady',{requestId,timestamp:Date.now()},{destination:'LOCAL'}).catch(finish);});}
export async function diceRoll(obr,notation,rollTarget='everyone',timeout=45000){
 const playerId=await obr.player.getId(),playerName=await obr.player.getName(),rollId=crypto.randomUUID();
 return new Promise((resolve,reject)=>{let done=false,timer;const off=[];const finish=(err,result)=>{if(done)return;done=true;clearTimeout(timer);off.forEach(fn=>fn());err?reject(err):resolve(result);};
 off.push(obr.broadcast.onMessage(SOURCE+'/roll-result',({data})=>{if(data?.rollId!==rollId||data.playerId!==playerId)return;const r=data.result;if(!r||!Number.isFinite(r.totalValue))return finish(Error('Некорректный ответ Dice+'));finish(null,r);}));
 off.push(obr.broadcast.onMessage(SOURCE+'/roll-error',({data})=>{if(data?.rollId===rollId)finish(Error('Dice+: '+data.error));}));
 timer=setTimeout(()=>finish(Error('Dice+ не ответил. Хиты не изменены.')),timeout);
 obr.broadcast.sendMessage('dice-plus/roll-request',{rollId,playerId,playerName,rollTarget,diceNotation:notation,showResults:false,timestamp:Date.now(),source:SOURCE},{destination:'ALL'}).catch(e=>finish(e));
 });
}
export function saveNotation(targets){return targets.map((t,i)=>`${t.mode>0?'2d20kh1':t.mode<0?'2d20kl1':'1d20'}#FC${i}${t.mod>=0?'+':''}${t.mod}`).join(', ');}
export function saveTotals(result,targets){return targets.map((t,i)=>{const g=result.groups?.filter(g=>g.description===`FC${i}`);if(g?.length!==1||g[0].diceType!=='d20'||!Number.isSafeInteger(g[0].total)||g[0].total<1||g[0].total>20)throw Error('Не удалось сопоставить спасы Dice+. Хиты не изменены.');return {total:g[0].total+t.mod,dice:g[0].dice?.map(d=>d.value)||[]};});}
