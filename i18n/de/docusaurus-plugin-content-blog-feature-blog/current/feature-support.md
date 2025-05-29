---
title: "Funktionsunterstützung"
permalink: "/funktionen/unterstuetzung/"
layout: "layouts/base.njk"
description: "Dieses Dokument erklärt die Listen der unterstützten Sprachfunktionen von JavaScript und WebAssembly, wie sie auf der V8-Website verwendet werden."
---
# Unterstützung für JavaScript/Wasm-Funktionen

[Unsere Erklärungen zu JavaScript- und WebAssembly-Sprachfunktionen](/funktionen) enthalten oft Funktions-Unterstützungslisten wie die folgende:

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

Eine Funktion ohne jegliche Unterstützung würde so aussehen:

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

Für hochmoderne Funktionen ist es üblich, gemischte Unterstützung in verschiedenen Umgebungen zu sehen:

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

Das Ziel ist es, einen schnellen Überblick über die Reife einer Funktion nicht nur in V8 und Chrome, sondern im gesamten JavaScript-Ökosystem zu bieten. Beachten Sie, dass dies nicht auf native Implementierungen in aktiv entwickelten JavaScript-VMs wie V8 beschränkt ist, sondern auch Tooling-Unterstützung umfasst, die hier durch das [Babel](https://babeljs.io/) Symbol dargestellt wird.

<!--truncate-->
Der Babel-Eintrag umfasst verschiedene Bedeutungen:

- Für syntaktische Sprachfunktionen wie [Klassenfelder](/funktionen/klassenfelder) bezieht er sich auf die Unterstützung der Transpilation.
- Für Sprachfunktionen, die neue APIs sind, wie z. B. [`Promise.allSettled`](/funktionen/promise-kombinatoren#promise.allsettled), bezieht er sich auf die Unterstützung durch Polyfills. (Babel bietet Polyfills über [das Core-js-Projekt](https://github.com/zloirock/core-js).)

Das Chrome-Logo repräsentiert V8, Chromium und alle Chromium-basierten Browser.
