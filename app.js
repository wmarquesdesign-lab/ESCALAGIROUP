'use strict';

let produtos = window.ESTOQUE_INICIAL || [];
let bancoCarregado = false;
const DB_NAME = 'giroup_varejo_db';
const DB_VERSION = 1;
const STORE_NAME = 'dados';
const ESTOQUE_KEY = 'estoque';
let importacaoPendente = [];
let importacaoIgnorados = [];

const $ = (id) => document.getElementById(id);

const AUTH_PASSWORD_KEY = 'giroup_senha';
const AUTH_OLD_PASSWORD_KEY = 'giroup_password';
const AUTH_DEFAULT_PASSWORD = 'wagner1818';
const AUTH_SESSION_KEY = 'giroup_logado_sessao';

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}
function sessionGet(key) {
  try { return sessionStorage.getItem(key); } catch (_) { return null; }
}
function sessionSet(key, value) {
  try { sessionStorage.setItem(key, value); return true; } catch (_) { return false; }
}
function sessionRemove(key) {
  try { sessionStorage.removeItem(key); } catch (_) {}
}
function prepararSenhaInicial() {
  const atual = storageGet(AUTH_PASSWORD_KEY);
  if (atual && atual.trim()) return atual.trim();
  const antiga = storageGet(AUTH_OLD_PASSWORD_KEY);
  const senha = (antiga && antiga.trim()) ? antiga.trim() : AUTH_DEFAULT_PASSWORD;
  storageSet(AUTH_PASSWORD_KEY, senha);
  storageRemove(AUTH_OLD_PASSWORD_KEY);
  return senha;
}
const senhaSalva = () => prepararSenhaInicial();
const normalizar = (txt) => String(txt ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const soNumeros = (txt) => String(txt ?? '').replace(/\D/g, '');


function abrirDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB não disponível'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Erro ao abrir banco'));
  });
}

async function idbGet(key) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Erro ao ler banco'));
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key, value) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Erro ao salvar banco')); };
  });
}

async function carregarEstoqueSalvo() {
  try {
    const salvoIDB = await idbGet(ESTOQUE_KEY);
    if (Array.isArray(salvoIDB) && salvoIDB.length) {
      produtos = salvoIDB;
      bancoCarregado = true;
      return;
    }
  } catch (e) {
    console.warn('IndexedDB indisponível:', e);
  }

  try {
    const salvoLocal = JSON.parse(localStorage.getItem('giroup_estoque') || 'null');
    if (Array.isArray(salvoLocal) && salvoLocal.length) {
      produtos = salvoLocal;
      bancoCarregado = true;
    }
  } catch (e) {
    console.warn('LocalStorage indisponível:', e);
  }
}

async function salvarEstoqueCompleto() {
  await idbSet(ESTOQUE_KEY, produtos);
  localStorage.setItem('giroup_tem_estoque_salvo', '1');
  localStorage.setItem('giroup_ultima_qtd', String(produtos.length));
}

function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';
}

function dtVal(d) {
  if (!d) return 0;
  const [data, h = '00:00:00'] = String(d).split(' ');
  const [dia, mes, ano] = data.split('/');
  return new Date(`${ano}-${mes}-${dia}T${h}`).getTime() || 0;
}

function fmtPct(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
}

function match(q, p) {
  const texto = normalizar(q);
  const cod = soNumeros(q);
  if (!texto && !cod) return false;
  const codigoProduto = soNumeros(p.codigo);
  const nomeProduto = normalizar(p.produto);
  return Boolean((cod && codigoProduto.includes(cod)) || (texto && nomeProduto.includes(texto)));
}

function chaveProduto(p) {
  return [soNumeros(p.codigo), normalizar(p.produto), String(p.data || '').trim(), String(p.filial || '').trim(), String(p.custo ?? '').trim()].join('|');
}

function melhorTextoBusca(q) {
  return String(q || '').trim();
}

async function entrar() {
  const campo = $('senha');
  const digitada = String(campo.value || '').trim();
  if (digitada === senhaSalva()) {
    sessionSet(AUTH_SESSION_KEY, '1');
    storageRemove('giroup_logado');
    campo.value = '';
    if (!bancoCarregado) await carregarEstoqueSalvo();
    init();
  } else {
    alert('Senha errada. Verifique e tente novamente.');
    campo.value = '';
    campo.focus();
  }
}

function sair() {
  sessionRemove(AUTH_SESSION_KEY);
  storageRemove('giroup_logado');
  location.reload();
}

function init() {
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  resumo();
}

