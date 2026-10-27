/* Verify relative asset paths after reorganizing the static project. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function local(file,url){
  if(!url||/^(?:https?:|data:|#|mailto:)/.test(url))return;
  assert(!url.startsWith('/'),'Use paths that also work below a repository URL: '+url);
  const target=path.resolve(path.dirname(file),decodeURIComponent(url.split(/[?#]/)[0]));
  assert(target.startsWith(root+path.sep),'Asset must stay inside the site: '+url);
  assert(fs.existsSync(target),'Missing local reference in '+path.relative(root,file)+': '+url);
}
for(const name of ['index.html','editor.html']){
  const file=path.join(root,name),html=fs.readFileSync(file,'utf8');
  assert(html.includes('<title>Kamus Istilah Arsitektur</title>'));
  for(const match of html.matchAll(/(?:src|href)="([^"\s]+)"/g))local(file,match[1]);
}
for(const name of fs.readdirSync(path.join(root,'assets/css'))){
  const file=path.join(root,'assets/css',name),css=fs.readFileSync(file,'utf8');
  for(const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))local(file,match[1]);
}
for(const entry of require('../data/dictionary.json').entries)for(const image of entry.images)local(path.join(root,'index.html'),image.url);
const editor=fs.readFileSync(path.join(root,'editor.html'),'utf8');assert(editor.includes('id="editor-help-dialog"'));assert(editor.includes('src="assets/js/panel-layout.js'));
assert(!fs.existsSync(path.join(root,'assets/info.svg')));assert(!fs.existsSync(path.join(root,'MILESTONE.md')));
assert(!fs.existsSync(path.join(root,'data/associations.js')),'The full graph script is no longer consumed by either page');
console.log('Passed: reader/editor titles, relative scripts/styles/images, retained curated media, editor help, and obsolete asset removal.');
