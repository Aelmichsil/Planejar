/**
 * js/auth.js
 * ──────────────────────────────────────────
 * Gerencia login, cadastro, logout e verificação
 * de sessão usando Supabase Auth.
 * ──────────────────────────────────────────
 */

/** Redireciona para o login se não houver sessão ativa */
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session.user;
}

/** Redireciona para o dashboard se já estiver logado */
async function redirectIfLoggedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.href = 'dashboard.html';
}

/** Preenche informações do usuário na sidebar */
async function populateUserInfo() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const emailEl  = document.getElementById('user-email');
  const nameEl   = document.getElementById('user-name');
  const avatarEl = document.getElementById('user-avatar');

  const email  = user.email || '';
  const name   = user.user_metadata?.full_name || email.split('@')[0];
  const initials = name.slice(0, 2).toUpperCase();

  if (emailEl)  emailEl.textContent  = email;
  if (nameEl)   nameEl.textContent   = name;
  if (avatarEl) avatarEl.textContent = initials;
}

/** Realiza o login com e-mail e senha */
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Cria uma nova conta com e-mail e senha */
async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/** Desloga o usuário e redireciona para o login */
async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// ── Listeners de eventos para as páginas de auth ──

/** Configura o formulário de login (login.html) */
function setupLoginForm() {
  const form    = document.getElementById('login-form');
  const alertEl = document.getElementById('auth-alert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;
    const btn      = form.querySelector('[type="submit"]');

    alertEl.classList.remove('show');
    btn.disabled = true;
    btn.textContent = 'Entrando…';

    try {
      await signIn(email, password);
      window.location.href = 'dashboard.html';
    } catch (err) {
      alertEl.textContent = traduzirErro(err.message);
      alertEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

/** Configura o formulário de cadastro (login.html — tab cadastro) */
function setupRegisterForm() {
  const form    = document.getElementById('register-form');
  const alertEl = document.getElementById('register-alert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = form.querySelector('#reg-email').value.trim();
    const password = form.querySelector('#reg-password').value;
    const confirm  = form.querySelector('#reg-confirm').value;
    const btn      = form.querySelector('[type="submit"]');

    alertEl.classList.remove('show');

    if (password !== confirm) {
      alertEl.textContent = 'As senhas não conferem.';
      alertEl.classList.add('show');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Criando conta…';

    try {
      await signUp(email, password);
      alertEl.className = 'alert alert-success show';
      alertEl.textContent = 'Conta criada! Verifique seu e-mail para confirmar.';
    } catch (err) {
      alertEl.className = 'alert alert-error show';
      alertEl.textContent = traduzirErro(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Criar conta';
    }
  });
}

/** Traduz mensagens de erro do Supabase para português */
function traduzirErro(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('User already registered'))   return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be'))        return 'A senha deve ter pelo menos 6 caracteres.';
  return msg;
}
