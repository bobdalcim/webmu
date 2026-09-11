const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const GAMES = {
  mu: 'Mu Online',
  priston: 'Priston Tale',
  ragnarok: 'Ragnarok',
  tibia: 'Tibia',
  pw: 'Perfect World',
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

function setError(el, msg) {
  el.textContent = msg;
  show(el);
}

// ---- autenticação --------------------------------------------------------

function bindAuthForms() {
  $$('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $('#signin-form').hidden = target !== 'signin';
      $('#signup-form').hidden = target !== 'signup';
    });
  });

  $('#signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#signin-error');
    hide(errEl);
    const data = Object.fromEntries(new FormData(e.target).entries());
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: data.email.trim(),
      password: data.password,
    });
    if (error) setError(errEl, traduzErro(error));
  });

  $('#signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#signup-error');
    const okEl = $('#signup-success');
    hide(errEl);
    hide(okEl);
    const data = Object.fromEntries(new FormData(e.target).entries());
    const { data: signUpData, error } = await supabaseClient.auth.signUp({
      email: data.email.trim(),
      password: data.password,
    });
    if (error) {
      setError(errEl, traduzErro(error));
      return;
    }
    e.target.reset();
    if (signUpData.session) {
      okEl.textContent = 'Conta criada! Redirecionando...';
    } else {
      okEl.textContent = 'Conta criada! Confirme seu e-mail (verifique a caixa de entrada) antes de entrar.';
    }
    show(okEl);
  });

  $('#sign-out-btn').addEventListener('click', () => supabaseClient.auth.signOut());
  $('#no-access-signout').addEventListener('click', () => supabaseClient.auth.signOut());
}

function traduzErro(error) {
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
  if (msg.includes('Password should be')) return 'Senha muito curta (mínimo 6 caracteres).';
  return msg || 'Algo deu errado. Tente de novo.';
}

// ---- dashboard --------------------------------------------------------

let SERVERS_CACHE = [];

function pendingCardHTML(s) {
  const created = new Date(s.created_at).toLocaleString('pt-BR');
  if (s.kind === 'guild') {
    return `
      <div class="admin-row bracketed" data-id="${s.id}">
        <div class="admin-row-main">
          <p class="server-name">${escapeHtml(s.name)} <span class="stat-chip">guild</span></p>
          <div class="server-meta">
            <span class="stat-chip">${GAMES[s.game] || s.game}</span>
            <span>joga em ${escapeHtml(s.server ? s.server.name : '—')}</span>
          </div>
          <div class="admin-row-details">
            ${s.link ? `<a href="${escapeHtml(s.link)}" target="_blank" rel="noopener">${escapeHtml(s.link)}</a>` : ''}
            <span>contato: ${escapeHtml(s.contact_email)}</span>
            <span>${created}</span>
          </div>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-gold" data-approve="${s.id}">aprovar</button>
          <button class="btn" data-reject="${s.id}">rejeitar</button>
        </div>
      </div>`;
  }
  return `
    <div class="admin-row bracketed" data-id="${s.id}">
      <div class="admin-row-main">
        <p class="server-name">${escapeHtml(s.name)}</p>
        <div class="server-meta">
          <span class="stat-chip">${GAMES[s.game] || s.game}</span>
          <span class="stat-chip">rate x${s.rate}</span>
          <span class="stat-chip">${s.phase}</span>
        </div>
        <div class="admin-row-details">
          <a href="${escapeHtml(s.link)}" target="_blank" rel="noopener">${escapeHtml(s.link)}</a>
          <span>contato: ${escapeHtml(s.contact_email)}</span>
          <span>${created}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn btn-gold" data-approve="${s.id}">aprovar</button>
        <button class="btn" data-reject="${s.id}">rejeitar</button>
      </div>
    </div>`;
}

function serverRowAdminHTML(s) {
  return `
    <div class="admin-row" data-id="${s.id}">
      <div class="admin-row-main">
        <p class="server-name">${escapeHtml(s.name)}</p>
        <div class="server-meta">
          <span class="stat-chip">${GAMES[s.game] || s.game}</span>
          <span class="stat-chip">rate x${s.rate}</span>
          <span class="stat-chip">${s.votes} votos</span>
          <span><span class="status-dot${s.online ? ' online' : ''}"></span>${s.online ? 'online' : 'offline'}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn" data-edit-server="${s.id}">editar</button>
        <button class="btn" data-toggle-online="${s.id}">${s.online ? 'marcar offline' : 'marcar online'}</button>
        <button class="btn" data-delete-server="${s.id}">excluir</button>
      </div>
    </div>`;
}

