# Lucrazi

Blog em português sobre renda extra, ideias de negócio, trabalho freelance e organização financeira. O objetivo editorial é compartilhar informação prática e transparente — sem prometer ganhos ou resultados.

## Começar

Requer Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Comandos

- `npm run dev`: inicia o servidor de desenvolvimento.
- `npm run lint`: verifica o código com ESLint.
- `npm run build`: gera a versão de produção.
- `npm run start`: inicia a versão de produção depois do build.

## Conteúdo

- `src/lib/articles.ts`: artigos, metadados editoriais e conteúdo estruturado.
- `src/app/page.tsx`: página inicial com três guias em destaque.
- `src/app/artigos/page.tsx`: catálogo com todos os guias publicados.
- `src/app/artigos/[slug]/page.tsx`: páginas dos artigos, sumário, artigos relacionados e dados estruturados.
- `src/app/sobre/`, `src/app/contato/` e `src/app/privacidade/`: páginas institucionais.
- `src/app/sitemap.ts` e `src/app/robots.ts`: recursos para rastreamento e indexação.

Os artigos de exemplo são conteúdo inicial: revise os textos, atribua autoria correta e atualize as datas somente quando houver revisão editorial. Verifique informações variáveis em fontes oficiais antes da publicação.

## Configuração para publicar e monetizar

Copie `.env.example` para `.env.local` e configure os valores para o seu domínio, contato e conta de anúncios:

- `NEXT_PUBLIC_SITE_URL`: URL pública canônica do site, incluindo `https://`. É usada nos metadados, sitemap e dados estruturados.
- `NEXT_PUBLIC_CONTACT_EMAIL`: e-mail real de contato editorial e privacidade.
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID`: identificador de publicador fornecido pelo AdSense.
- `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID`: identificador de um bloco de anúncios aprovado.

Os anúncios não são carregados enquanto cliente ou bloco não estiverem configurados. O espaço de anúncio aparece na página inicial e nos artigos, identificado como publicidade. Use somente identificadores da sua conta e configure os avisos, consentimento e políticas aplicáveis antes de veicular anúncios. A aprovação no AdSense, o tráfego e a receita não são garantidos. Nunca clique nos próprios anúncios nem incentive cliques.

Antes de lançar, configure um domínio próprio, e-mail de contato e Google Search Console; revise o conteúdo e as páginas institucionais; confirme direitos de imagens e fontes; e confira os requisitos atuais do Google AdSense para seu público e região.
