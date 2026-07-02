/**
 * ================================================================
 * BUENOS FRIOS — api.js  v3.0
 * Camada de comunicação com o Google Apps Script.
 * ================================================================
 *
 * DEPENDÊNCIA: utils.js deve ser carregado antes deste arquivo.
 *
 * NOVIDADES v3.0:
 *  — apiPagina(slug)   → página completa com blocos resolvidos
 *  — apiPaginas()      → lista de todas as páginas ativas
 *  — apiBlocos(slug)   → blocos crus de uma página (debug)
 *  — CACHE_TTL.pagina  → tempo de cache específico para páginas
 *
 * ÍNDICE:
 *  1. Configuração central  (API.URL, TIMEOUT, CACHE_TTL, SHEETS)
 *  2. Sistema de cache      (lerCache, salvarCache, invalidarCache)
 *  3. Funções base de rede  (_get, _post)
 *  4. API pública
 *     4a. Páginas e blocos  ← NOVO v3.0
 *     4b. Estrutura         (categorias, subcategorias, colecoes…)
 *     4c. Produto           (produto, relacionados)
 *     4d. Listas filtradas  (categoria, subcategoria, colecao, buscar)
 *     4e. Flags             (promocoes, maisVendidos, destaques)
 *     4f. Pedido            (enviarPedido)
 *  5. Utilitários           (testarConexao, preCarregarDados, limparTodoCache)
 * ================================================================
 */


/* ================================================================
   1. CONFIGURAÇÃO CENTRAL
   ================================================================ */

var API = {

  /**
   * ⚠️ AÇÃO NECESSÁRIA:
   * Cole aqui a URL do Web App após publicar o Code.gs.
   *
   * Onde encontrar:
   *   Apps Script → Implantar → Gerenciar implantações → copiar URL
   *
   * Formato: 'https://script.google.com/macros/s/XXXXXXXX/exec'
   */
  URL: 'COLE_AQUI_A_URL_DO_APPS_SCRIPT',

  /**
   * Tempo máximo de espera por resposta (ms).
   * O Apps Script pode demorar no "cold start" (primeira chamada do dia).
   */
  TIMEOUT: 18000,

  /**
   * Tempos de cache por tipo de dado (milissegundos).
   *
   * Regra geral:
   *   — Dados estruturais que raramente mudam  → cache longo  (10–30 min)
   *   — Produtos e listas filtradas            → cache médio  (5 min)
   *   — Buscas e promoções                     → cache curto  (2–3 min)
   *   — Páginas (blocos + dados)               → cache médio  (5 min)
   *
   * Para desativar o cache de um tipo, defina como 0.
   */
  CACHE_TTL: {
    pagina:        5 * 60 * 1000,   //  5 min — página completa com blocos
    paginas:      10 * 60 * 1000,   // 10 min — lista de páginas
    categorias:   10 * 60 * 1000,   // 10 min
    subcategorias:10 * 60 * 1000,   // 10 min
    colecoes:     10 * 60 * 1000,   // 10 min
    banners:      10 * 60 * 1000,   // 10 min
    links:        30 * 60 * 1000,   // 30 min — rotas mudam muito raramente
    configuracoes:30 * 60 * 1000,   // 30 min
    produto:       5 * 60 * 1000,   //  5 min — produto individual
    lista:         5 * 60 * 1000,   //  5 min — listas filtradas
    relacionados:  5 * 60 * 1000,   //  5 min
    busca:         2 * 60 * 1000,   //  2 min — buscas devem ser frescas
    promocoes:     3 * 60 * 1000,   //  3 min
    flags:         5 * 60 * 1000,   //  5 min — mais vendidos, destaques
  },

  /**
   * Espelho dos nomes das abas definidos no Code.gs.
   * Mantido aqui apenas para referência no frontend.
   * Se alterar no Code.gs, atualize aqui também.
   */
  SHEETS: {
    PRODUTOS_IMPORTADOS:   'Produtos_Importados',
    PRODUTOS_CATALOGO:     'Produtos_Catalogo',
    CATEGORIAS:            'Categorias',
    SUBCATEGORIAS:         'Subcategorias',
    COLECOES:              'Coleções',
    COLECAO_PRODUTOS:      'Colecao_Produtos',
    IMAGENS:               'Imagens',
    BANNERS:               'Banners',
    LINKS_INTELIGENTES:    'Links_Inteligentes',
    PRODUTOS_RELACIONADOS: 'Produtos_Relacionados',
    PEDIDOS:               'Pedidos',
    CONFIGURACOES:         'Configurações',
    LOG:                   'Log',
    PAGINAS:               'Paginas',         // NOVO v3.0
    PAGINA_BLOCOS:         'Pagina_Blocos',   // NOVO v3.0
  },

  /** Cache em memória — vive apenas durante a sessão. */
  _mem: {},
};


