---
title: 'GUI 和 IDE 设置'
description: '本文档包含有关在 V8 代码库上工作的 GUI 和 IDE 特定提示。'
---
可以使用 [Chromium 代码搜索](https://cs.chromium.org/chromium/src/v8/) 在线浏览 V8 源代码。

可以使用许多其他客户端程序和插件访问此项目的 Git 仓库。有关更多信息，请参阅您的客户端文档。

## Visual Studio Code 和 clangd

有关如何设置 VSCode 以适应 V8 的说明，请参阅此 [文档](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/)。这是当前（2021年）推荐的设置。

## Eclipse

有关如何设置 Eclipse 以适应 V8 的说明，请参阅此 [文档](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/)。注意：截至 2020 年，使用 Eclipse 索引 V8 的效果不佳。

## Visual Studio Code 和 cquery

VSCode 和 cquery 提供了良好的代码导航功能。它支持“跳转到定义”和“查找所有引用”等功能，并且运行效果相当不错。本节描述了如何在 *nix 系统上进行基本设置。

### 安装 VSCode

以您喜欢的方式安装 VSCode。本指南的其余部分假设您可以通过命令行运行 VSCode，命令为 `code`。

### 安装 cquery

从 [cquery](https://github.com/cquery-project/cquery) 克隆 cquery 到您选择的目录。本指南使用 `CQUERY_DIR="$HOME/cquery"`。

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

如果出现问题，请查看 [cquery 的入门指南](https://github.com/cquery-project/cquery/wiki)。

您可以稍后通过 `git pull && git submodule update` 更新 cquery（别忘了通过 `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8` 重新构建）。

### 安装和配置 cquery 插件用于 VSCode

从 VSCode 的市场安装 cquery 扩展。在您的 V8 检出目录中打开 VSCode:

```bash
cd v8
code .
```

在 VSCode 设置中，例如，可以使用快捷键 <kbd>Ctrl</kbd> + <kbd>,</kbd>。

将以下配置添加到您的工作区配置中，适当地替换 `YOURUSERNAME` 和 `YOURV8CHECKOUTDIR`。

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### 为 cquery 提供 `compile_commands.json`

最后一步是生成一个 compile_commands.json 文件给 cquery。该文件将包含构建 V8 使用的特定编译器命令行。运行以下命令，在 V8 的检出目录中:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

需要不定时重新执行该命令，以让 cquery 了解新的源文件。特别是在 `BUILD.gn` 文件变更后，务必重新运行此命令。

### 其他有用的设置

Visual Studio Code 中括号的自动闭合功能效果不太好。可以通过以下方式禁用:

```json
"editor.autoClosingBrackets": false
```

在用户设置中。

以下排除掩码可以帮助避免在使用搜索时（<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>）出现不必要的结果:

```js
"files.exclude": {
  "**/.vscode": true,  // 这是默认值
},
"search.exclude": {
  "**/out*": true,     // 这是默认值
  "**/build*": true    // 这是默认值
},
```
