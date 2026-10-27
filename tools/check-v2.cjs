const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),d=JSON.parse(fs.readFileSync(path.join(root,'data/dictionary.json'),'utf8'));
const search=require(path.join(root,'assets/js/search.js')).create(d.entries),S=require(path.join(root,'assets/js/shared.js')),G=require(path.join(root,'assets/js/graph.js')),R=require(path.join(root,'assets/js/references.js')),Global=require(path.join(root,'assets/js/global-graph.js')),A=require(path.join(root,'assets/js/associations-builder.js')),associations=JSON.parse(fs.readFileSync(path.join(root,'data/associations.json'),'utf8'));
async function main(){
  S.validateDataset(d);
  const List=require(path.join(root,'assets/js/list-layout.js')),browse=List.create(d.entries.map(entry=>({entry,match:'all'})));
  assert.equal(browse.rows.filter(r=>r.kind==='entry').length,d.entries.length);assert(browse.rows.some(r=>r.kind==='letter'&&r.title==='A'));assert(browse.rows.some(r=>r.kind==='prefix'&&r.title==='Aa'));
  for(const i of [0,20,1000,d.entries.length-1]){const row=browse.rows[browse.indexAt(browse.resultOffsets[i])];assert.equal(row.resultIndex,i,'Scroll positions must account for both header levels');}
  const x=browse.letterOffsets.get('X');assert.equal(browse.rows[browse.indexAt(x)].title,'X');const bottom=browse.windowRows(browse.totalHeight-500,500);assert.equal(bottom.end,browse.rows.length);
  const ranked=search.find('Door'),rankedList=List.create(ranked,{grouped:false});assert.deepEqual(rankedList.results,ranked,'Relevance order is preserved');assert(rankedList.rows.every(r=>r.kind==='entry'));
  assert.equal(browse.scrub('A',0).section.title,'Aa');assert.equal(browse.scrub('A',1).section.title,browse.sectionGroups.get('A').at(-1).title);
  for(const letter of ['A','X','Z'])for(const fraction of [0,.2,.5,.9,1]){const target=browse.scrub(letter,fraction);assert.equal(target.section.letter,letter);assert.equal(browse.nearestSection(target.offset,letter).title,target.section.title);}
  const reverseBrowse=List.create(d.entries.map(entry=>({entry})),{descending:true});assert.equal(reverseBrowse.sections[0].letter,'Z');assert.equal(reverseBrowse.scrub('A',0).section.title,browse.scrub('A',1).section.title);
  assert.deepEqual(List.create(ranked,{grouped:false,descending:true}).results,ranked,'A saved descending preference must not reorder relevance results');assert.equal(List.create([]).scrub('A',.5),null);assert.equal(List.create([]).nearestSection(500),null);
  for(const q of ['betn bertulng','bertulng beton','beton bert','betno bertulang'])assert.equal(search.find(q)[0].entry.term,'Beton Bertulang',q);
  assert.equal(search.find('betn bertulng',{fuzzy:false}).length,0);
  assert(search.find('reinfrced concrete').some(r=>r.entry.term==='Beton Bertulang'&&r.match==='similar'));
  assert.equal(search.find('betonn betonn').some(r=>r.entry.term==='Beton'),false);
  const index=G.createIndex(d.entries),bekisting=d.entries.find(e=>e.term==='Bekisting'),acuan=d.entries.find(e=>e.term==='Acuan');
  const chain=Array.from({length:5},(_,i)=>({...bekisting,id:'step-'+i,term:'Step '+i,equivalent_ids:[],related:i<4?[{entry_ids:['step-'+(i+1)]}]:[]})),chainIndex=G.createIndex(chain);
  assert(G.build(chainIndex,'step-0',3).nodes.some(n=>n.id==='step-3'));assert(!G.build(chainIndex,'step-0',2).nodes.some(n=>n.id==='step-3'));assert(!G.build(chainIndex,'step-0',3).nodes.some(n=>n.id==='step-4'));
  assert.equal(G.build(chainIndex,'step-0',3,1).nodes.length,1,'Depth must respect even a one-node cap');
  const local=G.build(index,bekisting.id);assert(local.nodes.some(n=>n.id===acuan.id));assert(local.edges.some(e=>e.type==='reference'));
  const incoming=G.build(index,acuan.id);assert(incoming.nodes.some(n=>n.id===bekisting.id),'Graph must include incoming references');
  assert(G.build(index,bekisting.id,2,12).nodes.length<=12);assert.equal(G.build(index,'missing').nodes.length,0);
  const enriched=G.createIndex(d.entries,associations),originalText=JSON.stringify(d.entries),rebuilt=A.build(d.entries);
  assert.equal(JSON.stringify(d.entries),originalText,'Building editorial links must not alter source records');assert.deepEqual(rebuilt.edges,associations.edges,'Bundled relationship layer is current');
  assert.deepEqual(rebuilt.categories,associations.categories,'Bundled parent groups are current');assert.deepEqual(rebuilt.themes,associations.themes,'Bundled theme parents are current');
  const door=d.entries.find(e=>e.term==='Door'),doorNeighbors=new Set([...enriched.adj.get(door.id)].map(id=>enriched.byId.get(id).term));
  for(const name of ['Pintu','Door Frame','Doorplate','Door-stop','Door Schedule'])assert(doorNeighbors.has(name),'Door family missing '+name);
  const firstStep=G.build(enriched,door.id,1,14),secondStep=G.build(enriched,door.id,2,14);assert(secondStep.nodes.some(n=>!firstStep.nodes.some(p=>p.id===n.id)),'Two steps must reserve room for farther neighbors');
  for(const term of ['Door','Termijn','Aesthetics']){
    const e=d.entries.find(e=>e.term===term),views=[1,2,3].map(depth=>G.build(enriched,e.id,depth,G.nodeLimit(depth)));
    assert(views[1].nodes.length>views[0].nodes.length,term+': two steps should expose more of its known connections');assert(views[2].nodes.length>views[1].nodes.length,term+': three steps should expose more of its known connections');
    for(const [i,view] of views.entries())assert(view.nodes.length<=G.nodeLimit(i+1));
  }
  const cashier=d.entries.find(e=>e.term==='Kasir');assert.equal(G.build(enriched,cashier.id,3,G.nodeLimit(3)).nodes.length,3,'Depth must not invent extra links in a small connected component');
  for(const name of ['Doorloop','Doorsnede'])assert(!associations.byEntry[d.entries.find(e=>e.term===name).id].themes.includes('doors'),'False door substring: '+name);
  for(const edge of associations.edges){assert(index.byId.has(edge.source)&&index.byId.has(edge.target));assert(edge.source!==edge.target);assert(edge.score>0&&edge.score<=1);}
  for(const grouping of ['theme','language','type']){const full=Global.build(enriched,grouping);assert.equal(full.nodes.filter(n=>n.kind==='entry').length,d.entries.length);assert.equal(full.semantic.length,enriched.edges.length);assert(full.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));const children=new Map();for(const e of full.hierarchy){if(!children.has(e.source))children.set(e.source,[]);children.get(e.source).push(e.target);}const seen=new Set(['catalogue-root']),queue=['catalogue-root'];for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i])||[])if(!seen.has(id)){seen.add(id);queue.push(id);}assert.equal(seen.size,full.nodes.length,'Every term must be connected to the site root');}
  for(const p of G.layout(local))assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
  assert.equal(R.imageQuery(bekisting),'Bekisting','Image queries preserve the displayed headword');
  const saham=d.entries.find(e=>e.term==='Saham');assert.equal(R.imageQuery(saham),'Saham');
  assert(R.allowedArticle('https://en.wikipedia.org/wiki/Concrete','wikipedia'));assert(!R.allowedArticle('https://en.wikipedia.org/w/index.php?search=Concrete','wikipedia'));
  assert(!S.articleURL('https://example.com/wiki/Concrete','wikipedia'));assert(!S.safeURL('javascript:alert(1)',{local:true}));
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};let calls=0;
  const fakeFetch=async url=>{calls++;const u=new URL(url),provider=u.hostname.includes('wiktionary')?'wiktionary':'wikipedia';return {ok:true,json:async()=>({query:{pages:[{pageid:1,ns:0,title:provider==='wikipedia'?'Formwork':'formwork',fullurl:'https://en.'+provider+'.org/wiki/'+(provider==='wikipedia'?'Formwork':'formwork')},{pageid:2,ns:0,title:'Missing',missing:true},{pageid:3,ns:0,title:'Ambiguous',fullurl:'https://en.'+provider+'.org/wiki/Ambiguous',pageprops:{disambiguation:''}}]}})};};
  const resolver=R.create({storage,fetch:fakeFetch,seeds:{}}),resolved=await resolver.resolve(bekisting,{online:true});
  assert.equal(resolved.wikipedia.status,'found');assert(resolved.wikipedia.links.every(l=>l.url.includes('/wiki/')&&!l.url.includes('Ambiguous')));const after=calls;
  const cached=await resolver.resolve(bekisting,{online:false});assert.equal(calls,after);assert(cached.wikipedia.cached);
  const blank=R.create({storage:null,fetch:async()=>{throw new Error('offline');},seeds:{}});assert.equal((await blank.resolve(bekisting,{online:false})).wikipedia.status,'offline');assert.equal((await blank.resolve(bekisting,{online:true})).wikipedia.status,'error');
  const gallon=d.entries.find(e=>e.term==='Gallon'),imageCalls=[];
  const file=(title)=>({title:'File:'+title,imageinfo:[{thumburl:'https://upload.wikimedia.org/test/'+encodeURIComponent(title),descriptionurl:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(title),mime:title.endsWith('.svg')?'image/svg+xml':'image/jpeg',width:600,height:400,extmetadata:{Artist:{value:'Test creator'},LicenseShortName:{value:'Source license'}}}]});
  const imageAPI=R.create({storage:null,seeds:{},fetch:async url=>{const u=new URL(url);imageCalls.push(u);return {ok:true,json:async()=>u.searchParams.get('prop')==='images|pageimages'?{query:{pages:[{title:'Gallon',pageimage:'GasCan.jpg',images:[{title:'File:Horse Gallon.jpg'},{title:'File:Gallon milk container.jpg'},{title:'File:Gallon measure.svg'}]}]}}:{query:{pages:[file('Horse Gallon.jpg'),file('GasCan.jpg'),file('Gallon milk container.jpg'),file('Gallon measure.svg')]}}};}});
  const imageResult=await imageAPI.images(gallon,R.imageQuery(gallon),{article:{links:[{url:'https://en.wikipedia.org/wiki/Gallon',title:'Gallon'}]},limit:3});assert.equal(imageResult.images.length,3);assert(imageResult.images.every(i=>!(/horse/i.test(i.title))));assert(imageResult.images.every(i=>i.origin==='Wikipedia · Gallon'));assert(imageCalls.some(u=>u.searchParams.get('pilicense')==='any'));
  const exactImageCalls=[],exactImages=R.create({storage:null,seeds:{},fetch:async url=>{exactImageCalls.push(new URL(url));return {ok:true,json:async()=>({query:{pages:[]}})};}});
  await exactImages.images(saham,R.imageQuery(saham),{article:{links:[{url:'https://en.wikipedia.org/wiki/Share_(finance)',title:'Share (finance)'}]}});
  assert.equal(exactImageCalls.length,1,'A translated article must not replace an exact image query');assert.equal(exactImageCalls[0].searchParams.get('gsrsearch'),'intitle:"Saham"');
  const aglomerasi=d.entries.find(e=>e.term==='Aglomerasi'),fallbackCalls=[];
  const fallbackAPI=R.create({storage:null,seeds:{},fetch:async url=>{const u=new URL(url);fallbackCalls.push(u.searchParams.get('gsrsearch'));return {ok:true,json:async()=>({query:{pages:u.searchParams.get('gsrsearch')==='intitle:"Agglomeration"'?[file('Urban agglomeration.jpg')]:[]}})};}});
  const gallery=await fallbackAPI.images(aglomerasi,R.imageQuery(aglomerasi),{article:{links:[]}});
  assert.deepEqual(fallbackCalls,['intitle:"Aglomerasi"','intitle:"Agglomeration"']);assert.equal(gallery.query,'Aglomerasi');assert.equal(gallery.images.length,1);assert(gallery.images[0].origin.includes('rujukan Agglomeration'));
  const seedScope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/reference-cache.js'),'utf8'),seedScope);const seeds=seedScope.window.KAMUS_REFERENCE_SEEDS;
  assert(Object.keys(seeds).length>=10);for(const item of Object.values(seeds))for(const p of ['wikipedia','wiktionary'])for(const link of item[p])assert(R.allowedArticle(link.url,p));
  const clone=structuredClone(d),one=clone.entries.find(e=>e.id===bekisting.id);one.definition+='\nEditorial verification example.';S.rebuildRelations(clone);S.validateDataset(clone);
  const files=S.exportFiles(clone,[{id:one.id,note:'Test export'}],A.build(clone.entries));assert(files['data/dictionary.js'].includes('Editorial verification example.'));assert(!files['data/associations.js'],'The unused full graph script must not be exported');assert.equal(JSON.parse(files['data/associations.json']).metadata.entry_count,clone.entries.length);assert(one.source_text===bekisting.source_text,'Edits must preserve original source text');
  const withManual=structuredClone(d);withManual.entries.push({...structuredClone(bekisting),id:'manual-editor-check',term:'Contoh entri penyunting',source_index:0,source_occurrences:[],source_label:'Sumber lain',source_url:'https://example.org/reference',source_text:'Transkripsi sumber lain.',related:[],equivalent_ids:[]});S.rebuildRelations(withManual);S.validateDataset(withManual);assert(S.exportFiles(withManual)['data/entries.csv'].includes('Sumber lain'));
  const zip=await S.zip({'data/example.json':JSON.stringify({word:'arsitektur',note:'é → 日本語'}),'readme.txt':'Export check'}).arrayBuffer();
  const output=process.argv[2];if(output)fs.writeFileSync(output,Buffer.from(zip));
  console.log(JSON.stringify({passed:true,checks:'multi-word fuzzy search, strict toggle, translation typos, incoming/outgoing graph links, bounded graph, direct URL validation, wiki cache/offline/error states, verified seeds, source preservation, editor export ZIP',verified_seed_records:Object.keys(seeds).length,zip_bytes:zip.byteLength},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
