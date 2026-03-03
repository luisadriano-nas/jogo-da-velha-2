# 🎮 Jogo da Velha 2 — Guia de Deploy no Railway

## O que você vai precisar
- Node.js instalado no computador (https://nodejs.org — baixe a versão LTS)
- Conta no GitHub (https://github.com — crie grátis)
- Conta no Railway (https://railway.app — entre com a conta do GitHub)

---

## PASSO 1 — Testar no seu computador

Abra o terminal na pasta do projeto e rode:

```bash
npm install
npm start
```

Abra o navegador em: http://localhost:3000

Se aparecer o jogo, está funcionando! ✅

---

## PASSO 2 — Subir o código pro GitHub

1. Acesse https://github.com/new e crie um repositório novo
   - Nome: `jogo-da-velha-2`
   - Deixe como **Public**
   - Clique em **Create repository**

2. No terminal, dentro da pasta do projeto, rode:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/jogo-da-velha-2.git
git push -u origin main
```

(Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub)

---

## PASSO 3 — Fazer o deploy no Railway

1. Acesse https://railway.app e clique em **Login with GitHub**

2. No dashboard, clique em **New Project**

3. Escolha **Deploy from GitHub repo**

4. Selecione o repositório `jogo-da-velha-2`

5. O Railway vai detectar que é um projeto Node.js automaticamente!

6. Clique em **Deploy** e aguarde ~1 minuto

7. Vá em **Settings → Networking → Generate Domain**

8. Pronto! Você vai ter um link tipo:
   `https://jogo-da-velha-2.up.railway.app`

---

## PASSO 4 — Jogar online

1. Abra o link do Railway no celular ou computador
2. Clique na aba **🌐 Online**
3. Digite seu nome e clique em **Criar Sala**
4. Um código de 5 letras vai aparecer — mande para o amigo!
5. O amigo abre o mesmo link, clica em **Entrar na Sala** e digita o código
6. A partida começa automaticamente! 🎉

---

## Dúvidas comuns

**"git não é reconhecido"**
→ Baixe o Git em https://git-scm.com e instale

**"npm não é reconhecido"**
→ Reinstale o Node.js de https://nodejs.org

**O Railway cobrou alguma coisa?**
→ O plano gratuito do Railway tem $5 de crédito por mês, suficiente para um projeto pequeno rodando 24h

---

## Estrutura dos arquivos

```
jogo-da-velha-2/
├── server.js        ← servidor Node.js (não mexa)
├── package.json     ← configurações do projeto
├── README.md        ← este guia
└── public/
    └── index.html   ← o jogo em si
```
