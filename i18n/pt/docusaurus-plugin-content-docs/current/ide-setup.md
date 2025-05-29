---
title: &apos;Configuração de GUI e IDE&apos;
description: &apos;Este documento contém dicas específicas de GUI e IDE para trabalhar no código-fonte do V8.&apos;
---
O código-fonte do V8 pode ser visualizado online com o [Chromium Code Search](https://cs.chromium.org/chromium/src/v8/).

O repositório Git deste projeto pode ser acessado usando muitos outros programas clientes e plug-ins. Consulte a documentação do seu cliente para mais informações.

## Visual Studio Code e clangd

Para instruções sobre como configurar o VSCode para o V8, consulte este [documento](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/). Atualmente (2021), esta é a configuração recomendada.

## Eclipse

Para instruções sobre como configurar o Eclipse para o V8, consulte este [documento](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/). Nota: a partir de 2020, a indexação do V8 com Eclipse não funciona bem.

## Visual Studio Code e cquery

VSCode e cquery fornecem boas capacidades de navegação pelo código. Ele oferece “ir para definição” assim como “encontrar todas as referências” para símbolos C++ e funciona bastante bem. Esta seção descreve como obter uma configuração básica em um sistema *nix.

### Instalar VSCode

Instale o VSCode de sua maneira preferida. O restante deste guia assume que você pode executar o VSCode a partir da linha de comando via o comando `code`.

### Instalar cquery

Clone o cquery de [cquery](https://github.com/cquery-project/cquery) em um diretório de sua escolha. Usamos `CQUERY_DIR="$HOME/cquery"` neste guia.

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

Se algo der errado, certifique-se de verificar o [guia de início rápido do cquery](https://github.com/cquery-project/cquery/wiki).

Você pode usar `git pull && git submodule update` para atualizar o cquery posteriormente (não se esqueça de recompilar via `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8`).

### Instalar e configurar o plugin cquery para VSCode

Instale a extensão cquery do marketplace no VSCode. Abra o VSCode no seu checkout do V8:

```bash
cd v8
code .
```

Vá para as configurações no VSCode, por exemplo, via o atalho <kbd>Ctrl</kbd> + <kbd>,</kbd>.

Adicione o seguinte à configuração do seu workspace, substituindo `YOURUSERNAME` e `YOURV8CHECKOUTDIR` adequadamente.

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### Fornecer `compile_commands.json` ao cquery

O último passo é gerar um compile_commands.json para o cquery. Este arquivo conterá as linhas específicas de comando do compilador usadas para compilar o V8 para o cquery. Execute o seguinte comando no checkout do V8:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

Isso precisa ser reexecutado de tempos em tempos para ensinar ao cquery sobre novos arquivos fonte. Em particular, você deve sempre executar novamente o comando depois que um `BUILD.gn` for alterado.

### Outras configurações úteis

O fechamento automático de parênteses no Visual Studio Code não funciona tão bem. Ele pode ser desativado com

```json
"editor.autoClosingBrackets": false
```

nas configurações do usuário.

As seguintes máscaras de exclusão ajudam a evitar resultados indesejados ao usar a busca (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>):

```js
"files.exclude": {
  "**/.vscode": true,  // este é um valor padrão
},
"search.exclude": {
  "**/out*": true,     // este é um valor padrão
  "**/build*": true    // este é um valor padrão
},
```
