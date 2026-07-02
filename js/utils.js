/**
 * ================================================================
 * BUENOS FRIOS — utils.js  v2.0
 * Funções auxiliares reutilizadas em todo o sistema.
 * ================================================================
 *
 * REGRA DE OURO DESTE ARQUIVO:
 * Nenhuma função aqui depende de outro arquivo do projeto.
 * utils.js é sempre o PRIMEIRO a ser carregado.
 *
 * ÍNDICE:
 *  1. Texto e normalização  (normalizar, slug, truncar, capitalizar)
 *  2. Moeda e números       (formatarMoeda, parseMoeda)
 *  3. Data e hora           (formatarData, dataAtual)
 *  4. URL e rotas           (lerParams, atualizarURL, navegarPara)
 *  5. DOM                   (porId, qs, qsAll, mostrar, ocultar, renderizar)
 *  6. localStorage          (salvarLocal, lerLocal, removerLocal)
 *  7. Tempo e performance   (debounce, throttle, esperar)
 *  8. Validações            (validarNome, validarTelefone, mascaraTelefone)
 *  9. Imagem                (imagemPlaceholder, ativarLazyLoading)
 * 10. Eventos customizados  (emitir, ouvirEvento)
 * ================================================================
 */


/* ================================================================
   1. TEXTO E NORMALIZAÇÃO
   ================================================================ */

/**
 * Remove acentos e converte para minúsculas.
 *
 * Esta é a função central de normalização.
 * Usada para: busca, comparação de categorias e slugs.
 *
 * Exemplos:
 *   normalizar('Patê')          → 'pate'
 *   normalizar('GORGONZOLA')    → 'gorgonzola'
 *   normalizar('Queijão Minas') → 'queijao minas'
 *
 * @param {*} texto - Qualquer valor (será convertido para string).
 * @returns {string} Texto sem acentos, em minúsculas, sem espaços extras.
 */
function normalizar(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .normalize('NFD')                       // separa letras dos sinais de acento
    .replace(/[\u0300-\u036f]/g, '')        // remove os sinais de acento
    .toLowerCase()
    .trim();
}

/**
 * Converte um texto em slug para URLs amigáveis.
 *
 * Exemplos:
 *   slug('Patê de Azeitona 220g') → 'pate-de-azeitona-220g'
 *   slug('Queijo Brie Président') → 'queijo-brie-president'
 *   slug('Tábua de Frios #1')     → 'tabua-de-frios-1'
 *
 * @param {string} texto
 * @returns {string}
 */
function slug(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9\s-]/g, '')    // remove caracteres especiais (exceto hífen)
    .replace(/\s+/g, '-')            // espaços → hífens
    .replace(/-+/g, '-')             // múltiplos hífens → um só
    .replace(/^-|-$/g, '');          // remove hífens nas pontas
}

/**
 * Trunca um texto longo adicionando "…" no final.
 * Útil para descrições em cards de produto.
 *
 * Exemplo:
 *   truncar('Queijo artesanal produzido nas montanhas...', 30)
 *   → 'Queijo artesanal produzido nas…'
 *
 * @param {string} texto
 * @param {number} [limite=120] - Número máximo de caracteres.
 * @returns {string}
 */
function truncar(texto, limite) {
  limite = limite || 120;
  if (!texto) return '';
  var s = String(texto);
  if (s.length <= limite) return s;
  return s.substring(0, limite).trimEnd() + '…';
}

/**
 * Coloca a primeira letra de cada palavra em maiúscula.
 *
 * Exemplo:
 *   capitalizar('queijo minas frescal') → 'Queijo Minas Frescal'
 *
 * @param {string} texto
 * @returns {string}
 */
function capitalizar(texto) {
  if (!texto) return '';
  return String(texto)
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, function(c) { return c.toUpperCase(); });
}

