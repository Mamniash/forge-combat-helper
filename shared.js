export const RESULT_KEY='local.forge-combat/results';
export function publicResults(results,state='rolled'){
 return {state,rows:results.map(r=>({name:String(r.name),total:r.save.total,success:!!r.save.success,damage:r.amount}))};
}
