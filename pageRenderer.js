/**
 * ================================================================
 * BUENOS FRIOS — pageRenderer.js  v1.0
 * Motor de renderização de páginas por blocos.
 * ================================================================
 *
 * DEPENDÊNCIAS (carregadas antes no index.html):
 *   utils.js → api.js → pageRenderer.js
 *
 * ─────────────────────────────────────────────────────────────
 * CONCEITO CENTRAL
 * ─────────────────────────────────────────────────────────────
 * Uma "página" no Buenos Frios é apenas uma lista ordenada de
 * "blocos" cadastrados na planilha (aba Pagina_Blocos).
 *
 * Exemplo — página HOME:
 *   ordem 1  →  tipo: banner         →  renderBanner()
 *   ordem 2  →  tipo: categorias     →  renderCategorias()
 *   ordem 3  →  tipo: colecao        →  renderColecao()
 *   ordem 4  →  tipo: mais_vendidos  →  renderMaisVendidos()
 *   ordem 5  →  tipo: promocoes      →  renderPromocoes()
 *
 * Para criar /festival-mortadela basta cadastrar novos blocos
 * na planilha para essa página — sem tocar em código.
 *
 * ─────────────────────────────────────────────────────────────
 * FLUXO DE RENDERIZAÇÃO
 * ─────────────────────────────────────────────────────────────
 *   1. renderizarPagina('home', containerEl)
 *        ↓
 *   2. Busca apiPagina('home')
 *        ↓  retorna { pagina: {...}, blocos: [{tipo, config, dados}...] }
 *        ↓
 *   3. Atualiza <title> e meta tags da página
 *        ↓
 *   4. Para cada bloco (já ordenado pelo servidor):
 *        renderizarBloco(bloco, container)
 *        ↓
 *   5. renderizarBloco() chama o handler correto pelo tipo:
 *        "banner"       → renderBanner(bloco, container)
 *        "categorias"   → renderCategorias(bloco, container)
 *        "colecao"      → renderColecao(bloco, container)
 *        ... etc
 *        ↓
 *   6. Cada handler retorna HTML string, que é injetado no container.
 *   7. Lazy loading é ativado no container ao final.
 *
 * ─────────────────────────────────────────────────────────────
 * COMO ADICIONAR UM NOVO TIPO DE BLOCO
 * ─────────────────────────────────────────────────────────────
 *   1. Cadastre o tipo na aba Pagina_Blocos da planilha.
 *   2. Adicione um case no switch de renderizarBloco() abaixo.
 *   3. Crie a função render<Tipo>(bloco, container).
 *   4. Adicione o CSS no style.css (ou no próprio renderer).
 *   Pronto — a nova página estará funcionando.
 *
 * ─────────────────────────────────────────────────────────────
 * ÍNDICE DESTE ARQUIVO
 * ─────────────────────────────────────────────────────────────
 *  1. Configuração e estado
 *  2. renderizarPagina()       — ponto de entrada principal
 *  3. renderizarBloco()        — despachante por tipo
 *  4. renderBanner()           — bloco de banner / carrossel
 *  5. renderCategorias()       — grade de categorias
 *  6. renderSubcategorias()    — grade de subcategorias
 *  7. renderColecao()          — lista de produtos de uma coleção
 *  8. renderProdutos()         — grade genérica de produtos
 *  9. renderPromocoes()        — grade de promoções
 * 10. renderMaisVendidos()     — grade de mais vendidos
 * 11. renderDestaques()        — grade de destaques
 * 12. renderProdutoIndividual()— produto único em destaque
 * 13. renderTexto()            — bloco de texto livre (HTML)
 * 14. renderVideo()            — embed de vídeo
 * 15. renderEspacador()        — espaço vazio configurável
 * 16. renderHtmlPersonalizado()— HTML bruto da planilha
 * 17. renderRodape()           — rodapé da página
 * 18. renderErroBl()           — bloco de erro (não derruba a página)
 * 19. Helpers internos         — _cardProduto, _secaoTitulo, etc.
 * ================================================================
 */


/* ================================================================
   1. CONFIGURAÇÃO E ESTADO
   ================================================================ */

