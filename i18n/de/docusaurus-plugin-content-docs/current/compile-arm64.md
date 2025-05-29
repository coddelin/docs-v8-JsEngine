---
title: 'Kompilierung auf Arm64 Linux'
description: 'Tipps und Tricks, um V8 nativ auf Arm64 Linux zu erstellen'
---
Wenn Sie die Anleitungen zum [Herunterladen](/docs/source-code) und [Kompilieren](/docs/build-gn) von V8 auf einer Maschine durchgegangen sind, die weder x86 noch ein Apple Silicon Mac ist, sind Sie möglicherweise auf einige Probleme gestoßen, da das Build-System native Binärdateien herunterlädt, die dann nicht ausgeführt werden können. Obwohl die Verwendung einer Arm64 Linux-Maschine zur Arbeit an V8 __nicht offiziell unterstützt__ wird, ist das Überwinden dieser Hürden recht einfach.

## Umgehung von `vpython`

`fetch v8`, `gclient sync` und andere `depot_tools`-Befehle verwenden eine Python-Wrapper namens "vpython". Wenn Sie Fehler damit sehen, können Sie die folgende Variable definieren, um stattdessen die Python-Installation des Systems zu verwenden:

```bash
export VPYTHON_BYPASS="manuell verwaltetes Python wird von Chrome-Vorgängen nicht unterstützt"
```

## Kompatible `ninja`-Binärdatei

Das erste, was zu tun ist, ist sicherzustellen, dass wir eine native Binärdatei für `ninja` verwenden, die wir anstelle der in `depot_tools` enthaltenen auswählen. Eine einfache Möglichkeit, dies zu tun, besteht darin, Ihren PATH wie folgt anzupassen, wenn Sie `depot_tools` installieren:

```bash
export PATH=$PATH:/path/to/depot_tools
```

Auf diese Weise können Sie die `ninja`-Installation Ihres Systems verwenden, falls diese verfügbar ist. Falls dies nicht der Fall ist, können Sie [es aus dem Quellcode erstellen](https://github.com/ninja-build/ninja#building-ninja-itself).

## Kompilieren von clang

Standardmäßig möchte V8 seine eigene clang-Build-Version verwenden, die möglicherweise nicht auf Ihrer Maschine läuft. Sie könnten GN-Argumente anpassen, um [den clang oder GCC des Systems zu verwenden](#system_clang_gcc), jedoch möchten Sie wahrscheinlich den gleichen clang wie im Upstream verwenden, da dies die am besten unterstützte Version ist.

Sie können es lokal direkt aus der V8-Abfrage erstellen:

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## Manuelles Einrichten von GN-Argumenten

Bequemlichkeitsskripte funktionieren möglicherweise nicht standardmäßig; stattdessen müssen Sie GN-Argumente manuell gemäß dem [Handbuch](/docs/build-gn#gn)-Workflow einstellen. Sie können die üblichen "release", "optdebug" und "debug"-Konfigurationen mit den folgenden Argumenten erhalten:

- `release`

```bash
is_debug=false
```

- `optdebug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
```

- `debug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
v8_optimized_debug=false
```

## Verwendung des clang oder GCC des Systems

Das Erstellen mit GCC ist lediglich eine Frage des Deaktivierens der Kompilierung mit clang:

```bash
is_clang=false
```

Beachten Sie, dass V8 standardmäßig mit `lld` verknüpft, was eine neuere Version von GCC erfordert. Sie können `use_lld=false` verwenden, um zum gold-Linker zu wechseln, oder zusätzlich `use_gold=false`, um `ld` zu verwenden.

Falls Sie den clang verwenden möchten, der mit Ihrem System installiert ist, z. B. in `/usr`, können Sie die folgenden Argumente verwenden:

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

Da die clang-Version des Systems möglicherweise nicht gut unterstützt wird, müssen Sie sich wahrscheinlich mit Warnungen wie unbekannten Compiler-Flags auseinandersetzen. In diesem Fall ist es hilfreich, Warnungen nicht als Fehler zu behandeln mit:

```bash
treat_warnings_as_errors=false
```
