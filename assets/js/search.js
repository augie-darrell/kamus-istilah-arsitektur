(function(root){
  'use strict';
  const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('id').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  function distance(a,b,limit=3){
    if(a===b)return 0;if(Math.abs(a.length-b.length)>limit)return limit+1;
    let prev=Array.from({length:b.length+1},(_,i)=>i),older;
    for(let i=1;i<=a.length;i++){
      const row=[i];let min=i;
      for(let j=1;j<=b.length;j++){
        row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
        if(older&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],older[j-2]+1);
        min=Math.min(min,row[j]);
      }
      if(min>limit)return limit+1;older=prev;prev=row;
    }return prev[b.length];
  }
  // Match each query word to a different candidate word, allowing reorderings,
  // an unfinished final word, and a bounded number of spelling mistakes.
  function phraseCost(query,candidate){
    const qs=query.split(' '),cs=candidate.split(' ');if(qs.length>cs.length||cs.length>qs.length+5)return Infinity;
    const edges=qs.map((q,i)=>cs.map((c,j)=>{
      if(q===c)return {j,cost:0};
      if(i===qs.length-1&&q.length>=2&&c.startsWith(q))return {j,cost:.3};
      if(q.length<3)return {j,cost:Infinity};
      const limit=q.length<=4?1:2,d=distance(q,c,limit);
      return {j,cost:d<=limit?d:Infinity};
    }).filter(x=>Number.isFinite(x.cost)).sort((a,b)=>a.cost-b.cost));
    if(edges.some(x=>!x.length))return Infinity;
    let best=Infinity;
    function visit(i,used,total){if(total>=best)return;if(i===edges.length){best=total;return;}for(const edge of edges[i])if(!used.has(edge.j)){used.add(edge.j);visit(i+1,used,total+edge.cost);used.delete(edge.j);}}
    visit(0,new Set(),0);return best;
  }
  function create(entries){
    const Content=typeof module!=='undefined'&&module.exports?require('./entry-content.js'):root.KamusContent;
    const typesById=new Map();
    const indexed=entries.map(e=>{const meaning=Content?.meaning(e);typesById.set(e.id,Content?.wordTypeSummary(e,meaning).codes||[e.word_type].filter(Boolean));return {entry:e,name:normalize(e.term),aliases:[...new Set(e.translations.flatMap(t=>t.terms).map(normalize).filter(Boolean))],body:normalize(e.definition+' '+(meaning?.search_text||meaning?.text||''))};});
    function eligible(e,filters){
      const types=typesById.get(e.id)||[];
      return (!filters.letter||e.letter===filters.letter)&&(!filters.language||e.languages.some(l=>l.code===filters.language))&&(!filters.wordType||(filters.wordType==='other'?(!types.length||types.some(t=>!['kb','kk','aj','ks'].includes(t))):types.includes(filters.wordType)))&&(!filters.saved||filters.saved.has(e.id));
    }
    function count(filters={}){return indexed.reduce((n,x)=>n+(eligible(x.entry,filters)?1:0),0);}
    function find(query,filters={}){
      const q=normalize(query),tokens=q.split(' '),maxCost=Math.min(4,Math.max(1,Math.floor(q.replace(/ /g,'').length*.22))),results=[];
      for(const x of indexed){
        const e=x.entry;
        if(!eligible(e,filters))continue;
        let score=0,match='browse';
        if(q){
          if(x.name===q){score=1000;match='exact';}
          else if(x.name.startsWith(q)){score=860-Math.min(90,x.name.length-q.length);match='headword';}
          else if(x.name.includes(q)){score=750;match='headword';}
          else if(x.aliases.some(a=>a===q)){score=720;match='translation';}
          else if(tokens.every(t=>x.name.includes(t))){score=680;match='headword';}
          else if(x.aliases.some(a=>a.includes(q))){score=640;match='translation';}
          if(filters.fuzzy!==false&&q.length>=3&&tokens.length<=6&&score<600){
            const cost=phraseCost(q,x.name);let fuzzyScore=cost<=maxCost?570-cost*55-Math.max(0,x.name.split(' ').length-tokens.length)*3:0;
            for(const alias of x.aliases){if(fuzzyScore>=570)break;const ac=phraseCost(q,alias);if(ac<=maxCost)fuzzyScore=Math.max(fuzzyScore,510-ac*55);}
            if(fuzzyScore>score){score=fuzzyScore;match='similar';}
          }
          if(!score&&tokens.every(t=>(x.name+' '+x.aliases.join(' ')+' '+x.body).includes(t))){score=180;match='definition';}
          if(!score)continue;
        }results.push({entry:e,score,match});
      }
      const sort=filters.sort||'relevance';
      return results.sort((a,b)=>(sort==='relevance'&&q?b.score-a.score:0)||(sort==='za'?-1:1)*a.entry.term.localeCompare(b.entry.term,'id',{sensitivity:'base'})||a.entry.source_index-b.entry.source_index);
    }return {find,count,indexed};
  }
  const api={create,normalize,distance,phraseCost};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DictionarySearch=api;
})(typeof window==='undefined'?globalThis:window);
