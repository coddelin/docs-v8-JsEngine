---
title: '使用V8进行Chromium性能分析'
description: '本文档解释了如何在Chromium中使用V8的CPU和内存分析工具。'
---
[V8的CPU和内存分析工具](/docs/profile)从V8的shell中使用非常简单，但与Chromium结合使用可能会显得有些混乱。此页面应该可以帮助您解决问题。

## 为什么在Chromium中使用V8分析工具与在V8 shell中使用有所不同？

Chromium是一个复杂的应用程序，不同于V8的shell。以下列出了影响分析工具使用的Chromium功能：

- 每个渲染器是一个独立的进程（其实不完全是每个，但我们可以忽略这一点），所以它们不能共享同一个日志文件；
- 环绕渲染器进程的沙盒会阻止其向磁盘写入数据；
- 开发者工具会为了自己的目的配置分析工具；
- V8的日志记录代码包含一些优化以简化日志状态检查。

## 如何运行Chromium以获取CPU分析？

以下是运行Chromium以从进程开始获取CPU分析的方法：

```bash
./Chromium --no-sandbox --user-data-dir=`mktemp -d` --incognito --js-flags='--prof'
```

请注意，您无法在开发者工具中看到分析结果，因为所有数据都记录到文件中，而不是开发者工具中。

### 参数说明

`--no-sandbox` 关闭渲染器沙盒，使Chrome能够写入日志文件。

`--user-data-dir` 用于创建一个新的配置文件，使用此选项可以避免缓存和已安装扩展的潜在副作用（可选）。

`--incognito` 用于进一步避免污染您的结果（可选）。

`--js-flags` 包含传递给V8的参数：

- `--logfile=%t.log` 指定日志文件的命名模式。`%t` 会被替换为当前时间（以毫秒为单位），因此每个进程都会有自己单独的日志文件。如果需要，可以加入前缀和后缀，例如：`prefix-%t-suffix.log`。默认情况下，每个隔离环境会有单独的日志文件。
- `--prof` 告诉V8将统计分析信息写入日志文件。

## 安卓

在安卓上运行Chrome有一些独特之处，使得分析更为复杂。

- 命令行必须通过 `adb` 在启动设备上的Chrome之前写入。因此，命令行中的引号有时会丢失，最好在 `--js-flags` 中用逗号分隔参数，而不是尝试使用空格和引号。
- 日志文件的路径必须指定为安卓文件系统上可写的绝对路径。
- 安卓上的渲染器进程沙盒即使有 `--no-sandbox` 参数，渲染器进程也不能写入文件系统，因此需要传递 `--single-process` 参数，将渲染器运行在与浏览器进程相同的进程中。
- `.so` 文件嵌入在Chrome的APK中，这意味着符号化需要将APK内存地址转换为构建中的未剥离 `.so` 文件。

以下命令启用安卓上的性能分析：

```bash
./build/android/adb_chrome_public_command_line --no-sandbox --single-process --js-flags='--logfile=/storage/emulated/0/Download/%t.log,--prof'
<关闭并重新启动安卓设备上的Chrome>
adb pull /storage/emulated/0/Download/<日志文件>
./src/v8/tools/linux-tick-processor --apk-embedded-library=out/Release/lib.unstripped/libchrome.so --preprocess <日志文件>
```

## 注意事项

在Windows下，确保打开 `chrome.dll` 的 `.MAP` 文件创建，而不是 `chrome.exe`。
