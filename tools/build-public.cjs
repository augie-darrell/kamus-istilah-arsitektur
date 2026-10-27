/* Public reading site only. The editor and complete maintenance data stay in the repository. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.resolve(root,'_site');
assert.equal(path.relative(root,output),'_site','Only replace this project\'s generated publishing folder');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<a id="editor-link"[^>]*>.*?<\/a>/,'');
fs.writeFileSync(path.join(output,'index.html'),html);
const files=new Set(['.nojekyll','site-config.js']);
for(const match of html.matchAll(/(?:src|href)="([^"\s]+)"/g)){
  const name=match[1].split(/[?#]/)[0];if(name&&!/^(?:https?:|#)/.test(name))files.add(name);
}
for(const name of fs.readdirSync(path.join(root,'assets/images')))files.add('assets/images/'+name);
for(const name of files){
  const source=path.resolve(root,name),target=path.resolve(output,name);
  assert(source.startsWith(root+path.sep)&&target.startsWith(output+path.sep),name);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
}
const repository=process.env.GITHUB_REPOSITORY;
if(repository&&/^[\w.-]+\/[\w.-]+$/.test(repository)){
  const config=path.join(output,'site-config.js');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace(/githubUrl:\s*'[^']*'/,"githubUrl: 'https://github.com/"+repository+"'"));
}
assert(!fs.existsSync(path.join(output,'editor.html')));
assert(!fs.existsSync(path.join(output,'data/dictionary.js')));
assert(!html.includes('id="editor-link"'));
console.log('Public reading site prepared: '+(files.size+1)+' files in _site/. Local editor excluded.');
