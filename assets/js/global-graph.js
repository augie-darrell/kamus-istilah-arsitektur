(function(root){
  'use strict';
  const palette=['#638650','#9f9868','#739786','#a78261','#809b60','#7d91a1','#b39a70','#93a07d','#a497a9','#78885f','#8ba29b','#aaaa91'];
  const types={kb:'Kata benda',aj:'Kata sifat',kk:'Kata kerja',ks:'Kata sambung',kkt:'Kata kerja transitif',adv:'Kata keterangan',num:'Kata bilangan',p:'Partikel',pron:'Kata ganti',interj:'Kata seru',other:'Belum ditandai'};
  const typeKeyCache=new WeakMap();
  function typeKeysFor(index){
    if(!typeKeyCache.has(index)){const Content=typeof module!=='undefined'&&module.exports?require('./entry-content.js'):root.KamusContent;typeKeyCache.set(index,new Map([...index.byId.values()].map(e=>[e.id,Content?.wordTypeSummary(e).codes||[e.word_type].filter(Boolean)])));}
    return typeKeyCache.get(index);
  }
  function build(index,groupBy='theme',title='Kamus Istilah Arsitektur',requestedPath=[]){
    const themes=index.associations?.themes||[],categories=index.associations?.categories||[],hasParents=categories.length>0;
    const typeKeys=typeKeysFor(index);
    const themed=hasParents?['category','theme']:['theme'];
    const order=groupBy==='language'?['language',...themed,'type']:groupBy==='type'?['type',...themed,'language']:[...themed,'language','type'];
    const themeLabels=new Map(themes.map(t=>[t.id,t.label])),parents=new Map(themes.map(t=>[t.id,t.parent||'general'])),categoryLabels=new Map(categories.map(c=>[c.id,c.label]));
    let entries=[...index.byId.values()],path=[];
    const entryThemes=e=>{const tags=index.associations?.byEntry[e.id];return tags?.themes?.length?tags.themes:[tags?.primary||'general'];};
    function keys(e,facet){
      if(facet==='category')return [...new Set(entryThemes(e).map(id=>parents.get(id)||'general'))];
      if(facet==='theme'){const parent=path.find(p=>p.facet==='category')?.key;return entryThemes(e).filter(id=>!parent||(parents.get(id)||'general')===parent);}
      return facet==='type'?(typeKeys.get(e.id)?.length?typeKeys.get(e.id):['other']):[e.languages[0]?.code||'und'];
    }
    const label=(e,facet,key)=>facet==='category'?(categoryLabels.get(key)||'Umum'):facet==='theme'?(themeLabels.get(key)||'Umum'):facet==='type'?(types[key]||'Label '+key):(key==='und'?'Label belum jelas':e.languages[0].name);
    for(const part of Array.isArray(requestedPath)?requestedPath:[]){
      if(!order.includes(part.facet)||path.some(p=>p.facet===part.facet))break;
      const subset=entries.filter(e=>keys(e,part.facet).includes(part.key));if(!subset.length)break;
      path.push({facet:part.facet,key:part.key,label:label(subset[0],part.facet,part.key)});entries=subset;
    }
    const facet=order.find(f=>!path.some(p=>p.facet===f)&&(!path.length||new Set(entries.flatMap(e=>keys(e,f))).size>1));
    const groups=new Map();
    if(facet)for(const entry of entries)for(const k of keys(entry,facet)){if(!groups.has(k))groups.set(k,{id:'group:'+facet+':'+k,kind:'group',facet,key:k,term:label(entry,facet,k),children:[]});groups.get(k).children.push(entry);}
    const ordered=[...groups.values()].sort((a,b)=>b.children.length-a.children.length),placed=[];
    const rootNode={id:'catalogue-root',kind:'root',term:path.at(-1)?.label||title,x:0,y:0,vx:0,vy:0,r:15,color:'#254d40'},nodes=[rootNode],hierarchy=[],placedEntries=new Set();
    function addEntries(children,parent,cx,cy,radius,color){
      children.sort((a,b)=>a.term.localeCompare(b.term,'id'));
      children.forEach((e,j)=>{hierarchy.push({source:parent,target:e.id,type:'grouping'});if(placedEntries.has(e.id))return;placedEntries.add(e.id);const angle=j*Math.PI*(3-Math.sqrt(5)),rr=radius*Math.sqrt((j+.5)/children.length),ox=Math.cos(angle)*rr,oy=Math.sin(angle)*rr;nodes.push({id:e.id,term:e.term,kind:'entry',parent,degree:index.adj.get(e.id)?.size||0,x:cx+ox,y:cy+oy,ox,oy,vx:0,vy:0,r:2.8,color});});
    }
    ordered.forEach((group,i)=>{
      const radius=Math.max(45,Math.sqrt(group.children.length)*7.5);let cx=0,cy=0;
      for(let attempt=0;attempt<2000;attempt++){const angle=attempt*Math.PI*(3-Math.sqrt(5))-.9,orbit=radius+150+Math.sqrt(attempt)*30;cx=Math.cos(angle)*orbit;cy=Math.sin(angle)*orbit;if(placed.every(p=>Math.hypot(p.x-cx,p.y-cy)>p.radius+radius+55))break;}
      placed.push({x:cx,y:cy,radius});
      const hub={...group,rank:i,count:group.children.length,x:cx,y:cy,ox:cx,oy:cy,vx:0,vy:0,r:10,color:palette[i%palette.length]};delete hub.children;nodes.push(hub);hierarchy.push({source:rootNode.id,target:hub.id,type:'grouping'});
      addEntries(group.children,hub.id,cx,cy,radius,hub.color);
    });
    if(!facet)addEntries(entries,rootNode.id,0,0,Math.max(70,Math.sqrt(entries.length)*13),palette[0]);
    const ids=new Set(entries.map(e=>e.id)),semantic=index.edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
    return {nodes,hierarchy,semantic,groupBy,facet,path,groupCount:ordered.length,entryCount:entries.length,totalEntryCount:index.byId.size};
  }
  function mount(container,index,{title='Kamus Istilah Arsitektur',onSelect,onExpand,groupBy:initialGroup,path:initialPath=[],showControls=true}={}){
    const groupNames={theme:'Tema',language:'Bahasa',type:'Jenis kata'};
    function storedGroup(){try{const value=localStorage.getItem('kamus-global-group-v1');return groupNames[value]?value:'theme';}catch{return 'theme';}}
    container.innerHTML='<nav class="global-breadcrumb" aria-label="Lokasi dalam grafik" hidden></nav><div class="global-stage"><canvas tabindex="0" aria-label="Grafik seluruh kamus"></canvas><div class="global-tooltip"></div><div class="global-label-targets"></div><button class="graph-steps graph-group-toggle" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12M6 6v12h12M6 12h12"/><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="18" cy="18" r="2.5"/></svg></button><div class="graph-group-menu" role="menu" hidden><button data-group="theme" role="menuitemradio">Tema</button><button data-group="language" role="menuitemradio">Bahasa</button><button data-group="type" role="menuitemradio">Jenis kata</button></div></div>';
    container.insertAdjacentHTML('beforeend',root.KamusGraph.legend(true));
    const labelTargets=container.querySelector('.global-label-targets'),groupTargets=new Map(),breadcrumb=container.querySelector('.global-breadcrumb'),stage=container.querySelector('.global-stage'),canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),tooltip=container.querySelector('.global-tooltip'),groupButton=container.querySelector('.graph-group-toggle'),groupMenu=container.querySelector('.graph-group-menu');
    groupButton.hidden=!showControls;
    let groupBy=groupNames[initialGroup]?initialGroup:storedGroup(),path=initialPath,model,byId,semanticGroups=[],labelBoxes=[],autoFit=true,width=1,height=1,scale=1,tx=0,ty=0,paused=true,frameId,lastFrame=0,activeUntil=0,hover,drag,pan,moved=false,dragNeighbors=new Set();
    function prepare(){model=build(index,groupBy,title,path);semanticGroups=Object.entries(root.KamusGraph.connections).filter(([type])=>type!=='grouping').map(([type,style])=>({style,edges:model.semantic.filter(e=>e.type===type)}));path=model.path;autoFit=true;renderBreadcrumb();labelTargets.replaceChildren();groupTargets.clear();for(const node of model.nodes){if(node.kind!=='group')continue;const b=document.createElement('button');b.type='button';b.className='global-group-target';b.setAttribute('aria-label','Buka kelompok '+node.term+', '+node.count+' istilah');b.title=node.term+' · '+node.count+' istilah';b.hidden=true;b.addEventListener('click',()=>{path=[...path,{facet:node.facet,key:node.key}];prepare();resize();});labelTargets.append(b);groupTargets.set(node.id,b);}byId=new Map(model.nodes.map(n=>[n.id,n]));hover=null;tooltip.textContent='';const label='Kelompokkan: '+groupNames[groupBy];groupButton.setAttribute('aria-label',label);groupButton.title=label;canvas.setAttribute('aria-label','Grafik '+(path.map(p=>p.label).join(' / ')||'seluruh kamus')+', '+model.entryCount.toLocaleString('id-ID')+' istilah');groupMenu.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-checked',b.dataset.group===groupBy));fit();wake(4000);}
    function renderBreadcrumb(){
      breadcrumb.replaceChildren();breadcrumb.hidden=!path.length;if(!path.length)return;
      const add=(text,depth,cls)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.dataset.depth=depth;breadcrumb.append(b);return b;};
      add('←',path.length-1,'scope-back').setAttribute('aria-label','Kembali satu kelompok');add('Semua',0,'');
      path.forEach((p,i)=>{const sep=document.createElement('span');sep.textContent='›';sep.setAttribute('aria-hidden','true');breadcrumb.append(sep);const b=add(p.label,i+1,i===path.length-1?'scope-current':'');if(i===path.length-1)b.setAttribute('aria-current','location');});
      const count=document.createElement('span');count.className='scope-count';count.textContent=model.entryCount.toLocaleString('id-ID')+' istilah';breadcrumb.append(count);
    }
    breadcrumb.addEventListener('click',event=>{const button=event.target.closest('[data-depth]');if(!button)return;path=path.slice(0,Number(button.dataset.depth));prepare();resize();});
    function resize(){const rect=stage.getBoundingClientRect();if(rect.width<1||rect.height<1)return;const ratio=Math.min(2,devicePixelRatio||1);width=rect.width;height=rect.height;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);fit();draw();}
    function fit(){if(!model)return;const xs=model.nodes.map(n=>n.x),ys=model.nodes.map(n=>n.y),minX=Math.min(...xs)-130,maxX=Math.max(...xs)+130,minY=Math.min(...ys)-130,maxY=Math.max(...ys)+130;scale=Math.min(width/(maxX-minX),height/(maxY-minY))*.82;tx=width/2-(minX+maxX)/2*scale;ty=height/2-(minY+maxY)/2*scale;}
    const position=event=>{const rect=canvas.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};},world=p=>({x:(p.x-tx)/scale,y:(p.y-ty)/scale});
    function hit(point){for(const box of labelBoxes)if(point.x>=box.left&&point.x<=box.right&&point.y>=box.top&&point.y<=box.bottom)return byId.get(box.id);let found,dist=Infinity;for(const n of model.nodes){const d=Math.hypot(n.x-point.x,n.y-point.y),limit=(n.kind==='entry'?5:12)/scale;if(d<limit&&d<dist){found=n;dist=d;}}return found;}
    function zoom(factor,point={x:width/2,y:height/2}){const before=world(point);scale=Math.max(.025,Math.min(5,scale*factor));tx=point.x-before.x*scale;ty=point.y-before.y*scale;draw();}
    function physics(){
      const centre=byId.get('catalogue-root');
      for(const n of model.nodes){
        if(drag?.node===n){n.vx=0;n.vy=0;continue;}
        let targetX=0,targetY=0,strength=.012;
        if(n.kind==='group'){targetX=centre.x+n.ox;targetY=centre.y+n.oy;strength=.015;}
        if(n.kind==='entry'){const parent=byId.get(n.parent);targetX=parent.x+n.ox;targetY=parent.y+n.oy;strength=groupBy==='theme'?.003:.009;}
        n.vx+=(targetX-n.x)*strength;n.vy+=(targetY-n.y)*strength;
      }
      // Real term links shape the layout, independently of catalogue membership.
      // Degree normalization prevents broad headwords from collapsing a family.
      for(const edge of model.semantic){const a=byId.get(edge.source),b=byId.get(edge.target),dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy)||1,weight=edge.weight||1,length=a.parent===b.parent?45:130,force=(distance-length)*.018*weight/Math.max(1,Math.sqrt(Math.max(a.degree,b.degree))),fx=dx/distance*force,fy=dy/distance*force;if(drag?.node!==a){a.vx+=fx;a.vy+=fy;}if(drag?.node!==b){b.vx-=fx;b.vy-=fy;}}
      // Nearby catalog nodes gently repel. A spatial grid keeps work bounded for
      // all 6,603 entries instead of comparing every pair.
      const cells=new Map(),size=25;
      for(const n of model.nodes){if(n.kind!=='entry')continue;const key=Math.floor(n.x/size)+':'+Math.floor(n.y/size);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(n);}
      for(const n of model.nodes){if(n.kind!=='entry'||drag?.node===n)continue;const gx=Math.floor(n.x/size),gy=Math.floor(n.y/size);for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){const nearby=cells.get((gx+ox)+':'+(gy+oy))||[];for(let j=0;j<Math.min(22,nearby.length);j++){const other=nearby[j];if(other===n)continue;const dx=n.x-other.x,dy=n.y-other.y,d2=dx*dx+dy*dy;if(d2>0&&d2<160){const f=.22/(d2+3);n.vx+=dx*f;n.vy+=dy*f;}}}}
      if(drag?.node?.kind==='entry')for(const id of dragNeighbors){const other=byId.get(id);if(other){other.vx+=(drag.node.x-other.x)*.0015;other.vy+=(drag.node.y-other.y)*.0015;}}
      for(const n of model.nodes){if(drag?.node===n)continue;n.vx*=.76;n.vy*=.76;n.x+=Math.max(-35,Math.min(35,n.vx));n.y+=Math.max(-35,Math.min(35,n.vy));}
    }
    function draw(){
      if(!model||paused)return;ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(tx,ty);ctx.scale(scale,scale);
      ctx.lineCap='butt';ctx.beginPath();for(const e of model.hierarchy){const a=byId.get(e.source),b=byId.get(e.target);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.strokeStyle=scale<.2?'rgba(115,143,91,.035)':'rgba(115,143,91,.12)';ctx.lineWidth=.65/scale;ctx.setLineDash([5/scale,5/scale]);ctx.stroke();ctx.setLineDash([]);
      const focus=drag?.node||hover,neighbors=focus?.kind==='entry'?new Set([...(index.adj.get(focus.id)||[])].filter(id=>byId.has(id))):new Set(),labels=new Set([...neighbors].slice(0,9));
      for(const {style,edges} of semanticGroups){ctx.beginPath();for(const e of edges){const a=byId.get(e.source),b=byId.get(e.target);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.lineCap=style.cap;ctx.strokeStyle=style.color;ctx.globalAlpha=focus?.kind==='entry'?.025:scale<.2?.045:.2;ctx.lineWidth=.7/scale;ctx.setLineDash(style.dash.map(d=>d/scale));ctx.stroke();}ctx.globalAlpha=1;ctx.setLineDash([]);if(focus?.kind==='entry'){for(const {style,edges} of semanticGroups){ctx.beginPath();for(const edge of edges){if(edge.source!==focus.id&&edge.target!==focus.id)continue;const a=byId.get(edge.source),b=byId.get(edge.target);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.lineCap=style.cap;ctx.strokeStyle=style.color;ctx.lineWidth=1.1/scale;ctx.setLineDash(style.dash.map(d=>d/scale));ctx.stroke();}ctx.setLineDash([]);}
      for(const n of model.nodes){const radius=n.kind==='root'?9/scale:n.kind==='group'?5.5/scale:Math.max(.5/scale,Math.min(4/scale,n.r));ctx.beginPath();ctx.arc(n.x,n.y,radius,0,Math.PI*2);ctx.fillStyle=n===focus?'#ba9c52':neighbors.has(n.id)?'#547c40':focus?.kind==='entry'&&n.kind==='entry'?'#c8d2b9':n.color;ctx.fill();}
      labelBoxes=[];for(const button of groupTargets.values())button.hidden=true;const occupied=[],candidates=model.nodes.filter(n=>n.kind!=='entry'||n===focus||labels.has(n.id)||(path.length&&(model.entryCount<=100||scale>.65))).sort((a,b)=>(a.kind==='root'?-3:a===focus?-2:a.kind==='entry'?100:a.rank)-(b.kind==='root'?-3:b===focus?-2:b.kind==='entry'?100:b.rank));
      for(const n of candidates){if(n.kind==='group'&&n.rank>7&&model.groupCount>12&&scale<.32&&n!==focus)continue;const font=n.kind==='root'?15:n.kind==='group'?11:13;ctx.font=(n.kind==='root'?'600 ':'')+(font/scale)+'px Segoe UI, Arial';ctx.textAlign='center';ctx.lineWidth=3/scale;ctx.strokeStyle='#eef2e6';const label=n.term+(n.kind==='group'?' · '+n.count:''),w=ctx.measureText(label).width,h=(font+5)/scale,labelX=Math.max((5-tx)/scale+w/2,Math.min((width-5-tx)/scale-w/2,n.x));let y;
        for(const offset of [22,-15,39,-32,56,-49,73,-66,90,-83,107,-100]){const candidateY=n.y+offset/scale,screenY=candidateY*scale+ty;if(screenY-font-5<2||screenY+3>height-2)continue;const box={left:labelX-w/2-3/scale,right:labelX+w/2+3/scale,top:candidateY-h,bottom:candidateY+3/scale};if(!occupied.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top)){occupied.push(box);labelBoxes.push({...box,id:n.id});const button=groupTargets.get(n.id);if(button){button.hidden=false;button.style.left=(box.left*scale+tx)+'px';button.style.top=(box.top*scale+ty)+'px';button.style.width=((box.right-box.left)*scale)+'px';button.style.height=((box.bottom-box.top)*scale)+'px';}y=candidateY;break;}}
        if(y===undefined)continue;ctx.strokeText(label,labelX,y);ctx.fillStyle=n.kind==='root'?'#254d40':'#6b8259';ctx.fillText(label,labelX,y);}
      ctx.restore();
    }
    function tick(now){if(paused)return;if(now-lastFrame>30){if(now<activeUntil||drag)physics();if(autoFit&&!drag&&!pan)fit();draw();lastFrame=now;}if(now<activeUntil||drag)frameId=requestAnimationFrame(tick);else frameId=0;}
    function wake(ms=2500){activeUntil=performance.now()+ms;if(!paused&&!frameId)frameId=requestAnimationFrame(tick);}
    canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;autoFit=false;canvas.setPointerCapture(event.pointerId);const p=position(event),node=hit(world(p));moved=false;if(node){drag={node,start:p};dragNeighbors=new Set(index.adj.get(node.id)||[]);tooltip.textContent=node.term+(node.kind==='group'?' · '+node.count+' istilah':'');}else pan={start:p,tx,ty};wake();});
    canvas.addEventListener('pointermove',event=>{const p=position(event);if(drag){if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>3)moved=true;const w=world(p);drag.node.x=w.x;drag.node.y=w.y;wake();}else if(pan){if(Math.hypot(p.x-pan.start.x,p.y-pan.start.y)>3)moved=true;tx=pan.tx+p.x-pan.start.x;ty=pan.ty+p.y-pan.start.y;draw();}else{hover=hit(world(p));tooltip.textContent=hover?hover.term+(hover.kind==='group'?' · '+hover.count+' istilah':''):'';canvas.style.cursor=hover?'pointer':'grab';draw();}});
    canvas.addEventListener('pointerleave',()=>{if(!drag&&!pan){hover=null;tooltip.textContent='';draw();}});
    function release(){const node=drag?.node;drag=null;pan=null;dragNeighbors.clear();wake();if(!moved&&node?.kind==='entry')onSelect?.(node.id);if(!moved&&node?.kind==='group'){path=[...path,{facet:node.facet,key:node.key}];prepare();resize();}}
    canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>{drag=null;pan=null;});canvas.addEventListener('wheel',event=>{event.preventDefault();autoFit=false;zoom(event.deltaY<0?1.13:.885,position(event));},{passive:false});canvas.addEventListener('dblclick',event=>{if(!hit(world(position(event))))onExpand?.({groupBy,path:path.map(p=>({...p}))});});
    canvas.addEventListener('keydown',event=>{if(event.key==='Backspace'&&path.length){event.preventDefault();path=path.slice(0,-1);prepare();resize();}else if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')fit();else zoom(event.key==='-'?.8:1.25);draw();}});
    const pinch=root.KamusGraphInput.mountPinch(stage,{
      point:position,min:.025,max:5,getView:()=>({scale,x:tx,y:ty}),
      setView:view=>{scale=view.scale;tx=view.x;ty=view.y;draw();},
      onStart:()=>{autoFit=false;drag=null;pan=null;moved=true;hover=null;dragNeighbors.clear();tooltip.textContent='';},
      onEnd:()=>wake()
    });
    function closeMenu(){groupMenu.hidden=true;groupButton.setAttribute('aria-expanded','false');}
    groupButton.addEventListener('click',()=>{groupMenu.hidden=!groupMenu.hidden;groupButton.setAttribute('aria-expanded',String(!groupMenu.hidden));});
    groupMenu.addEventListener('click',event=>{const button=event.target.closest('[data-group]');if(!button)return;groupBy=button.dataset.group;path=[];try{localStorage.setItem('kamus-global-group-v1',groupBy);}catch{}closeMenu();prepare();draw();});
    container.addEventListener('click',event=>{if(!event.target.closest('.graph-group-toggle,.graph-group-menu'))closeMenu();});
    groupMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();groupButton.focus();}});
    const observer=new ResizeObserver(resize);observer.observe(stage);prepare();
    return {view(){return {groupBy,path:path.map(p=>({...p}))};},setView(view){if(groupNames[view?.groupBy])groupBy=view.groupBy;path=view?.path||[];prepare();resize();},resume(){paused=false;const saved=initialGroup?groupBy:storedGroup();if(saved!==groupBy){groupBy=saved;path=[];prepare();}resize();wake(1800);},pause(){paused=true;pinch.reset();cancelAnimationFrame(frameId);frameId=0;},destroy(){paused=true;pinch.destroy();cancelAnimationFrame(frameId);observer.disconnect();},model:()=>model};
  }
  const api={build,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusGlobalGraph=api;
})(typeof window==='undefined'?globalThis:window);


