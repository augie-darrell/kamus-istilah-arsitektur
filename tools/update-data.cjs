// Optional Node maintenance route; the browser editor exports these same files.
const S=require('../assets/js/shared.js'),Files=require('./data-files.cjs'),data=Files.load();
S.rebuildRelations(data);Files.write(data);
console.log('Validated and regenerated data for '+data.entries.length+' entries.');