function guildRowAdminHTML(g) {
  return `
    <div class="admin-row" data-id="${g.id}">
      <div class="admin-row-main">
        <p class="server-name">${escapeHtml(g.name)}</p>
        <div class="server-meta">
          <span class="stat-chip">${GAMES[g.game] || g.game}</span>
          <span>joga em ${escapeHtml(g.server ? g.server.name : '—')}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn" data-delete-guild="${g.id}">excluir</button>
      </div>
    </div>`;
}

async function loadPending() {
  const { data, error } = await supabaseClient
    .from('submissions')
    .select('*, server:servers(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const list = $('#pending-list');
  if (error) {
    list.innerHTML = `<div class="empty-state">erro ao carregar envios: ${escapeHtml(error.message)}</div>`;
    return;
  }
  $('#pending-count').textContent = data.length ? `(${data.length})` : '';
  list.innerHTML = data.length
    ? data.map(pendingCardHTML).join('')
    : `<div class="empty-state">nenhum envio pendente.</div>`;
}

async function loadServers() {
  const { data, error } = await supabaseClient
    .from('servers')
    .select('*')
    .order('votes', { ascending: false });

  const list = $('#servers-list');
  if (error) {
    list.innerHTML = `<div class="empty-state">erro ao carregar servidores: ${escapeHtml(error.message)}</div>`;
    return;
  }
  SERVERS_CACHE = data;
  list.innerHTML = data.length
    ? data.map(serverRowAdminHTML).join('')
    : `<div class="empty-state">nenhum servidor cadastrado.</div>`;
}

async function loadGuilds() {
  const { data, error } = await supabaseClient
    .from('guilds')
    .select('*, server:servers(name)')
    .order('created_at', { ascending: false });

  const list = $('#guilds-list');
  if (error) {
    list.innerHTML = `<div class="empty-state">erro ao carregar guilds: ${escapeHtml(error.message)}</div>`;
    return;
  }
  list.innerHTML = data.length
    ? data.map(guildRowAdminHTML).join('')
    : `<div class="empty-state">nenhuma guild cadastrada.</div>`;
}

async function refreshDashboard() {
  await Promise.all([loadPending(), loadServers(), loadGuilds()]);
}

async function approveSubmission(id, btn) {
  btn.disabled = true;
  const { data: submission, error: fetchErr } = await supabaseClient
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !submission) {
    alert('Não achei esse envio (pode já ter sido processado).');
    refreshDashboard();
    return;
  }

  const insert = submission.kind === 'guild'
    ? supabaseClient.from('guilds').insert({
      name: submission.name,
      game: submission.game,
      server_id: submission.server_id,
    })
    : supabaseClient.from('servers').insert({
      name: submission.name,
      game: submission.game,
      rate: submission.rate,
      online: true,
      phase: submission.phase,
      tier: 'normal',
      votes: 0,
      link: submission.link,
    });

  const { error: insertErr } = await insert;

  if (insertErr) {
    alert('Falha ao publicar: ' + insertErr.message);
    btn.disabled = false;
    return;
  }

  await supabaseClient.from('submissions').update({ status: 'approved' }).eq('id', id);
  refreshDashboard();
}

async function rejectSubmission(id, btn) {
  btn.disabled = true;
  const { error } = await supabaseClient.from('submissions').update({ status: 'rejected' }).eq('id', id);
  if (error) alert('Falha ao rejeitar: ' + error.message);
  refreshDashboard();
}

async function toggleOnline(id, btn) {
  btn.disabled = true;
  const { data: server } = await supabaseClient.from('servers').select('online').eq('id', id).single();
  if (!server) { refreshDashboard(); return; }
  const { error } = await supabaseClient.from('servers').update({ online: !server.online }).eq('id', id);
  if (error) alert('Falha ao atualizar status: ' + error.message);
  refreshDashboard();
}

