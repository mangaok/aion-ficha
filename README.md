# Aion · Ficha do Ocultista

Ficha de Ordem Paranormal do Aion como app de celular (PWA). Os dados ficam no Firebase da sua conta,
sincronizam entre celular e PC e continuam funcionando sem internet.

## Arquivos

- `index.html`: a ficha inteira.
- `db.js`: login e ligação com o Firestore.
- `firebase-config.js`: **o único arquivo que você edita** (cola a configuração do Firebase).
- `seed.json`: os dados atuais do Aion. São copiados para o Firebase no primeiro login.
- `firestore.rules`: regras de segurança para colar no Firebase.
- `sw.js` e `manifest.webmanifest`: fazem a ficha virar app e abrir offline.

## Configuração

1. Firebase: crie o projeto, registre um app da Web e cole o `firebaseConfig` em `firebase-config.js`.
2. Authentication: ative "E-mail/senha" e crie seu usuário na aba Usuários.
3. Firestore: crie o banco (São Paulo, `southamerica-east1`) e cole o conteúdo de `firestore.rules` na aba Regras.
4. GitHub Pages: Settings > Pages > Deploy from a branch > `main` / `root`.
5. No iPhone: abra o endereço do Pages no Safari, Compartilhar > Adicionar à Tela de Início.

## Atualizações

Ao mudar arquivos do app, troque `CACHE = "aion-v1"` em `sw.js` para `aion-v2`, `aion-v3`...
para o celular baixar a versão nova. A ficha em si (dados) nunca precisa disso.
