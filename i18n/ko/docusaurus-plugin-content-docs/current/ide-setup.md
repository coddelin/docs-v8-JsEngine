---
title: 'GUI 및 IDE 설정'
description: '이 문서는 V8 코드 기반 작업을 위한 GUI 및 IDE 관련 팁을 포함하고 있습니다.'
---
V8 소스 코드는 [Chromium Code Search](https://cs.chromium.org/chromium/src/v8/)에서 온라인으로 볼 수 있습니다.

이 프로젝트의 Git 저장소는 다양한 클라이언트 프로그램 및 플러그인으로 액세스할 수 있습니다. 클라이언트의 문서를 참조하여 자세한 정보를 확인하세요.

## Visual Studio Code 및 clangd

V8을 위한 VSCode 설정 방법에 대한 지침은 이 [문서](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/)를 참조하세요. 이는 현재 (2021년 기준) 권장 구성입니다.

## Eclipse

V8을 Eclipse로 설정하는 방법에 대한 지침은 이 [문서](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/)를 참조하세요. 참고로 2020년 기준으로 Eclipse에서 V8 색인은 잘 작동하지 않습니다.

## Visual Studio Code 및 cquery

VSCode와 cquery는 뛰어난 코드 탐색 기능을 제공합니다. C++ 심볼에 대한 '정의로 이동' 및 '모든 참조 찾기' 기능을 제공하며 매우 잘 작동합니다. 이 섹션에서는 *nix 시스템에서 기본 설정을 얻는 방법을 설명합니다.

### VSCode 설치

선호하는 방법으로 VSCode를 설치하세요. 이 가이드는 VSCode가 명령줄에서 `code` 명령으로 실행될 수 있다고 가정합니다.

### cquery 설치

선호하는 디렉토리에 [cquery](https://github.com/cquery-project/cquery)를 클론하세요. 이 가이드에서는 `CQUERY_DIR="$HOME/cquery"`를 사용합니다.

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

문제가 발생하면 [cquery 시작 가이드](https://github.com/cquery-project/cquery/wiki)를 확인하세요.

나중에 `git pull && git submodule update`를 사용해 cquery를 업데이트할 수 있습니다 (잊지 말고 `cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8`로 다시 빌드하세요).

### VSCode용 cquery-plugin 설치 및 설정

VSCode에서 시장에서 cquery 확장을 설치하세요. V8 체크아웃에서 VSCode를 엽니다:

```bash
cd v8
code .
```

VSCode에서 설정으로 이동하세요. 예를 들어 단축키 <kbd>Ctrl</kbd> + <kbd>,</kbd>를 사용하세요.

`YOURUSERNAME` 및 `YOURV8CHECKOUTDIR`를 적절히 대체하여 워크스페이스 구성에 다음을 추가합니다.

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### cquery에 `compile_commands.json` 제공

마지막 단계는 cquery에 compile_commands.json 파일을 생성하는 것입니다. 이 파일은 V8을 빌드하는 데 사용되는 특정 컴파일러 명령 목록을 cquery에 제공합니다. V8 체크아웃에서 다음 명령을 실행하세요:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

새 소스 파일에 대해 cquery를 가르치기 위해 이 명령을 주기적으로 다시 실행해야 합니다. 특히 `BUILD.gn`이 변경된 후에는 항상 명령을 다시 실행해야 합니다.

### 기타 유용한 설정

Visual Studio Code에서 괄호를 자동으로 닫는 기능이 잘 작동하지 않습니다. 이를 다음 설정으로 비활성화할 수 있습니다:

```json
"editor.autoClosingBrackets": false
```

사용자 설정에 추가하세요.

검색을 사용할 때 (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>) 원치 않는 결과를 피하려면 다음 배제 마스크를 사용하는 것이 좋습니다:

```js
"files.exclude": {
  "**/.vscode": true,  // 기본값입니다
},
"search.exclude": {
  "**/out*": true,     // 기본값입니다
  "**/build*": true    // 기본값입니다
},
```