var PageRenderer = {

  /**
   * Tipos de bloco suportados.
   * Espelho de TIPOS_BLOCO no Code.gs.
   * Se um novo tipo for adicionado no servidor, coloque aqui também.
   */
  TIPOS: {
    BANNER:             'banner',
    CATEGORIAS:         'categorias',
    SUBCATEGORIAS:      'subcategorias',
    COLECAO:            'colecao',
    PRODUTOS:           'produtos',
    PRODUTO_INDIVIDUAL: 'produto_individual',
    TEXTO:              'texto',
    VIDEO:              'video',
    CARROSSEL:          'carrossel',
    PROMOCOES:          'promocoes',
    MAIS_VENDIDOS:      'mais_vendidos',
    DESTAQUES:          'destaques',
    RODAPE:             'rodape',
    CABECALHO:          'cabecalho',
    ESPACADOR:          'espacador',
    HTML_PERSONALIZADO: 'html_personalizado',
  },

  /**
   * Configurações padrão de cada tipo de bloco.
   * São sobrescritas pelo config_json cadastrado na planilha.
   *
   * Por exemplo: se a planilha tiver {"limite": 4} no config_json
   * de um bloco de mais_vendidos, esse valor substitui o padrão de 8.
   */
  DEFAULTS: {
    banner:             { autoplay: false, intervalo: 4000, exibirSetas: true },
    categorias:         { colunas: 2, exibirTitulo: true },
    subcategorias:      { colunas: 2, exibirTitulo: true },
    colecao:            { limite: 8, colunas: 2, exibirTitulo: true, exibirBotaoVerMais: true },
    produtos:           { limite: 12, colunas: 2, exibirTitulo: true },
    produto_individual: { exibirDescricao: true, exibirBotao: true },
    texto:              { alinhamento: 'left', corFundo: '' },
    video:              { autoplay: false, muted: true, controls: true },
    carrossel:          { autoplay: true, intervalo: 4000, exibirPontos: true },
    promocoes:          { limite: 8, colunas: 2, exibirTitulo: true },
    mais_vendidos:      { limite: 8, colunas: 2, exibirTitulo: true },
    destaques:          { limite: 8, colunas: 2, exibirTitulo: true },
    espacador:          { altura: 32 },
    html_personalizado: {},
    rodape:             {},
    cabecalho:          {},
  },

  /** Página atualmente renderizada. */
  _paginaAtual: null,
};

/**
 * Mescla as configurações padrão de um tipo com as configurações
 * específicas do bloco cadastradas na planilha (config_json).
 *
 * O config_json da planilha sempre vence o padrão.
 *
 * @param {string} tipo   - Tipo do bloco.
 * @param {Object} config - config_json parseado do bloco.
 * @returns {Object} Configurações mescladas.
 */
function _mergeConfig(tipo, config) {
  var defaults = PageRenderer.DEFAULTS[tipo] || {};
  return Object.assign({}, defaults, config || {});
}


/* ================================================================
   2. renderizarPagina — PONTO DE ENTRADA PRINCIPAL
   ================================================================ */

/**
 * Busca uma página completa e renderiza todos os seus blocos
 * dentro do elemento `container`.
 *
 * Uso:
 *   await renderizarPagina('home', document.getElementById('appContent'));
 *   await renderizarPagina('festival-mortadela', containerEl);
 *
 * @param {string}      slugOuId  - Slug ou id da página.
 * @param {HTMLElement} container - Elemento onde a página será renderizada.
 * @returns {Promise<void>}
 */
async function renderizarPagina(slugOuId, container) {
  if (!container) {
    console.error('[pageRenderer] container não encontrado.');
    return;
  }

  // Mostra skeleton enquanto carrega
  container.innerHTML = _skeletonPagina();
  container.classList.remove('hidden');

  try {
    // Busca página + blocos resolvidos em uma única chamada
    var resultado = await apiPagina(slugOuId);

    var pagina = resultado.pagina;
    var blocos = resultado.blocos || [];

    // Armazena referência da página atual (usada por outros módulos)
    PageRenderer._paginaAtual = pagina;

    // Atualiza o <title> e meta tags
    _atualizarMetaTags(pagina);

    // Limpa o skeleton
    container.innerHTML = '';

    if (blocos.length === 0) {
      container.innerHTML = _mensagemSemBlocos(pagina);
      return;
    }

    // Renderiza cada bloco em sequência, na ordem retornada pelo servidor
    for (var i = 0; i < blocos.length; i++) {
      var bloco     = blocos[i];
      var blocoEl   = document.createElement('section');
      blocoEl.className    = 'bloco bloco--' + (bloco.tipo || 'desconhecido');
      blocoEl.dataset.tipo = bloco.tipo || '';
      blocoEl.dataset.ordem = String(bloco.ordem || i + 1);

      renderizarBloco(bloco, blocoEl);
      container.appendChild(blocoEl);
    }

    // Ativa lazy loading em todas as imagens da página de uma vez
    ativarLazyLoading(container);

    // Emite evento para outros módulos saberem que a página foi renderizada
    emitir('paginaRenderizada', { slug: slugOuId, pagina: pagina, totalBlocos: blocos.length });

    console.log('[pageRenderer] ✅ Página "' + slugOuId + '" — ' + blocos.length + ' blocos.');

  } catch (err) {
    container.innerHTML = _erroPagina(slugOuId, err.message);
    console.error('[pageRenderer] ❌ Erro ao renderizar "' + slugOuId + '":', err.message);
  }
}


/* ================================================================
   3. renderizarBloco — DESPACHANTE POR TIPO
   ================================================================ */

/**
 * Recebe um bloco e o delega para o handler correto pelo tipo.
 * Este é o único switch do sistema — toda a lógica de qual
 * função chamar fica aqui.
 *
 * Se um bloco tem erro (campo `bloco.erro`), exibe mensagem
 * de erro sem derrubar o restante da página.
 *
 * @param {Object}      bloco     - Bloco com { tipo, titulo, config, dados, erro }.
 * @param {HTMLElement} container - Elemento onde o bloco será injetado.
 */