async function deleteServer(id, btn) {
  if (!confirm('Excluir este servidor da listagem pública?')) return;
  btn.disabled = true;
  const { error } = await supabaseClient.from('servers').delete().eq('id', id);
  if (error) alert('Falha ao excluir: ' + error.message);
  refreshDashboard();
}

async function deleteGuild(id, btn) {
  if (!confirm('Excluir esta guild da listagem pública?')) return;
  btn.disabled = true;
  const { error } = await supabaseClient.from('guilds').delete().eq('id', id);
  if (error) alert('Falha ao excluir: ' + error.message);
  refreshDashboard();
}

// ---- editar servidor --------------------------------------------------------

function bindEditDialog() {
  const dialog = $('#edit-server-dialog');
  const form = $('#edit-server-form');
  const errorEl = $('#edit-error');

  function openEditDialog(id) {
    const server = SERVERS_CACHE.find((s) => s.id === id);
    if (!server) return;
    errorEl.hidden = true;
    form.server_id.value = server.id;
    form.name.value = server.name;
    form.game.value = server.game;
    form.rate.value = server.rate;
    form.phase.value = server.phase;
    form.tier.value = server.tier;
    form.link.value = server.link || '';
    form.votes.value = server.votes;
    form.online.checked = server.online;
    dialog.showModal();
  }

  $$('[data-close-edit]').forEach((el) => el.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  $('#servers-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-server]');
    if (editBtn) openEditDialog(editBtn.dataset.editServer);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const submitBtn = $('#edit-submit');
    submitBtn.disabled = true;

    const payload = {
      name: form.name.value.trim(),
      game: form.game.value,
      rate: Number(form.rate.value),
      phase: form.phase.value,
      tier: form.tier.value,
      link: form.link.value.trim() || null,
      votes: Number(form.votes.value),
      online: form.online.checked,
    };

    const { error } = await supabaseClient.from('servers').update(payload).eq('id', form.server_id.value);
    submitBtn.disabled = false;

    if (error) {
      errorEl.textContent = 'Falha ao salvar: ' + error.message;
      errorEl.hidden = false;
      return;
    }

    dialog.close();
    refreshDashboard();
  });
}

function bindDashboardEvents() {
  $('#pending-list').addEventListener('click', (e) => {
    const approveBtn = e.target.closest('[data-approve]');
    if (approveBtn) return approveSubmission(approveBtn.dataset.approve, approveBtn);
    const rejectBtn = e.target.closest('[data-reject]');
    if (rejectBtn) return rejectSubmission(rejectBtn.dataset.reject, rejectBtn);
  });

  $('#servers-list').addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-online]');
    if (toggleBtn) return toggleOnline(toggleBtn.dataset.toggleOnline, toggleBtn);
    const deleteBtn = e.target.closest('[data-delete-server]');
    if (deleteBtn) return deleteServer(deleteBtn.dataset.deleteServer, deleteBtn);
  });

  $('#guilds-list').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-guild]');
    if (deleteBtn) return deleteGuild(deleteBtn.dataset.deleteGuild, deleteBtn);
  });

  bindEditDialog();
}

// ---- roteamento por estado de sessão --------------------------------------------------

function showSection(id) {
  ['auth-section', 'no-access-section', 'dashboard-section'].forEach((s) => {
    $('#' + s).hidden = s !== id;
  });
}

async function handleSession(session) {
  const whoami = $('#whoami');
  const signOutBtn = $('#sign-out-btn');

  if (!session) {
    hide(whoami);
    hide(signOutBtn);
    showSection('auth-section');
    return;
  }

  whoami.textContent = session.user.email;
  show(whoami);
  show(signOutBtn);

  const { data: isAdmin, error } = await supabaseClient.rpc('is_admin');

  if (error || !isAdmin) {
    $('#no-access-msg').textContent = `Conectado como ${session.user.email}, mas essa conta ainda não tem permissão de administrador.`;
    showSection('no-access-section');
    return;
  }

  showSection('dashboard-section');
  refreshDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!supabaseClient) {
    document.body.innerHTML = '<p style="padding:40px;font-family:monospace">Supabase indisponível.</p>';
    return;
  }

  bindAuthForms();
  bindDashboardEvents();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });

  supabaseClient.auth.getSession().then(({ data }) => handleSession(data.session));
});
