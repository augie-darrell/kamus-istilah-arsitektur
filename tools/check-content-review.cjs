const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const d=require('../data/dictionary.json'),a=require('../data/associations.json'),review=require('../data/content-review.json'),R=require('../assets/js/references.js');
const entry=term=>d.entries.find(e=>e.term===term),byId=new Map(d.entries.map(e=>[e.id,e]));
const hash=crypto.createHash('sha256').update(JSON.stringify(d.entries.map(e=>[e.id,e.source_text,e.source_occurrences,e.related_raw]))).digest('hex');
assert.equal(hash,review.source_transcripts_sha256,'Every original transcript, raw reference, and occurrence must survive review');
assert.equal(review.flag_reviews.length,27);assert.equal(review.reference_reviews.length,108);
assert.equal(d.entries.filter(e=>e.review_flags.length).length,review.results.active_source_flags);
assert.equal(d.entries.flatMap(e=>e.related.filter(r=>!r.resolved)).length,review.results.unresolved_references);
assert.equal(entry('Construction Plan').id,'c-4cea9e1bf6');assert(entry('Construction Plan').source_text.startsWith('vConstruction Plan'));
assert.equal(entry('Composite Panel').languages[0].code,'en');assert.equal(entry('Dokter Jiwa').languages[0].code,'id');
assert.equal(entry('Cor').word_type,'kk');assert(entry('Entri tanpa judul').review_flags.length);
assert.deepEqual(entry('Cemetery').related.map(r=>r.term),['Burial Ground']);assert(entry('Cemetery').related[0].resolved);
assert.deepEqual(entry('Engineering, Procurement and Construction').related.map(r=>r.term),['Design & Build']);
assert.deepEqual(entry('Gasfornuis').related.map(r=>r.term),['Gas Range']);assert(entry('Gasfornuis').related[0].resolved);
assert(!entry('Gasfornuis').related.some(r=>r.term==='Gas'));
assert(!entry('Arsip').related.some(r=>r.term.startsWith('istilah')));
assert(!entry('Post-tensioning').related.some(r=>r.term.includes('Modern')));
assert.deepEqual(a.byEntry['b-d4ef9dc764'].themes,['water','environment']);
assert(a.byEntry['l-457843db46'].themes.includes('qualities'));assert(!a.edges.some(e=>e.theme==='lighting'&&[e.source,e.target].includes('l-457843db46')));
for(const id of ['a-a12bc904f2','a-1836e6344f','s-f3f1ede640'])assert(a.byEntry[id].tagging.evidence.some(e=>e.basis==='reviewed-source-sense'));
for(const [term,bad,good] of [
 ['Acuan','Jose Acuan Jr baseball player','Papan acuan concrete formwork'],
 ['Begel','Jean-Joseph Begel portrait','Begel stirrup reinforcement cage'],
 ['Beban','Mr Bean movie poster','Structural load diagram force on a beam']
]){assert.equal(R.imageQuery(entry(term)),term);assert(R.imageScore(entry(term),bad,'')<0);assert(R.imageScore(entry(term),good,'')>=0);}
assert(R.imageScore(entry('Aannemer'),'Aannemer op bouwplaats','Construction contractor')>=0);
assert(fs.existsSync(path.join(__dirname,'../data/review-queue.csv')));
console.log('Passed: frozen source audit, reviewed counts, complete reference phrases, preserved unresolved terms, polysemy tags/anchors, and contextual image rejection.');
