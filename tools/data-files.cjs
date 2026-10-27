/* Node maintenance and browser editor exports use the same file generator. */
const fs=require('node:fs'),path=require('node:path'),S=require('../assets/js/shared.js'),A=require('../assets/js/associations-builder.js');
const root=path.resolve(__dirname,'..');
function load(){return JSON.parse(fs.readFileSync(path.join(root,'data/dictionary.json'),'utf8').replace(/^\uFEFF/,''));}
function write(data){
  S.validateDataset(data);
  const associations=A.build(data.entries),files=S.exportFiles(data,[],associations);
  for(const [name,text] of Object.entries(files))if(name!=='data/editor-changes.json')fs.writeFileSync(path.join(root,name),text);
  return associations;
}
module.exports={load,write};
