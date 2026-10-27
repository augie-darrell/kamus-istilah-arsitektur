(function(root){
  'use strict';
  const labelReference='https://kbbi.kemendikdasmen.go.id/Content/Files/Petunjuk%20Pemakaian.PDF';
  const wordTypes={n:'Kata benda',v:'Kata kerja',a:'Kata sifat',adv:'Kata keterangan',num:'Kata bilangan',p:'Partikel',pron:'Kata ganti',interj:'Kata seru'};
  // Legacy aliases occur in the supplied edition III. These are subject labels,
  // not a change to its dictionary edition or an official Uniclass mapping.
  const names={Adm:'Administrasi dan kepegawaian',Anat:'Anatomi',Antr:'Antropologi',Ant:'Antropologi',Ark:'Arkeologi',Ars:'Arsitektur',Astrol:'Astrologi',Astron:'Astronomi',Bakt:'Bakteriologi',Bio:'Biologi',Bot:'Botani',Bud:'Agama Buddha',Dag:'Perdagangan',Dem:'Demografi',Dik:'Pendidikan',Dirg:'Kedirgantaraan',Dok:'Kedokteran dan fisiologi',Ek:'Ekonomi dan keuangan',Ekol:'Ekologi',El:'Elektronika',Ent:'Entomologi',Far:'Farmasi dan farmakologi',Fil:'Filsafat',Filol:'Filologi',Fis:'Fisika',Geo:'Geografi dan geologi',Gz:'Ilmu gizi',Graf:'Grafika',Hid:'Hidrologi',Hidm:'Hidrometeorologi',Hin:'Agama Hindu',Hub:'Perhubungan',Huk:'Hukum',Hut:'Kehutanan',Idt:'Perindustrian dan kerajinan',Ikn:'Perikanan',Isl:'Agama Islam',Kap:'Perkapalan',Kat:'Agama Katolik',Kes:'Kesehatan',Keu:'Keuangan',Kim:'Kimia',Kom:'Ilmu komunikasi',Komp:'Komputer dan teknologi informasi',Kris:'Agama Kristen',Lay:'Pelayaran',Ling:'Linguistik',Man:'Manajemen',Mat:'Matematika',Mek:'Mekanika',Met:'Meteorologi',Metal:'Metalurgi',Mik:'Mikologi',Mil:'Kemiliteran',Min:'Mineralogi',Mus:'Musik',Nanotek:'Nanoteknologi',Olr:'Olahraga',Osn:'Oseanologi',Oto:'Otomotif',Pang:'Ilmu pangan',Pet:'Petrologi dan migas',Pol:'Politik dan pemerintahan',Prm:'Pramuka',Psi:'Psikologi',Pust:'Ilmu perpustakaan dan dokumentasi',Sas:'Sastra',Sen:'Kesenian',Sos:'Sosiologi',Stat:'Statistik',Tan:'Pertanian',Tas:'Tasawuf',Tbg:'Tata boga',Tbs:'Tata busana',Tek:'Teknik',Telekom:'Telekomunikasi',Terb:'Penerbangan',Tern:'Peternakan',Zool:'Zoologi'};
  const aliases={Eko:'Ek',Edu:'Dik',Ant:'Antr'};
  const qualifiers={ki:'Kiasan',pb:'Peribahasa',cak:'Cakapan',ark:'Arkais',kl:'Klasik',kas:'Ragam kasar',hor:'Ragam hormat',kp:'Kependekan',sing:'Singkatan',akr:'Akronim',Jk:'Melayu Jakarta',Mk:'Minangkabau',Jw:'Jawa',Sd:'Sunda',Bl:'Bali',Ar:'Arab',Ing:'Inggris',Bld:'Belanda',Lat:'Latin',Pr:'Prancis',Cn:'Cina'};
  const domain=code=>{const canonical=aliases[code]||code;return names[canonical]?{id:'kbbi-'+canonical.toLowerCase(),code,label:names[canonical],parent:'general',kind:'domain'}:null;};
  const usageTag=code=>qualifiers[code]?{id:'kbbi-usage-'+code.toLowerCase(),code,label:qualifiers[code],parent:'general',kind:'usage'}:null;
  const siteTypes={n:'kb',v:'kk',a:'aj',adv:'adv',num:'num',p:'p',pron:'pron',interj:'interj'};
  const labelTypes=codes=>codes.map(code=>wordTypes[code]+' · '+siteTypes[code]).join(' / ');
  const abbreviateTypes=codes=>[...new Set(codes.map(code=>siteTypes[code]))].join(' / ');
  const abbreviations={yg:'yang',dl:'dalam',dll:'dan lain-lain',dng:'dengan',dgn:'dengan',dlm:'dalam',dp:'daripada',dr:'dari',dsb:'dan sebagainya',dst:'dan seterusnya',dkk:'dan kawan-kawan',kpd:'kepada',krn:'karena',msl:'misalnya',mis:'misalnya',pd:'pada',sbg:'sebagai',spt:'seperti',thd:'terhadap',tsb:'tersebut',tt:'tentang',ttg:'tentang',utk:'untuk'};
  const abbreviationPattern=new RegExp('(?<![\\p{L}\\p{N}_])('+Object.keys(abbreviations).sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}_])\\.?','giu');
  function expandAbbreviations(text){return String(text).replace(abbreviationPattern,(match,code)=>{
    if(code===code.toUpperCase())return match;
    const full=abbreviations[code.toLowerCase()];return code[0]===code[0].toUpperCase()?full[0].toUpperCase()+full.slice(1):full;
  });}
  const unique=values=>[...new Set(values)];
  function plain(raw){return raw.replace(/@([^¶]*)¶/g,(_,s)=>'\n'+s.replace(/·/g,'')+' ').replace(/[#¡@¶]/g,'').replace(/\s+/g,' ').trim();}
  function parsePart(raw){
    const types=[],domains=[],usage=[],examples=[];let exampleMode=false;
    const usageStart=raw.search(/--|~|:\s+/);
    if(usageStart>=0){examples.push(plain(raw.slice(usageStart)));raw=raw.slice(0,usageStart);const open=/#([^¡]*)$/.exec(raw);if(open)raw=raw.slice(0,open.index);}
    const clean=raw.replace(/#([^¡]*)¡/g,(whole,text,offset)=>{
      const codes=text.trim().replace(/[,;]+$/,'').split(/[\s,]+/).filter(Boolean);
      if(!codes.length||!codes.every(c=>wordTypes[c]||domain(c)||qualifiers[c])){
        if(exampleMode||/:\s*$/.test(raw.slice(0,offset))||/--|~/.test(text)){examples.push(plain(text));exampleMode=true;return '';}
        return text;
      }
      for(const code of codes){if(wordTypes[code])types.push(code);else if(domain(code))domains.push(domain(code));else usage.push(qualifiers[code]);}
      return ' ';
    });
    let text=plain(clean).replace(/:\s*(?:--|~)?\s*[;,]?\s*$/,'');
    const exampleStart=text.search(/:\s+/);if(exampleStart>=0){examples.push(text.slice(exampleStart+1).trim());text=text.slice(0,exampleStart).trim();}
    return {text,wordTypes:unique(types),domains:[...new Map(domains.map(d=>[d.id,d])).values()],qualifiers:unique(usage),examples};
  }
  function parseMarkup(raw){
    const markers=[...raw.matchAll(/@(\d+)¶/g)],start=markers.length?raw.slice(0,markers[0].index):raw,head=parsePart(start);
    const pronunciation=/^\/[^/]+\//.exec(head.text)?.[0]||'';
    if(pronunciation)head.text=head.text.slice(pronunciation.length).trim();
    const meaningful=text=>/[\p{L}\p{N}]/u.test(text);
    const senses=markers.length?markers.map((m,i)=>{
      const p=parsePart(raw.slice(m.index+m[0].length,markers[i+1]?.index??raw.length));
      return {number:Number(m[1]),text:(i===0&&meaningful(head.text)?head.text+' ':'')+p.text,
        wordTypes:p.wordTypes.length?p.wordTypes:head.wordTypes,
        domains:[...new Map([...head.domains,...p.domains].map(d=>[d.id,d])).values()],qualifiers:unique([...head.qualifiers,...p.qualifiers]),examples:p.examples};
    }):[{number:1,...head}];
    const valid=senses.filter(s=>meaningful(s.text));
    return {pronunciation,wordTypes:unique([...head.wordTypes,...valid.flatMap(s=>s.wordTypes)]),domains:[...new Map([...head.domains,...valid.flatMap(s=>s.domains)].map(d=>[d.id,d])).values()],senses:valid};
  }
  function validReading(r){
    const types=a=>Array.isArray(a)&&a.every(t=>Object.hasOwn(wordTypes,t));
    const subjects=a=>Array.isArray(a)&&a.every(d=>domain(d.code)?.id===d.id&&domain(d.code)?.label===d.label);
    return !!r&&typeof r.pronunciation==='string'&&types(r.wordTypes)&&subjects(r.domains)&&Array.isArray(r.senses)&&r.senses.every(s=>Number.isInteger(s.number)&&s.number>0&&typeof s.text==='string'&&s.text.trim()&&types(s.wordTypes)&&subjects(s.domains)&&Array.isArray(s.qualifiers)&&s.qualifiers.every(q=>typeof q==='string'));
  }
  function formatSense(value){
    const raw=String(value||'').trim(),parts=raw.replace(/[;.]+$/,'').split(';').map(s=>s.trim()).filter(Boolean);
    // Short synonym phrases have no sentence stop. Longer definitions and
    // clauses get one; the archived excerpt retains its exact punctuation.
    const short=parts.length>0&&parts.every(s=>s.split(/\s+/).length<=3&&!/[:!?]|\b(?:yg|yang|untuk|adalah|ialah|merupakan|dng|dengan|dr|dari)\b/i.test(s));
    let text=expandAbbreviations(raw).replace(/;\s*/g,'; ').replace(/[,;\s]+$/,'').replace(/\.\s*$/,'');
    text=text.replace(/^(\p{Ll})/u,s=>s.toLocaleUpperCase('id-ID'));
    return short?text:text+(text&&!/[.!?]$/.test(text)?'.':'');
  }
  function present(matches){
    const items=[];
    function walk(list){for(const b of list){if(validReading(b.reading)&&b.reading.senses.length)items.push({term:b.matched_term,homonym:b.homonym_number,sourceEntryId:b.entry_id,...b.reading});if(b.redirects)walk(b.redirects);if(b.derivatives)walk(b.derivatives);}}
    walk(matches);
    const domains=[...new Map(items.flatMap(i=>i.domains).map(d=>[d.id,d])).values()];
    const usage=unique(items.flatMap(i=>i.senses.flatMap(s=>s.qualifiers))).flatMap(label=>{const code=Object.keys(qualifiers).find(c=>qualifiers[c]===label);return code?[usageTag(code)]:[];});
    return {items,multiple:items.length>1,domains,tags:[...domains,...usage],wordTypes:unique(items.flatMap(i=>i.wordTypes))};
  }
  const api={labelReference,wordTypes,labelTypes,abbreviateTypes,domain,parseMarkup,validReading,formatSense,present,expandAbbreviations};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusKBBI=api;
})(typeof window==='undefined'?globalThis:window);