function renderizarBloco(bloco, container) {
  // Bloco com erro retornado pelo servidor
  if (bloco.erro) {
    container.innerHTML = _erroBlocoParcial(bloco);
    return;
  }

  var tipo = (bloco.tipo || '').toLowerCase();

  switch (tipo) {
    case PageRenderer.TIPOS.BANNER:
    case PageRenderer.TIPOS.CARROSSEL:
      renderBanner(bloco, container);
      break;

    case PageRenderer.TIPOS.CATEGORIAS:
      renderCategorias(bloco, container);
      break;

    case PageRenderer.TIPOS.SUBCATEGORIAS:
      renderSubcategorias(bloco, container);
      break;

    case PageRenderer.TIPOS.COLECAO:
      renderColecao(bloco, container);
      break;

    case PageRenderer.TIPOS.PRODUTOS:
      renderProdutos(bloco, container);
      break;

    case PageRenderer.TIPOS.PRODUTO_INDIVIDUAL:
      renderProdutoIndividual(bloco, container);
      break;

    case PageRenderer.TIPOS.PROMOCOES:
      renderPromocoes(bloco, container);
      break;

    case PageRenderer.TIPOS.MAIS_VENDIDOS:
      renderMaisVendidos(bloco, container);
      break;

    case PageRenderer.TIPOS.DESTAQUES:
      renderDestaques(bloco, container);
      break;

    case PageRenderer.TIPOS.TEXTO:
      renderTexto(bloco, container);
      break;

    case PageRenderer.TIPOS.VIDEO:
      renderVideo(bloco, container);
      break;

    case PageRenderer.TIPOS.ESPACADOR:
      renderEspacador(bloco, container);
      break;

    case PageRenderer.TIPOS.HTML_PERSONALIZADO:
      renderHtmlPersonalizado(bloco, container);
      break;

    case PageRenderer.TIPOS.RODAPE:
      renderRodape(bloco, container);
      break;

    case PageRenderer.TIPOS.CABECALHO:
      // Cabeçalho é fixo — o HTML já está no index.html.
      // Este bloco é ignorado na renderização dinâmica.
      break;

    default:
      // Tipo desconhecido — registra no console mas não quebra a página
      console.warn('[pageRenderer] Tipo de bloco desconhecido: "' + tipo + '"');
      container.innerHTML = _erroBlocoParcial(bloco);
  }
}


/* ================================================================
   4. renderBanner
   ================================================================
   Renderiza um bloco de banner ou carrossel.

   config_json suportado:
   {
     "autoplay": true,       — se o carrossel avança automaticamente
     "intervalo": 4000,      — intervalo em ms (somente se autoplay true)
     "exibirSetas": true,    — exibir setas de navegação
     "altura": "300px"       — altura máxima do banner
   }

   Estrutura esperada de cada item em bloco.dados:
   { Imagem/imagem: "URL", Titulo/titulo: "...", Link/link: "...",
     Alt/alt: "...", Ativo: true }
   ================================================================ */

function renderBanner(bloco, container) {
  var cfg    = _mergeConfig('banner', bloco.config);
  var itens  = (bloco.dados || []);
  var isCarrossel = bloco.tipo === PageRenderer.TIPOS.CARROSSEL || itens.length > 1;

  if (!itens.length) {
    container.innerHTML = '';
    return;
  }

  var idCarrossel = 'carrossel-' + Date.now();

  var html = [
    '<div class="banner-wrapper">',
    bloco.titulo ? _secaoTitulo(bloco.titulo, bloco.subtitulo) : '',

    '<div class="banner-carrossel" id="' + idCarrossel + '"',
    '     data-autoplay="' + (cfg.autoplay ? 'true' : 'false') + '"',
    '     data-intervalo="' + (cfg.intervalo || 4000) + '">',

    '<div class="banner-carrossel__faixa">',
    itens.map(function(item, idx) {
      var img   = item['Imagem']  || item['imagem']  || '';
      var titulo = item['Titulo'] || item['titulo']  || '';
      var link  = item['Link']    || item['link']    || '#';
      var alt   = item['Alt']     || item['alt']     || titulo || 'Banner Buenos Frios';

      return [
        '<div class="banner-carrossel__slide' + (idx === 0 ? ' ativo' : '') + '"',
        '     data-indice="' + idx + '">',
        '  <a href="' + link + '" class="banner-carrossel__link">',
        '    <img',
        '      data-src="' + img + '"',
        '      src="' + imagemPlaceholder(1200, 400) + '"',
        '      alt="' + alt + '"',
        '      class="banner-carrossel__img"',
        '      onerror="imgFallback(this)"',
        '    />',
        titulo
          ? '<div class="banner-carrossel__legenda"><span>' + titulo + '</span></div>'
          : '',
        '  </a>',
        '</div>',
      ].join('\n');
    }).join('\n'),
    '</div>', // .banner-carrossel__faixa

    isCarrossel && cfg.exibirSetas ? [
      '<button class="banner-carrossel__seta banner-carrossel__seta--prev"',
      '        onclick="_carrosselAnterior(\'' + idCarrossel + '\')"',
      '        aria-label="Banner anterior">&#8249;</button>',
      '<button class="banner-carrossel__seta banner-carrossel__seta--next"',
      '        onclick="_carrosselProximo(\'' + idCarrossel + '\')"',
      '        aria-label="Próximo banner">&#8250;</button>',
    ].join('\n') : '',

    isCarrossel && itens.length > 1 ? [
      '<div class="banner-carrossel__pontos">',
      itens.map(function(_, idx) {
        return '<button class="banner-carrossel__ponto' + (idx === 0 ? ' ativo' : '') + '"' +
               '        onclick="_carrosselIrPara(\'' + idCarrossel + '\',' + idx + ')"' +
               '        aria-label="Slide ' + (idx + 1) + '"></button>';
      }).join('\n'),
      '</div>',
    ].join('\n') : '',

    '</div>', // .banner-carrossel
    '</div>', // .banner-wrapper
  ].join('\n');

  container.innerHTML = html;

  // Inicia autoplay se configurado
  if (cfg.autoplay && itens.length > 1) {
    _iniciarAutoplay(idCarrossel, cfg.intervalo || 4000);
  }
}

