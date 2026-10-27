const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),Reader=require('../assets/js/reader-data.js');
const root=path.resolve(__dirname,'..');
function build(){
  const data=JSON.parse(fs.readFileSync(path.join(root,'data/dictionary.json'),'utf8'));
  const associations=JSON.parse(fs.readFileSync(path.join(root,'data/associations.json'),'utf8'));
  const text=Reader.script(data,associations);
  fs.writeFileSync(path.join(root,'data/reader.js'),text);
  return {entries:data.entries.length,bytes:Buffer.byteLength(text),gzip_bytes:zlib.gzipSync(text).length};
}
if(require.main===module)console.log(JSON.stringify(build()));
module.exports=build;
