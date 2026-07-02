/**
 * ================================================================
 * BUENOS FRIOS — app.js  v3.0
 * Inicialização, roteador e tela de diagnóstico da API.
 * ================================================================
 *
 * DEPENDÊNCIAS (carregadas antes no index.html):
 *   utils.js → api.js → pageRenderer.js → app.js
 *
 * O QUE ESTE ARQUIVO FAZ:
 *  1. Inicializa controles de interface (busca, carrinho, botão voltar).
 *  2. Lê a URL e decide o que renderizar (roteador).
 *  3. Delega a renderização de páginas ao pageRenderer.js.
 *  4. Exibe a tela de diagnóstico durante o desenvolvimento.
 *
 * ROTEAMENTO:
 *   /                           → página "home"
 *   /?pagina=home               → página "home"
 *   /?pagina=festival-mortadela → página "festival-mortadela"
 *   /?action=produto&id=12345   → página do produto (Fase futura)
 *   /?action=categoria&id=Queijos → lista da categoria (Fase futura)
 *   /?action=buscar&q=pate      → resultados de busca (Fase futura)
 * ================================================================
 */


/* ================================================================
   PONTO DE ENTRADA
   ================================================================ */

document.addEventListener('DOMContentLoaded', async function () {
  console.log('[app] 🚀 Buenos Frios v3.0');

  _inicializarControles();
  await _rotear();
});

/** Listener para o botão Voltar/Avançar do navegador. */
window.addEventListener('popstate', async function () {
  console.log('[app] popstate → re-roteando…');
  await _rotear();
});

/** Listener para navegação interna (disparado por navegarPara() em utils.js). */
window.addEventListener('rotaMudou', async function () {
  await _rotear();
});


/* ================================================================
   ROTEADOR PRINCIPAL
   ================================================================ */

/**
 * _rotear
 *
 * Lê os parâmetros da URL atual e decide o que exibir.
 * É chamado na inicialização e toda vez que a URL muda.
 *
 * Hierarquia de decisão:
 *   1. ?pagina=slug  → renderiza a página pelo sistema de blocos
 *   2. ?action=...   → ações específicas (produto, categoria, busca…)
 *   3. /             → renderiza a página "home" por padrão
 */
async function _rotear() {
  var params = lerParams();
  var action = (params.action || '').toLowerCase().trim();
  var paginaSlug = (params.pagina || '').toLowerCase().trim();

  console.log('[app] Rota:', { action, pagina: paginaSlug });

  // ── 1. Home — storytelling fixo (Hero + Ocasiões) + blocos dinâmicos ──
  //       Tanto "/" quanto "/?pagina=home" caem aqui.
  if (!action && (!paginaSlug || paginaSlug === 'home')) {
    return _renderizarHomeCompleta();
  }

  // ── 2. Outras páginas cadastradas via sistema de blocos ──
  if (paginaSlug) {
    return _renderizarPaginaBlocos(paginaSlug);
  }

  // ── 3. Actions específicas (serão implementadas nas fases seguintes) ──
  if (action) {
    switch (action) {
      case 'produto':
        return _renderizarPlaceholder('Página do Produto', 'Fase 6', action, params);
      case 'categoria':
        return _renderizarPlaceholder('Lista por Categoria', 'Fase 5', action, params);
      case 'subcategoria':
        return _renderizarPlaceholder('Lista por Subcategoria', 'Fase 5', action, params);
      case 'colecao':
        return _renderizarPlaceholder('Lista da Coleção', 'Fase 5', action, params);
      case 'buscar':
        return _renderizarPlaceholder('Resultados de Busca', 'Fase 5', action, params);
      case 'promocoes':
        return _renderizarPlaceholder('Promoções', 'Fase 5', action, params);
      case 'mais_vendidos':
        return _renderizarPlaceholder('Mais Vendidos', 'Fase 5', action, params);
      case 'destaques':
        return _renderizarPlaceholder('Destaques', 'Fase 5', action, params);
      case 'categorias':
        return _executarDiagnostico(); // lista completa de categorias — Fase 5
      case 'diagnostico':
        return _executarDiagnostico(); // painel de testes da API
      default:
        return _executarDiagnostico(); // action desconhecida → diagnóstico
    }
  }
}