/**
 * Verifica se dois textos são iguais ignorando acentos e caixa.
 *
 * Exemplo:
 *   textoIgual('Queijos', 'queijós') → true
 *   textoIgual('Patê', 'pate')       → true
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function textoIgual(a, b) {
  return normalizar(a) === normalizar(b);
}

/**
 * Verifica se um texto contém outro, ignorando acentos e caixa.
 *
 * Exemplo:
 *   textoContem('Gorgonzola DOP Italiano', 'gorgo') → true
 *   textoContem('Patê de Azeitona', 'pate')         → true
 *
 * @param {string} texto
 * @param {string} termo
 * @returns {boolean}
 */
function textoContem(texto, termo) {
  return normalizar(texto).indexOf(normalizar(termo)) > -1;
}


/* ================================================================
   2. MOEDA E NÚMEROS
   ================================================================ */

/**
 * Formata um número como moeda brasileira.
 *
 * Exemplos:
 *   formatarMoeda(29.9)   → 'R$ 29,90'
 *   formatarMoeda(1299)   → 'R$ 1.299,00'
 *   formatarMoeda(null)   → 'R$ —'
 *
 * @param {number} valor
 * @returns {string}
 */
function formatarMoeda(valor) {
  if (valor === null || valor === undefined || isNaN(Number(valor))) return 'R$ —';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor));
}

/**
 * Converte uma string de moeda brasileira para número.
 *
 * Exemplos:
 *   parseMoeda('R$ 29,90')    → 29.90
 *   parseMoeda('1.299,00')    → 1299.00
 *   parseMoeda('39,50')       → 39.50
 *
 * @param {string} texto
 * @returns {number}
 */
function parseMoeda(texto) {
  if (!texto) return 0;
  var limpo = String(texto)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(limpo) || 0;
}

/**
 * Calcula o percentual de desconto entre preço original e promocional.
 *
 * Exemplo:
 *   calcularDesconto(50, 35) → 30  (30% de desconto)
 *
 * @param {number} precoOriginal
 * @param {number} precoPromo
 * @returns {number} Percentual arredondado.
 */
function calcularDesconto(precoOriginal, precoPromo) {
  if (!precoOriginal || !precoPromo || precoPromo >= precoOriginal) return 0;
  return Math.round((1 - precoPromo / precoOriginal) * 100);
}


/* ================================================================
   3. DATA E HORA
   ================================================================ */

/**
 * Formata uma data para exibição em português.
 *
 * Exemplos:
 *   formatarData('2024-03-15')  → '15 de março de 2024'
 *   formatarData(new Date())    → 'hoje formatado'
 *
 * @param {string|Date} data
 * @returns {string}
 */
function formatarData(data) {
  if (!data) return '';
  var d = new Date(data);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Retorna a data e hora atuais no formato ISO (para enviar ao servidor).
 *
 * Exemplo: '2024-03-15T14:30:00.000Z'
 *
 * @returns {string}
 */
function dataAtual() {
  return new Date().toISOString();
}


/* ================================================================
   4. URL E ROTAS
   ================================================================ */

/**
 * Lê todos os parâmetros da URL atual e retorna como objeto.
 *
 * Exemplo:
 *   URL: '?action=categoria&id=Queijos'
 *   lerParams() → { action: 'categoria', id: 'Queijos' }
 *
 * @returns {Object}
 */
function lerParams() {
  var resultado = {};
  var urlParams = new URLSearchParams(window.location.search);
  urlParams.forEach(function(valor, chave) {
    resultado[chave] = valor;
  });
  return resultado;
}

/**
 * Atualiza a URL do navegador sem recarregar a página.
 * Usa a History API (pushState).
 *
 * @param {Object} params  - Parâmetros a colocar na URL.
 * @param {string} [titulo] - Título da página (opcional).
 */
function atualizarURL(params, titulo) {
  titulo = titulo || '';
  var urlParams = new URLSearchParams();
  Object.keys(params).forEach(function(chave) {
    var valor = params[chave];
    if (valor !== null && valor !== undefined && valor !== '') {
      urlParams.set(chave, valor);
    }
  });
  var novaURL = urlParams.toString()
    ? window.location.pathname + '?' + urlParams.toString()
    : window.location.pathname;
  window.history.pushState(params, titulo, novaURL);
  if (titulo) document.title = titulo + ' — Buenos Frios';
}

/**
 * Navega para uma nova URL relativa sem recarregar a página.
 * Dispara o evento 'rotaMudou' para o roteador do app.js.
 *
 * Exemplo:
 *   navegarPara('/?action=categoria&id=Queijos')
 *
 * @param {string} caminho
 */
function navegarPara(caminho) {
  window.history.pushState({}, '', caminho);
  window.dispatchEvent(new Event('rotaMudou'));
}

/**
 * Cria uma query string a partir de um objeto de parâmetros.
 *
 * Exemplo:
 *   montarQuery({ action: 'buscar', q: 'brie' }) → '?action=buscar&q=brie'
 *
 * @param {Object} params
 * @returns {string}
 */
function montarQuery(params) {
  var qs = new URLSearchParams();
  Object.keys(params).forEach(function(k) {
    if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
      qs.set(k, params[k]);
    }
  });
  var s = qs.toString();
  return s ? '?' + s : '';
}


