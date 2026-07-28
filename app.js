const DIFFICULTIES = {
  easy: { label: 'Fácil' },
  medium: { label: 'Médio' },
  hard: { label: 'Difícil' },
};

const CATEGORIES = [
  'Arte e Cultura', 'Astronomia', 'Gastronomia', 'Tecnologia',
  'História', 'Geografia', 'Ciência', 'Música',
  'Cinema e TV', 'Esportes', 'Literatura', 'Conhecimentos Gerais',
];


const LETTERS = ['A', 'B', 'C', 'D'];
const QUESTIONS_PER_PAGE = 8;
// Guarda o conjunto completo gerado por último; a tela só renderiza a
// 1ª página (ver generatePages), mas o PDF (renderPDF) precisa de todas.
let lastSelectedQuestions = [];
// Preenchido via fetch (ver bootstrap no fim do arquivo); antes disso
// fica vazio, então nada que dependa de QUESTIONS deve rodar antes.
let QUESTIONS = [];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pick(items, n) {
  const shuffled = shuffle([...items]);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

const STORAGE_KEY = 'quizConfig';

function saveConfig() {
  const rows = document.querySelectorAll('#catGrid .cat-row');
  const categories = [];
  rows.forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb.checked) categories.push(row.querySelector('label').textContent.trim());
  });
  const total = document.getElementById('totalInput').value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: categories, total: total }));
  } catch (e) {
    // localStorage indisponível (modo privado, quota etc.) — não é crítico, ignora
  }
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function buildCategoryUI() {
  const grid = document.getElementById('catGrid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const count = QUESTIONS.filter(q => q.category === cat).length;
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = [
      '<label><input type="checkbox" checked onchange="updateTotal()"> ', cat, '</label>',
      '<span class="avail-hint">', count, ' disp.</span>'
    ].join('');
    grid.appendChild(row);
  });

  // Restaura seleção/total salvos antes do primeiro updateTotal(), senão
  // ele já salvaria de volta o estado padrão (tudo marcado) por cima.
  const saved = loadConfig();
  if (saved && Array.isArray(saved.categories)) {
    document.querySelectorAll('#catGrid .cat-row').forEach(row => {
      const cat = row.querySelector('label').textContent.trim();
      row.querySelector('input[type="checkbox"]').checked = saved.categories.includes(cat);
    });
  }
  if (saved && saved.total) {
    document.getElementById('totalInput').value = saved.total;
  }

  updateTotal();
}

function updateTotal() {
  const rows = document.querySelectorAll('#catGrid .cat-row');
  let avail = 0;
  rows.forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb.checked) {
      const hint = row.querySelector('.avail-hint').textContent;
      avail += parseInt(hint);
    }
  });
  const totalInput = document.getElementById('totalInput');
  const max = Math.min(avail, 576);
  if (parseInt(totalInput.value) > max) totalInput.value = max;
  totalInput.max = max;

  document.getElementById('totalAvail').textContent =
    max + ' disponíveis nas categorias selecionadas';

  const total = parseInt(totalInput.value) || 0;
  const pages = Math.ceil(total / QUESTIONS_PER_PAGE);
  const info = document.getElementById('statusInfo');
  if (total > 0) {
    info.textContent = total + ' questões | ' + pages + ' página(s)';
  } else {
    info.textContent = 'Nenhuma página gerada';
    document.getElementById('printBtn').style.display = 'none';
    document.getElementById('pdfBtn').style.display = 'none';
    // Sem isso, desmarcar todas as categorias (ou zerar o total) escondia
    // os botões mas deixava a página gerada anteriormente visível na
    // tela, contradizendo o "Nenhuma página gerada".
    lastSelectedQuestions = [];
    document.getElementById('container').innerHTML = '<div class="empty-msg">Selecione categorias e quantidades, depois clique em "Gerar Páginas"</div>';
  }

  saveConfig();
}

