---
title: "Código respeitoso"
description: "A inclusão é central para a cultura do V8, e nossos valores incluem tratar uns aos outros com dignidade. Assim, é importante que todos possam contribuir sem enfrentar os efeitos prejudiciais de preconceito e discriminação."
---

A inclusão é central para a cultura do V8, e nossos valores incluem tratar uns aos outros com dignidade. Assim, é importante que todos possam contribuir sem enfrentar os efeitos prejudiciais de preconceito e discriminação. No entanto, termos em nosso código, interfaces de usuário e documentações podem perpetuar essa discriminação. Este documento estabelece orientações destinadas a abordar terminologias desrespeitosas no código e na documentação.

## Política

Terminologias que sejam depreciativas, ofensivas ou perpetuem discriminação, diretamente ou indiretamente, devem ser evitadas.

## O que está no escopo desta política?

Qualquer coisa que um colaborador leria ao trabalhar com o V8, incluindo:

- Nomes de variáveis, tipos, funções, arquivos, regras de compilação, binários, variáveis exportadas, ...
- Dados de teste
- Saída e exibições do sistema
- Documentação (tanto dentro quanto fora dos arquivos de código-fonte)
- Mensagens de commit

## Princípios

- Seja respeitoso: linguagem depreciativa não deve ser necessária para descrever como as coisas funcionam.
- Respeite a linguagem culturalmente sensível: algumas palavras podem ter significados históricos ou políticos significativos. Esteja atento a isso e use alternativas.

## Como saber se uma terminologia específica é aceitável ou não?

Aplique os princípios acima. Se tiver dúvidas, você pode entrar em contato com [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com).

## Quais são exemplos de terminologias a serem evitadas?

Esta lista NÃO é abrangente. Ela contém alguns exemplos que as pessoas frequentemente encontram.


| Termo     | Alternativas sugeridas                                         |
| --------- | ------------------------------------------------------------- |
| master    | primário, controlador, líder, anfitrião                       |
| slave     | réplica, subordinado, secundário, seguidor, dispositivo, periférico |
| whitelist | lista de permitidos, lista de exceções, lista de inclusões    |
| blacklist | lista de bloqueados, lista de exclusões, lista de negações    |
| insane    | inesperado, catastrófico, incoerente                          |
| sane      | esperado, apropriado, sensato, válido                         |
| crazy     | inesperado, catastrófico, incoerente                          |
| redline   | linha de prioridade, limite, limite brando                    |


## O que fazer se eu estiver interagindo com algo que viola esta política?

Essa circunstância ocorreu algumas vezes, particularmente em códigos que implementam especificações. Nesses casos, diferir da linguagem da especificação pode dificultar a compreensão da implementação. Para essas circunstâncias, sugerimos uma das seguintes abordagens, em ordem de preferência decrescente:

1. Se o uso de terminologias alternativas não interferir no entendimento, use terminologias alternativas.
1. Caso isso não seja possível, não propague a terminologia além da camada de código que está realizando a interação. Quando necessário, utilize terminologias alternativas nas fronteiras da API.