/* ================================================================
   2. SISTEMA DE CACHE  (dois níveis: memória + localStorage)
   ================================================================ */

/**
 * Verifica se uma entrada de cache ainda é válida.
 * @param {{dados:*, timestamp:number}|null} entrada
 * @param {number} ttl - Tempo de vida em ms.
 * @returns {boolean}
 */
function _cacheValido(entrada, ttl) {
  if (!entrada || !entrada.timestamp) return false;
  if (ttl === 0) return false;
  return (Date.now() - entrada.timestamp) < ttl;
}

/**
 * Lê do cache: tenta memória primeiro, depois localStorage.
 * @param {string} chave
 * @param {number} ttl
 * @returns {*|null}
 */
function _lerCache(chave, ttl) {
  var mem = API._mem[chave];
  if (_cacheValido(mem, ttl)) {
    console.log('[api] 💾 mem: ' + chave);
    return mem.dados;
  }
  var local = lerLocal('cache_' + chave);
  if (_cacheValido(local, ttl)) {
    console.log('[api] 💾 disco: ' + chave);
    API._mem[chave] = local;
    return local.dados;
  }
  return null;
}

/**
 * Salva dados no cache (memória + localStorage).
 * @param {string} chave
 * @param {*}      dados
 */
function _salvarCache(chave, dados) {
  var entrada = { dados: dados, timestamp: Date.now() };
  API._mem[chave] = entrada;
  salvarLocal('cache_' + chave, entrada);
}

/**
 * Remove uma chave específica do cache (ambos os níveis).
 * @param {string} chave
 */
function invalidarCache(chave) {
  delete API._mem[chave];
  removerLocal('cache_' + chave);
  console.log('[api] 🗑️  invalidado: ' + chave);
}

/**
 * Remove TODO o cache do catálogo (memória + localStorage).
 * Use para forçar atualização completa dos dados.
 */
function limparTodoCache() {
  API._mem = {};
  try {
    Object.keys(localStorage)
      .filter(function(k) { return k.indexOf('bf_cache_') === 0; })
      .forEach(function(k) { localStorage.removeItem(k); });
  } catch (_) {}
  console.log('[api] 🗑️  todo o cache limpo.');
}


/* ================================================================
   3. FUNÇÕES BASE DE REDE
   ================================================================ */

/**
 * _get — GET com cache automático e timeout.
 *
 * @param {string} action      - Nome da action (?action=X).
 * @param {Object} [params={}] - Parâmetros adicionais da URL.
 * @param {number} [ttl]       - Tempo de cache em ms (0 = sem cache).
 * @returns {Promise<*>}       - Campo "data" da resposta do servidor.
 */
