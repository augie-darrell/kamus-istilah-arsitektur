// Import only exact Indonesian matches from the user-supplied cleaned KBBI III.
// Usage: node tools/import-kbbi-iii.cjs "C:/path/to/kbbi-iii-clean"
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const Content = require('../assets/js/entry-content.js');
const KBBI = require('../assets/js/kbbi-format.js');
const SOURCE_ID = 'kbbi-iii-offline-1.5.1';
const normalize = s => String(s || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
const cleanLabel = s => normalize(s.replace(/·/g, '').replace(/\s*\[\d+\]/g, '').replace(/\^\d+/g, '').split(/\s+\?\s+/)[0]);
function plainText(markup) {
  return markup.replace(/@([^¶]*)¶/g, (_, bold) => '\n' + bold.replace(/·/g, '').trim() + ' ')
    .replace(/[#¡¶@]/g, '').split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}
function segments(record) {
  const raw = record.definition_source_markup, tags = [...raw.matchAll(/@([^¶]*)¶/g)];
  if (!tags.length || record.review_flags?.length) return [];
  const first = tags[0];
  if (cleanLabel(first[1]) !== normalize(record.headword)) return [];
  const heads = [{tag:first, term:record.headword, match:'headword', subentry_index:null}];
  // Numbered senses remain inside a meaning. Only known, exact bold headword
  // labels delimit subentries; a cross-reference at the end has no body to import.
  for (const tag of tags.slice(1)) {
    const label = cleanLabel(tag[1]).replace(/^--\s*/, record.headword + ' ');
    if (!label || /^\d+$/.test(label)) continue;
    const candidates = record.subentries.map((s,i) => ({s,i})).filter(({s}) => normalize(s.term) === label);
    if (candidates.length === 1) heads.push({tag,term:candidates[0].s.term,match:'subentry',subentry_index:candidates[0].i});
    else heads.push({tag,term:null}); // Unknown labels still prevent excerpt bleed.
  }
  return heads.map((h,i) => {
    if (!h.term) return null;
    const start = h.tag.index + h.tag[0].length, end = heads[i+1]?.tag.index ?? raw.length;
    const text = plainText(raw.slice(start,end));
    const reference = (h.match === 'headword' ? record.redirect_target : record.subentries[h.subentry_index].redirect_target)||(/\?\s*$/.test(text)&&heads[i+1]?cleanLabel(heads[i+1].tag[1]):null);
    return {term:h.term,match:h.match,subentry_index:h.subentry_index,text,source_span:{start,end},redirect_target:reference || null};
  }).filter(Boolean);
}
function createMatcher(source) {
  const heads = new Map(), subs = new Map(), parsed = new Map(), byId = new Map(source.entries.map(r => [r.id,r]));
  for (const r of source.entries) {
    const key = normalize(r.headword);if (!heads.has(key)) heads.set(key,[]);heads.get(key).push(r);
    for (const [i,s] of r.subentries.entries()) {const k=normalize(s.term);if (!subs.has(k)) subs.set(k,[]);subs.get(k).push({record:r,index:i});}
  }
  const parts = r => {if (!parsed.has(r.id)) parsed.set(r.id,segments(r));return parsed.get(r.id);};
  function match(term, seen = new Set(), homonym = null) {
    const key = normalize(term), exact = heads.get(key), hits = (exact ? exact.map(record=>({record,index:null})) : subs.get(key) || []).filter(h=>homonym===null||h.record.homonym_number===homonym);
    const blocks = [], rejected = [];
    for (const {record:r,index} of hits) {
      if (seen.has(r.id)) {rejected.push('redirect_cycle');continue;}
      const part = parts(r).find(p => p.subentry_index === index && normalize(p.term) === key);
      if (!part) {rejected.push('unverified_subentry_boundary');continue;}
      let redirects = [];
      if (part.redirect_target) {
        // Source redirects may prefix the homonym number, e.g. "2keran".
        const ref = /^(\d+)?(.*)$/.exec(part.redirect_target.trim()), target = ref[2], number = ref[1] ? Number(ref[1]) : null;
        if (seen.size >= 6) {rejected.push('redirect_depth');continue;}
        const next = match(target,new Set([...seen,r.id]),number);
        redirects = next.blocks;
        if (!redirects.length) {rejected.push('unresolved_redirect');continue;}
      }
      if (!part.text && !redirects.length) {rejected.push('empty_excerpt');continue;}
      const reading=KBBI.parseMarkup(r.definition_source_markup.slice(part.source_span.start,part.source_span.end));
      const derivatives=!reading.senses.length&&!redirects.length&&part.match==='headword'?parts(r).filter(p=>p.match==='subentry'&&!p.redirect_target).map(p=>({entry_id:r.id,headword:r.headword,homonym_number:r.homonym_number,matched_term:p.term,match:p.match,subentry_index:p.subentry_index,text:p.text,source_span:p.source_span,source_records:r.source_records,reading:KBBI.parseMarkup(r.definition_source_markup.slice(p.source_span.start,p.source_span.end))})).filter(b=>b.reading.senses.length):[];
      blocks.push({entry_id:r.id,headword:r.headword,homonym_number:r.homonym_number,
        matched_term:part.term,match:part.match,subentry_index:part.subentry_index,
        text:part.text,source_span:part.source_span,reading,
        source_records:r.source_records, ...(redirects.length?{redirect_target:part.redirect_target,redirects}:{}),...(derivatives.length?{derivatives}:{})});
    }
    // Do not silently choose one homonym. Every exact candidate must be readable.
    if (hits.length && blocks.length !== hits.length) return {blocks:[],reasons:[...new Set(rejected)],found:true};
    return {blocks,reasons:[],found:!!hits.length};
  }
  return {match,byId};
}
function importDataset(data, source, fingerprint) {
  if (source.metadata?.dictionary_edition !== 'III') throw new Error('The input must identify KBBI edition III.');
  const matcher=createMatcher(source), used=new Set(), report={source_id:SOURCE_ID,source_sha256:fingerprint,eligible:0,imported:0,headword_matches:0,subentry_matches:0,with_homonyms:0,with_redirects:0,skipped:[],matches:[]};
  const collect = blocks => {for (const b of blocks) {used.add(b.entry_id);collect(b.redirects||[]);collect(b.derivatives||[]);}};
  for (const entry of data.entries) {
    if (entry.supplemental_meanings?.kbbi_iii) {
      delete entry.supplemental_meanings.kbbi_iii;
      if (!Object.keys(entry.supplemental_meanings).length) delete entry.supplemental_meanings;
    }
    if (!Content.needsKBBI(entry)) continue;
    report.eligible++;
    // Uppercase source abbreviations such as KAK must not become the word "kak".
    if (/^[A-Z][A-Z.\d\s-]+$/.test(entry.term)) {report.skipped.push({id:entry.id,term:entry.term,reason:'source_abbreviation'});continue;}
    const result=matcher.match(entry.term);
    if (!result.blocks.length) {report.skipped.push({id:entry.id,term:entry.term,reason:result.found?result.reasons.join(','):'no_exact_match'});continue;}
    const blocks=result.blocks;
    entry.supplemental_meanings={...entry.supplemental_meanings,kbbi_iii:{term:entry.term,edition:'III',source_id:SOURCE_ID,matches:blocks}};
    collect(blocks);report.imported++;
    report[blocks[0].match==='headword'?'headword_matches':'subentry_matches']++;
    if (blocks.length>1) report.with_homonyms++;
    if (blocks.some(b=>b.redirects?.length)) report.with_redirects++;
    report.matches.push({id:entry.id,term:entry.term,entry_ids:blocks.map(b=>b.entry_id),match:blocks[0].match});
  }
  data.metadata.supplemental_sources={...data.metadata.supplemental_sources,[SOURCE_ID]:{
    title:'Kamus Besar Bahasa Indonesia',edition:'III',language:'id',app:'KBBI Offline 1.5.1',
    publisher:'Pusat Bahasa',app_publisher:source.metadata.app_publisher,
    source_file:'kbbi_clean.json',source_sha256:fingerprint,prepared_on:source.metadata.prepared_on,
    record_count:source.entries.length,imported_entries:report.imported,
    provenance_file:'data/kbbi-iii-sources.json',report_file:'data/kbbi-iii-import-report.json',
    bibliography:{author:'Pusat Bahasa, Departemen Pendidikan Nasional',year:2001,publisher:'Balai Pustaka',title:'Kamus Besar Bahasa Indonesia',edition:3,isbn:'979-407-182-X',url:'https://batupusaka.bantenprov.go.id/koleksi?kolom=ISN&perpus=all&q=979-407-182-x'},
    source_url:'https://ebsoft.web.id/baru-kbbi-offline-1-5-mendukung-pencarian-dengan-regular-expression/',
    rights:source.metadata.rights,matching:'Exact NFC headword/subentry; complete homonyms; source-delimited excerpts; explicit redirects only.'
  }};
  const provenance={schema_version:'1.0.0',source_id:SOURCE_ID,source_sha256:fingerprint,
    metadata:source.metadata,records:source.entries.filter(r=>used.has(r.id))};
  return {data,report,provenance};
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Pass the folder containing kbbi_clean.json.');
  const folder=path.resolve(process.argv[2]),raw=fs.readFileSync(path.join(folder,'kbbi_clean.json')),
    source=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,'')),site=path.resolve(__dirname,'..'),
    file=path.join(site,'data/dictionary.json'),data=JSON.parse(fs.readFileSync(file,'utf8')),
    result=importDataset(data,source,crypto.createHash('sha256').update(raw).digest('hex'));
  require('../assets/js/shared.js').validateDataset(result.data);
  require('./data-files.cjs').write(result.data);
  for (const [name,object] of [['kbbi-iii-sources.json',result.provenance],['kbbi-iii-import-report.json',result.report]])
    fs.writeFileSync(path.join(site,'data',name),JSON.stringify(object,null,2)+'\n');
  console.log(JSON.stringify({eligible:result.report.eligible,imported:result.report.imported,
    headwords:result.report.headword_matches,subentries:result.report.subentry_matches,
    with_homonyms:result.report.with_homonyms,with_redirects:result.report.with_redirects,
    skipped:result.report.skipped.length,source_records:result.provenance.records.length}));
}
module.exports={SOURCE_ID,normalize,plainText,segments,createMatcher,importDataset};
