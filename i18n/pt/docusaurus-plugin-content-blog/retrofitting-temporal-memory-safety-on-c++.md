---
title: "Adaptando a segurança temporal da memória no C++"
author: "Anton Bikineev, Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), Hannes Payer ([@PayerHannes](https://twitter.com/PayerHannes))"
avatars: 
  - anton-bikineev
  - michael-lippautz
  - hannes-payer
date: 2022-06-14
tags: 
  - internals
  - memória
  - segurança
description: "Eliminando vulnerabilidades de uso após liberação no Chrome com varredura de heap."
---
:::note
**Nota:** Esta publicação foi originalmente publicada no [Google Security Blog](https://security.googleblog.com/2022/05/retrofitting-temporal-memory-safety-on-c.html).
:::

[Segurança da memória no Chrome](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) é um esforço contínuo para proteger nossos usuários. Estamos constantemente experimentando diferentes tecnologias para nos manter à frente de agentes maliciosos. Sob esse espírito, esta publicação fala sobre nossa jornada no uso de tecnologias de varredura de heap para melhorar a segurança de memória no C++.

<!--truncate-->
Vamos começar do início. Durante a vida útil de uma aplicação, seu estado geralmente é representado na memória. A segurança temporal da memória refere-se ao problema de garantir que a memória seja sempre acessada com as informações mais atualizadas sobre sua estrutura e tipo. O C++, infelizmente, não oferece tais garantias. Embora haja interesse em linguagens diferentes do C++ com garantias de segurança de memória mais robustas, grandes bases de código como o Chromium continuarão a usar C++ no futuro previsível.

```cpp
auto* foo = new Foo();
delete foo;
// O local de memória apontado por foo não representa mais
// um objeto Foo, pois o objeto foi deletado (liberado).
foo->Process();
```

No exemplo acima, `foo` é usado após sua memória ter sido devolvida ao sistema subjacente. O ponteiro desatualizado é chamado de [ponteiro inválido](https://en.wikipedia.org/wiki/Dangling_pointer) e qualquer acesso através dele resulta em um uso após liberação (UAF). No melhor caso, tais erros resultam em falhas bem definidas; no pior caso, causam falhas sutis que podem ser exploradas por agentes maliciosos.

UFAs muitas vezes são difíceis de identificar em grandes bases de código onde a propriedade de objetos é transferida entre vários componentes. O problema geral é tão difundido que, até hoje, tanto a indústria quanto a academia regularmente propõem estratégias de mitigação. Os exemplos são intermináveis: ponteiros inteligentes do C++ de todos os tipos são usados para definir e gerenciar melhor a propriedade no nível da aplicação; a análise estática em compiladores é usada para evitar compilar códigos problemáticos desde o início; onde a análise estática falha, ferramentas dinâmicas como os [sanitizadores do C++](https://github.com/google/sanitizers) podem interceptar acessos e detectar problemas em execuções específicas.

O uso do C++ no Chrome, infelizmente, não é diferente, e a maioria dos [bugs de segurança de alta severidade são questões relacionadas ao UAF](https://www.chromium.org/Home/chromium-security/memory-safety/). Para capturar problemas antes que cheguem à produção, todas as técnicas mencionadas anteriormente são usadas. Além dos testes regulares, os fuzzers garantem que sempre haja novas entradas para trabalhar com ferramentas dinâmicas. O Chrome vai ainda mais longe e utiliza um coletor de lixo para C++ chamado [Oilpan](https://v8.dev/blog/oilpan-library), que se desvia da semântica regular do C++ mas oferece segurança temporal da memória onde é usado. Onde tal desvio é irracional, um novo tipo de ponteiro inteligente chamado [MiraclePtr](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) foi introduzido recentemente para causar falhas de forma determinística no acesso a ponteiros inválidos quando usado. Oilpan, MiraclePtr e soluções baseadas em ponteiros inteligentes requerem adoções significativas no código da aplicação.

Na última década, outra abordagem teve algum sucesso: quarentena de memória. A ideia básica é colocar a memória explicitamente liberada em quarentena e disponibilizá-la apenas quando uma certa condição de segurança for alcançada. A Microsoft lançou versões dessa mitigação em seus navegadores: [MemoryProtector](https://securityintelligence.com/understanding-ies-new-exploit-mitigations-the-memory-protector-and-the-isolated-heap/) no Internet Explorer em 2014 e seu sucessor [MemGC](https://securityintelligence.com/memgc-use-after-free-exploit-mitigation-in-edge-and-ie-on-windows-10/) no Edge (pré-Chromium) em 2015. No [kernel do Linux](https://a13xp0p0v.github.io/2020/11/30/slab-quarantine.html), foi usada uma abordagem probabilística onde a memória acabava sendo apenas reciclada. Essa abordagem também tem recebido atenção na academia nos últimos anos com o artigo [MarkUs](https://www.cst.cam.ac.uk/blog/tmj32/addressing-temporal-memory-safety). O restante deste artigo resume nossa jornada experimentando com quarentena e varredura de heap no Chrome.

(Neste ponto, alguém pode perguntar onde o etiquetamento de memória se encaixa nesta imagem – continue lendo!)

## Quarentena e varredura do heap, o básico

A ideia principal por trás de garantir a segurança temporal com quarentena e varredura do heap é evitar reutilizar memória até que tenha sido provado que não há mais ponteiros (pendentes) referindo-se a ela. Para evitar mudanças no código do usuário em C++ ou sua semântica, o alocador de memória que fornece `new` e `delete` é interceptado.

![Figura 1: fundamentos da quarentena](/_img/retrofitting-temporal-memory-safety-on-c++/basics.svg)

Ao invocar `delete`, a memória é realmente colocada em quarentena, onde ela fica indisponível para ser reutilizada em chamadas subsequentes de `new` pela aplicação. Em algum momento, uma varredura do heap é acionada, que escaneia todo o heap, muito parecido com um coletor de lixo, para encontrar referências a blocos de memória em quarentena. Blocos que não possuem referências de entrada da memória regular da aplicação são transferidos de volta para o alocador, onde podem ser reutilizados para futuras alocações.

Existem várias opções de reforço que vêm com um custo de desempenho:

- Sobrescrever a memória em quarentena com valores especiais (por exemplo, zero);
- Parar todos os threads da aplicação enquanto a varredura está em execução ou escanear o heap de forma concorrente;
- Interceptar gravações na memória (por exemplo, por meio de proteção de página) para capturar atualizações de ponteiros;
- Escanear a memória palavra por palavra para possíveis ponteiros (tratamento conservador) ou fornecer descritores para objetos (tratamento preciso);
- Segregar a memória da aplicação em partições seguras e inseguras para excluir certos objetos que são sensíveis ao desempenho ou que podem ser provados estaticamente como seguros para ignorar;
- Escanear a pilha de execução além de apenas escanear a memória do heap;

Chamamos a coleção de diferentes versões desses algoritmos de *StarScan* [stɑː skæn], ou *\*Scan* para abreviar.

## Verificação da realidade

Aplicamos \*Scan às partes não gerenciadas do processo do renderizador e usamos [Speedometer2](https://browserbench.org/Speedometer2.0/) para avaliar o impacto no desempenho.

Experimentamos diferentes versões do \*Scan. Para minimizar o overhead de desempenho o máximo possível, avaliamos uma configuração que usa um thread separado para escanear o heap e evita limpar a memória em quarentena imediatamente no `delete`, mas sim limpa a memória em quarentena ao executar \*Scan. Optamos pela inclusão de toda memória alocada com `new` e não discriminamos entre locais e tipos de alocação para simplicidade na primeira implementação.

![Figura 2: Escaneamento em thread separado](/_img/retrofitting-temporal-memory-safety-on-c++/separate-thread.svg)

Note que a versão proposta do \*Scan não está completa. Concretamente, um ator malicioso pode explorar uma condição de corrida com o thread de escaneamento movendo um ponteiro pendente de uma região de memória não escaneada para uma região já escaneada. Corrigir essa condição de corrida exige monitorar gravações em blocos de memória já escaneada, por exemplo, usando mecanismos de proteção de memória para interceptar esses acessos, ou parando todos os threads da aplicação em pontos seguros para impedir a mutação do grafo de objetos como um todo. De qualquer forma, resolver esse problema tem um custo de desempenho e apresenta um interessante trade-off entre desempenho e segurança. Note que esse tipo de ataque não é genérico e não funciona para todos os casos de UAF. Problemas como os descritos na introdução não seriam propensos a tais ataques, pois o ponteiro pendente não é copiado.

Como os benefícios de segurança realmente dependem da granularidade desses pontos seguros, e queremos experimentar com a versão mais rápida possível, desativamos os pontos seguros completamente.

Executar nossa versão básica no Speedometer2 reduz o total de pontos em 8%. Que decepção...

De onde vem todo esse overhead? Sem surpresa, a varredura do heap é limitada pela memória e bastante cara, pois toda a memória do usuário deve ser percorrida e examinada quanto a referências pelo thread de escaneamento.

Para reduzir a regressão, implementamos várias otimizações que melhoram a velocidade bruta de escaneamento. Naturalmente, a maneira mais rápida de escanear a memória é não escaneá-la, e então particionamos o heap em duas classes: memória que pode conter ponteiros e memória que podemos provar estaticamente que não contém ponteiros, por exemplo, strings. Evitamos escanear memória que não pode conter nenhum ponteiro. Note que essa memória ainda faz parte da quarentena, apenas não é escaneada.

Estendemos esse mecanismo para também cobrir alocações que servem como memória de apoio para outros alocadores, por exemplo, memória de zona gerenciada pelo V8 para o compilador de JavaScript otimizado. Essas zonas sempre são descartadas de uma vez (ver gerenciamento de memória baseado em regiões) e a segurança temporal é estabelecida por outros meios no V8.

Além disso, aplicamos várias micro-otimizações para acelerar e eliminar cálculos: usamos tabelas auxiliares para filtragem de ponteiros; confiamos no SIMD para o loop de varredura limitado à memória; e minimizamos o número de buscas e instruções prefixadas por bloqueio.

Também melhoramos o algoritmo de escalonamento inicial que inicia uma varredura de heap ao atingir um certo limite, ajustando o tempo gasto em varredura em comparação com a execução do código do aplicativo (cf. utilização do mutador na [literatura de coleta de lixo](https://dl.acm.org/doi/10.1145/604131.604155)).

No final, o algoritmo ainda é limitado pela memória e a varredura continua sendo um procedimento notavelmente caro. As otimizações ajudaram a reduzir a regressão no Speedometer2 de 8% para 2%.

Embora tenhamos melhorado o tempo de varredura bruto, o fato de que a memória fica em quarentena aumenta o conjunto de trabalho geral de um processo. Para quantificar ainda mais esse overhead, usamos um conjunto selecionado de [benchmarks reais de navegação do Chrome](https://chromium.googlesource.com/catapult/) para medir o consumo de memória. \*A varredura no processo de renderização aumenta o consumo de memória em cerca de 12%. É esse aumento do conjunto de trabalho que leva a mais memória sendo paginada, o que é perceptível em caminhos rápidos de aplicativos.

## Extensão de marcação de memória de hardware ao resgate

MTE (Memory Tagging Extension) é uma nova extensão na arquitetura ARM v8.5A que ajuda a detectar erros no uso de memória de software. Esses erros podem ser erros espaciais (por exemplo, acessos fora dos limites) ou erros temporais (uso após liberação). A extensão funciona da seguinte forma: Cada 16 bytes de memória são atribuídos a um tag de 4 bits. Os ponteiros também recebem um tag de 4 bits. O alocador é responsável por retornar um ponteiro com o mesmo tag da memória alocada. As instruções de carga e armazenamento verificam se os tags do ponteiro e da memória correspondem. Caso os tags do local da memória e do ponteiro não correspondam, uma exceção de hardware é gerada.

MTE não oferece proteção determinística contra uso após liberação. Como o número de bits do tag é finito, há uma chance de que o tag da memória e do ponteiro correspondam devido a overflow. Com 4 bits, apenas 16 realocações são suficientes para que os tags correspondam. Um ator malicioso pode explorar o overflow dos bits de tag para obter um uso após liberação, apenas esperando até que o tag de um ponteiro pendente corresponda (novamente) à memória para onde ele aponta.

\*A varredura pode ser usada para corrigir esse caso problemático. Em cada chamada `delete`, o tag para o bloco de memória subjacente é incrementado pelo mecanismo MTE. Na maioria das vezes, o bloco estará disponível para realocação, pois o tag pode ser incrementado dentro do intervalo de 4 bits. Ponteiros obsoletos se refeririam ao tag antigo e, assim, falhariam de forma confiável na desreferenciação. Ao exceder o tag, o objeto é colocado em quarentena e processado por \*A varredura. Após a varredura verificar que não há mais ponteiros pendentes para esse bloco de memória, ele é devolvido ao alocador. Isso reduz o número de varreduras e seus custos associados em ~16 vezes.

A imagem a seguir ilustra este mecanismo. O ponteiro para `foo` inicialmente tem um tag de `0x0E`, permitindo que seja incrementado mais uma vez para alocar `bar`. Ao invocar `delete` para `bar`, o tag excede e a memória é efetivamente colocada em quarentena da \*varredura.

![Figura 3: MTE](/_img/retrofitting-temporal-memory-safety-on-c++/mte.svg)

Obtemos acesso a algum hardware real com suporte à MTE e refizemos os experimentos no processo de renderização. Os resultados são promissores, já que a regressão no Speedometer estava dentro do ruído e apenas regredimos a pegada de memória em cerca de 1% nas histórias reais de navegação do Chrome.

Isso é realmente algum [almoço grátis](https://en.wikipedia.org/wiki/No_free_lunch_theorem)? Descobrimos que o MTE vem com alguns custos que já foram pagos. Especificamente, PartitionAlloc, que é o alocador subjacente do Chrome, já realiza as operações de gerenciamento de tags para todos os dispositivos habilitados para MTE por padrão. Além disso, por motivos de segurança, a memória deve realmente ser zerada rapidamente. Para quantificar esses custos, executamos experimentos em um protótipo de hardware inicial que suporta MTE em várias configurações:

 A. MTE desativado e sem zerar a memória;
 B. MTE desativado, mas com a memória zerada;
 C. MTE ativado sem \*varredura;
 D. MTE ativado com \*varredura;

(Também estamos cientes de que existem MTE síncrono e assíncrono, o que também afeta o determinismo e o desempenho. Para este experimento, mantivemos o uso no modo assíncrono.)

![Figura 4: Regressão MTE](/_img/retrofitting-temporal-memory-safety-on-c++/mte-regression.svg)

Os resultados mostram que o MTE e a zeragem da memória trazem alguns custos, que são cerca de 2% no Speedometer2. Note que nem PartitionAlloc, nem o hardware foram otimizados para esses cenários ainda. O experimento também mostra que adicionar \*varredura sobre o MTE não traz custo mensurável.

## Conclusões
