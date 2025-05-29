---
title: "Lançamento do V8 v9.1"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), testando minha marca privada"
avatars:
 - "ingvar-stepanyan"
date: 2021-05-04
tags:
 - lançamento
description: "O lançamento do V8 v9.1 traz suporte para verificação de marcas privadas, await no nível superior habilitado por padrão e melhorias de desempenho."
tweet: "1389613320953532417"
---
A cada seis semanas, criamos um novo branch do V8 como parte de nosso [processo de lançamento](https://v8.dev/docs/release-process). Cada versão é derivada do Git master do V8 imediatamente antes de uma etapa Beta do Chrome. Hoje estamos satisfeitos em anunciar nosso mais novo branch, [V8 versão 9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1), que está em beta até o seu lançamento em coordenação com o Chrome 91 Stable em algumas semanas. O V8 v9.1 está repleto de recursos voltados para desenvolvedores. Este post oferece uma prévia de alguns destaques para antecipar o lançamento.

<!--truncate-->
## JavaScript

### Melhorias no `FastTemplateCache`

A API v8 expõe uma interface `Template` para os embutidos, a partir da qual novas instâncias podem ser criadas.

Criar e configurar novas instâncias de objetos requer várias etapas, por isso muitas vezes é mais rápido clonar objetos existentes. O V8 usa uma estratégia de cache de nível duplo (cache de array pequeno e rápido e cache de dicionário grande e lento) para buscar objetos criados recentemente com base nos templates e cloná-los diretamente.

Anteriormente, o índice do cache para os templates era atribuído quando os templates eram criados, em vez de quando eram inseridos no cache. Isso resultava no cache de array rápido sendo reservado para os templates que muitas vezes nunca eram instanciados. Corrigir isso resultou em uma melhoria de 4.5% no benchmark Speedometer2-FlightJS.

### Await no nível superior

[Await no nível superior](https://v8.dev/features/top-level-await) está habilitado por padrão no V8 a partir da versão 9.1 e está disponível sem precisar de `--harmony-top-level-await`.

Observe que, para o [motor de renderização Blink](https://www.chromium.org/blink), await no nível superior já estava [habilitado por padrão](https://v8.dev/blog/v8-release-89#top-level-await) na versão 89.

Os embutidos devem observar que, com essa habilitação, `v8::Module::Evaluate` sempre retorna um objeto `v8::Promise` em vez do valor de conclusão. O `Promise` é resolvido com o valor de conclusão se a avaliação do módulo for bem-sucedida e rejeitado com o erro se a avaliação falhar. Se o módulo avaliado não for assíncrono (ou seja, não contiver await no nível superior) e não tiver dependências assíncronas, o `Promise` retornado será cumprido ou rejeitado. Caso contrário, o `Promise` retornado ficará pendente.

Veja [nosso explicador](https://v8.dev/features/top-level-await) para mais detalhes.

### Verificação de marcas privadas, também conhecido como `#foo in obj`

A sintaxe de verificação de marcas privadas está habilitada por padrão na versão 9.1, sem necessidade de `--harmony-private-brand-checks`. Esse recurso estende o [operador `in`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) para também funcionar com os nomes de campos privados `#`, como no seguinte exemplo.

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

Para uma análise mais profunda, não deixe de conferir [nosso explicador](https://v8.dev/features/private-brand-checks).

### Chamadas internas curtas

Neste lançamento, desembutimos temporariamente as funções embutidas (desfazendo as [funções embutidas](https://v8.dev/blog/embedded-builtins)) em máquinas desktop de 64 bits. O benefício de desempenho de desembutir funções nessas máquinas supera os custos de memória. Isso se deve a detalhes arquitetônicos e microarquitetônicos.

Publicaremos um post separado com mais detalhes em breve.

## API do V8

Use `git log branch-heads/9.0..branch-heads/9.1 include/v8.h` para obter uma lista das mudanças na API.

Os desenvolvedores com um checkout ativo do V8 podem usar `git checkout -b 9.1 -t branch-heads/9.1` para experimentar os novos recursos no V8 v9.1. Alternativamente, você pode [assinar o canal Beta do Chrome](https://www.google.com/chrome/browser/beta.html) e testar os novos recursos em breve.
