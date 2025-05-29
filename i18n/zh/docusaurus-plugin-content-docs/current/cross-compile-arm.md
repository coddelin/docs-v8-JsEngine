---
title: '交叉编译和调试ARM/Android'
description: '本文档解释了如何为ARM/Android交叉编译V8，以及如何调试它。'
---
首先，请确保您可以[使用GN构建](/docs/build-gn)。

然后，在您的`.gclient`配置文件中添加`android`。

```python
target_os = ['android']  # 添加此条以检出Android相关内容。
```

`target_os`字段是一个列表，所以如果您也在构建Unix版本，它会看起来像这样：

```python
target_os = ['android', 'unix']  # 多个目标操作系统。
```

运行`gclient sync`，您将在`./third_party/android_tools`下获得一个大的检出。

在您的手机或平板电脑上启用开发者模式，并根据[此处](https://developer.android.com/studio/run/device.html)的说明开启USB调试。另外，在您的环境路径中加入[`adb`](https://developer.android.com/studio/command-line/adb.html)工具。您可以在`./third_party/android_sdk/public/platform-tools`中找到它。

## 使用`gm`

使用[工具目录下的`tools/dev/gm.py`脚本](/docs/build-gn#gm)自动构建V8测试并在设备上运行它们。

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

此命令将二进制文件和测试文件推送到设备的`/data/local/tmp/v8`目录。

## 手动构建

使用`v8gen.py`生成一个ARM的release或debug构建：

```bash
tools/dev/v8gen.py arm.release
```

然后运行`gn args out.gn/arm.release`，并确保您拥有以下键值：

```python
target_os = "android"      # 这些行需要手动修改
target_cpu = "arm"         # 因为v8gen.py假设是模拟器构建。
v8_target_cpu = "arm"
is_component_build = false
```

调试版本的键值应相同。如果您正在为像Pixel C这样的arm64设备构建（支持32位和64位二进制文件），键值应如下所示：

```python
target_os = "android"      # 这些行需要手动修改
target_cpu = "arm64"       # 因为v8gen.py假设是模拟器构建。
v8_target_cpu = "arm64"
is_component_build = false
```

现在开始构建：

```bash
ninja -C out.gn/arm.release d8
```

使用`adb`将二进制文件和快照文件复制到手机：

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

## 调试

### d8

在Android设备上远程调试`d8`相对简单。首先在Android设备上启动`gdbserver`：

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

然后在主机设备上连接到服务器。

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb`和`gdbserver`需要相互兼容。如果有疑问，请使用来自[Android NDK](https://developer.android.com/ndk)的二进制文件。注意，默认情况下`d8`二进制文件是剥离的（删除了调试信息），但`$OUT_DIR/exe.unstripped/d8`包含未剥离的二进制文件。

### 日志记录

默认情况下，部分`d8`的调试输出会出现在Android系统日志中，可以使用[`logcat`](https://developer.android.com/studio/command-line/logcat)来转储日志。不幸的是，有时特定调试输出的一部分会分散在系统日志和`adb`之间，有时甚至完全丢失。为了避免这些问题，建议在`gn args`中添加以下设置：

```python
v8_android_log_stdout = true
```

### 浮点问题

`gn args`设置中的`arm_float_abi = "hard"`会在不同于GC应力测试机器人所使用的硬件（例如在Nexus 7上）上导致完全无意义的程序行为。

## 使用Sourcery G++ Lite

Sourcery G++ Lite交叉编译器套件是CodeSourcery提供的免费版本Sourcery G++。可以在[ARM处理器的GNU工具链](http://www.codesourcery.com/sgpp/lite/arm)页面找到它。确定您的主机/目标组合所需的版本。

以下说明使用了[2009q1-203 for ARM GNU/Linux](http://www.codesourcery.com/sgpp/lite/arm/portal/release858)，如果使用不同的版本，请相应更改以下URL和`TOOL_PREFIX`。

### 在主机和目标设备上安装

设置此工具的最简单方法是将完整的Sourcery G++ Lite包安装到主机和目标设备的相同位置。这将确保所需的所有库在两边都可用。如果您希望在主机上使用默认库，则无需在目标设备上安装任何内容。

以下脚本安装在 `/opt/codesourcery`：

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

## 配置文件

- 编译一个二进制文件，将其推送到设备，同时在主机上保留一份副本：

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- 获取性能分析日志并将其复制到主机：

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- 打开 `v8.log`，使用你喜欢的编辑器修改第一行以匹配工作站中 `d8-version.under.test` 二进制文件的完整路径（替代设备上的 `/data/local/tmp/v8/bin/` 路径）

- 使用主机上的 `d8` 和合适的 `nm` 二进制文件运行 tick 处理器：

    ```bash
    cp out/x64.release/d8 .  # 只需执行一次
    cp out/x64.release/natives_blob.bin .  # 只需执行一次
    cp out/x64.release/snapshot_blob.bin .  # 只需执行一次
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
