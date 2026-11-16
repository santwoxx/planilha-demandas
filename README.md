# Pauta Comemorativa

A pauta da equipe (Natan e Isa) para os posts e vídeos da Central Móveis, Central Pneus, Central Autocenter e Central Autocar, organizada pelas datas comemorativas e com cronômetro de prazo.

## Arquivos

- `index.html`: a página inteira (lista, quadro e calendário).
- `api/pauta.js`: guarda os dados no Upstash Redis. Não tem dependências.
- `package.json`: só diz ao Vercel que o código usa módulos ES.

## Colocar no ar (uma vez só)

1. Em vercel.com, clique em **Add New → Project** e importe o repositório **planilha-demandas**. Deixe o Framework Preset como **Other** e clique em **Deploy**.
2. No projeto, vá em **Storage → Create Database → Upstash for Redis**. Escolha o plano **Free** e conecte o banco ao projeto.
3. Em **Settings → Environment Variables**, crie `PAUTA_SENHA` com a senha da equipe.
4. Em **Deployments**, abra o último deploy e clique em **Redeploy**, para ele pegar o banco e a senha.
5. Abra o endereço, digite a senha e escolha **Natan**. Mande o endereço e a senha para a Isa; ela escolhe **Isa**.

Depois disso, cada `git push` na branch `main` publica sozinho.

A API lê `KV_REST_API_URL` e `KV_REST_API_TOKEN`, ou `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. A integração do Upstash cria um desses pares sozinha. Se a página disser "Falta ligar o banco de dados", confira em Settings → Environment Variables se esse par existe.

## Como usar

- **Criar:** escreva na barra de cima e aperte Enter.
  - "Reels Dia dos Pais Pneus" vira um Reels da Central Pneus para o Dia dos Pais, com o Natan e prazo 2 dias antes da data.
  - "Post Black Friday Móveis" vai para a Isa, porque post é com ela.
  - Para escolher a pessoa, escreva o nome ("… para Isa"). Para dar prazo, escreva "hoje 15h" ou "amanhã 18h".
  - Os chips embaixo da barra mostram o que foi entendido. Clique num chip para trocar. Shift+Enter abre os detalhes antes de criar.
- **Editar:** clique em qualquer célula da lista para mudar o status, a empresa, quem faz, a data da postagem ou o prazo. Clique no título para renomear.
- **Cronômetros:** a coluna Cronômetro conta o tempo até o prazo. O ▶ da coluna Tempo marca quanto tempo vocês trabalharam na peça.
- **Quadro:** arraste os cartões entre A fazer, Fazendo, Revisão e Postado.
- **Calendário:** clique num dia para ver as datas comemorativas e quais empresas ainda estão sem demanda ("+ Móveis" cria na hora).
- **Atalhos:** N cria, 1, 2 e 3 trocam a visualização, Esc fecha.
- **Ajustes** (botão com seu nome): empresas, equipe, avisos no computador e exportação para .csv, que abre no Excel.

## Limites

- A página consulta o banco a cada 8 segundos, ou a cada 60 segundos com a aba em segundo plano. Para duas pessoas, isso fica dentro dos 500 mil comandos por mês do plano grátis do Upstash.
- Os avisos no computador só funcionam com a pauta aberta em alguma aba.
- Os dados ficam no Upstash. Apagar o banco apaga a pauta.
