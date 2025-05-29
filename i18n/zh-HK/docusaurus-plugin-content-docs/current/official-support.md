---
title: "正式支援的配置"
description: "此文檔解釋了哪些構建配置是由 V8 團隊維護的。"
---
V8 支援多種不同的構建配置，包括作業系統、版本、架構移植、構建標誌等。

經驗法則：如果我們支援某項配置，我們會在其中一個[持續整合控制臺](https://ci.chromium.org/p/v8/g/main/console)上執行一個 Bot。

一些細節注意事項：

- 最重要的構建機器的一些問題會阻止程式碼提交。一名樹木維護員通常會回退問題程式碼。
- 大致相同的[構建機器集合](https://chromium.googlesource.com/infra/infra/+/main/infra/services/lkgr_finder/config/v8_cfg.pyl)出現問題，會阻止我們向 Chromium 的持續提交。
- 某些架構移植是[由外部處理的](/docs/ports)。
- 某些配置是[實驗性的](https://ci.chromium.org/p/v8/g/experiments/console)。它們的問題是允許的，並將由配置的擁有者處理。

如果您遇到一個問題配置，但不在上述任何一個 Bot 的支援範圍內：

- 您可以隨時提交修復該問題的 CL。團隊會在程式碼審查中支援您。
- 您可以使用 [v8-dev@googlegroups.com](mailto:v8-dev@googlegroups.com) 討論這個問題。
- 如果您認為我們應該支援此配置（可能是我們測試矩陣中的一個漏洞？），請提交一個 Bug 到 [V8 問題追蹤器](https://bugs.chromium.org/p/v8/issues/entry) 並提出請求。

然而，我們沒有足夠的資源來支援每一種可能的配置。
