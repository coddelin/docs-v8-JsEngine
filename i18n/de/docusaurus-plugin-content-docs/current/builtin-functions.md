---
title: "Eingebaute Funktionen"
description: "Dieses Dokument erklärt, was „Built-ins“ in V8 sind."
---
Eingebaute Funktionen in V8 kommen je nach Funktionalität, Leistungsanforderungen und manchmal auch aufgrund historischer Entwicklungen in verschiedenen Ausführungen hinsichtlich ihrer Implementierung vor.

Einige sind direkt in JavaScript implementiert und werden zur Laufzeit, wie jeder andere JavaScript-Code, in ausführbaren Code kompiliert. Einige von ihnen greifen für einen Teil ihrer Funktionalität auf sogenannte _Runtime-Funktionen_ zurück. Runtime-Funktionen sind in C++ geschrieben und werden über ein `%`-Präfix aus JavaScript aufgerufen. Normalerweise sind diese Runtime-Funktionen auf internen JavaScript-Code von V8 beschränkt. Zu Debugging-Zwecken können sie auch aus normalem JavaScript-Code aufgerufen werden, wenn V8 mit dem Flag `--allow-natives-syntax` ausgeführt wird. Einige Runtime-Funktionen werden direkt vom Compiler in den generierten Code eingebettet. Eine Liste finden Sie in `src/runtime/runtime.h`.

Andere Funktionen sind als _Built-ins_ implementiert, die selbst auf verschiedene Weise realisiert werden können. Einige sind direkt in plattformabhängiger Assemblersprache implementiert. Andere sind in _CodeStubAssembler_ implementiert, einer plattformunabhängigen Abstraktion. Wieder andere sind direkt in C++ implementiert. Built-ins werden manchmal auch zur Implementierung kleinerer Verknüpfungscode-Blöcke verwendet, nicht unbedingt ganzer Funktionen. Eine Liste finden Sie in `src/builtins/builtins.h`.
