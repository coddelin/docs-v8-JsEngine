---
title: "V8가 BlinkOn 6 컨퍼런스에서"
author: "V8 팀"
date: 2016-07-21 13:33:37
tags:
  - 발표
description: "BlinkOn 6에서 V8 팀의 발표 개요입니다."
---
BlinkOn은 Blink, V8 그리고 Chromium 기여자들이 반년마다 열리는 모임입니다. BlinkOn 6는 6월 16일과 6월 17일 뮌헨에서 열렸습니다. V8 팀은 아키텍처, 설계, 성능 개선 및 언어 구현과 관련된 여러 발표를 진행했습니다.

<!--truncate-->
아래는 V8 BlinkOn 발표 영상들입니다.

## 실전 JavaScript 성능

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/xCx4uC7mn6Y" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 길이: 31:41
- [슬라이드](https://docs.google.com/presentation/d/14WZkWbkvtmZDEIBYP5H1GrbC9H-W3nJSg3nvpHwfG5U/edit)

JavaScript 성능을 측정하는 V8의 역사, 벤치마크의 여러 시기를 개략적으로 설명하고, V8 컴포넌트별로 세부적인 시간 분할과 함께 실제 인기 웹사이트의 페이지 로드를 측정하는 새로운 기법을 소개합니다.

## Ignition: V8의 인터프리터

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/r5OWCtuKiAk" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 길이: 36:39
- [슬라이드](https://docs.google.com/presentation/d/1OqjVqRhtwlKeKfvMdX6HaCIu9wpZsrzqpIVIwQSuiXQ/edit)

V8의 새로운 Ignition 인터프리터를 소개하며 엔진의 전체 아키텍처를 설명하고 Ignition이 메모리 사용량 및 시작 성능에 미치는 영향을 다룹니다.

## V8의 GC에서 RAIL 측정 및 최적화 방법

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/VITAyGT-CJI" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 길이: 27:11
- [슬라이드](https://docs.google.com/presentation/d/15EQ603eZWAnrf4i6QjPP7S3KF3NaL3aAaKhNUEatVzY/edit)

V8가 Response, Animation, Idle, Loading (RAIL) 지표를 사용하여 저지연 가비지 컬렉션을 목표로 하고, 모바일에서 지연 감소를 위해 최근 최적화한 방식을 설명합니다.

## ECMAScript 2015와 그 이후

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/KrGOzEwqRDA" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 길이: 28:52
- [슬라이드](https://docs.google.com/presentation/d/1o1wld5z0BM8RTqXASGYD3Rvov8PzrxySghmrGTYTgw0/edit)

V8에서 새로운 언어 기능 구현 현황, 해당 기능이 웹 플랫폼에 통합되는 방법, 그리고 ECMAScript 언어를 계속 발전시키는 표준화 프로세스에 대해 업데이트를 제공합니다.

## V8에서 Blink로의 추적 래퍼 (번개 발표)

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PMDRfYw4UYQ?start=3204" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

- 길이: 2:31
- [슬라이드](https://docs.google.com/presentation/d/1I6leiRm0ysSTqy7QWh33Gfp7_y4ngygyM2tDAqdF0fI/edit)

V8과 Blink 객체 간의 추적 래퍼를 강조하며 메모리 누수를 방지하고 지연 시간을 줄이는 데 어떻게 도움이 되는지 설명합니다.
