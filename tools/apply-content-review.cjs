/* Apply only the explicit, inspectable decisions in data/content-review.json. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'data/dictionary.json'),reviewFile=path.join(root,'data/content-review.json');
const data=JSON.parse(fs.readFileSync(file,'utf8')),review=JSON.parse(fs.readFileSync(reviewFile,'utf8')),S=require('../assets/js/shared.js');
const byId=new Map(data.entries.map(e=>[e.id,e]));
const transcriptHash=()=>crypto.createHash('sha256').update(JSON.stringify(data.entries.map(e=>[e.id,e.source_text,e.source_occurrences,e.related_raw]))).digest('hex');
assert.equal(transcriptHash(),review.source_transcripts_sha256,'Source transcripts and raw reference text must stay unchanged');
for(const patch of review.patches){
  const entry=byId.get(patch.id);assert(entry,patch.id);
  const current=entry[patch.field]??null;
  // Re-running after relation rebuilding is safe; do not overwrite later editor changes.
  const normalized=value=>patch.field==='related'?value?.map(r=>r.term):value;
  if(JSON.stringify(normalized(current))===JSON.stringify(normalized(patch.after)))continue;
  assert.deepEqual(current,patch.before,'Entry changed since review: '+patch.id+' / '+patch.field);
  entry[patch.field]=structuredClone(patch.after);
}
S.rebuildRelations(data);S.validateDataset(data);
data.metadata.language_counts={};
for(const entry of data.entries)for(const language of entry.languages)data.metadata.language_counts[language.name]=(data.metadata.language_counts[language.name]||0)+1;
const pending=data.entries.flatMap(e=>e.related.filter(r=>!r.resolved).map(r=>({id:e.id,term:e.term,reference:r.term})));
review.results={entries:data.entries.length,reviewed_source_entries:review.flag_reviews.length,active_source_flags:data.entries.filter(e=>e.review_flags.length).length,reviewed_fragments:review.reference_reviews.length,resolved_references:data.entries.reduce((n,e)=>n+e.related.filter(r=>r.resolved).length,0),unresolved_references:pending.length,unresolved:pending};
for(const item of review.reference_reviews){const e=byId.get(item.id);item.resolved_targets=item.targets.flatMap(term=>e.related.filter(r=>S.key(r.term)===S.key(term)&&r.resolved).map(r=>({term:r.term,entry_ids:r.entry_ids})));}
data.metadata.editorial_review={file:'data/content-review.json',reviewed_on:review.reviewed_on,baseline:review.baseline};
assert.equal(transcriptHash(),review.source_transcripts_sha256);
require('./data-files.cjs').write(data);
fs.writeFileSync(reviewFile,JSON.stringify(review,null,2)+'\n');
const queue=[...data.entries.flatMap(e=>e.review_flags.map(flag=>['source',e.term,e.id,flag,e.source_url,e.source_text])),...pending.map(r=>['reference',r.term,r.id,r.reference,byId.get(r.id).source_url,byId.get(r.id).definition])];
const cell=value=>'"'+String(value).replace(/"/g,'""')+'"';
fs.writeFileSync(path.join(root,'data/review-queue.csv'),'\ufeff'+[['kind','term','id','issue','source_url','evidence'],...queue].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n');
console.log(JSON.stringify({...review.results,unresolved:undefined}));
