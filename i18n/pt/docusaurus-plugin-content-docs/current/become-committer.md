---
title: 'Tornando-se um committer'
description: 'Como alguém se torna um committer do V8? Este documento explica.'
---
Tecnicamente, committers são pessoas que têm acesso de escrita ao repositório do V8. Todos os patches precisam ser revisados por pelo menos dois committers (incluindo o autor). Independentemente deste requisito, os patches também precisam ser criados ou revisados por um OWNER.

Este privilégio é concedido com alguma expectativa de responsabilidade: committers são pessoas que se importam com o projeto V8 e querem ajudar a alcançar seus objetivos. Committers não são apenas pessoas que podem fazer alterações, mas pessoas que demonstraram sua capacidade em colaborar com a equipe, pedir para que as pessoas mais experientes revisem o código, contribuir com um código de alta qualidade e resolver problemas (no código ou nos testes).

Um committer é um colaborador para o sucesso do projeto V8 e um cidadão ajudando os projetos a prosperarem. Veja [Responsabilidade dos Committers](/docs/committer-responsibility).

## Como me torno um committer?

*Nota para Googlers: Existe uma [abordagem ligeiramente diferente para os membros da equipe V8](http://go/v8/setup_permissions.md).*

Se você ainda não o fez, **você precisa configurar uma Chave de Segurança na sua conta antes de ser adicionado à lista de committers.**

Em resumo, contribua com 20 patches não triviais e peça para pelo menos três pessoas diferentes revisá-los (você precisará de três pessoas para te apoiar). Então, peça para alguém te nomear. Você estará demonstrando sua:

- dedicação ao projeto (20 bons patches exigem muito do seu tempo valioso),
- habilidade de colaborar com a equipe,
- compreensão de como a equipe funciona (políticas, processos de teste e revisão de código, etc),
- compreensão da base de código e estilo de codificação do projeto, e
- capacidade de escrever um bom código (por último, mas certamente não menos importante)

Um committer atual te nomeia enviando um e-mail para [v8-committers@chromium.org](mailto:v8-committers@chromium.org) contendo:

- seu nome e sobrenome
- seu endereço de e-mail no Gerrit
- uma explicação de por que você deveria ser um committer,
- uma lista incorporada de links para revisões (cerca de 10 principais) contendo seus patches

Outros dois committers precisam apoiar sua nomeação. Se ninguém se opuser em 5 dias úteis, você se torna um committer. Se alguém se opuser ou quiser mais informações, os committers discutem e geralmente chegam a um consenso (dentro dos 5 dias úteis). Se os problemas não puderem ser resolvidos, há uma votação entre os committers atuais.

Depois que você obtiver a aprovação dos committers existentes, você receberá permissões adicionais de revisão. Você também será adicionado à lista de e-mails [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com).

Na pior das hipóteses, o processo pode se arrastar por até duas semanas. Continue escrevendo patches! Mesmo nos casos raros em que uma nomeação falha, a objeção geralmente é algo fácil de resolver, como “mais patches” ou “não há pessoas suficientes familiarizadas com o trabalho desta pessoa”.

## Mantendo o status de committer

Você não precisa fazer muito para manter o status de committer: apenas continue sendo incrível e ajudando o projeto V8!

No infeliz caso de um committer continuar desrespeitando as boas práticas de cidadania (ou interromper ativamente o projeto), podemos precisar revogar o status dessa pessoa. O processo é o mesmo da nomeação de um novo committer: alguém sugere a revogação com um bom motivo, duas pessoas apoiam a moção e uma votação pode ser convocada se não houver consenso. Espero que isso seja simples o suficiente, e que nunca precisemos testar isso na prática.

Além disso, como medida de segurança, se você estiver inativo no Gerrit (sem upload, sem comentário ou revisão) por mais de um ano, podemos revogar seus privilégios de committer. Uma notificação por e-mail será enviada cerca de 7 dias antes da remoção. Isso não é uma punição, então, se você deseja retomar suas contribuições após isso, entre em contato com [v8-committers@googlegroups.com](mailto:v8-committers@googlegroups.com) para solicitar a restauração, e normalmente faremos isso.

(Este documento foi inspirado por [become-a-committer](https://dev.chromium.org/getting-involved/become-a-committer).)
