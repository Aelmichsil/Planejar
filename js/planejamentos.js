/**
 * js/planejamentos.js
 * ──────────────────────────────────────────
 * CRUD completo de planejamentos e tarefas.
 *
 * Fluxo:
 *  - Lista planejamentos com filtros
 *  - Modal para criar / editar planejamento
 *  - Ao clicar em "Ver tarefas", exibe painel
 *    com as tarefas vinculadas ao planejamento
 *  - Modal para criar / editar tarefa
 * ──────────────────────────────────────────
 */

// ── Estado global da página ──
let planejamentos = [];         // Cache local
let tarefasPlanejamentoAtual = [];
let planejamentoSelecionado = null; // ID do planejamento aberto no painel de tarefas
let editandoPlanId = null;      // null = novo, string = editando
let editandoTarefaId = null;

// ── Ponto de entrada ──
async function initPlanejamentos() {
  const user = await requireAuth();
  if (!user) return;

  await populateUserInfo();
  document.getElementById('btn-logout')?.addEventListener('click', signOut);
  setupMobileMenu();

  // Verifica se há ?id= na URL (abre painel de tarefas direto)
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');

  await carregarPlanejamentos();

  if (idParam) {
    await abrirPainelTarefas(idParam);
  }

  // Botão abrir modal novo planejamento
  document.getElementById('btn-novo-plan')?.addEventListener('click', () => abrirModalPlan());

  // Formulário do modal planejamento
  document.getElementById('form-plan')?.addEventListener('submit', salvarPlanejamento);

  // Fechar modais
  document.getElementById('close-modal-plan')?.addEventListener('click', () => fecharModalPlan());
  document.getElementById('cancel-plan')?.addEventListener('click', () => fecharModalPlan());
  document.getElementById('close-modal-tarefa')?.addEventListener('click', () => fecharModalTarefa());
  document.getElementById('cancel-tarefa')?.addEventListener('click', () => fecharModalTarefa());

  // Formulário do modal tarefa
  document.getElementById('form-tarefa')?.addEventListener('submit', salvarTarefa);

  // Botão nova tarefa (dentro do painel)
  document.getElementById('btn-nova-tarefa')?.addEventListener('click', () => abrirModalTarefa());

  // Fechar painel de tarefas
  document.getElementById('btn-fechar-painel')?.addEventListener('click', fecharPainelTarefas);

  // Filtros
  document.getElementById('search-plan')?.addEventListener('input', filtrarPlanejamentos);
  document.getElementById('filter-status')?.addEventListener('change', filtrarPlanejamentos);
  document.getElementById('filter-priority')?.addEventListener('change', filtrarPlanejamentos);

  // Fechar modal ao clicar no overlay
  document.getElementById('modal-plan-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-plan-overlay') fecharModalPlan();
  });
  document.getElementById('modal-tarefa-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-tarefa-overlay') fecharModalTarefa();
  });
}

// ────────────────────────────────────────────
//  PLANEJAMENTOS — CRUD
// ────────────────────────────────────────────

/** Busca todos os planejamentos do usuário logado */
async function carregarPlanejamentos() {
  const tbody = document.getElementById('plan-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr class="loading-row"><td colspan="6">
    <span class="spinner"></span> Carregando planejamentos…
  </td></tr>`;

  try {
    const { data, error } = await supabaseClient
      .from('planejamentos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    planejamentos = data || [];
    renderizarPlanejamentos(planejamentos);

  } catch (err) {
    console.error('Erro ao carregar planejamentos:', err);
    tbody.innerHTML = `<tr class="loading-row"><td colspan="6">Erro ao carregar dados.</td></tr>`;
  }
}

/** Renderiza a lista de planejamentos na tabela */
function renderizarPlanejamentos(lista) {
  const tbody = document.getElementById('plan-tbody');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-icon">🗂️</div>
        <h3>Nenhum planejamento encontrado</h3>
        <p>Clique em "Novo Planejamento" para começar.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.title)}</strong></td>
      <td>
        <span class="badge badge-${p.status}">${labelStatus(p.status)}</span>
      </td>
      <td>
        <span class="badge badge-${p.priority}">${labelPrioridade(p.priority)}</span>
      </td>
      <td>${p.start_date ? formatarData(p.start_date) : '—'}</td>
      <td>${p.due_date  ? formatarData(p.due_date)  : '—'}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-secondary btn-sm" onclick="abrirPainelTarefas('${p.id}')">
            ✅ <span>Tarefas</span>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="abrirModalPlan('${p.id}')">
            ✏️
          </button>
          <button class="btn btn-danger btn-sm" onclick="excluirPlanejamento('${p.id}')">
            🗑️
          </button>
        </div>
      </td>
    </tr>`).join('');
}

