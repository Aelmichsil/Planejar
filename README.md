# 🗂️ Planejar — Sistema de Planejamento

Sistema web completo para gerenciar planejamentos e tarefas, com autenticação via Supabase.

---

## 📁 Estrutura de arquivos

```
Planejar/
├── index.html              → Entrada (redireciona conforme sessão)
├── login.html              → Login e cadastro
├── dashboard.html          → Visão geral com cards de resumo
├── planejamentos.html      → CRUD de planejamentos + tarefas
├── supabase-setup.sql      → Script SQL para configurar o banco
├── css/
│   └── style.css           → Estilos completos
└── js/
    ├── supabase.js         → Inicialização do cliente Supabase
    ├── auth.js             → Login, cadastro, logout
    ├── dashboard.js        → Cards de resumo e tabela recente
    └── planejamentos.js    → CRUD de planejamentos e tarefas
```

---

## ⚙️ Configuração em 3 passos

### 1. Crie o projeto no Supabase

1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Clique em **New project**
3. Preencha nome, senha do banco e região
4. Aguarde a criação (≈ 2 min)

### 2. Configure o banco de dados

1. No painel do projeto, vá em **SQL Editor → New query**
2. Cole o conteúdo do arquivo `supabase-setup.sql`
3. Clique em **Run** — isso cria as tabelas e as políticas RLS

### 3. Atualize as credenciais

Abra `js/supabase.js` e substitua:

```javascript
const SUPABASE_URL  = 'https://SEU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'SUA_ANON_KEY_AQUI';
```

Suas credenciais estão em: **Settings → API** do projeto Supabase.

---

## 🚀 Como usar

Após configurar, basta abrir `index.html` no navegador ou servir os arquivos com qualquer servidor estático (Live Server, Nginx, Vercel etc.).

> **Sem servidor necessário** — é tudo HTML/CSS/JS puro.

---

## 📋 Funcionalidades

| Recurso | Descrição |
|---|---|
| **Autenticação** | Login e cadastro com e-mail/senha via Supabase Auth |
| **Dashboard** | Cards: total de planejamentos, tarefas pendentes, concluídas e atrasadas |
| **Planejamentos** | Criar, listar (com filtros), editar e excluir |
| **Tarefas** | Vinculadas a um planejamento; criar, editar e excluir |
| **RLS** | Cada usuário vê apenas seus próprios dados |
| **Responsivo** | Funciona em desktop e mobile |

---

## 🗄️ Estrutura do banco

### Tabela `planejamentos`
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| user_id | UUID | Usuário dono |
| title | TEXT | Título |
| description | TEXT | Descrição |
| status | TEXT | pending / in_progress / done / cancelled |
| priority | TEXT | high / medium / low |
| start_date | DATE | Data de início |
| due_date | DATE | Data de prazo |
| created_at | TIMESTAMPTZ | Criado em |

### Tabela `tarefas`
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| planejamento_id | UUID | FK → planejamentos |
| user_id | UUID | Usuário dono |
| title | TEXT | Título |
| description | TEXT | Descrição |
| status | TEXT | pending / in_progress / done / cancelled |
| due_date | DATE | Data de prazo |
| created_at | TIMESTAMPTZ | Criado em |
