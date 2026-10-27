const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stdout||'');process.stderr.write(r.stderr||String(r.error||''));process.exit(r.status||1);}}
for(const dir of ['', 'assets/js'])for(const name of fs.readdirSync(path.join(root,dir)).filter(name=>name.endsWith('.js')))run(['--check',path.join(dir,name)]);
const suites=fs.readdirSync(__dirname).filter(name=>/^check(?:-|\.)/.test(name)&&name.endsWith('.cjs')&&name!==path.basename(__filename)).sort();
for(const name of suites){run([path.join('tools',name)]);console.log('PASS '+name);}
console.log('Passed '+suites.length+' suites and all application JavaScript syntax checks.');
