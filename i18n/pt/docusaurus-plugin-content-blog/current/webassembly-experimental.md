---
title: "Suporte experimental para WebAssembly no V8"
author: "Seth Thompson, Especialista em WebAssembly"
date: 2016-03-15 13:33:37
tags:
  - WebAssembly
description: "A partir de hoje, suporte experimental para WebAssembly está disponível no V8 e Chromium, ativável por uma flag."
---
_Para uma visão geral completa sobre WebAssembly e um roteiro para colaboração futura da comunidade, veja [A WebAssembly Milestone](https://hacks.mozilla.org/2016/03/a-webassembly-milestone/) no blog Mozilla Hacks._

Desde junho de 2015, colaboradores do Google, Mozilla, Microsoft, Apple e do [W3C WebAssembly Community Group](https://www.w3.org/community/webassembly/participants) têm trabalhado intensamente no [design](https://github.com/WebAssembly/design), [especificação](https://github.com/WebAssembly/spec) e implementação ([1](https://www.chromestatus.com/features/5453022515691520), [2](https://platform-status.mozilla.org/#web-assembly), [3](https://github.com/Microsoft/ChakraCore/wiki/Roadmap), [4](https://webkit.org/status/#specification-webassembly)) do WebAssembly, um novo ambiente de execução e alvo de compilação para a web. [WebAssembly](https://webassembly.github.io/) é um bytecode de baixo nível e portátil, projetado para ser codificado em um formato binário compacto e executado em velocidade próxima à nativa em uma sandbox segura para memória. Como uma evolução das tecnologias existentes, o WebAssembly é integrado à plataforma web, além de ser mais rápido para baixar pela rede e instanciar do que [asm.js](http://asmjs.org/), um subconjunto de baixo nível do JavaScript.

<!--truncate-->
A partir de hoje, suporte experimental para WebAssembly está disponível no V8 e Chromium, ativável por uma flag. Para experimentá-lo no V8, execute a versão `d8` 5.1.117 ou superior a partir da linha de comando com a flag `--expose_wasm` ou ative o recurso Experimental WebAssembly em `chrome://flags#enable-webassembly` no Chrome Canary 51.0.2677.0 ou superior. Após reiniciar o navegador, um novo objeto `Wasm` estará disponível no contexto JavaScript, expondo uma API para instanciar e executar módulos WebAssembly. **Graças aos esforços de colaboradores da Mozilla e Microsoft, duas implementações compatíveis de WebAssembly também estão executando sob uma flag no [Firefox Nightly](https://hacks.mozilla.org/2016/03/a-webassembly-milestone) e em uma build interna do [Microsoft Edge](http://blogs.windows.com/msedgedev/2016/03/15/previewing-webassembly-experiments) (demonstrado em um vídeo screencapture).**

O site do projeto WebAssembly tem uma [demonstração](https://webassembly.github.io/demo/) mostrando o uso do runtime em um jogo 3D. Em navegadores que suportam WebAssembly, a página da demonstração carregará e instanciará um módulo wasm que utiliza WebGL e outras APIs da plataforma web para renderizar um jogo interativo. Em outros navegadores, a página da demonstração recai para uma versão asm.js do mesmo jogo.

![[Demonstração WebAssembly](https://webassembly.github.io/demo/)](/_img/webassembly-experimental/tanks.jpg)

Por trás das cenas, a implementação de WebAssembly no V8 foi projetada para reutilizar grande parte da infraestrutura existente da máquina virtual do JavaScript, especificamente o [TurboFan compiler](/blog/turbofan-jit). Um decodificador especializado de WebAssembly valida módulos verificando tipos, índices de variáveis locais, referências de funções, valores de retorno e estrutura de fluxo de controle em uma única passagem. O decodificador produz um gráfico TurboFan que é processado por várias passagens de otimização e, finalmente, transformado em código de máquina pelo mesmo backend que gera código de máquina otimizado para JavaScript e asm.js. Nos próximos meses, a equipe se concentrará em melhorar o tempo de inicialização da implementação do V8 através de ajustes no compilador, paralelismo e melhorias na política de compilação.

Duas mudanças futuras também melhorarão significativamente a experiência do desenvolvedor. Uma representação textual padrão do WebAssembly permitirá aos desenvolvedores visualizar o código-fonte de um binário WebAssembly como qualquer outro script ou recurso web. Além disso, o objeto placeholder atual `Wasm` será redesenhado para fornecer um conjunto mais poderoso e idiomático de métodos e propriedades para instanciar e inspecionar módulos WebAssembly a partir do JavaScript.
