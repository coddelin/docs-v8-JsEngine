---
title: "Perfilando o Chromium com o V8"
description: "Este documento explica como usar os perfiladores de CPU e heap do V8 com o Chromium."
---
Os [perfiladores de CPU e heap do V8](/docs/profile) são triviais de usar a partir dos shells do V8, mas pode parecer confuso como utilizá-los com o Chromium. Esta página deve ajudá-lo com isso.

## Por que usar os perfiladores do V8 com o Chromium é diferente de usá-los com os shells do V8?

O Chromium é uma aplicação complexa, diferente dos shells do V8. Abaixo está a lista de características do Chromium que afetam o uso dos perfiladores:

- cada renderizador é um processo separado (ok, na verdade, nem sempre, mas vamos omitir esse detalhe), então eles não podem compartilhar o mesmo arquivo de log;
- o sandbox construído em torno do processo do renderizador o impede de escrever no disco;
- as Ferramentas para Desenvolvedores configuram os perfiladores para seus próprios propósitos;
- o código de registro do V8 contém algumas otimizações para simplificar as verificações do estado de registro.

## Como executar o Chromium para obter um perfil de CPU?

Aqui está como executar o Chromium para obter um perfil de CPU desde o início do processo:

```bash
./Chromium --no-sandbox --user-data-dir=`mktemp -d` --incognito --js-flags='--prof'
```

Observe que você não verá os perfis nas Ferramentas para Desenvolvedores, porque todos os dados estão sendo registrados em um arquivo, e não nas Ferramentas para Desenvolvedores.

### Descrição das flags

`--no-sandbox` desativa o sandbox do renderizador para que o Chrome possa escrever no arquivo de log.

`--user-data-dir` é usado para criar um perfil novo, use isso para evitar caches e potenciais efeitos colaterais de extensões instaladas (opcional).

`--incognito` é usado para evitar ainda mais a poluição dos seus resultados (opcional).

`--js-flags` contém as flags passadas ao V8:

- `--logfile=%t.log` especifica um padrão de nome para os arquivos de log. `%t` é expandido para o horário atual em milissegundos, para que cada processo tenha seu próprio arquivo de log. Você pode usar prefixos e sufixos se desejar, como por exemplo: `prefix-%t-suffix.log`. Por padrão, cada isolate recebe um arquivo de log separado.
- `--prof` instrui o V8 a gravar informações de perfil estatístico no arquivo de log.

## Android

O Chrome no Android tem uma série de particularidades que tornam o processo de profilamento um pouco mais complexo.

- A linha de comando deve ser gravada via `adb` antes de iniciar o Chrome no dispositivo. Como resultado, às vezes as aspas na linha de comando se perdem, e é melhor separar os argumentos em `--js-flags` com uma vírgula em vez de tentar usar espaços e aspas.
- O caminho para o arquivo de log deve ser especificado como um caminho absoluto para algum lugar gravável no sistema de arquivos do Android.
- O sandbox usado para processos de renderização no Android significa que, mesmo com `--no-sandbox`, o processo do renderizador ainda não pode gravar arquivos no sistema de arquivos; portanto, é necessário passar `--single-process` para executar o renderizador no mesmo processo que o processo do navegador.
- O `.so` está embutido no APK do Chrome, o que significa que a simbolização precisa converter endereços de memória do APK para o arquivo `.so` sem depuração nos builds.

Os seguintes comandos habilitam o profilamento no Android:

```bash
./build/android/adb_chrome_public_command_line --no-sandbox --single-process --js-flags='--logfile=/storage/emulated/0/Download/%t.log,--prof'
<Feche e reinicie o Chrome no dispositivo Android>
adb pull /storage/emulated/0/Download/<logfile>
./src/v8/tools/linux-tick-processor --apk-embedded-library=out/Release/lib.unstripped/libchrome.so --preprocess <logfile>
```

## Notas

No Windows, certifique-se de ativar a criação de arquivos `.MAP` para o `chrome.dll`, mas não para o `chrome.exe`.
