---
title: 'Contribuindo para o V8'
description: 'Este documento explica como contribuir para o V8.'
---
As informações nesta página explicam como contribuir para o V8. Certifique-se de ler tudo antes de nos enviar uma contribuição.

## Obtenha o código

Veja [Como obter o código fonte do V8](/docs/source-code).

## Antes de contribuir

### Pergunte na lista de e-mails do V8 por orientação

Antes de começar a trabalhar em uma contribuição maior para o V8, você deve entrar em contato conosco primeiro por meio [da lista de e-mails de contribuidores do V8](https://groups.google.com/group/v8-dev) para que possamos ajudar e possivelmente orientá-lo. Coordenar previamente torna muito mais fácil evitar frustrações mais tarde.

### Assine o CLA

Antes de podermos usar seu código, você precisa assinar o [Acordo de Licença de Contribuidor Individual do Google](https://cla.developers.google.com/about/google-individual), que pode ser feito online. Isso é principalmente porque você possui os direitos autorais das suas alterações, mesmo depois que sua contribuição se tornar parte de nossa base de código, então precisamos de sua permissão para usar e distribuir seu código. Também precisamos ter certeza de várias outras coisas, por exemplo, que você nos informará se souber que seu código infringe patentes de outras pessoas. Você não precisa fazer isso até depois de enviar seu código para revisão e um membro o aprovar, mas terá que fazê-lo antes de podermos integrar seu código à nossa base de código.

Contribuições feitas por corporações são cobertas por um acordo diferente do mencionado acima, o [Acordo de Licença de Contribuidor Corporativo e Concessão de Software](https://cla.developers.google.com/about/google-corporate).

Assine-os online [aqui](https://cla.developers.google.com/).

## Envie seu código

O código fonte do V8 segue o [Guia de Estilo C++ do Google](https://google.github.io/styleguide/cppguide.html), portanto, você deve se familiarizar com essas diretrizes. Antes de enviar código, você deve passar em todos os nossos [testes](/docs/test), e também executar com sucesso as verificações de envio prévio:

```bash
git cl presubmit
```

O script de envio prévio utiliza um verificador do Google, [`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py). Ele faz parte do [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools), e deve estar no seu `PATH` — então, se você tiver o `depot_tools` no seu `PATH`, tudo deve funcionar corretamente.

### Faça o upload para a ferramenta de revisão de código do V8

Todas as submissões, incluindo as feitas por membros do projeto, exigem revisão. Utilizamos as mesmas ferramentas e processos de revisão de código do projeto Chromium. Para enviar um patch, você precisa obter o [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools) e seguir estas instruções sobre [solicitar uma revisão](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md) (usando sua área de trabalho do V8 em vez de uma do Chromium).

### Fique atento a falhas ou regressões

Depois que você tiver a aprovação da revisão de código, poderá aplicar seu patch usando o commit queue. Ele executa uma série de testes e aplica seu patch se todos os testes passarem. Uma vez que sua alteração seja confirmada, é uma boa ideia monitorar [o console](https://ci.chromium.org/p/v8/g/main/console) até que os bots fiquem verdes após sua alteração, pois o console executa alguns testes adicionais além do commit queue.
