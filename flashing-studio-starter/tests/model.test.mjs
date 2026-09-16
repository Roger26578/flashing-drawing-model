import test from 'node:test';
import assert from 'node:assert/strict';
import {example,blank,points,validate,checks,defaultSequence,summary} from '../dist/model.js';
import worker from '../worker.mjs';
test('observed custom-soffit dimensions and handling are preserved',()=>{
  const p=example();validate(p);assert.equal(p.legs.reduce((a,l)=>a+l.length,0),250);
  assert.deepEqual(p.sequence.map(s=>s.joint),[1,1,5,5,4,3,2]);
  assert.equal(p.sequence[5].handling,'both');assert.equal(checks(p).filter(c=>c.level==='error').length,0);
  assert.equal(p.sequence.filter(s=>s.handling==='unknown').length,6);
});
test('signed turns produce independent known right-angle coordinates',()=>{
  const p=blank();p.heading=0;p.legs=[{length:100,angle:0,type:'bend',gap:2},{length:50,angle:90,type:'bend',gap:2},{length:25,angle:-90,type:'bend',gap:2}];
  const result=points(p);assert.deepEqual(result.slice(0,3),[{x:0,y:0},{x:100,y:0},{x:100,y:50}]);assert.equal(result[3].x,125);assert.equal(result[3].y,50);
});
test('hem folds back independent of user-entered ordinary bend angle',()=>{
  const p=blank();p.legs.push({length:25,angle:177,type:'hem',gap:2});
  const end=points(p).at(-1);assert.ok(Math.abs(end.x-75)<1e-8);assert.ok(Math.abs(end.y)<1e-8);
});
test('length capacity flags only an actual exceedance',()=>{
  const p=example();p.length=6400;assert.equal(checks(p).filter(c=>c.level==='error').length,0);
  p.length=6401;assert.match(checks(p)[0].text,/exceeds/);
});
test('missing, duplicated and reversed hem operations are detected',()=>{
  for(const mutate of [p=>p.sequence.shift(),p=>p.sequence.push({...p.sequence[0]}),p=>[p.sequence[0],p.sequence[1]]=[p.sequence[1],p.sequence[0]]]){const p=example();mutate(p);assert.ok(checks(p).some(c=>c.level==='error'));}
});
test('draft order does not invent handling confirmations',()=>{
  const p=example();p.sequence=defaultSequence(p);assert.ok(p.sequence.every(s=>s.handling==='unknown'));assert.equal(checks(p).filter(c=>c.level==='error').length,0);
});
test('profile JSON roundtrips and rejects corrupt data',()=>{
  const p=example();assert.deepEqual(validate(JSON.parse(JSON.stringify(p))),p);
  for(const mutate of [p=>p.legs[0].length=-1,p=>p.quantity=1.5,p=>p.sequence[0].joint=99,p=>p.legs[1].gap=Infinity,p=>p.version=2,p=>p.legs=[]]){const bad=example();mutate(bad);assert.throws(()=>validate(bad));}
});
test('email summary includes dimensions, operation and limits',()=>{
  const text=summary(example());assert.match(text,/250 mm/);assert.match(text,/6\. B3 Bend — Spin \+ flip/);assert.match(text,/No collision/);
});
test('worker has no AI access by default and protects configured endpoint',async()=>{
  let called=false;const request=()=>new Request('https://example.test/api/review',{method:'POST',body:JSON.stringify(example())});
  assert.equal((await worker.fetch(request(),{})).status,503);
  const env={AI:{run:async()=>{called=true;return {response:'Draft suggestion'};}},AI_MODEL:'configured-model',AI_REVIEW_TOKEN:'test-token'};
  assert.equal((await worker.fetch(request(),env)).status,401);assert.equal(called,false);
  const good=new Request('https://example.test/api/review',{method:'POST',headers:{Authorization:'Bearer test-token'},body:JSON.stringify(example())});
  const response=await worker.fetch(good,env);assert.equal(response.status,200);assert.equal((await response.json()).status,'suggestion-only');assert.equal(called,true);
});
test('worker rejects malformed authorised profiles and unknown routes',async()=>{
  const env={AI:{},AI_MODEL:'configured-model',AI_REVIEW_TOKEN:'test-token'};
  const request=new Request('https://example.test/api/review',{method:'POST',headers:{Authorization:'Bearer test-token'},body:'{"version":1}'});
  assert.equal((await worker.fetch(request,env)).status,400);
  assert.equal((await worker.fetch(new Request('https://example.test/api/other'),{})).status,404);
});