async function _get(action, params, ttl) {
  params = params || {};
  if (ttl === undefined) ttl = API.CACHE_TTL.lista;

  // Chave de cache: action + parâmetros serializados
  var chaveCache = action + '_' + JSON.stringify(params);

  // 1. Tenta cache
  if (ttl > 0) {
    var cached = _lerCache(chaveCache, ttl);
    if (cached !== null) return cached;
  }

  // 2. Valida URL
  if (!API.URL || API.URL === 'COLE_AQUI_A_URL_DO_APPS_SCRIPT') {
    throw new Error(
      'URL do Google Apps Script não configurada.\n' +
      'Abra js/api.js e cole a URL na constante API.URL.'
    );
  }

  // 3. Monta URL e faz a requisição
  var qs  = new URLSearchParams(Object.assign({ action: action }, params));
  var url = API.URL + '?' + qs.toString();

  console.log('[api] 🌐 GET ' + action, Object.keys(params).length ? params : '');

  var ctrl  = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, API.TIMEOUT);

  try {
    var resp = await fetch(url, { method: 'GET', signal: ctrl.signal });
    clearTimeout(timer);

    if (!resp.ok) {
      throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
    }

    var json = await resp.json();

    // Valida envelope padrão { success, action, data }
    if (json.success === false) {
      throw new Error(json.error || 'Erro desconhecido no servidor.');
    }
    if (json.success !== true) {
      throw new Error('Resposta do servidor em formato inesperado.');
    }

    var data = json.data;

    // 4. Salva no cache
    if (ttl > 0) _salvarCache(chaveCache, data);

    var resumo = Array.isArray(data) ? data.length + ' itens' : 'objeto';
    console.log('[api] ✅ ' + action + ' → ' + resumo);
    return data;

  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(
        'Sem resposta em ' + (API.TIMEOUT / 1000) + 's. ' +
        'Verifique sua conexão e tente novamente.'
      );
    }
    console.error('[api] ❌ ' + action + ':', err.message);
    throw err;
  }
}

/**
 * _post — POST para envio de pedidos.
 *
 * @param {Object} corpo - Dados do pedido em JSON.
 * @returns {Promise<*>}
 */
async function _post(corpo) {
  if (!API.URL || API.URL === 'COLE_AQUI_A_URL_DO_APPS_SCRIPT') {
    throw new Error('URL do Google Apps Script não configurada.');
  }

  console.log('[api] 📤 POST pedido…');

  var ctrl  = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, API.TIMEOUT);

  try {
    var resp = await fetch(API.URL, {
      method:  'POST',
      signal:  ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS
      body:    JSON.stringify(corpo),
    });
    clearTimeout(timer);

    var json = await resp.json();
    if (json.success === false) throw new Error(json.error || 'Falha ao registrar pedido.');

    console.log('[api] ✅ Pedido enviado:', json.data);
    return json.data;

  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Servidor não respondeu. Verifique sua conexão.');
    console.error('[api] ❌ POST:', err.message);
    throw err;
  }
}


/* ================================================================
   4. API PÚBLICA
   ================================================================ */

/* ── 4a. PÁGINAS E BLOCOS  (NOVO v3.0) ─────────────────────── */

/**
 * apiPagina
 *
 * Busca uma página completa com todos os blocos já resolvidos.
 * Este é o método principal usado pelo pageRenderer.js.
 *
 * O servidor retorna:
 * {
 *   pagina: { id, nome, slug, titulo, subtitulo, meta_title, ... },
 *   blocos: [
 *     { tipo: "banner",       titulo: "...", config: {...}, dados: [...], total: N },
 *     { tipo: "categorias",   titulo: "...", config: {...}, dados: [...], total: N },
 *     { tipo: "colecao",      titulo: "...", config: {...}, dados: [...], total: N },
 *     ...
 *   ]
 * }
 *
 * @param {string} slugOuId - Slug da página (ex: 'home') ou id numérico.
 * @returns {Promise<{ pagina: Object, blocos: Array }>}
 */
async function apiPagina(slugOuId) {
  if (!slugOuId) throw new Error('apiPagina: informe o slug ou id da página.');

  // Detecta se é id numérico ou slug
  var ehId   = /^\d+$/.test(String(slugOuId).trim());
  var params = ehId ? { id: slugOuId } : { slug: slugOuId };

  return _get('pagina', params, API.CACHE_TTL.pagina);
}

/**
 * apiPaginas
 *
 * Retorna a lista de todas as páginas ativas (sem os blocos).
 * Útil para menus de navegação ou sitemaps.
 *
 * @returns {Promise<Array<{ id, nome, slug, titulo, ordem }>>}
 */
async function apiPaginas() {
  return _get('paginas', {}, API.CACHE_TTL.paginas);
}