/* ================================================================
   5. DOM
   ================================================================ */

/**
 * Atalho para document.getElementById.
 *
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function porId(id) {
  return document.getElementById(id);
}

/**
 * Atalho para querySelector.
 *
 * @param {string} seletor
 * @param {Element|Document} [contexto=document]
 * @returns {Element|null}
 */
function qs(seletor, contexto) {
  return (contexto || document).querySelector(seletor);
}

/**
 * Atalho para querySelectorAll.
 * Retorna Array (não NodeList) para poder usar .map, .filter etc.
 *
 * @param {string} seletor
 * @param {Element|Document} [contexto=document]
 * @returns {Element[]}
 */
function qsAll(seletor, contexto) {
  return Array.from((contexto || document).querySelectorAll(seletor));
}

/**
 * Exibe um elemento removendo a classe 'hidden'.
 *
 * @param {Element|string} el - Elemento ou ID.
 */
function mostrar(el) {
  var elem = typeof el === 'string' ? porId(el) : el;
  if (elem) elem.classList.remove('hidden');
}

/**
 * Oculta um elemento adicionando a classe 'hidden'.
 *
 * @param {Element|string} el - Elemento ou ID.
 */
function ocultar(el) {
  var elem = typeof el === 'string' ? porId(el) : el;
  if (elem) elem.classList.add('hidden');
}

/**
 * Injeta HTML dentro de um elemento (substitui o conteúdo anterior).
 *
 * @param {Element|string} el   - Elemento ou ID.
 * @param {string}         html - HTML a inserir.
 */
function renderizar(el, html) {
  var elem = typeof el === 'string' ? porId(el) : el;
  if (elem) elem.innerHTML = html;
}

/**
 * Cria um elemento HTML com atributos e conteúdo opcionais.
 *
 * Exemplos:
 *   criarEl('div', { class: 'card' }, 'Conteúdo')
 *   criarEl('img', { src: url, alt: 'Foto' })
 *
 * @param {string} tag        - Tag HTML (div, span, img…).
 * @param {Object} [attrs={}] - Atributos (class, id, href…).
 * @param {string} [html='']  - Conteúdo innerHTML.
 * @returns {HTMLElement}
 */
function criarEl(tag, attrs, html) {
  attrs = attrs || {};
  html  = html  || '';
  var el = document.createElement(tag);
  Object.keys(attrs).forEach(function(attr) {
    el.setAttribute(attr, attrs[attr]);
  });
  if (html) el.innerHTML = html;
  return el;
}

/**
 * Rola a página suavemente até um elemento.
 *
 * @param {Element|string} el - Elemento ou ID.
 * @param {number} [offset=0] - Deslocamento extra (em px) — útil para compensar o header fixo.
 */
function rolarPara(el, offset) {
  offset = offset || 0;
  var elem = typeof el === 'string' ? porId(el) : el;
  if (!elem) return;
  var topo = elem.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: topo, behavior: 'smooth' });
}


/* ================================================================
   6. LOCALSTORAGE
   ================================================================ */

