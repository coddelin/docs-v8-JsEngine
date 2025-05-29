---
title: "O WebAssembly JSPI tem uma nova API"
description: "Este artigo detalha algumas mudanças futuras na API de Integração de Promessas do JavaScript (JSPI)."
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-06-04
tags: 
  - WebAssembly
---
A API de Integração de Promessas do JavaScript (JSPI) no WebAssembly tem uma nova API, disponível na versão M126 do Chrome. Falamos sobre o que mudou, como usá-la com o Emscripten e qual é o roteiro do JSPI.

JSPI é uma API que permite que aplicações WebAssembly que utilizam APIs *sequenciais* acessem APIs Web que são *assíncronas*. Muitas APIs Web são construídas em termos de objetos `Promise` do JavaScript: em vez de executar imediatamente a operação solicitada, elas retornam uma `Promise` para realizá-la. Por outro lado, muitas das aplicações compiladas para WebAssembly vêm do universo C/C++, que é dominado por APIs que bloqueiam o chamador até que sejam concluídas.

<!--truncate-->
O JSPI se integra à arquitetura da Web para permitir que uma aplicação WebAssembly seja suspensa quando um `Promise` é retornado e retomada quando o `Promise` é resolvido.

Você pode descobrir mais sobre o JSPI e como usá-lo [neste post do blog](https://v8.dev/blog/jspi) e na [especificação](https://github.com/WebAssembly/js-promise-integration).

## O que há de novo?

### O fim dos objetos `Suspender`

Em janeiro de 2024, o subgrupo Stacks do Wasm CG [votou](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md) para modificar a API do JSPI. Especificamente, em vez de usar um objeto `Suspender` explícito, usaremos o limite entre JavaScript e WebAssembly como o delimitador para determinar quais computações são suspensas.

A diferença é relativamente pequena, mas potencialmente significativa: quando uma computação deve ser suspensa, a chamada mais recente em uma exportação do WebAssembly encapsulada determina o 'ponto de corte' do que é suspenso.

A implicação disso é que um desenvolvedor usando JSPI terá um pouco menos de controle sobre esse ponto de corte. Por outro lado, não precisar gerenciar explicitamente objetos `Suspender` torna a API significativamente mais fácil de usar.

### Não existe mais `WebAssembly.Function`

Outra mudança está no estilo da API. Em vez de caracterizar os wrappers do JSPI em termos do construtor `WebAssembly.Function`, fornecemos funções e construtores específicos.

Isso traz vários benefícios:

- Remove a dependência da [Proposta de *Reflexão de Tipos*](https://github.com/WebAssembly/js-types).
- Torna as ferramentas para JSPI mais simples: as novas funções da API não precisam mais se referir explicitamente aos tipos de funções do WebAssembly.

Essa mudança é possível pela decisão de não ter mais objetos `Suspender` referenciados explicitamente.

### Retornar sem suspender

Uma terceira mudança refere-se ao comportamento das chamadas de suspensão. Em vez de sempre suspender ao chamar uma função JavaScript de uma importação de suspensão, suspendemos apenas quando a função JavaScript realmente retorna um `Promise`.

Essa mudança, embora aparentemente vá contra as [recomendações](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises) do W3C TAG, representa uma otimização segura para os usuários do JSPI. É segura porque o JSPI na verdade assume o papel de *chamador* de uma função que retorna uma `Promise`.

Essa mudança provavelmente terá um impacto mínimo na maioria das aplicações; entretanto, algumas aplicações poderão notar benefícios significativos ao evitar viagens desnecessárias ao loop de eventos do navegador.

### A nova API

A API é direta: existe uma função que recebe uma função exportada de um módulo WebAssembly e a converte em uma função que retorna uma `Promise`:

```js
Function Webassembly.promising(Function wsFun)
```

Observe que, mesmo que o argumento seja tipado como uma `Function` do JavaScript, ele é restrito a funções do WebAssembly.

Do lado da suspensão, há uma nova classe `WebAssembly.Suspending`, juntamente com um construtor que recebe uma função JavaScript como argumento. Em WebIDL, isso é escrito como segue:

```js
interface Suspending{
  constructor (Function fun);
}
```

Observe que esta API tem uma sensação assimétrica: existe uma função que recebe uma função do WebAssembly e retorna uma nova função prometedora (_sic_); enquanto para marcar uma função de suspensão, você a encapsula em um objeto `Suspending`. Isso reflete uma realidade mais profunda sobre o que está acontecendo nos bastidores.

O comportamento de suspensão de uma importação é intrinsecamente parte da *chamada* para a importação: ou seja, alguma função dentro do módulo instanciado chama a importação e suspende como resultado.

Por outro lado, a função `promising` recebe uma função regular do WebAssembly e retorna uma nova que pode responder à suspensão e que retorna uma `Promise`.

### Usando a nova API

Se você é um usuário do Emscripten, então usar a nova API geralmente não exigirá mudanças no seu código. Você deve estar usando uma versão do Emscripten que seja pelo menos a 3.1.61 e deve estar usando uma versão do Chrome que seja pelo menos a 126.0.6478.17 (Chrome M126).

Se você está criando sua própria integração, então seu código deve ser significativamente mais simples. Em particular, não é mais necessário ter código que armazene o objeto `Suspender` passado (e recuperá-lo ao chamar a importação). Você pode simplesmente usar um código sequencial regular dentro do módulo WebAssembly.

### A API antiga

A API antiga continuará a operar pelo menos até 29 de outubro de 2024 (Chrome M128). Após isso, planejamos remover a API antiga.

Note que o próprio Emscripten não dará mais suporte à API antiga a partir da versão 3.1.61.

### Detectar qual API está no seu navegador

Alterar APIs nunca deve ser feito levianamente. Podemos fazer isso neste caso porque o próprio JSPI ainda é provisório. Há uma maneira simples de verificar qual API está habilitada no seu navegador:

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

A função `oldAPI` retorna verdadeiro se a antiga API JSPI estiver habilitada no seu navegador, e a função `newAPI` retorna verdadeiro se a nova API JSPI estiver habilitada.

## O que está acontecendo com o JSPI?

### Aspectos de implementação

A maior mudança no JSPI em que estamos trabalhando é, na verdade, invisível para a maioria dos programadores: as chamadas pilhas expansíveis.

A implementação atual do JSPI é baseada na alocação de pilhas de tamanho fixo. Na verdade, as pilhas alocadas são bastante grandes. Isso ocorre porque precisamos acomodar cálculos arbitrários de WebAssembly que podem exigir pilhas profundas para lidar adequadamente com a recursão.

No entanto, esta não é uma estratégia sustentável: gostaríamos de suportar aplicações com milhões de corrotinas suspensas; isso não é possível se cada pilha tiver 1MB de tamanho.

Pilhas expansíveis refere-se a uma estratégia de alocação de pilha que permite que a pilha do WebAssembly cresça conforme necessário. Dessa forma, podemos começar com pilhas muito pequenas para aquelas aplicações que precisam de pouco espaço de pilha e expandir a pilha quando a aplicação ficar sem espaço (também conhecido como estouro de pilha).

Existem várias técnicas potenciais para implementar pilhas expansíveis. Uma que estamos investigando é a de pilhas segmentadas. Uma pilha segmentada consiste em uma cadeia de regiões de pilha &mdash; cada uma com tamanho fixo, mas segmentos diferentes podem ter tamanhos diferentes.

Observe que, embora possamos estar resolvendo o problema de estouro de pilha para corrotinas, não estamos planejando tornar a pilha principal ou central expansível. Portanto, se sua aplicação ficar sem espaço de pilha, pilhas expansíveis não resolverão seu problema, a menos que você use o JSPI.

### O processo de padronização

Na data de publicação, existe um [teste de origem ativo para o JSPI](https://v8.dev/blog/jspi-ot). A nova API estará ativa durante o restante do teste de origem &mdash; disponível com o Chrome M126.

A API anterior também estará disponível durante o teste de origem; no entanto, está planejada para ser aposentada logo após o Chrome M128.

Depois disso, o principal foco do JSPI gira em torno do processo de padronização. O JSPI está atualmente (no momento da publicação) na fase 3 do processo do W3C Wasm CG. O próximo passo, ou seja, avançar para a fase 4, marca a adoção crucial do JSPI como uma API padrão para os ecossistemas JavaScript e WebAssembly.

Gostaríamos de saber o que você pensa sobre essas mudanças no JSPI! Participe da discussão no [repositório do Grupo de Comunidade do WebAssembly do W3C](https://github.com/WebAssembly/js-promise-integration).
