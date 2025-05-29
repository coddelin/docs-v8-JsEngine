---
title: '官方支持的配置'
description: '本文档解释了哪些构建配置由 V8 团队维护。'
---
V8 支持跨操作系统、版本、架构端口、构建标志等的多种不同构建配置。

经验法则：如果我们支持，那么我们会在一个 [持续集成控制台](https://ci.chromium.org/p/v8/g/main/console) 上运行一个机器人。

一些细微差别：

- 最重要的构建器发生问题会阻止代码提交。树警会通常撤销问题代码。
- 大致相同的 [构建器集](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl) 出现问题会阻止我们持续向 Chromium 推送更新。
- 某些架构端口是 [外部处理的](/docs/ports)。
- 某些配置是 [实验性的](https://ci.chromium.org/p/v8/g/experiments/console)。发生问题是允许的，并且会由该配置的负责人处理。

如果您遇到问题的配置不受上述机器人覆盖：

- 欢迎提交一个修复您问题的 CL。团队将支持您的代码审查。
- 您可以使用 v8-dev@googlegroups.com 来讨论问题。
- 如果您认为我们应该支持此配置（也许是我们的测试矩阵中存在漏洞？），请在 [V8 问题跟踪器](https://bugs.chromium.org/p/v8/issues/entry) 上提交问题并提出请求。

然而，我们没有足够的精力支持所有可能的配置。