/**
 * Prefixo usado em todas as chaves do localStorage.
 * Evita conflito com outros sites/apps no mesmo domínio.
 */
var LS_PREFIX = 'bf_'; // "bf" = Buenos Frios

/**
 * Salva um valor no localStorage.
 * Converte objetos e arrays para JSON automaticamente.
 *
 * @param {string} chave
 * @param {*}      valor
 */
function salvarLocal(chave, valor) {
  try {
    localStorage.setItem(LS_PREFIX + chave, JSON.stringify(valor));
  } catch (e) {
    console.warn('[utils] Falha ao salvar no localStorage:', chave, e);
  }
}

/**
 * Lê um valor do localStorage.
 * Converte JSON para objeto automaticamente.
 *
 * @param {string} chave
 * @param {*}      [padrao=null] - Retornado se a chave não existir.
 * @returns {*}
 */
function lerLocal(chave, padrao) {
  if (padrao === undefined) padrao = null;
  try {
    var item = localStorage.getItem(LS_PREFIX + chave);
    if (item === null) return padrao;
    return JSON.parse(item);
  } catch (e) {
    console.warn('[utils] Falha ao ler do localStorage:', chave, e);
    return padrao;
  }
}

/**
 * Remove um item do localStorage.
 *
 * @param {string} chave
 */
function removerLocal(chave) {
  try {
    localStorage.removeItem(LS_PREFIX + chave);
  } catch (e) {
    console.warn('[utils] Falha ao remover do localStorage:', chave, e);
  }
}

/**
 * Remove TODOS os dados do Buenos Frios do localStorage.
 * (Não afeta dados de outros sites.)
 */
function limparLocal() {
  try {
    Object.keys(localStorage)
      .filter(function(k) { return k.indexOf(LS_PREFIX) === 0; })
      .forEach(function(k) { localStorage.removeItem(k); });
    console.log('[utils] localStorage limpo.');
  } catch (e) {
    console.warn('[utils] Falha ao limpar localStorage:', e);
  }
}


/* ================================================================
   7. TEMPO E PERFORMANCE
   ================================================================ */

/**
 * Debounce — atrasa a execução de uma função até que o usuário
 * pare de chamar por `ms` milissegundos.
 *
 * Uso típico: busca ao digitar (não disparar a cada letra).
 *
 * Exemplo:
 *   var buscarComDebounce = debounce(executarBusca, 400);
 *   input.addEventListener('input', buscarComDebounce);
 *
 * @param {Function} fn
 * @param {number}   ms
 * @returns {Function}
 */
function debounce(fn, ms) {
  ms = ms || 300;
  var timer;
  return function() {
    var ctx  = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
  };
}

/**
 * Throttle — garante que a função seja chamada no máximo
 * uma vez a cada `ms` milissegundos.
 *
 * Uso típico: scroll, resize.
 *
 * @param {Function} fn
 * @param {number}   ms
 * @returns {Function}
 */
function throttle(fn, ms) {
  ms = ms || 200;
  var ultimo = 0;
  return function() {
    var agora = Date.now();
    if (agora - ultimo < ms) return;
    ultimo = agora;
    return fn.apply(this, arguments);
  };
}

/**
 * Retorna uma Promise que resolve após `ms` milissegundos.
 * Útil para aguardar animações ou simular latência.
 *
 * Exemplo:
 *   await esperar(300);  // aguarda 300ms
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function esperar(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}


/* ================================================================
   8. VALIDAÇÕES
   ================================================================ */

/**
 * Verifica se um nome é válido (ao menos 2 caracteres).
 *
 * @param {string} nome
 * @returns {boolean}
 */
function validarNome(nome) {
  return Boolean(nome) && String(nome).trim().length >= 2;
}

/**
 * Verifica se um telefone brasileiro é válido.
 * Aceita celular (11 dígitos) e fixo (10 dígitos).
 *
 * @param {string} telefone
 * @returns {boolean}
 */
function validarTelefone(telefone) {
  var digitos = String(telefone || '').replace(/\D/g, '');
  return digitos.length >= 10 && digitos.length <= 11;
}

