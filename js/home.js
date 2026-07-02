/**
 * ================================================================
 * BUENOS FRIOS — home.js  v1.0
 * Renderização da Home e componentes visuais reutilizáveis.
 * ================================================================
 *
 * DEPENDÊNCIAS: utils.js → api.js → pageRenderer.js → home.js
 *
 * RESPONSABILIDADES DESTE ARQUIVO:
 *  1. renderizarHome() — orquestra a montagem da Home completa.
 *  2. Cada seção da home tem sua própria função de renderização.
 *  3. Helpers de componentes (eyebrow, cabeçalho de seção, etc.)
 *     são exportados para reutilização em outras telas.
 *
 * ESTRUTURA DA HOME:
 *  ┌──────────────────────────────────────┐
 *  │  Hero (storytelling + CTA)           │
 *  ├──────────────────────────────────────┤
 *  │  "Como posso ajudar hoje?"          │
 *  │  Cards de ocasião                    │
 *  ├──────────────────────────────────────┤
 *  │  Seções dinâmicas via blocos        │
 *  │  (ordem definida na planilha)       │
 *  │  Ex: Categorias, Coleções,          │
 *  │  Mais Vendidos, Promoções...        │
 *  ├──────────────────────────────────────┤
 *  │  Serviços Buenos Frios              │
 *  ├──────────────────────────────────────┤
 *  │  Rodapé                             │
 *  └──────────────────────────────────────┘
 *
 * ÍNDICE:
 *  1. renderizarHome            — ponto de entrada
 *  2. _htmlHero                 — primeira dobra
 *  3. _htmlSecaoAjuda           — "Como posso ajudar?"
 *  4. _htmlSecaoServicos        — serviços do empório
 *  5. _htmlRodape               — rodapé
 *  6. Helpers de seção          — cabeçalho, eyebrow, divisor
 * ================================================================
 */


/* ================================================================
   1. PONTO DE ENTRADA — renderizarHome
   ================================================================ */

/**
 * Renderiza a Home completa dentro do container.
 *
 * Fluxo:
 *  1. Monta o Hero e seção de ocasiões (estáticos — sempre presentes).
 *  2. Tenta buscar a página "home" na planilha (seções dinâmicas).
 *  3. Adiciona os serviços e o rodapé.
 *
 * @param {HTMLElement} container - O elemento #appContent.
 */
async function renderizarHome(container) {
  if (!container) return;

  // ── 1. Renderiza o Hero imediatamente (sem esperar a API) ──
  container.innerHTML = '';
  container.classList.remove('hidden');

  var fragment = document.createDocumentFragment();

  // Hero
  var heroEl = document.createElement('div');
  heroEl.innerHTML = _htmlHero();
  fragment.appendChild(heroEl.firstElementChild);

  // Seção "Como posso ajudar?"
  var ajudaEl = document.createElement('div');
  ajudaEl.innerHTML = _htmlSecaoAjuda();
  fragment.appendChild(ajudaEl.firstElementChild);

  // Placeholder para os blocos dinâmicos (será substituído)
  var blocosEl = document.createElement('div');
  blocosEl.id = 'home-blocos-dinamicos';
  blocosEl.innerHTML = _skeletonBlocosHome();
  fragment.appendChild(blocosEl);

  // Serviços
  var servicosEl = document.createElement('div');
  servicosEl.innerHTML = _htmlSecaoServicos();
  fragment.appendChild(servicosEl.firstElementChild);

  // Rodapé
  var rodapeEl = document.createElement('div');
  rodapeEl.innerHTML = _htmlRodape();
  fragment.appendChild(rodapeEl.firstElementChild);

  container.appendChild(fragment);

  // Ativa lazy loading nas partes já renderizadas
  ativarLazyLoading(container);

  // ── 2. Busca os blocos dinâmicos da planilha ──
  _carregarBlocosDinamicos();
}

/**
 * Carrega e renderiza os blocos dinâmicos da página "home"
 * dentro do placeholder #home-blocos-dinamicos.
 */
