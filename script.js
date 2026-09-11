// ---- Supabase --------------------------------------------------------
// Chave "anon"/"publishable" — feita para ficar no client, protegida pelas
// políticas de RLS do banco (só permitem leitura pública e inserção de votos).

const SUPABASE_URL = 'https://qgrdlglzadsriluzeren.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-s554Nv0F7DFE0aXn3jWwA_ti6iXccm';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ---- dados de fallback --------------------------------------------------
// Usados só se o Supabase estiver fora do ar / sem internet, para o site
// nunca ficar em branco.

const GAMES = {
  mu: 'Mu Online',
  priston: 'Priston Tale',
  ragnarok: 'Ragnarok',
  tibia: 'Tibia',
  pw: 'Perfect World',
};

const RATE_TIERS = {
  baixo: { label: 'baixo (x1–x50)', test: (r) => r <= 50 },
  medio: { label: 'médio (x50–x1000)', test: (r) => r > 50 && r <= 1000 },
  alto: { label: 'alto (x1000+)', test: (r) => r > 1000 },
};

const PHASES = {
  lancamento: 'lançamento',
  'open-beta': 'open beta',
  maturo: 'mature / estável',
};

const FALLBACK_SERVERS = [
  { id: 's1', name: 'Dragon MU Classic', game: 'mu', rate: 1000, online: true, phase: 'maturo', tier: 'legend', votes: 1245 },
  { id: 's2', name: 'Old School Priston', game: 'priston', rate: 5, online: false, phase: 'maturo', tier: 'normal', votes: 340 },
  { id: 's3', name: 'Ragna Genesis X10', game: 'ragnarok', rate: 10, online: true, phase: 'open-beta', tier: 'rare', votes: 689 },
  { id: 's4', name: 'Tibia Global Reborn', game: 'tibia', rate: 3, online: true, phase: 'maturo', tier: 'normal', votes: 512 },
  { id: 's5', name: 'Legend MU Season 19', game: 'mu', rate: 1000, online: true, phase: 'lancamento', tier: 'legend', votes: 980 },
  { id: 's6', name: 'Perfect Sky Reborn', game: 'pw', rate: 50, online: true, phase: 'open-beta', tier: 'normal', votes: 210 },
  { id: 's7', name: 'MU Fenix Season 6', game: 'mu', rate: 500, online: false, phase: 'lancamento', tier: 'normal', votes: 88 },
  { id: 's8', name: 'Priston World X10', game: 'priston', rate: 10, online: true, phase: 'lancamento', tier: 'rare', votes: 415 },
];

const FALLBACK_GUILDS = [
  { id: 'g1', name: 'Guild Fenix Wars', game: 'mu', serverName: 'Dragon MU Classic' },
];

const DESTAQUES = [
  { title: 'Legend MU Season 19', game: 'mu', rate: '1000', online: true },
  { title: 'Priston World X10', game: 'priston', rate: '10', online: true },
  { title: 'Ragna Ashes Reborn', game: 'ragnarok', rate: '5', online: false },
];

const PAGE_SIZE = 4;

let SERVERS = FALLBACK_SERVERS;
let GUILDS = FALLBACK_GUILDS;

// ---- estado --------------------------------------------------------------

const state = {
  game: 'mu',
  rate: new Set(),
  status: new Set(),
  phase: new Set(),
  search: '',
  visible: PAGE_SIZE,
};

const VOTED_KEY = 'classifimudos:voted';
function getVoted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function saveVoted(set) {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...set]));
  } catch {
    /* localStorage indisponível (modo privado etc.) — segue sem persistir */
  }
}

const VOTER_KEY = 'classifimudos:voter_id';
function getVoterId() {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2);
  }
}

// ---- carregar dados do Supabase --------------------------------------------------

async function loadData() {
  if (!supabaseClient) return;

  const [serversRes, guildsRes] = await Promise.all([
    supabaseClient.from('servers').select('*').order('votes', { ascending: false }),
    supabaseClient.from('guilds').select('id, name, game, server:servers(name)'),
  ]);

  if (serversRes.error) throw serversRes.error;
  if (guildsRes.error) throw guildsRes.error;

  SERVERS = serversRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    game: s.game,
    rate: s.rate,
    online: s.online,
    phase: s.phase,
    tier: s.tier,
    votes: s.votes,
  }));

  GUILDS = guildsRes.data.map((g) => ({
    id: g.id,
    name: g.name,
    game: g.game,
    serverName: g.server ? g.server.name : '—',
  }));
}

