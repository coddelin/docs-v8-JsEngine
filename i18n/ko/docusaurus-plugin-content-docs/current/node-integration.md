---
title: 'CL이 Node.js 통합 빌드를 중단했을 경우 해야 할 일'
description: '이 문서는 CL이 Node.js 통합 빌드를 중단했을 경우 해야 할 일을 설명합니다.'
---
[Node.js](https://github.com/nodejs/node)는 V8 안정 버전 또는 베타 버전을 사용합니다. 추가 통합을 위해 V8 팀은 V8의 [메인 브랜치](https://chromium.googlesource.com/v8/v8/+/refs/heads/main)를 사용하여 Node를 빌드하며, 이는 오늘 기준의 V8 버전입니다. 우리는 [Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64)에 대한 통합 봇을 제공하며, [Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64)와 [Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64)은 작업 중에 있습니다.

V8 커밋 큐에서 [`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel) 봇이 실패하면, 귀하의 CL에 정당한 문제가 있는 것일 수 있습니다(이를 수정해야 함) 또는 [Node](https://github.com/v8/node/)를 수정해야 할 수도 있습니다. Node 테스트가 실패한 경우, 로그 파일에서 “Not OK”를 검색하세요. **이 문서는 로컬에서 문제를 재현하는 방법과 귀하의 V8 CL로 인해 빌드 실패가 발생했을 경우 [V8의 Node 포크](https://github.com/v8/node/)에 변경 사항을 적용하는 방법을 설명합니다.**

## 소스 코드

노드-ci 저장소에서 소스를 체크 아웃하는 [지침](https://chromium.googlesource.com/v8/node-ci)을 따르세요.

## V8 변경 사항 테스트하기

V8은 node-ci의 DEPS 종속성으로 설정되어 있습니다. 테스트나 실패를 재현하기 위해 V8에 변경 사항을 적용하고 싶을 수 있습니다. 그렇게 하려면, 주요 V8 체크아웃을 원격으로 추가하세요:

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

컴파일하기 전에 gclient hooks를 실행하는 것을 잊지 마세요.

```bash
gclient runhooks
JOBS=`nproc` make test
```

## Node.js 변경 사항 적용하기

Node.js도 node-ci의 `DEPS` 종속성으로 설정되어 있습니다. V8 변경 사항으로 인해 발생할 수 있는 중단을 수정하기 위해 Node.js에 변경 사항을 적용하고 싶을 수 있습니다. V8은 [Node.js 포크](https://github.com/v8/node)를 사용해 테스트를 수행합니다. 이 포크에 변경 사항을 적용하려면 GitHub 계정이 필요합니다.

### Node 소스 가져오기

[V8의 Node.js GitHub 저장소](https://github.com/v8/node/)를 포크하세요 (포크 버튼을 클릭). 이전에 이미 포크했다면 이를 건너뛰세요.

기존 체크아웃에 귀하의 포크와 V8의 포크를 원격으로 추가하세요:

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> git@github.com:<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **참고** `<sync-date>`는 업스트림 Node.js와 동기화한 날짜입니다. 최신 날짜를 선택하세요.

Node.js 체크아웃에 변경 사항을 적용하고 커밋합니다. 그런 다음 변경 사항을 GitHub에 푸시합니다:

```bash
git push <your-user-name> $BRANCH_NAME
```

`node-ci-<sync-date>` 브랜치를 대상으로 풀 리퀘스트를 생성합니다.


V8의 Node.js 포크에 대한 풀 리퀘스트가 병합되면, node-ci의 `DEPS` 파일을 업데이트하고 CL을 생성해야 합니다.

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m 'Update Node'
git cl upload
```