/* Navegação do carrossel — funções globais (chamadas por onclick) */
window._carrosselProximo = function(id) { _moverCarrossel(id, 1);  };
window._carrosselAnterior = function(id) { _moverCarrossel(id, -1); };
window._carrosselIrPara = function(id, indice) {
  var el = porId(id);
  if (!el) return;
  var slides = qsAll('.banner-carrossel__slide', el);
  var pontos = qsAll('.banner-carrossel__ponto', el);
  slides.forEach(function(s, i) { s.classList.toggle('ativo', i === indice); });
  pontos.forEach(function(p, i) { p.classList.toggle('ativo', i === indice); });
};

function _moverCarrossel(id, direcao) {
  var el = porId(id);
  if (!el) return;
  var slides = qsAll('.banner-carrossel__slide', el);
  var atual  = slides.findIndex(function(s) { return s.classList.contains('ativo'); });
  var proximo = (atual + direcao + slides.length) % slides.length;
  window._carrosselIrPara(id, proximo);
}

function _iniciarAutoplay(id, intervalo) {
  setInterval(function() { _moverCarrossel(id, 1); }, intervalo);
}


/* ================================================================
   5. renderCategorias
   ================================================================
   Exibe as categorias como cards clicáveis.

   config_json suportado:
   { "colunas": 2, "exibirTitulo": true }

   Estrutura esperada de cada item em bloco.dados:
   { Nome/nome: "Queijos", Icone/icone: "🧀", Imagem/imagem: "URL",
     Slug/slug: "queijos", Descricao: "..." }
   ================================================================ */

function renderCategorias(bloco, container) {
  var cfg   = _mergeConfig('categorias', bloco.config);
  var itens = bloco.dados || [];

  if (!itens.length) { container.innerHTML = ''; return; }

  var html = [
    '<div class="bloco-categorias">',
    bloco.titulo ? _secaoTitulo(bloco.titulo, bloco.subtitulo) : '',
    '<div class="categorias-grade colunas-' + (cfg.colunas || 2) + '">',
    itens.map(function(cat) {
      var nome  = cat['Nome']    || cat['nome']    || cat['Categoria'] || '';
      var icone = cat['Icone']   || cat['icone']   || '';
      var img   = cat['Imagem']  || cat['imagem']  || '';
      var desc  = cat['Descricao'] || cat['descricao'] || '';
      var slugCat = cat['Slug']  || cat['slug']    || slug(nome);

      return [
        '<a class="categoria-card" href="/?action=categoria&id=' + encodeURIComponent(nome) + '"',
        '   onclick="navegarPara(\'/?action=categoria&id=' + encodeURIComponent(nome) + '\'); return false;"',
        '   aria-label="Ver ' + nome + '">',
        img
          ? '<img data-src="' + img + '" src="' + imagemPlaceholder(200,200) + '"' +
            '     alt="' + nome + '" class="categoria-card__img" onerror="imgFallback(this)">'
          : (icone ? '<span class="categoria-card__icone" aria-hidden="true">' + icone + '</span>' : ''),
        '<div class="categoria-card__corpo">',
        '  <span class="categoria-card__nome">' + nome + '</span>',
        desc ? '  <span class="categoria-card__desc">' + truncar(desc, 60) + '</span>' : '',
        '</div>',
        '</a>',
      ].join('\n');
    }).join('\n'),
    '</div>',  // .categorias-grade
    '</div>',  // .bloco-categorias
  ].join('\n');

  container.innerHTML = html;
}


/* ================================================================
   6. renderSubcategorias
   ================================================================
   Similar às categorias, mas para subcategorias.
   config_json: { "colunas": 2, "exibirTitulo": true }
   ================================================================ */

