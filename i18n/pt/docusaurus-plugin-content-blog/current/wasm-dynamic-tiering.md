---
title: "WebAssembly Dynamic Tiering pronto para experimentar no Chrome 96"
author: "Andreas Haas — Diversão Tierisch"
avatars:
  - andreas-haas
date: 2021-10-29
tags:
  - WebAssembly
description: "WebAssembly Dynamic Tiering pronto para experimentar no V8 v9.6 e Chrome 96, seja através de uma flag de linha de comando ou de um teste de origem"
tweet: "1454158971674271760"
---

O V8 tem dois compiladores para compilar código WebAssembly em código de máquina que pode então ser executado: o compilador padrão __Liftoff__ e o compilador otimizador __TurboFan__. Liftoff pode gerar código muito mais rapidamente do que TurboFan, o que permite tempos rápidos de inicialização. TurboFan, por outro lado, pode gerar códigos mais rápidos, permitindo alto desempenho máximo.

<!--truncate-->
Na configuração atual do Chrome, um módulo WebAssembly é primeiro completamente compilado pelo Liftoff. Após a conclusão da compilação do Liftoff, o módulo inteiro é compilado novamente imediatamente em segundo plano pelo TurboFan. Com a compilação em fluxo, a compilação do TurboFan pode começar mais cedo se o Liftoff compilar o código WebAssembly mais rápido do que o código WebAssembly é baixado. A compilação inicial do Liftoff permite um tempo rápido de inicialização, enquanto a compilação do TurboFan em segundo plano fornece alto desempenho máximo o mais rápido possível. Mais detalhes sobre Liftoff, TurboFan e todo o processo de compilação podem ser encontrados em um [documento separado](https://v8.dev/docs/wasm-compilation-pipeline).

Compilar o módulo WebAssembly inteiro com TurboFan oferece o desempenho ideal possível uma vez concluída a compilação, mas isso tem um custo:

- Os núcleos da CPU que executam a compilação do TurboFan em segundo plano podem bloquear outras tarefas que exigiriam a CPU, por exemplo, trabalhadores do aplicativo web.
- A compilação do TurboFan de funções menos importantes pode atrasar a compilação do TurboFan de funções mais importantes, o que pode atrasar o aplicativo web a alcançar pleno desempenho.
- Algumas funções WebAssembly podem nunca ser executadas, e gastar recursos compilando essas funções com TurboFan pode não valer a pena.

## Tiering Dinâmico

O tiering dinâmico deve aliviar esses problemas compilando apenas aquelas funções com TurboFan que realmente são executadas várias vezes. Assim, o tiering dinâmico pode alterar o desempenho de aplicativos web de várias maneiras: o tiering dinâmico pode acelerar o tempo de inicialização ao reduzir a carga nas CPUs e, assim, permitir que tarefas de inicialização além da compilação do WebAssembly usem mais a CPU. O tiering dinâmico também pode desacelerar o desempenho ao atrasar a compilação do TurboFan para funções importantes. Como o V8 não usa substituição na pilha para o código WebAssembly, a execução pode ficar presa em um loop no código Liftoff, por exemplo. Além disso, o cache de código é afetado, porque o Chrome apenas armazena em cache o código TurboFan, e todas as funções que nunca se qualificam para a compilação do TurboFan são compiladas com Liftoff na inicialização, mesmo quando o módulo WebAssembly compilado já existe no cache.

## Como experimentar

Incentivamos os desenvolvedores interessados a experimentar o impacto do desempenho do tiering dinâmico em seus aplicativos web. Isso nos permitirá reagir e evitar possíveis regressões de desempenho antecipadamente. O tiering dinâmico pode ser habilitado localmente executando o Chrome com a flag de linha de comando `--enable-blink-features=WebAssemblyDynamicTiering`.

Embeddings do V8 que desejam habilitar o tiering dinâmico podem fazê-lo configurando a flag do V8 `--wasm-dynamic-tiering`.

### Testando no campo com um Origin Trial

Executar o Chrome com uma flag de linha de comando é algo que um desenvolvedor pode fazer, mas isso não deve ser esperado de um usuário final. Para experimentar com seu aplicativo no campo, é possível aderir ao que é chamado de [Origin Trial](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md). Os testes de origem permitem que você experimente recursos experimentais com usuários finais por meio de um token especial que é vinculado a um domínio. Este token especial habilita o tiering dinâmico do WebAssembly para o usuário final em páginas específicas que incluem o token. Para obter seu próprio token para executar um teste de origem, [use o formulário de inscrição](https://developer.chrome.com/origintrials/#/view_trial/3716595592487501825).

## Nos dê feedback

Estamos em busca de feedback dos desenvolvedores que experimentam esse recurso, pois isso ajudará a acertar os critérios sobre quando a compilação TurboFan é útil e quando a compilação TurboFan não compensa e pode ser evitada. A melhor maneira de enviar feedback é [relatar problemas](https://bugs.chromium.org/p/chromium/issues/detail?id=1260322).