async function _carregarBlocosDinamicos() {
  var placeholder = porId('home-blocos-dinamicos');
  if (!placeholder) return;

  // Se API não estiver configurada, remove o placeholder silenciosamente
  if (!API.URL || API.URL === 'COLE_AQUI_A_URL_DO_APPS_SCRIPT') {
    placeholder.innerHTML = '';
    return;
  }

  try {
    var resultado = await apiPagina('home');
    var blocos    = (resultado && resultado.blocos) ? resultado.blocos : [];

    if (!blocos.length) {
      placeholder.innerHTML = '';
      return;
    }

    // Limpa o skeleton e renderiza cada bloco
    placeholder.innerHTML = '';

    blocos.forEach(function(bloco) {
      var blocoEl        = document.createElement('section');
      blocoEl.className  = 'bloco bloco--' + (bloco.tipo || 'desconhecido');
      blocoEl.dataset.tipo  = bloco.tipo || '';
      blocoEl.dataset.ordem = String(bloco.ordem || '');

      renderizarBloco(bloco, blocoEl);
      placeholder.appendChild(blocoEl);
    });

    // Ativa lazy loading nos novos elementos
    ativarLazyLoading(placeholder);

    console.log('[home] ✅ ' + blocos.length + ' blocos dinâmicos renderizados.');

  } catch (err) {
    // Se falhar, remove o placeholder — a home estática continua
    placeholder.innerHTML = '';
    console.warn('[home] Blocos dinâmicos indisponíveis:', err.message);
  }
}

/**
 * Skeleton exibido enquanto os blocos dinâmicos carregam.
 */
function _skeletonBlocosHome() {
  return [
    '<div class="skeleton-pagina" aria-busy="true" aria-label="Carregando produtos...">',

    // Seção 1 — Categorias
    '<div class="secao secao--bege">',
    '  <div class="container">',
    '    <div class="skeleton skeleton-titulo" style="width:38%;height:22px;margin-bottom:var(--s-4)"></div>',
    '    <div class="skeleton-grade" style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--s-3)">',
    '      <div class="skeleton skeleton-card" style="height:120px"></div>',
    '      <div class="skeleton skeleton-card" style="height:120px"></div>',
    '      <div class="skeleton skeleton-card" style="height:120px"></div>',
    '      <div class="skeleton skeleton-card" style="height:120px"></div>',
    '    </div>',
    '  </div>',
    '</div>',

    // Seção 2 — Produtos
    '<div class="secao secao--branco">',
    '  <div class="container">',
    '    <div class="skeleton skeleton-titulo" style="width:48%;height:22px;margin-bottom:var(--s-4)"></div>',
    '    <div class="skeleton-grade" style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--s-3)">',
    '      <div class="skeleton skeleton-card-produto"></div>',
    '      <div class="skeleton skeleton-card-produto"></div>',
    '      <div class="skeleton skeleton-card-produto"></div>',
    '      <div class="skeleton skeleton-card-produto"></div>',
    '    </div>',
    '  </div>',
    '</div>',

    '</div>',
  ].join('\n');
}


/* ================================================================
   2. HERO
   ================================================================ */

function _htmlHero() {
  return [
    '<section class="hero" aria-label="Buenos Frios — Bem-vindo">',

    // Imagem de fundo (substituir pela URL real da imagem do empório)
    // Por enquanto usa um gradiente elegante como fundo
    '<div class="hero__bg-gradiente" aria-hidden="true"></div>',

    '<div class="hero__conteudo container">',

    // Eyebrow
    '  <span class="hero__eyebrow" aria-hidden="true">Empório Gourmet</span>',

    // Título
    '  <h1 class="hero__titulo">',
    '    Buenos',
    '    <em>Frios</em>',
    '  </h1>',

    // Slogan
    '  <p class="hero__slogan">',
    '    Fazendo parte dos seus<br>melhores momentos.',
    '  </p>',

    // CTAs
    '  <div class="hero__cta">',

    '    <button class="hero__btn-principal"',
    '            onclick="navegarPara(\'/?action=categorias\')"',
    '            aria-label="Descobrir os sabores da Buenos Frios">',
    '      Descobrir Sabores',
    // Seta →
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"',
    '           stroke="currentColor" stroke-width="2.2" aria-hidden="true">',
    '        <line x1="5" y1="12" x2="19" y2="12"/>',
    '        <polyline points="12 5 19 12 12 19"/>',
    '      </svg>',
    '    </button>',

    // Link secundário
    '    <a class="hero__link-secundario"',
    '       href="/?pagina=home"',
    '       onclick="navegarPara(\'/?pagina=home\'); return false;">',
    '      Ver coleções',
    '    </a>',

    '  </div>',

    // Scroll indicator
    '  <div class="hero__scroll" aria-hidden="true">',
    '    <div class="hero__scroll-line"></div>',
    '    <span>Explorar</span>',
    '  </div>',

    '</div>',
    '</section>',
  ].join('\n');
}


