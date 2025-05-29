---
title: 'Um ano com Spectre: uma perspectiva do V8'
author: 'Ben L. Titzer e Jaroslav Sevcik'
avatars:
  - 'ben-titzer'
  - 'jaroslav-sevcik'
date: 2019-04-23 14:15:22
tags:
  - segurança
tweet: '1120661732836499461'
description: 'A equipe do V8 detalha sua análise e estratégia de mitigação para o Spectre, uma das principais questões de segurança de computadores de 2018.'
---
Em 3 de janeiro de 2018, o Google Project Zero e outros [divulgaram](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) as três primeiras vulnerabilidades de uma nova classe que afeta CPUs que realizam execução especulativa, chamadas [Spectre](https://spectreattack.com/spectre.pdf) e [Meltdown](https://meltdownattack.com/meltdown.pdf). Usando os mecanismos de [execução especulativa](https://en.wikipedia.org/wiki/Speculative_execution) das CPUs, um atacante poderia temporariamente ignorar verificações de segurança implícitas e explícitas no código que impedem programas de ler dados não autorizados na memória. Embora a especulação do processador tenha sido projetada para ser um detalhe microarquitetural, invisível no nível arquitetural, programas cuidadosamente criados poderiam ler informações não autorizadas durante a especulação e divulgá-las por meio de canais laterais, como o tempo de execução de um fragmento de programa.

<!--truncate-->
Quando foi demonstrado que o JavaScript poderia ser usado para realizar ataques Spectre, a equipe do V8 envolveu-se no problema. Formamos uma equipe de resposta de emergência e trabalhamos estreitamente com outras equipes no Google, nossos parceiros em outros fornecedores de navegadores e nossos parceiros de hardware. Em conjunto com eles, engajamos proativamente em pesquisas ofensivas (construção de gadgets de prova de conceito) e pesquisas defensivas (mitigações para ataques potenciais).

Um ataque Spectre consiste em duas partes:

1. _Vazamento de dados inacessíveis em estado oculto da CPU._ Todos os ataques Spectre conhecidos usam especulação para vazar bits de dados inacessíveis nos caches da CPU.
1. _Extrair o estado oculto_ para recuperar os dados inacessíveis. Para isso, o atacante precisa de um relógio com precisão suficiente. (Relógios com surpreendentemente baixa resolução podem ser suficientes, especialmente com técnicas como limiar de borda.)

Na teoria, seria suficiente derrotar qualquer um dos dois componentes de um ataque. Como não conhecemos nenhuma maneira de derrotar qualquer uma das partes perfeitamente, projetamos e implementamos mitigações que reduzem drasticamente a quantidade de informações vazadas para os caches da CPU _e_ mitigações que dificultam a recuperação do estado oculto.

## Temporizadores de alta precisão

As pequenas mudanças de estado que podem sobreviver à execução especulativa dão origem a diferenças de temporização correspondentes igualmente pequenas, quase impossivelmente pequenas — na ordem de um bilionésimo de segundo. Para detectar diretamente essas diferenças individuais, um programa atacante precisa de um temporizador de alta precisão. As CPUs oferecem tais temporizadores, mas a plataforma Web não os expõe. O temporizador mais preciso da plataforma Web, `performance.now()`, tinha uma resolução de micro-segundos de dígito único, que originalmente se pensava ser inutilizável para esse propósito. No entanto, há dois anos, uma equipe de pesquisa acadêmica especializada em ataques microarquiteturais publicou [um artigo](https://gruss.cc/files/fantastictimers.pdf) que estudou a disponibilidade de temporizadores na plataforma web. Eles concluíram que memória compartilhada mutável concorrente e várias técnicas de recuperação de resolução poderiam permitir a construção de temporizadores de resolução ainda mais alta, chegando à escala de nanosegundos. Esses temporizadores são precisos o suficiente para detectar hits e misses individuais no cache L1, que normalmente é como gadgets Spectre vazam informações.

## Mitigações de temporizadores

Para interromper a capacidade de detectar pequenas diferenças de temporização, os fornecedores de navegadores adotaram uma abordagem multifacetada. Em todos os navegadores, a resolução de `performance.now()` foi reduzida (no Chrome, de 5 microsegundos para 100), e jitter uniforme aleatório foi introduzido para evitar a recuperação de resolução. Após consulta entre todos os fornecedores, em conjunto decidimos dar o passo sem precedentes de desativar imediata e retroativamente a API `SharedArrayBuffer` em todos os navegadores para evitar a construção de um temporizador de nanosegundo que pudesse ser usado para ataques Spectre.

## Amplificação

Ficou claro desde cedo em nossa pesquisa ofensiva que mitigações de temporizadores por si só não seriam suficientes. Um motivo para isso é que um atacante pode simplesmente executar repetidamente seu gadget de modo que a diferença acumulativa de tempo seja muito maior do que um único hit ou miss do cache. Conseguimos criar gadgets confiáveis que usam muitas linhas de cache ao mesmo tempo, até a capacidade do cache, produzindo diferenças de temporização de até 600 microsegundos. Mais tarde, descobrimos técnicas arbitrárias de amplificação que não são limitadas pela capacidade do cache. Essas técnicas de amplificação dependem de várias tentativas de leitura dos dados confidenciais.

## Mitigações do JIT

Para ler dados inacessíveis usando Spectre, o atacante faz com que a CPU execute especulativamente código que lê dados normalmente inacessíveis e os codifica no cache. O ataque pode ser interrompido de duas maneiras:

1. Prevenir a execução especulativa do código.
1. Prevenir que a execução especulativa leia dados inacessíveis.

Experimentamos a abordagem (1) inserindo as instruções de barreira de especulação recomendadas, como o `LFENCE` da Intel, em cada ramificação condicional crítica, e usando [retpolines](https://support.google.com/faqs/answer/7625886) para ramificações indiretas. Infelizmente, essas atenuações drásticas reduzem muito o desempenho (2–3 vezes mais lentas no benchmark Octane). Em vez disso, escolhemos a abordagem (2), inserindo sequências de mitigação que impedem a leitura de dados secretos devido a má-especulação. Vamos ilustrar a técnica no seguinte trecho de código:

```js
if (condition) {
  return a[i];
}
```

Para simplificar, suponhamos que condition seja `0` ou `1`. O código acima é vulnerável se a CPU ler especulativamente de `a[i]` quando `i` estiver fora dos limites, acessando dados normalmente inacessíveis. A observação importante é que, nesse caso, a especulação tenta ler `a[i]` quando `condition` é `0`. Nossa mitigação reescreve este programa para que ele se comporte exatamente como o programa original, mas não vaze nenhum dado carregado especulativamente.

Reservamos um registrador da CPU que chamamos de poison (veneno) para rastrear se o código está sendo executado em uma ramificação mal prevista. O registrador poison é mantido em todas as ramificações e chamadas no código gerado, de modo que qualquer ramificação mal prevista faz com que o registrador poison torne-se `0`. Em seguida, instrumentamos todos os acessos à memória para que incondicionalmente mascarem o resultado de todos os carregamentos com o valor atual do registrador poison. Isso não impede o processador de prever (ou errar na previsão de) ramificações, mas destrói as informações de valores carregados (potencialmente fora dos limites) devido a ramificações mal previstas. O código instrumentado é mostrado abaixo (supondo que `a` seja um array numérico).

```js/0,3,4
let poison = 1;
// …
if (condition) {
  poison *= condition;
  return a[i] * poison;
}
```

O código adicional não tem nenhum efeito no comportamento normal (definido arquiteturalmente) do programa. Ele afeta apenas o estado microarquitetural ao rodar em CPUs que especulam. Se o programa fosse instrumentado no nível do código-fonte, otimizações avançadas em compiladores modernos poderiam remover tal instrumentação. No V8, impedimos que nosso compilador remova as mitigações inserindo-as em uma fase muito tardia da compilação.

Também usamos a técnica de poison para evitar vazamentos de ramificações indiretas mal previstas no loop de despacho de bytecode do interpretador e na sequência de chamadas de funções JavaScript. No interpretador, configuramos poison como `0` se o manipulador de bytecode (ou seja, a sequência de código de máquina que interpreta um único bytecode) não corresponder ao bytecode atual. Para chamadas JavaScript, passamos a função de destino como um parâmetro (em um registrador) e configuramos poison como `0` no início de cada função se a função de destino recebida não corresponder à função atual. Com as mitigações de poison implementadas, vemos uma desaceleração de menos de 20% no benchmark Octane.

As mitigações para WebAssembly são mais simples, já que a verificação principal de segurança é garantir que os acessos à memória estejam dentro dos limites. Para plataformas de 32 bits, além das verificações normais de limites, preenchermos todas as memórias para o próximo poder de dois e mascaramos incondicionalmente quaisquer bits superiores de um índice de memória fornecido pelo usuário. Plataformas de 64 bits não precisam de tais mitigações, já que a implementação utiliza proteção de memória virtual para as verificações de limites. Experimentamos compilar declarações switch/case para código de busca binária em vez de usar uma ramificação indireta potencialmente vulnerável, mas isso é muito caro em algumas cargas de trabalho. Chamadas indiretas são protegidas com retpolines.

## Mitigações de software são um caminho insustentável

Felizmente ou infelizmente, nossa pesquisa ofensiva avançou muito mais rápido do que nossa pesquisa defensiva, e rapidamente descobrimos que a mitigação de software de todos os possíveis vazamentos devido ao Spectre era inviável. Isso se deu por uma variedade de razões. Primeiro, o esforço de engenharia desviado para combater o Spectre foi desproporcional ao seu nível de ameaça. No V8 enfrentamos muitas outras ameaças de segurança que são muito piores, de leituras fora dos limites devido a bugs regulares (mais rápidas e diretas do que o Spectre), gravações fora dos limites (impossíveis com o Spectre e ainda piores) e possíveis execuções remotas de código (impossíveis com o Spectre e muito, muito piores). Segundo, as mitigações cada vez mais complicadas que projetamos e implementamos acarretaram complexidade significativa, o que é dívida técnica e pode na verdade aumentar a superfície de ataque, além dos custos de desempenho. Terceiro, testar e manter mitigações para vazamentos microarquiteturais é ainda mais complicado do que projetar os próprios gadgets, já que é difícil garantir que as mitigações continuem funcionando como projetado. Pelo menos uma vez, mitigações importantes foram efetivamente anuladas por otimizações posteriores do compilador. Quarto, descobrimos que a mitigação eficaz de algumas variantes do Spectre, particularmente a variante 4, é simplesmente inviável em software, mesmo após um esforço heroico de nossos parceiros na Apple para combater o problema em seu compilador JIT.

## Isolamento de sites

Nossa pesquisa chegou à conclusão de que, em princípio, códigos não confiáveis podem ler todo o espaço de endereços de um processo usando Spectre e canais colaterais. As mitigações de software reduzem a eficácia de muitos gadgets potenciais, mas não são eficientes ou abrangentes. A única mitigação eficaz é mover dados sensíveis para fora do espaço de endereços do processo. Felizmente, o Chrome já tinha um esforço em andamento há muitos anos para separar sites em diferentes processos a fim de reduzir a superfície de ataque causada por vulnerabilidades convencionais. Este investimento valeu a pena, e colocamos em produção e implementamos [o isolamento de sites](https://developers.google.com/web/updates/2018/07/site-isolation) para o maior número possível de plataformas até maio de 2018. Assim, o modelo de segurança do Chrome não assume mais confidencialidade reforçada por linguagem dentro de um processo de renderização.

O Spectre foi uma longa jornada e destacou o melhor da colaboração entre fornecedores da indústria e a academia. Até agora, os hackers éticos parecem estar à frente dos hackers mal-intencionados. Ainda não conhecemos ataques em campo, fora dos curiosos experimentadores e pesquisadores profissionais desenvolvendo gadgets como prova de conceito. Novas variantes dessas vulnerabilidades continuam a surgir lentamente e pode ser que continuem a surgir por algum tempo. Continuamos a acompanhar essas ameaças e a levá-las a sério.

Como muitos com formação em linguagens de programação e suas implementações, a ideia de que linguagens seguras reforçam uma fronteira adequada de abstração, não permitindo que programas bem tipados leiam memória arbitrária, tem sido uma garantia sobre a qual nossos modelos mentais foram construídos. É uma conclusão deprimente que nossos modelos estavam errados — essa garantia não é verdadeira no hardware atual. Claro, ainda acreditamos que linguagens seguras têm grandes benefícios de engenharia e continuarão a ser a base para o futuro, mas… no hardware atual elas vazam um pouco.

Os leitores interessados podem aprofundar-se em mais detalhes em [nosso artigo técnico](https://arxiv.org/pdf/1902.05178.pdf).
