(function(root){
  'use strict';
  const connections={reference:{label:'Rujukan',color:'#88a17a',dash:[],cap:'butt',description:'Lihat: rujukan dalam sumber asli'},translation:{label:'Padanan',color:'#88a17a',dash:[8,4],cap:'butt',description:'Padanan istilah dalam bahasa lain'},association:{label:'Saran terkait',color:'#ac9d72',dash:[0,4],cap:'round',description:'Hubungan tambahan yang disarankan dari isi kamus'},grouping:{label:'Kelompok',color:'#a5b398',dash:[5,5],cap:'butt',description:'Keanggotaan dalam kelompok grafik'}};
  function legend(global=false){return '<div class="graph-legend" aria-label="Jenis hubungan">'+Object.entries(connections).filter(([type])=>global||type!=='grouping').map(([,style])=>'<span title="'+style.description+'"><svg viewBox="0 0 26 8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke="'+style.color+'" stroke-width="1.5" stroke-linecap="'+style.cap+'" stroke-dasharray="'+(style.dash.join(' ')||'none')+'"/></svg>'+style.label+'</span>').join('')+'</div>';}
  function createIndex(entries,associations){
    const byId=new Map(entries.map(e=>[e.id,e])),adj=new Map(entries.map(e=>[e.id,new Set()])),edges=new Map(),edgeWeights=new Map();
    function add(a,b,type,weight=1){if(a===b||!byId.has(a)||!byId.has(b))return;adj.get(a).add(b);adj.get(b).add(a);const pair=[a,b].sort().join(':'),key=pair+':'+type;if(!edges.has(key))edges.set(key,{source:a,target:b,type,weight});edgeWeights.set(pair,Math.max(edgeWeights.get(pair)||0,weight));}
    for(const e of entries){for(const r of e.related)for(const id of r.entry_ids)add(e.id,id,'reference');for(const id of e.equivalent_ids)add(e.id,id,'translation',.99);}
    for(const edge of associations?.edges||[])add(edge.source,edge.target,'association',edge.score);
    return {byId,adj,edges:[...edges.values()],edgeWeights,associations};
  }
  function build(index,id,depth=1,maxNodes=26){
    if(!index.byId.has(id))return {nodes:[],edges:[],totalNeighbors:0,truncated:false};
    const ids=new Set([id]);let frontier=[id],all=new Set([id]);
    for(let hop=0;hop<depth;hop++){
      const next=[];for(const a of frontier)for(const b of index.adj.get(a)||[])if(!all.has(b)){all.add(b);next.push(b);}
      const weight=target=>Math.max(0,...frontier.map(source=>index.edgeWeights?.get([source,target].sort().join(':'))||0));
      next.sort((a,b)=>weight(b)-weight(a)||(index.adj.get(b).size-index.adj.get(a).size)||index.byId.get(a).term.localeCompare(index.byId.get(b).term));
      const limit=Math.min(maxNodes,hop===depth-1?maxNodes:Math.max(2,Math.floor(maxNodes*(hop+1)/depth)));
      for(const b of next)if(ids.size<limit)ids.add(b);frontier=next.filter(b=>ids.has(b));
    }
    return {nodes:[...ids].map(id_=>({id:id_,term:index.byId.get(id_).term,current:id_===id,degree:index.adj.get(id_).size})),edges:index.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)),totalNeighbors:index.adj.get(id).size,truncated:all.size>ids.size};
  }
  function layout(graph){
    const nodes=graph.nodes.map((n,i)=>({...n,x:n.current?210:210+135*Math.cos((i-1)*2*Math.PI/Math.max(1,graph.nodes.length-1)),y:n.current?225:225+165*Math.sin((i-1)*2*Math.PI/Math.max(1,graph.nodes.length-1)),vx:0,vy:0})),byId=new Map(nodes.map(n=>[n.id,n]));
    for(let t=0;t<160;t++){
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],dx=a.x-b.x||.1,dy=a.y-b.y||.1,d2=Math.max(250,dx*dx+dy*dy),force=1900/d2;a.vx+=dx*force*.05;b.vx-=dx*force*.05;a.vy+=dy*force*.05;b.vy-=dy*force*.05;
      }
      for(const e of graph.edges){const a=byId.get(e.source),b=byId.get(e.target),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,force=(d-125)*.006;a.vx+=dx/d*force;b.vx-=dx/d*force;a.vy+=dy/d*force;b.vy-=dy/d*force;}
      for(const n of nodes){if(n.current){n.x=210;n.y=225;n.vx=0;n.vy=0;continue;}n.vx+=(210-n.x)*.0006;n.vy+=(225-n.y)*.0006;n.vx*=.83;n.vy*=.83;n.x=Math.max(48,Math.min(372,n.x+n.vx));n.y=Math.max(35,Math.min(425,n.y+n.vy));}
    }return nodes;
  }
  function nodeLimit(depth,expanded=false){return (expanded?[30,60,100]:[14,30,60])[Math.max(0,Math.min(2,(Math.trunc(Number(depth))||1)-1))];}
  function membership(index,id){
    const tags=index.associations?.byEntry[id],theme=index.associations?.themes?.find(t=>t.id===tags?.primary),key=theme?.parent||tags?.categories?.[0]||'general';
    return {facet:'category',key,label:index.associations?.categories?.find(c=>c.id===key)?.label||'Umum',id:'group:category:'+key};
  }
  function render(container,index,id,{onSelect,onGroup,onExpand,onDepthChange,depth=1,maxNodes,showControls=true,breadcrumbs=[],onBreadcrumb,onHome}={}){
    container._kamusGraphStop?.();
    const parentGroup=index.byId.has(id)&&!index.adj.get(id)?.size?membership(index,id):null;
    const openNode=node=>node.group?onGroup?.(node.group):onSelect?.(node.id);
    const ns='http://www.w3.org/2000/svg',el=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
    container.innerHTML='<nav class="global-breadcrumb local-breadcrumb" aria-label="Jalur istilah"></nav><div class="local-graph-stage"><div data-graph-mount></div><button class="graph-steps" data-depth><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10M7 5v14h10M7 12h10"/><circle cx="7" cy="5" r="2.5"/><circle cx="17" cy="5" r="2.5"/><circle cx="17" cy="12" r="2.5"/><circle cx="17" cy="19" r="2.5"/></svg><span></span></button></div>';
    container.insertAdjacentHTML('beforeend',legend(Boolean(parentGroup)));
    const trail=container.querySelector('.local-breadcrumb');
    function trailButton(label,callback,aria){const button=document.createElement('button');button.type='button';button.textContent=label;if(aria)button.setAttribute('aria-label',aria);button.addEventListener('click',callback);trail.append(button);}
    if(breadcrumbs.length>1)trailButton('←',()=>onBreadcrumb?.(breadcrumbs.at(-2).id,breadcrumbs.length-2),'Kembali ke istilah sebelumnya');
    trailButton('Beranda',()=>onHome?.(),'Lihat grafik global');
    if(parentGroup&&breadcrumbs.length<=1){const divider=document.createElement('span');divider.textContent='›';divider.setAttribute('aria-hidden','true');trail.append(divider);trailButton(parentGroup.label,()=>onGroup?.(parentGroup),'Buka kelompok '+parentGroup.label);}
    breadcrumbs.forEach((part,i)=>{const divider=document.createElement('span');divider.textContent='›';divider.setAttribute('aria-hidden','true');trail.append(divider);if(i===breadcrumbs.length-1){const current=document.createElement('span');current.className='scope-current';current.textContent=part.label;current.setAttribute('aria-current','page');trail.append(current);}else trailButton(part.label,()=>onBreadcrumb?.(part.id,i));});
    const mount=container.querySelector('[data-graph-mount]'),stepButton=container.querySelector('[data-depth]');
    stepButton.hidden=!showControls;
    let currentDepth=depth,scale=1,dx=0,dy=0,group,svg,frameId=0,activeUntil=0,drag,pan,pinch,suppressUntil=0,nodes=[],edges=[],elements=new Map(),byId,stopped=false,interacted=false;
    function stepLabel(){const label=currentDepth+' langkah';stepButton.setAttribute('aria-label','Jangkauan grafik: '+label);stepButton.title=label;stepButton.querySelector('span').textContent=currentDepth;}
    const transform=()=>group?.setAttribute('transform',`translate(${dx} ${dy}) translate(210 225) scale(${scale}) translate(-210 -225)`);
    function point(event,local=true){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform((local?group:svg).getScreenCTM().inverse());}
    function positions(){for(const n of nodes)elements.get(n.id)?.setAttribute('transform',`translate(${n.x} ${n.y})`);for(const item of edges){const a=byId.get(item.source),b=byId.get(item.target);item.line.setAttribute('x1',a.x);item.line.setAttribute('y1',a.y);item.line.setAttribute('x2',b.x);item.line.setAttribute('y2',b.y);}}
    function physics(){
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],xx=a.x-b.x||.1,yy=a.y-b.y||.1,d2=Math.max(180,xx*xx+yy*yy),f=150/d2;a.vx+=xx*f;b.vx-=xx*f;a.vy+=yy*f;b.vy-=yy*f;}
      for(const item of edges){const a=byId.get(item.source),b=byId.get(item.target),xx=b.x-a.x,yy=b.y-a.y,d=Math.hypot(xx,yy)||1,f=(d-125)*.012;a.vx+=xx/d*f;b.vx-=xx/d*f;a.vy+=yy/d*f;b.vy-=yy/d*f;}
      for(const n of nodes){if(drag?.node===n){n.vx=0;n.vy=0;continue;}n.vx+=(210-n.x)*(n.current?.006:.0007);n.vy+=(225-n.y)*(n.current?.006:.0007);n.vx*=.75;n.vy*=.75;n.x+=Math.max(-9,Math.min(9,n.vx));n.y+=Math.max(-9,Math.min(9,n.vy));}
    }
    function fit(){if(!nodes.length)return;const minX=Math.min(...nodes.map(n=>n.x-85)),maxX=Math.max(...nodes.map(n=>n.x+85)),minY=Math.min(...nodes.map(n=>n.y-20)),maxY=Math.max(...nodes.map(n=>n.y+55));scale=Math.min(1,390/(maxX-minX),430/(maxY-minY));dx=-(minX+maxX-420)/2*scale;dy=-(minY+maxY-450)/2*scale;transform();}
    function tick(now){if(stopped||!svg?.isConnected||!svg.getClientRects().length){frameId=0;return;}physics();positions();if(!interacted)fit();if(now<activeUntil||drag)frameId=requestAnimationFrame(tick);else frameId=0;}
    function wake(ms=3200){activeUntil=performance.now()+ms;if(!frameId&&!stopped)frameId=requestAnimationFrame(tick);}
    function draw(){
      cancelAnimationFrame(frameId);frameId=0;pinch?.destroy();mount.innerHTML='';scale=1;dx=0;dy=0;drag=null;pan=null;elements=new Map();
      interacted=false;stepLabel();const raw=build(index,id,currentDepth,maxNodes??nodeLimit(currentDepth)),graph=parentGroup?{...raw,nodes:[...raw.nodes,{id:parentGroup.id,term:parentGroup.label,group:parentGroup,current:false,degree:1}],edges:[...raw.edges,{source:parentGroup.id,target:id,type:'grouping',weight:1}]}:raw;nodes=layout(graph);byId=new Map(nodes.map(n=>[n.id,n]));edges=[];
      svg=el('svg',{viewBox:'0 0 420 475',class:'graph-canvas',role:'group','aria-label':'Grafik Istilah '+(index.byId.get(id)?.term||'')});group=el('g');svg.append(group);mount.append(svg);
      for(const e of graph.edges){const style=connections[e.type],line=el('line',{stroke:style.color,'stroke-width':e.type==='reference'?1.2:.9,'stroke-dasharray':style.dash.join(' ')||'none','stroke-linecap':style.cap,opacity:.65}),title=el('title');title.textContent=style.description;line.append(title);group.append(line);edges.push({...e,line});}
      for(const n of nodes){
        const g=el('g',{class:'graph-node'+(n.current?' current':''),role:'button',tabindex:0,'aria-label':(n.group?'Buka kelompok ':'Buka istilah ')+n.term,'data-graph-node':n.id}),title=el('title');title.textContent=n.term;
        g.append(title,el('rect',{x:-75,y:-13,width:150,height:57,rx:8,fill:'transparent','pointer-events':'all'}),el('circle',{cx:0,cy:0,r:n.current?9:Math.min(7,4+n.degree*.15),fill:n.current?'#254d40':n.group?'#9f9868':'#94ad7c',stroke:'#eef2e6','stroke-width':2}));
        const label=el('text',{x:0,y:n.current?24:20}),words=n.term.split(' ');let lines=[''];for(const word of words){if((lines[lines.length-1]+' '+word).trim().length>18&&lines.length<2)lines.push(word);else lines[lines.length-1]=(lines[lines.length-1]+' '+word).trim();}lines.forEach((text,i)=>{const t=el('tspan',{x:0,dy:i?17:0});t.textContent=text.length>25?text.slice(0,23)+'…':text;label.append(t);});g.append(label);group.append(g);elements.set(n.id,g);
        g.addEventListener('pointerdown',event=>{if(event.button!==0)return;interacted=true;event.preventDefault();event.stopPropagation();const p=point(event);drag={node:n,startX:event.clientX,startY:event.clientY,ox:p.x-n.x,oy:p.y-n.y,moved:false};svg.setPointerCapture(event.pointerId);wake();});
        g.addEventListener('click',()=>{if(performance.now()>suppressUntil)openNode(n);});g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openNode(n);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();interacted=true;n.x+=event.key==='ArrowLeft'?-18:event.key==='ArrowRight'?18:0;n.y+=event.key==='ArrowUp'?-18:event.key==='ArrowDown'?18:0;positions();wake();}});
      }
      positions();fit();
      pinch=root.KamusGraphInput.mountPinch(svg,{
        point:event=>point(event,false),min:.2,max:3.5,
        getView:()=>({scale,x:dx+210*(1-scale),y:dy+225*(1-scale)}),
        setView:view=>{scale=view.scale;dx=view.x-210*(1-scale);dy=view.y-225*(1-scale);transform();},
        onStart:()=>{interacted=true;drag=null;pan=null;suppressUntil=Infinity;},
        onEnd:()=>{suppressUntil=performance.now()+400;wake();}
      });
      svg.addEventListener('pointerdown',event=>{if(event.target.closest('.graph-node'))return;interacted=true;const p=point(event,false);pan={x:p.x,y:p.y,dx,dy};svg.setPointerCapture(event.pointerId);});
      svg.addEventListener('pointermove',event=>{if(drag){const p=point(event);drag.moved=drag.moved||Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>3;drag.node.x=p.x-drag.ox;drag.node.y=p.y-drag.oy;positions();wake();}else if(pan){const p=point(event,false);dx=pan.dx+p.x-pan.x;dy=pan.dy+p.y-pan.y;transform();}});
      svg.addEventListener('pointerup',()=>{const last=drag;drag=null;pan=null;suppressUntil=performance.now()+300;wake();if(last&&!last.moved)openNode(last.node);});svg.addEventListener('pointercancel',()=>{drag=null;pan=null;});
      svg.addEventListener('wheel',event=>{event.preventDefault();interacted=true;const p=point(event,false),before=point(event);scale=Math.max(.2,Math.min(3.5,scale*(event.deltaY<0?1.12:.89)));dx=p.x-210-(before.x-210)*scale;dy=p.y-225-(before.y-225)*scale;transform();},{passive:false});
      svg.addEventListener('dblclick',event=>{if(!event.target.closest('.graph-node'))onExpand?.();});
      if(!matchMedia('(prefers-reduced-motion:reduce)').matches)wake(1800);
    }
    stepButton.addEventListener('click',()=>{currentDepth=currentDepth%3+1;onDepthChange?.(currentDepth);draw();});
    container._kamusGraphStop=()=>{stopped=true;pinch?.destroy();cancelAnimationFrame(frameId);frameId=0;};draw();return {stop:container._kamusGraphStop};
  }
  const api={createIndex,build,layout,render,legend,connections,nodeLimit,membership};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusGraph=api;
})(typeof window==='undefined'?globalThis:window);