/**
 * _renderizarHomeCompleta
 *
 * Renderiza a Home definitiva: Hero + "Como posso ajudar?" (estáticos,
 * sempre presentes) seguidos pelos blocos dinâmicos cadastrados na
 * planilha (categorias, coleções, mais vendidos, promoções...).
 *
 * Se a API não estiver configurada, a Home estática ainda aparece —
 * apenas a parte dinâmica de produtos fica ausente — e o diagnóstico
 * pode ser acessado manualmente via ?action=diagnostico.
 */
async function _renderizarHomeCompleta() {
  ocultar('loadingScreen');
  ocultar('errorScreen');

  var container = porId('appContent');
  if (!container) return;

  try {
    await renderizarHome(container);
    mostrar('appContent');
    document.title = 'Buenos Frios — Fazendo parte dos seus melhores momentos';
  } catch (err) {
    console.error('[app] Erro ao renderizar a Home:', err.message);
    // Fallback final — diagnóstico, só em caso de erro grave de DOM/JS
    await _executarDiagnostico();
  }
}

/**
 * _renderizarPaginaBlocos
 *
 * Tenta renderizar uma página pelo sistema de blocos.
 * Se a página não existir ou a API não estiver configurada,
 * exibe o diagnóstico de desenvolvimento.
 *
 * @param {string} slugPagina
 */
async function _renderizarPaginaBlocos(slugPagina) {
  // Se a URL não está configurada, vai direto para o diagnóstico
  if (!API.URL || API.URL === 'COLE_AQUI_A_URL_DO_APPS_SCRIPT') {
    return _executarDiagnostico();
  }

  ocultar('loadingScreen');
  ocultar('errorScreen');

  var container = porId('appContent');
  if (!container) return;

  try {
    await renderizarPagina(slugPagina, container);
    mostrar('appContent');
  } catch (err) {
    // Página não existe na planilha → fallback para o diagnóstico
    console.warn('[app] Página "' + slugPagina + '" não encontrada → diagnóstico.', err.message);
    await _executarDiagnostico();
  }
}

/**
 * _renderizarPlaceholder
 *
 * Exibe uma tela temporária para rotas que ainda não foram implementadas.
 * Será substituído conforme as Fases avançam.
 *
 * @param {string} nome    - Nome da tela.
 * @param {string} fase    - Fase do projeto em que será implementada.
 * @param {string} action  - Nome da action.
 * @param {Object} params  - Parâmetros da URL.
 */
function _renderizarPlaceholder(nome, fase, action, params) {
  ocultar('loadingScreen');
  ocultar('errorScreen');

  var extra = Object.keys(params)
    .filter(function(k) { return k !== 'action'; })
    .map(function(k) { return k + '=' + params[k]; })
    .join(', ');

  renderizar('appContent', [
    '<div class="container" style="text-align:center; padding-top: 3rem;">',
    '  <span style="font-size:3rem" aria-hidden="true">🚧</span>',
    '  <h2 style="font-family:var(--fonte-titulo); margin:.75rem 0 .5rem">' + nome + '</h2>',
    '  <p style="color:var(--cor-cinza-medio); font-size:.875rem">',
    '    Será implementado na <strong>' + fase + '</strong>.<br>',
    extra ? '<code style="font-size:.75rem">action=' + action + (extra ? ', ' + extra : '') + '</code>' : '',
    '  </p>',
    '  <button class="btn btn--outline" style="margin-top:1.5rem"',
    '          onclick="navegarPara(\'/\')">← Voltar ao início</button>',
    '</div>',
  ].join('\n'));

  mostrar('appContent');
}


/* ================================================================
   DIAGNÓSTICO
   ================================================================
   Tela de desenvolvimento que testa todas as actions da API.
   Exibida quando:
   — A URL do Apps Script não está configurada.
   — A página "home" não existe na planilha ainda.
   — Nenhuma rota correspondeu à URL.
   ================================================================ */

async function _executarDiagnostico() {
  mostrar('loadingScreen');
  ocultar('errorScreen');
  ocultar('appContent');

  var conexao = await testarConexao();

  if (!conexao.sucesso) {
    _exibirErroDiagnostico(conexao.erro);
    return;
  }

  _renderizarDiagnostico(conexao);
}

function _exibirErroDiagnostico(msg) {
  ocultar('loadingScreen');
  var el = porId('errorDesc');
  if (el) el.textContent = _traduzirErro(msg);
  mostrar('errorScreen');
}

