# classifiMUdos

Classificados de servidores privados de MMORPG (Mu Online, Priston Tale, Ragnarok, Tibia, Perfect World).

Site estático — HTML + CSS + JS puro, sem build, sem dependências. Os dados (servidores, votos, guilds) hoje vivem em `script.js`; filtros, busca e votação já funcionam no navegador.

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

## Próximos passos (quando quiser dados reais / persistentes)

Hoje os votos ficam salvos só no `localStorage` do navegador (cada visitante vota uma vez, mas o contador não é compartilhado entre pessoas). Para votos, servidores e guilds compartilhados entre todos os visitantes, dá para plugar um backend grátis:

- **Supabase** (free tier: banco Postgres + API REST/Realtime prontos) para guardar servidores, votos e guilds de verdade.
- **Vercel Serverless Functions** ou o próprio SDK do Supabase no client, para não expor lógica sensível.

Posso configurar isso quando quiser — é só pedir.
