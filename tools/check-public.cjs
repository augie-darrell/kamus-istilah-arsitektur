const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');execFileSync(process.execPath,[path.join(__dirname,'build-public.cjs')]);
const publicRoot=path.join(root,'_site'),html=fs.readFileSync(path.join(publicRoot,'index.html'),'utf8');
for(const name of ['editor.html','assets/js/editor.js','assets/js/editor-model.js','assets/css/editor.css','data/dictionary.js','data/dictionary.json','data/kbbi-iii-sources.json'])assert(!fs.existsSync(path.join(publicRoot,name)),name+' must stay out of the public deployment');
assert(!html.includes('id="editor-link"'));
for(const match of html.matchAll(/(?:src|href)="([^"\s]+)"/g)){
  const name=match[1].split(/[?#]/)[0];if(!name||/^(?:https?:|#)/.test(name))continue;
  assert(fs.existsSync(path.join(publicRoot,name)),'Missing published asset: '+name);
}
assert(fs.existsSync(path.join(root,'editor.html')),'The offline editor remains available');
assert(fs.existsSync(path.join(publicRoot,'data/reader.js')));
console.log('Passed: public reader assets complete; editor, raw archives, and maintenance records excluded from Pages.');