function renderSubcategorias(bloco, container) {
  var cfg   = _mergeConfig('subcategorias', bloco.config);
  var itens = bloco.dados || [];

  if (!itens.length) { container.innerHTML = ''; return; }

  var html = [
    '<div class="bloco-subcategorias">',
    bloco.titulo ? _secaoTitulo(bloco.titulo, bloco.subtitulo) : '',
    '<div class="categorias-grade colunas-' + (cfg.colunas || 2) + '">',
    itens.map(function(sub) {
      var nome = sub['Nome'] || sub['nome'] || sub['Subcategoria'] || '';
      var cat  = sub['Categoria'] || sub['categoria'] || '';
      return [
        '<a class="categoria-card categoria-card--sub"',
        '   href="/?action=subcategoria&id=' + encodeURIComponent(nome) + '"',
        '   onclick="navegarPara(\'/?action=subcategoria&id=' + encodeURIComponent(nome) + '\'); return false;">',
        '<span class="categoria-card__nome">' + nome + '</span>',
        cat ? '<span class="categoria-card__pai">' + cat + '</span>' : '',
        '</a>',
      ].join('\n');
    }).join('\n'),
    '</div>',
    '</div>',
  ].join('\n');

  container.innerHTML = html;
}


/* ================================================================
   7. renderColecao
   ================================================================
   Exibe os produtos de uma coleção comercial.

   config_json suportado:
   {
     "limite": 8,
     "colunas": 2,
     "exibirTitulo": true,
     "exibirBotaoVerMais": true
   }
   ================================================================ */

function renderColecao(bloco, container) {
  var cfg     = _mergeConfig('colecao', bloco.config);
  var produtos = bloco.dados || [];

  if (!produtos.length) { container.innerHTML = ''; return; }

  var ref       = bloco.referencia || '';
  var linkVerMais = '/?action=colecao&id=' + encodeURIComponent(ref);

  container.innerHTML = _secaoGradeProdutos(
    bloco.titulo   || '',
    bloco.subtitulo || '',
    produtos,
    cfg,
    linkVerMais
  );
}


/* ================================================================
   8. renderProdutos
   ================================================================
   Grade genérica de produtos.
   Usada quando o bloco é do tipo "produtos" (categoria ou todos).
   config_json: { "limite": 12, "colunas": 2 }
   ================================================================ */

function renderProdutos(bloco, container) {
  var cfg      = _mergeConfig('produtos', bloco.config);
  var produtos = bloco.dados || [];

  if (!produtos.length) { container.innerHTML = ''; return; }

  container.innerHTML = _secaoGradeProdutos(
    bloco.titulo    || '',
    bloco.subtitulo || '',
    produtos,
    cfg,
    null  // sem botão "ver mais" por padrão
  );
}


/* ================================================================
   9. renderPromocoes
   ================================================================
   Grade de produtos em promoção.
   config_json: { "limite": 8, "colunas": 2, "exibirTitulo": true }
   ================================================================ */

function renderPromocoes(bloco, container) {
  var cfg      = _mergeConfig('promocoes', bloco.config);
  var produtos = bloco.dados || [];

  if (!produtos.length) { container.innerHTML = ''; return; }

  container.innerHTML = _secaoGradeProdutos(
    bloco.titulo    || 'Promoções',
    bloco.subtitulo || '',
    produtos,
    cfg,
    '/?action=promocoes'
  );
}


/* ================================================================
   10. renderMaisVendidos
   ================================================================
   Grade de produtos mais vendidos.
   config_json: { "limite": 8, "colunas": 2 }
   ================================================================ */

function renderMaisVendidos(bloco, container) {
  var cfg      = _mergeConfig('mais_vendidos', bloco.config);
  var produtos = bloco.dados || [];

  if (!produtos.length) { container.innerHTML = ''; return; }

  container.innerHTML = _secaoGradeProdutos(
    bloco.titulo    || 'Mais Vendidos',
    bloco.subtitulo || '',
    produtos,
    cfg,
    '/?action=mais_vendidos'
  );
}


/* ================================================================
   11. renderDestaques
   ================================================================
   Grade de produtos em destaque.
   config_json: { "limite": 8, "colunas": 2 }
   ================================================================ */

function renderDestaques(bloco, container) {
  var cfg      = _mergeConfig('destaques', bloco.config);
  var produtos = bloco.dados || [];

  if (!produtos.length) { container.innerHTML = ''; return; }

  container.innerHTML = _secaoGradeProdutos(
    bloco.titulo    || 'Destaques',
    bloco.subtitulo || '',
    produtos,
    cfg,
    '/?action=destaques'
  );
}


/* ================================================================
   12. renderProdutoIndividual
   ================================================================
   Exibe um único produto em destaque dentro de uma página.
   Útil para destacar um lançamento ou produto especial.

   config_json:
   { "exibirDescricao": true, "exibirBotao": true }
   ================================================================ */

