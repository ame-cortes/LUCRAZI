# Lucrazi

Blog em português sobre como ganhar dinheiro na internet, com guias de trabalho freelancer, marketing digital, YouTube, produtos digitais e renda extra. Também abordamos serviços e pequenos negócios, sempre com informação prática e transparente — sem prometer ganhos ou resultados.

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
- `src/app/llms.txt/route.ts`: índice textual atualizado com os artigos publicados para ferramentas de IA.

Os artigos de exemplo são conteúdo inicial: revise os textos, atribua autoria correta e atualize as datas somente quando houver revisão editorial. Verifique informações variáveis em fontes oficiais antes da publicação.

## Configuração para publicar e monetizar

Copie `.env.example` para `.env.local` e configure os valores para o seu domínio, contato e conta de anúncios:

- `NEXT_PUBLIC_SITE_URL`: URL pública canônica do site, incluindo `https://`. É usada nos metadados, sitemap e dados estruturados.
- `NEXT_PUBLIC_CONTACT_EMAIL`: e-mail real de contato editorial e privacidade.
- `GOOGLE_SITE_VERIFICATION`: token opcional de verificação HTML do Google Search Console. Para verificação por DNS, não é necessário configurar esta variável.
- A verificação HTML do Bing Webmaster Tools está configurada nos metadados globais do site.
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID`: identificador de publicador fornecido pelo AdSense.
- `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID`: identificador de um bloco de anúncios aprovado.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` e `NEXT_PUBLIC_FIREBASE_APP_ID`: configuração pública do app Firebase Web.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` e `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`: valores adicionais da configuração Firebase.
- `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`: chave pública do reCAPTCHA Enterprise/Fraud Defense usado pelo Firebase App Check.
- `NEXT_PUBLIC_NEWSLETTER_SIGNUP_ENABLED`: defina como `true` somente depois de configurar a chave App Check e a credencial Firebase de servidor.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON privado da conta de serviço, usado somente por rotas de servidor; nunca use o prefixo `NEXT_PUBLIC_` nem o envie ao Git.
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_SENDER_ADDRESS` e `BREVO_NEWSLETTER_LIST_ID`: credenciais e dados do remetente para envio e sincronização com uma lista Brevo exclusiva do Lucrazi. O endereço postal configurado é exibido no rodapé das campanhas.
- `NEWSLETTER_UNSUBSCRIBE_SECRET`: segredo privado aleatório de pelo menos 32 caracteres, usado para assinar links individuais de cancelamento; nunca o envie ao Git.
- `INDEXNOW_API_KEY`: chave IndexNow usada no envio automático de URLs publicadas e no arquivo público `/indexnow-key.txt`. A chave é pública por definição do protocolo; configure o mesmo valor no ambiente local e na hospedagem.

Os anúncios não são carregados enquanto cliente ou bloco não estiverem configurados. Os blocos ficam somente no meio dos artigos, depois de uma parte substancial do conteúdo, e são identificados como publicidade. O endpoint `/ads.txt` é gerado com o ID de publicador configurado. Use somente identificadores da sua conta e configure os avisos, consentimento e políticas aplicáveis antes de veicular anúncios. A aprovação no AdSense, o tráfego e a receita não são garantidos. Nunca clique nos próprios anúncios nem incentive cliques.

### Painel de artigos no Firebase

O painel administrativo fica em `/admin`. O app usa Firebase Authentication com e-mail e senha e Firestore para salvar artigos. As chaves `NEXT_PUBLIC_FIREBASE_*` são a configuração pública do SDK Web; elas não substituem as regras de segurança do Firestore. Não coloque chaves privadas de conta de serviço no navegador.

Para ativar o painel no projeto Firebase:

1. No Firebase Console do projeto `lucrazi`, crie um banco Firestore em modo de produção e ative **Authentication > E-mail/senha**. Se o Console informar que a API do Cloud Firestore está desativada, habilite-a no projeto Google Cloud vinculado e aguarde a propagação.
2. Crie a conta administrativa em **Authentication > Users**, autorize o domínio do site em **Authentication > Settings > Authorized domains** e copie o UID dessa conta.
3. Publique as regras do arquivo [`firestore.rules`](./firestore.rules) na área **Firestore Database > Regras**.
4. No Firestore, crie o documento `admins/{UID}` e defina o campo booleano `allowAdmin` como `true`. A regra permite que cada usuário leia somente o documento com o próprio UID; as regras bloqueiam alterações a essa lista pelo painel.
5. Copie os valores do app Web para as variáveis Firebase em `.env.local` e para as variáveis de ambiente da hospedagem. Reinicie o servidor depois de alterar `.env.local`.
6. Entre em `/admin` e use **Importar os 50 guias** para gravar os artigos atuais no Firestore. Depois disso, alterações publicadas aparecem nas páginas do site; rascunhos ficam privados e exclusões são registradas apenas como slugs numa coleção separada para não expor o texto removido nem fazer um artigo inicial reaparecer.
7. Configure `INDEXNOW_API_KEY` com a chave fornecida pelo IndexNow em `.env.local` e nas variáveis de ambiente da hospedagem. O site publica essa chave em `/indexnow-key.txt` e envia automaticamente ao IndexNow as URLs de artigos publicados, atualizados, despublicados, excluídos ou importados pelo painel. Confirme que `https://www.lucrazi.com.br/indexnow-key.txt` exibe somente a chave antes de publicar artigos. O envio informa os mecanismos de busca, mas não garante rastreamento nem indexação.