function _traduzirErro(msg) {
  if (!msg) return 'Erro desconhecido.';
  if (msg.indexOf('não configurada') > -1)
    return 'A URL do Apps Script ainda não foi configurada em js/api.js (API.URL).';
  if (msg.indexOf('não respondeu') > -1 || msg.indexOf('AbortError') > -1)
    return 'O servidor demorou para responder. Verifique sua internet.';
  if (msg.indexOf('Failed to fetch') > -1)
    return 'Sem conexão com o servidor. Verifique sua internet.';
  return msg;
}

function _renderizarDiagnostico(conexao) {
  ocultar('loadingScreen');

  // Actions disponíveis para teste
  var actions = [
    // Páginas e blocos (v3.0)
    { label: 'pagina&slug=home',           fn: function() { return apiPagina('home'); },             grupo: 'Páginas' },
    { label: 'paginas',                    fn: function() { return apiPaginas(); },                   grupo: 'Páginas' },
    { label: 'blocos&slug=home',           fn: function() { return apiBlocosRaw('home'); },           grupo: 'Páginas' },
    // Estrutura
    { label: 'categorias',                 fn: function() { return apiCategorias(); },                grupo: 'Estrutura' },
    { label: 'subcategorias',              fn: function() { return apiSubcategorias(); },             grupo: 'Estrutura' },
    { label: 'colecoes',                   fn: function() { return apiColecoes(); },                  grupo: 'Estrutura' },
    { label: 'banners',                    fn: function() { return apiBanners(); },                   grupo: 'Estrutura' },
    { label: 'links',                      fn: function() { return apiLinks(); },                     grupo: 'Estrutura' },
    { label: 'configuracoes',              fn: function() { return apiConfiguracoes(); },             grupo: 'Estrutura' },
    // Produtos
    { label: 'promocoes',                  fn: function() { return apiPromocoes(); },                 grupo: 'Produtos' },
    { label: 'mais_vendidos',              fn: function() { return apiMaisVendidos(); },              grupo: 'Produtos' },
    { label: 'destaques',                  fn: function() { return apiDestaques(); },                 grupo: 'Produtos' },
    { label: 'buscar&q=queijo',            fn: function() { return apiBuscar('queijo'); },            grupo: 'Produtos' },
    { label: 'buscar&q=pate',              fn: function() { return apiBuscar('pate'); },              grupo: 'Produtos' },
  ];

  window._diagActions = actions;

  // Agrupa as actions por grupo
  var grupos = {};
  actions.forEach(function(a, i) {
    a._idx = i;
    if (!grupos[a.grupo]) grupos[a.grupo] = [];
    grupos[a.grupo].push(a);
  });

  var tiposBlocoLista = Object.values(PageRenderer.TIPOS).join(', ');

  var html = [
    '<div class="container">',

    // ── Cabeçalho ──
    '<div class="diag-header">',
    '  <div class="diag-header__badge">✅</div>',
    '  <div>',
    '    <h1 class="diag-header__titulo">API v3.0 conectada</h1>',
    '    <p class="diag-header__sub">Motor de páginas por blocos ativo.</p>',
    '  </div>',
    '</div>',

    // ── Métricas ──
    '<div class="diag-metricas">',
    _metrica(conexao.duracao,         'Resposta'),
    _metrica(conexao.totalCategorias, 'Categorias'),
    _metrica(Object.values(PageRenderer.TIPOS).length, 'Tipos de bloco'),
    _metrica(Object.keys(API.CACHE_TTL).length,        'Níveis de cache'),
    '</div>',

    '<hr class="divider">',

    // ── Tipos de bloco ──
    '<section class="diag-secao">',
    '  <h2 class="diag-secao__titulo">Tipos de bloco suportados</h2>',
    '  <div class="diag-chips">',
    Object.values(PageRenderer.TIPOS).map(function(t) {
      return '<span class="diag-chip">' + t + '</span>';
    }).join(''),
    '  </div>',
    '  <p class="texto-info" style="margin-top:.75rem">',
    '    Cada tipo corresponde a um handler em <code>pageRenderer.js</code>.',
    '    Para adicionar um novo tipo, cadastre na planilha e crie o handler.',
    '  </p>',
    '</section>',

    '<hr class="divider">',

    // ── Tester de actions agrupado ──
    '<section class="diag-secao">',
    '  <h2 class="diag-secao__titulo">Testar actions da API</h2>',
    Object.keys(grupos).map(function(grupo) {
      return [
        '<p class="diag-grupo-label">' + grupo + '</p>',
        '<div class="diag-actions">',
        grupos[grupo].map(function(a) {
          return [
            '<div class="diag-action" id="action-' + a._idx + '">',
            '  <div class="diag-action__header">',
            '    <button class="diag-action__btn" onclick="_testarAction(' + a._idx + ')">',
            '      <span class="diag-action__icone" id="icone-' + a._idx + '">▶</span>',
            '      <code class="diag-action__nome">?action=' + a.label + '</code>',
            '    </button>',
            '  </div>',
            '  <div class="diag-action__resultado hidden" id="resultado-' + a._idx + '">',
            '    <pre class="diag-action__pre" id="pre-' + a._idx + '"></pre>',
            '  </div>',
            '</div>',
          ].join('\n');
        }).join('\n'),
        '</div>',
      ].join('\n');
    }).join('\n'),
    '</section>',

    '<hr class="divider">',

    // ── Configuração da planilha ──
    '<section class="diag-secao">',
    '  <h2 class="diag-secao__titulo">Abas necessárias na planilha</h2>',
    '  <div class="diag-chips">',
    Object.values(API.SHEETS).map(function(aba) {
      return '<span class="diag-chip diag-chip--aba">' + aba + '</span>';
    }).join(''),
    '  </div>',
    '</section>',

    '<hr class="divider">',

    // ── Fases ──
    '<section class="diag-secao">',
    '  <h2 class="diag-secao__titulo">Progresso do projeto</h2>',
    '  <ul class="diag-fases">',
    _faseItem(true,  '1–3', 'Estrutura, API e motor de blocos ← você está aqui'),
    _faseItem(false, '4',   'Home com blocos visuais reais'),
    _faseItem(false, '5',   'Navegação, rotas e links inteligentes'),
    _faseItem(false, '6',   'Catálogo, filtros e busca'),
    _faseItem(false, '7',   'Página do produto'),
    _faseItem(false, '8',   'Carrinho flutuante'),
    _faseItem(false, '9',   'Checkout e envio de pedido'),
    _faseItem(false, '10',  'Integração com impressão automática'),
    '  </ul>',
    '</section>',

    // ── Ações ──
    '<div class="diag-acoes">',
    '  <button class="btn btn--outline" onclick="_testarTodasActions()">▶▶ Testar todas</button>',
    '  <button class="btn btn--ghost"   onclick="limparTodoCache(); alert(\'Cache limpo!\')">🗑️ Cache</button>',
    '  <button class="btn btn--ghost"   onclick="navegarPara(\'/\')">🏠 Voltar à Home</button>',
    '</div>',

    '</div>',
  ].join('\n');

  renderizar('appContent', html);
  mostrar('appContent');
  _injetarEstilosDiag();
}