function alterarSenha() {
  const atual = String($('senhaAtual')?.value || '').trim();
  const nova = String($('novaSenha')?.value || '').trim();
  const repetir = String($('repetirSenha')?.value || '').trim();
  const msg = $('statusSenha');

  if (atual !== senhaSalva()) {
    msg.innerHTML = '<p class="bad">Senha atual incorreta.</p>';
    $('senhaAtual').focus();
    return;
  }
  if (nova.length < 4) {
    msg.innerHTML = '<p class="bad">A nova senha precisa ter pelo menos 4 caracteres.</p>';
    $('novaSenha').focus();
    return;
  }
  if (nova !== repetir) {
    msg.innerHTML = '<p class="bad">A confirmação não confere com a nova senha.</p>';
    $('repetirSenha').focus();
    return;
  }

  storageSet(AUTH_PASSWORD_KEY, nova);
  storageRemove(AUTH_OLD_PASSWORD_KEY);
  $('senhaAtual').value = '';
  $('novaSenha').value = '';
  $('repetirSenha').value = '';
  msg.innerHTML = '<p class="ok">Senha alterada com sucesso.</p>';
}

const subtitulos = {
  dashboard: 'Resumo rápido e atalhos que realmente funcionam.',
  estoque: 'Digite código ou nome e veja somente a mercadoria procurada.',
  custos: 'Consulte o histórico de preços de custo.',
  comparacao: 'Compare menor custo, maior custo, último custo e variação.',
  importar: 'Importe, confira, ignore duplicados e salve somente o que for novo.',
  appsPage: 'Abra os módulos disponíveis no pacote.',
  configuracoes: 'Troque a senha do aplicativo com segurança.'
};

function abrirPagina(botao) {
  document.querySelectorAll('.nav,.page').forEach((x) => x.classList.remove('active'));
  botao.classList.add('active');
  $(botao.dataset.page).classList.add('active');
  $('titulo').textContent = botao.textContent.replace(/[⌂⌕⇄⇧▦]/g, '').trim();
  $('subtitulo').textContent = subtitulos[botao.dataset.page] || 'Central GiroUp para varejo.';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resumo() {
  const cods = new Set(produtos.map((p) => p.codigo).filter(Boolean));
  const margens = produtos.map((p) => parseFloat(String(p.margem).replace(',', '.'))).filter(Number.isFinite);
  const ult = [...produtos].sort((a, b) => dtVal(b.data) - dtVal(a.data))[0];
  $('totalProdutos').textContent = produtos.length.toLocaleString('pt-BR');
  $('totalUnicos').textContent = cods.size.toLocaleString('pt-BR');
  $('mediaMargem').textContent = fmtPct(margens.reduce((a, b) => a + b, 0) / (margens.length || 1));
  $('ultimaData').textContent = ult ? String(ult.data).split(' ')[0] : '-';
}

function tabela(arr) {
  if (!arr.length) return '<p class="warn">Nenhum produto encontrado.</p>';
  return `<div class="tablewrap"><table><thead><tr><th>Código</th><th>Produto</th><th>Data</th><th>Filial</th><th>Custo</th><th>Venda</th><th>Margem</th></tr></thead><tbody>` +
    arr.map((p) => `<tr><td>${p.codigo || '-'}</td><td>${p.produto || '-'}</td><td>${p.data || '-'}</td><td>${p.filial || '-'}</td><td>${money(p.custo)}</td><td>${money(p.venda)}</td><td>${p.margem || '-'}</td></tr>`).join('') +
    '</tbody></table></div>';
}

function buscarProdutos() {
  const q = melhorTextoBusca($('busca').value);
  if (!q) {
    $('resultadoBusca').innerHTML = '<p class="warn">Digite um código ou nome para pesquisar. A tela mostra somente a mercadoria procurada.</p>';
    $('busca').focus();
    return;
  }
  const arr = produtos.filter((p) => match(q, p)).sort((a, b) => dtVal(b.data) - dtVal(a.data)).slice(0, 120);
  $('resultadoBusca').innerHTML = `<p><strong>${arr.length}</strong> item(ns) encontrado(s) para <b>${q}</b>.</p>` + tabela(arr);
}

function limparBusca() {
  $('busca').value = '';
  $('resultadoBusca').innerHTML = '';
  $('busca').focus();
}

function grupo(q) {
  const termo = melhorTextoBusca(q);
  if (!termo) return [];
  return produtos.filter((p) => match(termo, p)).filter((p) => p.custo != null).sort((a, b) => dtVal(b.data) - dtVal(a.data));
}

function historicoCusto() {
  const arr = grupo($('buscaCusto').value);
  $('resultadoCusto').innerHTML = `<p><strong>${arr.length}</strong> entrada(s) encontradas com custo.</p>` + tabela(arr);
}

function compararCompra() {
  const arr = grupo($('buscaComp').value);
  if (!arr.length) {
    $('resultadoComp').innerHTML = '<p class="warn">Digite código ou nome e busque uma mercadoria válida.</p>';
    return;
  }
  const custos = arr.map((p) => Number(p.custo)).filter(Number.isFinite);
  const menor = Math.min(...custos);
  const maior = Math.max(...custos);
  const ultimo = arr[0].custo;
  const primeiro = arr[arr.length - 1].custo;
  const vari = primeiro ? ((ultimo - primeiro) / primeiro * 100) : 0;
  const best = arr.find((p) => Number(p.custo) === menor);
  const high = arr.find((p) => Number(p.custo) === maior);
  $('resultadoComp').innerHTML = `<div class="cards compact"><div class="card"><b>${money(ultimo)}</b><span>último custo</span></div><div class="card"><b>${money(menor)}</b><span>menor custo: ${best?.data || ''}</span></div><div class="card"><b>${money(maior)}</b><span>maior custo: ${high?.data || ''}</span></div><div class="card"><b class="${vari > 0 ? 'bad' : 'ok'}">${fmtPct(vari)}</b><span>variação</span></div></div>` + tabela(arr);
}

function parseNum(s) {
  if (s == null || s === '') return null;
  const n = String(s).replace(/\./g, '').replace(',', '.');
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

function parseCSV(texto) {
  const linhas = [];
  let atual = '', linha = [], dentroAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const prox = texto[i + 1];
    if (c === '"' && dentroAspas && prox === '"') { atual += '"'; i++; continue; }
    if (c === '"') { dentroAspas = !dentroAspas; continue; }
    if ((c === ';' || c === ',') && !dentroAspas) { linha.push(atual.trim()); atual = ''; continue; }
    if ((c === '\n' || c === '\r') && !dentroAspas) {
      if (c === '\r' && prox === '\n') i++;
      linha.push(atual.trim());
      if (linha.some((x) => x !== '')) linhas.push(linha);
      linha = []; atual = ''; continue;
    }
    atual += c;
  }
  linha.push(atual.trim());
  if (linha.some((x) => x !== '')) linhas.push(linha);
  return linhas;
}

function acharColuna(head, nomes) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  return head.findIndex((h) => lista.some((n) => h === normalizar(n) || h.includes(normalizar(n))));
}