/* ================================================================
   3. SEÇÃO "COMO POSSO AJUDAR HOJE?"
   ================================================================ */

var _ocasioes = [
  { emoji: '🍷', texto: 'Vou receber amigos',   link: '/?action=colecao&id=receber-amigos' },
  { emoji: '🧀', texto: 'Quero montar uma tábua', link: '/?action=colecao&id=montar-tabua' },
  { emoji: '🎁', texto: 'Procuro um presente',    link: '/?action=colecao&id=presente' },
  { emoji: '🥩', texto: 'Vou fazer churrasco',    link: '/?action=colecao&id=churrasco' },
  { emoji: '🍝', texto: 'Hoje é dia de massa',    link: '/?action=colecao&id=noite-italiana' },
  { emoji: '☕', texto: 'Café da tarde',           link: '/?action=colecao&id=cafe-da-tarde' },
  { emoji: '🍾', texto: 'Quero vinhos',            link: '/?action=categoria&id=Vinhos' },
  { emoji: '❤️', texto: 'Jantar especial',         link: '/?action=colecao&id=jantar-especial' },
];

function _htmlSecaoAjuda() {
  return [
    '<section class="secao-ajuda" aria-labelledby="titulo-ajuda">',
    '<div class="container">',

    '  <p class="eyebrow" style="text-align:center">Para você hoje</p>',
    '  <h2 class="secao-ajuda__titulo" id="titulo-ajuda">',
    '    Como posso fazer parte<br>do seu momento?',
    '  </h2>',
    '  <p class="secao-ajuda__sub">Escolha uma ocasião e eu curo a seleção ideal.</p>',

    '  <div class="ocasioes-grid" role="list">',

    _ocasioes.map(function(o, i) {
      var ehLargo = (_ocasioes.length % 2 !== 0) && (i === _ocasioes.length - 1);
      return [
        '    <a class="ocasiao-card' + (ehLargo ? ' ocasiao-card--largo' : '') + '"',
        '       href="' + o.link + '"',
        '       onclick="navegarPara(\'' + o.link + '\'); return false;"',
        '       role="listitem"',
        '       aria-label="' + o.texto + '">',
        '      <span class="ocasiao-card__emoji" aria-hidden="true">' + o.emoji + '</span>',
        '      <span class="ocasiao-card__texto">' + o.texto + '</span>',
        '    </a>',
      ].join('\n');
    }).join('\n'),

    '  </div>',
    '</div>',
    '</section>',
  ].join('\n');
}


/* ================================================================
   4. SERVIÇOS
   ================================================================ */

var _servicos = [
  {
    emoji: '🧀',
    titulo: 'Tábuas Personalizadas',
    desc:   'Montamos a tábua ideal para o seu momento, com curadoria de queijos, frios e acompanhamentos.',
  },
  {
    emoji: '🎁',
    titulo: 'Kits Presente',
    desc:   'Presentes que encantam. Selecionamos os melhores produtos e embalamos com cuidado.',
  },
  {
    emoji: '✨',
    titulo: 'Gravação a Laser',
    desc:   'Personalizamos tábuas e petisqueiras com o nome ou mensagem que você quiser.',
  },
  {
    emoji: '🍷',
    titulo: 'Harmonização',
    desc:   'Indicamos os melhores rótulos para cada queijo e ocasião — sem complicação.',
  },
  {
    emoji: '📦',
    titulo: 'Montagem de Presentes',
    desc:   'Caixas e cestas premium com embalagem especial, prontas para entregar.',
  },
  {
    emoji: '💬',
    titulo: 'Atendimento via WhatsApp',
    desc:   'Tire dúvidas, faça pedidos e receba sugestões direto pelo WhatsApp.',
  },
];

