/* ==========================================================
   Leituras no Mastodon - lógica da página
   Fluxo: buscar livro (Open Library) -> informar progresso
   -> montar o texto -> abrir a tela de publicar da instância
   ========================================================== */

/* ---------- Atalhos e estado ---------- */
const $ = s => document.querySelector(s);   // atalho para querySelector
const LS = localStorage;                    // guarda as instâncias no navegador

// Instâncias sugeridas na lista de autocompletar
const POP = ['mastodon.social', 'mastodon.online', 'mas.to', 'bolha.us', 'organica.social'];

let book = null;     // livro escolhido: { key, title, author, cover_i, pages }
let edited = false;  // true quando o usuário editou o texto final à mão
let insts = [];      // instâncias já usadas por esta pessoa

// Carrega as instâncias salvas (ignora se o dado estiver corrompido)
try { insts = JSON.parse(LS.getItem('lm_insts') || '[]'); } catch {}

/* ---------- Mensagens ---------- */
// Mostra um aviso (ou erro, se err for true). Texto vazio esconde a caixa.
function msg(t, err) {
  const m = $('#msg');
  m.hidden = !t;
  m.className = err ? 'err' : '';
  m.textContent = t || '';
}

/* ==========================================================
   1. Busca no Open Library
   ========================================================== */
$('#fSearch').addEventListener('submit', async e => {
  e.preventDefault();
  const res = $('#res');
  res.textContent = 'Buscando…';

  try {
    // A busca aceita título, autor ou ISBN. Pedimos só os campos necessários.
    const u = 'https://openlibrary.org/search.json?' + new URLSearchParams({
      q: $('#q').value.trim(),
      limit: 8,
      fields: 'key,title,author_name,cover_i,number_of_pages_median,first_publish_year'
    });
    const d = (await (await fetch(u)).json()).docs || [];

    res.textContent = '';
    if (!d.length) {
      res.textContent = 'Nenhum livro encontrado. Tente o ISBN ou outro título.';
      return;
    }

    // Cria um botão para cada livro encontrado
    d.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hit';

      // Miniatura da capa; se o livro não tem capa, usa um espaço vazio
      const im = b.cover_i
        ? Object.assign(document.createElement('img'), {
            src: `https://covers.openlibrary.org/b/id/${b.cover_i}-S.jpg`,
            alt: '',
            loading: 'lazy'
          })
        : Object.assign(document.createElement('div'), { className: 'ph' });

      // Título e "autor, ano" (textContent evita injetar HTML vindo da API)
      const tx = document.createElement('div');
      const t = document.createElement('b');
      t.textContent = b.title;
      const s = document.createElement('span');
      s.className = 'mut';
      s.textContent = [(b.author_name || [])[0], b.first_publish_year].filter(Boolean).join(', ');
      tx.append(t, s);
      btn.append(im, tx);

      // Ao clicar, escolhe este livro
      btn.onclick = () => pick({
        key: b.key,
        title: b.title,
        author: (b.author_name || [])[0] || '',
        cover_i: b.cover_i,
        pages: b.number_of_pages_median
      });
      res.append(btn);
    });
  } catch {
    res.textContent = 'Falha na busca. Verifique a conexão e tente de novo.';
  }
});

// Guarda o livro escolhido e mostra os passos 2 e 3
function pick(b) {
  book = b;
  edited = false;
  msg('');

  $('#bt').textContent = b.title;
  $('#ba').textContent = b.author;

  // Capa média; esconde a imagem se o livro não tiver capa
  const c = $('#cover');
  c.hidden = !b.cover_i;
  if (b.cover_i) c.src = `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`;
  $('#dl-cover').hidden = !b.cover_i;

  // Pré-preenche o total de páginas quando a API informa
  $('#tot').value = b.pages || '';
  $('#res').textContent = '';

  $('#step2').hidden = $('#step3').hidden = false;
  update();
}

/* ==========================================================
   2. Montagem do texto da publicação
   ========================================================== */

// Lê o progresso informado e devolve { pct, txt }, ou null se incompleto
function prog() {
  if ($('#mode').value === 'pagina') {
    // Modo página: calcula a porcentagem a partir de página atual / total
    const p = +$('#pg').value, t = +$('#tot').value;
    if (!p || !t) return null;
    return { pct: Math.min(100, Math.round(p / t * 100)), txt: `p. ${Math.min(p, t)}/${t}` };
  }
  // Modo porcentagem: usa o valor direto, limitado entre 0 e 100
  const v = $('#pc').value;
  if (v === '') return null;
  return { pct: Math.min(100, Math.max(0, Math.round(+v))), txt: '' };
}

