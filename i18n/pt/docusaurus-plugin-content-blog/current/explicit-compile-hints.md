---
 title: &apos;Dando uma Visão Geral ao V8: Início Mais Rápido do JavaScript com Dicas Explícitas de Compilação&apos;
 author: &apos;Marja Hölttä&apos;
 avatars:
   - marja-holtta
 date: 2025-04-29
 tags:
   - JavaScript
 description: "Dicas explícitas de compilação controlam quais arquivos e funções JavaScript são analisados e compilados antecipadamente"
 tweet: &apos;&apos;
---

Fazer o JavaScript rodar rapidamente é essencial para um aplicativo web responsivo. Mesmo com as otimizações avançadas do V8, analisar e compilar JavaScript crítico durante a inicialização ainda pode criar gargalos de desempenho. Saber quais funções JavaScript compilar durante a compilação inicial do script pode acelerar o carregamento da página da web.

<!--truncate-->
Ao processar um script carregado da rede, o V8 precisa decidir para cada função: compilar imediatamente ("de forma antecipada") ou adiar esse processo. Se uma função que não foi compilada for posteriormente chamada, o V8 precisará compilá-la sob demanda.

Se uma função JavaScript acabar sendo chamada durante o carregamento da página, compilá-la antecipadamente é benéfico, porque:

- Durante o processamento inicial do script, precisamos fazer pelo menos uma análise leve para encontrar o final da função. Em JavaScript, encontrar o final da função requer a análise completa da sintaxe (não há atalhos onde poderíamos contar as chaves - a gramática é muito complexa). Fazer a análise leve primeiro e a análise real posteriormente é trabalho duplicado.
- Se decidirmos compilar uma função antecipadamente, o trabalho acontece em um thread de fundo, e partes dele são intercaladas com o carregamento do script pela rede. Se, em vez disso, compilarmos a função apenas quando ela for chamada, será tarde demais para paralelizar o trabalho, já que o thread principal não pode prosseguir até a função ser compilada.

Você pode ler mais sobre como o V8 analisa e compila JavaScript [aqui](https://v8.dev/blog/preparser).

Muitas páginas da web se beneficiariam ao selecionar as funções corretas para compilação antecipada. Por exemplo, em nosso experimento com páginas da web populares, 17 de 20 mostraram melhorias, e a média de redução dos tempos de análise e compilação em primeiro plano foi de 630 ms.

Estamos desenvolvendo um recurso, [Dicas Explícitas de Compilação](https://github.com/WICG/explicit-javascript-compile-hints-file-based), que permite aos desenvolvedores web controlar quais arquivos JavaScript e funções são compilados antecipadamente. O Chrome 136 agora está lançando uma versão onde você pode selecionar arquivos individuais para compilação antecipada.

Esta versão é particularmente útil se você tiver um "arquivo central" que pode selecionar para compilação antecipada, ou se for capaz de mover códigos entre arquivos fonte para criar tal arquivo central.

Você pode acionar a compilação antecipada para o arquivo inteiro inserindo o comentário mágico

```js
//# allFunctionsCalledOnLoad
```

no topo do arquivo.

Este recurso deve ser usado com moderação - compilar muito consumirá tempo e memória!

## Veja por si mesmo - Dicas de compilação em ação

Você pode observar as dicas de compilação em funcionamento dizendo ao V8 para registrar os eventos da função. Por exemplo, você pode usar os seguintes arquivos para configurar um teste mínimo.

index.html:

```html
<script src="script1.js"></script>
<script src="script2.js"></script>
```

script1.js:

```js
function testfunc1() {
  console.log(&apos;testfunc1 chamado!&apos;);
}

testfunc1();
```

script2.js:

```js
//# allFunctionsCalledOnLoad

function testfunc2() {
  console.log(&apos;testfunc2 chamado!&apos;);
}

testfunc2();
```

Lembre-se de executar o Chrome com um diretório de dados do usuário limpo, para que o cache de código não interfira no seu experimento. Um exemplo de linha de comando seria:

```sh
rm -rf /tmp/chromedata && google-chrome --no-first-run --user-data-dir=/tmp/chromedata --js-flags=--log-function_events > log.txt
```

Depois de navegar para sua página de teste, você pode ver os seguintes eventos de função no log:

```sh
$ grep testfunc log.txt
function,preparse-no-resolution,5,18,60,0.036,179993,testfunc1
function,full-parse,5,18,60,0.003,181178,testfunc1
function,parse-function,5,18,60,0.014,181186,testfunc1
function,interpreter,5,18,60,0.005,181205,testfunc1
function,full-parse,6,48,90,0.005,184024,testfunc2
function,interpreter,6,48,90,0.005,184822,testfunc2
```

Como `testfunc1` foi compilado de forma preguiçosa, vemos o evento `parse-function` quando ele é finalmente chamado:

```sh
function,parse-function,5,18,60,0.014,181186,testfunc1
```

Para `testfunc2`, não vemos um evento correspondente, já que a dica de compilação forçou que fosse analisado e compilado antecipadamente.

## Futuro das Dicas Explícitas de Compilação

A longo prazo, queremos avançar para selecionar funções individuais para compilação antecipada. Isso permite que os desenvolvedores web controlem exatamente quais funções desejam compilar, extraindo até os últimos ganhos de desempenho de compilação para otimizar suas páginas da web. Fique ligado!