function _htmlSecaoServicos() {
  return [
    '<section class="secao secao--bege-medio" aria-labelledby="titulo-servicos">',
    '<div class="container">',

    _htmlCabecalhoSecao({
      eyebrow:    'O que fazemos',
      titulo:     'Além dos produtos',
      subtitulo:  'A Buenos Frios oferece experiências completas para cada ocasião.',
    }),

    '  <div class="servicos-grid">',

    _servicos.map(function(s) {
      return [
        '    <div class="servico-card">',
        '      <div class="servico-card__icone" aria-hidden="true">' + s.emoji + '</div>',
        '      <div class="servico-card__corpo">',
        '        <h3 class="servico-card__titulo">' + s.titulo + '</h3>',
        '        <p class="servico-card__desc">' + s.desc + '</p>',
        '      </div>',
        '    </div>',
      ].join('\n');
    }).join('\n'),

    '  </div>',
    '</div>',
    '</section>',
  ].join('\n');
}


/* ================================================================
   5. RODAPÉ
   ================================================================ */

function _htmlRodape() {
  var anoAtual = new Date().getFullYear();

  return [
    '<footer class="rodape" role="contentinfo">',
    '  <div class="rodape__inner">',

    '    <div class="rodape__marca">',
    '      <p class="rodape__nome">Buenos <em>Frios</em></p>',
    '      <p class="rodape__slogan">Fazendo parte dos seus melhores momentos.</p>',
    '    </div>',

    '    <hr class="rodape__divisor" />',
    '    <p class="rodape__copy">',
    '      &copy; ' + anoAtual + ' Buenos Frios &mdash; Todos os direitos reservados.',
    '    </p>',

    '  </div>',
    '</footer>',
  ].join('\n');
}


/* ================================================================
   6. HELPERS DE SEÇÃO (exportados para uso em outras telas)
   ================================================================ */

/**
 * _htmlCabecalhoSecao
 *
 * Gera o HTML do cabeçalho padrão de seção.
 * Reutilizado por todos os blocos e telas do sistema.
 *
 * @param {{
 *   eyebrow?:   string,   — label pequeno acima do título
 *   titulo:     string,   — título principal
 *   subtitulo?: string,   — texto de apoio
 *   link?:      string,   — URL do "Ver todos"
 *   linkTexto?: string,   — texto do link (padrão: "Ver todos")
 *   centro?:    boolean   — centralizar o cabeçalho
 * }} opts
 * @returns {string} HTML do cabeçalho.
 */
function _htmlCabecalhoSecao(opts) {
  opts = opts || {};
  var classe = 'secao-cabecalho' + (opts.centro ? ' secao-cabecalho--centro' : '');

  return [
    '<div class="' + classe + '">',
    opts.eyebrow
      ? '<span class="secao-cabecalho__eyebrow">' + opts.eyebrow + '</span>'
      : '',
    opts.titulo
      ? '<h2 class="secao-cabecalho__titulo">' + opts.titulo + '</h2>'
      : '',
    opts.subtitulo
      ? '<p class="secao-cabecalho__subtitulo">' + opts.subtitulo + '</p>'
      : '',
    opts.link
      ? '<a class="secao-cabecalho__link" href="' + opts.link + '"' +
        '   onclick="navegarPara(\'' + opts.link + '\'); return false;">' +
        (opts.linkTexto || 'Ver todos') +
        ' <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</a>'
      : '',
    '</div>',
  ].join('\n');
}

/**
 * Sobrescreve _secaoTitulo do pageRenderer com a versão melhorada.
 * Mantém compatibilidade — a assinatura é a mesma.
 *
 * @param {string} titulo
 * @param {string} [subtitulo]
 * @param {string} [eyebrow]
 * @returns {string}
 */
