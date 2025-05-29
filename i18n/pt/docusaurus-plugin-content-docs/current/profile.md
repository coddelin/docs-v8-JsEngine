---
title: 'Usando o profiler baseado em amostras do V8'
description: 'Este documento explica como usar o profiler baseado em amostras do V8.'
---
O V8 possui um sistema de perfilamento baseado em amostras. O perfilamento está desativado por padrão, mas pode ser habilitado via a opção de linha de comando `--prof`. O amostrador registra pilhas de código tanto em JavaScript quanto em C/C++.

## Compilação

Compile o shell `d8` seguindo as instruções em [Construindo com GN](/docs/build-gn).

## Linha de comando

Para iniciar o perfilamento, use a opção `--prof`. Durante o perfilamento, o V8 gera um arquivo `v8.log`, que contém os dados de perfilamento.

Windows:

```bash
build\Release\d8 --prof script.js
```

Outras plataformas (substitua `ia32` por `x64` se quiser realizar perfilamento na compilação `x64`):

```bash
out/ia32.release/d8 --prof script.js
```

## Processar a saída gerada

O processamento do arquivo de log é feito usando scripts em JS executados pelo shell d8. Para que isso funcione, um binário `d8` (ou link simbólico, ou `d8.exe` no Windows) deve estar na raiz do seu checkout do V8 ou no caminho especificado pela variável de ambiente `D8_PATH`. Nota: este binário é usado apenas para processar o log, mas não para o perfilamento real, então não importa qual versão etc.

**Certifique-se de que o `d8` usado para análise não foi compilado com `is_component_build`!**

Windows:

```bash
tools\windows-tick-processor.bat v8.log
```

Linux:

```bash
tools/linux-tick-processor v8.log
```

macOS:

```bash
tools/mac-tick-processor v8.log
```

## Interface Web para `--prof`

Pré-processar o log com `--preprocess` (para resolver símbolos C++, etc.).

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

Abra [`tools/profview/index.html`](https://v8.dev/tools/head/profview) em seu navegador e selecione o arquivo `v8.json` lá.

## Exemplo de saída

```
Resultado do perfil estatístico de benchmarks\v8.log, (4192 ticks, 0 não contabilizados, 0 excluídos).

 [Bibliotecas compartilhadas]:
   ticks  total  não_lib   nome
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript]:
   ticks  total  não_lib   nome
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++]:
   ticks  total  não_lib   nome
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC]:
   ticks  total  não_lib   nome
    458   10.9%

 [Perfil (pesado) de baixo para cima]:
  Nota: a porcentagem mostra a participação de um determinado chamador no total
  do número de chamadas de seu pai.
  Chamadores com participação inferior a 2.0% não são exibidos.

   ticks pai  nome
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```

## Perfilando aplicações web

As máquinas virtuais altamente otimizadas de hoje conseguem rodar aplicativos web em velocidades impressionantes. Mas não se deve confiar apenas nelas para alcançar um ótimo desempenho: um algoritmo cuidadosamente otimizado ou uma função menos cara podem frequentemente alcançar melhorias de velocidade muitas vezes maiores em todos os navegadores. O [CPU Profiler](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference) do [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/) ajuda a analisar os gargalos do seu código. Mas, às vezes, é necessário ir mais fundo e de forma mais granular: é aqui que o profiler interno do V8 é útil.

Vamos usar esse profiler para examinar o [demo explorador de Mandelbrot](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/) que a Microsoft [lançou](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) junto com o IE10. Após o lançamento do demo, o V8 corrigiu um bug que atrasava indevidamente os cálculos (daí o desempenho ruim do Chrome na postagem do blog do demo) e otimizou ainda mais o mecanismo, implementando uma aproximação mais rápida de `exp()` do que as bibliotecas de sistema padrão fornecem. Após essas mudanças, **o demo rodou 8× mais rápido do que anteriormente medido** no Chrome.

Mas e se você quiser que o código seja executado mais rápido em todos os navegadores? Você deve primeiro **entender o que mantém sua CPU ocupada**. Execute o Chrome (Windows e Linux [Canary](https://tools.google.com/dlpage/chromesxs)) com os seguintes parâmetros de linha de comando, o que fará com que ele gere informações de ticks do profiler (no arquivo `v8.log`) para a URL que você especificar, que no nosso caso era uma versão local da demo Mandelbrot sem web workers:

```bash
./chrome --js-flags='--prof' --no-sandbox 'http://localhost:8080/'
```

Ao preparar o caso de teste, certifique-se de que ele comece seu trabalho imediatamente ao carregar e feche o Chrome quando o cálculo for concluído (pressione Alt+F4), para que você tenha apenas os ticks relevantes no arquivo de log. Além disso, observe que web workers ainda não são corretamente perfilados com esta técnica.

Depois, processe o arquivo `v8.log` com o script `tick-processor` que acompanha o V8 (ou a nova versão prática baseada na web):

```bash
v8/tools/linux-tick-processor v8.log
```

Aqui está um fragmento interessante da saída processada que deve chamar sua atenção:

```
Resultado do perfil estatístico de null, (14306 ticks, 0 não contabilizados, 0 excluídos).
 [Bibliotecas compartilhadas]:
   ticks  total  não_lib   nome
   6326   44.2%    0.0%  /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%    0.0%  /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%    0.0%  /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%    0.0%  /.../chrome/src/out/Release/lib/libwebkit.so
```

A seção superior mostra que o V8 está gastando mais tempo dentro de uma biblioteca de sistema específica de SO do que em seu próprio código. Vamos ver o que é responsável por isso examinando a seção de saída "bottom up", onde você pode ler linhas indentadas como "foi chamado por" (e linhas que começam com um `*` significam que a função foi otimizada pelo TurboFan):

```
[Perfil "bottom up" (pesado)]:
  Nota: a porcentagem mostra a parcela de um determinado chamador no total
  do número de chamadas do seu pai.
  Chamadores ocupando menos de 2.0% não são mostrados.

   ticks pai  nome
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

Mais de **44% do tempo total é gasto executando a função `exp()` dentro de uma biblioteca de sistema**! Adicionando algum overhead para chamadas de bibliotecas de sistema, isso significa que cerca de dois terços do tempo geral são gastos avaliando `Math.exp()`.

Se você observar o código JavaScript, verá que `exp()` é usado apenas para produzir uma paleta de tons de cinza suave. Existem inúmeras maneiras de produzir uma paleta de tons de cinza suave, mas suponhamos que você realmente goste de gradientes exponenciais. É aí que entra a otimização algorítmica.

Você notará que `exp()` é chamado com um argumento no intervalo `-4 < x < 0`, então podemos substituí-lo com segurança por sua [aproximação de Taylor](https://en.wikipedia.org/wiki/Taylor_series) para esse intervalo, que entrega o mesmo gradiente suave com apenas uma multiplicação e algumas divisões:

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) para -4 < x < 0
```

Ajustar o algoritmo dessa forma aumenta o desempenho em mais 30% em comparação com o último Canary e por até 5× em relação à função `Math.exp()` baseada em bibliotecas de sistema no Chrome Canary.

![](/_img/docs/profile/mandelbrot.png)

Este exemplo mostra como o profiler interno do V8 pode ajudá-lo a entender profundamente os gargalos do seu código e como um algoritmo mais inteligente pode impulsionar o desempenho ainda mais.

Para saber mais sobre benchmarks que representam aplicativos da web complexos e exigentes de hoje, leia [Como o V8 mede desempenho no mundo real](/blog/real-world-performance).
