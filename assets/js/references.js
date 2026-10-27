(function(root){
  'use strict';
  const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const meaning=entry=>typeof entry.editorial_meaning==='string'?entry.editorial_meaning:entry.definition;
  function variants(term){
    const t=term.trim().replace(/[’‘]/g,"'"),sentence=s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
    return [...new Set([t,sentence(t),t.toLowerCase(),sentence(t.replace(/[-–]/g,' ')),t.toLowerCase().replace(/ /g,'-')])].filter(Boolean);
  }
  function candidates(entry,language,provider){
    const primary=entry.languages.some(l=>l.code===language),translated=entry.translations.filter(t=>t.languages.some(l=>l.code===language)).flatMap(t=>t.terms);
    const acronym=/^[A-Z.\d &/-]{1,8}$/.test(entry.term);
    let names=primary&&!acronym?[entry.term,...translated]:[...translated,...(primary?[entry.term]:[])];
    if(provider==='wiktionary')names=[entry.term,...translated];
    if(!names.length)names=[entry.term];
    const list=[...new Set(names.slice(0,4).flatMap(variants))];return list.slice(0,14);
  }
  function imageQuery(entry){
    if(entry.external_links?.image_query)return entry.external_links.image_query;
    return entry.term;
  }
  function uniqueLinks(links){
    const seen=new Set();
    return (links||[]).filter(link=>{const key=(link.language||new URL(link.url).hostname).toLowerCase()+':'+String(link.title||decodeURIComponent(new URL(link.url).pathname)).normalize('NFC').toLowerCase().replace(/_/g,' ').trim();if(seen.has(key))return false;seen.add(key);return true;});
  }
  function imageScore(entry,name,description,categories='',fromArticle=false){
    const text=normalize(name+' '+description+' '+categories),query=normalize(imageQuery(entry));
    const required=Array.isArray(entry.external_links?.image_context)?entry.external_links.image_context.map(normalize).filter(Boolean):[];
    if(required.length&&!required.some(term=>(' '+text+' ').includes(' '+term+' ')))return -1;
    // Reject unrelated people/sports/entertainment senses of an otherwise exact name.
    const topic=normalize(entry.term+' '+meaning(entry)+' '+(entry.translations||[]).flatMap(t=>t.terms).join(' '));
    const unrelated=['baseball','basketball','racehorse','jockey','actor','actress','singer','album','movie','portrait','biography'];
    if(unrelated.some(term=>(' '+text+' ').includes(' '+term+' ')&&!(' '+topic+' ').includes(' '+term+' ')))return -1;
    const unit=/\b(liter|satuan|ukuran|gallon)\b/i.test(meaning(entry)||'');
    if(unit&&/\b(horse|pony|stallion|racehorse|jockey|dressage|gallop)\b/.test(text))return -1;
    const profession=/\b(contractor|kontraktor|pemborong|architect|arsitek|engineer|insinyur)\b/.test(normalize(entry.term+' '+(entry.translations||[]).flatMap(t=>t.terms).join(' ')));
    if(profession&&/\b(boekentoren|portrait|portret|biography|universitaire bibliotheek)\b/.test(text))return -1;
    const aliases=(entry.translations||[]).flatMap(t=>t.terms).map(normalize).filter(t=>t.length>3&&t!==query);
    const context=aliases.filter(t=>(' '+text+' ').includes(' '+t+' ')).length;
    const exact=(' '+text+' ').includes(' '+query+' '),built=/\b(architecture|architectural|building|construction|bouw|bouwplaats|bangunan|konstruksi|diagram|cross section)\b/.test(text);
    if(profession&&/^(contractor|architect|engineer)$/.test(query)&&!built&&!context)return -1;
    if(/\b(accessories|accessory|perlengkapan|tambahan|hiasan)\b/.test(query)&&/\b(moyu|rubik|puzzle|cosmetic|jewelry)\b/.test(text)&&!built)return -1;
    if(!fromArticle&&!context&&!exact)return -1;
    // Preserve exact-headword results even when multilingual metadata is sparse.
    // Context ranks them; archive provenance alone is not a mismatch.
    return (fromArticle?10:0)+context*3+(exact?2:0)+(built?3:0)+(/\b(illustration|diagram)\b/.test(text)?2:0);
  }
  function allowedArticle(url,provider){try{const u=new URL(url);return u.protocol==='https:'&&new RegExp('^[a-z-]+\\.'+provider+'\\.org$').test(u.hostname)&&u.pathname.startsWith('/wiki/')&&!/\/(?:Special|Istimewa):/i.test(u.pathname);}catch{return false;}}
  function create(options={}){
    const request=options.fetch||root.fetch.bind(root),storage=options.storage===undefined?(()=>{try{return root.localStorage;}catch{return null;}})():options.storage,seeds=options.seeds||root.KAMUS_REFERENCE_SEEDS||{};
    let cache={};try{cache=JSON.parse(storage?.getItem('kamus-reference-cache-v2')||'{}');}catch{}
    function save(key,value){cache[key]={at:Date.now(),value};const keys=Object.keys(cache).sort((a,b)=>cache[b].at-cache[a].at);keys.slice(120).forEach(k=>delete cache[k]);try{storage?.setItem('kamus-reference-cache-v2',JSON.stringify(cache));}catch{}}
    async function api(host,params,signal){
      const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)throw new DOMException('Aborted','AbortError');signal?.addEventListener('abort',abort,{once:true});
      const timeout=setTimeout(abort,10000);
      try{
        const url=new URL('https://'+host+'/w/api.php');url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',...params});
        const response=await request(url.href,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok)throw new Error('HTTP '+response.status);const body=await response.json();if(body.error)throw new Error(body.error.info||'Wiki API error');return body;
      }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
    }
    async function queryTitles(provider,language,titles,signal){
      const body=await api(language+'.'+provider+'.org',{titles:titles.join('|'),redirects:'1',prop:'info|pageprops',inprop:'url'},signal);
      return (body.query?.pages||[]).filter(p=>!p.missing&&!p.invalid&&p.ns===0&&!Object.hasOwn(p.pageprops||{},'disambiguation')&&allowedArticle(p.fullurl,provider)).map(p=>({title:p.title,url:p.fullurl,language,method:'title-match'}));
    }
    async function provider(entry,name,{signal,online=true,refresh=false}={}){
      const overrides=(entry.external_links?.[name]||[]).filter(x=>allowedArticle(x.url,name));
      if(overrides.length)return {status:'found',links:overrides.map(x=>({...x,method:'curated'})),curated:true};
      const seeded=seeds[entry.id];if(seeded&&normalize(seeded.term)===normalize(entry.term)&&seeded[name]?.length)return {status:'found',links:seeded[name],seed:true,checked_at:seeded.checked_at};
      const cacheKey=name+':'+entry.id+':'+JSON.stringify([entry.term,entry.language_raw,entry.translations]);
      const old=cache[cacheKey],ttl=old?.value.status==='found'?7*86400000:86400000;
      if(old&&!refresh&&Date.now()-old.at<ttl)return {...old.value,cached:true};
      if(!online)return old?{...old.value,cached:true}:{status:'offline',links:[]};
      const code=entry.languages[0]?.code,first=name==='wiktionary'?'en':['id','en','nl','fr','de'].includes(code)?code:'en';
      const editions=[first,first==='en'?'id':'en'];
      const calls=await Promise.allSettled(editions.map(lang=>queryTitles(name,lang,candidates(entry,lang,name),signal)));
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      const links=[],seen=new Set();
      for(const call of calls)if(call.status==='fulfilled')for(const page of call.value)if(!seen.has(page.url)){seen.add(page.url);links.push(page);}
      const checked_at=new Date().toISOString(),result={status:links.length?'found':calls.some(c=>c.status==='rejected')?'error':'missing',links:links.slice(0,3),checked_at};
      if(result.status!=='error')save(cacheKey,result);
      return result.status==='error'&&old?{...old.value,cached:true,error:true}:result;
    }
    async function resolve(entry,opts){const [wikipedia,wiktionary]=await Promise.all([provider(entry,'wikipedia',opts),provider(entry,'wiktionary',opts)]);return {wikipedia,wiktionary:{...wiktionary,links:uniqueLinks(wiktionary.links)}};}
    function plain(html){if(typeof DOMParser!=='undefined')return new DOMParser().parseFromString(String(html||''),'text/html').body.textContent||'';return String(html||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&');}
    async function images(entry,query,{signal,online=true,limit=3,refresh=false,article}={}){
      const q=(query||imageQuery(entry)).trim(),cacheKey='images-v10:'+entry.id+':'+normalize(q)+':'+JSON.stringify([meaning(entry),entry.related,entry.external_links||{}]),old=cache[cacheKey],ttl=old?.value.status==='found'?7*86400000:6*3600000;
      if(old&&!refresh&&Date.now()-old.at<ttl)return {...old.value,cached:true,query:q,images:old.value.images.slice(0,limit)};
      if(!online)return old?{...old.value,cached:true,query:q,images:old.value.images.slice(0,limit)}:{status:'offline',images:[],query:q};
      const accepted=[],seen=new Set(),isUnit=/\b(liter|satuan|ukuran|gallon)\b/i.test(meaning(entry)),exclude=/\b(flag|logo|icon|commons[-_ ]|edit[-_ ]|wikimedia|wikidata|pictogram|disambig|ambox)\b/i;
      function convert(pages,origin,articleURL,scoreEntry=entry){
        const ranked=pages.map((page,order)=>{const meta=page.imageinfo?.[0]?.extmetadata||{},score=imageScore(scoreEntry,plain(page.title),plain(meta.ImageDescription?.value),plain(meta.Categories?.value),!!articleURL);return {page,score,order};}).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||a.order-b.order);
        for(const {page} of ranked){const info=page.imageinfo?.[0],meta=info?.extmetadata||{},name=plain(page.title.replace(/^[^:]+:/,''));
          if(!info?.thumburl||!info.descriptionurl||exclude.test(name)||!['image/jpeg','image/png','image/webp','image/svg+xml'].includes(info.mime))continue;
          if(info.width&&info.width<100||info.height&&info.height<70)continue;
          if(isUnit&&/\b(horse|pony|stallion|racehorse|jockey|dressage|gallop)\b/i.test(name+' '+plain(meta.ImageDescription?.value)))continue;
          try{if(!['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(info.thumburl).hostname)||!/(^|\.)(wikimedia|wikipedia)\.org$/.test(new URL(info.descriptionurl).hostname))continue;}catch{continue;}
          if(seen.has(info.descriptionurl))continue;seen.add(info.descriptionurl);
          accepted.push({url:info.thumburl,source_url:info.descriptionurl,title:name.replace(/\.(jpe?g|png|webp|svg)$/i,''),creator:plain(meta.Artist?.value)||'Lihat halaman sumber',license:plain(meta.LicenseShortName?.value)||'Lihat informasi penggunaan di sumber',alt:plain(meta.ImageDescription?.value).slice(0,250)||name,origin,article_url:articleURL,width:info.thumbwidth,height:info.thumbheight});
          if(accepted.length>=limit)break;
        }
      }
      try{
        const wikipedia=article||await provider(entry,'wikipedia',{signal,online});
        const exact=wikipedia.links?.[0];
        // Article images are used only when the article title matches the actual
        // image query. A translated article must not silently replace the term.
        const matchesQuery=exact&&normalize(exact.title.replace(/\([^)]*\)/g,''))===normalize(q);
        if(matchesQuery&&allowedArticle(exact.url,'wikipedia')){
          const url=new URL(exact.url),title=decodeURIComponent(url.pathname.slice(6)).replace(/_/g,' ');
          const body=await api(url.hostname,{titles:title,redirects:'1',prop:'images|pageimages',imlimit:'25',piprop:'name',pilicense:'any'},signal);
          const page=(body.query?.pages||[]).find(p=>!p.missing),fileKey=name=>normalize(name.replace(/^[^:]+:/,''));
          let bodyImages=(page?.images||[]).map(i=>i.title),articleImages;
          if(typeof DOMParser!=='undefined'){
            try{const parsed=await api(url.hostname,{action:'parse',page:title,prop:'text',disableeditsection:'1',disablelimitreport:'1'},signal),doc=new DOMParser().parseFromString(parsed.parse?.text||'','text/html');
              doc.querySelectorAll('.navbox,.vertical-navbox,.metadata,.portal,.noprint,.mw-editsection,.sistersitebox,.mw-indicators').forEach(n=>n.remove());
              articleImages=[...doc.querySelectorAll('a.mw-file-description[href],a.image[href]')].map(a=>{const href=a.getAttribute('href')||'',match=href.match(/(?:\.\/|\/wiki\/)((?:File|Berkas|Image|Bestand|Fichier|Datei):[^?#]+)/i);try{return match?decodeURIComponent(match[1]):'';}catch{return '';}}).filter(Boolean);
              bodyImages=articleImages;
            }catch(error){if(signal?.aborted)throw error;bodyImages=[];}
          }
          const names=[],keys=new Set();for(const name of [...(page?.pageimage?['File:'+page.pageimage]:[]),...bodyImages]){const key=fileKey(name);if(exclude.test(name)||keys.has(key))continue;if(articleImages&&!articleImages.some(n=>fileKey(n)===key))continue;keys.add(key);names.push(name);if(names.length>=18)break;}
          if(names.length){const files=await api(url.hostname,{titles:names.join('|'),prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'640'},signal);const order=new Map(names.map((n,i)=>[fileKey(n),i]));const pages=(files.query?.pages||[]).sort((a,b)=>(order.get(fileKey(a.title))??999)-(order.get(fileKey(b.title))??999));convert(pages,'Wikipedia · '+exact.title,exact.url);}
        }
        if(accepted.length<limit){
          const qualifier=/^(contractor|architect|engineer)$/i.test(q)?' construction':'';
          const body=await api('commons.wikimedia.org',{generator:'search',gsrsearch:'intitle:"'+q.replace(/"/g,'')+'"'+qualifier,gsrnamespace:'6',gsrlimit:'24',gsrprop:'',prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'640'},signal);
          convert((body.query?.pages||[]).sort((a,b)=>(a.index||0)-(b.index||0)),'Wikimedia Commons · cocok judul','');
        }
        // Only explicit "lihat" references from the source can supplement a
        // sparse gallery; inferred graph neighbours never become image queries.
        const references=[...new Set((entry.related||[]).map(r=>r.term).filter(t=>t&&normalize(t)!==normalize(q)))].slice(0,2);
        for(const term of references){
          if(accepted.length>=limit)break;
          const body=await api('commons.wikimedia.org',{generator:'search',gsrsearch:'intitle:"'+term.replace(/"/g,'')+'"',gsrnamespace:'6',gsrlimit:'16',gsrprop:'',prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'640'},signal);
          convert((body.query?.pages||[]).sort((a,b)=>(a.index||0)-(b.index||0)),'Wikimedia Commons · rujukan '+term,'',{...entry,term,external_links:{...entry.external_links,image_query:term}});
        }
        const result={status:accepted.length?'found':'missing',images:accepted.slice(0,limit),query:q};save(cacheKey,result);return result;
      }catch(error){if(signal?.aborted)throw error;if(accepted.length){const result={status:'found',images:accepted.slice(0,limit),query:q,partial:true};save(cacheKey,result);return result;}return old?{...old.value,cached:true,error:true,query:q}:{status:'error',images:[],query:q};}
    }
    return {resolve,provider,images,queryTitles};
  }
  const exported={create,candidates,variants,imageQuery,imageScore,uniqueLinks,allowedArticle};if(typeof module!=='undefined'&&module.exports)module.exports=exported;else root.KamusReferences=exported;
})(typeof window==='undefined'?globalThis:window);
