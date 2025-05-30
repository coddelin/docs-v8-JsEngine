---
title: "Análise extremamente rápida, parte 1: otimizando o scanner"
author: "Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes)), otimização escandalosa"
avatars: 
  - "toon-verwaest"
date: "2019-03-25 13:33:37"
tags: 
  - internos
  - análise
tweet: "1110205101652787200"
description: "O alicerce do desempenho do analisador está em um scanner rápido. Este artigo explica como o scanner de JavaScript do V8 ficou recentemente até 2,1× mais rápido."
---
Para executar um programa JavaScript, o texto-fonte precisa ser processado para que o V8 possa entendê-lo. O V8 começa analisando o texto-fonte em uma árvore de sintaxe abstrata (AST), um conjunto de objetos que representam a estrutura do programa. Essa AST é compilada em bytecode pelo Ignition. O desempenho dessas fases de análise + compilação é importante: o V8 não pode executar o código antes que a compilação esteja concluída. Nesta série de posts de blog, focamos na análise e no trabalho feito no V8 para entregar um analisador extremamente rápido.

<!--truncate-->
Na verdade, começamos a série um estágio antes do analisador. O analisador do V8 consome ‘tokens’ fornecidos pelo ‘scanner’. Tokens são blocos de um ou mais caracteres que possuem um único significado semântico: uma string, um identificador, um operador como `++`. O scanner constrói esses tokens combinando caracteres consecutivos em um fluxo de caracteres subjacente.

O scanner consome um fluxo de caracteres Unicode. Esses caracteres Unicode são sempre decodificados a partir de um fluxo de unidades de código UTF-16. Apenas uma única codificação é suportada para evitar ramificações ou especializações do scanner e analisador para várias codificações, e escolhemos UTF-16, já que essa é a codificação das strings JavaScript, e as posições de origem precisam ser fornecidas em relação a essa codificação. O [`UTF16CharacterStream`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=46) fornece uma visão UTF-16 (possivelmente em buffer) sobre a codificação subjacente Latin1, UTF-8 ou UTF-16 que o V8 recebe do Chrome, que, por sua vez, o Chrome recebe da rede. Além de suportar mais de uma codificação, a separação entre scanner e o fluxo de caracteres permite ao V8 analisar de forma transparente como se toda a fonte estivesse disponível, mesmo que possamos ter recebido apenas uma parte dos dados pela rede até agora.

![](/_img/scanner/overview.svg)

A interface entre o scanner e o fluxo de caracteres é um método chamado [`Utf16CharacterStream::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=54) que retorna ou a próxima unidade de código UTF-16, ou `-1` para sinalizar o fim da entrada. UTF-16 não pode codificar todos os caracteres Unicode em uma única unidade de código. Caracteres fora do [Plano Multilíngue Básico](https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane) são codificados como duas unidades de código, também chamados pares substitutos. O scanner opera em caracteres Unicode em vez de unidades de código UTF-16, então ele encapsula essa interface de fluxo de baixo nível em um método [`Scanner::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?sq=package:chromium&g=0&rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=569) que decodifica as unidades de código UTF-16 em caracteres Unicode completos. O caractere decodificado atualmente é armazenado em buffer e captado por métodos de análise, como [`Scanner::ScanString()`](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=775).

O scanner [escolhe](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=422) um método ou token específico com base em um lookahead máximo de 4 caracteres, a sequência ambígua mais longa de caracteres em JavaScript[^1]. Depois que um método como `ScanString` é escolhido, ele consome o restante dos caracteres para aquele token, armazenando em buffer o primeiro caractere que não faz parte do token para o próximo token analisado. No caso de `ScanString`, ele também copia os caracteres analisados em um buffer codificado como Latin1 ou UTF-16, enquanto decodifica as sequências de escape.

[^1]: `<!--` é o início de um comentário HTML, enquanto `<!-` é analisado como “menor que”, “não”, “menos”.

## Espaços em branco