function montarProdutosCSV(texto) {
  const linhas = parseCSV(texto);
  if (linhas.length < 2) return [];
  const head = linhas.shift().map((x) => normalizar(x));
  const idx = {
    registro: acharColuna(head, ['Registro']),
    filial: acharColuna(head, ['Filial', 'Loja']),
    data: acharColuna(head, ['Data', 'Emissão', 'Entrada']),
    codigo: acharColuna(head, ['Código', 'Codigo', 'Cod Produto', 'Cod']),
    produto: acharColuna(head, ['Produto', 'Descrição', 'Descricao', 'Mercadoria', 'Nome']),
    tabela: acharColuna(head, ['Tabela']),
    custo: acharColuna(head, ['Custo/N', 'Custo', 'Preço Custo', 'Preco Custo']),
    venda: acharColuna(head, ['Venda', 'Preço Venda', 'Preco Venda']),
    markup: acharColuna(head, ['Markup/N', 'Markup']),
    margem: acharColuna(head, ['Margem/T', 'Margem']),
    status: acharColuna(head, ['Status', 'Situação', 'Situacao'])
  };
  const get = (row, campo) => idx[campo] >= 0 ? (row[idx[campo]] || '') : '';
  return linhas.map((row) => ({
    registro: get(row, 'registro'),
    filial: get(row, 'filial'),
    data: get(row, 'data'),
    codigo: soNumeros(get(row, 'codigo')),
    produto: get(row, 'produto'),
    tabela: get(row, 'tabela'),
    custo: parseNum(get(row, 'custo')),
    venda: parseNum(get(row, 'venda')),
    markup: get(row, 'markup'),
    margem: get(row, 'margem'),
    status: get(row, 'status')
  })).filter((p) => p.codigo || p.produto);
}

function renderResumoImportacao(novos, repetidos) {
  $('importStatus').innerHTML = `
    <div class="import-card">
      <h4>Conferência da importação</h4>
      <p><b>${novos.length.toLocaleString('pt-BR')}</b> linha(s) nova(s) pronta(s) para salvar.</p>
      <p><b>${repetidos.length.toLocaleString('pt-BR')}</b> linha(s) já existiam e foram ignoradas.</p>
      <div class="row">
        <button id="btnSalvarImportacao" type="button">Salvar importação</button>
        <button id="btnCancelarImportacao" class="secondary" type="button">Cancelar</button>
      </div>
    </div>` + (novos.length ? tabela(novos.slice(0, 30)) : '<p class="warn">Nenhuma linha nova para salvar.</p>');
  $('btnSalvarImportacao').addEventListener('click', salvarImportacao);
  $('btnCancelarImportacao').addEventListener('click', cancelarImportacao);
}

