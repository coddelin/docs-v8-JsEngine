---
title: "V8 的公共 API"
description: "本文档讨论了 V8 公共 API 的稳定性，以及开发人员如何对其进行修改。"
---
本文档讨论了 V8 公共 API 的稳定性，以及开发人员如何对其进行修改。

## API 稳定性

如果 Chromium 的金丝雀版本中的 V8 出现崩溃问题，它将回滚到前一个金丝雀版本的 V8 版本。因此，确保 V8 的 API 在不同的金丝雀版本之间保持兼容性非常重要。

我们持续运行一个 [机器人](https://ci.chromium.org/p/v8/builders/luci.v8.ci/Linux%20V8%20API%20Stability)，用于标识 API 稳定性违规情况。它以 Chromium 的 HEAD 和 V8 的 [当前金丝雀版本](https://chromium.googlesource.com/v8/v8/+/refs/heads/canary)进行编译。

目前，此机器人的失败仅供参考，无需采取任何行动。在回滚的情况下，可以通过责任列表轻松识别相关的变更列表 (CL)。

如果您导致该机器人失败，请记住在下一次进行 V8 更改和相关 Chromium 更改之间增加间隔时间。

## 如何修改 V8 的公共 API

V8 被多个嵌入者使用：Chrome、Node.js、gjstest 等。当修改 V8 的公共 API（基本上是在 `include/` 目录下的文件）时，我们需要确保嵌入者可以顺利地更新到新的 V8 版本。尤其是，我们不能假设嵌入者会以一个原子操作同时更新到新的 V8 版本并调整其代码以适应新的 API。

嵌入者应该能够在仍使用以前版本的 V8 的情况下调整其代码以适应新的 API。以下说明均遵循这一规则。

- 添加新的类型、常量和函数是安全的，但有一个例外：不要向现有类中添加新的纯虚函数。新的虚函数应具有默认实现。
- 如果参数有默认值，则向函数添加新参数是安全的。
- 删除或重命名类型、常量、函数是不安全的。使用 [`V8_DEPRECATED`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=395&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) 和 [`V8_DEPRECATE_SOON`](https://cs.chromium.org/chromium/src/v8/include/v8config.h?l=403&rcl=0425b20ad9a8ba38c2e0dd16e8814abb722bfdde) 宏，这将导致嵌入者调用已弃用的方法时出现编译时警告。例如，假设我们想将 `foo` 函数重命名为 `bar` 函数。我们需要执行以下步骤：
    - 在现有函数 `foo` 附近添加新函数 `bar`。
    - 等待变更列表 (CL) 在 Chrome 中上线。调整 Chrome 以使用 `bar`。
    - 使用 `V8_DEPRECATED("Use bar instead") void foo();` 对 `foo` 进行注解。
    - 在相同的变更列表中调整测试以使用 `bar` 而不是 `foo`。
    - 在变更列表中解释更改的动机及高级别更新说明。
    - 等待下一个 V8 分支。
    - 删除函数 `foo`。

    `V8_DEPRECATE_SOON` 是 `V8_DEPRECATED` 的一种更柔和版本。Chrome 不会因其而中断，因此无需执行第 b 步。但 `V8_DEPRECATE_SOON` 不足以删除该函数。

    您仍需使用 `V8_DEPRECATED` 注解，并在删除该函数之前等待下一个分支。

    可使用 `v8_deprecation_warnings` GN 标志测试 `V8_DEPRECATED`。
    可使用 `v8_imminent_deprecation_warnings` 测试 `V8_DEPRECATE_SOON`。

- 修改函数签名是不安全的。按照上述说明使用 `V8_DEPRECATED` 和 `V8_DEPRECATE_SOON` 宏。

我们为每个 V8 版本维护一个 [文档](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)，提到重要的 API 更改。

还有一个定期更新的 [doxygen API 文档](https://v8.dev/api)。