Os tokens podem ser separados por vários tipos de espaços em branco, por exemplo, nova linha, espaço, tabulação, comentários de linha única, comentários multilinha, etc. Um tipo de espaço em branco pode ser seguido por outros tipos de espaço em branco. O espaço em branco adiciona significado se causar uma quebra de linha entre dois tokens: isso possivelmente resulta na [inserção automática de ponto e vírgula](https://tc39.es/ecma262/#sec-automatic-semicolon-insertion). Portanto, antes de examinar o próximo token, todos os espaços em branco são ignorados, mas mantendo o controle de se ocorreu uma nova linha. A maioria do código JavaScript usado em produção é minimizado, e, felizmente, espaços em branco de vários caracteres não são muito comuns. Por isso, o V8 analisa uniformemente cada tipo de espaço em branco de forma independente, como se fossem tokens regulares. Por exemplo, se o primeiro caractere do token for `/` seguido por outro `/`, o V8 analisa isso como um comentário de linha única que retorna `Token::WHITESPACE`. Esse loop simplesmente continua analisando tokens [até](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=671) encontrarmos um token diferente de `Token::WHITESPACE`. Isso significa que, se o próximo token não for precedido por espaço em branco, começamos imediatamente a analisar o token relevante sem precisar verificar explicitamente o espaço em branco.

No entanto, o próprio loop adiciona sobrecarga a cada token analisado: ele requer um desvio para verificar o token que acabamos de analisar. Seria melhor continuar o loop apenas se o token que acabamos de analisar pudesse ser um `Token::WHITESPACE`. Caso contrário, deveríamos simplesmente sair do loop. Fazemos isso movendo o próprio loop para um [método auxiliar](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d62ec0d84f2ec8bc0d56ed7b8ed28eaee53ca94e&l=178) separado, do qual retornamos imediatamente quando temos certeza de que o token não é `Token::WHITESPACE`. Embora essas mudanças possam parecer muito pequenas, elas removem a sobrecarga para cada token analisado. Isso faz diferença especialmente para tokens muito curtos, como pontuação:

![](/_img/scanner/punctuation.svg)

## Análise de identificadores

O token mais complicado, mas também mais comum, é o token [identificador](https://tc39.es/ecma262/#prod-Identifier), que é usado para nomes de variáveis (entre outras coisas) no JavaScript. Identificadores começam com um caractere Unicode com a propriedade [`ID_Start`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=807), opcionalmente seguido por uma sequência de caracteres com a propriedade [`ID_Continue`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=947). Verificar se um caractere Unicode possui a propriedade `ID_Start` ou `ID_Continue` é bastante caro. Inserindo um cache que mapeia caracteres para suas propriedades, conseguimos acelerar um pouco esse processo.

A maior parte do código JavaScript é escrita usando caracteres ASCII. Dos caracteres no intervalo ASCII, apenas `a-z`, `A-Z`, `$` e `_` são caracteres iniciais de identificadores. `ID_Continue` inclui adicionalmente `0-9`. Nós aceleramos a análise de identificadores construindo uma tabela com flags para cada um dos 128 caracteres ASCII, indicando se o caractere é um `ID_Start`, um caractere `ID_Continue`, etc. Enquanto os caracteres que estamos analisando estiverem no intervalo ASCII, consultamos os flags nessa tabela e verificamos uma propriedade com uma única bifurcação. Os caracteres fazem parte do identificador até vermos o primeiro caractere que não tenha a propriedade `ID_Continue`.

Todas as melhorias mencionadas neste post resultam na seguinte diferença no desempenho de análise de identificadores:

![](/_img/scanner/identifiers-1.svg)

Pode parecer contraintuitivo que identificadores mais longos sejam analisados mais rapidamente. Isso pode fazer você pensar que é benéfico para o desempenho aumentar o comprimento do identificador. Analisar identificadores mais longos é simplesmente mais rápido em termos de MB/s porque permanecemos mais tempo em um loop muito apertado sem retornar ao analisador. No entanto, do ponto de vista do desempenho de sua aplicação, o que importa é o quão rápido podemos analisar tokens completos. O gráfico a seguir mostra aproximadamente o número de tokens que analisamos por segundo em relação ao comprimento do token:

![](/_img/scanner/identifiers-2.svg)

Aqui fica claro que usar identificadores mais curtos é benéfico para o desempenho de análise de sua aplicação: conseguimos analisar mais tokens por segundo. Isso significa que os sites que parecem ser analisados mais rapidamente em MB/s simplesmente têm menor densidade de informações e, na verdade, produzem menos tokens por segundo.

## Internalizando identificadores minimizados

Todos os literais de string e identificadores são deduplicados na fronteira entre o scanner e o analisador. Se o analisador solicitar o valor de uma string ou identificador, ele recebe um objeto de string único para cada valor literal possível. Isso normalmente requer uma busca em tabela hash. Como o código JavaScript muitas vezes é minimizado, o V8 usa uma tabela de busca simples para strings de caracteres ASCII único.

## Palavras-chave

Palavras-chave são um subconjunto especial de identificadores definidos pela linguagem, por exemplo, `if`, `else` e `function`. O scanner do V8 retorna tokens diferentes para palavras-chave do que para identificadores. Após analisar um identificador, precisamos reconhecer se o identificador é uma palavra-chave. Como todas as palavras-chave no JavaScript contêm apenas caracteres minúsculos de `a-z`, também mantemos flags indicando se caracteres ASCII são possíveis caracteres iniciais e contínuos de palavras-chave.

Se um identificador puder ser uma palavra-chave de acordo com os flags, poderíamos encontrar um subconjunto de candidatos a palavras-chave alternando sobre o primeiro caractere do identificador. Há mais caracteres distintos iniciais do que comprimentos de palavras-chave, então isso reduz o número de bifurcações subsequentes. Para cada caractere, fazemos bifurcações com base nos possíveis comprimentos de palavras-chave e só comparamos o identificador com a palavra-chave se o comprimento também corresponder.

Melhor é usar uma técnica chamada [hashing perfeito](https://en.wikipedia.org/wiki/Perfect_hash_function). Como a lista de palavras-chave é estática, podemos calcular uma função de hashing perfeito que para cada identificador nos dá no máximo uma palavra-chave candidata. O V8 utiliza o [gperf](https://www.gnu.org/software/gperf/) para calcular essa função. O [resultado](https://cs.chromium.org/chromium/src/v8/src/parsing/keywords-gen.h) calcula um hash a partir do comprimento e dos dois primeiros caracteres do identificador para encontrar a única palavra-chave candidata. Só comparamos o identificador com a palavra-chave se o comprimento dessa palavra-chave corresponder ao comprimento do identificador de entrada. Isso acelera especialmente o caso em que um identificador não é uma palavra-chave, pois precisamos de menos ramificações para descobrir isso.

![](/_img/scanner/keywords.svg)

## Pares substitutos

Como mencionado anteriormente, nosso scanner opera em um fluxo de caracteres codificados em UTF-16, mas consome caracteres Unicode. Os caracteres em planos suplementares têm um significado especial apenas para tokens identificadores. Se, por exemplo, tais caracteres ocorrerem em uma string, eles não encerram a string. Os substitutos isolados são suportados pelo JS e simplesmente copiados da fonte também. Por essa razão, é melhor evitar a combinação de pares substitutos até que seja absolutamente necessário e deixar o scanner operar diretamente nas unidades de código UTF-16 ao invés de caracteres Unicode. Quando estamos analisando uma string, não precisamos procurar por pares substitutos, combiná-los e, em seguida, dividi-los novamente quando armazenamos os caracteres para construir um literal. Existem apenas dois lugares restantes onde o scanner precisa lidar com pares substitutos. No início da varredura de tokens, apenas quando não reconhecemos um caractere como outra coisa, precisamos [combinar](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=515) pares substitutos para verificar se o resultado é um início de identificador. Da mesma forma, precisamos [combinar](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=1003) pares substitutos no caminho lento da varredura de identificadores que lidam com caracteres não ASCII.

## `AdvanceUntil`

A interface entre o scanner e o `UTF16CharacterStream` torna o limite bastante dependente de estado. O fluxo acompanha sua posição no buffer, que incrementa após cada unidade de código consumida. O scanner armazena temporariamente uma unidade de código recebida antes de retornar ao método de varredura que solicitou o caractere. Esse método lê o caractere armazenado e continua com base em seu valor. Isso fornece uma boa estratificação, mas é bastante lento. No outono passado, nosso estagiário Florian Sattler apresentou uma interface melhorada que mantém os benefícios da estratificação enquanto fornece acesso muito mais rápido às unidades de código no fluxo. Uma função template chamada [`AdvanceUntil`](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=72), especializada para um auxiliar de varredura específico, chama o auxiliar para cada caractere no fluxo até que o auxiliar retorne falso. Isso essencialmente fornece ao scanner acesso direto aos dados subjacentes sem quebrar abstrações. Na verdade, simplifica as funções auxiliares de varredura, já que elas não precisam lidar com `EndOfInput`.

![](/_img/scanner/advanceuntil.svg)

`AdvanceUntil` é especialmente útil para acelerar funções de varredura que podem precisar consumir um grande número de caracteres. Usamos essa função para acelerar identificadores já mostrados anteriormente, mas também strings[^2] e comentários.

[^2]: Strings e identificadores que não podem ser codificados em Latin1 são atualmente mais caros, pois primeiro tentamos armazená-los como Latin1, convertendo-os para UTF-16 assim que encontramos um caractere que não pode ser codificado em Latin1.

## Conclusão

O desempenho da varredura é a base do desempenho do analisador. Ajustamos nosso scanner para ser o mais eficiente possível. Isso resultou em melhorias gerais, melhorando o desempenho de varredura de token único em aproximadamente 1,4×, varredura de strings em 1,3×, varredura de comentários multilinha em 2,1× e varredura de identificadores em 1,2–1,5×, dependendo do comprimento do identificador.

Nosso scanner só pode fazer até certo ponto, no entanto. Como desenvolvedor, você pode melhorar ainda mais o desempenho do parsing aumentando a densidade de informações de seus programas. A maneira mais fácil de fazer isso é minimizando seu código-fonte, removendo espaços desnecessários e evitando identificadores não ASCII sempre que possível. Idealmente, esses passos são automatizados como parte de um processo de build, caso em que você não precisa se preocupar com isso ao escrever o código.