function _metrica(valor, label) {
  return [
    '<div class="diag-metrica">',
    '  <span class="diag-metrica__valor">' + valor + '</span>',
    '  <span class="diag-metrica__label">' + label + '</span>',
    '</div>',
  ].join('');
}

function _faseItem(ok, num, desc) {
  return '<li class="diag-fase' + (ok ? ' diag-fase--ok' : '') + '">' +
    '<span>' + (ok ? '✅' : '⏳') + '</span>' +
    '<span><strong>Fase ' + num + '</strong> — ' + desc + '</span></li>';
}

/** Testa uma action e exibe o resultado inline. */
window._testarAction = async function(idx) {
  var a        = (window._diagActions || [])[idx];
  var iconeEl  = porId('icone-' + idx);
  var resultEl = porId('resultado-' + idx);
  var preEl    = porId('pre-' + idx);
  if (!a || !iconeEl || !resultEl || !preEl) return;

  iconeEl.textContent = '⏳';
  mostrar(resultEl);
  preEl.textContent = 'Carregando…';

  var t0 = Date.now();
  try {
    var data    = await a.fn();
    var duracao = Date.now() - t0;

    iconeEl.textContent = '✅';

    var resumo;
    if (data && data.pagina) {
      // Resposta de ?action=pagina
      resumo = 'Página: "' + data.pagina.slug + '" | ' + (data.blocos || []).length + ' blocos em ' + duracao + 'ms\n\n';
      (data.blocos || []).forEach(function(b, i) {
        resumo += (i+1) + '. [' + b.tipo + '] "' + b.titulo + '" → ' + b.total + ' itens';
        if (b.erro) resumo += ' ⚠️ ' + b.erro;
        resumo += '\n';
      });
    } else if (Array.isArray(data)) {
      resumo = data.length + ' registros em ' + duracao + 'ms\n\n';
      if (data.length) resumo += JSON.stringify(data[0], null, 2);
      if (data.length > 1) resumo += '\n\n… mais ' + (data.length - 1) + ' registro(s)';
    } else {
      resumo = 'Objeto em ' + duracao + 'ms:\n\n' + JSON.stringify(data, null, 2);
    }

    preEl.textContent  = resumo;
    preEl.style.color  = '';

  } catch (err) {
    iconeEl.textContent = '❌';
    preEl.textContent   = 'ERRO em ' + (Date.now() - t0) + 'ms:\n' + err.message;
    preEl.style.color   = '#C62828';
  }
};

