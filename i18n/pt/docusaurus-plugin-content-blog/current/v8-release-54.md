---
title: 'Lançamento do V8 v5.4'
author: 'a equipe V8'
date: 2016-09-09 13:33:37
tags:
  - lançamento
description: 'O V8 v5.4 traz melhorias de desempenho e menor consumo de memória.'
---
A cada seis semanas, criamos um novo branch do V8 como parte do nosso [processo de lançamento](/docs/release-process). Cada versão é originada do Git master do V8 imediatamente antes de um marco Beta do Chrome. Hoje estamos felizes em anunciar nosso mais novo branch, [V8 versão 5.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.4), que estará em beta até ser lançado em coordenação com o Chrome 54 Stable daqui a algumas semanas. O V8 v5.4 está repleto de diversos recursos voltados para os desenvolvedores, e gostaríamos de dar um prévia de alguns destaques aguardando o lançamento.

<!--truncate-->
## Melhoria de desempenho

O V8 v5.4 apresenta várias melhorias importantes na pegada de memória e na velocidade de início. Estas ajudam principalmente a acelerar a execução inicial de scripts e a reduzir o carregamento de páginas no Chrome.

### Memória

Ao medir o consumo de memória do V8, duas métricas são muito importantes para monitorar e entender: _Consumo máximo de memória_ e _consumo médio de memória_. Tipicamente, reduzir o consumo máximo é tão importante quanto reduzir o consumo médio, já que um script em execução que esgota a memória disponível mesmo por um momento breve pode causar uma falha de _Memória Insuficiente_, mesmo que seu consumo médio de memória não seja muito alto. Para fins de otimização, é útil dividir a memória do V8 em duas categorias: _Memória na pilha_ contendo objetos JavaScript reais e _memória fora da pilha_ contendo o restante, como estruturas de dados internas alocadas pelo compilador, parser e coletor de lixo.

No 5.4, ajustamos o coletor de lixo do V8 para dispositivos de baixa memória com 512 MB de RAM ou menos. Dependendo do site exibido, isso reduz o consumo máximo de _memória na pilha_ em até **40%**.

O gerenciamento de memória dentro do parser JavaScript do V8 foi simplificado para evitar alocações desnecessárias, reduzindo o uso máximo de _memória fora da pilha_ em até **20%**. Essas economias de memória são especialmente úteis para reduzir o uso de memória de arquivos de script grandes, incluindo aplicativos asm.js.

### Inicialização & velocidade

Nosso trabalho para simplificar o parser do V8 não apenas ajudou a reduzir o consumo de memória, mas também melhorou o desempenho de execução do parser. Essa simplificação, combinada com outras otimizações de funções embutidas de JavaScript e como os acessos às propriedades em objetos JavaScript usam [caches inline](https://en.wikipedia.org/wiki/Inline_caching) globais, resultou em ganhos notáveis de desempenho de inicialização.

Nossa [suite interna de testes de inicialização](https://www.youtube.com/watch?v=xCx4uC7mn6Y) que mede o desempenho de JavaScript em situações reais melhorou em uma mediana de 5%. O benchmark [Speedometer](http://browserbench.org/Speedometer/) também se beneficia dessas otimizações, melhorando em [~10 a 13% em comparação com v5.2](https://chromeperf.appspot.com/report?sid=f5414b72e864ffaa4fd4291fa74bf3fd7708118ba534187d36113d8af5772c86&start_rev=393766&end_rev=416239).

![](/_img/v8-release-54/speedometer.png)

## API do V8

Por favor, confira nosso [resumo de mudanças na API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento é atualizado regularmente algumas semanas após cada grande lançamento.

Os desenvolvedores com um [checkout ativo do V8](/docs/source-code#using-git) podem usar `git checkout -b 5.4 -t branch-heads/5.4` para experimentar os novos recursos do V8 v5.4. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e experimentar os novos recursos em breve.
