---
title: &apos;高性能のES2015以降&apos;
author: &apos;Benedikt Meurer [@bmeurer](https://twitter.com/bmeurer), ECMAScriptパフォーマンスエンジニア&apos;
avatars:
  - &apos;benedikt-meurer&apos;
date: 2017-02-17 13:33:37
tags:
  - ECMAScript
description: &apos;V8におけるES2015+言語機能のパフォーマンスは、今やトランスパイルされたES5の対応機能に匹敵します。&apos;
---
過去数ヶ月間にわたり、V8チームは新たに追加された[ES2015](https://www.ecma-international.org/ecma-262/6.0/)およびさらに最近のJavaScript機能のパフォーマンスを、トランスパイルされた[ES5](https://www.ecma-international.org/ecma-262/5.1/)の対応機能と同等にすることに注力しました。

<!--truncate-->
## 動機

さまざまな改善の詳細に入る前に、ES2015+機能のパフォーマンスが重要である理由を、現代のウェブ開発において広く使用されている[Babel](http://babeljs.io/)にも関わらず考えるべきです:

1. まず、`Object.assign`のように必要に応じてのみポリフィルされる新しいES2015機能があります。Babelが多くの[React](https://facebook.github.io/react)や[Redux](http://redux.js.org/)アプリケーションで頻繁に使用される[オブジェクトスプレッドプロパティ](https://github.com/sebmarkbage/ecmascript-rest-spread)をトランスパイルするとき、VMがサポートしていればES5相当ではなく`Object.assign`を使用します。
2. ES2015機能のポリフィリングは通常コードサイズを増加させます。これが現在の[ウェブパフォーマンス危機](https://channel9.msdn.com/Blogs/msedgedev/nolanlaw-web-perf-crisis)にかなり寄与しており、特に新興市場で一般的なモバイルデバイスでは顕著です。そのため、配信、解析、コンパイルにただかかるコストは、実際の実行コストに到達する前にかなり高くなる可能性があります。
3. 最後に、クライアントサイドJavaScriptは、V8エンジンに依存する環境のうちの1つに過ぎません。この他にもサーバーサイドアプリケーションやツールに使用される[Node.js](https://nodejs.org/)があり、開発者はES5コードにトランスパイルする必要はない一方で、ターゲットNode.jsリリースにおいて[関連するV8バージョン](https://nodejs.org/en/download/releases/)がサポートする機能を直接使用できます。

[Reduxのドキュメント](http://redux.js.org/docs/recipes/UsingObjectSpreadOperator.html)のコードスニペットを以下に検討してみましょう:

```js
function todoApp(state = initialState, action) {
  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return { ...state, visibilityFilter: action.filter };
    default:
      return state;
  }
}
```

このコードには、トランスパイルを必要とする2つの事項があります：stateのデフォルトパラメータと、状態のオブジェクトリテラルへのスプレッドです。Babelは以下のES5コードを生成します:

```js
&apos;use strict&apos;;

var _extends = Object.assign || function(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};

function todoApp() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
  var action = arguments[1];

  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return _extends({}, state, { visibilityFilter: action.filter });
    default:
      return state;
  }
}
```

さて、`Object.assign`がBabelによって生成されたポリフィル`_extends`よりも何倍も遅い場合を想像してみてください。その場合、`Object.assign`をサポートしていないブラウザからES2015対応バージョンのブラウザへのアップグレードは重大なパフォーマンスの後退であり、ES2015の普及を妨げる可能性があります。

この例は、トランスパイルのもう1つの重大な欠点をも浮き彫りにしています：ユーザーに配信される生成コードは、開発者が最初に書いたES2015+コードよりも通常かなり大きくなります。上記の例で元のコードは203文字（176バイトgzipped）ですが、生成コードは588文字（367バイトgzipped）です。既にコードサイズが2倍になっています。次に、[非同期イテレータ](https://github.com/tc39/proposal-async-iteration)提案の例を見てみましょう:

```js
async function* readLines(path) {
  let file = await fileOpen(path);
  try {
    while (!file.EOF) {
      yield await file.readLine();
    }
  } finally {
    await file.close();
  }
}
```

Babelはこれらの187文字（gzippedで150バイト）を、ES5コードに変換する際になんと2987文字（gzippedで971バイト）に増加させます。なお、[regenerator runtime](https://babeljs.io/docs/plugins/transform-regenerator/)という追加依存が必要である点はカウントしていません。

```js
&apos;use strict&apos;;

var _asyncGenerator = function() {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };
        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function(arg) {
            resume(&apos;next&apos;, arg);
          }, function(arg) {
            resume(&apos;throw&apos;, arg);
          });
        } else {
          settle(result.done ? &apos;return&apos; : &apos;normal&apos;, result.value);
        }
      } catch (err) {
        settle(&apos;throw&apos;, err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case &apos;return&apos;:
          front.resolve({
            value: value,
            done: true
          });
          break;
        case &apos;throw&apos;:
          front.reject(value);
          break;
        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== &apos;function&apos;) {
      this.return = undefined;
    }
  }
  if (typeof Symbol === &apos;function&apos; && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
      return this;
    };
  }
  AsyncGenerator.prototype.next = function(arg) {
    return this._invoke(&apos;next&apos;, arg);
  };
  AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke(&apos;throw&apos;, arg);
  };
  AsyncGenerator.prototype.return = function(arg) {
    return this._invoke(&apos;return&apos;, arg);
  };
  return {
    wrap: function wrap(fn) {
      return function() {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function await (value) {
      return new AwaitValue(value);
    }
  };
}();

var readLines = function () {
  var _ref = _asyncGenerator.wrap(regeneratorRuntime.mark(function _callee(path) {
    var file;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _asyncGenerator.await(fileOpen(path));

          case 2:
            file = _context.sent;
            _context.prev = 3;

          case 4:
            if (file.EOF) {
              _context.next = 11;
              break;
            }

            _context.next = 7;
            return _asyncGenerator.await(file.readLine());

          case 7:
            _context.next = 9;
            return _context.sent;

          case 9:
            _context.next = 4;
            break;

          case 11:
            _context.prev = 11;
            _context.next = 14;
            return _asyncGenerator.await(file.close());

          case 14:
            return _context.finish(11);

          case 15:
          case &apos;end&apos;:
            return _context.stop();
        }
      }
    }, _callee, this, [[3,, 11, 15]]);
  }));

  return function readLines(_x) {
    return _ref.apply(this, arguments);
  };
}();
```

これはサイズが**650%**増加します（汎用の`_asyncGenerator`関数はコードのバンドル方法によっては共有可能であり、非同期イテレータを複数回使用することでそのコストを分散できます）。長期的には、ES5にトランスパイルされたコードのみを配信するのは現実的ではないと考えています。サイズの増加はダウンロード時間やコストだけでなく、パースとコンパイルに追加のオーバーヘッドを加えることになります。本当にモバイルデバイスを含むモダンなWebアプリケーションのページ読み込み速度と反応性を大幅に改善したいのなら、開発者にES2015以上でコードを書くよう促すだけでなく、それをES5にトランスパイルせず配信することを推奨するべきです。ES2015をサポートしていないレガシーブラウザに対してだけ完全にトランスパイルされたバンドルを配信するべきです。この考えを実現するためには、VMの実装者はES2015以上の機能をネイティブでサポートし、合理的なパフォーマンスを提供する必要があります。

## 測定方法論

上記のとおり、ES2015+機能の絶対的なパフォーマンスは、現時点ではそれほど問題ではありません。代わりに、現在の最優先事項は、ES2015+機能のパフォーマンスが、単純なES5や、さらに重要なのはBabelが生成したバージョンと同等であることを保証することです。都合よく、Kevin Decker（http://www.incaseofstairs.com/）による[SixSpeed](https://github.com/kpdecker/six-speed)というプロジェクトが既に存在しており、それがほぼ正確に必要なことを達成しています：ES2015機能と単純なES5、そしてトランスパイラーによって生成されたコードの性能比較です。

![SixSpeedベンチマーク](/_img/high-performance-es2015/sixspeed.png)

そこで、私たちはそれを最初のES2015+のパフォーマンス作業の基礎として採用することにしました。[SixSpeedをフォーク](https://fhinkel.github.io/six-speed/)し、いくつかのベンチマークを追加しました。最も深刻な遅延を最初に解決することに焦点を当て、すなわち単純なES5から推奨されるES2015+バージョンへの遅延が2倍以上である項目を優先しました。私たちの基本的な仮定は、単純なES5バージョンが少なくともBabelが生成するある程度仕様準拠したバージョンと同じくらい速いということです。

## モダンな言語にふさわしいモダンなアーキテクチャ

過去、V8はES2015+に見られるような言語機能を最適化することに困難を抱えていました。例えば、例外処理（try/catch/finally）のサポートをV8の従来の最適化コンパイラであるCrankshaftに追加するのは実現不可能でした。これにより、基本的に暗黙のfinally節を含むES6機能であるfor...ofの最適化能力が制限されていました。Crankshaftの限界と、V8のベースラインコンパイラであるfull-codegenへの新しい言語機能の追加の全体的な複雑さにより、新しいES機能が標準化されると同時にV8に追加して最適化するのが本質的に困難でした。

幸いなことに、IgnitionとTurboFan（[V8の新しいインタープリターとコンパイラパイプライン](/blog/test-the-future)）は最初からJavaScript言語全体をサポートするように設計されており、高度な制御フロー、例外処理、そして最近ではES2015の`for`-`of`や分割代入を含んでいます。IgnitionとTurboFanのアーキテクチャの緊密な統合により、新しい機能を迅速に追加し、急速かつ段階的にそれらを最適化することが可能になります。

モダンな言語機能の改善の多くは、新しいIgnition/TurboFanパイプラインなしでは実現不可能でした。IgnitionとTurboFanは、ジェネレーターや非同期関数の最適化に特に重要な役割を果たしました。ジェネレーターは長い間V8でサポートされていましたが、Crankshaftの制御フローの制限により最適化できませんでした。非同期関数は本質的にジェネレーター上の糖衣構文であるため、同じカテゴリに属します。この新しいコンパイラパイプラインは、Ignitionを活用してASTを解釈し、バイトコードを生成し、複雑なジェネレーター制御フローを単純なローカル制御フローバイトコードに変換します。TurboFanは、ジェネレーター制御フローについて何か特定のことを知る必要はなく、ただ関数の状態を保存および復元する方法を知るだけで、生成されたバイトコードをより簡単に最適化できます。

![IgnitionとTurboFanでJavaScriptジェネレーターがどのように表現されているか](/_img/high-performance-es2015/generators.svg)

## 合同の現状

私たちの短期的な目標は、平均で2倍以下の遅延にできるだけ早く到達することでした。まず最悪のテストを調査し、Chrome 54からChrome 58（Canary）までの間に、遅延が2倍以上のテストの数を16から8に減らし、同時に最悪の遅延をChrome 54の19倍からChrome 58（Canary）のわずか6倍に減少させることに成功しました。また、この期間中に平均および中央値の遅延も大幅に減少しました。

![ネイティブES5と比較したES2015+の遅延](/_img/high-performance-es2015/slowdown.svg)

ES2015+とES5の同等性に向けた明確な傾向が見られます。平均して、ES5に対して47%以上性能を向上させました。Chrome 54以降に取り組んだハイライトの一部を以下に示します。

![単純なES5と比較したES2015+の性能](/_img/high-performance-es2015/comparison.svg)

特に、spread演算子や分割代入、`for`-`of`ループなどのイテレーションに基づいた新しい言語構造の性能を向上させました。例えば、配列の分割代入を使用した場合:

```js
function fn() {
  var [c] = data;
  return c;
}
```

…は今や単純なES5バージョンと同じくらい高速です:

```js
function fn() {
  var c = data[0];
  return c;
}
```

…そしてBabelによって生成されたコードよりもはるかに高速（かつ短い）です:

```js
&apos;use strict&apos;;

var _slicedToArray = function() {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i[&apos;return&apos;]) _i[&apos;return&apos;]();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function(arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError(&apos;Invalid attempt to destructure non-iterable instance&apos;);
    }
  };
}();

function fn() {
  var _data = data,
      _data2 = _slicedToArray(_data, 1),
      c = _data2[0];

  return c;
}
```

詳細については、最後の[Munich NodeJS User Group](http://www.mnug.de/)のミートアップで行われた[高速ES2015](https://docs.google.com/presentation/d/1wiiZeRQp8-sXDB9xXBUAGbaQaWJC84M5RNxRyQuTmhk)の講演をご覧ください。

私たちはES2015+の機能のパフォーマンスを向上させるために、引き続き取り組むことを約束しています。細かい詳細に興味がある場合は、V8の[ES2015とその後のパフォーマンス計画](https://docs.google.com/document/d/1EA9EbfnydAmmU_lM8R_uEMQ-U_v4l9zulePSBkeYWmY)をご閲覧ください。
