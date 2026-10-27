(function(root){
  'use strict';
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const languageTable={Ind:['id','Indonesia'],Ing:['en','Inggris'],Bld:['nl','Belanda'],Per:['fr','Prancis'],Jw:['jv','Jawa'],Sd:['su','Sunda'],Lat:['la','Latin'],Jer:['de','Jerman'],Ar:['ar','Arab'],It:['it','Italia'],Jp:['ja','Jepang'],Jpg:['ja','Jepang']};
  const wordTypes={kb:'Kata benda',kk:'Kata kerja',aj:'Kata sifat',ks:'Kata sambung',kkt:'Kata kerja transitif',adv:'Kata keterangan',num:'Kata bilangan',pron:'Kata ganti',p:'Partikel',interj:'Kata seru'};
  function languages(raw){return [...new Set((String(raw).match(/[A-Za-z]+/g)||[]).map(label=>/^jpg$/i.test(label)?'Jp':label))].map(label=>{const k=Object.keys(languageTable).find(k=>k.toLowerCase()===label.toLowerCase()),v=languageTable[k];return v?{code:v[0],name:v[1],label:k+'.'}:{code:'und',name:label,label};});}
  const key=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  function safeURL(value,{image=false,local=false}={}){
    if(!value)return '';
    if(local&&!/^[a-z][a-z\d+.-]*:/i.test(value)&&!value.startsWith('//')&&!value.split(/[\\/]/).includes('..'))return value;
    try{const u=new URL(value);return u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))?u.href:'';}catch{return '';}
  }
  function articleURL(value,provider){try{const u=new URL(value);return u.protocol==='https:'&&new RegExp('^[a-z-]+\\.'+provider+'\\.org$').test(u.hostname)&&u.pathname.startsWith('/wiki/')&&!/\/(?:Special|Istimewa):/i.test(u.pathname)?u.href:'';}catch{return '';}}
  // Keep pre-release drafts/imports usable after the asset and label cleanup.
  function normalizeEntry(entry){
    if(!entry||typeof entry!=='object')return entry;
    const out={...entry},labels=list=>Array.isArray(list)?list.map(l=>l?.code==='ja'?{...l,label:'Jp.'}:l):list;
    if(typeof out.language_raw==='string'&&/\bJpg\./.test(out.language_raw)){out.source_language_raw??=out.language_raw;out.language_raw=out.language_raw.replace(/\bJpg\./g,'Jp.');}
    out.languages=labels(out.languages);
    if(Array.isArray(out.translations))out.translations=out.translations.map(t=>({...t,languages:labels(t.languages)}));
    if(Array.isArray(out.images))out.images=out.images.map(image=>image.url==='assets/brise-soleil.svg'?{...image,url:'assets/images/brise-soleil.svg'}:image);
    return out;
  }
  function restoreDrafts(original,old){
    const entries=new Map(original.entries.map(e=>[e.id,e]));
    for(const id of old.removed||[])entries.delete(id);
    for(const [id,e] of Object.entries(old.updates||{})){
      const base=entries.get(id),supplements={...base?.supplemental_meanings,...e.supplemental_meanings};
      if(base?.supplemental_meanings?.kbbi_iii?.source_id===e.supplemental_meanings?.kbbi_iii?.source_id&&base?.supplemental_meanings?.kbbi_iii?.term===e.supplemental_meanings?.kbbi_iii?.term)supplements.kbbi_iii=base.supplemental_meanings.kbbi_iii;
      entries.set(id,Object.keys(supplements).length?{...e,supplemental_meanings:supplements}:e);
    }
    const metadata={...original.metadata,...old.metadata,supplemental_sources:{...old.metadata?.supplemental_sources,...original.metadata.supplemental_sources}};
    return {entries:[...entries.values()].map(normalizeEntry),metadata,sources:old.sources||original.sources};
  }
  function validateDataset(d){
    if(!d||!Array.isArray(d.entries)||!d.metadata||!Array.isArray(d.sources))throw new Error('Berkas bukan dataset kamus yang dikenali.');
    const ids=new Set();
    for(const e of d.entries){
      if(typeof e.id!=='string'||!e.id||ids.has(e.id))throw new Error('ID entri kosong atau duplikat.');ids.add(e.id);
      if(typeof e.term!=='string'||!e.term.trim()||typeof e.definition!=='string')throw new Error('Istilah dan definisi harus berupa teks.');
      if(e.editorial_meaning!==undefined&&typeof e.editorial_meaning!=='string')throw new Error('Makna suntingan harus berupa teks.');
      if(e.editorial_status!==undefined&&!['reviewed','needs_review'].includes(e.editorial_status))throw new Error('Status tinjauan tidak dikenali.');
      for(const field of ['languages','translations','related','equivalent_ids','review_flags','images'])if(!Array.isArray(e[field]))throw new Error('Kolom '+field+' harus berupa daftar.');
      if(!e.languages.every(l=>l&&typeof l.code==='string'&&typeof l.name==='string'))throw new Error('Label bahasa tidak valid.');
      if(!e.translations.every(t=>t&&Array.isArray(t.terms)&&t.terms.every(x=>typeof x==='string')&&Array.isArray(t.languages)))throw new Error('Padanan bahasa tidak valid.');
      for(const image of e.images)if(!safeURL(image.url,{local:true})||!image.alt||!image.creator||!image.license||!safeURL(image.source_url))throw new Error('Gambar memerlukan alamat, deskripsi, pembuat, lisensi, dan sumber yang valid.');
      for(const provider of ['wikipedia','wiktionary'])for(const link of e.external_links?.[provider]||[])if(!articleURL(link.url,provider))throw new Error('Tautan '+provider+' harus menuju halaman artikel langsung.');
      if(e.external_links?.image_context!==undefined&&(!Array.isArray(e.external_links.image_context)||!e.external_links.image_context.every(term=>typeof term==='string'&&term.trim())))throw new Error('Konteks gambar harus berupa daftar istilah.');
      if(e.editorial_tags&&(!Array.isArray(e.editorial_tags.themes)||!e.editorial_tags.themes.every(id=>typeof id==='string'&&id.trim())))throw new Error('Tag tinjauan harus berupa daftar ID tema.');
      const offline=e.supplemental_meanings?.kbbi_iii;
      if(offline){
        const Content=typeof module!=='undefined'&&module.exports?require('./entry-content.js'):root.KamusContent;
        // Renamed entries keep their archived supplement, but it is hidden until
        // explicitly rematched. Validate the supplement against its recorded term.
        if(!Content?.validKBBIIII(offline,offline.term))throw new Error('Makna KBBI III memerlukan istilah, cuplikan, dan jejak sumber yang valid.');
        const source=d.metadata.supplemental_sources?.[offline.source_id];
        if(source?.edition!=='III'||!/^[a-f\d]{64}$/.test(source.source_sha256||''))throw new Error('Sumber data KBBI III tidak tersedia atau tidak valid.');
      }
    }
    for(const e of d.entries)for(const id of [...e.equivalent_ids,...e.related.flatMap(r=>r.entry_ids||[])])if(!ids.has(id))throw new Error('Rujukan ke ID yang tidak tersedia: '+id);
    return d;
  }
  function rebuildRelations(d){
    const lookup=new Map();d.entries.forEach(e=>{const k=key(e.term);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push(e.id);});
    for(const e of d.entries){
      e.equivalent_ids=[...new Set(e.translations.flatMap(t=>t.terms).flatMap(term=>lookup.get(key(term))||[]).filter(id=>id!==e.id))];
      e.related=e.related.map(r=>{const ids=(lookup.get(key(r.term))||[]).filter(id=>id!==e.id);return {...r,entry_ids:ids,resolved:ids.length>0};});
    }return d;
  }
  function toCSV(d){const cols=['id','term','letter','language_raw','word_type','word_type_label','definition','editorial_meaning','related_terms','themes','editorial_status','source_label','source_url','review_flags'],cell=x=>'"'+String(x??'').replace(/"/g,'""')+'"';return '\ufeff'+[cols,...d.entries.map(e=>cols.map(k=>k==='related_terms'?e.related.map(r=>r.term).join(' | '):k==='review_flags'?e.review_flags.join(' | '):k==='themes'?(e.editorial_tags?.themes||[]).join(' | '):e[k]))].map(row=>row.map(cell).join(',')).join('\r\n');}
  const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc32(bytes){let crc=-1;for(const b of bytes)crc=(crc>>>8)^crcTable[(crc^b)&255];return (crc^-1)>>>0;}
  // A small standards-based ZIP writer (stored entries, UTF-8 names). No library,
  // installation, remote server, or multiple-download permission is required.
  function zip(files){
    const encoder=new TextEncoder(),parts=[],central=[];let offset=0,centralSize=0;
    for(const [name,text] of Object.entries(files)){
      const filename=encoder.encode(name),bytes=encoder.encode(text),crc=crc32(bytes),head=new Uint8Array(30+filename.length),v=new DataView(head.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,filename.length,true);head.set(filename,30);
      const cd=new Uint8Array(46+filename.length),c=new DataView(cd.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,filename.length,true);c.setUint32(42,offset,true);cd.set(filename,46);central.push(cd);centralSize+=cd.length;parts.push(head,bytes);offset+=head.length+bytes.length;
    }
    const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
  }
  function exportFiles(d,changes=[],associations){
    validateDataset(d);d.metadata.entry_count=d.entries.length;
    const files={'data/dictionary.json':JSON.stringify(d,null,2)+'\n','data/dictionary.js':'window.DICTIONARY_DATA = '+JSON.stringify(d)+';\n','data/entries.csv':toCSV(d),'data/editor-changes.json':JSON.stringify(changes,null,2)+'\n'};
    if(associations)files['data/associations.json']=JSON.stringify(associations,null,2)+'\n';
    if(associations){const Reader=typeof module!=='undefined'&&module.exports?require('./reader-data.js'):root.KamusReaderData;files['data/reader.js']=Reader.script(d,associations);}
    return files;
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  function setMenuOpen(button,menu,open){menu.hidden=!open;button.setAttribute('aria-expanded',String(open));button.classList.toggle('open',open);button.classList.remove('active');}
  function mountDialog(button,dialog,close){
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialog.id);
    button.addEventListener('click',()=>{dialog.showModal();button.setAttribute('aria-expanded','true');});
    dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});});
    close.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  }
  const api={escape,languages,wordTypes,key,safeURL,articleURL,normalizeEntry,restoreDrafts,validateDataset,rebuildRelations,toCSV,zip,exportFiles,download,setMenuOpen,mountDialog};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusShared=api;
})(typeof window==='undefined'?globalThis:window);