/** Filtra a lista localmente por busca, status e prioridade */
function filtrarPlanejamentos() {
  const busca    = (document.getElementById('search-plan')?.value || '').toLowerCase();
  const status   = document.getElementById('filter-status')?.value  || '';
  const priority = document.getElementById('filter-priority')?.value || '';

  const filtrado = planejamentos.filter(p => {
    const matchBusca    = !busca    || p.title.toLowerCase().includes(busca) || (p.description || '').toLowerCase().includes(busca);
    const matchStatus   = !status   || p.status   === status;
    const matchPriority = !priority || p.priority === priority;
    return matchBusca && matchStatus && matchPriority;
  });

  renderizarPlanejamentos(filtrado);
}

/** Abre o modal de criação ou edição */
async function abrirModalPlan(id = null) {
  editandoPlanId = id;

  const modal = document.getElementById('modal-plan-overlay');
  const titulo = document.getElementById('modal-plan-title');
  const form   = document.getElementById('form-plan');

  form?.reset();
  document.getElementById('plan-alert')?.classList.remove('show');

  if (id) {
    // Modo edição — busca os dados atuais
    titulo.textContent = 'Editar Planejamento';

    const p = planejamentos.find(x => x.id === id);
    if (p) {
      form.querySelector('#plan-title').value       = p.title       || '';
      form.querySelector('#plan-description').value = p.description || '';
      form.querySelector('#plan-status').value      = p.status      || 'pending';
      form.querySelector('#plan-priority').value    = p.priority    || 'medium';
      form.querySelector('#plan-start').value       = p.start_date  || '';
      form.querySelector('#plan-due').value         = p.due_date    || '';
    }
  } else {
    titulo.textContent = 'Novo Planejamento';
  }

  modal?.classList.add('open');
}

function fecharModalPlan() {
  document.getElementById('modal-plan-overlay')?.classList.remove('open');
  editandoPlanId = null;
}