function renderProdutoIndividual(bloco, container) {
  var cfg      = _mergeConfig('produto_individual', bloco.config);
  var produtos = bloco.dados || [];

  if (!produtos.length) { container.innerHTML = ''; return; }

  var p = produtos[0]; // sempre o primeiro da lista

  var html = [
    '<div class="bloco-produto-individual">',
    bloco.titulo ? _secaoTitulo(bloco.titulo, bloco.subtitulo) : '',
    '<div class="produto-destaque">',
    '  <div class="produto-destaque__imagem">',
    '    <img data-src="' + (p.imagem || '') + '"',
    '         src="' + imagemPlaceholder(400, 400) + '"',
    '         alt="' + p.produto + '"',
    '         class="produto-destaque__foto"',
    '         onerror="imgFallback(this)">',
    '  </div>',
    '  <div class="produto-destaque__corpo">',
    '    <h3 class="produto-destaque__nome">' + p.produto + '</h3>',
    p.promocao && p.precoPromo
      ? '<div class="produto-destaque__preco">' +
        '  <span class="preco-promo">' + formatarMoeda(p.precoPromo) + '</span>' +
        '  <span class="preco-original">' + formatarMoeda(p.preco) + '</span>' +
        '</div>'
      : '<div class="produto-destaque__preco">' +
        '  <span class="preco">' + formatarMoeda(p.preco) + '</span>' +
        '</div>',
    cfg.exibirDescricao && p.descricao
      ? '<p class="produto-destaque__desc">' + truncar(p.descricao, 200) + '</p>'
      : '',
    cfg.exibirBotao
      ? '<button class="btn btn--primary btn--lg"' +
        '        onclick="navegarPara(\'/?action=produto&id=' + p.codigo + '\')">'+
        'Ver detalhes</button>'
      : '',
    '  </div>',
    '</div>',
    '</div>',
  ].join('\n');

  container.innerHTML = html;
}


/* ================================================================
   13. renderTexto
   ================================================================
   Bloco de texto livre — conteúdo vem do config_json.

   config_json:
   {
     "html":       "<p>Texto com <strong>formatação</strong>...</p>",
     "alinhamento": "center",   — left | center | right
     "corFundo":   "#F5E8EA",
     "corTexto":   "#1A1A1A",
     "padding":    "32px"
   }
   ================================================================ */

function renderTexto(bloco, container) {
  var cfg  = _mergeConfig('texto', bloco.config);
  var html = cfg.html || cfg.conteudo || cfg.texto || '';

  if (!html && !bloco.titulo) { container.innerHTML = ''; return; }

  var estilo = [
    cfg.corFundo ? 'background-color:' + cfg.corFundo + ';' : '',
    cfg.corTexto ? 'color:'            + cfg.corTexto + ';' : '',
    cfg.padding  ? 'padding:'          + cfg.padding  + ';' : '',
  ].filter(Boolean).join('');

  container.innerHTML = [
    '<div class="bloco-texto" style="text-align:' + (cfg.alinhamento || 'left') + ';' + estilo + '">',
    bloco.titulo ? '<h2 class="bloco-texto__titulo">' + bloco.titulo + '</h2>' : '',
    bloco.subtitulo ? '<p class="bloco-texto__subtitulo">' + bloco.subtitulo + '</p>' : '',
    html ? '<div class="bloco-texto__corpo">' + html + '</div>' : '',
    '</div>',
  ].join('\n');
}


/* ================================================================
   14. renderVideo
   ================================================================
   Embed de vídeo (YouTube, Vimeo ou URL direta).

   config_json:
   {
     "url":      "https://www.youtube.com/watch?v=XXXXX",
     "altura":   "315px",
     "autoplay": false,
     "muted":    true,
     "controls": true
   }
   ================================================================ */

