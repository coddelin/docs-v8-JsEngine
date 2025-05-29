---
title: 'Was tun, wenn Ihr CL den Node.js-Integrations-Build gebrochen hat'
description: 'Dieses Dokument erklärt, was zu tun ist, wenn Ihr CL den Node.js-Integrations-Build gebrochen hat.'
---
[Node.js](https://github.com/nodejs/node) verwendet V8 stable oder beta. Für zusätzliche Integration baut das V8-Team Node mit dem [Hauptzweig](https://chromium.googlesource.com/v8/v8/+/refs/heads/main) von V8, also mit einer V8-Version von heute. Wir stellen einen Integrations-Bot für [Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64) zur Verfügung, während [Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64) und [Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64) in Arbeit sind.

Wenn der [`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel)-Bot in der V8-Kommit-Warteschlange fehlschlägt, gibt es entweder ein berechtigtes Problem mit Ihrem CL (beheben Sie es) oder [Node](https://github.com/v8/node/) muss angepasst werden. Wenn die Node-Tests fehlschlagen, suchen Sie nach „Not OK“ in den Protokolldateien. **Dieses Dokument beschreibt, wie man das Problem lokal reproduziert und wie man Änderungen an [V8s Node-Fork](https://github.com/v8/node/) vornimmt, wenn Ihr V8-CL den Build zum Scheitern bringt.**

## Source

Folgen Sie den [Anweisungen](https://chromium.googlesource.com/v8/node-ci) im node-ci-Repository, um den Quellcode auszuchecken.

## Änderungen an V8 testen

V8 ist als DEPS-Abhängigkeit von node-ci eingerichtet. Sie möchten möglicherweise Änderungen an V8 vornehmen, um Tests durchzuführen oder Fehler zu reproduzieren. Fügen Sie dazu Ihr Haupt-V8-Checkout als Remote hinzu:

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

Denken Sie daran, vor dem Kompilieren `gclient hooks` auszuführen.

```bash
gclient runhooks
JOBS=`nproc` make test
```

## Änderungen an Node.js vornehmen

Node.js ist ebenfalls als `DEPS`-Abhängigkeit von node-ci eingerichtet. Sie möchten möglicherweise Änderungen an Node.js vornehmen, um Störungen zu beheben, die durch Änderungen an V8 verursacht werden könnten. V8 testet gegen einen [Fork von Node.js](https://github.com/v8/node). Sie benötigen ein GitHub-Konto, um Änderungen an diesem Fork vorzunehmen.

### Holen Sie sich die Node-Quellen

Forken Sie das [Node.js-Repository von V8 auf GitHub](https://github.com/v8/node/) (klicken Sie auf den Fork-Button), es sei denn, Sie haben dies bereits zuvor getan.

Fügen Sie sowohl Ihren Fork als auch den Fork von V8 als Remotes zu dem bestehenden Checkout hinzu:

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> [git@github.com](mailto:git@github.com):<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **Hinweis** `<sync-date>` ist das Datum, an dem wir mit dem Upstream-Node.js synchronisiert haben. Wählen Sie das neueste Datum.

Nehmen Sie Änderungen am Node.js-Checkout vor und commiten Sie diese. Anschließend pushen Sie die Änderungen zu GitHub:

```bash
git push <your-user-name> $BRANCH_NAME
```

Und erstellen Sie einen Pull Request gegen den Branch `node-ci-<sync-date>`.


Sobald der Pull Request in den Fork von Node.js von V8 gemergt wurde, müssen Sie die `DEPS`-Datei von node-ci aktualisieren und einen CL erstellen.

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m 'Update Node'
git cl upload
```
