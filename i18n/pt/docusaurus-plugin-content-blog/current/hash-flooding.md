---
title: "Sobre aquela vulnerabilidade de inundação de hash no Node.js…"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed))"
avatars:
  - "yang-guo"
date: 2017-08-11 13:33:37
tags:
  - segurança
description: "Node.js sofreu de uma vulnerabilidade de inundação de hash. Este post fornece um pouco de contexto e explica a solução no V8."
---
No início de julho deste ano, o Node.js lançou uma [atualização de segurança](https://nodejs.org/en/blog/vulnerability/july-2017-security-releases/) para todos os ramos atualmente mantidos para resolver uma vulnerabilidade de inundação de hash. Este reparo intermediário tem o custo de uma regressão significativa no desempenho de inicialização. Enquanto isso, o V8 implementou uma solução que evita a penalidade de desempenho.

<!--truncate-->
Neste post, queremos dar algum contexto e histórico sobre a vulnerabilidade e a solução final.

## Ataque de inundação de hash

Tabelas de hash são uma das estruturas de dados mais importantes na ciência da computação. Elas são amplamente utilizadas no V8, por exemplo, para armazenar as propriedades de um objeto. Em média, inserir uma nova entrada é muito eficiente em [𝒪(1)](https://en.wikipedia.org/wiki/Big_O_notation). No entanto, colisões de hash podem levar ao pior caso de 𝒪(n). Isso significa que inserir n entradas pode levar até 𝒪(n²).

No Node.js, os [cabeçalhos HTTP](https://nodejs.org/api/http.html#http_response_getheaders) são representados como objetos JavaScript. Pares de nomes e valores de cabeçalhos são armazenados como propriedades de objetos. Com requisições HTTP cuidadosamente preparadas, um atacante poderia realizar um ataque de negação de serviço. Um processo do Node.js ficaria sem resposta, ocupado com inserções em tabelas de hash no pior caso.

Este ataque foi divulgado já em [dezembro de 2011](https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html) e demonstrado como afetar uma ampla gama de linguagens de programação. Por que demorou tanto para o V8 e o Node.js finalmente resolverem esse problema?

Na verdade, logo após a divulgação, engenheiros do V8 trabalharam com a comunidade Node.js em uma [mitigação](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40). Desde o Node.js v0.11.8, esse problema foi resolvido. A correção introduziu um chamado valor de _semente de hash_. A semente de hash é escolhida aleatoriamente na inicialização e usada para semear cada valor de hash em uma instância específica do V8. Sem o conhecimento da semente de hash, um atacante teria muita dificuldade para atingir o pior caso, quanto mais criar um ataque que vise todas as instâncias do Node.js.

Este é o trecho da [mensagem de commit](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40) da correção:

> Esta versão resolve o problema apenas para aqueles que compilam o V8 por conta própria ou que não usam snapshots. Um V8 pré-compilado baseado em snapshot ainda terá códigos de hash de string previsíveis.

Esta versão resolve o problema apenas para aqueles que compilam o V8 por conta própria ou que não usam snapshots. Um V8 pré-compilado baseado em snapshot ainda terá códigos de hash de string previsíveis.

## Snapshot de inicialização

Snapshots de inicialização são um mecanismo no V8 que acelera dramaticamente tanto a inicialização do motor quanto a criação de novos contextos (por exemplo, via o [módulo vm](https://nodejs.org/api/vm.html) no Node.js). Em vez de configurar objetos iniciais e estruturas de dados internas do zero, o V8 desserializa de um snapshot existente. Uma compilação atualizada do V8 com snapshot inicia em menos de 3ms e requer uma fração de milissegundo para criar um novo contexto. Sem o snapshot, a inicialização leva mais de 200ms, e um novo contexto mais de 10ms. Esta é uma diferença de duas ordens de magnitude.

Cobrimos como qualquer incorporador do V8 pode se beneficiar dos snapshots de inicialização em [um post anterior](/blog/custom-startup-snapshots).

Um snapshot pré-construído contém tabelas de hash e outras estruturas de dados baseadas em valores de hash. Uma vez inicializado a partir do snapshot, a semente de hash não pode mais ser alterada sem corromper essas estruturas de dados. Uma versão do Node.js que inclui o snapshot tem uma semente de hash fixa, tornando a mitigação ineficaz.

É disso que trata o aviso explícito na mensagem do commit.

## Quase corrigido, mas não completamente

Avançando para 2015, um [problema](https://github.com/nodejs/node/issues/1631) do Node.js relata que criar um novo contexto teve uma regressão de desempenho. Não surpreendentemente, isso ocorreu porque o snapshot de inicialização foi desativado como parte da mitigação. Mas, naquela época, nem todos que participaram da discussão estavam cientes da [razão](https://github.com/nodejs/node/issues/528#issuecomment-71009086).

Como explicado neste [post](/blog/math-random), o V8 usa um gerador de números pseudo-aleatórios para gerar os resultados de Math.random. Cada contexto do V8 tem sua própria cópia do estado de geração de números aleatórios. Isso é para evitar que os resultados de Math.random sejam previsíveis entre contextos.

O estado do gerador de números aleatórios é inicializado a partir de uma fonte externa imediatamente após o contexto ser criado. Não importa se o contexto é criado do zero ou desserializado de um snapshot.

De alguma forma, o estado do gerador de números aleatórios foi [confundido](https://github.com/nodejs/node/issues/1631#issuecomment-100044148) com a semente de hash. Como resultado, um snapshot pré-construído começou a fazer parte da versão oficial desde [io.js v2.0.2](https://github.com/nodejs/node/pull/1679).

## Segunda tentativa

Foi somente em maio de 2017, durante algumas discussões internas entre o V8, o [Google’s Project Zero](https://googleprojectzero.blogspot.com/) e a plataforma Google Cloud, que percebemos que o Node.js ainda era vulnerável a ataques de inundação de hash.

A resposta inicial veio de nossos colegas [Ali](https://twitter.com/ofrobots) e [Myles](https://twitter.com/MylesBorins) da equipe responsável pelas [ofertas de Node.js no Google Cloud Platform](https://cloud.google.com/nodejs/). Eles trabalharam com a comunidade Node.js para [desativar o snapshot de inicialização](https://github.com/nodejs/node/commit/eff636d8eb7b009c40fb053802c169ba1417293d) por padrão novamente. Desta vez, também adicionaram um [caso de teste](https://github.com/nodejs/node/commit/9fedc1f09648ff7cebed65883966f5647686a38a).

Mas não queríamos deixar as coisas por aí. Desativar o snapshot de inicialização tem impactos [significativos](https://github.com/nodejs/node/issues/14229) no desempenho. Ao longo dos anos, adicionamos muitos novos [recursos de linguagem](/blog/high-performance-es2015), [especificações](/blog/webassembly-browser-preview) e [otimizações sofisticadas](/blog/speeding-up-regular-expressions) ao V8. Algumas dessas adições tornaram a inicialização do zero ainda mais cara. Imediatamente após o lançamento de segurança, começamos a trabalhar em uma solução de longo prazo. O objetivo é ser capaz de [reabilitar o snapshot de inicialização](https://github.com/nodejs/node/issues/14171) sem se tornar vulnerável a inundações de hash.

Entre as [soluções propostas](https://docs.google.com/document/d/1br7T3jk5JAJSYaT8eZdQlqrPTDRClheGpRU1-BpY1ss/edit), escolhemos e implementamos a mais pragmática. Após desserializar do snapshot, escolheríamos uma nova semente de hash. As estruturas de dados afetadas são então rehashadas para garantir consistência.

Acontece que, em um snapshot de inicialização comum, poucas estruturas de dados são realmente afetadas. E, para nossa alegria, [rehashar tabelas de hash](https://github.com/v8/v8/commit/0e8e0030775518b69eb8522823ea3754e6bddc69) se tornou algo fácil no V8 nesse meio tempo. A sobrecarga adicionada é insignificante.

O patch para reabilitar o snapshot de inicialização foi [mesclado](https://github.com/nodejs/node/commit/2ae2874ae7dfec2c55b5d390d25b6eed9932f78d) [no](https://github.com/nodejs/node/commit/14e4254f68f71a6afaf3ebe16794172b08e68d7b) Node.js. Faz parte da recente [versão](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367) do Node.js v8.3.0.
