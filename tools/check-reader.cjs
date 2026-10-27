const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),data=require('../data/dictionary.json'),associations=require('../data/associations.json');
const Reader=require('../assets/js/reader-data.js'),Content=require('../assets/js/entry-content.js'),Search=require('../assets/js/search.js'),Graph=require('../assets/js/graph.js'),Shared=require('../assets/js/shared.js');
const text=fs.readFileSync(path.join(root,'data/reader.js'),'utf8'),scope={window:{},KamusReaderData:Reader};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(/src="data\/reader\.js[?"]/.test(html),'The reading page must load the compact bundle');
assert(!/src="data\/(?:dictionary|associations)\.js[?"]/.test(html),'Do not accidentally load the full editing archive in the reader');
vm.runInNewContext(text,scope);
const slim=JSON.parse(JSON.stringify(scope.window.DICTIONARY_DATA)),a=JSON.parse(JSON.stringify(scope.window.KAMUS_ASSOCIATIONS));
assert.equal(text,Reader.script(data,associations),'Generated reader must be current');
assert.equal(slim.entries.length,data.entries.length);
for(let i=0;i<data.entries.length;i++){
  const full=data.entries[i],entry=slim.entries[i];
  assert.equal(entry.id,full.id);assert(!entry.source_text&&!entry.source_occurrences&&!entry.supplemental_meanings);
  assert.deepEqual(Content.wordTypeSummary(entry),Content.wordTypeSummary(full));
  const left=Content.meaning(entry),right=Content.meaning(full);
  assert.equal(left?.provider,right?.provider);assert.equal(left?.search_text,right?.search_text);
  if(right?.layout)for(let j=0;j<right.layout.items.length;j++){
    const fields=['term','homonym','pronunciation','wordTypes','senses'];
    for(const field of fields){const project=items=>field==='senses'?items.map(({number,text,wordTypes})=>({number,text,wordTypes})):items;assert.deepEqual(project(left.layout.items[j][field]),project(right.layout.items[j][field]));}
  }else assert.equal(left?.text,right?.text);
}
const fullIndex=Graph.createIndex(data.entries,associations),slimIndex=Graph.createIndex(slim.entries,a);
assert.deepEqual(slimIndex.edges,fullIndex.edges);
assert.deepEqual(a.byEntry,Object.fromEntries(Object.entries(associations.byEntry).map(([id,{primary,themes,categories}])=>[id,{primary,themes,categories}])));
const fullSearch=Search.create(data.entries),slimSearch=Search.create(slim.entries);
for(const query of ['','beton','bekistng','air','penambahan','raveling'])for(const options of [{},{language:'id'},{wordType:'aj'}])assert.deepEqual(slimSearch.find(query,options).map(r=>[r.entry.id,r.score]),fullSearch.find(query,options).map(r=>[r.entry.id,r.score]));
const exported=Shared.exportFiles(data,[],associations);assert.equal(exported['data/reader.js'],text,'Editor exports refresh the reader too');
assert(Buffer.byteLength(text)<2600000,'Keep the reading bundle below 2.6 MB');
console.log('Passed: every displayed meaning/type, source citation fields, search rankings, graph edges/tags, generated freshness, and editor export parity.');
