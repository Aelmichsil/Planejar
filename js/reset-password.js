/**
 * js/reset-password.js
 * Fluxo de redefinicao final da senha via link de recuperacao.
 */

const resetForm = document.getElementById('reset-form');
const alertEl = document.getElementById('reset-alert');
const submitBtn = document.getElementById('reset-submit');

initResetPasswordPage();

async function initResetPasswordPage() {
  if (!resetForm || !alertEl || !submitBtn) return;

  const valido = await validarContextoRecuperacao();
  if (!valido) {
    exibirAlerta('error', 'Link de redefinicao invalido ou expirado. Solicite um novo em "Esqueci minha senha".');
    submitBtn.disabled = true;
    return;
  }

  resetForm.addEventListener('submit', onSubmitResetForm);
}

async function validarContextoRecuperacao() {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const tipo = hashParams.get('type');

  if (tipo === 'recovery') return true;

  const { data: { session } } = await supabaseClient.auth.getSession();
  return !!session;
}

async function onSubmitResetForm(e) {
  e.preventDefault();

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword.length < 6) {
    exibirAlerta('error', 'A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  if (newPassword !== confirmPassword) {
    exibirAlerta('error', 'As senhas nao conferem.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;

    exibirAlerta('success', 'Senha redefinida com sucesso! Redirecionando para o login...');

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1800);
  } catch (err) {
    exibirAlerta('error', traduzirErro(err.message));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar nova senha';
  }
}

function exibirAlerta(tipo, mensagem) {
  alertEl.className = tipo === 'success' ? 'alert alert-success show' : 'alert alert-error show';
  alertEl.textContent = mensagem;
}

function traduzirErro(msg) {
  if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Auth session missing')) return 'Sessao de recuperacao nao encontrada. Abra novamente o link do e-mail.';
  return msg;
}
