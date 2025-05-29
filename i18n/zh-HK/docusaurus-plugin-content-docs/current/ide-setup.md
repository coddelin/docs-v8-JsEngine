---
title: 'GUI 和 IDE 設置'
description: '本文檔包含針對 V8 代碼庫的 GUI 和 IDE 特定提示。'
---
可以通過 [Chromium Code Search](https://cs.chromium.org/chromium/src/v8/) 在線瀏覽 V8 源代碼。

此項目的 Git 儲存庫可以使用許多其他客戶端程序和插件訪問。查看您的客戶端文檔以了解更多信息。

## Visual Studio Code 和 clangd

有關如何為 V8 設置 VSCode 的說明，請參閱此 [文檔](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/)。這目前（2021 年）是推薦的設置。

## Eclipse

有關如何為 V8 設置 Eclipse 的說明，請參閱此 [文檔](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/)。注意：截至 2020 年，用 Eclipse 索引 V8 效果不佳。

## Visual Studio Code 和 cquery

VSCode 和 cquery 提供了良好的代碼導航功能。它提供“跳轉到定義”以及“查找所有引用”以定位 C++ 符號，並且效果相當不錯。本節描述如何在 *nix 系統上建立基礎設置。

### 安裝 VSCode

以您首選的方式安裝 VSCode。本指南的其余部分假設您可以通過命令行使用命令 `code` 運行 VSCode。

### 安裝 cquery

從 [cquery](https://github.com/cquery-project/cquery) 克隆 cquery 到您選擇的目錄。本指南使用 `CQUERY_DIR="$HOME/cquery"`。

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

如果出現問題，請務必查閱 [cquery 的入門指南](https://github.com/cquery-project/cquery/wiki)。

您可以使用 `git pull && git submodule update` 在稍後更新 cquery （不要忘記通過 `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8` 重新編譯）。

### 安裝並設置 VSCode 的 cquery-plugin

從 VSCode 的市場安裝 cquery 擴展。在您的 V8 檢出目錄中打開 VSCode:

```bash
cd v8
code .
```

進入 VSCode 的設置，例如通過快捷鍵 <kbd>Ctrl</kbd> + <kbd>,</kbd>。

將以下內容添加到您的工作區配置中，並適當替換 `YOURUSERNAME` 和 `YOURV8CHECKOUTDIR`。

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### 提供 `compile_commands.json` 給 cquery

最後一步是生成 cquery 所需的 compile_commands.json。此文件包含構建 V8 時使用的特定編譯器命令行。請在 V8 檢出目錄中運行以下命令:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

您需要不時重新執行此命令，以讓 cquery 學習新的源文件。尤其是，當修改了 `BUILD.gn` 文件後，您應該始終重新運行此命令。

### 其他有用的設置

Visual Studio Code 中的括號自動閉合功能不夠好。您可以通過以下設置禁用它

```json
"editor.autoClosingBrackets": false
```

在用戶設置中。

以下排除掩碼有助於避免使用搜索工具 (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>) 時獲得不需要的結果:

```js
"files.exclude": {
  "**/.vscode": true,  // 此為默認值
},
"search.exclude": {
  "**/out*": true,     // 此為默認值
  "**/build*": true    // 此為默認值
},
```
