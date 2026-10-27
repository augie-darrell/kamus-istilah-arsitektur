(function(root){
  'use strict';
  const center=points=>({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2});
  const distance=points=>Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);
  function pinchView(view,start,current,min=.025,max=5){
    const initial=center(start),next=center(current),factor=distance(current)/Math.max(1,distance(start));
    const scale=Math.max(min,Math.min(max,view.scale*factor));
    return {scale,x:next.x-(initial.x-view.x)/view.scale*scale,y:next.y-(initial.y-view.y)/view.scale*scale};
  }
  function mountPinch(surface,{getView,setView,point=event=>({x:event.clientX,y:event.clientY}),onStart,onEnd,min=.025,max=5,now=()=>performance.now()}={}){
    const pointers=new Map();let start=null,base=null,blocked=false,suppressUntil=0;
    const consume=event=>{event.preventDefault();event.stopImmediatePropagation();};
    const project=event=>{const p=point(event);return {x:p.x,y:p.y};};
    function begin(){
      if(!blocked){blocked=true;onStart?.();}
      start=[...pointers.values()].slice(0,2).map(p=>({...p}));base={...getView()};
      for(const id of pointers.keys())try{surface.setPointerCapture(id);}catch{}
    }
    function down(event){
      if(event.pointerType!=='touch')return;
      pointers.set(event.pointerId,project(event));
      if(pointers.size>=2){if(!start)begin();consume(event);}else if(blocked)consume(event);
    }
    function move(event){
      if(!pointers.has(event.pointerId))return;
      pointers.set(event.pointerId,project(event));
      if(!blocked)return;consume(event);
      if(start&&pointers.size>=2)setView(pinchView(base,start,[...pointers.values()].slice(0,2),min,max));
    }
    function end(event){
      if(!pointers.has(event.pointerId))return;
      const wasBlocked=blocked;pointers.delete(event.pointerId);
      if(!wasBlocked)return;consume(event);
      if(pointers.size>=2)begin();else start=null;
      if(!pointers.size){blocked=false;base=null;suppressUntil=now()+400;onEnd?.();}
    }
    function click(event){if(blocked||now()<suppressUntil)consume(event);}
    const listeners=[['pointerdown',down],['pointermove',move],['pointerup',end],['pointercancel',end],['click',click],['dblclick',click]];
    for(const [type,listener] of listeners)surface.addEventListener(type,listener,{capture:true,passive:false});
    function reset(){const wasBlocked=blocked;pointers.clear();start=null;base=null;blocked=false;if(wasBlocked){suppressUntil=now()+400;onEnd?.();}}
    return {busy:()=>blocked,reset,destroy(){reset();for(const [type,listener] of listeners)surface.removeEventListener(type,listener,{capture:true});}};
  }
  const api={pinchView,mountPinch};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusGraphInput=api;
})(typeof window==='undefined'?globalThis:window);
