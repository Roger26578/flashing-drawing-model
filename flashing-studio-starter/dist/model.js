export const VERSION = 1;
export const machine = { name: 'Variobend · single action · 6.4 m', maxLength: 6400 };
export const clone = x => structuredClone(x);
export function example() {
  return { version: VERSION, name: 'P3 4 Custom Soffit A', length: 2700, quantity: 1, material: 'Steel', thickness: 0.55, colour: '', notes: '', heading: 180,
    legs: [{length:15,angle:0,type:'bend',gap:2},{length:80,angle:180,type:'hem',gap:2},{length:40,angle:-90,type:'bend',gap:2},{length:25,angle:-90,type:'bend',gap:2},{length:80,angle:90,type:'bend',gap:2},{length:10,angle:180,type:'hem',gap:2}],
    sequence: [{joint:1,stage:'Prebend',handling:'unknown'},{joint:1,stage:'Close hem',handling:'unknown'},{joint:5,stage:'Prebend',handling:'unknown'},{joint:5,stage:'Close hem',handling:'unknown'},{joint:4,stage:'Bend',handling:'unknown'},{joint:3,stage:'Bend',handling:'both'},{joint:2,stage:'Bend',handling:'unknown'}],
    evidence: 'Observed order in Variobend. Operator confirmed a physical spin AND flip at step 6 on 11 September 2026. This applies to this sequence, not all stepped profiles. Hem gaps are draft values. The final 10 mm return is inferred from the displayed girth; check it against the source.' };
}
export function blank() { return {...example(),name:'Untitled flashing',heading:0,legs:[{length:100,angle:0,type:'bend',gap:2}],sequence:[],evidence:''}; }
export function validate(p) {
  if (!p || p.version !== VERSION) throw Error('Unsupported profile file version.');
  for (const k of ['name','material','colour','notes','evidence']) if(typeof p[k] !== 'string' || p[k].length>5000) throw Error(`Invalid ${k}.`);
  for (const [k,min,max] of [['length',1,50000],['quantity',1,100000],['thickness',0.01,50],['heading',-360,360]]) if(!Number.isFinite(p[k]) || p[k]<min || p[k]>max) throw Error(`Invalid ${k}.`);
  if(!Number.isInteger(p.quantity)) throw Error('Quantity must be a whole number.');
  if(!Array.isArray(p.legs) || !p.legs.length || p.legs.length>40) throw Error('Use between 1 and 40 legs.');
  for(const l of p.legs) if(!Number.isFinite(l.length)||l.length<1||l.length>10000||!Number.isFinite(l.angle)||Math.abs(l.angle)>180||!['bend','hem'].includes(l.type)||!Number.isFinite(l.gap)||l.gap<0||l.gap>20) throw Error('Invalid leg dimensions or bend.');
  if(!Array.isArray(p.sequence)||p.sequence.length>100) throw Error('Invalid sequence.');
  for(const s of p.sequence) if(!Number.isInteger(s.joint)||s.joint<1||s.joint>=p.legs.length||!['Bend','Prebend','Close hem'].includes(s.stage)||!['unknown','none','flip','spin','both'].includes(s.handling)) throw Error('Invalid sequence step.');
  return p;
}
export function points(p) {
  let a=p.heading*Math.PI/180, x=0,y=0;
  const out=[{x,y}];
  p.legs.forEach((l,i)=>{ if(i) a+=(l.type==='hem' ? (l.angle<0?-180:180):l.angle)*Math.PI/180; x+=Math.cos(a)*l.length;y+=Math.sin(a)*l.length;out.push({x,y}); });
  return out;
}
export function defaultSequence(p) {
  return p.legs.flatMap((l,i)=>!i?[]:l.type==='hem'?[{joint:i,stage:'Prebend',handling:'unknown'},{joint:i,stage:'Close hem',handling:'unknown'}]:[{joint:i,stage:'Bend',handling:'unknown'}]);
}
export function checks(p) {
  const messages=[];
  if(p.length>machine.maxLength) messages.push({level:'error',text:`Sheet length exceeds the stated 6,400 mm working length by ${p.length-machine.maxLength} mm.`});
  p.legs.forEach((l,i)=>{ if(!i)return; const steps=p.sequence.filter(s=>s.joint===i);
    const expected=l.type==='hem'?['Prebend','Close hem']:['Bend'];
    if(steps.map(s=>s.stage).join('|')!==expected.join('|')) messages.push({level:'error',text:`B${i} needs ${expected.join(' then ')} exactly once, in that order.`});
  });
  const unknown=p.sequence.filter(s=>s.handling==='unknown').length;
  if(unknown) messages.push({level:'note',text:`Handling is unconfirmed for ${unknown} step${unknown===1?'':'s'}. Spin totals are incomplete.`});
  messages.push({level:'note',text:'Tooling clearance, collisions, minimum grip and material capacity have not been modelled. This is an editable sequence, not a machine simulation.'});
  return messages;
}
export function summary(p) {
  const handling={unknown:'Unconfirmed',none:'No spin / flip',flip:'Flip',spin:'Spin',both:'Spin + flip'};
  return [`${p.name}`,`${p.quantity} × ${p.length} mm | ${p.thickness} mm ${p.material} | ${p.colour||'Colour unspecified'}`,`Nominal girth: ${p.legs.reduce((a,l)=>a+l.length,0)} mm (no bend allowance)`,...p.legs.map((l,i)=>`Leg ${i+1}: ${l.length} mm${i?`; B${i}: ${l.type==='hem'?`hem, ${l.gap} mm gap`:`${l.angle}° signed turn from flat`}`:''}`),'','Draft sequence:',...p.sequence.map((s,i)=>`${i+1}. B${s.joint} ${s.stage} — ${handling[s.handling]}`),'',p.notes,'Operator review required. No collision or tooling verification.'].join('\n');
}
