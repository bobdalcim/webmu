# classifiMUdos

Classificados de servidores privados de MMORPG (Mu Online, Priston Tale, Ragnarok, Tibia, Perfect World).

Site estático — HTML + CSS + JS puro, sem build. Servidores, guilds e votos ficam no Supabase (Postgres); o front consome via `@supabase/supabase-js` direto do client. Filtros, busca e votação funcionam de ponta a ponta.

## Rodar local

Não precisa de instalação. Basta servir os arquivos estáticos, por exemplo:

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Depois abra `http://localhost:PORTA`.

## Deploy no Vercel (grátis)

1. Confirme que o repositório está no GitHub (`bobdalcim/webmu`, branch atual já enviada).
2. Acesse [vercel.com](https://vercel.com) e faça login com sua conta do GitHub.
3. Clique em **Add New → Project**.
4. Selecione o repositório `webmu` na lista (autorize o Vercel a acessar seus repositórios se pedir).
5. Em **Framework Preset**, deixe como **Other** (é HTML estático, não precisa de build command nem output directory).
6. Clique em **Deploy**. Em ~30s o Vercel gera uma URL pública tipo `webmu.vercel.app`.
7. Todo push na branch conectada gera um novo deploy automático.

Domínio próprio (opcional, grátis para o registro do Vercel, só paga se comprar domínio): **Project → Settings → Domains**.

## Backend (Supabase)

Projeto: `classifimudos` (org `bobdalcim's Org`), plano free ($0/mês), região `sa-east-1`.

Tabelas:
- `servers` — nome, jogo, rate, status online/offline, fase, tier, contagem de votos.
- `guilds` — nome, jogo, servidor associado (FK).
- `votes` — um voto por `(server_id, voter_id)` (constraint única). `voter_id` é um UUID gerado no navegador e guardado no `localStorage` — evita voto duplicado do mesmo visitante sem precisar de login.

Um trigger (`increment_server_votes`, `security definer`, sem `EXECUTE` público) incrementa `servers.votes` a cada `insert` em `votes` — o client nunca escreve na coluna `votes` diretamente.

RLS: leitura pública em `servers`/`guilds`/`votes`; inserção pública só em `votes`. A chave usada no client (`script.js`) é a `anon`/`publishable`, feita para ser pública — a segurança vem das políticas de RLS, não do segredo da chave.

Para mexer no schema depois, use o painel do Supabase (SQL Editor) ou me peça para rodar uma migration.

## Anunciar servidor (formulário público)

O botão "Anunciar servidor" abre um modal que grava direto na tabela `submissions` (nome, jogo, rate, fase, link, e-mail de contato) com `status = 'pending'`. Essa tabela **não tem policy de leitura pública** — só admin (ver abaixo) ou SQL Editor conseguem ler, então o e-mail de contato nunca fica exposto no site.

## Painel de moderação (`/admin.html`)

Link discreto no rodapé do site (`admin.html`). Usa login de verdade via Supabase Auth (e-mail/senha) — nada de senha fixa no código.

**Como virar admin pela primeira vez:**

1. Abra `/admin.html` → aba **criar conta** → cadastre seu e-mail/senha (ex: `bobdalcimoficial@gmail.com`). Se o projeto tiver confirmação de e-mail ativada, confirme pelo link recebido antes do próximo passo.
2. Criar conta sozinho **não dá acesso** — é só um login. Me avise (ou rode no SQL Editor) para liberar:

```sql
insert into admins (user_id, email)
select id, email from auth.users where email = 'seu-email@exemplo.com';
```

3. Depois disso, logar em `/admin.html` mostra o painel: envios pendentes (aprovar/rejeitar) e servidores publicados (marcar online/offline, excluir).

Dica opcional: se a confirmação de e-mail no cadastro incomodar (você é o único admin mesmo), dá pra desligar em **Supabase → Authentication → Sign In / Providers → Email → "Confirm email"**.

Como funciona por baixo: a tabela `admins` (sem nenhuma policy pública) guarda quem é admin; uma função `is_admin()` no banco checa isso; e as policies de escrita em `servers`/`guilds`/`submissions` só liberam `insert`/`update`/`delete` pra quem `is_admin()` retorna verdadeiro. Alguém logado sem estar na tabela `admins` só vê a tela de "sem acesso".

## Próximos passos

- Formulário de envio de guilds (hoje só servidores podem ser anunciados).
- Destaques pagos (planos) vindos de uma tabela `sponsored` em vez do array fixo em `script.js`.
- Editar campos do servidor (não só online/offline) direto no painel.

Posso configurar qualquer um desses quando quiser — é só pedir.
