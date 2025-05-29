---
title: "Indicium: Ferramenta de rastreamento de runtime do V8"
author: "Zeynep Cankara ([@ZeynepCankara](https://twitter.com/ZeynepCankara))"
avatars: 
  - "zeynep-cankara"
date: "2020-10-01 11:56:00"
tags: 
  - ferramentas
  - analisador-de-sistema
description: "Indicium: Ferramenta de análise de sistema do V8 para analisar eventos de Map/IC."
tweet: "1311689392608731140"
---
# Indicium: analisador de sistema do V8

Os últimos três meses foram uma experiência de aprendizado incrível para mim, já que me juntei à equipe do V8 (Google Londres) como estagiária e tenho trabalhado em uma nova ferramenta chamada [*Indicium*](https://v8.dev/tools/head/system-analyzer).

Este analisador de sistema é uma interface web unificada para rastrear, depurar e analisar padrões de como Inline Caches (ICs) e Maps são criados e modificados em aplicações reais.

O V8 já possui uma infraestrutura de rastreamento para [ICs](https://mathiasbynens.be/notes/shapes-ics) e [Maps](https://v8.dev/blog/fast-properties), que pode processar e analisar eventos de IC usando o [IC Explorer](https://v8.dev/tools/v8.7/ic-explorer.html) e eventos de Map usando o [Map Processor](https://v8.dev/tools/v8.7/map-processor.html). No entanto, ferramentas anteriores não nos permitiam analisar mapas e ICs de forma holística, o que agora é possível com o analisador de sistema.

<!--truncate-->
![Indicium](/_img/system-analyzer/indicium-logo.png)

## Estudo de Caso

Vamos passar por um exemplo para demonstrar como podemos usar o Indicium para analisar eventos de log de Map e IC no V8.

```javascript
class Point {
  constructor(x, y) {
    if (x < 0 || y < 0) {
      this.isNegative = true;
    }
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}

let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

// aquecimento
for (let i = 0; i < 10e5; i++) {
  dotProduct = a.dotProduct(b);
}

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');

a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

Aqui, temos uma classe `Point` que armazena duas coordenadas e um booleano adicional baseado nos valores das coordenadas. A classe `Point` possui um método `dotProduct` que retorna o produto escalar entre o objeto passado e o receptor.

Para facilitar a explicação do programa, vamos dividir o programa em dois trechos (ignorando a fase de aquecimento):

### *trecho 1*

```javascript
let a = new Point(1, 1);
let b = new Point(2, 2);
let dotProduct;

console.time('snippet1');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet1');
```

### *trecho 2*

```javascript
a = new Point(-1, -1);
b = new Point(-2, -2);
console.time('snippet2');
for (let i = 0; i < 10e6; i++) {
  dotProduct = a.dotProduct(b);
}
console.timeEnd('snippet2');
```

Quando executamos o programa, notamos uma regressão de desempenho. Mesmo que estejamos medindo o desempenho de dois trechos similares; acessando as propriedades `x` e `y` das instâncias do objeto `Point` ao chamar a função `dotProduct` em um loop.

O trecho 1 executa aproximadamente 3 vezes mais rápido do que o trecho 2. A única diferença é que usamos valores negativos para as propriedades `x` e `y` no objeto `Point` no trecho 2.

![Análise de desempenho dos trechos.](/_img/system-analyzer/initial-program-performance.png)

Para analisar essa diferença de desempenho, podemos usar várias opções de registro que vêm com o V8. É aqui que o analisador de sistema brilha. Ele pode exibir eventos de log e vinculá-los com eventos de mapa, permitindo-nos explorar a magia que está escondida dentro do V8.

Antes de entrar mais no estudo de caso, vamos nos familiarizar com os painéis da ferramenta de análise de sistema. A ferramenta possui quatro painéis principais:

- um painel de Linha do Tempo para analisar eventos de Map/ICs ao longo do tempo,
- um painel de Map para visualizar as árvores de transição dos mapas,
- um painel de IC para obter estatísticas sobre os eventos de IC,
- um painel de Fonte para mostrar posições de arquivos Map/IC em um script.

![Visão Geral do Analisador de Sistema](/_img/system-analyzer/system-analyzer-overview.png)

![Agrupar eventos IC por nome de função para obter informações detalhadas sobre os eventos IC associados ao `dotProduct`.](/_img/system-analyzer/case1_1.png)

Estamos analisando como a função `dotProduct` pode estar causando essa diferença de desempenho. Então agrupamos eventos IC por nome da função para obter mais informações detalhadas sobre os eventos IC associados à função `dotProduct`.

A primeira coisa que notamos é que temos duas diferentes transições de estado IC registradas pelos eventos IC nesta função. Um indo de não-inicializado para monomórfico e outro indo de monomórfico para polimórfico. O estado IC polimórfico indica que agora estamos rastreando mais de um Map associado aos objetos `Point`, e esse estado polimórfico é pior, pois precisamos realizar verificações adicionais.

Queremos saber por que estamos criando várias formas de Mapa para o mesmo tipo de objetos. Para isso, alternamos o botão de informações sobre o estado IC para obter mais informações sobre os endereços de Mapa que vão de não inicializado a monomórfico.

![A árvore de transição de mapa associada ao estado IC monomórfico.](/_img/system-analyzer/case1_2.png)

![A árvore de transição de mapa associada ao estado IC polimórfico.](/_img/system-analyzer/case1_3.png)

Para o estado IC monomórfico, podemos visualizar a árvore de transição e ver que estamos adicionando dinamicamente apenas duas propriedades `x` e `y`, mas quando se trata do estado IC polimórfico, temos um novo Mapa contendo três propriedades `isNegative`, `x` e `y`.

![O painel de Mapa comunica as informações de posição do arquivo para destacar posições de arquivo no painel de fonte.](/_img/system-analyzer/case1_4.png)

Clicamos na seção de posição do arquivo do painel de Mapa para ver onde essa propriedade `isNegative` é adicionada no código fonte e podemos usar essa percepção para resolver a regressão de desempenho.

Agora a questão é *como podemos resolver a regressão de desempenho utilizando a percepção que geramos com a ferramenta*?

A solução mínima seria sempre inicializar a propriedade `isNegative`. Em geral, é um bom conselho que todas as propriedades de instância sejam inicializadas no construtor.

Agora, a classe `Point` atualizada fica assim:

```javascript
class Point {
  constructor(x, y) {
    this.isNegative = x < 0 || y < 0;
    this.x = x;
    this.y = y;
  }

  dotProduct(other) {
    return this.x * other.x + this.y * other.y;
  }
}
```

Se executarmos o script novamente com a classe `Point` modificada, veremos que a execução dos dois trechos definidos no início do estudo de caso têm desempenhos muito semelhantes.

Em um rastreamento atualizado, vemos que o estado IC polimórfico é evitado, pois não estamos criando vários mapas para o mesmo tipo de objetos.

![A árvore de transição de mapa do objeto Point modificado.](/_img/system-analyzer/case2_1.png)

## O Analisador de Sistema

Agora vamos ter uma visão detalhada dos diferentes painéis presentes no analisador de sistema.

### Painel de Linha do Tempo

O painel de linha do tempo permite a seleção no tempo, habilitando a visualização dos estados IC/mapa em pontos discretos de tempo ou em um intervalo selecionado no tempo. Ele suporta recursos de filtragem, como ampliar/reduzir os eventos de log para intervalos de tempo selecionados.

![Visão geral do painel de linha do tempo](/_img/system-analyzer/timeline-panel.png)

![Visão geral do painel de linha do tempo (Cont.)](/_img/system-analyzer/timeline-panel2.png)

### Painel de Mapa

O painel de mapa possui dois subpainéis:

1. Detalhes do mapa
2. Transições do mapa

O painel de mapa visualiza as árvores de transição dos mapas selecionados. Os metadados do mapa selecionado são exibidos através do subpainel de detalhes do mapa. Uma árvore de transição específica associada a um endereço de mapa pode ser pesquisada usando a interface fornecida. No subpainel de Estatísticas, que fica acima do subpainel de transições de mapa, podemos ver estatísticas sobre as propriedades que causam transições de mapa e os tipos de eventos de mapa.

![Visão geral do painel de mapa](/_img/system-analyzer/map-panel.png)

![Visão geral do painel de estatísticas](/_img/system-analyzer/stats-panel.png)

### Painel IC

O painel IC exibe estatísticas sobre eventos IC dentro de um intervalo de tempo específico que são filtrados através do painel de linha do tempo. Além disso, o painel IC permite agrupar eventos IC com base em várias opções (tipo, categoria, mapa, posição do arquivo). A partir das opções de agrupamento, as opções de agrupamento de mapa e posição de arquivo interagem com os painéis de mapa e código fonte, respectivamente, para exibir as árvores de transição de mapas e destacar as posições de arquivo associadas aos eventos IC.

![Visão geral do painel IC](/_img/system-analyzer/ic-panel.png)

![Visão geral do painel IC (Cont.)](/_img/system-analyzer/ic-panel2.png)

![Visão geral do painel IC (Cont.)](/_img/system-analyzer/ic-panel3.png)

![Visão geral do painel IC (Cont.)](/_img/system-analyzer/ic-panel4.png)

### Painel de Fonte

O painel de fonte exibe os scripts carregados com marcadores clicáveis para emitir eventos personalizados que selecionam tanto os eventos de mapa quanto os de log IC nos painéis personalizados. A seleção de um script carregado pode ser feita na barra de detalhamento. Selecionar uma posição de arquivo do painel de Mapa e painel IC destaca a posição de arquivo selecionada no painel de código fonte.

![Visão geral do painel de fonte](/_img/system-analyzer/source-panel.png)

### Agradecimentos

Gostaria de agradecer a todos das equipes V8 e Web no Android, especialmente ao meu anfitrião Sathya e co-anfitrião Camillo, por me apoiar durante meu estágio e por me dar a oportunidade de trabalhar em um projeto tão legal.

Foi um verão incrível estagiando no Google!