// ---- helpers de DOM --------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function safeLink(url) {
  if (!url) return '#';
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '#';
  } catch {
    return '#';
  }
}

function statusDot(online) {
  return `<span class="status-dot${online ? ' online' : ''}"></span>${online ? 'online' : 'offline'}`;
}

function tierClass(tier) {
  if (tier === 'legend') return 'tier-legend';
  if (tier === 'rare') return 'tier-rare';
  return '';
}

function serverRowHTML(s) {
  const voted = getVoted().has(s.id);
  return `
    <div class="server-row ${tierClass(s.tier)}" data-id="${s.id}">
      <div class="server-icon"></div>
      <div>
        <p class="server-name">${escapeHtml(s.name)}</p>
        <div class="server-meta">
          <span class="stat-chip">${GAMES[s.game]}</span>
          <span class="stat-chip">rate x${s.rate}</span>
          <span>${statusDot(s.online)}</span>
        </div>
      </div>
      <button class="server-votes${voted ? ' voted' : ''}" data-vote="${s.id}" ${voted ? 'disabled' : ''}>
        ${voted ? 'votado ✓' : 'votar'}<b>${s.votes}</b>
      </button>
      <a class="btn" href="${safeLink(s.link)}" target="_blank" rel="noopener">ver detalhes</a>
    </div>`;
}

function guildRowHTML(g) {
  return `
    <div class="guild-row bracketed">
      <div class="guild-icon"></div>
      <div>
        <p class="server-name">${escapeHtml(g.name)}</p>
        <div class="server-meta"><span class="stat-chip">guild</span><span>joga em ${escapeHtml(g.serverName)}</span></div>
      </div>
      <a class="btn" href="#">ver guild</a>
    </div>`;
}

// ---- filtro + render --------------------------------------------------------

function matchesFilters(s) {
  if (state.game !== 'all' && s.game !== state.game) return false;
  if (state.status.size && !state.status.has(s.online ? 'online' : 'offline')) return false;
  if (state.phase.size && !state.phase.has(s.phase)) return false;
  if (state.rate.size) {
    const inSelectedTier = [...state.rate].some((key) => RATE_TIERS[key].test(s.rate));
    if (!inSelectedTier) return false;
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    if (!s.name.toLowerCase().includes(q) && !GAMES[s.game].toLowerCase().includes(q)) return false;
  }
  return true;
}

function render() {
  const list = $('#server-list');
  const filtered = SERVERS.filter(matchesFilters);
  const visible = filtered.slice(0, state.visible);

  const guildHTML = GUILDS.filter((g) => state.game === 'all' || g.game === state.game)
    .map(guildRowHTML)
    .join('');

  if (!visible.length) {
    list.innerHTML = `<div class="empty-state">nenhum servidor encontrado com esses filtros.</div>`;
  } else {
    list.innerHTML = visible.map(serverRowHTML).join('') + guildHTML;
  }

  const loadMoreBtn = $('#load-more');
  const hasMore = state.visible < filtered.length;
  loadMoreBtn.style.display = filtered.length > PAGE_SIZE ? 'block' : 'none';
  loadMoreBtn.disabled = !hasMore;
  loadMoreBtn.textContent = hasMore ? 'carregar mais servidores' : 'todos os servidores carregados';

  $$('.sidebar-item[data-game]').forEach((el) => {
    el.classList.toggle('active', el.dataset.game === state.game);
  });
  $$('.filter-pill[data-game]').forEach((el) => {
    el.classList.toggle('active', el.dataset.game === state.game);
  });
  $$('.sidebar-item[data-rate]').forEach((el) => el.classList.toggle('active', state.rate.has(el.dataset.rate)));
  $$('.sidebar-item[data-status]').forEach((el) => el.classList.toggle('active', state.status.has(el.dataset.status)));
  $$('.sidebar-item[data-phase]').forEach((el) => el.classList.toggle('active', state.phase.has(el.dataset.phase)));
}

function renderDestaques() {
  const grid = $('#destaques-grid');
  grid.innerHTML = DESTAQUES.map((d) => `
    <div class="destaque-card bracketed">
      <div class="destaque-banner">banner 728×90</div>
      <p class="destaque-title">${escapeHtml(d.title)}</p>
      <div class="destaque-meta">
        <span class="stat-chip">${GAMES[d.game]}</span>
        <span class="stat-chip">rate x${d.rate}</span>
        <span>${statusDot(d.online)}</span>
      </div>
    </div>`).join('');
}

