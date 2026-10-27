(function(root){
  'use strict';
  function create(preferences={},mobile=false){
    preferences=preferences&&typeof preferences==='object'?preferences:{};
    const desktop={terms:preferences.terms!==false,graph:preferences.graph!==false};
    let compact=Boolean(mobile),current=compact?{terms:false,graph:false}:{...desktop};
    const view=()=>({...current,mobile:compact});
    return {
      view,
      preferences:()=>({...desktop}),
      set(panel,open){
        if(!['terms','graph'].includes(panel))return view();
        current[panel]=Boolean(open);
        if(compact&&open)current[panel==='terms'?'graph':'terms']=false;
        if(!compact)desktop[panel]=Boolean(open);
        return view();
      },
      resize(mobile){
        if(compact!==Boolean(mobile)){compact=Boolean(mobile);current=compact?{terms:false,graph:false}:{...desktop};}
        return view();
      },
      closeMobile(){if(compact)current={terms:false,graph:false};return view();}
    };
  }
  function widthLimits(viewport,centerWidth=320){
    const width=Math.max(0,Number(viewport)||0),center=Math.max(0,Number(centerWidth)||320);
    const max=Math.max(0,Math.floor((width-center)/2));
    return {min:Math.min(width>=1001?240:width>=851?200:170,max),max};
  }
  function clampWidth(value,viewport,centerWidth){
    const {min,max}=widthLimits(viewport,centerWidth);
    return Math.round(Math.min(max,Math.max(min,Number(value)||min)));
  }
  function mountResizers({terms,graph=null,read,save}){
    const doc=terms.ownerDocument,win=doc.defaultView,body=doc.body;
    const stored=read(),valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
    let preferred=valid(stored)?stored:null,drag=null,frame;
    function centerMinimum(){
      const title=doc.querySelector('.site-title'),text=title?.querySelector('.site-title-text'),logo=title?.querySelector('.titlebar-brand');
      return text?Math.ceil(text.scrollWidth+(logo?.getBoundingClientRect().width||0)+(parseFloat(win.getComputedStyle(title).columnGap)||0)):320;
    }
    const limits=()=>widthLimits(win.innerWidth,centerMinimum());
    const clamp=value=>clampWidth(value,win.innerWidth,centerMinimum());
    const handles=[['terms',terms,1],['graph',graph,-1]].filter(([,panel])=>panel).map(([name,panel,direction])=>{
      const handle=doc.createElement('div');handle.className='column-resizer';handle.dataset.panel=name;
      handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');
      handle.setAttribute('aria-controls',graph?'sidebar visual-panel':terms.id);
      handle.setAttribute('aria-label',graph?'Ubah lebar kedua kolom, pembatas '+(name==='terms'?'kiri':'kanan'):'Ubah lebar kolom Penyunting Istilah');
      handle.title='Geser untuk mengubah lebar kolom · klik dua kali untuk mengatur ulang';
      body.append(handle);return {handle,panel,direction};
    });
    function apply(){
      if(preferred===null)body.style.removeProperty('--side-column-width');
      else body.style.setProperty('--side-column-width',clamp(preferred)+'px');
      if(preferred===null&&win.innerWidth>650){
        const width=(terms.hidden&&graph?graph:terms).getBoundingClientRect().width;
        if(width>limits().max)body.style.setProperty('--side-column-width',limits().max+'px');
      }
      schedule();
    }
    function sync(){
      frame=null;const bounds=limits();
      for(const {handle,panel,direction} of handles){
        const rect=panel.getBoundingClientRect();handle.hidden=win.innerWidth<=650||panel.hidden||!rect.width;
        if(handle.hidden)continue;
        handle.style.left=(direction===1?rect.right:rect.left)+'px';handle.style.top=rect.top+'px';handle.style.height=rect.height+'px';
        handle.setAttribute('aria-valuemin',bounds.min);handle.setAttribute('aria-valuemax',bounds.max);
        handle.setAttribute('aria-valuenow',Math.round(rect.width));handle.setAttribute('aria-valuetext',Math.round(rect.width)+' piksel per kolom');
      }
    }
    function schedule(){if(!frame)frame=win.requestAnimationFrame(sync);}
    function finish(commit){
      if(!drag)return;const previous=drag;drag=null;body.classList.remove('resizing-columns');
      if(previous.handle.hasPointerCapture(previous.id))previous.handle.releasePointerCapture(previous.id);
      if(commit)save(preferred);else{preferred=previous.preferred;apply();}
      schedule();
    }
    for(const {handle,panel,direction} of handles){
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0||handle.hidden)return;event.preventDefault();handle.focus({preventScroll:true});
        drag={handle,id:event.pointerId,x:event.clientX,width:panel.getBoundingClientRect().width,direction,preferred};
        handle.setPointerCapture(event.pointerId);body.classList.add('resizing-columns');
      });
      handle.addEventListener('pointermove',event=>{
        if(!drag||drag.handle!==handle||drag.id!==event.pointerId)return;
        preferred=clamp(drag.width+(event.clientX-drag.x)*drag.direction);apply();
      });
      handle.addEventListener('pointerup',event=>{if(drag?.id===event.pointerId)finish(true);});
      handle.addEventListener('pointercancel',()=>finish(false));
      handle.addEventListener('lostpointercapture',()=>finish(false));
      handle.addEventListener('dblclick',()=>{preferred=null;apply();save(null);});
      handle.addEventListener('keydown',event=>{
        if(event.key==='Escape'){finish(false);return;}
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();const bounds=limits(),step=event.shiftKey?32:12;
        preferred=event.key==='Home'?bounds.min:event.key==='End'?bounds.max:clamp(panel.getBoundingClientRect().width+(event.key==='ArrowRight'?step:-step)*direction);
        apply();save(preferred);
      });
    }
    const observer=new win.ResizeObserver(schedule);for(const {panel} of handles)observer.observe(panel);
    win.addEventListener('resize',()=>{finish(false);apply();});
    doc.fonts?.ready.then(apply);
    doc.addEventListener('keydown',event=>{if(event.key==='Escape')finish(false);});
    apply();return {sync:schedule};
  }
  const api={create,widthLimits,clampWidth,mountResizers};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusPanels=api;
})(typeof window==='undefined'?globalThis:window);
