---
title: "O que fazer se o seu CL quebrou a build de integração do Node.js"
description: "Este documento explica o que fazer se o seu CL quebrar a build de integração do Node.js."
---
[Node.js](https://github.com/nodejs/node) usa V8 estável ou beta. Para integração adicional, a equipe do V8 compila o Node com o [ramo principal](https://chromium.googlesource.com/v8/v8/+/refs/heads/main) do V8, ou seja, com uma versão do V8 de hoje. Nós fornecemos um bot de integração para [Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64), enquanto [Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64) e [Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64) estão em desenvolvimento.

Se o bot [`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel) falhar na fila de commits do V8, existe um problema legítimo com o seu CL (corrija-o) ou o [Node](https://github.com/v8/node/) deve ser modificado. Se os testes do Node falharem, procure por “Not OK” nos arquivos de log. **Este documento descreve como reproduzir o problema localmente e como fazer alterações no [fork do Node do V8](https://github.com/v8/node/) se o seu CL do V8 causar a falha na build.**

## Fonte

Siga as [instruções](https://chromium.googlesource.com/v8/node-ci) no repositório node-ci para obter o código fonte.

## Testar mudanças no V8

O V8 está configurado como uma dependência DEPS do node-ci. Pode ser necessário aplicar alterações no V8 para testes ou para reproduzir falhas. Para isso, adicione seu checkout principal do V8 como remoto:

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

Lembre-se de executar os hooks do gclient antes de compilar.

```bash
gclient runhooks
JOBS=`nproc` make test
```

## Fazer alterações no Node.js

O Node.js também está configurado como uma dependência `DEPS` do node-ci. Pode ser necessário aplicar alterações no Node.js para corrigir problemas que as mudanças no V8 podem causar. O V8 testa contra um [fork do Node.js](https://github.com/v8/node). Você precisa de uma conta no GitHub para fazer alterações nesse fork.

### Obter o código fonte do Node

Faça um fork do [repositório Node.js do V8 no GitHub](https://github.com/v8/node/) (clique no botão fork), a menos que já o tenha feito anteriormente.

Adicione seus forks e o fork do V8 como remotos no checkout existente:

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> git@github.com:<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **Nota** `<sync-date>` é a data em que sincronizamos com o Node.js principal. Escolha a data mais recente.

Faça suas alterações no checkout do Node.js e as commit. Em seguida, envie as alterações para o GitHub:

```bash
git push <your-user-name> $BRANCH_NAME
```

E crie um pull request contra o branch `node-ci-<sync-date>`.


Depois que o pull request for mesclado ao fork do Node.js do V8, você precisará atualizar o arquivo `DEPS` do node-ci e criar um CL.

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m 'Atualizar Node'
git cl upload
```