// Monta o texto final da publicação
function build() {
  const g = prog();
  const fb = $('#fb').value.trim();
  const done = g && g.pct >= 100;   // 100% = livro terminado

  // Linha 1: situação, título e autor
  let t = `${done ? '✅ Terminei de ler' : '📖 Lendo'} “${book.title}”${book.author ? `, de ${book.author}` : ''}`;

  // Linha 2: barra de progresso com 10 blocos + porcentagem (+ página)
  if (g) {
    const n = Math.round(g.pct / 10);
    t += `\n${'▓'.repeat(n)}${'░'.repeat(10 - n)} ${g.pct}%${g.txt ? ` (${g.txt})` : ''}`;
  }

  // Opinião da pessoa
  if (fb) t += `\n\n${fb}`;

  // Hashtags
  t += '\n\n#Livros #Leitura #Bookstodon';

  // Link final, conforme a opção escolhida:
  //  - "capa": endereço direto da imagem da capa (se o livro não tiver capa,
  //    usa a página do livro no lugar)
  //  - "livro": página do livro no Open Library (o Mastodon costuma montar
  //    uma prévia com a capa a partir dela)
  //  - "nenhum": sem link
  const modo = $('#lnk').value;
  if (modo === 'capa' && book.cover_i) {
    t += `\nhttps://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
  } else if (modo !== 'nenhum' && book.key) {
    t += `\nhttps://openlibrary.org${book.key}`;
  }
  return t;
}

// Atualiza o texto final, a menos que a pessoa o tenha editado à mão
function update() {
  if (book && !edited) $('#out').value = build();
}

// Qualquer mudança nos campos refaz o texto automaticamente
['pg', 'tot', 'pc', 'fb', 'lnk'].forEach(i =>
  $('#' + i).addEventListener('input', () => { edited = false; update(); })
);

// Alterna entre os campos de "página" e de "porcentagem"
$('#mode').onchange = () => {
  const p = $('#mode').value === 'pagina';
  $('#byPage').hidden = !p;
  $('#byPct').hidden = p;
  edited = false;
  update();
};

// Se a pessoa editar o texto final, para de reescrevê-lo automaticamente
$('#out').addEventListener('input', () => edited = true);

/* ==========================================================
   3. Instâncias e compartilhamento
   ========================================================== */

// Limpa o que a pessoa digitou: tira "https://", barras finais e maiúsculas
function cleanInst(v) {
  return v.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
}

// Salva a lista de instâncias no navegador e redesenha a tela
function saveInsts() {
  LS.setItem('lm_insts', JSON.stringify(insts));
  renderInsts();
}

// Desenha a lista de sugestões e os atalhos das instâncias salvas
function renderInsts() {
  // Sugestões do autocompletar: instâncias salvas + populares (sem repetir)
  $('#dl').replaceChildren(...[...new Set([...insts, ...POP])].map(v =>
    Object.assign(document.createElement('option'), { value: v })
  ));

  // Um atalho por instância salva: clicar compartilha na hora; × remove
  const box = $('#chips');
  box.replaceChildren();
  insts.forEach(v => {
    const c = document.createElement('span');
    c.className = 'chip';

    const a = document.createElement('button');
    a.type = 'button';
    a.textContent = v;
    a.onclick = () => share(v);

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x';
    x.textContent = '×';
    x.setAttribute('aria-label', 'Remover ' + v);
    x.onclick = () => { insts = insts.filter(i => i !== v); saveInsts(); };

    c.append(a, x);
    box.append(c);
  });
}

// Abre a tela de publicar da instância com o texto já preenchido
function share(v) {
  const inst = cleanInst(v || $('#inst').value);
  if (!inst) {
    msg('Digite o endereço da sua instância (ex.: mastodon.social).', 1);
    return;
  }

  // Lembra a instância (no máximo 6, as mais recentes primeiro)
  if (!insts.includes(inst)) {
    insts.unshift(inst);
    insts = insts.slice(0, 6);
    saveInsts();
  }

  $('#inst').value = inst;
  msg('');
  // /share?text= é a rota do Mastodon que abre o compositor com o texto pronto
  window.open(`https://${inst}/share?text=${encodeURIComponent($('#out').value)}`, '_blank', 'noopener');
}

$('#go').onclick = () => share();
$('#inst').addEventListener('keydown', e => { if (e.key === 'Enter') share(); });

/* ---------- Copiar texto ---------- */
$('#copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('#out').value);
    msg('Texto copiado.');
  } catch {
    // Plano B: seleciona o texto para a pessoa copiar manualmente
    $('#out').select();
    msg('Selecione e copie o texto manualmente.', 1);
  }
};

/* ---------- Baixar capa ---------- */
$('#dl-cover').onclick = async () => {
  const url = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
  try {
    // Baixa a imagem e força o download como "capa.jpg"
    const b = await (await fetch(url)).blob();
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(b),
      download: 'capa.jpg'
    });
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    // Plano B: abre a imagem em outra aba para salvar manualmente
    window.open(url, '_blank', 'noopener');
    msg('Abri a capa em outra aba. Salve a imagem por lá.');
  }
};

/* ---------- Início ---------- */
renderInsts();   // mostra as instâncias salvas assim que a página abre
