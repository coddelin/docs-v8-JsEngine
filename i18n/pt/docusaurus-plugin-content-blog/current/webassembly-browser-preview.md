---
title: 'Visualização do navegador WebAssembly'
author: 'a equipe V8'
date: 2016-10-31 13:33:37
tags:
  - WebAssembly
description: 'WebAssembly ou Wasm é um novo runtime e destino de compilação para a web, agora disponível sob um flag no Chrome Canary!'
---
Hoje estamos felizes em anunciar, junto com o [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview) e [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/), uma visualização de navegador para WebAssembly. [WebAssembly](http://webassembly.org/) ou Wasm é um novo runtime e destino de compilação para a web, projetado por colaboradores da Google, Mozilla, Microsoft, Apple e do [Grupo Comunitário WebAssembly do W3C](https://www.w3.org/community/webassembly/).

<!--truncate-->
## O que este marco significa?

Este marco é significativo porque marca:

- um candidato a lançamento para nosso [MVP](http://webassembly.org/docs/mvp/) (produto minimamente viável) design (incluindo [semântica](http://webassembly.org/docs/semantics/), [formato binário](http://webassembly.org/docs/binary-encoding/) e [API JS](http://webassembly.org/docs/js/))
- implementações compatíveis e estáveis de WebAssembly sob um flag no trunk no V8 e SpiderMonkey, em versões de desenvolvimento de Chakra e em progresso no JavaScriptCore
- uma [ferramenta funcional](http://webassembly.org/getting-started/developers-guide/) para desenvolvedores compilarem módulos WebAssembly a partir de arquivos fonte C/C++
- um [cronograma](http://webassembly.org/roadmap/) para lançar WebAssembly como padrão, salvo alterações baseadas no feedback da comunidade

Você pode ler mais sobre WebAssembly no [site do projeto](http://webassembly.org/) e também seguir nosso [guia para desenvolvedores](http://webassembly.org/getting-started/developers-guide/) para testar a compilação do WebAssembly a partir de C & C++ usando Emscripten. Os documentos sobre o [formato binário](http://webassembly.org/docs/binary-encoding/) e [API JS](http://webassembly.org/docs/js/) descrevem a codificação binária do WebAssembly e o mecanismo para instanciar módulos WebAssembly no navegador, respectivamente. Aqui está um exemplo rápido para mostrar como o wasm se parece:

![Uma implementação da função Maior Divisor Comum em WebAssembly, mostrando os bytes brutos, o formato de texto (WAST) e o código fonte em C.](/_img/webassembly-browser-preview/gcd.svg)

Como o WebAssembly ainda está sob um flag no Chrome ([chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)), ainda não é recomendado para uso em produção. No entanto, o período de visualização de navegador marca um momento durante o qual estamos coletando ativamente [feedback](http://webassembly.org/community/feedback/) sobre o design e a implementação da especificação. Os desenvolvedores são incentivados a testar a compilação e a portabilidade de aplicativos, além de executá-los no navegador.

O V8 continua a otimizar a implementação do WebAssembly no [compilador TurboFan](/blog/turbofan-jit). Desde março passado, quando primeiro anunciamos o suporte experimental, adicionamos suporte para compilação paralela. Além disso, estamos próximo de concluir um pipeline alternativo para asm.js, que converte asm.js para WebAssembly [nos bastidores](https://www.chromestatus.com/feature/5053365658583040), permitindo que sites existentes em asm.js aproveitem alguns dos benefícios da compilação antecipada do WebAssembly.

## O que vem a seguir?

Salvo grandes mudanças no design decorrentes do feedback da comunidade, o Grupo Comunitário WebAssembly planeja produzir uma especificação oficial no primeiro trimestre de 2017, momento em que os navegadores serão incentivados a lançar WebAssembly como padrão. A partir desse momento, o formato binário será redefinido para a versão 1 e o WebAssembly será sem versão, testado por funcionalidades e compatível com versões anteriores. Um [cronograma](http://webassembly.org/roadmap/) mais detalhado pode ser encontrado no site do projeto WebAssembly.