/** Salva (cria ou atualiza) um planejamento */
async function salvarPlanejamento(e) {
  e.preventDefault();

  const form  = e.target;
  const alert = document.getElementById('plan-alert');
  const btn   = document.querySelector('#modal-plan-overlay [type="submit"]');

  alert?.classList.remove('show');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  // Coleta os dados do formulário
  const payload = {
    title:       form.querySelector('#plan-title').value.trim(),
    description: form.querySelector('#plan-description').value.trim(),
    status:      form.querySelector('#plan-status').value,
    priority:    form.querySelector('#plan-priority').value,
    start_date:  form.querySelector('#plan-start').value || null,
    due_date:    form.querySelector('#plan-due').value   || null,
  };

  try {
    let error;

    if (editandoPlanId) {
      // ── Atualizar registro existente ──
      ({ error } = await supabaseClient
        .from('planejamentos')
        .update(payload)
        .eq('id', editandoPlanId));
    } else {
      // ── Inserir novo registro ──
      ({ error } = await supabaseClient
        .from('planejamentos')
        .insert(payload));
    }

    if (error) throw error;

    fecharModalPlan();
    await carregarPlanejamentos(); // recarrega a lista

  } catch (err) {
    console.error('Erro ao salvar planejamento:', err);
    if (alert) {
      alert.textContent = 'Erro ao salvar: ' + err.message;
      alert.classList.add('show');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
}

/** Exclui um planejamento (e suas tarefas via CASCADE no banco) */
async function excluirPlanejamento(id) {
  if (!confirm('Excluir este planejamento e todas as suas tarefas?')) return;

  try {
    const { error } = await supabaseClient
      .from('planejamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Se o painel deste planejamento estiver aberto, fecha
    if (planejamentoSelecionado === id) fecharPainelTarefas();

    await carregarPlanejamentos();

  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

// ────────────────────────────────────────────
//  TAREFAS — CRUD
// ────────────────────────────────────────────

/** Abre o painel lateral de tarefas de um planejamento */
async function abrirPainelTarefas(planId) {
  planejamentoSelecionado = planId;

  const painel = document.getElementById('painel-tarefas');
  const plan   = planejamentos.find(p => p.id === planId);

  if (painel) painel.style.display = 'block';

  // Exibe nome e metadados do planejamento no painel
  const titleEl = document.getElementById('painel-plan-title');
  const metaEl  = document.getElementById('painel-plan-meta');
  const descEl  = document.getElementById('painel-plan-desc');

  if (titleEl) titleEl.textContent = plan?.title || 'Tarefas';
  if (metaEl && plan) {
    metaEl.innerHTML = `
      <span class="badge badge-${plan.status}">${labelStatus(plan.status)}</span>
      <span class="badge badge-${plan.priority}">${labelPrioridade(plan.priority)}</span>
      ${plan.due_date ? `<span style="font-size:.82rem;color:var(--text-muted)">Prazo: ${formatarData(plan.due_date)}</span>` : ''}
    `;
  }
  if (descEl) descEl.textContent = plan?.description || '';

  await carregarTarefas(planId);

  // Rola até o painel
  painel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharPainelTarefas() {
  const painel = document.getElementById('painel-tarefas');
  if (painel) painel.style.display = 'none';
  planejamentoSelecionado = null;
}

/** Busca as tarefas do planejamento selecionado */
async function carregarTarefas(planId) {
  const tbody = document.getElementById('tarefas-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr class="loading-row"><td colspan="5">
    <span class="spinner"></span> Carregando tarefas…
  </td></tr>`;

  try {
    const { data, error } = await supabaseClient
      .from('tarefas')
      .select('*')
      .eq('planejamento_id', planId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    tarefasPlanejamentoAtual = data || [];
    renderizarTarefas(tarefasPlanejamentoAtual);

  } catch (err) {
    console.error('Erro ao carregar tarefas:', err);
    tbody.innerHTML = `<tr class="loading-row"><td colspan="5">Erro ao carregar tarefas.</td></tr>`;
  }
}

/** Renderiza as tarefas na tabela do painel */
function renderizarTarefas(lista) {
  const tbody = document.getElementById('tarefas-tbody');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>Nenhuma tarefa cadastrada</h3>
        <p>Clique em "Nova Tarefa" para adicionar.</p>
      </div>
    </td></tr>`;
    return;
  }

  // Verifica tarefas atrasadas: prazo < hoje e não concluídas
  const hoje = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = lista.map(t => {
    const atrasada = t.due_date && t.due_date < hoje && t.status !== 'done';
    const statusBadge = atrasada
      ? `<span class="badge badge-overdue">Atrasada</span>`
      : `<span class="badge badge-${t.status}">${labelStatusTarefa(t.status)}</span>`;

    return `
    <tr>
      <td><strong>${escapeHtml(t.title)}</strong></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.description || '—')}</td>
      <td>${statusBadge}</td>
      <td>${t.due_date ? formatarData(t.due_date) : '—'}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-secondary btn-sm" onclick="abrirModalTarefa('${t.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="excluirTarefa('${t.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/** Abre o modal para criar ou editar uma tarefa */
function abrirModalTarefa(id = null) {
  editandoTarefaId = id;

  const modal  = document.getElementById('modal-tarefa-overlay');
  const titulo = document.getElementById('modal-tarefa-title');
  const form   = document.getElementById('form-tarefa');

  form?.reset();
  document.getElementById('tarefa-alert')?.classList.remove('show');

  if (id) {
    titulo.textContent = 'Editar Tarefa';
    const t = tarefasPlanejamentoAtual.find(x => x.id === id);
    if (t) {
      form.querySelector('#tarefa-title').value       = t.title       || '';
      form.querySelector('#tarefa-description').value = t.description || '';
      form.querySelector('#tarefa-status').value      = t.status      || 'pending';
      form.querySelector('#tarefa-due').value         = t.due_date    || '';
    }
  } else {
    titulo.textContent = 'Nova Tarefa';
  }

  modal?.classList.add('open');
}

function fecharModalTarefa() {
  document.getElementById('modal-tarefa-overlay')?.classList.remove('open');
  editandoTarefaId = null;
}

/** Salva (cria ou atualiza) uma tarefa */
async function salvarTarefa(e) {
  e.preventDefault();

  if (!planejamentoSelecionado) {
    alert('Nenhum planejamento selecionado.');
    return;
  }

  const form  = e.target;
  const alert = document.getElementById('tarefa-alert');
  const btn   = document.querySelector('#modal-tarefa-overlay [type="submit"]');

  alert?.classList.remove('show');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const payload = {
    title:             form.querySelector('#tarefa-title').value.trim(),
    description:       form.querySelector('#tarefa-description').value.trim(),
    status:            form.querySelector('#tarefa-status').value,
    due_date:          form.querySelector('#tarefa-due').value || null,
    planejamento_id:   planejamentoSelecionado,
  };

  try {
    let error;

    if (editandoTarefaId) {
      ({ error } = await supabaseClient
        .from('tarefas')
        .update(payload)
        .eq('id', editandoTarefaId));
    } else {
      ({ error } = await supabaseClient
        .from('tarefas')
        .insert(payload));
    }

    if (error) throw error;

    fecharModalTarefa();
    await carregarTarefas(planejamentoSelecionado);

  } catch (err) {
    console.error('Erro ao salvar tarefa:', err);
    if (alert) {
      alert.textContent = 'Erro ao salvar: ' + err.message;
      alert.classList.add('show');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
}

/** Exclui uma tarefa */
async function excluirTarefa(id) {
  if (!confirm('Excluir esta tarefa?')) return;

  try {
    const { error } = await supabaseClient
      .from('tarefas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await carregarTarefas(planejamentoSelecionado);

  } catch (err) {
    alert('Erro ao excluir tarefa: ' + err.message);
  }
}

// ── Utilitários ──

function labelStatus(s) {
  return { pending:'Pendente', in_progress:'Em andamento', done:'Concluído', cancelled:'Cancelado' }[s] || s;
}
function labelStatusTarefa(s) {
  return { pending:'Pendente', in_progress:'Em andamento', done:'Concluída', cancelled:'Cancelada' }[s] || s;
}
function labelPrioridade(p) {
  return { high:'Alta', medium:'Média', low:'Baixa' }[p] || p;
}
function formatarData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function escapeHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function setupMobileMenu() {
  const toggle  = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('active');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

document.addEventListener('DOMContentLoaded', initPlanejamentos);