/**
 * apiBlocosRaw
 *
 * Retorna os blocos crus de uma página, sem os dados resolvidos.
 * Útil para depuração — mostra o que está cadastrado na planilha.
 *
 * @param {string} slugOuId
 * @returns {Promise<Array>}
 */
async function apiBlocosRaw(slugOuId) {
  if (!slugOuId) throw new Error('apiBlocosRaw: informe slug ou id.');
  var ehId   = /^\d+$/.test(String(slugOuId).trim());
  var params = ehId ? { pagina_id: slugOuId } : { slug: slugOuId };
  return _get('blocos', params, 0); // sem cache — debug sempre fresco
}


/* ── 4b. ESTRUTURA DO CATÁLOGO ──────────────────────────────── */

/** Lista de categorias ativas. */
async function apiCategorias() {
  return _get('categorias', {}, API.CACHE_TTL.categorias);
}

/**
 * Lista de subcategorias, com filtro opcional por categoria pai.
 * @param {string} [categoriaPai]
 */
async function apiSubcategorias(categoriaPai) {
  var params = categoriaPai ? { categoria: categoriaPai } : {};
  return _get('subcategorias', params, API.CACHE_TTL.subcategorias);
}

/** Lista de coleções comerciais ativas. */
async function apiColecoes() {
  return _get('colecoes', {}, API.CACHE_TTL.colecoes);
}

/** Banners ativos para exibição. */
async function apiBanners() {
  return _get('banners', {}, API.CACHE_TTL.banners);
}

/** Tabela de links inteligentes (rotas amigáveis). */
async function apiLinks() {
  return _get('links', {}, API.CACHE_TTL.links);
}

/** Configurações gerais do sistema (WhatsApp, textos, etc.). */
async function apiConfiguracoes() {
  return _get('configuracoes', {}, API.CACHE_TTL.configuracoes);
}


/* ── 4c. PRODUTO INDIVIDUAL ─────────────────────────────────── */

/**
 * Produto por código numérico.
 * @param {string} id - Ex: '12345'
 */
async function apiProdutoPorId(id) {
  if (!id) throw new Error('apiProdutoPorId: id obrigatório.');
  return _get('produto', { id: String(id) }, API.CACHE_TTL.produto);
}

/**
 * Produto por slug.
 * @param {string} slugProduto - Ex: 'brie-president-12345'
 */
async function apiProdutoPorSlug(slugProduto) {
  if (!slugProduto) throw new Error('apiProdutoPorSlug: slug obrigatório.');
  return _get('produto', { slug: String(slugProduto) }, API.CACHE_TTL.produto);
}

/**
 * Produto por id ou slug — detecta automaticamente.
 * Números puros → busca por id. Texto com letras → busca por slug.
 * @param {string} idOuSlug
 */
async function apiProduto(idOuSlug) {
  if (!idOuSlug) throw new Error('apiProduto: informe id ou slug.');
  return /^\d+$/.test(String(idOuSlug).trim())
    ? apiProdutoPorId(idOuSlug)
    : apiProdutoPorSlug(idOuSlug);
}

/**
 * Produtos relacionados a um produto ("Você também pode gostar").
 * @param {string} id - Código do produto principal.
 */
async function apiRelacionados(id) {
  if (!id) throw new Error('apiRelacionados: id obrigatório.');
  return _get('relacionados', { id: String(id) }, API.CACHE_TTL.relacionados);
}


/* ── 4d. LISTAS FILTRADAS DE PRODUTOS ──────────────────────── */

/**
 * Todos os produtos ativos de uma categoria.
 * @param {string} id - Ex: 'Queijos'
 */
async function apiProdutosPorCategoria(id) {
  if (!id) throw new Error('apiProdutosPorCategoria: id obrigatório.');
  return _get('categoria', { id: String(id) }, API.CACHE_TTL.lista);
}

/**
 * Todos os produtos ativos de uma subcategoria.
 * @param {string} id - Ex: 'Pates'
 */
async function apiProdutosPorSubcategoria(id) {
  if (!id) throw new Error('apiProdutosPorSubcategoria: id obrigatório.');
  return _get('subcategoria', { id: String(id) }, API.CACHE_TTL.lista);
}

