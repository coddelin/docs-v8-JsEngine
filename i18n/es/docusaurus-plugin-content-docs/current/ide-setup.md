---
title: "Configuración de GUI e IDE"
description: "Este documento contiene consejos específicos de GUI e IDE para trabajar en la base de código de V8."
---
El código fuente de V8 puede ser explorado en línea con [Chromium Code Search](https://cs.chromium.org/chromium/src/v8/).

El repositorio Git de este proyecto puede ser accedido utilizando otros programas cliente y complementos. Consulta la documentación de tu cliente para más información.

## Visual Studio Code y clangd

Para obtener instrucciones sobre cómo configurar VSCode para V8, consulta este [documento](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/). Actualmente (2021), esta es la configuración recomendada.

## Eclipse

Para obtener instrucciones sobre cómo configurar Eclipse para V8, consulta este [documento](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/). Nota: a partir de 2020, la indexación de V8 con Eclipse no funciona bien.

## Visual Studio Code y cquery

VSCode y cquery proporcionan buenas capacidades de navegación de código. Ofrece “ir a definición” y “buscar todas las referencias” para símbolos de C++ y funciona bastante bien. Esta sección describe cómo obtener una configuración básica en un sistema *nix.

### Instalar VSCode

Instala VSCode de tu manera preferida. El resto de esta guía asume que puedes ejecutar VSCode desde la línea de comandos utilizando el comando `code`.

### Instalar cquery

Clona cquery desde [cquery](https://github.com/cquery-project/cquery) en un directorio de tu elección. Usamos `CQUERY_DIR="$HOME/cquery"` en esta guía.

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

Si algo sale mal, asegúrate de revisar la [guía de inicio de cquery](https://github.com/cquery-project/cquery/wiki).

Puedes usar `git pull && git submodule update` para actualizar cquery en otro momento (no olvides reconstruirlo mediante `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8`).

### Instalar y configurar el plugin cquery para VSCode

Instala la extensión cquery desde el mercado en VSCode. Abre VSCode en tu checkout de V8:

```bash
cd v8
code .
```

Ve a la configuración en VSCode, por ejemplo, mediante el atajo <kbd>Ctrl</kbd> + <kbd>,</kbd>.

Agrega lo siguiente a la configuración de tu espacio de trabajo, reemplazando `YOURUSERNAME` y `YOURV8CHECKOUTDIR` adecuadamente.

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### Proporcionar `compile_commands.json` a cquery

El último paso es generar un compile_commands.json para cquery. Este archivo contendrá las líneas de comando específicas del compilador utilizadas para construir V8 para cquery. Ejecuta el siguiente comando en el checkout de V8:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

Esto necesita ser re-ejecutado de vez en cuando para enseñar a cquery acerca de nuevos archivos fuente. En particular, siempre deberías volver a ejecutar el comando después de que se haya cambiado un `BUILD.gn`.

### Otras configuraciones útiles

El cierre automático de paréntesis en Visual Studio Code no funciona tan bien. Se puede desactivar con

```json
"editor.autoClosingBrackets": false
```

en la configuración de usuario.

Las siguientes máscaras de exclusión ayudan a evitar resultados no deseados al usar la búsqueda (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>):

```js
"files.exclude": {
  "**/.vscode": true,  // este es un valor predeterminado
},
"search.exclude": {
  "**/out*": true,     // este es un valor predeterminado
  "**/build*": true    // este es un valor predeterminado
},
```