// ---- eventos --------------------------------------------------------

function toggleSetFilter(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

async function handleVote(id, btn) {
  const voted = getVoted();
  if (voted.has(id)) return;

  const server = SERVERS.find((s) => s.id === id);
  if (!server) return;

  btn.disabled = true;

  if (!supabaseClient) {
    server.votes += 1;
    voted.add(id);
    saveVoted(voted);
    render();
    return;
  }

  const { error } = await supabaseClient.from('votes').insert({
    server_id: id,
    voter_id: getVoterId(),
  });

  if (error && error.code !== '23505') {
    // erro real (rede, RLS, etc.) — libera o botão pra tentar de novo
    console.error('Falha ao votar:', error);
    btn.disabled = false;
    return;
  }

  // sucesso, ou 23505 = já tinha votado antes (unique constraint) — sincroniza local
  if (!error) server.votes += 1;
  voted.add(id);
  saveVoted(voted);
  render();
}

function bindEvents() {
  $$('.filter-pill[data-game]').forEach((el) => {
    el.addEventListener('click', () => {
      state.game = el.dataset.game;
      state.visible = PAGE_SIZE;
      render();
    });
  });

  $$('.sidebar-item[data-game]').forEach((el) => {
    el.addEventListener('click', () => {
      state.game = el.dataset.game;
      state.visible = PAGE_SIZE;
      render();
    });
  });

  $$('.sidebar-item[data-rate]').forEach((el) => {
    el.addEventListener('click', () => {
      toggleSetFilter(state.rate, el.dataset.rate);
      state.visible = PAGE_SIZE;
      render();
    });
  });

  $$('.sidebar-item[data-status]').forEach((el) => {
    el.addEventListener('click', () => {
      toggleSetFilter(state.status, el.dataset.status);
      state.visible = PAGE_SIZE;
      render();
    });
  });

  $$('.sidebar-item[data-phase]').forEach((el) => {
    el.addEventListener('click', () => {
      toggleSetFilter(state.phase, el.dataset.phase);
      state.visible = PAGE_SIZE;
      render();
    });
  });

  const searchInput = $('#search-input');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = searchInput.value.trim();
      state.visible = PAGE_SIZE;
      render();
    }, 150);
  });

  $('#load-more').addEventListener('click', () => {
    state.visible += PAGE_SIZE;
    render();
  });

  $('#server-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-vote]');
    if (!btn) return;
    handleVote(btn.dataset.vote, btn);
  });
}

// ---- modal: anunciar servidor --------------------------------------------------

function bindAnnounceDialog() {
  const dialog = $('#announce-dialog');
  const form = $('#announce-form');
  const errorEl = $('#announce-error');
  const successEl = $('#announce-success');
  const submitBtn = $('#announce-submit');

  function resetMessages() {
    errorEl.hidden = true;
    successEl.hidden = true;
  }

  function openDialog() {
    form.reset();
    resetMessages();
    dialog.showModal();
  }

  $$('[data-open-announce]').forEach((el) => el.addEventListener('click', openDialog));
  $$('[data-close-announce]').forEach((el) => el.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetMessages();

    if (!supabaseClient) {
      errorEl.textContent = 'Envio indisponível no momento (sem conexão com o servidor). Tente novamente mais tarde.';
      errorEl.hidden = false;
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      name: data.name.trim(),
      game: data.game,
      rate: Number(data.rate),
      phase: data.phase,
      link: data.link.trim(),
      contact_email: data.contact_email.trim(),
      status: 'pending',
    };

    if (!payload.name || !payload.link || !payload.contact_email || !(payload.rate > 0)) {
      errorEl.textContent = 'Preencha todos os campos corretamente.';
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'enviando...';

    const { error } = await supabaseClient.from('submissions').insert(payload);

    submitBtn.disabled = false;
    submitBtn.textContent = 'enviar para análise';

    if (error) {
      console.error('Falha ao enviar anúncio:', error);
      errorEl.textContent = 'Não foi possível enviar agora. Tente de novo em instantes.';
      errorEl.hidden = false;
      return;
    }

    form.reset();
    successEl.hidden = false;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderDestaques();
  bindEvents();
  bindAnnounceDialog();
  render();

  try {
    await loadData();
    render();
  } catch (err) {
    console.error('Não foi possível carregar dados do Supabase, usando dados locais:', err);
  }
});
