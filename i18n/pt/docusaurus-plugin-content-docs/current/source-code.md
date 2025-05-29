---
title: "Verificando o código-fonte do V8"
description: "Este documento explica como verificar localmente o código-fonte do V8."
---
Este documento explica como verificar localmente o código-fonte do V8. Se você deseja apenas navegar pelo código online, use estes links:

- [navegar](https://chromium.googlesource.com/v8/v8/)
- [navegar bleeding edge](https://chromium.googlesource.com/v8/v8/+/master)
- [mudanças](https://chromium.googlesource.com/v8/v8/+log/master)

## Usando Git

O repositório Git do V8 está localizado em https://chromium.googlesource.com/v8/v8.git, com um espelho oficial no GitHub: https://github.com/v8/v8.

Não execute apenas `git clone` em nenhum destes URLs! Se você quiser construir o V8 a partir do seu checkout, siga as instruções abaixo para configurar tudo corretamente.

## Instruções

1. No Linux ou macOS, primeiro instale o Git e depois [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up).

    No Windows, siga as instruções do Chromium ([para Googlers](https://goto.google.com/building-chrome-win), [para não-Googlers](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows)) para instalar o Git, Visual Studio, ferramentas de depuração para Windows e `depot_tools`.

1. Atualize `depot_tools` executando o seguinte no seu terminal/shell. No Windows, isso deve ser feito no Prompt de Comando (`cmd.exe`), em vez de PowerShell ou outros.

    ```
    gclient
    ```

1. Para **acesso de push**, você precisa configurar um arquivo `.netrc` com sua senha do Git:

    1. Vá para https://chromium.googlesource.com/new-password e faça login com sua conta de commit (geralmente uma conta `@chromium.org`). Nota: criar uma nova senha não revoga automaticamente senhas criadas anteriormente. Certifique-se de usar o mesmo e-mail configurado em `git config user.email`.
    1. Veja a grande caixa cinza contendo comandos shell. Cole essas linhas no seu shell.

1. Agora, obtenha o código-fonte do V8, incluindo todos os ramos e dependências:

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

Depois disso, você estará intencionalmente em um estado de cabeçalho destacado.

Opcionalmente, você pode especificar como novos ramos devem ser rastreados:

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

Alternativamente, você pode criar novos ramos locais desta forma (recomendado):

```bash
git new-branch fix-bug-1234
```

## Mantendo-se atualizado

Atualize seu ramo atual com `git pull`. Note que, se você não estiver em um ramo, `git pull` não funcionará, e você precisará usar `git fetch`.

```bash
git pull
```

Às vezes, as dependências do V8 são atualizadas. Você pode sincronizá-las executando:

```bash
gclient sync
```

## Enviando código para revisão

```bash
git cl upload
```

## Comitando

Você pode usar a checkbox CQ no codereview para comitar (preferido). Veja também as [instruções do chromium](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md) para flags CQ e solução de problemas.

Se você precisar de mais trybots do que o padrão, adicione o seguinte à sua mensagem de commit no Gerrit (por exemplo, para adicionar um bot nosnap):

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

Para enviar manualmente, atualize seu ramo:

```bash
git pull --rebase origin
```

Então comite usando:

```bash
git cl land
```

## Try jobs

Esta seção é útil apenas para membros do projeto V8.

### Criando um try job via codereview

1. Envie um CL para o Gerrit.

    ```bash
    git cl upload
    ```

1. Tente o CL enviando um try job para os try bots desta maneira:

    ```bash
    git cl try
    ```

1. Aguarde os try bots compilarem e você receberá um e-mail com o resultado. Você também pode verificar o estado do try no seu patch no Gerrit.

1. Se a aplicação do patch falhar, você precisa reenviar seu patch ou especificar a revisão do V8 para sincronizar:

```bash
git cl try --revision=1234
```

### Criando um try job a partir de um ramo local

1. Comite algumas mudanças para um ramo git no repositório local.

1. Tente a mudança enviando um try job aos try bots desta forma:

    ```bash
    git cl try
    ```

1. Aguarde os try bots compilarem e você receberá um e-mail com o resultado. Nota: existem problemas com algumas das réplicas no momento. Enviar try jobs via codereview é recomendado.

### Argumentos úteis

O argumento de revisão informa ao try bot qual revisão da base de código será usada para aplicar suas mudanças locais. Sem a revisão, [a revisão LKGR do V8](https://v8-status.appspot.com/lkgr) é usada como base.

```bash
git cl try --revision=1234
```

Para evitar rodar seu try job em todos os bots, use o flag `--bot` com uma lista separada por vírgulas dos nomes dos builders. Exemplo:

```bash
git cl try --bot=v8_mac_rel
```

### Visualizando o servidor de try

```bash
git cl try-results
```

## Ramos de código-fonte

Existem vários ramos diferentes do V8; se você não tem certeza de qual versão obter, provavelmente desejará a versão estável e atualizada. Confira nosso [Processo de Lançamento](/docs/release-process) para obter mais informações sobre os diferentes ramos utilizados.

Você pode querer acompanhar a versão do V8 que o Chrome está enviando em seus canais estáveis (ou beta), veja https://omahaproxy.appspot.com/.
