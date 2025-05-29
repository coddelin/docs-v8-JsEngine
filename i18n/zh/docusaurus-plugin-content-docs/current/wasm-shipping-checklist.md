---
title: "WebAssembly特性阶段研发与发布的检查清单"
description: "本文档提供在V8中阶段研发和发布WebAssembly特性时的工程需求检查清单。"
---
本文档提供V8中阶段研发和发布WebAssembly特性时的工程需求检查清单。这些检查清单是作为指导原则的，可能不适用于所有特性。实际的发布流程详见[V8发布流程](https://v8.dev/docs/feature-launch-process)。

# 阶段研发

## WebAssembly特性何时进入阶段研发

[阶段研发](https://docs.google.com/document/d/1ZgyNx7iLtRByBtbYi1GssWGefXXciLeADZBR_FxG-hE)定义了WebAssembly特性实现阶段的结束。当以下检查清单完成时，实现阶段就结束了：

- V8中的实现已经完成。这包括：
    - 在TurboFan中的实现（如果适用）
    - 在Liftoff中的实现（如果适用）
    - 在解释器中的实现（如果适用）
- V8中的测试可用
- 通过运行[`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)将规范测试导入V8
- 所有现有提案的规范测试都通过了。缺少的规范测试虽遗憾，但不应阻止阶段研发。

请注意，特性提案在标准化过程中的阶段对在V8中进入阶段研发没有影响。但提案应该基本稳定。

## 如何将WebAssembly特性进入阶段研发

- 在[`src/wasm/wasm-feature-flags.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-feature-flags.h)中，将特性标志从`FOREACH_WASM_EXPERIMENTAL_FEATURE_FLAG`宏列表移至`FOREACH_WASM_STAGING_FEATURE_FLAG`宏列表。
- 在[`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)中，将提案存储库名称添加到`repos`存储库列表中。
- 运行[`tools/wasm/update-wasm-spec-tests.sh`](https://cs.chromium.org/chromium/src/v8/tools/wasm/update-wasm-spec-tests.sh)以创建并上传新提案的规范测试。
- 在[`test/wasm-spec-tests/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-spec-tests/testcfg.py)中，将提案存储库名称和特性标志添加到`proposal_flags`列表中。
- 在[`test/wasm-js/testcfg.py`](https://cs.chromium.org/chromium/src/v8/test/wasm-js/testcfg.py)中，将提案存储库名称和特性标志添加到`proposal_flags`列表中。

可参考[类型反射的阶段研发实例](https://crrev.com/c/1771791)。

# 发布

## WebAssembly特性何时准备好发布

- 满足[V8发布流程](https://v8.dev/docs/feature-launch-process)。
- 实现已通过模糊测试覆盖（如果适用）。
- 特性已阶段研发数周以获得模糊测试覆盖。
- 特性提案处于[第4阶段](https://github.com/WebAssembly/proposals)。
- 所有[规范测试](https://github.com/WebAssembly/spec/tree/master/test)均通过。
- 满足[Chromium开发工具针对新WebAssembly特性的检查清单](https://docs.google.com/document/d/1WbL-fGuLbbNr5-n_nRGo_ILqZFnh5ZjRSUcDTT3yI8s/preview)。

## 如何发布WebAssembly特性

- 在[`src/wasm/wasm-feature-flags.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/wasm/wasm-feature-flags.h)中，将特性标志从`FOREACH_WASM_STAGING_FEATURE_FLAG`宏列表移至`FOREACH_WASM_SHIPPED_FEATURE_FLAG`宏列表。
    - 确保在相关代码更改中添加一个blink CQ机器人来检查由于启用特性而导致的[blink网络测试](https://v8.dev/docs/blink-layout-tests)失败（在描述底部添加此行：`Cq-Include-Trybots: luci.v8.try:v8_linux_blink_rel`）。
- 此外，通过将`FOREACH_WASM_SHIPPED_FEATURE_FLAG`中的第三个参数更改为`true`来默认启用该特性。
- 设置提醒在两个里程碑后删除特性标志。
