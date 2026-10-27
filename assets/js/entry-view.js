(function(root){
  'use strict';
  const S=typeof module!=='undefined'&&module.exports?require('./shared.js'):root.KamusShared;
  const Content=typeof module!=='undefined'&&module.exports?require('./entry-content.js'):root.KamusContent;
  const KBBI=typeof module!=='undefined'&&module.exports?require('./kbbi-format.js'):root.KamusKBBI;
  const List=typeof module!=='undefined'&&module.exports?require('./list-layout.js'):root.KamusList,esc=S.escape;
  function tags(entry){const type=Content.wordTypeSummary(entry).label;return entry.languages.map(l=>`<span class="tag">${esc(l.code==='und'?'Label sumber: '+entry.language_raw:l.name)}</span>`).join('')+(type?`<span class="word-type-tag">${esc(type)}</span>`:'');}
  function meaningBody(meaning){
    if(!meaning)return '';
    if(meaning.provider!=='kbbi_iii')return `<p class="detail-definition">${esc(meaning.text)}</p>`;
    const layout=meaning.layout;
    return layout.items.map(item=>{const types=KBBI.labelTypes(item.wordTypes),mixed=item.wordTypes.length>1;
      return `<div class="kbbi-meaning">${layout.multiple?`<div class="kbbi-heading"><h3 class="kbbi-headword">${esc(item.term)}${item.homonym?`<sup>${item.homonym}</sup>`:''}</h3>${types?`<span class="kbbi-word-type">${esc(types)}</span>`:''}</div>`:''}${item.pronunciation?`<p class="kbbi-pronunciation">${esc(item.pronunciation)}</p>`:''}<ol class="kbbi-senses">${item.senses.map(s=>`<li value="${s.number}">${mixed&&s.wordTypes.length?`<span class="kbbi-sense-type">${esc(KBBI.labelTypes(s.wordTypes))}.</span> `:''}${esc(KBBI.formatSense(s.text))}</li>`).join('')}</ol></div>`;
    }).join('');
  }
  function listExcerpt(entry){return typeof entry.editorial_meaning==='string'?entry.editorial_meaning||Content.meaning(entry)?.search_text||'Makna belum tersedia.':entry.definition||'Definisi belum tersedia di sumber.';}
  function listRows(layout,{start,end,selectedId,action='entry',badge=()=>'',excerpt=listExcerpt}){
    return `<div class="virtual-spacer" style="height:${layout.offsets[start]}px" aria-hidden="true"></div>`+layout.rows.slice(start,end).map(item=>{
      if(item.kind!=='entry')return `<div class="index-divider ${item.kind}-divider" role="heading" aria-level="${item.kind==='letter'?2:3}">${esc(item.title)}</div>`;
      const {entry:e,match}=item.result;
      return `<div role="listitem" aria-posinset="${item.resultIndex+1}" aria-setsize="${layout.results.length}"><button class="result-row ${e.id===selectedId?'selected':''}" data-${action}="${esc(e.id)}" aria-pressed="${e.id===selectedId}" title="${esc(e.term)}"><span class="row-top"><span class="row-term">${esc(e.term)}</span>${badge(e)}</span><span class="row-meta">${e.languages.map(l=>`<span class="language-tag">${esc(l.code==='und'?l.label+' ?':l.name)}</span>`).join(' ')}<span class="row-type">${esc(Content.wordTypeSummary(e).abbreviations)}</span>${match==='similar'?' · <span class="similar-badge">Ejaan mirip</span>':''}</span><span class="row-excerpt">${esc(excerpt(e))}</span></button></div>`;
    }).join('')+`<div class="virtual-spacer" style="height:${Math.max(0,layout.totalHeight-layout.offsets[end])}px" aria-hidden="true"></div>`;
  }
  function alphabet(results,{sort='az',searching=false}={}){
    const descending=!searching&&sort==='za',available=new Set(results.map(r=>List.key(r.entry.term).charAt(0).toUpperCase())),letters=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];if(descending)letters.reverse();
    return `<button data-order aria-label="Urutkan ${sort==='za'?'A–Z':'Z–A'}" aria-pressed="${sort==='za'}" title="${searching?'Pencarian: relevansi':sort==='za'?'Z–A':'A–Z'}" ${searching?'disabled':''}>${descending?'↓':'↑'}</button>`+letters.map(letter=>`<button data-letter="${letter}" ${!available.has(letter)?'disabled':''} aria-label="Lompat ke abjad ${letter}" title="${letter}">${letter}</button>`).join('');
  }
  const api={tags,meaningBody,listRows,alphabet};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamusEntryView=api;
})(typeof window==='undefined'?globalThis:window);