/** Testa todas as actions em sequência. */
window._testarTodasActions = async function() {
  var lista = window._diagActions || [];
  for (var i = 0; i < lista.length; i++) {
    await window._testarAction(i);
    await esperar(250);
  }
};


/* ================================================================
   CONTROLES DE INTERFACE
   ================================================================ */

function _inicializarControles() {
  // ── Botão "Tentar novamente" na tela de erro ──
  var btnTentar = porId('btnTentarNovamente');
  if (btnTentar) {
    btnTentar.addEventListener('click', async function() {
      ocultar('errorScreen');
      await _rotear();
    });
  }

  // ── Campo de busca ──
  var campoBusca = porId('campoBusca');
  if (campoBusca) {
    var buscarDebounced = debounce(function(e) {
      var termo = e.target.value.trim();
      if (termo.length >= 2) {
        navegarPara('/?action=buscar&q=' + encodeURIComponent(termo));
      }
    }, 400);
    campoBusca.addEventListener('input', buscarDebounced);
    campoBusca.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var t = campoBusca.value.trim();
        if (t.length >= 2) navegarPara('/?action=buscar&q=' + encodeURIComponent(t));
      }
    });
  }

  // ── Botão do carrinho no header ──
  var btnCart = porId('btnCarrinhoTopo');
  if (btnCart) {
    btnCart.addEventListener('click', function() {
      console.log('[app] Carrinho — Fase 8.');
    });
  }

  // ── Botão Finalizar no rodapé do carrinho ──
  var btnFinalizar = porId('btnFinalizarPedido');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', function() {
      console.log('[app] Checkout — Fase 9.');
    });
  }

  // ── Listener para atualizar o badge do carrinho ──
  ouvirEvento('carrinhoAtualizado', function(dados) {
    _atualizarBadgeCarrinho(dados ? dados.totalItens : 0);
  });

  console.log('[app] ✅ Controles inicializados.');
}

function _atualizarBadgeCarrinho(qtd) {
  var badge = porId('cartBadgeTopo');
  var countEl = porId('cartItemCount');
  var totalEl = porId('cartTotal');

  if (badge) {
    badge.textContent = qtd;
    badge.classList.toggle('visivel', qtd > 0);
  }
  if (countEl) countEl.textContent = qtd;
  if (qtd > 0) {
    var barEl = porId('cartBar');
    if (barEl) barEl.classList.add('visivel');
  } else {
    var barEl2 = porId('cartBar');
    if (barEl2) barEl2.classList.remove('visivel');
  }
}


/* ================================================================
   ESTILOS DO DIAGNÓSTICO
   ================================================================ */

