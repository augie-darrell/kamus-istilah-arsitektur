(function(root){
  'use strict';
  const KBBI=typeof module!=='undefined'&&module.exports?require('./kbbi-format.js'):root.KamusKBBI;
  // Reading view only: the archived definition and source text stay intact.
  function description(entry){
    if(typeof entry.editorial_meaning==='string')return entry.editorial_meaning.trim();
    let text=String(entry.definition||'').trim();
    if(entry.translations?.length){
      const separator=/\s+[-–—]\s+|^[-–—]\s+|\)[-–—]\s+/.exec(text);
      if(!separator)return '';
      text=text.slice(separator.index+separator[0].length).trim();
    }else text=text.replace(/^[-–—]\s+/, '');
    if(entry.related?.length){
      const reference=/\b(?:lih\.|lihat\b)\s*/i.exec(text);
      if(reference)text=text.slice(0,reference.index).replace(/[\s,;:–—-]+$/,'').trim();
    }
    return text.replace(/^([\s"'“‘(]*)(\p{Ll})/u,(_,prefix,letter)=>prefix+letter.toLocaleUpperCase('id-ID'));
  }
  function needsKBBI(entry){return entry.languages?.some(l=>l.code==='id')&&!description(entry);}
  function kbbiURL(entry){return 'https://kbbi.kemendikdasmen.go.id/entri/'+encodeURIComponent(String(entry.term||'').trim().toLocaleLowerCase('id-ID'));}
  const word=s=>String(s||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('id-ID');
  function validKBBIIII(item,term){
    if(!item||item.edition!=='III'||item.source_id!=='kbbi-iii-offline-1.5.1'||word(item.term)!==word(term))return false;
    function blocks(list,expected,depth=0){
      return depth<7&&Array.isArray(list)&&list.length>0&&list.every(b=>{
        if(!b||!/^kbbi3-[a-f\d]{16}$/.test(b.entry_id)||typeof b.headword!=='string'||!b.headword.trim()||(expected!==null&&word(b.matched_term)!==word(expected))||typeof b.text!=='string'||(!b.text.trim()&&!b.redirects))return false;
        if(!['headword','subentry'].includes(b.match)||(b.homonym_number!==null&&(!Number.isInteger(b.homonym_number)||b.homonym_number<1)))return false;
        if(b.match==='headword'?(b.subentry_index!==null||word(b.headword)!==word(b.matched_term)):(!Number.isInteger(b.subentry_index)||b.subentry_index<0))return false;
        if(!Number.isInteger(b.source_span?.start)||!Number.isInteger(b.source_span?.end)||b.source_span.start<0||b.source_span.end<b.source_span.start||!Array.isArray(b.source_records)||!b.source_records.length||!b.source_records.every(n=>Number.isInteger(n)&&n>0))return false;
        if(b.reading&&!KBBI.validReading(b.reading))return false;
        if(b.derivatives&&(!blocks(b.derivatives,null,depth+1)||!b.derivatives.every(d=>d.entry_id===b.entry_id&&d.match==='subentry')))return false;
        if(b.redirects){const ref=/^(\d+)?(.*)$/.exec(String(b.redirect_target||'').trim());return !!ref[2]&&blocks(b.redirects,ref[2],depth+1)&&(!ref[1]||b.redirects.every(r=>r.homonym_number===Number(ref[1])));}
        return !b.redirect_target;
      });
    }
    return blocks(item.matches,term);
  }
  function kbbiIIIText(matches){return matches.map(b=>[b.text,b.redirects?kbbiIIIText(b.redirects):'',b.derivatives?kbbiIIIText(b.derivatives):''].filter(Boolean).join('\n')).join('\n\n');}
  function meaning(entry){
    if(entry.reading?.term===entry.term){
      const item=entry.reading;
      if(item.provider!=='kbbi_iii')return item;
      const search_text=item.layout.items.map(i=>i.term+' '+i.senses.map(s=>KBBI.formatSense(s.text)).join(' ')).join(' ')+' '+item.layout.tags.map(t=>t.label).join(' ');
      return {...item,search_text};
    }
    const original=description(entry);if(original)return {text:original,label:'MAKNA',provider:'source'};
    if(!needsKBBI(entry))return null;
    // Optional supplemental data must carry its exact headword and provenance.
    // No KBBI definition is invented or inferred from a translation.
    const item=entry.supplemental_meanings?.kbbi;
    if(typeof item?.text==='string'&&item.text.trim()&&word(item.term)===word(entry.term)){
      try{const u=new URL(item.source_url);if(u.protocol==='https:'&&u.hostname==='kbbi.kemendikdasmen.go.id'&&u.pathname.startsWith('/entri/')&&word(decodeURIComponent(u.pathname.slice(7)))===word(entry.term))return {text:item.text.trim(),label:'MAKNA DARI KBBI',provider:'kbbi',source_url:u.href};}catch{}
    }
    const offline=entry.supplemental_meanings?.kbbi_iii;
    if(!validKBBIIII(offline,entry.term))return null;
    const layout=KBBI.present(offline.matches),search_text=layout.items.map(i=>i.term+' '+i.senses.map(s=>KBBI.formatSense(s.text)).join(' ')).join(' ')+' '+layout.tags.map(t=>t.label).join(' ');
    return {text:kbbiIIIText(offline.matches),matches:offline.matches,layout,search_text,label:'MAKNA DARI KBBI III',provider:'kbbi_iii'};
  }
  function wordTypeSummary(entry,content=meaning(entry)){
    const types=content?.provider==='kbbi_iii'?[...new Set(content.layout.wordTypes)]:[];
    if(types.length){const abbreviations=KBBI.abbreviateTypes(types);return {label:KBBI.labelTypes(types),abbreviations,codes:abbreviations.split(' / ')};}
    return {label:[entry.word_type_label,entry.word_type].filter(Boolean).join(' · '),abbreviations:entry.word_type||'',codes:entry.word_type?[entry.word_type]:[]};
  }
  const api={description,needsKBBI,kbbiURL,meaning,wordTypeSummary,validKBBIIII,kbbiIIIText};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusContent=api;
})(typeof window==='undefined'?globalThis:window);
