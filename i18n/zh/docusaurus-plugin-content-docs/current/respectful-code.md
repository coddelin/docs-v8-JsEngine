---
title: '尊重的代码'
description: '包容性是V8文化的核心，我们的价值观包括彼此尊重。因此，重要的是每个人都能在没有偏见和歧视的有害影响下做出贡献。'
---

包容性是V8文化的核心，我们的价值观包括彼此尊重。因此，重要的是每个人都能在没有偏见和歧视的有害影响下做出贡献。然而，我们的代码库、用户界面和文档中的术语可能会延续这种歧视。本文件提出了一些指导，以解决代码和文档中不尊重的术语。

## 政策

应避免使用直接或间接具贬义、伤害性或延续歧视的术语。

## 此政策的适用范围是什么？

任何贡献者在V8工作时可能阅读的内容，包括：

- 变量、类型、函数、文件、构建规则、二进制文件、导出变量的名称，等等
- 测试数据
- 系统输出和显示
- 文档（无论是在源文件内还是文件外）
- 提交消息

## 原则

- 保持尊重：描述工作方式时不应使用贬义语言。
- 尊重文化敏感的语言：一些词语可能具有重要的历史或政治含义。请注意这一点并使用替代词语。

## 我如何知道特定术语是否合适？

应用上述原则。如果有任何问题，你可以联系`v8-dev@googlegroups.com`。

## 应避免的术语有哪些示例？

此列表不是全面的。它包含了一些人们常遇到的例子。


| 术语      | 建议的替代词                                             |
| --------- | ---------------------------------------------------------- |
| master    | primary, controller, leader, host                          |
| slave     | replica, subordinate, secondary, follower, device, peripheral |
| whitelist | allowlist, exception list, inclusion list                  |
| blacklist | denylist, blocklist, exclusion list                        |
| insane    | unexpected, catastrophic, incoherent                       |
| sane      | expected, appropriate, sensible, valid                     |
| crazy     | unexpected, catastrophic, incoherent                       |
| redline   | priority line, limit, soft limit                           |


## 如果我正在与违反此政策的内容交互怎么办？

这种情况已经出现了几次，特别是对于实现规范的代码。在这些情况下，与规范语言不同可能会干扰对实现的理解。在这些情况下，我们建议按照以下优先顺序采取以下措施之一：

1. 如果使用替代术语不会干扰理解，请使用替代术语。
1. 如果不行，请不要将术语传播到执行接口的代码层之外。在必要时，在API边界使用替代术语。
