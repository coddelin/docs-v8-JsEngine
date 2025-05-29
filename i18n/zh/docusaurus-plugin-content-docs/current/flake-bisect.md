---
title: '测试分支'
description: '本文档解释如何处理有波动的测试。'
---
有波动的测试会在机器人上的单独步骤中报告（[示例构建](https://ci.chromium.org/ui/p/v8/builders/ci/V8%20Linux64%20TSAN/38630/overview)）。

每个测试日志提供一个预填充的命令行，用于触发自动分支测试，例如：

```
在命令行上触发分支测试：
bb add v8/try.triggered/v8_flako -p 'to_revision="deadbeef"' -p 'test_name="MyTest"' ...
```

在首次触发分支测试之前，用户必须使用 google.com 帐户登录：

```bash
bb auth-login
```

然后执行提供的命令，该命令会返回一个运行分支测试的构建 URL（[示例](https://ci.chromium.org/ui/p/v8/builders/try.triggered/v8_flako/b8836020260675019825/overview)）。

如果幸运的话，分支分析会指向一个嫌疑人。如果不幸，可以继续阅读...

## 详细描述

有关技术细节，请参阅实现跟踪 [问题](https://crbug.com/711249)。分支测试方法与 [findit](https://sites.google.com/chromium.org/cat/findit) 的意图相同，但实现方式不同。

### 它是如何工作的？

分支任务分为三个阶段：校准、向后分析和向内分析。在校准阶段，测试会重复进行，并将总超时（或重复次数）加倍，直到在一次运行中发现足够的波动。然后，向后分析会加倍 git 范围，直到找到没有波动的修订版本。最后，我们分析出好版本和最旧的坏版本之间的范围。请注意，分支测试不会生成新的构建产品，仅基于 V8 的持续基础设施此前生成的构建。

### 分支失败的情况…

- 无法在校准期间获得足够信心。这通常发生在几乎不可能出现的波动或者仅在其他测试并行运行时可见的波动（例如内存占用测试）。
- 罪魁祸首太过陈旧。分支在某些步骤之后或不再可用的旧构建的情况下放弃。
- 整体分支任务超时。在这种情况下可能可以通过使用一个较旧的已知坏修订版本重新启动。

## 定制分支测试的属性

- `extra_args`：传递给 V8 的 `run-tests.py` 脚本的额外参数。
- repetitions：初始测试重复次数（传递给 `run-tests.py` 的 `--random-seed-stress-count` 选项；如果使用 `total_timeout_sec` 则不使用）。
- `timeout_sec`：传递给 `run-tests.py` 的超时参数。
- `to_revision`：已知为坏的修订版本。这是分支测试将开始的位置。
- `total_timeout_sec`：单个分支步骤的初始总超时。在校准期间，如果需要，这个时间会加倍几次。设置为 0 以禁用并改用 `repetitions` 属性。
- `variant`：传递给 `run-tests.py` 的测试变种的名称。

## 不需要更改的属性

- `bisect_buildername`：生成分支测试构建的构建器的主名称。
- `bisect_mastername`：生成分支测试构建的构建器名称。
- `build_config`：传递给 V8 的 `run-tests.py` 脚本的构建配置（此处的参数名称为 `--mode`，示例：`Release` 或 `Debug`）。
- `isolated_name`：独立文件的名称（例如 `bot_default`，`mjsunit`）。
- `swarming_dimensions`：分类测试运行机器类型的群组维度。作为字符串列表传递，每个字符串格式为 `name:value`。
- `test_name`：传递给 run-tests.py 的完全限定测试名称。例如 `mjsunit/foobar`。

## 提示和技巧

### 分析一个挂起的测试（例如死锁）

如果失败的运行超时，而成功的运行非常快，可以调整 timeout_sec 参数，使分支分析不因等待挂起的运行超时而延迟。例如，如果成功通常在不到 1 秒内完成，则将超时设置为较短时间，例如 5 秒。

### 对嫌疑人的更多信心

在某些运行中，信心非常低。例如，如果在一次运行中检测到四次波动，则校准就满足。分支分析中，每次运行中出现一个或多个波动，就会被视为坏。在这些情况下，可以重新启动分支任务，设置 revision 为嫌疑人，同时使用比原始任务更高的重复次数或总超时，并确认再次得出相同的结论。

### 解决超时问题

如果总体超时选项导致构建挂起，最好估算合适的重复次数，并设置 `total_timeout_sec` 为 `0`。

### 测试行为取决于随机种子