function getConfig() {
  const rows = document.querySelectorAll('#catGrid .cat-row');
  const selected = [];
  rows.forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb.checked) {
      selected.push(row.querySelector('label').textContent.trim());
    }
  });
  if (!selected.length) return {};

  const total = parseInt(document.getElementById('totalInput').value) || 0;
  if (total <= 0) return {};

  const avail = {};
  selected.forEach(cat => {
    avail[cat] = QUESTIONS.filter(q => q.category === cat).length;
  });

  let remaining = total;
  const perCat = Math.floor(total / selected.length);
  const result = {};
  selected.forEach(cat => { result[cat] = 0; });

  selected.forEach(cat => {
    result[cat] = Math.min(perCat, avail[cat]);
    remaining -= result[cat];
  });

  for (let i = 0; i < selected.length && remaining > 0; i++) {
    const cat = selected[i];
    const canAdd = Math.min(remaining, avail[cat] - result[cat]);
    result[cat] += canAdd;
    remaining -= canAdd;
  }

  return result;
}

function buildCards(questionList) {
  const pages = [];
  for (let i = 0; i < questionList.length; i += QUESTIONS_PER_PAGE) {
    const chunk = questionList.slice(i, i + QUESTIONS_PER_PAGE);
    const pageEl = document.createElement('div');
    pageEl.className = 'page';

    chunk.forEach(q => {
      const diff = DIFFICULTIES[q.difficulty];
      const card = document.createElement('div');
      card.className = 'card';

      let optionsHtml = '';
      q.options.forEach((opt, idx) => {
        optionsHtml += '<li><span class="opt-letter">' + LETTERS[idx] + '</span>' + opt + '</li>';
      });

      card.innerHTML = [
        '<div class="card-header">',
        '<span class="card-category">', q.category, '</span>',
        '<span class="card-difficulty">', diff.label, '</span></div>',
        '<div class="card-question">', q.question, '</div>',
        '<ul class="card-options">', optionsHtml, '</ul>',
        '<div class="card-answer">',
        '<div class="correct"><span class="opt-letter filled">', LETTERS[q.answer], '</span>', q.options[q.answer], '</div>',
        '<div class="explanation"><strong>Explicação:</strong> ', q.explanation, '</div></div>'
      ].join('');

      pageEl.appendChild(card);
    });
    pages.push(pageEl);
  }
  return pages;
}

function generatePages() {
  const config = getConfig();
  const catNames = Object.keys(config);

  if (catNames.length === 0) {
    lastSelectedQuestions = [];
    document.getElementById('container').innerHTML = '<div class="empty-msg">Selecione ao menos uma categoria com quantidade maior que zero.</div>';
    document.getElementById('statusInfo').textContent = 'Nenhuma página gerada';
    document.getElementById('printBtn').style.display = 'none';
    document.getElementById('pdfBtn').style.display = 'none';
    return;
  }

  let selected = [];
  catNames.forEach(cat => {
    const available = QUESTIONS.filter(q => q.category === cat);
    selected = selected.concat(pick(available, config[cat]));
  });
  selected = shuffle(selected);
  lastSelectedQuestions = selected;

  const container = document.getElementById('container');
  container.innerHTML = '';

  // Só a 1ª página é renderizada na tela: um quiz grande (centenas de
  // questões) gera dezenas de páginas cheias de cards com borda/sombra,
  // e desenhar tudo de uma vez trava ou derruba a aba. O PDF (renderPDF)
  // usa lastSelectedQuestions e monta todas as páginas fora da tela.
  const pages = buildCards(selected);
  if (pages.length) container.appendChild(pages[0]);

  const info = document.getElementById('statusInfo');
  const preview = pages.length > 1 ? ' (mostrando só a 1ª página; o PDF terá todas)' : '';
  info.textContent = selected.length + ' questões em ' + pages.length + ' página(s)' + preview;
  document.getElementById('printBtn').style.display = '';
  document.getElementById('pdfBtn').style.display = '';

  window.scrollTo(0, 0);
}

