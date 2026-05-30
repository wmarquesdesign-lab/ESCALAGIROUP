
const setores = ['HORTIFRUTI','AÇOUGUE','PADARIA','LANCHONETE','FRENTE DE CAIXA','MERCEARIA','SALÃO / REPOSITORES'];
const themes = {
  'HORTIFRUTI': ['#52c539','#126713','#e9ffe7'],
  'AÇOUGUE': ['#ff3939','#8e0000','#fff0f0'],
  'PADARIA': ['#ffba34','#c86800','#fff6e6'],
  'LANCHONETE': ['#ff9b26','#8b3b00','#fff4e7'],
  'FRENTE DE CAIXA': ['#2496ff','#004c9e','#eef7ff'],
  'MERCEARIA': ['#9957e9','#4b1689','#f6efff'],
  'SALÃO / REPOSITORES': ['#00b8a9','#00695c','#e8fffb']
};
const defaults = {
  manha: { label:'MANHÃ', hora:'06h às 14h', icon:'☀️', rows:['Ana Paula','Bruno Lima','Camila Santos','Daniel Rocha','Eduarda Alves'] },
  tarde: { label:'TARDE', hora:'14h às 22h', icon:'☀️', rows:['Felipe Costa','Gabriela Martins','Igor Ferreira','Juliana Mendes','Lucas Pereira'] },
  noite: { label:'NOITE', hora:'22h às 06h', icon:'🌙', rows:['Marcos Vinicius','Nathalia Souza','Rafael Dias','Tatiane Lima','Vinicius Carvalho'] }
};
let shifts = JSON.parse(JSON.stringify(defaults));
let hidden = { manha:false, tarde:false, noite:false };
let cells = {};
const cycle = ['', 'TRABALHO', 'FOLGA', 'FÉRIAS'];
const defaultDayNames = ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'];
let dayNames = [...defaultDayNames];
let dayDates = [];
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const br = d => `${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
function buildStartSunday(){
  const today = new Date();
  today.setDate(today.getDate() - today.getDay());
  return Array.from({length:7},(_,i)=>{ const d = new Date(today); d.setDate(today.getDate()+i); return iso(d); });
}
function initSelectors(){
  setores.forEach(s=>{
    setor.add(new Option(s[0]+s.slice(1).toLowerCase(), s));
    const b = document.createElement('button');
    b.textContent = (s==='LANCHONETE'?'☕ ':'') + s;
    b.dataset.setor=s;
    b.onclick = () => { setor.value=s; applyTheme(); render(); save(); };
    sectorButtons.appendChild(b);
  });
}
function makeDateInputs(){
  if(!dayDates.length) dayDates = buildStartSunday();
  dateInputs.innerHTML = '';
  for(let i=0;i<7;i++){
    const box=document.createElement('div'); box.className='dateBox';
    box.innerHTML=`<label>Dia da semana<input data-i="${i}" data-type="name" value="${dayNames[i]}"></label><label>Data<input data-i="${i}" data-type="date" type="date" value="${dayDates[i]}"></label>`;
    dateInputs.appendChild(box);
  }
  dateInputs.querySelectorAll('input').forEach(inp=>inp.oninput=()=>{
    const i=Number(inp.dataset.i);
    if(inp.dataset.type==='name') dayNames[i]=inp.value.toUpperCase(); else dayDates[i]=inp.value;
    render(); save();
  });
}
function applyTheme(){
  const [a,b,c] = themes[setor.value] || themes.HORTIFRUTI;
  document.documentElement.style.setProperty('--theme1', a);
  document.documentElement.style.setProperty('--theme2', b);
  document.documentElement.style.setProperty('--themeBg', c);
  document.querySelectorAll('.sectors button').forEach(btn=>btn.classList.toggle('active', btn.dataset.setor===setor.value));
}
function statusClass(v){ return v==='TRABALHO'?'trabalho':v==='FOLGA'?'folga':v==='FÉRIAS'?'ferias':'empty'; }
function nextStatus(v){ return cycle[(cycle.indexOf(v)+1) % cycle.length] || ''; }
function makeCell(key){
  const btn=document.createElement('button');
  const value=cells[key] || '';
  btn.className='cellBtn '+statusClass(value);
  btn.textContent=value || '+';
  btn.dataset.key=key;
  btn.dataset.v=value;
  btn.onclick=()=>{
    const v=nextStatus(btn.dataset.v || '');
    btn.dataset.v=v;
    cells[key]=v;
    btn.textContent=v || '+';
    btn.className='cellBtn '+statusClass(v);
    save();
  };
  return btn;
}
function render(){
  printSetor.textContent = setor.value;
  printEncarregado.textContent = encarregado.value || '________________';
  paperSheet.className = 'sheet panel ' + paper.value;
  let html='<thead><tr><th>TURNO</th><th>COLABORADOR</th><th>HORÁRIO</th>';
  for(let i=0;i<7;i++) html += `<th class="day ${i===0?'dom':''} ${i===6?'sab':''}">${dayNames[i]}<br><small>${dayDates[i] ? dayDates[i].split('-').reverse().slice(0,2).join('/') : ''}</small></th>`;
  html+='</tr></thead><tbody>';
  Object.entries(shifts).forEach(([key,sh])=>{
    if(hidden[key]) return;
    sh.rows.forEach((nome,i)=>{
      html+='<tr>';
      if(i===0) html += `<td class="shiftCell ${key}" rowspan="${sh.rows.length}"><div>${sh.icon}</div><strong>${sh.label}</strong><span>${sh.hora}</span></td>`;
      html += `<td class="name" contenteditable="true" data-name="${key}-${i}">${nome}</td><td class="time" contenteditable="true" data-time="${key}">${sh.hora}</td>`;
      for(let d=0; d<7; d++) html += `<td data-cell="${key}-${i}-${d}"></td>`;
      html+='</tr>';
    });
  });
  html+='</tbody>';
  schedule.innerHTML=html;
  document.querySelectorAll('td[data-cell]').forEach(td=>td.appendChild(makeCell(td.dataset.cell)));
  document.querySelectorAll('[data-name]').forEach(td=>td.oninput=()=>{ const [k,i]=td.dataset.name.split('-'); shifts[k].rows[Number(i)]=td.textContent.trim(); save(); });
  document.querySelectorAll('[data-time]').forEach(td=>td.oninput=()=>{ const k=td.dataset.time; shifts[k].hora=td.textContent.trim(); document.querySelectorAll(`[data-time="${k}"]`).forEach(x=>{ if(x!==td) x.textContent=shifts[k].hora; }); save(); });
  document.querySelectorAll('.hideShift').forEach(b=>{ b.textContent=(b.dataset.shift==='manha'?'☀️ MANHÃ ':b.dataset.shift==='tarde'?'☀️ TARDE ':'🌙 NOITE ') + (hidden[b.dataset.shift]?'🙈':'👁️'); });
  updateSummary();
}
function updateSummary(){
  const vals=Object.values(cells);
  const totalFuncionarios=Object.values(shifts).reduce((n,s)=>n+s.rows.length,0);
  const trabalho=vals.filter(v=>v==='TRABALHO').length;
  const folga=vals.filter(v=>v==='FOLGA').length;
  const ferias=vals.filter(v=>v==='FÉRIAS').length;
  const vazio=(totalFuncionarios*7)-trabalho-folga-ferias;
  if(summaryGrid) summaryGrid.innerHTML=`<div class="summaryCard"><b>${totalFuncionarios}</b><span>Funcionários</span></div><div class="summaryCard"><b>${trabalho}</b><span>Trabalho</span></div><div class="summaryCard"><b>${folga}</b><span>Folgas</span></div><div class="summaryCard"><b>${ferias}</b><span>Férias</span></div><div class="summaryCard"><b>${vazio}</b><span>Vazios</span></div>`;
}
function setRows(shiftKey, count){
  count=Math.max(1, Math.min(20, Number(count)||5));
  const sh=shifts[shiftKey];
  if(!sh) return;
  while(sh.rows.length < count) sh.rows.push('');
  while(sh.rows.length > count) sh.rows.pop();
  syncRowInputs();
  render(); save();
}
function syncRowInputs(){
  rowsManha.value = shifts.manha.rows.length;
  rowsTarde.value = shifts.tarde.rows.length;
  rowsNoite.value = shifts.noite.rows.length;
}
function snapshot(){
  return JSON.parse(JSON.stringify({setor:setor.value, encarregado:encarregado.value, paper:paper.value, obs:obs.value, saveName:saveName.value, shifts, hidden, cells, dayNames, dayDates, darkMode:document.body.classList.contains('dark')}));
}
function applySnapshot(data){
  if(data.setor) setor.value=data.setor;
  encarregado.value=data.encarregado || '';
  if(data.paper) paper.value=data.paper;
  obs.value=data.obs || '';
  saveName.value=data.saveName || '';
  if(data.shifts) shifts=data.shifts;
  if(data.hidden) hidden=data.hidden;
  cells=data.cells || {};
  if(data.dayNames) dayNames=data.dayNames;
  if(data.dayDates) dayDates=data.dayDates;
  document.body.classList.toggle('dark', !!data.darkMode); syncRowInputs(); makeDateInputs(); applyTheme(); render(); save();
}
function getSavedFiles(){
  try{return JSON.parse(localStorage.getItem('giroupEscalaArquivos')||'[]')}catch(e){return []}
}
function setSavedFiles(list){ localStorage.setItem('giroupEscalaArquivos', JSON.stringify(list)); mirrorSavedToIndexedDB(list); }
function saveFile(){
  const nome=(quickSaveName.value || saveName.value || `${setor.value} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`).trim();
  saveName.value=nome; quickSaveName.value='';
  const list=getSavedFiles();
  list.unshift({id:Date.now(), nome, criado:new Date().toLocaleString('pt-BR'), data:snapshot()});
  setSavedFiles(list.slice(0,300));
  save(); renderSavedList(); alert('Arquivo salvo no painel!');
}
function textFromItem(item){
  const d=item.data||{};
  const nomes=Object.values(d.shifts||{}).flatMap(s=>s.rows||[]).join(' ');
  return `${item.nome} ${item.criado} ${d.setor||''} ${d.encarregado||''} ${nomes}`.toLowerCase();
}
function renderSavedList(){
  let list=getSavedFiles();
  const q=(savedSearch?.value||'').trim().toLowerCase();
  if(q) list=list.filter(item=>textFromItem(item).includes(q));
  if(!list.length){ savedList.innerHTML='<div class="savedItem"><div><b>Nenhum arquivo encontrado</b><small>Salve uma escala ou limpe a busca.</small></div></div>'; return; }
  savedList.innerHTML=list.map(item=>`<div class="savedItem"><div><b>${item.nome}</b><small>${item.criado} • ${item.data?.setor||''}</small></div><button class="openSaved" data-open="${item.id}">Abrir</button><button class="duplicateSaved purpleBtn" data-dup="${item.id}">Copiar</button><button class="renameSaved orangeBtn" data-ren="${item.id}">Nome</button><button class="deleteSaved" data-del="${item.id}">Excluir</button></div>`).join('');
  savedList.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ const item=getSavedFiles().find(x=>String(x.id)===String(b.dataset.open)); if(item) applySnapshot(item.data); });
  savedList.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ if(confirm('Excluir este arquivo salvo?')){ setSavedFiles(getSavedFiles().filter(x=>String(x.id)!==String(b.dataset.del))); renderSavedList(); } });
  savedList.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{ const list=getSavedFiles(); const item=list.find(x=>String(x.id)===String(b.dataset.dup)); if(item){ const copy=JSON.parse(JSON.stringify(item)); copy.id=Date.now(); copy.nome=item.nome+' - cópia'; copy.criado=new Date().toLocaleString('pt-BR'); list.unshift(copy); setSavedFiles(list); renderSavedList(); }});
  savedList.querySelectorAll('[data-ren]').forEach(b=>b.onclick=()=>{ const list=getSavedFiles(); const item=list.find(x=>String(x.id)===String(b.dataset.ren)); if(item){ const n=prompt('Novo nome do arquivo:', item.nome); if(n){ item.nome=n.trim(); setSavedFiles(list); renderSavedList(); } }});
}
function exportBackup(){
  const payload={versao:'GIROUP Escala Backup 2.0', exportadoEm:new Date().toISOString(), atual:snapshot(), arquivos:getSavedFiles()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup_giroup_escala.json'; a.click(); URL.revokeObjectURL(a.href);
}
function importBackupFile(file){
  const reader=new FileReader();
  reader.onload=()=>{try{ const payload=JSON.parse(reader.result); const arquivos=payload.arquivos||[]; if(confirm(`Restaurar ${arquivos.length} arquivos salvos do backup?`)){ setSavedFiles(arquivos); if(payload.atual) applySnapshot(payload.atual); renderSavedList(); alert('Backup restaurado!'); }}catch(e){alert('Arquivo de backup inválido.')}};
  reader.readAsText(file);
}
function clearShift(key){
  Object.keys(cells).forEach(k=>{ if(k.startsWith(key+'-')) delete cells[k]; });
  render(); save();
}
function copyCurrentWeek(){
  const list=getSavedFiles();
  const nome=`${saveName.value||setor.value} - cópia da semana`;
  list.unshift({id:Date.now(), nome, criado:new Date().toLocaleString('pt-BR'), data:snapshot()});
  setSavedFiles(list); renderSavedList(); alert('Semana copiada para os arquivos salvos.');
}
function shareSchedule(){
  const text=`Escala GIROUP - ${setor.value} - ${encarregado.value||'sem encarregado'}`;
  if(navigator.share) navigator.share({title:'Escala GIROUP', text}).catch(()=>{});
  else alert('Use o botão PDF/Imprimir e envie o arquivo pelo WhatsApp.');
}
// Espelho IndexedDB: mantém cópia mais segura quando o navegador permitir.
function openEscalaDB(){return new Promise((resolve,reject)=>{ if(!('indexedDB' in window)) return resolve(null); const req=indexedDB.open('GIROUP_ESCALA_DB',1); req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains('arquivos')) db.createObjectStore('arquivos',{keyPath:'id'}); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>resolve(null); });}
async function mirrorSavedToIndexedDB(list){ const db=await openEscalaDB(); if(!db) return; const tx=db.transaction('arquivos','readwrite'); const store=tx.objectStore('arquivos'); store.clear(); list.forEach(item=>store.put(item)); }
function save(){
  localStorage.setItem('giroupEscalaCompleta', JSON.stringify(snapshot()));
}
function restore(){
  try{
    const data=JSON.parse(localStorage.getItem('giroupEscalaCompleta')||'{}');
    if(data.setor) setor.value=data.setor;
    encarregado.value=data.encarregado || '';
    if(data.paper) paper.value=data.paper;
    obs.value=data.obs || '';
    saveName.value=data.saveName || '';
    if(data.shifts) shifts=data.shifts;
    if(data.hidden) hidden=data.hidden;
    if(data.cells) cells=data.cells;
    if(data.dayNames) dayNames=data.dayNames;
    if(data.dayDates) dayDates=data.dayDates;
  }catch(e){}
  if(!dayDates.length) dayDates=buildStartSunday();
  syncRowInputs(); makeDateInputs(); applyTheme(); render(); renderSavedList();
}
function setPrintPageSize(){
  let style = document.getElementById('dynamicPrintSize');
  if(!style){
    style = document.createElement('style');
    style.id = 'dynamicPrintSize';
    document.head.appendChild(style);
  }
  const pageSize = paper.value === 'a3' ? 'A3 landscape' : 'A4 landscape';
  style.textContent = `@media print{@page{size:${pageSize};margin:8mm}}`;
}
window.addEventListener('beforeprint', setPrintPageSize);
initSelectors();
printBtn.onclick=()=>{ save(); setPrintPageSize(); setTimeout(()=>window.print(),50); };
saveBtn.onclick=()=>saveFile();
saveFileBtn.onclick=()=>saveFile();
document.querySelectorAll('[data-row-plus]').forEach(b=>b.onclick=()=>setRows(b.dataset.rowPlus, shifts[b.dataset.rowPlus].rows.length+1));
document.querySelectorAll('[data-row-minus]').forEach(b=>b.onclick=()=>setRows(b.dataset.rowMinus, shifts[b.dataset.rowMinus].rows.length-1));
rowsManha.onchange=()=>setRows('manha', rowsManha.value);
rowsTarde.onchange=()=>setRows('tarde', rowsTarde.value);
rowsNoite.onchange=()=>setRows('noite', rowsNoite.value);
resetBtn.onclick=()=>{ if(confirm('Zerar todos os botões da escala?')){ cells={}; render(); save(); } };
setor.onchange=()=>{ applyTheme(); render(); save(); };
[encarregado,paper,obs,saveName].forEach(el=>el.addEventListener('input',()=>{ render(); save(); }));
document.querySelectorAll('.hideShift').forEach(b=>b.onclick=()=>{ hidden[b.dataset.shift]=!hidden[b.dataset.shift]; render(); save(); });

savedSearch?.addEventListener('input', renderSavedList);
clearSearchBtn?.addEventListener('click',()=>{savedSearch.value='';renderSavedList();});
exportBackupBtn?.addEventListener('click', exportBackup);
importBackupBtn?.addEventListener('click',()=>backupFile.click());
backupFile?.addEventListener('change',()=>{ if(backupFile.files[0]) importBackupFile(backupFile.files[0]); backupFile.value=''; });
pdfBtn?.addEventListener('click',()=>{ alert('Na próxima tela escolha “Salvar como PDF” ou sua impressora.'); save(); setPrintPageSize(); setTimeout(()=>window.print(),50); });
clearManhaBtn?.addEventListener('click',()=>{ if(confirm('Limpar somente o turno da manhã?')) clearShift('manha'); });
clearTardeBtn?.addEventListener('click',()=>{ if(confirm('Limpar somente o turno da tarde?')) clearShift('tarde'); });
clearNoiteBtn?.addEventListener('click',()=>{ if(confirm('Limpar somente o turno da noite?')) clearShift('noite'); });
copyWeekBtn?.addEventListener('click', copyCurrentWeek);
darkModeBtn?.addEventListener('click',()=>{document.body.classList.toggle('dark'); save();});
shareBtn?.addEventListener('click', shareSchedule);

restore();