function renderVideo(bloco, container) {
  var cfg = _mergeConfig('video', bloco.config);
  var url = cfg.url || '';

  if (!url) { container.innerHTML = ''; return; }

  // Converte URL do YouTube para embed
  var embedUrl = url
    .replace('watch?v=', 'embed/')
    .replace('youtu.be/', 'www.youtube.com/embed/');

  if (cfg.autoplay) embedUrl += (embedUrl.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1';
  if (cfg.muted)    embedUrl += '&mute=1';

  container.innerHTML = [
    '<div class="bloco-video">',
    bloco.titulo ? _secaoTitulo(bloco.titulo, bloco.subtitulo) : '',
    '<div class="video-wrapper">',
    '  <iframe',
    '    src="' + embedUrl + '"',
    '    width="100%"',
    '    height="' + (cfg.altura || '315px') + '"',
    '    frameborder="0"',
    '    allowfullscreen',
    '    loading="lazy"',
    '    title="' + (bloco.titulo || 'Vídeo Buenos Frios') + '"',
    '  ></iframe>',
    '</div>',
    '</div>',
  ].join('\n');
}


/* ================================================================
   15. renderEspacador
   ================================================================
   Bloco de espaço vazio para separar seções.
   config_json: { "altura": 32 }  ← em pixels
   ================================================================ */

function renderEspacador(bloco, container) {
  var cfg    = _mergeConfig('espacador', bloco.config);
  var altura = parseInt(cfg.altura || 32);
  container.innerHTML = '<div class="bloco-espacador" style="height:' + altura + 'px;" aria-hidden="true"></div>';
}


/* ================================================================
   16. renderHtmlPersonalizado
   ================================================================
   Injeta HTML bruto cadastrado no config_json.
   Cuidado: use apenas HTML confiável (cadastrado pela própria equipe).
   config_json: { "html": "<div>...</div>" }
   ================================================================ */

function renderHtmlPersonalizado(bloco, container) {
  var cfg = _mergeConfig('html_personalizado', bloco.config);
  var html = cfg.html || cfg.conteudo || '';
  if (!html) { container.innerHTML = ''; return; }
  container.innerHTML = '<div class="bloco-html-personalizado">' + html + '</div>';
}


/* ================================================================
   17. renderRodape
   ================================================================
   Rodapé da página (versão simplificada para o sistema de blocos).
   O rodapé principal fica no index.html — este é um rodapé de página.
   config_json: { "texto": "© 2024 Buenos Frios", "links": [...] }
   ================================================================ */

function renderRodape(bloco, container) {
  var cfg   = _mergeConfig('rodape', bloco.config);
  var texto = cfg.texto || bloco.titulo || '';

  container.innerHTML = [
    '<div class="bloco-rodape">',
    texto ? '<p class="bloco-rodape__texto">' + texto + '</p>' : '',
    '</div>',
  ].join('\n');
}


/* ================================================================
   18. _erroBlocoParcial — bloco com erro (não quebra a página)
   ================================================================ */

/**
 * Exibe um aviso discreto quando um bloco falha.
 * Em produção pode ser ocultado via CSS (.bloco-erro { display: none }).
 *
 * @param {Object} bloco
 * @returns {string} HTML do aviso de erro.
 */
function _erroBlocoParcial(bloco) {
  // Em produção, este bloco pode ser ocultado via CSS
  return [
    '<div class="bloco-erro" role="alert">',
    '  <span aria-hidden="true">⚠️</span>',
    '  <span>Bloco "' + (bloco.tipo || '?') + '" indisponível.',
    bloco.titulo ? ' (' + bloco.titulo + ')' : '',
    '</span>',
    '</div>',
  ].join('');
}


/* ================================================================
   19. HELPERS INTERNOS
   ================================================================ */

/**
 * _secaoTitulo
 * Gera o HTML do título e subtítulo de uma seção.
 *
 * @param {string} titulo
 * @param {string} [subtitulo]
 * @returns {string}
 */
function _secaoTitulo(titulo, subtitulo) {
  return [
    '<div class="secao-cabecalho">',
    titulo    ? '<h2 class="secao-cabecalho__titulo">' + titulo + '</h2>'          : '',
    subtitulo ? '<p  class="secao-cabecalho__subtitulo">' + subtitulo + '</p>'     : '',
    '</div>',
  ].join('\n');
}

/**
 * _cardProduto
 * Gera o HTML de um card de produto para uso nas grades.
 *
 * @param {Object} p - Produto com { codigo, produto, preco, imagem, slug, ... }
 * @returns {string}
 */
function _cardProduto(p) {
  var urlProduto = '/?action=produto&id=' + encodeURIComponent(p.codigo);
  var desconto   = p.promocao && p.precoPromo ? calcularDesconto(p.preco, p.precoPromo) : 0;

  return [
    '<article class="produto-card">',
    '  <a class="produto-card__link" href="' + urlProduto + '"',
    '     onclick="navegarPara(\'' + urlProduto + '\'); return false;"',
    '     aria-label="Ver ' + p.produto + '">',

    // ── Imagem ──
    '    <div class="produto-card__imagem-wrapper">',
    '      <img',
    '        data-src="' + (p.imagem || '') + '"',
    '        src="'      + imagemPlaceholder(300, 300) + '"',
    '        alt="'      + p.produto + '"',
    '        class="produto-card__imagem"',
    '        onerror="imgFallback(this)"',
    '      />',
    // Selos
    p.promocao    ? '<span class="badge-promo"  aria-label="Promoção">Promo</span>'          : '',
    p.maisVendido ? '<span class="badge-destaque" aria-label="Mais vendido">⭐ Top</span>'  : '',
    desconto > 0  ? '<span class="badge-desconto">-' + desconto + '%</span>'                 : '',
    '    </div>',

    // ── Corpo ──
    '    <div class="produto-card__corpo">',
    '      <h3 class="produto-card__nome">' + p.produto + '</h3>',

    // Preço
    p.promocao && p.precoPromo
      ? '<div class="produto-card__preco">' +
        '  <span class="preco-promo">'     + formatarMoeda(p.precoPromo) + '</span>' +
        '  <span class="preco-original">'  + formatarMoeda(p.preco)      + '</span>' +
        '</div>'
      : '<div class="produto-card__preco">' +
        '  <span class="preco">'           + formatarMoeda(p.preco)      + '</span>' +
        '</div>',

    '    </div>',
    '  </a>',

    // ── Botão Adicionar ──
    '  <button class="produto-card__btn-add btn btn--primary btn--sm"',
    '          onclick="event.stopPropagation(); _adicionarAoCarrinho(\'' + p.codigo + '\')"',
    '          aria-label="Adicionar ' + p.produto + ' ao pedido">',
    '    + Adicionar',
    '  </button>',

    '</article>',
  ].join('\n');
}

/**
 * _secaoGradeProdutos
 * Gera o HTML completo de uma seção com grade de produtos.
 * Reutilizado por renderColecao, renderMaisVendidos, renderPromocoes etc.
 *
 * @param {string}  titulo
 * @param {string}  subtitulo
 * @param {Array}   produtos
 * @param {Object}  cfg           - Config mesclada do bloco.
 * @param {string|null} linkVerMais - URL do "Ver todos" (null = ocultar).
 * @returns {string} HTML completo da seção.
 */
function _secaoGradeProdutos(titulo, subtitulo, produtos, cfg, linkVerMais) {
  var colunas = cfg.colunas || 2;

  return [
    '<div class="bloco-produtos">',

    (titulo || subtitulo) ? _secaoTitulo(titulo, subtitulo) : '',

    '<div class="produtos-grade colunas-' + colunas + '">',
    produtos.map(_cardProduto).join('\n'),
    '</div>',

    (linkVerMais && cfg.exibirBotaoVerMais !== false)
      ? '<div class="bloco-produtos__rodape">' +
        '  <a class="btn btn--outline"' +
        '     href="' + linkVerMais + '"' +
        '     onclick="navegarPara(\'' + linkVerMais + '\'); return false;">' +
        '    Ver todos' +
        '  </a>' +
        '</div>'
      : '',

    '</div>',
  ].join('\n');
}

/**
 * _atualizarMetaTags
 * Atualiza o <title> e as meta tags de SEO/compartilhamento
 * com os dados da página atual.
 *
 * @param {Object} pagina - Página normalizada retornada pelo servidor.
 */
function _atualizarMetaTags(pagina) {
  if (!pagina) return;

  // Título da aba
  var titulo = pagina.meta_title || pagina.titulo || pagina.nome || 'Buenos Frios';
  document.title = titulo + ' — Buenos Frios';

  // Meta description
  var desc = pagina.meta_description || pagina.descricao || '';
  var metaDesc = qs('meta[name="description"]');
  if (metaDesc && desc) metaDesc.setAttribute('content', desc);

  // Open Graph (para WhatsApp e redes sociais)
  _setMeta('og:title',       titulo);
  _setMeta('og:description', desc);
  if (pagina.imagem_compartilhamento) {
    _setMeta('og:image', pagina.imagem_compartilhamento);
  }
}

function _setMeta(property, content) {
  if (!content) return;
  var el = qs('meta[property="' + property + '"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * _skeletonPagina
 * HTML do "esqueleto" de carregamento mostrado enquanto a página
 * está sendo buscada do servidor.
 *
 * @returns {string}
 */
function _skeletonPagina() {
  return [
    '<div class="skeleton-pagina" aria-busy="true" aria-label="Carregando...">',
    // Banner skeleton
    '<div class="skeleton skeleton-banner"></div>',
    // Grade de categorias skeleton
    '<div class="skeleton-secao">',
    '  <div class="skeleton skeleton-titulo"></div>',
    '  <div class="skeleton-grade">',
    [1,2,3,4].map(function() {
      return '<div class="skeleton skeleton-card"></div>';
    }).join(''),
    '  </div>',
    '</div>',
    // Grade de produtos skeleton
    '<div class="skeleton-secao">',
    '  <div class="skeleton skeleton-titulo"></div>',
    '  <div class="skeleton-grade">',
    [1,2,3,4].map(function() {
      return '<div class="skeleton skeleton-card-produto"></div>';
    }).join(''),
    '  </div>',
    '</div>',
    '</div>',
  ].join('\n');
}

/**
 * _erroPagina
 * HTML exibido quando a página inteira falha ao carregar.
 *
 * @param {string} slug
 * @param {string} mensagem
 * @returns {string}
 */
function _erroPagina(slug, mensagem) {
  return [
    '<div class="container">',
    '  <div class="error-screen__inner">',
    '    <span class="error-screen__icon" aria-hidden="true">⚠️</span>',
    '    <h2 class="error-screen__title">Não foi possível carregar esta página</h2>',
    '    <p class="error-screen__desc">' + (mensagem || 'Tente novamente em instantes.') + '</p>',
    '    <button class="btn btn--primary" onclick="renderizarPagina(\'' + slug + '\', porId(\'appContent\'))">',
    '      Tentar novamente',
    '    </button>',
    '  </div>',
    '</div>',
  ].join('\n');
}

/**
 * _mensagemSemBlocos
 * Exibida quando uma página não tem blocos cadastrados.
 *
 * @param {Object} pagina
 * @returns {string}
 */
function _mensagemSemBlocos(pagina) {
  return [
    '<div class="container">',
    '  <div class="error-screen__inner">',
    '    <span aria-hidden="true" style="font-size:3rem">📋</span>',
    '    <h2 class="error-screen__title">' + (pagina.titulo || pagina.nome || 'Página') + '</h2>',
    '    <p class="error-screen__desc">',
    '      Esta página ainda não tem conteúdo cadastrado.<br>',
    '      Adicione blocos na aba <strong>Pagina_Blocos</strong> da planilha.',
    '    </p>',
    '  </div>',
    '</div>',
  ].join('\n');
}

/**
 * _adicionarAoCarrinho (stub)
 * Placeholder até o módulo carrinho.js ser implementado na Fase 6.
 *
 * @param {string} codigoProduto
 */
window._adicionarAoCarrinho = function(codigoProduto) {
  console.log('[pageRenderer] Adicionar ao carrinho: ' + codigoProduto + ' — Fase 6.');
  // Na Fase 6, este será substituído por: Carrinho.adicionar(codigoProduto);
};


/* ================================================================
   REGISTRO
   ================================================================ */
console.log('[pageRenderer] ✅ v1.0 carregado. Tipos suportados: ' +
  Object.values(PageRenderer.TIPOS).join(', '));