function _secaoTitulo(titulo, subtitulo, eyebrow) {
  return _htmlCabecalhoSecao({
    titulo:    titulo,
    subtitulo: subtitulo,
    eyebrow:   eyebrow,
  });
}

/**
 * Adiciona estilos extras da Home que complementam o Design System.
 * Chamado uma única vez durante a inicialização da Home.
 */
function _injetarEstilosHome() {
  if (porId('estilos-home')) return;

  var css = [
    /* Hero — fundo gradiente quando não há imagem */
    '.hero__bg-gradiente {',
    '  position: absolute; inset: 0;',
    '  background: radial-gradient(',
    '    ellipse at 30% 60%,',
    '    #3E0E16 0%,',
    '    #18060A 50%,',
    '    #0E0408 100%',
    '  );',
    '}',

    /* Link secundário no hero */
    '.hero__link-secundario {',
    '  font-size: var(--t-14);',
    '  color: rgba(255,255,255,0.62);',
    '  border-bottom: 1px solid rgba(255,255,255,0.25);',
    '  padding-bottom: 2px;',
    '  transition: color var(--dur-normal), border-color var(--dur-normal);',
    '}',
    '.hero__link-secundario:hover {',
    '  color: var(--branco);',
    '  border-color: rgba(255,255,255,0.60);',
    '}',

    /* Garante que blocos da home tenham padding correto */
    '.bloco--categorias   .container,',
    '.bloco--colecao      .container,',
    '.bloco--mais_vendidos .container,',
    '.bloco--promocoes    .container,',
    '.bloco--destaques    .container,',
    '.bloco--produtos     .container {',
    '  padding-block: var(--s-10);',
    '}',

    /* Alternância de fundo entre seções */
    '.bloco--categorias    { background: var(--bege); }',
    '.bloco--colecao       { background: var(--branco-quente); }',
    '.bloco--mais_vendidos { background: var(--bege); }',
    '.bloco--promocoes     { background: var(--vinho-ultra); }',
    '.bloco--destaques     { background: var(--branco-quente); }',
    '.bloco--banner        { background: var(--vinho-escuro); }',

    /* Ajuste do banner dentro de blocos */
    '.bloco--banner .banner-wrapper,',
    '.bloco--carrossel .banner-wrapper { margin: 0; }',

    /* Grade de blocos que vêm do pageRenderer */
    '.bloco .container { padding-inline: var(--gutter); }',

    /* Seção de ajuda */
    '.secao-ajuda { padding-block: var(--s-10); }',

    /* Hero scroll indicator — animação */
    '@keyframes scrollPulso {',
    '  0%, 100% { opacity: 0.40; transform: scaleY(1); }',
    '  50%       { opacity: 0.80; transform: scaleY(1.2); }',
    '}',
    '.hero__scroll-line {',
    '  animation: scrollPulso 2s ease-in-out infinite;',
    '  transform-origin: top;',
    '}',

    /* Fade-in da hero */
    '.hero__conteudo { animation: heroEntrada 0.8s var(--ease-out) both; }',
    '@keyframes heroEntrada {',
    '  from { opacity: 0; transform: translateY(16px); }',
    '  to   { opacity: 1; transform: translateY(0); }',
    '}',

    /* Eyebrow da hero */
    '.hero__eyebrow { animation: heroEntrada 0.6s var(--ease-out) 0.1s both; }',
    '.hero__titulo  { animation: heroEntrada 0.7s var(--ease-out) 0.2s both; }',
    '.hero__slogan  { animation: heroEntrada 0.7s var(--ease-out) 0.3s both; }',
    '.hero__cta     { animation: heroEntrada 0.7s var(--ease-out) 0.4s both; }',
    '.hero__scroll  { animation: heroEntrada 0.6s var(--ease-out) 0.6s both; }',
  ].join('\n');

  var tag = document.createElement('style');
  tag.id  = 'estilos-home';
  tag.textContent = css;
  document.head.appendChild(tag);
}

// Injeta os estilos assim que o módulo carrega
_injetarEstilosHome();

/* ================================================================
   REGISTRO
   ================================================================ */
console.log('[home] ✅ v1.0 carregado.');
