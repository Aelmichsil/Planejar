/**
 * js/supabase.js
 * ──────────────────────────────────────────
 * Inicialização do cliente Supabase.
 * IMPORTANTE: substitua as constantes abaixo
 * pelas suas credenciais do projeto Supabase.
 *
 * Como obter:
 *  1. Acesse https://app.supabase.com
 *  2. Selecione o seu projeto
 *  3. Settings → API
 *  4. Copie "Project URL" e "anon public key"
 * ──────────────────────────────────────────
 */

// ⚙️ CONFIGURE AQUI — suas credenciais do Supabase
const SUPABASE_URL  = 'https://jkyydwzmvdrpmxboxexl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpreXlkd3ptdmRycG14Ym94ZXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU2OTMsImV4cCI6MjA5NDg1MTY5M30.9zvvXaSTWupYbQNC579tys-mCn8oFyGpNEZeaQ5uHjo';

/**
 * O SDK do Supabase via CDN expõe o objeto em window.supabase
 * (não como módulo ES). A desestruturação direta pode falhar se
 * o script rodar antes do CDN terminar de definir a global.
 * Usamos acesso via window para garantir que pegamos o valor
 * já populado no momento em que este script executa (ele vem
 * APÓS o <script src="cdn"> nos HTMLs, então window.supabase
 * já existe — mas evitamos assumir o nome da variável local).
 */
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Disponibiliza globalmente para os demais módulos
window.supabaseClient = supabaseClient;