function _injetarEstilosDiag() {
  if (porId('estilos-diag')) return;
  var css = [
    '.diag-header{display:flex;align-items:flex-start;gap:1rem;margin-bottom:1.5rem}',
    '.diag-header__badge{font-size:2.5rem;line-height:1;flex-shrink:0}',
    '.diag-header__titulo{font-family:var(--fonte-titulo);font-size:var(--tamanho-xl);margin-bottom:.25rem}',
    '.diag-header__sub{font-size:var(--tamanho-sm);color:var(--cor-cinza-medio)}',
    '.diag-metricas{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem}',
    '.diag-metrica{flex:1;min-width:90px;background:var(--cor-branco);border:1px solid var(--cor-bege-escuro);border-radius:var(--raio-lg);padding:.875rem;text-align:center}',
    '.diag-metrica__valor{display:block;font-family:var(--fonte-titulo);font-size:var(--tamanho-xl);font-weight:700;color:var(--cor-vinho)}',
    '.diag-metrica__label{display:block;font-size:var(--tamanho-xs);color:var(--cor-cinza-medio);margin-top:.2rem;text-transform:uppercase;letter-spacing:.06em}',
    '.diag-secao{margin-bottom:1.5rem}',
    '.diag-secao__titulo{font-family:var(--fonte-titulo);font-size:var(--tamanho-lg);margin-bottom:.75rem}',
    '.diag-grupo-label{font-size:var(--tamanho-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--cor-cinza-medio);margin:.875rem 0 .375rem;font-weight:600}',
    '.diag-actions{display:flex;flex-direction:column;gap:.375rem;margin-bottom:.5rem}',
    '.diag-action{background:var(--cor-branco);border:1px solid var(--cor-bege-escuro);border-radius:var(--raio-md);overflow:hidden}',
    '.diag-action__header{display:flex;align-items:center;justify-content:space-between;padding:.5rem .875rem}',
    '.diag-action__btn{display:flex;align-items:center;gap:.5rem;background:none;border:none;cursor:pointer;text-align:left}',
    '.diag-action__btn:hover .diag-action__nome{color:var(--cor-vinho)}',
    '.diag-action__icone{font-size:.85rem;width:1.1rem;text-align:center;flex-shrink:0}',
    '.diag-action__nome{font-family:monospace;font-size:.75rem;color:var(--cor-cinza-escuro)}',
    '.diag-action__resultado{border-top:1px solid var(--cor-bege-escuro);padding:.75rem .875rem;background:var(--cor-bege)}',
    '.diag-action__pre{font-family:monospace;font-size:.7rem;white-space:pre-wrap;word-break:break-all;color:var(--cor-cinza-escuro);max-height:180px;overflow-y:auto;margin:0}',
    '.diag-chips{display:flex;flex-wrap:wrap;gap:.375rem}',
    '.diag-chip{display:inline-block;background:var(--cor-branco);border:1px solid var(--cor-bege-escuro);border-radius:var(--raio-pill);padding:.2rem .625rem;font-size:var(--tamanho-xs);color:var(--cor-cinza-escuro);font-family:monospace}',
    '.diag-chip--aba{background:var(--cor-vinho-suave);border-color:var(--cor-vinho-claro);color:var(--cor-vinho)}',
    '.diag-fases{display:flex;flex-direction:column;gap:.375rem}',
    '.diag-fase{display:flex;align-items:center;gap:.625rem;font-size:var(--tamanho-sm);color:var(--cor-cinza-medio);padding:.25rem 0}',
    '.diag-fase--ok{color:var(--cor-preto)}',
    '.diag-acoes{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem;padding-bottom:2rem}',
    // Skeleton
    '.skeleton-pagina{padding:0}',
    '.skeleton-banner{height:180px;margin-bottom:1.5rem;border-radius:0}',
    '.skeleton-secao{padding:0 1rem;margin-bottom:1.5rem}',
    '.skeleton-titulo{height:24px;width:40%;margin-bottom:.75rem}',
    '.skeleton-grade{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}',
    '.skeleton-card{height:100px;border-radius:var(--raio-md)}',
    '.skeleton-card-produto{height:200px;border-radius:var(--raio-md)}',
    // Blocos
    '.bloco{margin-bottom:0}',
    '.bloco-erro{padding:.5rem 1rem;background:#FFF3F3;border-left:3px solid #C62828;font-size:var(--tamanho-xs);color:#C62828;display:flex;align-items:center;gap:.5rem}',
  ].join('\n');

  var tag = document.createElement('style');
  tag.id  = 'estilos-diag';
  tag.textContent = css;
  document.head.appendChild(tag);
}

/* ================================================================
   REGISTRO
   ================================================================ */
console.log('[app] ✅ v3.0 carregado.');
