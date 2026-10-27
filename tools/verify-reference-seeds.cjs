// Verify a small set of useful editorial mappings against the live wiki APIs.
// The rest of the dictionary resolves exact titles on demand in the browser.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),d=JSON.parse(fs.readFileSync(path.join(root,'data/dictionary.json'),'utf8'));
const api=require(path.join(root,'assets/js/references.js')).create({storage:null,fetch});
const mappings=[
  ['Brise Soleil','en','Brise soleil','brise-soleil'],
  ['Gallon','en','Gallon','gallon'],
  ['Beton Bertulang','en','Reinforced concrete','reinforced concrete'],
  ['Bekisting','en','Formwork','formwork'],
  ['Balok','en','Beam (structure)','beam'],
  ['Beam','en','Beam (structure)','beam'],
  ['Balk','en','Beam (structure)','balk'],
  ['Atrium','en','Atrium (architecture)','atrium'],
  ['Pondasi','id','Fondasi','foundation'],
  ['Cantilever','en','Cantilever','cantilever'],
  ['Arsitektur','id','Arsitektur','architecture'],
  ['Atap','id','Atap','roof'],
  ['Kolom','en','Column','column'],
  ['Bata','en','Brick','brick'],
  ['Fasad','en','Facade','facade'],
  ['Beton','en','Concrete','concrete'],
  ['Concrete','en','Concrete','concrete'],
  ['Backhoe','en','Backhoe','backhoe'],
  ['Formwork','en','Formwork','formwork'],
  ['Bored Pile','en','Deep foundation','pile']
];
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
(async()=>{
  const groups=new Map();
  for(const [,lang,title,word] of mappings){for(const [provider,edition,value] of [['wikipedia',lang,title],['wiktionary','en',word]]){const k=provider+':'+edition;if(!groups.has(k))groups.set(k,new Set());groups.get(k).add(value);}}
  const checked=new Map();
  for(const [group,titles] of groups){const [provider,lang]=group.split(':');const pages=await api.queryTitles(provider,lang,[...titles]);checked.set(group,pages);console.log(group+': '+pages.length+' verified pages');}
  const seeds={};
  for(const [term,lang,title,word] of mappings){for(const e of d.entries.filter(e=>e.term.toLowerCase()===term.toLowerCase())){
    const wiki=checked.get('wikipedia:'+lang).filter(p=>normalize(p.title)===normalize(title));
    const wikt=checked.get('wiktionary:en').filter(p=>normalize(p.title)===normalize(word));
    if(wiki.length||wikt.length)seeds[e.id]={term:e.term,checked_at:new Date().toISOString(),wikipedia:wiki,wiktionary:wikt};
  }}
  fs.writeFileSync(path.join(root,'data/reference-cache.js'),'// Direct article URLs verified through the official MediaWiki APIs.\nwindow.KAMUS_REFERENCE_SEEDS = '+JSON.stringify(seeds,null,2)+';\n');
  fs.writeFileSync(path.join(root,'data/reference-verification.json'),JSON.stringify({checked_at:new Date().toISOString(),entries:seeds},null,2)+'\n');
  console.log('Wrote verified mappings for '+Object.keys(seeds).length+' dictionary records.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
