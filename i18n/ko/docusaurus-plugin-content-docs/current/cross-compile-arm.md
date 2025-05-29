---
title: &apos;ARM/Android를 위한 크로스 컴파일 및 디버깅&apos;
description: &apos;이 문서는 ARM/Android를 위한 V8 크로스 컴파일 및 디버깅 방법을 설명합니다.&apos;
---
먼저, [GN으로 빌드하기](/docs/build-gn)를 확인하십시오.

그런 다음, `.gclient` 구성 파일에 `android`를 추가하십시오.

```python
target_os = [&apos;android&apos;]  # Android 관련 자료를 가져오려면 추가하십시오.
```

`target_os` 필드는 목록이므로, 유닉스에서도 빌드하려는 경우 다음과 같이 보일 것입니다:

```python
target_os = [&apos;android&apos;, &apos;unix&apos;]  # 여러 대상 운영 체제 설정.
```

`gclient sync`를 실행하면, `./third_party/android_tools` 아래에 큰 체크아웃을 얻을 수 있습니다.

휴대폰 또는 태블릿에서 개발자 모드를 활성화하고 USB 디버깅을 켜십시오. 자세한 설명은 [여기](https://developer.android.com/studio/run/device.html)를 참고하십시오. 또한 [`adb`](https://developer.android.com/studio/command-line/adb.html) 도구를 경로에 추가하십시오. 이는 체크아웃의 `./third_party/android_sdk/public/platform-tools`에 있습니다.

## `gm` 사용

[`tools/dev/gm.py` 스크립트](/docs/build-gn#gm)를 사용하여 V8 테스트를 자동으로 빌드하고 디바이스에서 실행하십시오.

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

이 명령어는 디바이스의 `/data/local/tmp/v8` 디렉토리에 바이너리 및 테스트 파일을 복사합니다.

## 수동 빌드

`v8gen.py`를 사용하여 ARM 릴리스 또는 디버그 빌드를 생성하십시오:

```bash
tools/dev/v8gen.py arm.release
```

그런 다음 `gn args out.gn/arm.release`를 실행하고 다음과 같은 키가 포함되어 있는지 확인하십시오:

```python
target_os = "android"      # 이 행은 직접 수정해야 합니다.
target_cpu = "arm"         # v8gen.py는 시뮬레이터 빌드를 기본으로 설정하기 때문입니다.
v8_target_cpu = "arm"
is_component_build = false
```

디버그 빌드의 경우 키는 동일해야 합니다. Pixel C와 같이 32비트 및 64비트 바이너리를 지원하는 arm64 디바이스를 빌드하려면 키는 다음과 같이 보일 것입니다:

```python
target_os = "android"      # 이 행은 직접 수정해야 합니다.
target_cpu = "arm64"       # v8gen.py는 시뮬레이터 빌드를 기본으로 설정하기 때문입니다.
v8_target_cpu = "arm64"
is_component_build = false
```

이제 빌드하십시오:

```bash
ninja -C out.gn/arm.release d8
```

`adb`를 사용하여 바이너리 및 스냅샷 파일을 휴대폰으로 복사하십시오:

```bash
adb shell &apos;mkdir -p /data/local/tmp/v8/bin&apos;
adb push out.gn/arm.release/d8 /data/local/tmp/v8/bin
adb push out.gn/arm.release/icudtl.dat /data/local/tmp/v8/bin
adb push out.gn/arm.release/snapshot_blob.bin /data/local/tmp/v8/bin
```

```bash
rebuffat:~/src/v8$ adb shell
bullhead:/ $ cd /data/local/tmp/v8/bin
bullhead:/data/local/tmp/v8/bin $ ls
v8 icudtl.dat snapshot_blob.bin
bullhead:/data/local/tmp/v8/bin $ ./d8
V8 version 5.8.0 (candidate)
d8> &apos;w00t!&apos;
"w00t!"
d8>
```

## 디버깅

### d8

Android 디바이스에서 `d8`을 원격 디버깅하는 것은 비교적 간단합니다. 먼저 Android 디바이스에서 `gdbserver`를 시작하십시오:

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

그런 다음, 호스트 디바이스에서 서버에 연결하십시오.

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb`와 `gdbserver`는 서로 호환되어야 하며, 확신이 없다면 [Android NDK](https://developer.android.com/ndk)에서 바이너리를 사용하는 것이 좋습니다. 기본적으로 `d8` 바이너리는 디버깅 정보가 제거된 상태(스트립)로 제공되지만, `$OUT_DIR/exe.unstripped/d8`에 비스트립 바이너리가 포함되어 있습니다.

### 로깅

기본적으로 일부 `d8` 디버깅 출력은 Android 시스템 로그로 기록되며, [`logcat`](https://developer.android.com/studio/command-line/logcat)을 사용하여 덤프할 수 있습니다. 그러나 특정 디버깅 출력이 시스템 로그와 `adb` 사이에서 나뉘거나, 일부가 완전히 누락될 수 있습니다. 이러한 문제를 방지하려면 `gn args`에 다음 설정을 추가하는 것이 좋습니다:

```python
v8_android_log_stdout = true
```

### 부동 소수점 문제

V8 Arm GC Stress 봇이 사용하는 `gn args` 설정 `arm_float_abi = "hard"`는 다른 하드웨어(예: Nexus 7)에서 완전히 잘못된 프로그램 동작을 초래할 수 있습니다.

## Sourcery G++ Lite 사용

Sourcery G++ Lite 크로스 컴파일러 스위트는 [CodeSourcery](http://www.codesourcery.com/)의 Sourcery G++ 무료 버전입니다. [ARM 프로세서를 위한 GNU Toolchain](http://www.codesourcery.com/sgpp/lite/arm)에 대한 페이지가 있습니다. 호스트/타겟 조합에 맞는 버전을 확인하십시오.

다음 지침은 [ARM GNU/Linux용 2009q1-203](http://www.codesourcery.com/sgpp/lite/arm/portal/release858)을 사용하며, 다른 버전을 사용하는 경우 아래 URL 및 `TOOL_PREFIX`를 적절히 변경하십시오.

### 호스트 및 대상에 설치

가장 간단한 설정 방법은 호스트와 대상에 전체 Sourcery G++ Lite 패키지를 동일한 위치에 설치하는 것입니다. 이렇게 하면 두 측면에서 필요한 모든 라이브러리를 사용할 수 있습니다. 호스트의 기본 라이브러리를 사용하려는 경우 대상에 아무것도 설치할 필요가 없습니다.

다음 스크립트는 `/opt/codesourcery`에 설치됩니다:

```bash
#!/bin/sh

sudo mkdir /opt/codesourcery
cd /opt/codesourcery
sudo chown "$USERNAME" .
chmod g+ws .
umask 2
wget http://www.codesourcery.com/sgpp/lite/arm/portal/package4571/public/arm-none-linux-gnueabi/arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
tar -xvf arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
```

## 프로파일

- 바이너리를 컴파일하고 장치로 푸시하며 호스트에 복사본을 유지:

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- 프로파일 로그를 가져와 호스트로 복사:

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- 좋아하는 편집기로 `v8.log` 파일을 열고 첫 번째 줄을 호스트 워크스테이션에서의 `d8-version.under.test` 바이너리의 전체 경로에 맞도록 편집 (장치의 `/data/local/tmp/v8/bin/` 경로 대신)

- 호스트의 `d8` 및 적절한 `nm` 바이너리로 틱 프로세서를 실행:

    ```bash
    cp out/x64.release/d8 .  # 한 번만 필요
    cp out/x64.release/natives_blob.bin .  # 한 번만 필요
    cp out/x64.release/snapshot_blob.bin .  # 한 번만 필요
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