/**
 * Aplica máscara de telefone enquanto o usuário digita.
 *
 * Exemplos:
 *   mascaraTelefone('11999999999') → '(11) 99999-9999'
 *   mascaraTelefone('1133334444')  → '(11) 3333-4444'
 *
 * @param {string} valor
 * @returns {string}
 */
function mascaraTelefone(valor) {
  var d = String(valor || '').replace(/\D/g, '').substring(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 6)  return '(' + d.slice(0,2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
  return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
}


/* ================================================================
   9. IMAGEM
   ================================================================ */

/**
 * Retorna um SVG de placeholder para usar quando não há imagem.
 * Não depende de serviço externo.
 *
 * @param {number} [w=300] - Largura.
 * @param {number} [h=300] - Altura.
 * @returns {string} Data URL do SVG.
 */
function imagemPlaceholder(w, h) {
  w = w || 300;
  h = h || 300;
  var svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">',
    '<rect width="' + w + '" height="' + h + '" fill="#EDE6DC"/>',
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"',
    ' font-family="serif" font-size="13" fill="#B0A090">Sem imagem</text>',
    '</svg>',
  ].join('');
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Ativa lazy loading nas imagens de um container.
 * As imagens devem ter o atributo data-src em vez de src.
 *
 * Exemplo de uso no HTML:
 *   <img data-src="https://postimages.org/abc.jpg"
 *        src="placeholder"
 *        alt="Queijo Brie" />
 *
 * @param {Element|Document} [contexto=document]
 */
function ativarLazyLoading(contexto) {
  contexto = contexto || document;

  if (!('IntersectionObserver' in window)) {
    // Fallback para navegadores antigos: carrega tudo de uma vez
    qsAll('[data-src]', contexto).forEach(function(img) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      img.classList.add('carregada');
      observer.unobserve(img);
    });
  }, {
    rootMargin: '200px',  // começa a carregar 200px antes de aparecer na tela
    threshold: 0,
  });

  qsAll('[data-src]', contexto).forEach(function(img) {
    observer.observe(img);
  });
}

/**
 * Trata erro de carregamento de imagem.
 * Substitui src por placeholder se a imagem original falhar.
 * Adicione onerror="imgFallback(this)" na tag <img>.
 *
 * @param {HTMLImageElement} img
 */
function imgFallback(img) {
  img.onerror = null; // evita loop infinito
  img.src = imagemPlaceholder(img.offsetWidth || 300, img.offsetHeight || 300);
}


/* ================================================================
   10. EVENTOS CUSTOMIZADOS
   ================================================================
   Permitem que módulos se comuniquem sem depender diretamente um do outro.
   Ex: carrinho.js emite 'carrinhoAtualizado' → app.js atualiza o badge.
   ================================================================ */

/**
 * Emite um evento customizado com dados opcionais.
 *
 * Exemplo:
 *   emitir('carrinhoAtualizado', { total: 59.80, itens: 2 })
 *
 * @param {string} nomeEvento
 * @param {*}      [dados]
 */
function emitir(nomeEvento, dados) {
  var evento = new CustomEvent(nomeEvento, { detail: dados, bubbles: true });
  document.dispatchEvent(evento);
}

/**
 * Registra um listener para um evento customizado.
 *
 * Exemplo:
 *   ouvirEvento('carrinhoAtualizado', function(dados) {
 *     console.log('Total:', dados.total);
 *   });
 *
 * @param {string}   nomeEvento
 * @param {Function} callback  - Recebe event.detail como argumento.
 * @returns {Function} Função para remover o listener se necessário.
 */
function ouvirEvento(nomeEvento, callback) {
  var handler = function(e) { callback(e.detail); };
  document.addEventListener(nomeEvento, handler);
  // Retorna uma função de "cancelar inscrição"
  return function() { document.removeEventListener(nomeEvento, handler); };
}


/* ================================================================
   REGISTRO
   ================================================================ */
console.log('[utils] ✅ v2.0 carregado.');
