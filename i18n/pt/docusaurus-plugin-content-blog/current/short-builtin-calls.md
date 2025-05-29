---
título: 'Chamadas internas curtas'
autor: "[Toon Verwaest](https://twitter.com/tverwaes), The Big Short"
avatares:
  - toon-verwaest
data: 2021-05-06
tags:
  - JavaScript
descrição: 'No V8 v9.1 desativamos temporariamente as funções internas incorporadas no desktop para evitar problemas de desempenho resultantes de chamadas indiretas distantes.'
tweet: "1394267917013897216"
---

No V8 v9.1 desativamos temporariamente as [funções internas incorporadas](https://v8.dev/blog/embedded-builtins) no desktop. Embora incorporar funções internas melhore significativamente o uso de memória, percebemos que chamadas de funções entre as funções internas incorporadas e o código compilado pelo JIT podem resultar em uma penalidade de desempenho considerável. Esse custo depende da microarquitetura do CPU. Neste post, vamos explicar por que isso está acontecendo, como o desempenho é afetado e o que planejamos fazer para resolver isso a longo prazo.

<!--truncate-->
## Alocação de código

O código de máquina gerado pelos compiladores just-in-time (JIT) do V8 é alocado dinamicamente em páginas de memória alocadas pela VM. O V8 aloca páginas de memória dentro de uma região contígua do espaço de endereço, que pode ser aleatoriamente localizada na memória (por razões de [randomização do layout do espaço de endereço](https://en.wikipedia.org/wiki/Address_space_layout_randomization)), ou dentro da "jaula" de memória virtual de 4 GiB que alocamos para [compressão de ponteiros](https://v8.dev/blog/pointer-compression).

O código JIT do V8 frequentemente chama funções internas. Funções internas são essencialmente trechos de código de máquina que são fornecidos como parte da VM. Existem funções internas que implementam funções completas da biblioteca padrão do JavaScript, como [`Function.prototype.bind`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_objects/Function/bind), mas muitas funções internas são trechos de código que preenchem a lacuna entre a semântica de maior nível do JS e as capacidades de baixo nível do CPU. Por exemplo, se uma função JavaScript quiser chamar outra, é comum que a implementação da função chame uma função interna `CallFunction` que determina como a função JavaScript alvo deve ser chamada; ou seja, se é um proxy ou uma função regular, quantos argumentos ela espera, etc. Como esses trechos são conhecidos ao construir a VM, eles são "embutidos" no binário do Chrome, o que significa que estão na região de código do binário do Chrome.

## Chamadas diretas vs. indiretas

Em arquiteturas de 64 bits, o binário do Chrome, que inclui essas funções internas, pode estar arbitrariamente longe do código JIT. Com o conjunto de instruções [x86-64](https://en.wikipedia.org/wiki/X86-64), isso significa que não podemos usar chamadas diretas: elas usam um imediato assinado de 32 bits como deslocamento para o endereço da chamada, e o alvo pode estar a mais de 2 GiB de distância. Em vez disso, precisamos contar com chamadas indiretas através de um registrador ou operando de memória. Essas chamadas dependem mais de previsão, pois não é imediatamente aparente na instrução de chamada qual o alvo da chamada. No [ARM64](https://en.wikipedia.org/wiki/AArch64) não podemos usar chamadas diretas porque o alcance é limitado a 128 MiB. Isso significa que, em ambos os casos, dependemos da precisão do preditor de ramificação indireta do CPU.

## Limitações da previsão de ramificação indireta

Ao direcionar x86-64, seria interessante contar com chamadas diretas. Isso reduziria a carga sobre o preditor de ramificação indireta, já que o alvo é conhecido após a decodificação da instrução, e também não exigiria que o alvo fosse carregado em um registrador a partir de uma constante ou memória. Mas as diferenças não estão apenas visíveis no código de máquina.

Devido ao [Spectre v2](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html), várias combinações de dispositivos e sistemas operacionais desativaram a previsão de ramificação indireta. Isso significa que, em tais configurações, teremos atrasos muito custosos nas chamadas de função do código JIT que dependem da função interna `CallFunction`.

Mais importante ainda, embora arquiteturas de conjunto de instruções de 64 bits (a "linguagem de alto nível do CPU") suportem chamadas indiretas para endereços distantes, a microarquitetura é livre para implementar otimizações com limitações arbitrárias. Parece comum que preditores de ramificação indireta assumam que distâncias de chamada não excedam certa distância (por exemplo, 4 GiB), requerendo menos memória por previsão. Por exemplo, o [Manual de Otimização da Intel](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf) afirma explicitamente:

> Para aplicações de 64 bits, o desempenho da previsão de ramificação pode ser negativamente impactado quando o alvo de uma ramificação está a mais de 4 GB de distância da ramificação.

Embora no ARM64 o intervalo arquitetural para chamadas diretas seja limitado a 128 MiB, descobriu-se que o chip [Apple M1](https://en.wikipedia.org/wiki/Apple_M1) possui a mesma limitação microarquitetural de 4 GiB para previsão de chamadas indiretas. Chamadas indiretas para um destino de chamada mais distante do que 4 GiB parecem sempre ser mal previstas. Devido ao buffer de reordenamento particularmente grande do M1, o componente da CPU que permite que instruções futuras previstas sejam executadas especulativamente fora de ordem, falhas frequentes de previsão resultam em uma penalidade de desempenho excepcionalmente alta.

## Solução temporária: copiar os builtins

Para evitar o custo de falhas frequentes de previsão e para evitar depender desnecessariamente da previsão de ramificações onde possível no x86-64, decidimos temporariamente copiar os builtins para a zona de compressão de ponteiros do V8 em máquinas desktop com memória suficiente. Isso coloca o código builtin copiado próximo ao código gerado dinamicamente. Os resultados de desempenho dependem muito da configuração do dispositivo, mas aqui estão alguns resultados de nossos bots de desempenho:

![Benchmarks de navegação registrados a partir de páginas ao vivo](/_img/short-builtin-calls/v8-browsing.svg)

![Melhoria de pontuação de benchmark](/_img/short-builtin-calls/benchmarks.svg)

Desembutir os builtins aumenta o uso de memória nos dispositivos afetados em 1.2 a 1.4 MiB por instância do V8. Como uma solução de longo prazo melhor, estamos analisando a possibilidade de alocar código JIT mais próximo do binário do Chrome. Dessa forma, podemos reincorporar os builtins para recuperar os benefícios de memória, enquanto também melhoramos o desempenho das chamadas do código gerado pelo V8 para o código C++.
