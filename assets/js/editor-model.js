(function(root){
  'use strict';
  const S=typeof module!=='undefined'&&module.exports?require('./shared.js'):root.KamusShared;
  const Content=typeof module!=='undefined'&&module.exports?require('./entry-content.js'):root.KamusContent;
  const statuses={draft:'Draf lokal',needs_review:'Butuh perbaikan',missing_meaning:'Makna belum tersedia',missing_images:'Gambar belum dikurasi',unresolved:'Rujukan belum tersambung',reviewed:'Sudah ditinjau'};
  const flags={malformed_html_in_source:'Format sumber rusak',malformed_header_parenthesis:'Tanda kurung sumber rusak',unrecognized_language_label:'Bahasa perlu diperiksa',headword_outside_source_alphabet:'Judul di luar abjad sumber',suspected_source_headword_typo:'Dugaan salah eja judul',unrecognized_word_type_kkv:'Jenis kata perlu diperiksa',missing_or_unrecognized_word_type:'Jenis kata belum tersedia',empty_definition:'Makna sumber kosong',source_missing_headword:'Judul sumber tidak tersedia',manual_entry_needs_review:'Entri baru belum ditinjau',editorial_review_requested:'Tinjauan belum selesai'};
  function statusCodes(entry,draft=false){const result=[];if(draft)result.push('draft');if(entry.review_flags.length||entry.editorial_status==='needs_review')result.push('needs_review');if(!Content.meaning(entry))result.push('missing_meaning');if(!entry.images.length)result.push('missing_images');if(entry.related.some(r=>!r.resolved))result.push('unresolved');if(entry.editorial_status==='reviewed'||entry.source_review_flags?.length&&!entry.review_flags.length)result.push('reviewed');return result;}
  function matches(entry,{theme='',status='',draft=false,associations}={}){
    const tags=associations?.byEntry[entry.id];
    return (!status||statusCodes(entry,draft).includes(status))&&(!theme||(theme.startsWith('category:')?tags?.categories?.includes(theme.slice(9)):tags?.themes?.includes(theme)||theme==='general'&&!tags?.themes?.length));
  }
  function languageValue(entry){return entry.languages.map(l=>l.code==='ja'?'Jp.':l.code==='und'?l.label:l.label||l.name).join(', ');}
  function parseTranslations(text){return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(line=>{const at=line.indexOf('|');if(at<0)throw new Error('Padanan perlu format: Ing. | istilah; istilah lain.');const languages=S.languages(line.slice(0,at).trim()),terms=line.slice(at+1).split(';').map(s=>s.trim()).filter(Boolean);if(!languages.length||!terms.length)throw new Error('Bahasa dan istilah padanan tidak boleh kosong.');return {terms,languages};});}
  function parseLinks(text,provider){return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(value=>{const url=S.articleURL(value,provider);if(!url)throw new Error('Gunakan URL artikel langsung '+provider+', bukan alamat pencarian.');const u=new URL(url);return {url,title:decodeURIComponent(u.pathname.slice(6)).replace(/_/g,' '),language:u.hostname.split('.')[0],method:'curated'};});}
  function edit(entry,values,{editorName='Penyunting lokal',isNew=false,themeIds=[]}={}){
    const term=values.term.trim(),language=values.language.trim(),type=values.wordType||null;
    if(!term)throw new Error('Isi istilah sebelum menyimpan.');if(!language)throw new Error('Isi bahasa istilah.');
    const url=values.sourceURL.trim();if(url&&!S.safeURL(url))throw new Error('URL sumber harus berupa alamat https yang valid.');
    const related=[...new Set(values.related.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))].map(term=>({term,entry_ids:[],resolved:false}));
    const languageChanged=language!==languageValue(entry),reviewed=values.reviewed;
    const out={...entry,term,word_type:type,word_type_label:S.wordTypes[type]||(type||'Belum ditandai'),
      languages:languageChanged?S.languages(language):entry.languages,language_raw:languageChanged?language:entry.language_raw,
      translations:parseTranslations(values.translations),related,source_url:url,source_label:values.sourceLabel.trim(),images:values.images.filter(image=>image.url),
      external_links:{...entry.external_links,wikipedia:parseLinks(values.wikipedia,'wikipedia'),wiktionary:parseLinks(values.wiktionary,'wiktionary'),image_query:values.imageQuery.trim(),image_context:values.imageContext.split(/[,\n]/).map(s=>s.trim()).filter(Boolean)},
      source_review_flags:entry.source_review_flags||entry.review_flags,
      review_flags:reviewed?[]:entry.review_flags.length?entry.review_flags:['editorial_review_requested'],editorial_status:reviewed?'reviewed':'needs_review',
      editorial_updated_at:new Date().toISOString(),editorial_updated_by:editorName};
    const meaning=values.meaning.trim();if(meaning||meaning!==Content.description(entry)||Object.hasOwn(entry,'editorial_meaning'))out.editorial_meaning=meaning;
    if(languageChanged&&!isNew)out.source_language_raw=entry.source_language_raw||entry.language_raw;
    if(values.autoThemes)delete out.editorial_tags;
    else {const themes=[...new Set(values.themes)];if(!themes.length)throw new Error('Pilih setidaknya satu tema, atau gunakan pengelompokan otomatis.');if(themes.some(id=>!themeIds.includes(id)))throw new Error('Tema tidak dikenali.');const previous=JSON.stringify(themes)===JSON.stringify(entry.editorial_tags?.themes)?entry.editorial_tags.reason:'';out.editorial_tags={themes,reason:values.note.trim()||previous||'Pilihan tema oleh '+editorName+'.',reviewed_on:out.editorial_updated_at.slice(0,10)};}
    if(isNew){out.letter=/^[A-Z]$/.test(term.charAt(0).toUpperCase())?term.charAt(0).toUpperCase():'#';out.related_raw=related.map(r=>r.term);out.source_text=`${term} (${language}) ${type||''}; ${meaning}`;}
    return out;
  }
  const api={statuses,flags,statusCodes,matches,languageValue,parseTranslations,parseLinks,edit};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusEditorModel=api;
})(typeof window==='undefined'?globalThis:window);
