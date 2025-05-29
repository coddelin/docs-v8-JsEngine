---
title: 'Pipeline de compilação do WebAssembly'
description: 'Este artigo explica os compiladores do WebAssembly no V8 e quando eles compilam o código WebAssembly.'
---

WebAssembly é um formato binário que permite executar código de linguagens de programação diferentes de JavaScript na web de forma eficiente e segura. Neste documento, mergulhamos na pipeline de compilação do WebAssembly no V8 e explicamos como utilizamos os diferentes compiladores para fornecer alto desempenho.

## Liftoff

Inicialmente, o V8 não compila nenhuma função em um módulo WebAssembly. Em vez disso, as funções são compiladas de forma preguiçosa com o compilador básico [Liftoff](/blog/liftoff) quando a função é chamada pela primeira vez. Liftoff é um [compilador de passagem única](https://en.wikipedia.org/wiki/One-pass_compiler), o que significa que ele percorre o código WebAssembly uma vez e emite código de máquina imediatamente para cada instrução WebAssembly. Compiladores de passagem única são excelentes para geração rápida de código, mas podem aplicar apenas um conjunto limitado de otimizações. De fato, o Liftoff pode compilar código WebAssembly muito rapidamente, dezenas de megabytes por segundo.

Uma vez finalizada a compilação pelo Liftoff, o código de máquina resultante é registrado com o módulo WebAssembly, para que, em chamadas futuras à função, o código compilado possa ser usado imediatamente.

## TurboFan

Liftoff emite código de máquina razoavelmente rápido em um período muito curto de tempo. No entanto, como ele gera código para cada instrução WebAssembly de forma independente, há muito pouco espaço para otimizações, como melhorias na alocação de registradores ou otimizações comuns de compiladores, como eliminação de carga redundante, redução de força ou inserção de funções.

É por isso que funções _quentes_, que são funções executadas frequentemente, são recompiladas com [TurboFan](/docs/turbofan), o compilador otimizado do V8 para WebAssembly e JavaScript. TurboFan é um [compilador de múltiplas passagens](https://en.wikipedia.org/wiki/Multi-pass_compiler), o que significa que ele constrói múltiplas representações internas do código compilado antes de gerar código de máquina. Essas representações internas adicionais permitem otimizações e melhores alocações de registradores, resultando em código significativamente mais rápido.

O V8 monitora com que frequência as funções do WebAssembly são chamadas. Assim que uma função atinge um determinado limite, ela é considerada _quente_, e a recompilação é acionada em uma thread em segundo plano. Quando a compilação é concluída, o novo código é registrado com o módulo WebAssembly, substituindo o código Liftoff existente. Quaisquer novas chamadas para essa função usarão o novo código otimizado produzido pelo TurboFan, não o código do Liftoff. No entanto, observe que não realizamos substituição em pilha. Isso significa que, se o código do TurboFan se tornar disponível após a função ter sido chamada, a execução da chamada da função será concluída com o código do Liftoff.

## Cache de código

Se o módulo WebAssembly foi compilado com `WebAssembly.compileStreaming`, então o código de máquina gerado pelo TurboFan também será armazenado em cache. Quando o mesmo módulo WebAssembly for buscado novamente a partir do mesmo URL, o código armazenado em cache pode ser usado imediatamente sem necessidade de compilação adicional. Mais informações sobre cache de código estão disponíveis [em um post de blog separado](/blog/wasm-code-caching).

O cache de código é acionado sempre que a quantidade de código TurboFan gerado atinge um determinado limite. Isso significa que, para módulos WebAssembly grandes, o código TurboFan é armazenado em cache incrementalmente, enquanto para módulos WebAssembly pequenos o código TurboFan pode nunca ser armazenado. O código Liftoff não é armazenado em cache, pois a compilação do Liftoff é quase tão rápida quanto carregar código do cache.

## Depuração

Como mencionado anteriormente, o TurboFan aplica otimizações, muitas das quais envolvem reordenar código, eliminar variáveis ou até mesmo pular seções inteiras de código. Isso significa que, se você quiser definir um ponto de interrupção em uma instrução específica, pode não ser claro onde a execução do programa deve realmente parar. Em outras palavras, o código do TurboFan não é bem adequado para depuração. Portanto, quando a depuração é iniciada ao abrir o DevTools, todo código do TurboFan é substituído novamente pelo código do Liftoff ("reduzido"), já que cada instrução do WebAssembly corresponde exatamente a uma seção do código de máquina e todas as variáveis locais e globais permanecem intactas.

## Perfilamento

Para tornar as coisas um pouco mais confusas, dentro do DevTools todo código será elevado (recompilado com o TurboFan) novamente quando a aba Performance for aberta e o botão "Record" for clicado. O botão "Record" inicia o perfilamento de desempenho. O perfilamento do código Liftoff não seria representativo, pois ele é usado apenas enquanto o TurboFan não foi concluído e pode ser significativamente mais lento que o resultado do TurboFan, que estará em execução na grande maioria do tempo.

## Flags para experimentação

Para experimentação, V8 e Chrome podem ser configurados para compilar código WebAssembly apenas com Liftoff ou apenas com TurboFan. É até possível experimentar com compilação preguiçosa, onde as funções só são compiladas quando chamadas pela primeira vez. As seguintes flags habilitam esses modos experimentais:

- Apenas Liftoff:
    - No V8, configure as flags `--liftoff --no-wasm-tier-up`.
    - No Chrome, desative o nivelamento do WebAssembly (`chrome://flags/#enable-webassembly-tiering`) e ative o compilador básico do WebAssembly (`chrome://flags/#enable-webassembly-baseline`).

- Apenas TurboFan:
    - No V8, configure as flags `--no-liftoff --no-wasm-tier-up`.
    - No Chrome, desative o nivelamento do WebAssembly (`chrome://flags/#enable-webassembly-tiering`) e desative o compilador básico do WebAssembly (`chrome://flags/#enable-webassembly-baseline`).

- Compilação preguiçosa:
    - A compilação preguiçosa é um modo de compilação onde uma função só é compilada quando chamada pela primeira vez. Similar à configuração de produção, a função é inicialmente compilada com Liftoff (bloqueando a execução). Após o término da compilação com Liftoff, a função é recompilada com TurboFan em segundo plano.
    - No V8, configure a flag `--wasm-lazy-compilation`.
    - No Chrome, ative a compilação preguiçosa do WebAssembly (`chrome://flags/#enable-webassembly-lazy-compilation`).

## Tempo de compilação

Existem diferentes maneiras de medir o tempo de compilação do Liftoff e do TurboFan. Na configuração de produção do V8, o tempo de compilação do Liftoff pode ser medido a partir do JavaScript, medindo o tempo que leva para `new WebAssembly.Module()` finalizar, ou o tempo que leva para `WebAssembly.compile()` resolver a promessa. Para medir o tempo de compilação do TurboFan, pode-se fazer o mesmo em uma configuração apenas com TurboFan.

![O traço para compilação de WebAssembly no [Google Earth](https://earth.google.com/web).](/_img/wasm-compilation-pipeline/trace.svg)

A compilação também pode ser medida em mais detalhes em `chrome://tracing/` ativando a categoria `v8.wasm`. A compilação com Liftoff é então o tempo gasto desde o início da compilação até o evento `wasm.BaselineFinished`, a compilação com TurboFan termina no evento `wasm.TopTierFinished`. A compilação em si começa no evento `wasm.StartStreamingCompilation` para `WebAssembly.compileStreaming()`, no evento `wasm.SyncCompile` para `new WebAssembly.Module()`, e no evento `wasm.AsyncCompile` para `WebAssembly.compile()`, respectivamente. A compilação com Liftoff é indicada com eventos `wasm.BaselineCompilation`, enquanto a compilação com TurboFan é indicada com eventos `wasm.TopTierCompilation`. A figura acima mostra o traço registrado para o Google Earth, com os eventos principais destacados.

Dados de rastreamento mais detalhados estão disponíveis com a categoria `v8.wasm.detailed`, que, entre outras informações, fornece o tempo de compilação de funções isoladas.
