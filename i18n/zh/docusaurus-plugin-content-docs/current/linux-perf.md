---
title: 'V8 的 Linux `perf` 集成'
description: '本文档解释了如何使用 Linux `perf` 工具分析 V8 的 JIT 编译代码的性能。'
---
V8 内置支持 Linux `perf` 工具。可通过 `--perf-prof` 命令行选项启用。
V8 在代码执行期间写出性能数据到文件，可用于通过 Linux `perf` 工具分析 V8 的 JIT 编译代码（包括 JS 函数名称）的性能。

## 要求

- `linux-perf` 版本需为 5 或更高（之前的版本不支持 JIT）。（参考[末尾](#build-perf)的说明）
- 使用 `enable_profiling=true` 构建 V8/Chrome，以提供更好地符号化 C++ 代码。

## 构建 V8

要使用 V8 的 Linux perf 集成，需使用 `enable_profiling = true` gn 标志构建它：

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## 使用 [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py) 对 `d8` 进行分析

构建 `d8` 后，即可开始使用 Linux perf：

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

更完整的示例：

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# 使用自定义 V8 标志并使用单独的输出目录以减少杂乱：
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# 高级用户界面（`-flame` 仅限 Googler 使用，公共替代选项为 `-web`）：
pprof -flame perf_results/XXX_perf.data.jitted;
# 基于终端的工具：
perf report -i perf_results/XXX_perf.data.jitted;
```

查看 `linux-perf-d8.py --help` 了解更多详情。注意，在 d8 二进制参数后可使用所有 `d8` 标志。


## 使用 [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) 对 Chrome 或 content_shell 进行分析

1. 可以使用 [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) 脚本对 Chrome 进行分析。请确保添加[所需的 Chrome gn 标志](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup)，以获得正确的 C++ 符号。

1. 构建完成后，可以同时为 C++ 和 JS 代码启用完整符号，分析网站性能。

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. 浏览到您的网站，然后关闭浏览器（或等待 `--timeout` 完成）
1. 退出浏览器后，`linux-perf.py` 会完成文件后处理，并显示每个渲染器进程的结果文件列表：

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## 解析 Linux perf 结果

最后，可以使用 Linux `perf` 工具探索 d8 或 Chrome 渲染器进程的性能数据：

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

还可以使用 [pprof](https://github.com/google/pprof) 生成更多可视化内容：

```bash
# 注意：`-flame` 仅限 Google 内部使用，公共替代选项为 `-web`：
pprof -flame perf_results/XXX_perf.data.jitted;
```

## 底层 Linux perf 使用方式

### 直接使用 Linux perf 分析 `d8`

根据具体使用场景，您可能希望直接使用 Linux perf 分析 `d8`。
这需要两步完成：首先使用 `perf record` 创建一个 `perf.data` 文件，然后使用 `perf inject` 后处理文件以注入 JS 符号。

``` bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### V8 Linux perf 标志

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof) 用于 V8 命令行以记录 JIT 代码中的性能样本。

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory) 用于禁用代码内存的写保护。这是必要的，因为当 `perf` 看到相应事件将写位从代码页移除时，它会丢弃关于代码页的信息。以下是从测试 JavaScript 文件记录样本的示例：

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) 用于为解释型函数创建不同的入口点（InterpreterEntryTrampoline 的复制版本），以便基于地址仅用 `perf` 来区分它们。由于需要复制 InterpreterEntryTrampoline，因此会带来轻微的性能和内存回退。


### 直接在 Chrome 中使用 linux-perf

1. 您可以使用相同的 V8 标志来分析 Chrome 本身。按照上面的说明使用正确的 V8 标志，并将 [所需的 Chrome gn 标志](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) 添加到您的 Chrome 构建中。

1. 一旦构建完成，您就可以使用完整的 C++ 和 JS 代码符号来分析网站。

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. 启动 Chrome 后，使用任务管理器找到渲染器进程 ID，并使用它开始分析：

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. 浏览您的网站，然后继续下一部分，了解如何评估 perf 输出。

1. 执行完成后，将从 `perf` 工具收集的静态信息与 V8 为 JIT 代码输出的性能样本结合：

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. 最后，您可以使用 Linux 的 `perf` [工具来探索](#Explore-linux-perf-results)。

## 构建 `perf`

如果您使用的是过时的 Linux 内核，可以在本地构建支持 JIT 的 linux-perf。

- 安装新的 Linux 内核，然后重启您的计算机：

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- 安装依赖项：

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- 下载包含最新 `perf` 工具源代码的内核源文件：

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

在接下来的步骤中，将 `perf` 调用为 `some/director/tip/tools/perf/perf`。