O site continua apresentando os artigos iniciais enquanto eles ainda não foram importados. Operações administrativas são verificadas pelas regras do Firestore, não apenas pela tela de login. A configuração do projeto e a publicação das regras no Firebase Console são necessárias antes de usar o painel.

### Lista de novidades e integração Brevo

O formulário da página inicial exige consentimento explícito e um token Firebase App Check válido. O servidor grava as inscrições em `newsletterSubscribers`, com o e-mail e os registros de consentimento; o ID do documento é o hash SHA-256 do endereço. O navegador não tem acesso à coleção. Com a integração configurada, a Brevo recebe o contato, envia uma mensagem de boas-vindas e processa campanhas criadas na aba **E-mails** do painel `/admin`. Campanhas incluem o link de cancelamento gerenciado pela Brevo; as boas-vindas incluem um link individual assinado pelo site. O cancelamento no painel também marca o contato como bloqueado na Brevo.

Para ativar os envios:

1. Na Brevo, autentique o domínio remetente e confirme os registros DNS recomendados (SPF/DKIM e DMARC, conforme orientado pela Brevo). Cadastre e valide o endereço remetente.
2. Crie uma lista de contatos **exclusiva do Lucrazi** e copie o ID numérico dessa lista. Não use uma lista com contatos não registrados pelo formulário do site.
3. Crie uma chave API da Brevo com permissões para contatos e campanhas/e-mails. Guarde-a como variável secreta `BREVO_API_KEY`; nunca a coloque em `NEXT_PUBLIC_*`, no código ou neste repositório.
4. Separe o endereço postal que aparecerá no rodapé das campanhas. Configure no Vercel, em Production e Preview, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_SENDER_ADDRESS`, `BREVO_NEWSLETTER_LIST_ID` e `NEWSLETTER_UNSUBSCRIBE_SECRET`. Gere o último valor com `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` e mantenha-o privado.
5. Confirme que `FIREBASE_SERVICE_ACCOUNT_JSON`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` e `NEXT_PUBLIC_NEWSLETTER_SIGNUP_ENABLED=true` estão corretos. Depois de alterar variáveis no Vercel, faça um novo deploy.
6. Entre em `/admin` e abra a aba **E-mails**. Confira os assinantes ativos, envie uma mensagem de boas-vindas de teste para o seu próprio e-mail e confirme o cancelamento pelo link recebido antes de fazer campanhas para todos.

O painel lista e pesquisa assinantes, permite reenviar boas-vindas e cancelar inscrição, cria campanhas para os contatos consentidos, pede confirmação antes do envio e registra o resultado. A lista Brevo é sincronizada antes da campanha. Na aba **E-mails**, escolha um artigo publicado no modelo **Aviso de artigo** para preparar o assunto, a mensagem e o botão para leitura; revise o conteúdo e confirme o envio. A publicação do artigo, por si só, nunca dispara uma campanha. O rodapé inclui cancelamento. Se as variáveis de envio não estiverem configuradas, as inscrições continuam registradas e a interface informa que a mensagem automática não foi enviada. Não divulgue segredos em mensagens ou capturas de tela.

Depois que um artigo é salvo no Firestore, esse conteúdo publicado prevalece sobre a versão inicial no código. O painel registra a data/hora real da última gravação em `updatedAt`; revisões publicadas mostram “Atualizado em” no fuso de Brasília, e essa data também alimenta o sitemap, o Open Graph e os dados estruturados. Para corrigir um artigo já publicado, edite-o em `/admin` e publique a revisão; importar os guias novamente não sobrescreve artigos existentes. Não altere datas para simular atualizações: revise o conteúdo e deixe o painel registrar a data real. Revise números, impostos e regras legais em fontes oficiais antes da publicação.

#### Inicialização segura pelo terminal local (opcional)

Para popular os documentos antes de publicar, o comando `npm run seed:firestore` usa o Firebase Admin SDK e a conta de serviço somente no seu computador. Ative primeiro a API do Firestore e crie o banco padrão. A conta de serviço precisa de permissões de leitura e escrita no Firestore (por exemplo, **Cloud Datastore User**) no projeto.

No PowerShell, configure o caminho local do JSON que você baixou e o ID do projeto; depois execute:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\caminho\local\conta-de-servico.json"
$env:FIREBASE_PROJECT_ID = "lucrazi"
npm run seed:firestore
```

O comando cria os 50 artigos com estado `published` e preserva documentos ou marcadores de exclusão que já existam. Não é um passo de build/deploy e não requer adicionar a chave privada às variáveis do Vercel. Nunca envie esse JSON ao GitHub nem o coloque em `NEXT_PUBLIC_*`. Depois de popular os documentos, o deploy usa a configuração pública do app Web para ler os artigos publicados.

Antes de lançar, configure um domínio próprio, e-mail de contato e Google Search Console; revise o conteúdo e as páginas institucionais; confirme direitos de imagens e fontes; e confira os requisitos atuais do Google AdSense para seu público e região.

O sitemap público fica em `/sitemap.xml`, inclui as imagens dos artigos e é referenciado em `/robots.txt`. O índice `/llms.txt` também é gerado a partir dos artigos publicados; é um formato complementar em evolução e não um fator de posicionamento confirmado no Google. Depois de verificar a propriedade do domínio no Google Search Console, envie `https://www.lucrazi.com.br/sitemap.xml` em **Indexação > Sitemaps**. O envio ajuda o Google a descobrir URLs, mas não garante rastreamento, indexação ou posicionamento.
