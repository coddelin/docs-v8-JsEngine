# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.


```
Building V8 from source
    Checking out the V8 source code
    Building with GN
    Cross-compiling and debugging for ARM/Android
    Cross-compiling for iOS
    GUI and IDE setup
    Compiling on Arm64
Contributing
    Respectful code
    V8’s public API and its stability
    Becoming a V8 committer
    Committer’s responsibility
    Blink web tests (a.k.a. layout tests)
    Evaluating code coverage
    Release process
    Design review guidelines
    Implementing and shipping JavaScript/WebAssembly language features
    Checklist for staging and shipping of WebAssembly features
    Flake bisect
    Handling of ports
    Official support
    Merging & patching
    Node.js integration build
    Reporting security bugs
    Running benchmarks locally
    Testing
    Triaging issues
Debugging
    Arm debugging with the simulator
    Cross-compiling and debugging for ARM/Android
    Debugging builtins with GDB
    Debugging over the V8 Inspector Protocol
    GDB JIT Compilation Interface integration
    Investigating memory leaks
    Stack trace API
    Using D8
    V8 Tools
Embedding V8
    Guide to embedding V8
    Version numbers
    Built-in functions
    i18n support
    Untrusted code mitigations
Under the hood
    Ignition
    TurboFan
    Torque user manual
    Writing Torque built-ins
    Writing CSA built-ins
    Adding a new WebAssembly opcode
    Maps, aka "Hidden Classes"
    Slack Tracking - what is it?
    WebAssembly compilation pipeline
Writing optimizable JavaScript
    Using V8’s sample-based profiler
    Profiling Chromium with V8
    Using Linux perf with V8
    Tracing V8
    Using Runtime Call Stats
```

# 替换带有@符号的邮箱变为邮箱链接如: lijonh@gamil.com
```js
(?<!\[)(?<!mailto:)(?<!\()\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b(?!\]\()(?!(?:[^)]*?)\))
替换为
[$1](mailto:$1)
```
# 替换带有@符号的邮箱变为邮箱链接：如:`lijonh@gamil.com`
```js
`([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`
替换为
[$1](mailto:$1)
```
# 有反引号的
```js
`\[([^\]]+)\]\((mailto:[^\)]+|[^\)]+)\)`
替换为
[$1]($2)
```
有尖括号的
```<(\[[^\]]+\]\([^)]+\))>
替换为
$1
```