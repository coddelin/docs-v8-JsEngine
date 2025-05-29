---
title: 'Diretrizes para revisão de design'
description: 'Este documento explica as diretrizes de revisão de design do projeto V8.'
---
Certifique-se de seguir as diretrizes abaixo, sempre que aplicável.

Existem vários motivos para a formalização das revisões de design do V8:

1. tornar claro para os Contribuidores Individuais (ICs) quem são os tomadores de decisão e destacar qual é o caminho a seguir no caso de projetos não avançarem devido a um desacordo técnico
1. criar um fórum para discussões diretas sobre design
1. garantir que os Líderes Técnicos do V8 (TL) estejam cientes de todas as mudanças significativas e tenham a oportunidade de dar sua opinião no nível de Líder Técnico (TL)
1. aumentar o envolvimento de todos os contribuidores do V8 ao redor do mundo

## Resumo

![Diretrizes de Revisão de Design do V8 em um relance](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

Importante:

1. pressuma boas intenções
1. seja gentil e civilizado
1. seja pragmático

A solução proposta é baseada nos seguintes pressupostos/pilares:

1. O fluxo de trabalho proposto coloca o colaborador individual (IC) no comando. Ele é quem facilita o processo.
1. Os TLs orientadores são responsáveis por ajudá-los a navegar pelo território e encontrar os fornecedores de LGTM corretos.
1. Se um recurso não for controverso, quase nenhuma sobrecarga deve ser criada.
1. Se houver muita controvérsia, o recurso pode ser "escalado" para a reunião dos Proprietários de Revisão de Engenharia do V8, onde passos adicionais são decididos.

## Funções

### Contribuidor Individual (IC)

LGTM: N/A
Essa pessoa é o criador do recurso e da documentação de design.

### O Líder Técnico (TL) do IC

LGTM: Obrigatório
Essa pessoa é o TL de um determinado projeto ou componente. Provavelmente, essa é a pessoa proprietária do componente principal que seu recurso irá tocar. Se não estiver claro quem é o TL, pergunte aos Proprietários de Revisão de Engenharia do V8 através do e-mail v8-eng-review-owners@googlegroups.com. Os TLs são responsáveis por incluir mais pessoas na lista de fornecedores de LGTM necessários, se apropriado.

### Fornecedor de LGTM

LGTM: Obrigatório
Essa é uma pessoa que é necessária para dar LGTM. Pode ser um IC ou um TL(M).

### Revisor “Aleatório” do documento (RRotD)

LGTM: Não obrigatório
Essa é alguém que simplesmente revisa e comenta sobre a proposta. Sua opinião deve ser considerada, embora seu LGTM não seja obrigatório.

### Proprietários de Revisão de Engenharia do V8

LGTM: Não obrigatório
Propostas bloqueadas podem ser escaladas para os Proprietários de Revisão de Engenharia do V8 via <v8-eng-review-owners@googlegroups.com>. Possíveis casos de uso para tal escalada:

- um fornecedor de LGTM está não responsivo
- nenhum consenso sobre o design pode ser alcançado

Os Proprietários de Revisão de Engenharia do V8 podem anular não-LGTMs ou LGTMs.

## Fluxo de trabalho detalhado

![Diretrizes de Revisão de Design do V8 em um relance](/_img/docs/design-review-guidelines/design-review-guidelines.svg)

1. Início: IC decide trabalhar em um recurso/recebe um recurso atribuído a ele
1. IC envia seu documento de design inicial/explicador/uma página para alguns RRotDs
    1. Protótipos são considerados parte do "documento de design"
1. IC adiciona pessoas à lista de fornecedores de LGTM que o IC acredita que devem dar seu LGTM. O TL é obrigatório na lista de fornecedores de LGTM.
1. IC incorpora feedback.
1. TL adiciona mais pessoas à lista de fornecedores de LGTM.
1. IC envia o documento de design inicial/explicador/uma página para <v8-dev+design@googlegroups.com>.
1. IC coleta os LGTMs. TL ajuda-o.
    1. O fornecedor de LGTM revisa o documento, adiciona comentários e dá um LGTM ou não LGTM no início do documento. Se eles adicionarem um não LGTM, estão obrigados a listar o(s) motivo(s).
    1. Opcionais: fornecedores de LGTM podem se remover da lista de fornecedores de LGTM e/ou sugerir outros fornecedores de LGTM
    1. IC e TL trabalham para resolver os problemas não resolvidos.
    1. Se todos os LGTM forem coletados, envie um e-mail para v8-dev@googlegroups.com (por exemplo, pingando o tópico original) e anuncie a implementação.
1. Opcionais: Se IC e TL estiverem bloqueados e/ou quiserem ter uma discussão mais ampla, podem escalar o problema para os Proprietários de Revisão de Engenharia do V8.
    1. IC envia um e-mail para v8-eng-review-owners@googlegroups.com
        1. TL em CC
        1. Link para o documento de design no e-mail
    1. Cada membro dos Proprietários de Revisão de Engenharia do V8 é obrigado a revisar o documento e opcionalmente se adicionar à lista de fornecedores de LGTM.
    1. Os próximos passos para desbloquear o recurso são decididos.
    1. Se o bloqueador não for resolvido depois ou novos bloqueadores irresolvíveis forem descobertos, vá para 8.
1. Opcionais: Se "não LGTMs" forem adicionados depois que o recurso já foi aprovado, eles devem ser tratados como problemas normais não resolvidos.
    1. IC e TL trabalham para resolver os problemas não resolvidos.
1. Fim: IC prossegue com o recurso.

E sempre lembre-se:

1. pressuma boas intenções
1. seja gentil e civilizado
1. seja pragmático

## Perguntas frequentes

### Como decidir se o recurso merece ter um documento de design?

Algumas indicações de quando um documento de design é apropriado:

- Afeta pelo menos dois componentes
- Precisa de reconciliação com projetos fora do V8, como Debugger, Blink
- Demora mais de 1 semana de esforço para ser implementado
- É uma funcionalidade de linguagem
- O código específico da plataforma será alterado
- Alterações voltadas ao usuário
- Tem considerações especiais de segurança ou o impacto na segurança não é óbvio

Em caso de dúvida, pergunte ao TL.

### Como decidir quem adicionar à lista de provedores de LGTM?

Algumas diretrizes sobre quando as pessoas devem ser adicionadas à lista de provedores de LGTM:

- Proprietários dos arquivos/diretórios de origem que você prevê alterar
- Especialista principal do componente dos componentes que você prevê alterar
- Consumidores downstream das suas mudanças, por exemplo, quando você altera uma API

### Quem é “meu” TL?

Provavelmente é a pessoa que é proprietária do componente principal que sua funcionalidade irá alterar. Caso não saiba quem é o TL, por favor, pergunte aos Proprietários de Revisão Técnica do V8 pelo v8-eng-review-owners@googlegroups.com.

### Onde posso encontrar um modelo para documentos de design?

[Aqui](https://docs.google.com/document/d/1CWNKvxOYXGMHepW31hPwaFz9mOqffaXnuGqhMqcyFYo/template/preview).

### E se algo grande mudar?

Certifique-se de ainda ter os LGTMs, por exemplo, enviando mensagens aos provedores de LGTM com um prazo claro e razoável para vetar.

### Os provedores de LGTM não comentam no meu documento, o que devo fazer?

Neste caso, você pode seguir este caminho de escalonamento:

- Entre em contato diretamente via e-mail, Hangouts ou comentário/designação no documento e peça explicitamente que eles adicionem um LGTM ou um não-LGTM.
- Envolva seu TL e peça ajuda a ele.
- Escale para v8-eng-review-owners@googlegroups.com.

### Alguém me adicionou como provedor de LGTM em um documento, o que devo fazer?

O V8 está buscando tornar as decisões mais transparentes e o escalonamento mais direto. Se você acha que o design é bom o suficiente e deve ser realizado, adicione um “LGTM” na célula da tabela ao lado do seu nome.

Se você tem preocupações ou observações bloqueantes, adicione “Não LGTM, porque \<razão>” na célula da tabela ao lado do seu nome. Esteja preparado para ser solicitado para outra rodada de revisão.

### Como isso funciona junto com o processo de Intenções de Blink?

As Diretrizes de Revisão de Design do V8 complementam o [processo de Intenção+Errata do Blink do V8](/docs/feature-launch-process). Se você está lançando uma nova funcionalidade de WebAssembly ou de linguagem JavaScript, siga o processo de Intenção+Errata do Blink do V8 e as Diretrizes de Revisão de Design do V8. Provavelmente faz sentido reunir todos os LGTMs no momento em que você enviaria uma Intenção de Implementação.
