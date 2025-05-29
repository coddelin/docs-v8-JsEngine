---
title: "`Intl.ListFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)) e Frank Yung-Fong Tang"
avatars:
  - "mathias-bynens"
  - "frank-tang"
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: "A API Intl.ListFormat permite a formatação localizada de listas sem sacrificar o desempenho."
tweet: "1074966915557351424"
---
Aplicações web modernas frequentemente usam listas compostas de dados dinâmicos. Por exemplo, um aplicativo visualizador de fotos pode exibir algo como:

> Esta foto inclui **Ada, Edith, _e_ Grace**.

Um jogo baseado em texto pode ter um tipo diferente de lista:

> Escolha seu superpoder: **invisibilidade, psicocinese, _ou_ empatia**.

Como cada idioma tem convenções de formatação de listas e palavras diferentes, implementar um formatador de listas localizado não é trivial. Isso não só exige uma lista de todas as palavras (como “e” ou “ou” nos exemplos acima) para cada idioma que você deseja suportar — além disso, você precisa codificar as convenções de formatação exatas para todos esses idiomas! [O Unicode CLDR](http://cldr.unicode.org/translation/lists) fornece esses dados, mas para usá-los em JavaScript, eles precisam ser integrados e enviados junto com o restante do código da biblioteca. Isso, infelizmente, aumenta o tamanho do pacote para essas bibliotecas, o que impacta negativamente os tempos de carregamento, o custo de análise/compilação e o consumo de memória.

<!--truncate-->
A nova API `Intl.ListFormat` transfere essa responsabilidade para o motor JavaScript, que pode enviar os dados de localização e torná-los diretamente disponíveis aos desenvolvedores JavaScript. `Intl.ListFormat` permite a formatação localizada de listas sem sacrificar o desempenho.

## Exemplos de uso

O exemplo a seguir demonstra como criar um formatador de listas para conjunções usando o idioma inglês:

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank and Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, and Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, and Harrison'
```

Disjunções (“ou” em inglês) também são suportadas através do parâmetro opcional `options`:

```js
const lf = new Intl.ListFormat('en', { type: 'disjunction' });
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank or Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, or Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, or Harrison'
```

Aqui está um exemplo usando um idioma diferente (chinês, com código de idioma `zh`):

```js
const lf = new Intl.ListFormat('zh');
lf.format(['永鋒']);
// → '永鋒'
lf.format(['永鋒', '新宇']);
// → '永鋒和新宇'
lf.format(['永鋒', '新宇', '芳遠']);
// → '永鋒、新宇和芳遠'
lf.format(['永鋒', '新宇', '芳遠', '澤遠']);
// → '永鋒、新宇、芳遠和澤遠'
```

O parâmetro `options` possibilita usos mais avançados. Aqui está uma visão geral das várias opções e suas combinações, e como elas correspondem aos padrões de lista definidos por [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns):


| Tipo                  | Opções                                   | Descrição                                                                                     | Exemplos                         |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| padrão (ou nenhum tipo) | `{}` (padrão)                            | Uma lista típica com “e” para espaços reservados arbitrários                                    | `'Janeiro, Fevereiro, e Março'` |
| ou                    | `{ type: 'disjunction' }`                 | Uma lista típica com “ou” para espaços reservados arbitrários                                   | `'Janeiro, Fevereiro, ou Março'`  |
| unidade               | `{ type: 'unit' }`                        | Uma lista adequada para unidades largas                                                        | `'3 pés, 7 polegadas'`             |
| unidade-curta         | `{ type: 'unit', style: 'short' }`        | Uma lista adequada para unidades curtas                                                        | `'3 ft, 7 in'`                   |
| unidade-estreita      | `{ type: 'unit', style: 'narrow' }`       | Uma lista adequada para unidades estreitas, onde o espaço na tela é muito limitado             | `'3′ 7″'`                        |


Observe que, em muitos idiomas (como o inglês), pode não haver diferença entre muitas dessas listas. Em outros, o espaçamento, o comprimento ou a presença de uma conjunção e os separadores podem mudar.

## Conclusão

À medida que a API `Intl.ListFormat` se torna mais amplamente disponível, você encontrará bibliotecas abandonando sua dependência de bancos de dados CLDR codificados em favor da funcionalidade nativa de formatação de listas, melhorando assim o desempenho do tempo de carregamento, do tempo de análise e compilação, do tempo de execução e do uso de memória.

## Suporte ao `Intl.ListFormat`

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="no"
                 safari="no"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