async function renderPDF(onProgress) {
  if (!lastSelectedQuestions.length) {
    generatePages();
    return null;
  }

  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    throw new Error('Bibliotecas não carregadas. Verifique conexão com a internet.');
  }

  var pages = buildCards(lastSelectedQuestions);

  var temp = document.createElement('div');
  temp.style.position = 'fixed';
  temp.style.left = '-9999px';
  temp.style.top = '0';
  temp.style.width = '210mm';
  document.body.appendChild(temp);

  var pdf = new jspdf.jsPDF('p', 'mm', 'a4');

  for (var i = 0; i < pages.length; i++) {
    var clone = pages[i];
    clone.style.margin = '0';
    clone.style.position = 'static';
    clone.style.width = '210mm';
    clone.style.height = '297mm';
    clone.style.maxHeight = '297mm';
    clone.style.overflow = 'hidden';
    // Força o layout desktop (2 colunas fixas) mesmo se a página estiver
    // sendo capturada com a janela estreita, onde a media query mobile
    // trocaria os cards para empilhados de uma coluna só.
    var clonedCards = clone.querySelectorAll('.card');
    for (var j = 0; j < clonedCards.length; j++) {
      clonedCards[j].style.flex = '0 0 calc(50% - 2.5mm)';
      clonedCards[j].style.height = '60mm';
      clonedCards[j].style.maxHeight = '60mm';
    }
    temp.appendChild(clone);
    var canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    temp.removeChild(clone);
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
    if (onProgress) onProgress(i + 1, pages.length);
  }

  document.body.removeChild(temp);
  return pdf;
}

async function downloadPDF() {
  var info = document.getElementById('statusInfo');
  var btn = document.getElementById('pdfBtn');
  var progress = document.getElementById('pdfProgress');
  var originalText = info.textContent;
  info.textContent = 'Gerando PDF...';
  btn.disabled = true;

  try {
    var pdf = await renderPDF(function (done, total) {
      progress.textContent = ' (' + done + '/' + total + ')';
    });
    if (pdf) {
      pdf.save('quiz-perguntados.pdf');
      info.textContent = originalText;
    } else {
      setTimeout(function () { downloadPDF(); }, 300);
    }
  } catch (e) {
    info.textContent = 'Erro: ' + e.message;
    console.error(e);
  } finally {
    btn.disabled = false;
    progress.textContent = '';
  }
}

async function printPDF() {
  // window.print() depende do @media print/page-break do navegador, cujas
  // margens e paginação variam demais entre navegador/SO/impressora. Em vez
  // disso, reaproveita o mesmo PDF (html2canvas + jsPDF) que "Baixar PDF"
  // já gera de forma confiável.
  //
  // Chamar .print() dentro de um iframe/aba apontando pro PDF não funciona:
  // o visualizador de PDF nativo do Chrome roda em contexto isolado e
  // acessar seu contentWindow lança SecurityError. A alternativa confiável
  // é abrir o PDF numa nova aba e deixar o próprio visualizador (com botão
  // de impressão nativo) cuidar do resto — sem depender de CSS de página.
  //
  // A aba só abre depois do PDF pronto (progresso fica só no botão, ver
  // downloadPDF). Isso significa chamar window.open() depois de um await
  // longo (até dezenas de segundos em quizzes grandes) — o navegador pode
  // não reconhecer mais isso como resposta direta ao clique e bloquear
  // como pop-up, silenciosamente. Se isso acontecer com frequência, volte
  // a abrir a aba em branco antes do await (ver histórico do commit).
  var info = document.getElementById('statusInfo');
  var btn = document.getElementById('printBtn');
  var progress = document.getElementById('printProgress');
  var originalText = info.textContent;
  btn.disabled = true;

  info.textContent = 'Preparando impressão...';
  try {
    var pdf = await renderPDF(function (done, total) {
      progress.textContent = ' (' + done + '/' + total + ')';
    });
    if (!pdf) {
      setTimeout(function () { printPDF(); }, 300);
      return;
    }
    var win = window.open(pdf.output('bloburl'), '_blank');
    if (!win) {
      info.textContent = 'Permita pop-ups neste site para imprimir.';
      return;
    }
    info.textContent = originalText;
  } catch (e) {
    info.textContent = 'Erro: ' + e.message;
    console.error(e);
  } finally {
    btn.disabled = false;
    progress.textContent = '';
  }
}

fetch('questions.json?v=1785216534')
  .then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function (data) {
    QUESTIONS = data;
    buildCategoryUI();
  })
  .catch(function (e) {
    document.getElementById('catGrid').textContent =
      'Erro ao carregar o banco de questões: ' + e.message;
    console.error(e);
  });
