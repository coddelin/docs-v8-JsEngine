---
title: "Estatísticas de Chamadas em Tempo de Execução"
description: "Este documento explica como usar as Estatísticas de Chamadas em Tempo de Execução para obter métricas internas detalhadas do V8."
---
[O painel de desempenho do DevTools](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/) fornece insights sobre o desempenho em tempo de execução do seu aplicativo web visualizando várias métricas internas do Chrome. No entanto, certas métricas de baixo nível do V8 não estão atualmente expostas no DevTools. Este artigo guia você através da maneira mais robusta de coletar métricas internas detalhadas do V8, conhecidas como Estatísticas de Chamadas em Tempo de Execução ou RCS, através de `chrome://tracing`.

O rastreamento registra o comportamento de todo o navegador, incluindo outras abas, janelas e extensões, então funciona melhor quando feito em um perfil de usuário limpo, com extensões desabilitadas e nenhuma outra aba do navegador aberta:

```bash
# Inicie uma nova sessão do navegador Chrome com um perfil de usuário limpo e extensões desabilitadas
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Digite o URL da página que você deseja medir na primeira aba, mas não carregue a página ainda.

![](/_img/rcs/01.png)

Adicione uma segunda aba e abra `chrome://tracing`. Dica: você pode simplesmente digitar `chrome:tracing`, sem as barras.

![](/_img/rcs/02.png)

Clique no botão “Record” para preparar a gravação do rastreamento. Primeiro escolha “Desenvolvedor web” e então selecione “Editar categorias”.

![](/_img/rcs/03.png)

Selecione `v8.runtime_stats` da lista. Dependendo de quão detalhada será sua investigação, você pode selecionar outras categorias também.

![](/_img/rcs/04.png)

Pressione “Record” e volte para a primeira aba e carregue a página. O jeito mais rápido é usar <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>1</kbd> para pular diretamente para a primeira aba e então pressionar <kbd>Enter</kbd> para aceitar o URL digitado.

![](/_img/rcs/05.png)

Aguarde até que a página tenha sido carregada completamente ou o buffer esteja cheio, então “Pare” a gravação.

![](/_img/rcs/06.png)

Procure uma seção “Renderer” que contenha o título da página web da aba registrada. O jeito mais fácil de fazer isso é clicando em “Processos”, então clicando em “None” para desmarcar todas as entradas, e então selecionando apenas o renderer do seu interesse.

![](/_img/rcs/07.png)

Selecione os eventos de rastreamento/fatias pressionando <kbd>Shift</kbd> e arrastando. Certifique-se de cobrir _todas_ as seções, incluindo `CrRendererMain` e quaisquer `ThreadPoolForegroundWorker`s. Uma tabela com todas as fatias selecionadas aparece na parte inferior.

![](/_img/rcs/08.png)

Role para o canto superior direito da tabela e clique no link próximo a “Tabela de Estatísticas de Chamadas em Tempo de Execução”.

![](/_img/rcs/09.png)

Na visualização que aparece, role até o final para ver uma tabela detalhada de onde o V8 gasta seu tempo.

![](/_img/rcs/10.png)

Ao abrir uma categoria você pode analisar ainda mais os dados.

![](/_img/rcs/11.png)

## Interface da linha de comando

Execute [`d8`](/docs/d8) com `--runtime-call-stats` para obter métricas RCS da linha de comando:

```bash
d8 --runtime-call-stats foo.js
```
