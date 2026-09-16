import {example,blank,clone,validate,points,defaultSequence,checks,summary} from './model.js';
const $=id=>document.getElementById(id);
let profile=example(),selected=1,selectedStep=-1,drawing=false,drawPoints=[],history=[],transform={scale:1,ox:0,oy:0};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n.toFixed(1));
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',4500);}
function remember(){history.push(clone(profile));if(history.length>60)history.shift();}
function geometryChanged(){profile.sequence=defaultSequence(profile);profile.evidence='Geometry edited. The sequence was reset to drawing order; handling and feasibility need operator review.';selectedStep=-1;}
function updateStatus(){ $('status').textContent='In this tab · save a profile file to keep changes'; }
function render(){
  for(const k of ['name','length','quantity','material','thickness','colour','heading','notes']) $(k).value=profile[k];
  $('drawing-title').textContent=profile.name||'Untitled flashing';
  $('girth').textContent=`${fmt(profile.legs.reduce((a,l)=>a+l.length,0))} mm`;
  $('draw').setAttribute('aria-pressed',String(drawing));$('draw').textContent=drawing?'Finish drawing':'Draw with clicks';
  $('canvas').classList.toggle('drawing-mode',drawing);
  $('canvas-hint').textContent=drawing?'Click points to add legs. Snaps to 5 mm / 15°. Finish drawing when done.':'Select a leg to edit its dimensions.';
  $('undo').disabled=!history.length;
  $('legs').innerHTML=profile.legs.map((l,i)=>`<div class="leg ${i===selected?'active':''}" data-leg="${i}"><div class="leg-head"><b>LEG ${i+1}${i?` / B${i}`:''}</b><button data-remove="${i}" aria-label="Remove leg ${i+1}" ${profile.legs.length===1?'disabled':''}>×</button></div><label>Length · mm<input data-field="length" type="number" min="1" max="10000" step="0.1" value="${l.length}"></label>${i?`<label>Joint<select data-field="type"><option value="bend" ${l.type==='bend'?'selected':''}>Bend</option><option value="hem" ${l.type==='hem'?'selected':''}>Open hem</option></select></label><label>${l.type==='hem'?'Return direction':'Turn · degrees'}${l.type==='hem'?`<select data-field="angle"><option value="180" ${l.angle>=0?'selected':''}>+180°</option><option value="-180" ${l.angle<0?'selected':''}>−180°</option></select>`:`<input data-field="angle" type="number" min="-179" max="179" step="0.1" value="${l.angle}">`}</label>${l.type==='hem'?`<label>Hem gap · mm<input data-field="gap" type="number" min="0" max="20" step="0.1" value="${l.gap}"></label>`:`<span class="small">Opening ${fmt(180-Math.abs(l.angle))}°</span>`}`:'<span class="small">First leg sets the starting direction.</span>'}</div>`).join('');
  $('sequence').innerHTML=profile.sequence.length?profile.sequence.map((s,i)=>`<div class="step ${selectedStep===i?'active':''}"><button class="step-number" data-step="${i}" aria-label="Highlight step ${i+1}">${i+1}</button><div class="step-title"><b>B${s.joint} · ${escape(s.stage)}</b><span>${profile.legs[s.joint].type==='hem'?`${profile.legs[s.joint].gap} mm gap`:`${profile.legs[s.joint].angle}° turn`}</span></div><select data-handling="${i}" aria-label="Handling for step ${i+1}">${[['unknown','Unconfirmed'],['none','No spin / flip'],['flip','Flip'],['spin','Spin'],['both','Spin + flip']].map(([v,t])=>`<option value="${v}" ${s.handling===v?'selected':''}>${t}</option>`).join('')}</select><div class="reorder"><button data-move="${i}" data-direction="-1" aria-label="Move step ${i+1} up" ${i===0?'disabled':''}>↑</button><button data-move="${i}" data-direction="1" aria-label="Move step ${i+1} down" ${i===profile.sequence.length-1?'disabled':''}>↓</button></div></div>`).join(''):'<p class="small">Add a second leg to create a bend.</p>';
  const spins=profile.sequence.filter(s=>['spin','both'].includes(s.handling)).length,flips=profile.sequence.filter(s=>['flip','both'].includes(s.handling)).length;
  $('counts').innerHTML=`<span><strong>${profile.sequence.length}</strong> operations</span><span><strong>${spins}</strong> recorded spins</span><span><strong>${flips}</strong> recorded flips</span>`;
  $('checks').innerHTML=checks(profile).map(c=>`<div class="check ${c.level}">${escape(c.text)}</div>`).join('');
  $('evidence').textContent=profile.evidence||'No operator-confirmed sequence recorded for this drawing.';
  renderCanvas();
}
function renderCanvas(){
  const raw=points(profile), xs=raw.map(p=>p.x),ys=raw.map(p=>p.y),rangeX=Math.max(...xs)-Math.min(...xs),rangeY=Math.max(...ys)-Math.min(...ys);
  if(!drawing) transform={scale:Math.min(680/Math.max(50,rangeX),330/Math.max(50,rangeY)),ox:450,oy:250};
  const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
  if(!drawing){transform.ox=450-cx*transform.scale;transform.oy=250+cy*transform.scale;}
  const pt=p=>({x:transform.ox+p.x*transform.scale,y:transform.oy-p.y*transform.scale});
  const ps=raw.map(p=>pt(drawing&&drawPoints.length?{x:p.x+drawPoints[0].x,y:p.y+drawPoints[0].y}:p)),joint=selectedStep>=0?profile.sequence[selectedStep]?.joint:selected;
  let svg='<defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="#d3dfe5"/></pattern></defs><rect width="900" height="500" fill="#f7fafb"/><rect width="900" height="500" fill="url(#grid)"/>';
  profile.legs.forEach((l,i)=>{let a=ps[i],b=ps[i+1];
    // Offset a terminal return only for legibility; lengths use the exact centreline.
    if((i===0&&profile.legs[1]?.type==='hem')||(i===profile.legs.length-1&&l.type==='hem')){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);a={x:a.x-dy/len*7,y:a.y+dx/len*7};b={x:b.x-dy/len*7,y:b.y+dx/len*7};}
    svg+=`<line class="profile-line ${selected===i?'selected-line':''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><line class="hit" data-select="${i}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><text text-anchor="middle" x="${(a.x+b.x)/2+((Math.abs(b.x-a.x)<10)?24:0)}" y="${(a.y+b.y)/2-13}">${fmt(l.length)}</text>`;
  });
  ps.slice(1,-1).forEach((p,j)=>{const i=j+1,l=profile.legs[i];svg+=`<circle class="bend-dot ${joint===i?'active-bend':''}" cx="${p.x}" cy="${p.y}" r="5"/><text class="bend-label" x="${p.x+12}" y="${p.y+23}">B${i} · ${l.type==='hem'?`${l.gap} mm hem`:`${l.angle}°`}</text>`;});
  if(drawing&&drawPoints.length)svg+=drawPoints.map(p=>{const q=pt(p);return `<circle cx="${q.x}" cy="${q.y}" r="4" fill="#db631e"/>`;}).join('');
  $('canvas').innerHTML=svg;
}
function change(mutator,{geometry=false}={}){const previous=clone(profile);remember();try{mutator();if(geometry)geometryChanged();validate(profile);updateStatus();render();}catch(e){profile=previous;history.pop();render();toast(e.message);}}
for(const k of ['name','length','quantity','material','thickness','colour','heading','notes']) $(k).addEventListener('change',()=>change(()=>{profile[k]=['length','quantity','thickness','heading'].includes(k)?Number($(k).value):$(k).value;},{geometry:k==='thickness'||k==='material'}));
$('legs').addEventListener('change',e=>{const input=e.target,i=Number(input.closest('[data-leg]')?.dataset.leg);if(!input.dataset.field)return;change(()=>{const k=input.dataset.field;profile.legs[i][k]=k==='type'?input.value:Number(input.value);if(k==='type')profile.legs[i].angle=input.value==='hem'?180:90;selected=i;},{geometry:true});});
$('legs').addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(remove)change(()=>{profile.legs.splice(Number(remove.dataset.remove),1);profile.legs[0].angle=0;profile.legs[0].type='bend';selected=Math.min(selected,profile.legs.length-1);},{geometry:true});});
$('add').onclick=()=>change(()=>{if(profile.legs.length>=40)throw Error('Maximum 40 legs.');profile.legs.push({length:50,angle:90,type:'bend',gap:2});selected=profile.legs.length-1;},{geometry:true});
$('sequence').addEventListener('click',e=>{const step=e.target.closest('[data-step]'),move=e.target.closest('[data-move]');if(step){selectedStep=Number(step.dataset.step);selected=profile.sequence[selectedStep].joint;render();}if(move)change(()=>{const i=Number(move.dataset.move),j=i+Number(move.dataset.direction);[profile.sequence[i],profile.sequence[j]]=[profile.sequence[j],profile.sequence[i]];profile.sequence.forEach(s=>s.handling='unknown');profile.evidence='Bend order changed. Previous handling confirmations no longer apply; review each transition.';selectedStep=j;});});
$('sequence').addEventListener('change',e=>{if(e.target.dataset.handling!==undefined)change(()=>{profile.sequence[Number(e.target.dataset.handling)].handling=e.target.value;profile.evidence='Handling edited manually in this prototype. Validate this exact order with the operator.';});});
$('reset-order').onclick=()=>change(()=>geometryChanged());
$('new').onclick=()=>{remember();profile=blank();selected=0;selectedStep=-1;drawing=false;render();toast('Blank drawing ready. Undo restores the previous profile.');};
$('example').onclick=()=>{remember();profile=example();selected=1;selectedStep=-1;drawing=false;render();};
$('undo').onclick=()=>{if(history.length){profile=history.pop();drawing=false;drawPoints=[];selected=0;selectedStep=-1;render();}};
$('fit').onclick=()=>{drawing=false;drawPoints=[];render();};
$('draw').onclick=()=>{drawing=!drawing;drawPoints=[];if(drawing){transform={scale:1,ox:150,oy:350};toast('Click the first point, then each corner. Your old profile stays available through Undo.');}render();};
$('canvas').addEventListener('click',e=>{
  if(!drawing){const hit=e.target.closest('[data-select]');if(hit){selected=Number(hit.dataset.select);selectedStep=-1;render();}return;}
  const coord=new DOMPoint(e.clientX,e.clientY).matrixTransform($('canvas').getScreenCTM().inverse());
  let p={x:(coord.x-transform.ox)/transform.scale,y:(transform.oy-coord.y)/transform.scale};
  if(!drawPoints.length){drawPoints.push(p);renderCanvas();return;}
  if(drawPoints.length>=41){toast('Maximum 40 legs.');return;}
  const last=drawPoints.at(-1),dx=p.x-last.x,dy=p.y-last.y,len=Math.round(Math.hypot(dx,dy)/5)*5;if(len<5)return;
  const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/12))*Math.PI/12;p={x:last.x+Math.cos(angle)*len,y:last.y+Math.sin(angle)*len};
  drawPoints.push(p);const newLegs=[];let previousAngle=0,heading=0;
  for(let i=1;i<drawPoints.length;i++){const a=drawPoints[i-1],b=drawPoints[i],theta=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;if(i===1)heading=theta;let turn=((theta-previousAngle+540)%360)-180;newLegs.push({length:fmt(Math.hypot(b.x-a.x,b.y-a.y)),angle:i===1?0:fmt(turn),type:'bend',gap:2});previousAngle=theta;}
  change(()=>{profile.legs=newLegs;profile.heading=fmt(heading);selected=newLegs.length-1;},{geometry:true});
});
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function filename(){return (profile.name||'flashing').replace(/[^a-z0-9_-]/gi,'-').slice(0,80);}
$('save').onclick=()=>{download(`${filename()}.json`,JSON.stringify(profile,null,2),'application/json');$('status').textContent='Profile file downloaded';};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{try{const file=$('file').files[0];if(!file)return;if(file.size>100000)throw Error('Profile file is too large.');const imported=validate(JSON.parse(await file.text()));remember();profile=clone(imported);drawing=false;selected=0;selectedStep=-1;render();toast('Profile opened.');}catch(e){toast(`Could not open profile: ${e.message}`);}finally{$('file').value='';}};
$('print').onclick=()=>window.print();
$('svg-export').onclick=()=>{const el=$('canvas').cloneNode(true);el.setAttribute('xmlns','http://www.w3.org/2000/svg');const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent='text{font:15px Arial;fill:#243e4b;paint-order:stroke;stroke:#f7fafb;stroke-width:4px}.bend-label{font-size:13px}.profile-line{stroke:#007b82;stroke-width:4;fill:none}.hit{display:none}.bend-dot{fill:white;stroke:#007b82;stroke-width:2}.active-bend{fill:#db631e}';el.prepend(style);download(`${filename()}.svg`,new XMLSerializer().serializeToString(el),'image/svg+xml');};
$('email').onclick=()=>{location.href=`mailto:?subject=${encodeURIComponent(`Flashing for review — ${profile.name}`)}&body=${encodeURIComponent(summary(profile))}`;toast('Email draft requested. Attach your PDF or SVG before sending.');};
if(document.modelContext?.registerTool){Promise.resolve(document.modelContext.registerTool({name:'read_flashing_profile',description:'Read the current flashing geometry, draft sequence and outstanding checks.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({profile:clone(profile),checks:checks(profile)})})).catch(()=>{});}
render();
