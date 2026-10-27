(()=>{
  'use strict';
  const data=window.DICTIONARY_DATA,$=id=>document.getElementById(id),config=window.KAMUS_CONFIG||{},S=window.KamusShared,esc=S.escape;
  if(!data){$('results').textContent='Data kamus tidak dapat dibaca. Ekstrak seluruh folder dan buka index.html kembali.';return;}
  const imagesPanel=$('images-panel'),offlineMessage='Koneksi internet tidak tersedia';
  const entries=data.entries,byId=new Map(entries.map(e=>[e.id,e])),engine=DictionarySearch.create(entries),graphIndex=KamusGraph.createIndex(entries,window.KAMUS_ASSOCIATIONS);
  const store={get(key,fallback){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
  const panelMedia=matchMedia('(max-width:650px)'),panels=KamusPanels.create(store.get('kamus-panels-v1',{}),panelMedia.matches);
  const refs=KamusReferences.create({storage:(()=>{try{return localStorage;}catch{return null;}})()}),fmt=n=>n.toLocaleString('id-ID'),external='target="_blank" rel="noopener noreferrer"';
  const savedRaw=store.get('kamus-saved-v1',[]),saved=new Set(Array.isArray(savedRaw)?savedRaw.filter(id=>byId.has(id)):[]);
  const bookmarkIcon='<svg viewBox="0 0 16 20" aria-hidden="true"><path d="M3 2h10v16l-5-4-5 4V2Z"/></svg>';
  const langs=new Map();entries.forEach(e=>e.languages.forEach(l=>{if(l.code!=='und')langs.set(l.code,l.name);}));
  [...langs].sort((a,b)=>a[1].localeCompare(b[1],'id')).forEach(([code,name])=>$('language').add(new Option(name,code)));$('language').add(new Option('Label belum jelas','und'));
  const featured=entries.find(e=>e.term==='Beton Bertulang')||entries[0];
  let browseOrder=store.get('kamus-browse-order-v1','az');if(!['az','za'].includes(browseOrder))browseOrder='az';
  let state={q:'',language:'',wordType:'',sort:browseOrder,savedOnly:false,id:featured.id,letter:'',fuzzy:true},results=[],rangeStart=-1,rowHeight=104;
  let listLayout=KamusList.create([]);
  let inputTimer,networkTimer,networkController,imageController,toastTimer,scrollFrame,reading=false,online=navigator.onLine!==false,currentDetailId=null;
  let isHome=!reading,rightGlobalController,railController,rightGlobalGroup='',rightGlobalSuspended=false;
  let referenceForEntry,navigationId='',localTrail=[];
  const termLookup=new Map();for(const e of entries){const k=S.key(e.term);if(!termLookup.has(k))termLookup.set(k,[]);termLookup.get(k).push(e);}
  let graphDepth=[1,2,3].includes(store.get('kamus-graph-depth-v2',1))?store.get('kamus-graph-depth-v2',1):1;
  function rememberGraphDepth(value){graphDepth=value;store.set('kamus-graph-depth-v2',value);}
  const graphChoices={'local:1':'Lokal · 1 langkah','local:2':'Lokal · 2 langkah','local:3':'Lokal · 3 langkah','global:theme':'Global · Tema','global:language':'Global · Bahasa','global:type':'Global · Jenis kata'};
  let graphChoice=store.get('kamus-graph-view-v1','local:'+graphDepth);if(!Object.hasOwn(graphChoices,graphChoice))graphChoice='local:1';
  const maintainer=config.maintainer||{};
  const makerURL=S.safeURL(maintainer.url);$('maintainer-credit').innerHTML=maintainer.name?'Situs dibuat oleh '+(makerURL?`<a href="${esc(makerURL)}" ${external}>${esc(maintainer.name)}</a>`:esc(maintainer.name))+'.':'';
  if(!maintainer.name)$('maintainer-credit').hidden=true;
  if(maintainer.logo&&S.safeURL(maintainer.logo,{local:true})){const logo=document.createElement('img');logo.src=S.safeURL(maintainer.logo,{local:true});logo.alt=maintainer.name||'Pemelihara';$('maintainer-credit').prepend(logo);}
  $('about-maintainer').textContent=maintainer.name?`Website & pemeliharaan: ${maintainer.name}. Kredit ini merujuk pada situs digital, sementara kepengarangan kamus tetap pada penyusun aslinya.`:'';
  function futureLink(id,url,label){const link=$(id),safe=S.safeURL(url);link.hidden=false;if(safe){link.href=safe;link.removeAttribute('aria-disabled');link.title=label;link.setAttribute('aria-label',label);}else{link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.title=label+' · segera hadir';link.setAttribute('aria-label',label+' · segera hadir');}}
  futureLink('footer-github-link',config.githubUrl,'GitHub');futureLink('download-windows',config.downloads?.windows,'Unduh untuk Windows');futureLink('download-android',config.downloads?.android,'Unduh untuk Android');
  $('footer-version').textContent='v'+(config.version||'0.2.0')+' · '+(config.releaseYear||2026);
  if(S.safeURL(config.githubUrl)){$('github-link').href=S.safeURL(config.githubUrl);$('github-link').hidden=false;}
  $('about-stats').textContent=`${fmt(entries.length)} entri dari 26 halaman A–Z, diambil pada 26 Oktober 2026. Sembilan pengulangan identik digabungkan; makna yang berbeda dipertahankan. Teks blog menjadi arsip sumber tetap untuk edisi ini.`;
  function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
  function enterReading(){isHome=false;document.body.classList.remove('home');if(!reading){reading=true;document.body.classList.add('reading');requestAnimationFrame(()=>renderRows(true));}}
  function applyPanels(){
    const view=panels.view(),footer=document.querySelector('.site-footer'),footerTarget=view.mobile?$('mobile-footer-slot'):$('visual-panel');if(footer.parentElement!==footerTarget)footerTarget.append(footer);document.body.classList.toggle('terms-hidden',!view.terms);document.body.classList.toggle('graph-hidden',!view.graph);
    $('sidebar').hidden=!view.terms;$('visual-panel').hidden=!view.graph;$('sidebar-backdrop').hidden=!(view.mobile&&(view.terms||view.graph));
    document.querySelector('.center-column').inert=view.mobile&&(view.terms||view.graph);
    for(const [name,id,label] of [['terms','toggle-terms','Daftar Istilah'],['graph','toggle-graph','Daftar Grafik']]){$(id).setAttribute('aria-expanded',String(view[name]));$(id).setAttribute('aria-label',(view[name]?'Sembunyikan ':'Tampilkan ')+label);$(id).classList.toggle('active',view[name]);}
    if(!view.graph){rightGlobalController?.pause();rightGlobalSuspended=true;}
    requestAnimationFrame(()=>{renderRows(true);if(view.graph)renderGraph();});
  }
  function setPanel(name,open){panels.set(name,open);if(!panelMedia.matches)store.set('kamus-panels-v1',panels.preferences());applyPanels();}
  function closeMobilePanels(){panels.closeMobile();applyPanels();}
  function toggleSidebar(open){if(panelMedia.matches){if(open)setPanel('terms',true);else closeMobilePanels();}}

  function readHash(){
    const route=location.hash.slice(1),p=new URLSearchParams(route);
    state={...state,q:p.get('q')||'',language:langs.has(p.get('lang'))||p.get('lang')==='und'?p.get('lang'):'',wordType:['kb','kk','aj','ks','other'].includes(p.get('type'))?p.get('type'):'',sort:['az','za'].includes(p.get('sort'))?p.get('sort'):browseOrder,savedOnly:p.get('saved')==='1',letter:/^[A-Z]$/.test(p.get('letter')||'')?p.get('letter'):'',id:byId.has(p.get('term'))?p.get('term'):'',fuzzy:true};
    isHome=route==='home'||!route;reading=!isHome;navigationId=state.id;localTrail=state.id?[state.id]:[];graphChoice=isHome?'global:theme':'local:'+graphDepth;
    document.body.classList.toggle('reading',reading);document.body.classList.toggle('home',isHome);
  }
  function writeHash(push=false){const p=new URLSearchParams();if(state.q)p.set('q',state.q);if(state.id)p.set('term',state.id);if(state.language)p.set('lang',state.language);if(state.wordType)p.set('type',state.wordType);if(state.sort==='za')p.set('sort','za');if(state.savedOnly)p.set('saved','1');if(state.letter&&!state.q)p.set('letter',state.letter);try{history[push?'pushState':'replaceState'](null,'',isHome?'#home':'#'+p);}catch{}}
  function showHome(){
    clearTimeout(inputTimer);clearTimeout(networkTimer);networkController?.abort();imageController?.abort();$('graph-panel')._kamusGraphStop?.();rightGlobalController?.destroy();rightGlobalController=null;rightGlobalGroup='';rightGlobalSuspended=false;
    isHome=true;reading=false;currentDetailId=null;navigationId='';localTrail=[];graphChoice='global:theme';document.body.classList.remove('reading');document.body.classList.add('home');state={...state,q:'',language:'',wordType:'',savedOnly:false,letter:'',sort:browseOrder,id:''};toggleSidebar(false);render({resetScroll:true});writeHash(true);
  }
  function renderHome(){
    if($('editor-link'))$('editor-link').href='editor.html';
    clearTimeout(networkTimer);networkController?.abort();imageController?.abort();currentDetailId='home';$('entry-header').hidden=true;$('entry-header').innerHTML='';$('home-content').hidden=false;$('detail').hidden=true;imagesPanel.hidden=true;$('detail').append(imagesPanel);$('reader-scroll').scrollTop=0;renderGraph();
  }
  function showGraphOverview(path=[]){
    closeGraphMenu();graphChoice='global:theme';store.set('kamus-graph-view-v1',graphChoice);
    renderGraph();rightGlobalController?.setView({groupBy:'theme',path:Array.isArray(path)?path:[]});
  }
  function openGlobal(groupBy,view){
    if(groupBy&&typeof groupBy==='object'){view=groupBy;groupBy=view.groupBy;}
    const origin=rightGlobalController;view=view||origin?.view();
    let dialog=$('global-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='global-dialog';dialog.className='global-dialog';dialog.innerHTML='<button class="dialog-close" aria-label="Tutup grafik global">×</button><h2>Grafik Istilah</h2><div class="global-expanded"></div>';document.body.append(dialog);dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{const finalView=dialog._controller?.view();dialog._controller?.pause();if(finalView&&dialog._origin===rightGlobalController)rightGlobalController.setView(finalView);rightGlobalController?.resume();});}
    dialog._controller?.destroy();dialog._origin=origin;origin?.pause();dialog._controller=KamusGlobalGraph.mount(dialog.querySelector('.global-expanded'),graphIndex,{title:config.title||'Kamus Istilah Arsitektur',groupBy:typeof groupBy==='string'?groupBy:undefined,path:view?.path||[],showControls:false,onSelect:id=>{dialog.close();if(byId.has(id))selectEntry(id,{scrollList:true});}});dialog.showModal();requestAnimationFrame(()=>dialog._controller.resume());
  }
  function updateSearchAction(){
    const hasText=$('search').value.length>0,button=$('search-action');
    button.type=hasText?'button':'submit';button.setAttribute('aria-label',hasText?'Hapus pencarian':'Cari istilah');button.title=hasText?'Hapus pencarian':'Cari istilah';
    button.innerHTML=hasText?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  }
  function controls(){
    $('search').value=state.q;$('language').value=state.language;$('word-type').value=state.wordType;
    $('search').placeholder='Cari dari '+fmt(engine.count({language:state.language,wordType:state.wordType,saved:state.savedOnly?saved:null}))+' istilah…';$('nav-saved').classList.toggle('active',state.savedOnly);$('nav-saved').setAttribute('aria-pressed',String(state.savedOnly));$('nav-saved').setAttribute('aria-label',state.savedOnly?'Tampilkan semua istilah':'Tampilkan istilah tersimpan');updateSearchAction();
  }
  function render({resetScroll=false,selectFirst=false,forceDetail=false}={}){
    if(selectFirst)navigationId='';
    controls();rowHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--term-row-height'))||104;const matches=engine.find(state.q,{language:state.language,wordType:state.wordType,sort:searching()?'relevance':state.sort,fuzzy:state.fuzzy,saved:state.savedOnly?saved:null});listLayout=KamusList.create(KamusList.withSelection(matches,navigationId===state.id?byId.get(navigationId):null),{rowHeight,grouped:!searching(),descending:!searching()&&state.sort==='za'});results=listLayout.results;
    if(!isHome&&(selectFirst||!byId.has(state.id)))state.id=results[0]?.entry.id||'';
    if(!results.length)state.id='';
    if(selectFirst&&!isHome){graphChoice='local:'+graphDepth;localTrail=state.id?[state.id]:[];}
    $('result-count').textContent=`${fmt(results.length)} ${state.q?'hasil':'istilah'}${state.savedOnly?' tersimpan':''}`;
    const allFuzzy=results.length&&results.every(r=>r.match==='similar');$('suggestions').textContent=allFuzzy?'Ejaan persis belum ditemukan. Menampilkan istilah yang mirip.':'';
    rowHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--term-row-height'))||104;
    if(resetScroll)$('term-scroll').scrollTop=0;rangeStart=-1;renderAlphabet();renderRows(true);
    if(isHome){renderHome();return;}
    if(currentDetailId!==state.id||forceDetail)renderDetail();else if(selectFirst)renderGraph();
  }
  function renderRows(force=false){
    const scroller=$('term-scroll'),{start,end}=listLayout.windowRows(scroller.scrollTop,scroller.clientHeight);
    if(!force&&rangeStart===start)return;rangeStart=start;
    if(!results.length){$('results').innerHTML=`<div class="empty-state"><h3>${state.savedOnly?'Istilah pilihanmu.':'Belum ditemukan.'}</h3><p>${state.savedOnly?'Simpan istilah dengan ikon penanda di bagian definisi.':'Coba ejaan lain atau hapus filter.'}</p><button data-reset>Jelajahi semua istilah</button></div>`;return;}
    $('results').innerHTML=KamusEntryView.listRows(listLayout,{start,end,selectedId:state.id});
    const top=listLayout.rows[listLayout.indexAt(scroller.scrollTop)]?.letter;setRailActive(top);
  }
  function searching(){return Boolean(DictionarySearch.normalize(state.q));}
  function setRailActive(letter){$('alphabet').querySelectorAll('[data-letter]').forEach(button=>{const active=button.dataset.letter===letter;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');});}
  function renderAlphabet(){
    railController?.cancel();
    $('alphabet').innerHTML=KamusEntryView.alphabet(results,{sort:state.sort,searching:searching()});
  }
  function toggleBrowseOrder(){if(searching())return;browseOrder=state.sort==='za'?'az':'za';state.sort=browseOrder;store.set('kamus-browse-order-v1',browseOrder);render({resetScroll:true});writeHash();}
  function jump(letter,push=true){const index=letter?results.findIndex(r=>DictionarySearch.normalize(r.entry.term).charAt(0).toUpperCase()===letter):0;if(index<0)return;$('term-scroll').scrollTop=listLayout.letterOffsets.get(letter)??listLayout.resultOffsets[index]??0;state.letter=letter;renderRows(true);setRailActive(letter);if(!currentDetailId)renderDetail();writeHash(push);}
  function selectEntry(id,{push=true,scrollList=true,appendTrail=false,trailIndex}={}){
    if(!byId.has(id))return;clearTimeout(inputTimer);state.q=$('search').value;enterReading();state.id=id;navigationId=id;state.letter=searching()?'':KamusList.key(byId.get(id).term).charAt(0).toUpperCase();
    if(Number.isInteger(trailIndex))localTrail=localTrail.slice(0,trailIndex+1);
    else if(appendTrail){const old=localTrail.indexOf(id);localTrail=old>=0?localTrail.slice(0,old+1):[...localTrail,id].slice(-8);}
    else localTrail=[id];
    graphChoice='local:'+graphDepth;store.set('kamus-graph-view-v1',graphChoice);render({forceDetail:true});writeHash(push);toggleSidebar(false);
    if(scrollList)revealSelection();
  }
  function revealSelection(){const i=results.findIndex(r=>r.entry.id===state.id);if(i<0)return;const target=listLayout.resultOffsets[i],scroller=$('term-scroll');if(target<scroller.scrollTop||target+rowHeight>scroller.scrollTop+scroller.clientHeight)scroller.scrollTop=Math.max(0,target-rowHeight);renderRows(true);}
  function openTerm(term,id){
    const found=byId.get(id)||termLookup.get(S.key(term))?.[0];
    if(found)selectEntry(found.id,{appendTrail:true});else notify('Istilah “'+term+'” belum tersedia.');
  }
  function localBreadcrumbs(){return localTrail.map(id=>({id,label:byId.get(id)?.term||''})).filter(p=>p.label);}
  function meaningSection(meaning){
    if(!meaning)return '';
    return `<section class="content-section description-section"><p class="mini-label">${esc(meaning.label)}</p>${KamusEntryView.meaningBody(meaning)}${meaning.provider==='kbbi'?`<a class="meaning-source" href="${esc(meaning.source_url)}" ${external}>KBBI Daring ↗</a>`:''}</section>`;
  }
  function renderDetail(){
    $('home-content').hidden=true;$('detail').hidden=false;if($('editor-link'))$('editor-link').href='editor.html#term='+encodeURIComponent(state.id);if(state.id&&!localTrail.length)localTrail=[state.id];
    clearTimeout(networkTimer);networkController?.abort();imageController?.abort();currentDetailId=state.id;referenceForEntry=null;const e=byId.get(state.id);
    if(!e){$('entry-header').hidden=true;$('entry-header').innerHTML='';$('detail').innerHTML='<div class="empty-state"><h3>Setiap kata membuka ruang.</h3><p>Pilih istilah untuk membaca definisi dan rujukannya.</p></div>';imagesPanel.hidden=true;$('detail').append(imagesPanel);$('media-results').innerHTML='';$('curated-images').innerHTML='';$('media-status').textContent='Pilih istilah untuk melihat gambar.';renderGraph();return;}
    const related=e.related||[],meaning=KamusContent.meaning(e);
    $('entry-header').hidden=false;$('entry-header').innerHTML=`<div class="entry-summary-inner"><div class="entry-heading"><h2>${esc(e.term)}</h2><div class="entry-actions"><button class="copy-link bookmark" data-share="${e.id}" aria-label="Salin tautan istilah" title="Salin tautan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 1)"/></svg></button><button class="bookmark ${saved.has(e.id)?'saved':''}" data-save="${e.id}" aria-label="${saved.has(e.id)?'Hapus dari tersimpan':'Simpan istilah'}" aria-pressed="${saved.has(e.id)}">${bookmarkIcon}</button></div></div><div class="detail-tags">${KamusEntryView.tags(e)}</div></div>`;
    $('detail').innerHTML=`${meaningSection(meaning)}${e.translations.length?`<div class="content-section translation-list"><p class="mini-label">PADANAN BAHASA</p>${e.translations.map(t=>`<div class="translation-line"><span>${esc(t.languages.map(l=>l.name).join(' / '))}</span><div>${t.terms.map(term=>`<button data-term="${esc(term)}">${esc(term)}</button>`).join(', ')}</div></div>`).join('')}</div>`:''}${related.length?`<div class="content-section related"><p class="mini-label">LIHAT</p><div class="related-chips">${related.map(r=>`<button ${r.resolved?`data-related="${r.entry_ids[0]}"`:`data-term="${esc(r.term)}"`} class="${r.resolved?'':'unresolved'}" title="${r.equivalent?'Padanan':r.editorial?'Terkait':'Rujukan'}">${esc(r.term)} ${r.resolved?'↗':'⌕'}</button>`).join('')}</div></div>`:''}<div class="entry-media-slot"></div><div class="content-section reference-section"><p class="mini-label">BACA LEBIH LANJUT</p><div id="reference-results"></div></div>${sourceCitation(e)}`;
    renderReferences({wikipedia:{status:'loading',links:[]},wiktionary:{status:'loading',links:[]}});
    imagesPanel.hidden=false;$('detail').querySelector('.entry-media-slot').append(imagesPanel);
    $('reader-scroll').scrollTop=0;$('google-images-link').href='https://www.google.com/search?tbm=isch&q='+encodeURIComponent(KamusReferences.imageQuery(e));$('media-results').innerHTML='';$('media-status').textContent=online?'…':offlineMessage;renderCurated(e);renderGraph();
    networkController=new AbortController();const controller=networkController;
    networkTimer=setTimeout(()=>{
      refs.resolve(e,{signal:controller.signal,online}).then(result=>{if(!controller.signal.aborted&&state.id===e.id){renderReferences(result);loadImages(e,false,result.wikipedia);}}).catch(error=>{if(!controller.signal.aborted&&state.id===e.id){renderReferences({wikipedia:{status:'error',links:[]},wiktionary:{status:'error',links:[]}});loadImages(e,false);}});
    },450);
  }
  function sourceCitation(entry){
    const url=S.safeURL(entry.source_url),source=(data.sources||[]).find(s=>S.safeURL(s.url)===url),blog=url&&new URL(url).hostname==='kamusarsitektur.blogspot.com';
    let citation;
    if(blog&&source){
      const day=/^\d{4}-\d{2}-\d{2}/.exec(source.published||'')?.[0],date=day?new Date(day+'T00:00:00Z'):null;
      const published=date&&Number.isFinite(date.getTime())?date.getUTCFullYear()+', '+new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',timeZone:'UTC'}).format(date):'n.d.';
      citation=`Rahardjo, S. (${published}). ${esc(source.letter||entry.letter)}. <em>Kamus istilah arsitektur 2010</em>.`;
    }else{
      const title=entry.source_label||'Sumber entri';citation=`<em>${esc(title)}</em>. (n.d.).${url?` <a href="${esc(url)}" ${external}>${esc(url)} ↗</a>`:''}`;
    }
    const supplement=KamusContent.meaning(entry)?.provider==='kbbi_iii'?data.metadata.supplemental_sources?.['kbbi-iii-offline-1.5.1']:null;
    const extra=supplement?`<p class="source-citation">Pusat Bahasa, Departemen Pendidikan Nasional. (2001). <em>Kamus besar bahasa Indonesia</em> (Edisi ke-3). Balai Pustaka.</p>`:'';
    return `<section class="content-section source-section"><p class="mini-label">SUMBER</p><p class="source-citation">${citation}</p>${extra}</section>`;
  }
  function kbbiReference(entry){return entry?.languages.some(l=>l.code==='id')?`<section class="reference-provider" data-provider="kbbi"><div class="provider-heading">KBBI VI</div><a class="reference-link" href="${esc(KamusContent.kbbiURL(entry))}" ${external}>${esc(entry.term)} ↗<span>ID</span></a></section>`:'';}
  function renderReferences(result){
    referenceForEntry={id:state.id,wikipedia:result.wikipedia};
    const messages={loading:'…',missing:'Belum tersedia.',offline:offlineMessage,error:'Tidak dapat dimuat.'},kbbi=kbbiReference(byId.get(state.id)),target=$('reference-results');
    target.classList.toggle('has-kbbi',!!kbbi);
    target.innerHTML=kbbi+['wiktionary','wikipedia'].map(provider=>{const r=result[provider],title=provider==='wikipedia'?'Wikipedia':'Wiktionary';return `<section class="reference-provider" data-provider="${provider}"><div class="provider-heading">${title}</div>${r.links.length?r.links.map(link=>`<a class="reference-link" href="${esc(link.url)}" ${external}>${esc(link.title)} ↗<span>${esc((link.language||'').toUpperCase())}</span></a>`).join(''):`<p class="reference-status">${messages[r.status]||messages.error}</p>`}</section>`;}).join('')+(Object.values(result).some(r=>r.status==='error')?'<button class="retry-reference" data-retry aria-label="Muat ulang referensi">↻</button>':'');
  }
  function mediaCard(img,curated=false){const url=S.safeURL(img.url,{local:curated}),source=S.safeURL(img.source_url);if(!url)return '';const credit=[img.creator,img.license].filter(Boolean).join(' · '),title=img.title||img.alt||'Gambar';return `<figure class="media-card">${source?`<a href="${esc(source)}" title="${esc(credit)}" ${external}>`:''}<img src="${esc(url)}" alt="${esc(img.alt||title)}" loading="lazy">${source?'</a>':''}<figcaption>${esc(title)}</figcaption><span class="sr-only">${esc(credit)}</span></figure>`;}
  function renderCurated(e){$('curated-images').innerHTML=e.images.slice(0,3).filter(img=>online||!/^https?:/i.test(img.url)).map(img=>mediaCard(img,true)).join('');}
  async function loadImages(e,refresh=false,article){
    imageController?.abort();imageController=new AbortController();const controller=imageController;
    const count=Math.max(0,3-e.images.slice(0,3).length),query=KamusReferences.imageQuery(e);
    $('google-images-link').href='https://www.google.com/search?tbm=isch&q='+encodeURIComponent(query);
    if(!online){$('media-results').innerHTML='';$('media-status').textContent=offlineMessage;return;}
    if(!count){$('media-status').textContent='';return;}
    $('media-status').textContent='…';
    const result=await refs.images(e,query,{signal:controller.signal,online,limit:count,refresh,article:article||(referenceForEntry?.id===e.id?referenceForEntry.wikipedia:null)}).catch(()=>null);
    if(!result||controller.signal.aborted||state.id!==e.id)return;
    $('media-results').innerHTML=result.images.map(img=>mediaCard(img)).join('');
    $('media-status').textContent=result.status==='found'?'':result.status==='missing'?'Belum tersedia.':'Tidak dapat dimuat.';
  }
  function updateGraphControls(){
    const button=$('graph-view-toggle'),label=graphChoices['local:'+graphDepth];button.setAttribute('aria-label','Tampilan grafik: '+label);button.title=label;button.classList.remove('active');
    $('graph-view-menu').querySelectorAll('[data-graph-choice]').forEach(item=>{item.setAttribute('aria-checked',String(item.dataset.graphChoice==='local:'+graphDepth));item.disabled=false;});
  }
  function closeGraphMenu(){S.setMenuOpen($('graph-view-toggle'),$('graph-view-menu'),false);}
  function renderGraph(){
    updateGraphControls();
    if(!panels.view().graph){rightGlobalController?.pause();rightGlobalSuspended=true;return;}
    const requestedGroup=graphChoice.startsWith('global:')?graphChoice.split(':')[1]:'';
    if(rightGlobalController&&rightGlobalGroup===requestedGroup){if(rightGlobalSuspended){rightGlobalController.resume();rightGlobalSuspended=false;}return;}
    $('graph-panel')._kamusGraphStop?.();rightGlobalController?.destroy();rightGlobalController=null;rightGlobalGroup='';rightGlobalSuspended=false;
    if(graphChoice.startsWith('global:')){
      const group=graphChoice.split(':')[1];rightGlobalGroup=group;rightGlobalController=KamusGlobalGraph.mount($('graph-panel'),graphIndex,{title:config.title||'Kamus Istilah Arsitektur',groupBy:group,showControls:false,onSelect:id=>selectEntry(id,{scrollList:true}),onExpand:view=>openGlobal(group,view)});requestAnimationFrame(()=>rightGlobalController?.resume());
    }else if(state.id){KamusGraph.render($('graph-panel'),graphIndex,state.id,{depth:Number(graphChoice.split(':')[1]),showControls:false,breadcrumbs:localBreadcrumbs(),onHome:showGraphOverview,onGroup:group=>showGraphOverview([group]),onBreadcrumb:(id,index)=>selectEntry(id,{trailIndex:index}),onSelect:id=>selectEntry(id,{scrollList:true,appendTrail:true}),onExpand:openGraph});}
    else $('graph-panel').innerHTML='';
  }
  function openGraph(){
    let dialog=$('graph-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='graph-dialog';dialog.className='graph-dialog';dialog.innerHTML='<button class="dialog-close" aria-label="Tutup graf">×</button><h2></h2><div class="expanded-graph"></div>';document.body.append(dialog);dialog.querySelector('button').addEventListener('click',()=>dialog.close());}
    dialog.querySelector('h2').textContent=byId.get(state.id)?.term||'Grafik Istilah';
    KamusGraph.render(dialog.querySelector('.expanded-graph'),graphIndex,state.id,{maxNodes:KamusGraph.nodeLimit(Number(graphChoice.split(':')[1])||graphDepth,true),depth:Number(graphChoice.split(':')[1])||graphDepth,showControls:false,breadcrumbs:localBreadcrumbs(),onHome:()=>{dialog.close();showGraphOverview();openGlobal('theme',{groupBy:'theme',path:[]});},onGroup:group=>{dialog.close();showGraphOverview([group]);openGlobal('theme',{groupBy:'theme',path:[group]});},onBreadcrumb:(id,index)=>{dialog.close();selectEntry(id,{trailIndex:index});},onSelect:id=>{dialog.close();if(byId.has(id))selectEntry(id,{scrollList:true,appendTrail:true});}});dialog.showModal();
  }
  function reset(){clearTimeout(inputTimer);navigationId='';state={...state,q:'',language:'',wordType:'',savedOnly:false,letter:'',sort:browseOrder,id:featured.id};render({resetScroll:true,forceDetail:true});writeHash(true);}
  $('term-scroll').addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(()=>renderRows());});
  new ResizeObserver(()=>{rangeStart=-1;renderRows(true);}).observe($('term-scroll'));
  $('term-scroll').addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||!results.length)return;event.preventDefault();const old=results.findIndex(r=>r.entry.id===state.id),next=event.key==='Home'?0:event.key==='End'?results.length-1:Math.max(0,Math.min(results.length-1,(old<0?0:old)+(event.key==='ArrowDown'?1:-1)));selectEntry(results[next].entry.id,{push:false,scrollList:true});requestAnimationFrame(()=>$('results').querySelector('[data-entry="'+state.id+'"]')?.focus({preventScroll:true}));});
  $('search').addEventListener('input',()=>{updateSearchAction();if($('search').value.trim())enterReading();clearTimeout(inputTimer);inputTimer=setTimeout(()=>{navigationId='';state.q=$('search').value;state.letter='';render({resetScroll:true,selectFirst:true});writeHash();},160);});
  $('search-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(inputTimer);enterReading();state.q=$('search').value;state.letter='';render({resetScroll:true,selectFirst:true});writeHash(true);toggleSidebar(false);});
  $('search-action').addEventListener('click',()=>{if(!$('search').value.length)return;clearTimeout(inputTimer);navigationId='';state.q='';state.letter='';render({resetScroll:true,selectFirst:true});writeHash();$('search').focus();});
  for(const [id,key] of [['language','language'],['word-type','wordType']])$(id).addEventListener('change',()=>{enterReading();navigationId='';state[key]=$(id).value;render({resetScroll:true,selectFirst:true});writeHash(true);});
  $('nav-saved').addEventListener('click',()=>{enterReading();navigationId='';state={...state,q:'',language:'',wordType:'',savedOnly:!state.savedOnly,id:'',letter:''};render({resetScroll:true,selectFirst:true});writeHash(true);});
  S.mountDialog($('nav-about'),$('about-dialog'),$('close-about'));
  $('toggle-terms').addEventListener('click',()=>setPanel('terms',!panels.view().terms));$('toggle-graph').addEventListener('click',()=>setPanel('graph',!panels.view().graph));$('sidebar-backdrop').addEventListener('click',closeMobilePanels);panelMedia.addEventListener('change',()=>{panels.resize(panelMedia.matches);applyPanels();});
  function connectionChanged(){online=navigator.onLine!==false;if(isHome)return;const position=$('reader-scroll').scrollTop;render({forceDetail:true});$('reader-scroll').scrollTop=position;}
  addEventListener('online',connectionChanged);addEventListener('offline',connectionChanged);
  $('home-link').addEventListener('click',event=>{event.preventDefault();showHome();});
  document.addEventListener('click',async event=>{
    if(!event.target.closest('.graph-column-heading'))closeGraphMenu();
    const b=event.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-entry'))selectEntry(b.dataset.entry);
    if(b.hasAttribute('data-order'))toggleBrowseOrder();
    if(b.hasAttribute('data-letter')&&!railController.suppressed())jump(b.dataset.letter);
    if(b.hasAttribute('data-term'))openTerm(b.dataset.term);
    if(b.dataset.related){const e=byId.get(b.dataset.related);if(e)openTerm(e.term,e.id);}
    if(b.hasAttribute('data-reset'))reset();
    if(b.hasAttribute('data-retry')){const e=byId.get(state.id);if(e){networkController?.abort();networkController=new AbortController();$('reference-results').innerHTML='<p class="reference-status">Memeriksa kembali…</p>';try{const result=await refs.resolve(e,{online,refresh:true,signal:networkController.signal});if(state.id===e.id)renderReferences(result);}catch{}}}
    if(b.dataset.save){const id=b.dataset.save;if(saved.has(id))saved.delete(id);else saved.add(id);const persistent=store.set('kamus-saved-v1',[...saved]),readerPosition=$('reader-scroll').scrollTop,previousId=state.id;render({selectFirst:state.savedOnly,forceDetail:true});if(state.id===previousId)$('reader-scroll').scrollTop=readerPosition;notify(persistent?(saved.has(id)?'Istilah disimpan di perangkat ini.':'Istilah dihapus dari tersimpan.'):'Penanda hanya tersedia selama sesi ini.');writeHash();}
    if(b.dataset.share){writeHash();try{await navigator.clipboard.writeText(location.href);notify('Tautan istilah disalin.');}catch{notify('Tautan istilah tersedia di bilah alamat peramban.');}}
  });
  document.addEventListener('error',event=>{const img=event.target;if(img.tagName==='IMG'&&img.closest('.media-card')&&!img.dataset.failed){img.dataset.failed='1';img.hidden=true;const p=document.createElement('p');p.className='online-status';p.style.padding='12px';p.textContent='Gambar belum dapat dimuat. Tautan sumber tetap tersedia.';img.closest('.media-card').prepend(p);}},true);
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('about-dialog').open){event.preventDefault();if(!panels.view().terms)setPanel('terms',true);$('search').focus();}if(event.key==='Escape'){closeGraphMenu();if(panelMedia.matches)closeMobilePanels();}});
  addEventListener('popstate',()=>{readHash();render({resetScroll:true,forceDetail:true});if(state.letter)jump(state.letter,false);else if(!isHome&&state.id)revealSelection();});
  railController=KamusAlphabetRail.mount($('alphabet'),$('alphabet-preview'),{getLayout:()=>listLayout,getScroller:()=>$('term-scroll'),enabled:()=>!searching(),onStart:()=>{if(!isHome&&!currentDetailId)renderDetail();},onRender:()=>renderRows(true),onCommit:section=>{state.letter=section.letter;setRailActive(section.letter);writeHash();}});
  $('graph-view-toggle').addEventListener('click',()=>{const open=$('graph-view-menu').hidden;S.setMenuOpen($('graph-view-toggle'),$('graph-view-menu'),open);if(open)$('graph-view-menu').querySelector('[aria-checked="true"]')?.focus();});
  $('graph-view-menu').addEventListener('click',event=>{const item=event.target.closest('[data-graph-choice]');if(!item||item.disabled)return;rememberGraphDepth(Number(item.dataset.graphChoice.split(':')[1]));graphChoice=isHome?'global:theme':item.dataset.graphChoice;store.set('kamus-graph-view-v1',graphChoice);closeGraphMenu();renderGraph();});
  $('graph-view-menu').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeGraphMenu();$('graph-view-toggle').focus();}else if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const items=[...$('graph-view-menu').querySelectorAll('button')],at=items.indexOf(document.activeElement);items[(at+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus();}});
  document.body.classList.toggle('reading',reading);readHash();applyPanels();render();if(state.letter)jump(state.letter,false);
  KamusPanels.mountResizers({terms:$('sidebar'),graph:$('visual-panel'),read:()=>store.get('kamus-side-width-v1',null),save:width=>store.set('kamus-side-width-v1',width)});
})();


