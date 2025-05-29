---
title: 'Cross-compilation e depuração para ARM/Android'
description: 'Este documento explica como cross-compilar o V8 para ARM/Android e como depurá-lo.'
---
Primeiro, certifique-se de que você pode [compilar com GN](/docs/build-gn).

Em seguida, adicione `android` ao seu arquivo de configuração `.gclient`.

```python
target_os = ['android']  # Adicione isso para fazer o checkout de coisas do Android.
```

O campo `target_os` é uma lista, então se você também estiver construindo em Unix ficará assim:

```python
target_os = ['android', 'unix']  # Múltiplos sistemas operacionais alvo.
```

Execute `gclient sync`, e você obterá um grande checkout em `./third_party/android_tools`.

Habilite o modo desenvolvedor no seu telefone ou tablet, e ative a depuração USB, seguindo as instruções [aqui](https://developer.android.com/studio/run/device.html). Também tenha à mão a ferramenta [`adb`](https://developer.android.com/studio/command-line/adb.html) no seu caminho. Ela está no seu checkout em `./third_party/android_sdk/public/platform-tools`.

## Usando `gm`

Use [o script `tools/dev/gm.py`](/docs/build-gn#gm) para compilar automaticamente os testes do V8 e executá-los no dispositivo.

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

Este comando envia os binários e testes para o diretório `/data/local/tmp/v8` no dispositivo.

## Compilação manual

Use `v8gen.py` para gerar uma compilação de release ou debug para ARM:

```bash
tools/dev/v8gen.py arm.release
```

Em seguida, execute `gn args out.gn/arm.release` e certifique-se de ter as seguintes chaves:

```python
target_os = "android"      # Essas linhas precisam ser alteradas manualmente
target_cpu = "arm"         # pois o v8gen.py assume uma construção de simulador.
v8_target_cpu = "arm"
is_component_build = false
```

As chaves devem ser as mesmas para compilações de debug. Se você estiver compilando para um dispositivo arm64, como o Pixel C, que suporta binários de 32 bits e 64 bits, as chaves devem ser assim:

```python
target_os = "android"      # Essas linhas precisam ser alteradas manualmente
target_cpu = "arm64"       # pois o v8gen.py assume uma construção de simulador.
v8_target_cpu = "arm64"
is_component_build = false
```

Agora, compile:

```bash
ninja -C out.gn/arm.release d8
```

Use `adb` para copiar os arquivos binários e de snapshot para o telefone:

```bash
adb shell 'mkdir -p /data/local/tmp/v8/bin'
adb push out.gn/arm.release/d8 /data/local/tmp/v8/bin
adb push out.gn/arm.release/icudtl.dat /data/local/tmp/v8/bin
adb push out.gn/arm.release/snapshot_blob.bin /data/local/tmp/v8/bin
```

```bash
rebuffat:~/src/v8$ adb shell
bullhead:/ $ cd /data/local/tmp/v8/bin
bullhead:/data/local/tmp/v8/bin $ ls
v8 icudtl.dat snapshot_blob.bin
bullhead:/data/local/tmp/v8/bin $ ./d8
V8 version 5.8.0 (candidate)
d8> 'w00t!'
"w00t!"
d8>
```

## Depuração

### d8

Depurar remotamente o `d8` em um dispositivo Android é relativamente simples. Primeiro, inicie o `gdbserver` no dispositivo Android:

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

Depois, conecte-se ao servidor no dispositivo host.

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb` e `gdbserver` precisam ser compatíveis entre si; em caso de dúvida, use os binários do [Android NDK](https://developer.android.com/ndk). Observe que, por padrão, o binário `d8` é despojado (informações de depuração removidas), mas `$OUT_DIR/exe.unstripped/d8` contém o binário sem despojar.

### Logs

Por padrão, algumas saídas de depuração do `d8` acabam no log do sistema Android, o qual pode ser visualizado usando [`logcat`](https://developer.android.com/studio/command-line/logcat). Infelizmente, às vezes uma parte de uma saída de depuração específica é dividida entre o log do sistema e `adb`, e outras vezes parece estar completamente ausente. Para evitar esses problemas, recomenda-se adicionar a seguinte configuração aos `gn args`:

```python
v8_android_log_stdout = true
```

### Problemas com ponto flutuante

A configuração `gn args` `arm_float_abi = "hard"`, que é usada pelo V8 Arm GC Stress bot, pode resultar em comportamentos completamente sem sentido quando utilizado em hardware diferente do usado pelo GC stress bot (por exemplo, no Nexus 7).

## Usando Sourcery G++ Lite

O pacote de compilador cruzado Sourcery G++ Lite é uma versão gratuita do Sourcery G++ da [CodeSourcery](http://www.codesourcery.com/). Há uma página para o [GNU Toolchain for ARM Processors](http://www.codesourcery.com/sgpp/lite/arm). Determine a versão de que você precisa para sua combinação de host e alvo.

As instruções a seguir usam [2009q1-203 para ARM GNU/Linux](http://www.codesourcery.com/sgpp/lite/arm/portal/release858), e, se estiver usando uma versão diferente, altere os URLs e `TOOL_PREFIX` abaixo de acordo.

### Instalando no host e no alvo

A maneira mais simples de configurar isso é instalar o pacote completo do Sourcery G++ Lite tanto no host quanto no alvo, na mesma localização. Isso garantirá que todas as bibliotecas necessárias estejam disponíveis em ambos os lados. Se você quiser usar as bibliotecas padrão no host, não é necessário instalar nada no alvo.

O script a seguir é instalado em `/opt/codesourcery`:

```bash
#!/bin/sh

sudo mkdir /opt/codesourcery
cd /opt/codesourcery
sudo chown "$USERNAME" .
chmod g+ws .
umask 2
wget http://www.codesourcery.com/sgpp/lite/arm/portal/package4571/public/arm-none-linux-gnueabi/arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
tar -xvf arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
```

## Perfil

- Compile um binário, envie-o para o dispositivo e mantenha uma cópia dele no host:

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- Obtenha um log de perfilamento e copie-o para o host:

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- Abra o arquivo `v8.log` no seu editor favorito e edite a primeira linha para corresponder ao caminho completo do binário `d8-version.under.test` na sua estação de trabalho (em vez do caminho `/data/local/tmp/v8/bin/` que estava no dispositivo)

- Execute o processador de ticks com o `d8` do host e um binário `nm` apropriado:

    ```bash
    cp out/x64.release/d8 .  # necessário apenas uma vez
    cp out/x64.release/natives_blob.bin .  # necessário apenas uma vez
    cp out/x64.release/snapshot_blob.bin .  # necessário apenas uma vez
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
