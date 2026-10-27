(function(root){
  'use strict';
  function mount(rail,preview,{getLayout,getScroller,enabled,onStart,onRender,onCommit}){
    let drag=null,frame=0,pendingY=0,suppressUntil=0;
    function snap(letter){
      const model=getLayout(),scroller=getScroller(),group=model.sectionGroups.get(letter)||model.sections;
      if(!group.length)return null;
      const max=Math.max(0,scroller.scrollHeight-scroller.clientHeight),reachable=group.filter(s=>s.offset<=max+.5),candidates=reachable.length?reachable:group;
      const section=candidates.reduce((best,s)=>Math.abs(s.offset-scroller.scrollTop)<Math.abs(best.offset-scroller.scrollTop)?s:best,candidates[0]);
      scroller.scrollTop=section.offset;onRender();onCommit(section);return section;
    }
    function apply(y){
      if(!drag||!drag.moved)return;
      if(!drag.started){drag.started=true;onStart();}
      const band=drag.bands.reduce((best,b)=>Math.abs((b.top+b.bottom)/2-y)<Math.abs((best.top+best.bottom)/2-y)?b:best,drag.bands[0]);
      const target=getLayout().scrub(band.letter,(y-band.top)/Math.max(1,band.bottom-band.top));if(!target)return;
      drag.letter=band.letter;getScroller().scrollTop=target.offset;onRender();
      preview.textContent=target.section.title;preview.hidden=false;const box=rail.parentElement.getBoundingClientRect();preview.style.top=Math.max(0,Math.min(box.height-30,y-box.top-15))+'px';
    }
    function cancel(){cancelAnimationFrame(frame);frame=0;if(drag?.moved)suppressUntil=Date.now()+400;drag=null;preview.hidden=true;}
    rail.addEventListener('wheel',event=>{event.preventDefault();getScroller().scrollTop+=event.deltaY;onRender();},{passive:false});
    rail.addEventListener('pointerdown',event=>{
      const button=event.target.closest('[data-letter]');if(event.button!==0||!button||button.disabled||!enabled())return;
      const bands=[...rail.querySelectorAll('[data-letter]:not(:disabled)')].map(b=>{const r=b.getBoundingClientRect();return {letter:b.dataset.letter,top:r.top,bottom:r.bottom};});if(!bands.length)return;
      drag={button,id:event.pointerId,y:event.clientY,bands,moved:false,started:false,letter:button.dataset.letter};button.setPointerCapture(event.pointerId);
    });
    rail.addEventListener('pointermove',event=>{if(!drag)return;drag.moved=drag.moved||Math.abs(event.clientY-drag.y)>3;if(!drag.moved)return;event.preventDefault();pendingY=event.clientY;if(!frame)frame=requestAnimationFrame(()=>{frame=0;apply(pendingY);});});
    rail.addEventListener('pointerup',event=>{if(!drag)return;cancelAnimationFrame(frame);frame=0;const current=drag;if(current.moved){apply(event.clientY);snap(current.letter);suppressUntil=Date.now()+400;}drag=null;preview.hidden=true;try{current.button.releasePointerCapture(current.id);}catch{}});
    rail.addEventListener('pointercancel',cancel);
    rail.addEventListener('keydown',event=>{
      if(!event.target.closest('[data-letter]')||!enabled()||!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
      const model=getLayout();if(!model.sections.length)return;event.preventDefault();onStart();
      const nearest=model.nearestSection(getScroller().scrollTop),at=model.sections.indexOf(nearest),next=event.key==='Home'?0:event.key==='End'?model.sections.length-1:Math.max(0,Math.min(model.sections.length-1,at+(event.key==='ArrowDown'?1:-1))),section=model.sections[next];
      getScroller().scrollTop=section.offset;onRender();onCommit(section);rail.querySelector('[data-letter="'+section.letter+'"]')?.focus({preventScroll:true});
    });
    return {cancel,suppressed:()=>Date.now()<suppressUntil};
  }
  root.KamusAlphabetRail={mount};
})(typeof window==='undefined'?globalThis:window);