/**
 * Todos os produtos ativos de uma coleção.
 * @param {string} id - Slug da coleção. Ex: 'montar-tabua'
 */
async function apiProdutosPorColecao(id) {
  if (!id) throw new Error('apiProdutosPorColecao: id obrigatório.');
  return _get('colecao', { id: String(id) }, API.CACHE_TTL.lista);
}

/**
 * Busca textual de produtos (ignora acentos e maiúsculas).
 * @param {string} q - Termo. Ex: 'pate', 'gorgo', 'provo'
 */
async function apiBuscar(q) {
  var termo = String(q || '').trim();
  if (termo.length < 2) throw new Error('Digite ao menos 2 caracteres para buscar.');
  return _get('buscar', { q: termo }, API.CACHE_TTL.busca);
}


/* ── 4e. LISTAS POR FLAG ───────────────────────────────────── */

/** Produtos com flag Promoção = true. */
async function apiPromocoes() {
  return _get('promocoes', {}, API.CACHE_TTL.promocoes);
}

/** Produtos com flag MaisVendido = true. */
async function apiMaisVendidos() {
  return _get('mais_vendidos', {}, API.CACHE_TTL.flags);
}

/** Produtos com flag Destaque = true. */
async function apiDestaques() {
  return _get('destaques', {}, API.CACHE_TTL.flags);
}


/* ── 4f. PEDIDO ─────────────────────────────────────────────── */

/**
 * Envia um pedido ao Apps Script para gravar na planilha.
 *
 * @param {{
 *   nomeCliente:     string,
 *   telefoneCliente: string,
 *   observacoes?:    string,
 *   itens:           Array<{ codigo, produto, preco, quantidade }>,
 *   total:           number
 * }} pedido
 * @returns {Promise<{ numeroPedido: number, mensagem: string }>}
 */
async function apiEnviarPedido(pedido) {
  return _post(Object.assign({}, pedido, {
    dataHora: dataAtual(),
    origem:   'catalogo-web',
  }));
}


/* ================================================================
   5. UTILITÁRIOS
   ================================================================ */

/**
 * testarConexao
 *
 * Testa a conexão com o Apps Script buscando as categorias sem cache.
 * Usado na tela de diagnóstico do app.js.
 *
 * @returns {Promise<{ sucesso, duracao, totalCategorias?, categorias?, erro? }>}
 */
async function testarConexao() {
  console.log('[api] 🔌 Testando conexão…');
  var t0 = Date.now();
  try {
    var categorias = await _get('categorias', {}, 0); // TTL 0 = sem cache
    var dur = Date.now() - t0;
    console.log('[api] ✅ OK em ' + dur + 'ms');
    return {
      sucesso:         true,
      duracao:         dur + 'ms',
      totalCategorias: Array.isArray(categorias) ? categorias.length : 0,
      categorias:      categorias,
    };
  } catch (err) {
    console.error('[api] ❌ Falha:', err.message);
    return { sucesso: false, duracao: (Date.now() - t0) + 'ms', erro: err.message };
  }
}

/**
 * preCarregarDados
 *
 * Carrega em paralelo os dados essenciais usados em quase todas as telas.
 * Chamado durante a inicialização para deixar o cache quente.
 * Promise.allSettled garante que um erro parcial não trava o app.
 *
 * @returns {Promise<void>}
 */
async function preCarregarDados() {
  console.log('[api] ⏳ Pré-carregando…');
  var t0 = Date.now();
  await Promise.allSettled([
    apiCategorias(),
    apiColecoes(),
    apiBanners(),
    apiLinks(),
    apiConfiguracoes(),
    apiPaginas(),
  ]);
  console.log('[api] ✅ Pré-carregamento: ' + (Date.now() - t0) + 'ms');
}

/* ================================================================
   REGISTRO
   ================================================================ */
console.log('[api] ✅ v3.0 carregado. URL: ' +
  (API.URL === 'COLE_AQUI_A_URL_DO_APPS_SCRIPT' ? '⚠️  PENDENTE' : '✔'));
