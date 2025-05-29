---
title: 'Documentation'
description: 'Documentation for the V8 project.'
slug: /
---
V8 is Google’s open source high-performance JavaScript and WebAssembly engine, written in C++. It is used in Chrome and in Node.js, among others.

This documentation is aimed at C++ developers who want to use V8 in their applications, as well as anyone interested in V8’s design and performance. This document introduces you to V8, while the remaining documentation shows you how to use V8 in your code and describes some of its design details, as well as providing a set of JavaScript benchmarks for measuring V8’s performance.

## About V8

V8 implements <a href="https://tc39.es/ecma262/">ECMAScript</a> and <a href="https://webassembly.github.io/spec/core/">WebAssembly</a>, and runs on Windows, macOS, and Linux systems that use x64, IA-32, or ARM processors. Additional systems (IBM i, AIX) and processors (MIPS, ppcle64, s390x) are externally maintained, see [ports](/ports). V8 can be embedded into any C++ application.

V8 compiles and executes JavaScript source code, handles memory allocation for objects, and garbage collects objects it no longer needs. V8’s stop-the-world, generational, accurate garbage collector is one of the keys to V8’s performance.

JavaScript is commonly used for client-side scripting in a browser, being used to manipulate Document Object Model (DOM) objects for example. The DOM is not, however, typically provided by the JavaScript engine but instead by a browser. The same is true of V8 — Google Chrome provides the DOM. V8 does however provide all the data types, operators, objects and functions specified in the ECMA standard.

V8 enables any C++ application to expose its own objects and functions to JavaScript code. It’s up to you to decide on the objects and functions you would like to expose to JavaScript.

## Documentation overview

- [Building V8 from source](/build)
    - [Checking out the V8 source code](/source-code)
    - [Building with GN](/build-gn)
    - [Cross-compiling and debugging for ARM/Android](/cross-compile-arm)
    - [Cross-compiling for iOS](/cross-compile-ios)
    - [GUI and IDE setup](/ide-setup)
    - [Compiling on Arm64](/compile-arm64)
- [Contributing](/contribute)
    - [Respectful code](/respectful-code)
    - [V8’s public API and its stability](/api)
    - [Becoming a V8 committer](/become-committer)
    - [Committer’s responsibility](/committer-responsibility)
    - [Blink web tests (a.k.a. layout tests)](/blink-layout-tests)
    - [Evaluating code coverage](/evaluate-code-coverage)
    - [Release process](/release-process)
    - [Design review guidelines](/design-review-guidelines)
    - [Implementing and shipping JavaScript/WebAssembly language features](/feature-launch-process)
    - [Checklist for staging and shipping of WebAssembly features](/wasm-shipping-checklist)
    - [Flake bisect](/flake-bisect)
    - [Handling of ports](/ports)
    - [Official support](/official-support)
    - [Merging & patching](/merge-patch)
    - [Node.js integration build](/node-integration)
    - [Reporting security bugs](/security-bugs)
    - [Running benchmarks locally](/benchmarks)
    - [Testing](/test)
    - [Triaging issues](/triage-issues)
- Debugging
    - [Arm debugging with the simulator](/debug-arm)
    - [Cross-compiling and debugging for ARM/Android](/cross-compile-arm)
    - [Debugging builtins with GDB](/gdb)
    - [Debugging over the V8 Inspector Protocol](/inspector)
    - [GDB JIT Compilation Interface integration](/gdb-jit)
    - [Investigating memory leaks](/memory-leaks)
    - [Stack trace API](/stack-trace-api)
    - [Using D8](/d8)
    - [V8 Tools](https://v8.dev/tools)
- Embedding V8
    - [Guide to embedding V8](/embed)
    - [Version numbers](/version-numbers)
    - [Built-in functions](/builtin-functions)
    - [i18n support](/i18n)
    - [Untrusted code mitigations](/untrusted-code-mitigations)
- Under the hood
    - [Ignition](/ignition)
    - [TurboFan](/turbofan)
    - [Torque user manual](/torque)
    - [Writing Torque built-ins](/torque-builtins)
    - [Writing CSA built-ins](/csa-builtins)
    - [Adding a new WebAssembly opcode](/webassembly-opcode)
    - [Maps, aka "Hidden Classes"](/hidden-classes)
    - [Slack Tracking - what is it?](/blog/slack-tracking)
    - [WebAssembly compilation pipeline](/wasm-compilation-pipeline)
- Writing optimizable JavaScript
    - [Using V8’s sample-based profiler](/profile)
    - [Profiling Chromium with V8](/profile-chromium)
    - [Using Linux `perf` with V8](/linux-perf)
    - [Tracing V8](/trace)
    - [Using Runtime Call Stats](/rcs)
