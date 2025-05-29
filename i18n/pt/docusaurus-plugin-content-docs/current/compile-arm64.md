---
title: 'Compilação em Linux Arm64'
description: 'Dicas e truques para compilar o V8 nativamente no Linux Arm64'
---
Se você seguiu as instruções sobre como [obter](/docs/source-code) e [compilar](/docs/build-gn) o V8 em uma máquina que não seja x86 ou um Mac com Apple Silicon, pode ter encontrado alguns problemas, devido ao sistema de compilação baixar binários nativos e não conseguir executá-los. No entanto, embora usar uma máquina Linux Arm64 para trabalhar no V8 __não seja oficialmente suportado__, superar esses obstáculos é bastante simples.

## Contornando `vpython`

`fetch v8`, `gclient sync` e outros comandos `depot_tools` usam um wrapper para python chamado "vpython". Se você encontrar erros relacionados a ele, pode definir a seguinte variável para usar a instalação python do sistema:

```bash
export VPYTHON_BYPASS="python gerenciado manualmente não suportado por operações do Chrome"
```

## Binário `ninja` compatível

A primeira coisa a fazer é garantir que estamos usando um binário nativo para `ninja`, substituindo o que está em `depot_tools`. Uma maneira simples de fazer isso é ajustar seu PATH como segue ao instalar `depot_tools`:

```bash
export PATH=$PATH:/path/to/depot_tools
```

Dessa forma, você poderá usar a instalação `ninja` do sistema, dado que ela provavelmente estará disponível. No entanto, se não estiver, você pode [compilá-la a partir do código-fonte](https://github.com/ninja-build/ninja#building-ninja-itself).

## Compilando clang

Por padrão, o V8 tentará usar sua própria compilação de clang que pode não funcionar na sua máquina. Você pode ajustar os argumentos do GN para [usar o clang ou GCC do sistema](#system_clang_gcc), no entanto, pode querer usar o mesmo clang que o upstream, já que será a versão mais suportada.

Você pode compilá-lo localmente diretamente a partir do checkout do V8:

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## Configurando manualmente os argumentos do GN

Scripts de conveniência podem não funcionar por padrão, então você terá que configurar os argumentos do GN manualmente seguindo o fluxo de trabalho [manual](/docs/build-gn#gn). Você pode obter as configurações típicas de "release", "optdebug" e "debug" com os seguintes argumentos:

- `release`

```bash
is_debug=false
```

- `optdebug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
```

- `debug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
v8_optimized_debug=false
```

## Usando o clang ou GCC do sistema

Compilar com GCC é apenas uma questão de desabilitar a compilação com clang:

```bash
is_clang=false
```

Note que por padrão, o V8 fará o link usando `lld`, o que requer uma versão recente do GCC. Você pode usar `use_lld=false` para alternar para o linker gold ou, adicionalmente, usar `use_gold=false` para usar `ld`.

Se você quiser usar o clang que está instalado no seu sistema, por exemplo em `/usr`, pode usar os seguintes argumentos:

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

No entanto, dado que a versão de clang do sistema pode não ser bem suportada, é provável que você encontre advertências, como flags de compilador desconhecidas. Nesse caso, é útil parar de tratar advertências como erros com:

```bash
treat_warnings_as_errors=false
```
