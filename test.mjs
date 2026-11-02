import test from 'node:test';import assert from 'node:assert/strict';import {roll,save,damage,health,number} from './core.js';
test('one shared damage roll',()=>assert.equal(roll('8d6',()=>4).total,32));
test('safe expression parsing',()=>{assert.equal(roll('2d8+3',()=>5).total,13);assert.throws(()=>roll('alert(1)'));assert.throws(()=>roll('10000d6'));});
test('save ties succeed; natural 1/20 do not override totals',()=>{assert.equal(save(5,15,0,()=>10).success,true);assert.equal(save(0,25,0,()=>20).success,false);assert.equal(save(20,15,0,()=>1).success,true);});
test('advantage and disadvantage',()=>{let a=[2,17];assert.equal(save(2,15,1,()=>a.shift()).total,19);a=[2,17];assert.equal(save(2,15,-1,()=>a.shift()).total,4);});
test('half then resistance rounding',()=>assert.equal(damage(31,true,'half','resist'),7));
test('immunity and vulnerability',()=>{assert.equal(damage(31,false,'half','immune'),0);assert.equal(damage(31,true,'half','vulnerable'),30);});
test('temporary hp absorbed first, zero floor',()=>{assert.deepEqual(health(38,6,28),{hp:16,temp:0});assert.deepEqual(health(38,6,4),{hp:38,temp:2});assert.deepEqual(health(5,0,28),{hp:0,temp:0});});
test('missing data never becomes zero silently',()=>{assert.throws(()=>number('','HP'));assert.throws(()=>number(undefined,'save'));assert.equal(number('+5','save'),5);});
