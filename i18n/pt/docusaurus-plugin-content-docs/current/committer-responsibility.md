---
title: &apos;Responsabilidades dos committers e revisores do V8&apos;
description: &apos;Este documento lista diretrizes para os contribuidores do V8.&apos;
---
Ao fazer commits nos repositórios do V8, certifique-se de seguir estas diretrizes (adaptadas de https://dev.chromium.org/developers/committers-responsibility):

1. Encontre o revisor certo para suas alterações e para os patches que você foi solicitado a revisar.
1. Esteja disponível por IM e/ou e-mail antes e depois de aplicar a alteração.
1. Monitore o [waterfall](https://ci.chromium.org/p/v8/g/main/console) até que todos os bots fiquem verdes após sua alteração.
1. Ao aplicar uma alteração TBR (To Be Reviewed), certifique-se de notificar as pessoas cujo código você está alterando. Normalmente basta enviar o e-mail de revisão.

Resumindo, faça o que é certo para o projeto, não o mais fácil para comprometer o código e, acima de tudo: use seu melhor julgamento.

**Não tenha medo de fazer perguntas. Sempre haverá alguém que lerá imediatamente as mensagens enviadas à lista de discussão v8-committers e poderá ajudá-lo.**

## Alterações com vários revisores

Ocasionalmente, há alterações com muitos revisores, já que, às vezes, várias pessoas podem precisar estar a par de uma alteração devido a múltiplas áreas de responsabilidade e expertise.

O problema é que, sem algumas diretrizes, não há uma responsabilidade clara atribuída nessas revisões.

Se você for o único revisor de uma alteração, sabe que precisa fazer um bom trabalho. Quando há mais três pessoas, às vezes você assume que outro deve ter examinado cuidadosamente alguma parte da revisão. Às vezes, todos os revisores pensam assim e a alteração não é revisada adequadamente.

Em outros casos, alguns revisores dizem "LGTM" para um patch, enquanto outros ainda estão aguardando alterações. O autor pode ficar confuso sobre o status da revisão, e alguns patches foram aceitos onde pelo menos um revisor esperava mais alterações antes de serem aplicados.

Ao mesmo tempo, queremos incentivar muitas pessoas a participarem do processo de revisão e acompanharem o que está acontecendo.

Portanto, aqui estão algumas diretrizes para ajudar a esclarecer o processo:

1. Quando o autor de um patch solicitar mais de um revisor, ele deve esclarecer no email de solicitação de revisão o que espera que seja a responsabilidade de cada revisor. Por exemplo, você pode escrever isso no email:

    ```
    - larry: alterações de bitmap
    - sergey: hacks de processo
    - todos os outros: apenas para conhecimento
    ```

1. Nesse caso, você pode estar na lista de revisão porque solicitou estar a par das alterações de multiprocessamento, mas não seria o revisor principal e o autor e outros revisores não esperariam que você revisasse todos os diffs em detalhes.
1. Se você receber uma revisão que inclua muitas outras pessoas e o autor não fizer (1), pergunte a ele qual parte você é responsável, caso não queira revisar tudo em detalhes.
1. O autor deve aguardar a aprovação de todos na lista de revisores antes de aplicar a alteração.
1. Pessoas que estão em uma revisão sem responsabilidade clara (ou seja, revisões casuais) devem ser super responsivas e não atrasar a revisão. O autor do patch deve sentir-se à vontade para pressioná-las sem piedade se isso acontecer.
1. Se você for uma pessoa "para conhecimento" em uma revisão e não tiver revisado em detalhes (ou de forma alguma), mas não tiver problemas com o patch, note isso. Você pode dizer algo como "carimbo de borracha" ou "ACK" em vez de "LGTM". Dessa forma, os revisores reais sabem que não devem confiar que você fez o trabalho deles, mas o autor do patch sabe que não precisa esperar mais feedback de você. Esperançosamente, ainda podemos manter todos informados, mas com propriedade clara e revisões detalhadas. Pode até acelerar algumas alterações, já que você pode rapidamente "ACK" alterações que não lhe interessam, e o autor sabe que não precisa esperar feedback seu.