async function salvarImportacao() {
  if (!importacaoPendente.length) {
    $('importStatus').innerHTML = '<p class="warn">Não existem linhas novas para salvar.</p>';
    return;
  }
  const btn = $('btnSalvarImportacao');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
  produtos = [...produtos, ...importacaoPendente];
  const salvos = importacaoPendente.length;
  try {
    await salvarEstoqueCompleto();
  } catch (e) {
    console.error(e);
    produtos = produtos.slice(0, produtos.length - salvos);
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar importação'; }
    $('importStatus').innerHTML = '<p class="bad">Não consegui salvar no navegador. Abra pelo Netlify/servidor e tente novamente, ou exporte a base antes de fechar.</p>';
    return;
  }
  const ignorados = importacaoIgnorados.length;
  importacaoPendente = [];
  importacaoIgnorados = [];
  resumo();
  $('importStatus').innerHTML = `<p class="ok">✅ Importação salva com sucesso: ${salvos.toLocaleString('pt-BR')} linha(s) adicionada(s). ${ignorados.toLocaleString('pt-BR')} repetida(s) ignorada(s). Total atual: ${produtos.length.toLocaleString('pt-BR')} linha(s).</p>`;
}

function cancelarImportacao() {
  importacaoPendente = [];
  importacaoIgnorados = [];
  $('csvFile').value = '';
  $('importStatus').innerHTML = '<p class="warn">Importação cancelada. Nada foi alterado na base.</p>';
}

function importarCSV() {
  const f = $('csvFile').files[0];
  if (!f) {
    alert('Escolha um arquivo CSV.');
    return;
  }
  importacaoPendente = [];
  importacaoIgnorados = [];
  $('importStatus').innerHTML = '<p class="warn">Lendo arquivo e conferindo duplicados...</p>';
  const r = new FileReader();
  r.onload = () => {
    const lidos = montarProdutosCSV(String(r.result));
    if (!lidos.length) {
      $('importStatus').innerHTML = '<p class="bad">Não encontrei produtos válidos no arquivo. Confira se o CSV tem cabeçalho e colunas de código/produto.</p>';
      return;
    }
    const existentes = new Set(produtos.map(chaveProduto));
    const vistasNoArquivo = new Set();
    const novos = [];
    const repetidos = [];
    for (const item of lidos) {
      const chave = chaveProduto(item);
      if (existentes.has(chave) || vistasNoArquivo.has(chave)) {
        repetidos.push(item);
      } else {
        vistasNoArquivo.add(chave);
        novos.push(item);
      }
    }
    importacaoPendente = novos;
    importacaoIgnorados = repetidos;
    renderResumoImportacao(novos, repetidos);
  };
  r.onerror = () => $('importStatus').innerHTML = '<p class="bad">Não foi possível ler o arquivo.</p>';
  r.readAsText(f, 'ISO-8859-1');
}

function exportarCSV() {
  const head = ['Registro', 'Filial', 'Data', 'Código', 'Produto', 'Tabela', 'Custo/N', 'Venda', 'Markup/N', 'Margem/T', 'Status'];
  const rows = produtos.map((p) => [p.registro, p.filial, p.data, p.codigo, p.produto, p.tabela, p.custo, p.venda, p.markup, p.margem, p.status].map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';'));
  const blob = new Blob([head.join(';') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'estoque_giroup.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function bind() {
  $('btnEntrar').addEventListener('click', entrar);
  $('senha').addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });
  $('btnSairSide').addEventListener('click', sair);
  $('btnSairTop').addEventListener('click', sair);
  $('btnBuscar').addEventListener('click', buscarProdutos);
  $('btnLimparBusca').addEventListener('click', limparBusca);
  $('btnHistorico').addEventListener('click', historicoCusto);
  $('btnComparar').addEventListener('click', compararCompra);
  $('btnImportar').addEventListener('click', importarCSV);
  $('btnExportar').addEventListener('click', exportarCSV);
  $('btnAlterarSenha')?.addEventListener('click', alterarSenha);

  let timerBusca = null;
  $('busca').addEventListener('input', () => {
    clearTimeout(timerBusca);
    const termo = melhorTextoBusca($('busca').value);
    if (!termo) { $('resultadoBusca').innerHTML = ''; return; }
    timerBusca = setTimeout(buscarProdutos, 250);
  });

  ['busca', 'buscaCusto', 'buscaComp'].forEach((id) => $(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (id === 'busca') buscarProdutos();
      if (id === 'buscaCusto') historicoCusto();
      if (id === 'buscaComp') compararCompra();
    }
  }));
  document.querySelectorAll('.nav').forEach((b) => b.addEventListener('click', () => abrirPagina(b)));
}

bind();
prepararSenhaInicial();
carregarEstoqueSalvo().then(() => {
  storageRemove('giroup_logado');
  if (sessionGet(AUTH_SESSION_KEY) === '1') init();
});
