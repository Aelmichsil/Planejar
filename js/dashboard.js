/**
 * js/dashboard.js
 * ──────────────────────────────────────────
 * Lógica do dashboard: busca os totais de
 * planejamentos e tarefas e exibe nos cards.
 * ──────────────────────────────────────────
 */

/** Ponto de entrada — executa quando a página carrega */
async function initDashboard() {
  // 1. Verifica autenticação; aborta se não logado
  const user = await requireAuth();
  if (!user) return;

  // 2. Preenche avatar/email na sidebar
  await populateUserInfo();

  // 3. Configura botão de logout
  document.getElementById('btn-logout')?.addEventListener('click', signOut);

  // 4. Configura toggle do menu mobile
  setupMobileMenu();

  // 5. Carrega os dados dos cards
  await carregarEstatisticas();

  // 6. Carrega planejamentos recentes na tabela
  await carregarRecentes();
}

/** Busca contagens no Supabase e atualiza os cards */
async function carregarEstatisticas() {
  try {
    // ── Total de planejamentos do usuário logado ──
    const { count: totalPlan } = await supabaseClient
      .from('planejamentos')
      .select('*', { count: 'exact', head: true });

    // ── Tarefas pendentes (status = 'pending') ──
    const { count: pendentes } = await supabaseClient
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // ── Tarefas concluídas (status = 'done') ──
    const { count: concluidas } = await supabaseClient
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done');

    // ── Tarefas atrasadas: prazo < hoje e não concluídas ──
    const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { count: atrasadas } = await supabaseClient
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .lt('due_date', hoje)
      .neq('status', 'done');

    // Atualiza os cards com os valores
    setCardValue('stat-total-plan',    totalPlan  ?? 0);
    setCardValue('stat-pendentes',     pendentes  ?? 0);
    setCardValue('stat-concluidas',    concluidas ?? 0);
    setCardValue('stat-atrasadas',     atrasadas  ?? 0);

  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err);
  }
}

/** Atualiza o valor numérico de um card animando a transição */
function setCardValue(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('loading');
  el.textContent = valor;
}

/** Carrega os 5 planejamentos mais recentes na tabela do dashboard */
async function carregarRecentes() {
  const tbody = document.getElementById('recentes-body');
  if (!tbody) return;

  try {
    const { data, error } = await supabaseClient
      .from('planejamentos')
      .select('id, title, status, priority, due_date')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>Nenhum planejamento ainda</h3>
            <p>Crie seu primeiro planejamento para começar.</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td><span class="badge badge-${p.status}">${labelStatus(p.status)}</span></td>
        <td><span class="badge badge-${p.priority}">${labelPrioridade(p.priority)}</span></td>
        <td>${p.due_date ? formatarData(p.due_date) : '—'}</td>
        <td>
          <div class="row-actions">
            <a href="planejamentos.html?id=${p.id}" class="btn btn-secondary btn-sm">
              <span>Ver tarefas</span>
            </a>
          </div>
        </td>
      </tr>`).join('');

  } catch (err) {
    console.error('Erro ao carregar recentes:', err);
    tbody.innerHTML = `<tr class="loading-row"><td colspan="5">Erro ao carregar dados.</td></tr>`;
  }
}

// ── Utilitários de formatação ──

function labelStatus(s) {
  return { pending: 'Pendente', in_progress: 'Em andamento', done: 'Concluído', cancelled: 'Cancelado' }[s] || s;
}
function labelPrioridade(p) {
  return { high: 'Alta', medium: 'Média', low: 'Baixa' }[p] || p;
}
function formatarData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function escapeHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/** Configura toggle do menu lateral no mobile */
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

// Inicia o dashboard quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDashboard);
