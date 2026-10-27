(function(root){
  'use strict';
  const key=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  function create(input,{rowHeight=104,grouped=true,descending=false,letterHeight=36,prefixHeight=28}={}){
    const results=[...input],rows=[],offsets=[0],resultOffsets=[],letterOffsets=new Map();
    if(grouped)results.sort((a,b)=>(key(a.entry.term).localeCompare(key(b.entry.term),'id')||a.entry.term.localeCompare(b.entry.term,'id'))*(descending?-1:1));
    let lastLetter='',lastPrefix='';
    function append(row,height){rows.push(row);offsets.push(offsets[offsets.length-1]+height);}
    results.forEach((result,resultIndex)=>{
      const normalized=key(result.entry.term),letter=normalized.charAt(0).toUpperCase()||'#',prefix=normalized.length>1?letter+normalized.charAt(1):'';
      if(grouped&&letter!==lastLetter){letterOffsets.set(letter,offsets[offsets.length-1]);append({kind:'letter',title:letter,letter},letterHeight);lastLetter=letter;lastPrefix='';}
      if(grouped&&prefix&&prefix!==lastPrefix){append({kind:'prefix',title:prefix,letter},prefixHeight);lastPrefix=prefix;}
      resultOffsets.push(offsets[offsets.length-1]);append({kind:'entry',result,resultIndex,letter},rowHeight);
    });
    const prefixLetters=new Set(rows.filter(r=>r.kind==='prefix').map(r=>r.letter)),sections=rows.flatMap((row,i)=>row.kind==='prefix'||row.kind==='letter'&&!prefixLetters.has(row.letter)?[{letter:row.letter,title:row.title,offset:offsets[i]}]:[]),sectionGroups=new Map();
    for(const section of sections){if(!sectionGroups.has(section.letter))sectionGroups.set(section.letter,[]);sectionGroups.get(section.letter).push(section);}
    function scrub(letter,fraction){const group=sectionGroups.get(letter);if(!group?.length)return null;const position=Math.max(0,Math.min(1,Number.isFinite(fraction)?fraction:0))*(group.length-1),low=Math.floor(position),high=Math.ceil(position);return {offset:group[low].offset+(group[high].offset-group[low].offset)*(position-low),section:group[Math.round(position)]};}
    function nearestSection(y,letter){const group=letter?sectionGroups.get(letter):sections;if(!group?.length)return null;let low=0,high=group.length;while(low<high){const mid=(low+high)>>1;if(group[mid].offset<y)low=mid+1;else high=mid;}if(!low)return group[0];if(low===group.length)return group[group.length-1];return y-group[low-1].offset<=group[low].offset-y?group[low-1]:group[low];}
    function indexAt(y){let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(offsets[mid+1]<=y)lo=mid+1;else hi=mid;}return Math.min(Math.max(0,rows.length-1),lo);}
    function windowRows(y,height){return {start:Math.max(0,indexAt(y)-4),end:Math.min(rows.length,indexAt(y+height)+5)};}
    return {results,rows,offsets,resultOffsets,letterOffsets,sections,sectionGroups,scrub,nearestSection,indexAt,windowRows,totalHeight:offsets[offsets.length-1]};
  }
  // A linked entry stays visible without discarding the reader's search/filter.
  function withSelection(results,entry){return !entry||results.some(r=>r.entry.id===entry.id)?results:[{entry,match:'selected'},...results];}
  const api={create,key,withSelection};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusList=api;
})(typeof window==='undefined'?globalThis:window);
