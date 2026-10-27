const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),Panels=require(path.join(root,'assets/js/panel-layout.js')),Content=require(path.join(root,'assets/js/entry-content.js'));
for(const viewport of [651,850,983,1250,1575,1920]){
  const {min,max}=Panels.widthLimits(viewport);
  assert(min<=max);assert.equal(Panels.clampWidth(-100,viewport),min);assert.equal(Panels.clampWidth(5000,viewport),max);
  assert(viewport-2*max>=320,'Resizing must retain the fallback title width');
  for(const title of [240,257,360,440]){
    const limits=Panels.widthLimits(viewport,title),side=Panels.clampWidth(5000,viewport,title);
    assert(viewport-2*side>=title,'The actual title width is the center minimum');
    assert.equal(side,limits.max);assert(viewport-2*side<title+2,'The maximum must allow resizing right up to the title width');
  }
}
assert(Panels.widthLimits(1575,257).max>520,'Wide desktops must not retain the former 520px cap');
assert.equal(Panels.clampWidth(330,1575),330);assert.equal(Panels.clampWidth(330,983),330);
const panels=Panels.create();
assert.deepEqual(panels.view(),{terms:true,graph:true,mobile:false});
panels.set('terms',false);assert.deepEqual(panels.view(),{terms:false,graph:true,mobile:false});
panels.set('graph',false);assert.deepEqual(panels.view(),{terms:false,graph:false,mobile:false});
panels.set('terms',true);panels.resize(true);assert.deepEqual(panels.view(),{terms:false,graph:false,mobile:true});
panels.set('terms',true);panels.set('graph',true);assert.deepEqual(panels.view(),{terms:false,graph:true,mobile:true});
panels.closeMobile();assert.deepEqual(panels.view(),{terms:false,graph:false,mobile:true});
panels.resize(false);assert.deepEqual(panels.view(),{terms:true,graph:false,mobile:false},'Mobile panels must not overwrite desktop preferences');
const sample={term:'Contoh',languages:[{code:'id'}],definition:'Example (Ing.)',translations:[{}],related:[]};
assert(Content.needsKBBI(sample));assert.equal(Content.meaning(sample),null);assert(Content.kbbiURL(sample).endsWith('/entri/contoh'));
const supplied={...sample,supplemental_meanings:{kbbi:{term:'contoh',text:'Contoh makna untuk uji perangkat lunak.',source_url:'https://kbbi.kemendikdasmen.go.id/entri/contoh'}}};
assert.equal(Content.meaning(supplied).label,'MAKNA DARI KBBI');
assert.equal(Content.meaning({...supplied,definition:'Example (Ing.) – makna sumber.'}).provider,'source','Source meanings always take priority');
assert.equal(Content.meaning({...supplied,languages:[{code:'en'}]}),null,'Supplement is exclusive to Indonesian entries');
assert.equal(Content.meaning({...sample,supplemental_meanings:{kbbi:{...supplied.supplemental_meanings.kbbi,term:'kata lain'}}}),null);
assert.equal(Content.meaning({...sample,supplemental_meanings:{kbbi:{...supplied.supplemental_meanings.kbbi,source_url:'https://example.com/entri/contoh'}}}),null);
const entries=require(path.join(root,'data/dictionary.json')).entries,search=require(path.join(root,'assets/js/search.js')).create(entries);
for(const language of ['', 'id','nl','und'])for(const wordType of ['', 'kb','aj','other']){
  const filters={language,wordType};assert.equal(search.count(filters),search.find('',filters).length,'The search placeholder count must use the same filters as the list');
}
const saved=new Set(entries.filter(e=>e.languages.some(l=>l.code==='id')).slice(0,3).map(e=>e.id));
assert.equal(search.count({language:'id',saved}),3);assert.equal(search.count({language:'nl',saved}),0);assert.equal(search.count({saved:new Set()}),0);
console.log('Passed: independent desktop panels, exclusive mobile panels, desktop preference restoration, source priority, and KBBI provenance labels.');
