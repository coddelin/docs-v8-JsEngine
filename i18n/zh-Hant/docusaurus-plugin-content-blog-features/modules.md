---
title: "JavaScript 模組"
author: "Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)) 和 Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
- "addy-osmani"
- "mathias-bynens"
date: 2018-06-18
tags: 
  - ECMAScript
  - ES2015
description: "本文說明如何使用 JavaScript 模組、如何負責任地部署它們，以及 Chrome 團隊如何努力在未來改進模組。"
tweet: "1008725884575109120"
---
JavaScript 模組現在已經被[所有主流瀏覽器支援](https://caniuse.com/#feat=es6-module)!

<feature-support chrome="61"
                 firefox="60"
                 safari="11"
                 nodejs="13.2.0 https://nodejs.org/en/blog/release/v13.2.0/#notable-changes"
                 babel="yes"></feature-support>

本文說明如何使用 JS 模組、如何負責任地部署它們，以及 Chrome 團隊如何努力在未來改進模組。

## 什麼是 JS 模組？

JS 模組（也稱為“ES 模組”或“ECMAScript 模組”）是一個重要的新功能，或者說是一組新的功能。過去您可能使用過用戶層的 JavaScript 模組系統，也許使用過像 Node.js 中的 [CommonJS](https://nodejs.org/docs/latest-v10.x/api/modules.html)，或者 [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md)，或者其他系統。所有這些模組系統的共同點是：它們允許您導入和導出內容。

<!--truncate-->
JavaScript 現在為此提供了標準化的語法。在模組內，您可以使用 `export` 關鍵字來導出幾乎任何內容。您可以導出 `const`、`function` 或任何其他變量綁定或聲明。只需在變量聲明或聲明前加上 `export` 即可：

```js
// 📁 lib.mjs
export const repeat = (string) => `${string} ${string}`;
export function shout(string) {
  return `${string.toUpperCase()}!`;
}
```

然後您可以使用 `import` 關鍵字從另一個模組導入該模組的內容。在此，我們從 `lib` 模組導入了 `repeat` 和 `shout` 功能，並在我們的 `main` 模組中使用它們：

```js
// 📁 main.mjs
import {repeat, shout} from './lib.mjs';
repeat('hello');
// → 'hello hello'
shout('Modules in action');
// → 'MODULES IN ACTION!'
```

您還可以從模組導出一個 _預設_ 值：

```js
// 📁 lib.mjs
export default function(string) {
  return `${string.toUpperCase()}!`;
}
```

這種 `default` 導出可以用任何名稱導入：

```js
// 📁 main.mjs
import shout from './lib.mjs';
//     ^^^^^
```

模組與經典腳本稍有不同：

- 模組預設啟用了[嚴格模式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)。

- 模組不支援 HTML 樣式的註解語法，儘管經典腳本可以使用該語法。

    ```js
    // 不要在 JavaScript 中使用 HTML 樣式的註解語法！
    const x = 42; <!-- TODO: 將 x 重命名為 y。
    // 請改用常規的單行註解：
    const x = 42; // TODO: 將 x 重命名為 y。
    ```

- 模組具有詞法頂層範疇。這意味著，例如，在模組內執行 `var foo = 42;` 不會創建名為 `foo` 的全域性變量，在瀏覽器中無法通過 `window.foo` 訪問，但經典腳本可以。

- 同樣，模組中的 `this` 不引用全域性 `this`，而是 `undefined`。（如果您需要訪問全域性 `this`，請使用 [`globalThis`](/features/globalthis)。）

- 新的靜態 `import` 和 `export` 語法僅在模組內可用，經典腳本中無法使用。

- [頂層 `await`](/features/top-level-await) 僅在模組中可用，而在經典腳本中無法使用。相關地，在模組中的任何地方，`await` 不能作為變量名稱，然而在經典腳本中的非異步函數之外，變量可以命名為 `await`。

由於這些差異，*相同的 JavaScript 代碼在作為模組與作為經典腳本處理時可能表現出不同的行為*。因此，JavaScript 執行環境需要知道哪些腳本是模組。

## 在瀏覽器中使用 JS 模組

在 Web 上，您可以通過將 `<script>` 元素的 `type` 屬性設置為 `module`，告訴瀏覽器將其作為模組來處理。

```html
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

理解 `type="module"` 的瀏覽器會忽略帶有 `nomodule` 屬性的腳本。這意味著你可以向支持模組的瀏覽器提供基於模組的資源，同時為其他瀏覽器提供回退方案。能夠做出這種區分是非常棒的，即使僅僅是為了性能！想想看：只有現代瀏覽器才支持模組。如果瀏覽器能理解你的模組代碼，那麼它也支持 [模組之前出現的功能](https://codepen.io/samthor/pen/MmvdOM)，如箭頭函數或 `async`-`await`。你不需要再對模組包中的這些功能進行編譯！你可以 [向現代瀏覽器提供更小且基本未編譯過的基於模組的資源](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)。只有遺留的瀏覽器才會獲得 `nomodule` 的資源。

由於[模組默認是延遲的](#defer)，你可能也希望以延遲的方式載入 `nomodule` 腳本：

```html
<script type="module" src="main.mjs"></script>
<script nomodule defer src="fallback.js"></script>
```

### 瀏覽器中特定於模組和經典腳本的差異

正如你現在知道的，模組和經典腳本是不同的。在上述平台無關的差異之外，還存在一些瀏覽器特定的差異。

例如，模組只會被評估一次，而經典腳本則會被每次添加到 DOM 中時都重新評估。

```html
<script src="classic.js"></script>
<script src="classic.js"></script>
<!-- classic.js 會多次執行。 -->

<script type="module" src="module.mjs"></script>
<script type="module" src="module.mjs"></script>
<script type="module">import './module.mjs';</script>
<!-- module.mjs 只會執行一次。 -->
```

此外，模組腳本及其依賴項會通過 CORS 方式获取。這意味著任何跨域的模組腳本都必須使用正確的標頭提供，如 `Access-Control-Allow-Origin: *`。經典腳本則沒有這個要求。

另一個差異與 `async` 屬性有關，該屬性使腳本在下載時不阻止 HTML 解析（類似于 `defer`），但它也會儘快執行腳本，沒有保證的順序，並且不等待 HTML 解析完成。`async` 屬性不適用於內聯經典腳本，但適用於內聯 `<script type="module">`。

### 有關文件擴展名的說明

你可能已經注意到，我們將模組使用 `.mjs` 作為文件擴展名。在 Web 上，文件擴展名並不重要，只要文件是以 [JavaScript MIME 類型 `text/javascript`](https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages:javascript-mime-type) 提供的即可。瀏覽器根據腳本元素上的 `type` 屬性知道它是一個模組。

儘管如此，我們仍然建議為模組使用 `.mjs` 擴展名，原因如下：

1. 在開發過程中，`.mjs` 擴展名可以使你和其他查看你的項目的人非常清楚地知道該文件是模組，而不是經典腳本。（僅僅看代碼並不總是能夠分辨。）如前所述，模組和經典腳本的處理方式不同，因此這種區分非常重要！
1. 它確保你的文件在運行環境（如 [Node.js](https://nodejs.org/api/esm.html#enabling)）及構建工具（如 [Babel](https://babeljs.io/docs/en/options#sourcetype)）中作為模組解析。儘管這些環境和工具都有專有的配置方式來將其他擴展名的文件解釋為模組，但 `.mjs` 擴展名是一種跨環境兼容的方式，確保文件被作為模組處理。

:::note
**注意：** 為了在 Web 上部署 `.mjs` 文件，你的 Web 服務器需要配置為使用正確的 `Content-Type: text/javascript` 標頭提供此擴展名的文件，如上所述。此外，你可能需要配置你的編輯器，以將 `.mjs` 文件作為 `.js` 文件進行語法高亮顯示。大多數現代編輯器默認已支持此功能。
:::

### 模組規範符

當 `import` 模組時，指定模組位置的字符串被稱為“模組規範符”或“導入規範符”。在我們之前的示例中，模組規範符是 `'./lib.mjs'`：

```js
import {shout} from './lib.mjs';
//                  ^^^^^^^^^^^
```

對瀏覽器中的模組規範符有一些限制。目前不支持所謂的“裸”模組規範符。這項限制是[指定的](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier)，以便未來瀏覽器可以允許自定義模組加載器為裸模組規範符賦予特殊意義，如下示例：

```js
// 尚不支持：
import {shout} from 'jquery';
import {shout} from 'lib.mjs';
import {shout} from 'modules/lib.mjs';
```

另一方面，以下示例均受支持：

```js
// 支持：
import {shout} from './lib.mjs';
import {shout} from '../lib.mjs';
import {shout} from '/modules/lib.mjs';
import {shout} from 'https://simple.example/modules/lib.mjs';
```

目前，模組規範符必須是完整的 URL，或以 `/`、`./` 或 `../` 開頭的相對 URL。

### 模組默認是延遲的

經典 `<script>` 預設會阻止 HTML 解析。你可以通過添加 [`defer` 屬性](https://html.spec.whatwg.org/multipage/scripting.html#attr-script-defer)來解決這個問題，`defer` 確保腳本下載與 HTML 解析平行進行。

![](/_img/modules/async-defer.svg)

Module腳本預設是延遲載入的。因此，無需在`<script type="module">`標籤中添加`defer`屬性！不僅主要模組的下載與HTML解析同時進行，其所有的依賴模組也是如此！

## 其他模組特色

### 動態`import()`

到目前為止，我們僅使用了靜態`import`。使用靜態`import`時，完整的模組結構圖需在主代碼執行前下載並執行。有時候，你可能不希望提前載入模組，而是按需載入，比如當使用者點擊鏈接或按鈕時。這可以改進初次載入性能。[動態`import()`](/features/dynamic-import)使這變得可能！

```html
<script type="module">
  (async () => {
    const moduleSpecifier = './lib.mjs';
    const {repeat, shout} = await import(moduleSpecifier);
    repeat('hello');
    // → 'hello hello'
    shout('Dynamic import in action');
    // → 'DYNAMIC IMPORT IN ACTION!'
  })();
</script>
```

與靜態`import`不同，動態`import()`可以在普通腳本中使用。這是一種在現有代碼庫中逐步開始使用模組的簡單方法。更多細節，請參見[我們關於動態`import()`的文章](/features/dynamic-import)。

:::note
**注意：** [webpack擁有其自己的`import()`版本](https://web.dev/use-long-term-caching/)，它巧妙地將導入的模組分割為自己的區塊，從主捆綁包分離。
:::

### `import.meta`

另一個新的模組相關功能是`import.meta`，它提供了當前模組的元數據。你獲得的具體元數據未在ECMAScript中指定，而是取決於宿主環境。例如，在瀏覽器中你可能獲得的元數據與Node.js不同。

以下是在網頁中使用`import.meta`的示例。默認情況下，圖片相對於HTML文件中的當前URL載入。使用`import.meta.url`可以相對於當前模組載入圖片。

```js
function loadThumbnail(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const image = new Image();
  image.src = url;
  return image;
}

const thumbnail = loadThumbnail('../img/thumbnail.png');
container.append(thumbnail);
```

## 性能建議

### 繼續打包

使用模組後，可以在不使用如webpack、Rollup或Parcel等捆綁工具的情況下開發網站。如果滿足以下場景，可以直接使用原生JS模組：

- 本地開發期間
- 小型網頁應用，總模組數少於100，且依賴樹相對淺（即最大深度少於5）

然而，根據[我們對使用約300個模組的模組化庫進行的Chrome載入管線瓶頸分析](https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub)的結果，捆綁應用的載入性能優於未捆綁的應用。

<figure>
  <a href="https://docs.google.com/document/d/1ovo4PurT_1K4WFwN2MYmmgbLcr7v6DRQN67ESVA-wq0/pub">
    <img src="/_img/modules/renderer-main-thread-time-breakdown.svg" width="830" height="311" alt="" loading="lazy"/>
  </a>
</figure>

其中一個原因是靜態`import`/`export`語法支持靜態分析，因此有助於捆綁工具通過刪除未使用的導出優化代碼。靜態`import`和`export`不僅僅是語法，它還是一個重要的工具功能！

*我們的一般建議是在將模組部署到生產環境之前繼續使用捆綁工具。*某種程度上，捆綁是一種類似於壓縮代碼的優化：它帶來性能上的好處，因為最終你傳送的代碼更少。捆綁具有同樣效果！繼續使用捆綁。

如往常一樣，[DevTools代碼覆蓋率功能](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage)可以幫助你識別是否向使用者傳送了多餘的代碼。我們還建議使用[代碼分割](https://developers.google.com/web/fundamentals/performance/webpack/use-long-term-caching#lazy-loading)來分割捆綁包以及延遲載入非首次重要渲染（First-Meaningful-Paint）相關的腳本。

#### 捆綁與傳送未捆綁模組的權衡

與往常的網頁開發一樣，一切都是權衡。傳送未捆綁模組可能會降低初次載入性能（冷緩存），但相比於傳送不使用代碼分割的單捆綁包，對於後續訪問（暖緩存）可能實際會提升載入性能。對於200 KB的代碼基礎，更改單個細粒度模組並使其成為後續訪問中唯一的伺服器抓取項，遠比重新抓取整個捆綁包要好。

如果你更關心暖緩存訪客體驗，而非首次訪問性能，並且網站的細粒度模組少於幾百個，你可以嘗試傳送未捆綁模組，測量冷和暖載入的性能影響，然後基於數據進行決策！

瀏覽器工程師正在努力提升模組的性能，實現開箱即用的效果。隨著時間的推移，我們期望在更多的情況下使用未打包的模組變得可行。

### 使用細粒度的模組

養成使用小的、細粒度模組編寫程式碼的習慣。在開發過程中，通常將少量的匯出放入每個模組比手動將大量的匯出合併到一個檔案中更好。

考慮一個名為 `./util.mjs` 的模組，它匯出三個名為 `drop`、`pluck` 和 `zip` 的函數：

```js
export function drop() { /* … */ }
export function pluck() { /* … */ }
export function zip() { /* … */ }
```

如果你的程式碼基礎只需要 `pluck` 功能，你可能會如下匯入它：

```js
import {pluck} from './util.mjs';
```

在這種情況下，（如果沒有編譯時的打包步驟）即使瀏覽器只需要這一個匯出，它仍需要下載、解析和編譯整個 `./util.mjs` 模組。這很浪費！

如果 `pluck` 並不與 `drop` 和 `zip` 共享任何程式碼，那麼最好將它移至自己的細粒度模組，例如 `./pluck.mjs`。

```js
export function pluck() { /* … */ }
```

然後我們可以匯入 `pluck`，而無需處理 `drop` 和 `zip` 的額外負擔：

```js
import {pluck} from './pluck.mjs';
```

:::note
**注意：** 依據個人喜好，這裡可以使用 `default` 匯出取代具名匯出。
:::

這不僅讓你的源代碼保持清晰簡單，還減少了打包工具執行的無用程式碼消除需求。如果源代碼樹中的某個模組未被使用，那麼它就永遠不會被匯入，瀏覽器也不會下載它。而那些 _被_ 使用的模組則可以被瀏覽器單獨地 [進行程式碼快取](/blog/code-caching-for-devs)。（用於支持這一點的基礎設施已經在 V8 中實現，並且 [相關工作正在進行中](https://bugs.chromium.org/p/chromium/issues/detail?id=841466) 以便在 Chrome 中啟用它。）

使用小的、細粒度的模組幫助為未來[原生打包解決方案](#web-packaging)做好準備。

### 預加載模組

你可以使用 [`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload) 進一步優化模組的傳遞方式。這樣，瀏覽器可以預加載，甚至預解析和預編譯模組及其依賴項。

```html
<link rel="modulepreload" href="lib.mjs">
<link rel="modulepreload" href="main.mjs">
<script type="module" src="main.mjs"></script>
<script nomodule src="fallback.js"></script>
```

這對於較大的依賴樹尤為重要。如果沒有 `rel="modulepreload"`，瀏覽器需要進行多次 HTTP 請求來解析完整的依賴樹。然而，如果你使用 `rel="modulepreload"` 聲明所有依賴的模組腳本清單，瀏覽器就不需要逐步發現這些依賴項。

### 使用 HTTP/2

如果可以的話，使用 HTTP/2 總是好的性能建議，哪怕只是為了 [它的多路複用支持](https://web.dev/performance-http2/#request-and-response-multiplexing)。通過 HTTP/2 多路複用，多個請求和響應消息可以同時進行，這對於加載模組樹來說非常有利。

Chrome 團隊調查了另一個 HTTP/2 功能——特別是 [HTTP/2 伺服器推送](https://web.dev/performance-http2/#server-push)，以查看它是否可以成為部署高度模組化應用的實際解決方案。不幸的是，[HTTP/2 伺服器推送很難正確實現](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/)，而網頁伺服器和瀏覽器的實現目前並未針對高度模組化的網頁應用進行優化。例如，很難僅推送用戶未快取的資源，而通過向伺服器傳輸來源的全部快取狀態來解決這一點則存在隱私風險。

因此，儘管可以使用 HTTP/2，但要記住，HTTP/2 的伺服器推送（很可惜）並不是萬全之策。

## JS 模組的網頁採用情況

JS 模組正在網頁上慢慢被採用。[我們的使用計數器](https://www.chromestatus.com/metrics/feature/timeline/popularity/2062) 顯示，目前 0.08% 的所有頁面加載使用 `<script type="module">`。請注意，這個數字不包括其他進入點，如動態 `import()` 或 [worklets](https://drafts.css-houdini.org/worklets/)。

## JS 模組的未來發展方向

Chrome 團隊正在以多種方式改進使用 JS 模組的開發時體驗。讓我們來討論其中一些。

### 更快且具確定性的模組解析算法

我們提出了一項模組解析演算法的變更，以解決速度和確定性方面的不足。新的演算法現已在[HTML 規範](https://github.com/whatwg/html/pull/2991)和[ECMAScript 規範](https://github.com/tc39/ecma262/pull/1006)中上線，並已在[Chrome 63](http://crbug.com/763597)中實現。預計這項改進將很快在更多瀏覽器中登陸！

新的演算法更加高效和快速。舊演算法在依賴圖大小方面的計算複雜度是二次方，也就是 𝒪(n²)，當時 Chrome 的實現也是如此。而新的演算法是線性的，也就是 𝒪(n)。

此外，新的演算法以確定性方式報告解析錯誤。對於包含多個錯誤的圖而言，舊演算法的不同運行可能會報告不同的錯誤作為解析失敗的原因。這使得調試變得不必要地困難。新的演算法保證每次都報告相同的錯誤。

### Worklets 和網頁工作者

Chrome 現已實現 [worklets](https://drafts.css-houdini.org/worklets/)，允許網頁開發者自訂瀏覽器“低層次部分”的硬編碼邏輯。透過 worklets，網頁開發者可以將 JS 模組導入渲染管線或音頻處理管線（以及未來可能的更多管線！）。

Chrome 65 支援 [`PaintWorklet`](https://developers.google.com/web/updates/2018/01/paintapi)（又稱 CSS Paint API）以控制如何繪製 DOM 元素。

```js
const result = await css.paintWorklet.addModule('paint-worklet.mjs');
```

Chrome 66 支援 [`AudioWorklet`](https://developers.google.com/web/updates/2017/12/audio-worklet)，允許您使用自己的代碼控制音頻處理。同一版本的 Chrome 開始了[`AnimationWorklet`](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ) 的[OriginTrial](https://groups.google.com/a/chromium.org/d/msg/blink-dev/AZ-PYPMS7EA/DEqbe2u5BQAJ)，這使得創建滾動相關和其他高效能的程序化動畫成為可能。

最後， [`LayoutWorklet`](https://drafts.css-houdini.org/css-layout-api/)（又稱 CSS Layout API）現已在 Chrome 67 中實現。

我們正在[努力](https://bugs.chromium.org/p/chromium/issues/detail?id=680046)為 Chrome 中的專用網頁工作者添加使用 JS 模組的支持。啟用 `chrome://flags/#enable-experimental-web-platform-features` 後，您已經可以嘗試此功能。

```js
const worker = new Worker('worker.mjs', { type: 'module' });
```

JS 模組對共享工作者和服務工作者的支援即將到來：

```js
const worker = new SharedWorker('worker.mjs', { type: 'module' });
const registration = await navigator.serviceWorker.register('worker.mjs', { type: 'module' });
```

### Import maps

在 Node.js/npm 中，通常會透過“套件名稱”導入 JS 模組。例如：

```js
import moment from 'moment';
import {pluck} from 'lodash-es';
```

目前，[依據 HTML 規範](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier)，此類“裸導入規範”會拋出異常。[我們的 Import maps 提議](https://github.com/domenic/import-maps)允許此類代碼可以在網頁上工作，包括在生產應用中。Import map 是一種 JSON 資源，幫助瀏覽器將裸導入規範轉換為完整的 URL。

Import maps 仍處於提議階段。雖然我們認真考慮了它如何解決各種使用案例，但我們仍在與社群合作，尚未撰寫完整的規範。歡迎提出反饋！

### 網頁封裝：原生包

Chrome 加載團隊目前正在探索[一種原生網頁封裝格式](https://github.com/WICG/webpackage)，作為分發網頁應用的一種新方式。網頁封裝的核心功能包括：

[簽名的 HTTP 交換](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)，允許瀏覽器信任由聲稱的來源生成的單一 HTTP 請求/響應對；[捆綁的 HTTP 交換](https://tools.ietf.org/html/draft-yasskin-wpack-bundled-exchanges-00)，即一系列交換，每個交換都可以是簽名的或未簽名的，並帶有一些描述如何解釋整個捆綁的元數據。

結合使用，此類網頁封裝格式可以讓*多個相同來源資源*安全地嵌入到*單個* HTTP `GET` 回應中。

現有的捆綁工具，如 webpack、Rollup 或 Parcel 目前會生成一個單一的 JavaScript 捆綁包，其中原始的獨立模組和資產的語義被丟失。有了原生捆綁包，瀏覽器可以將資源解包回它們的原始形式。簡單來說，您可以將捆綁的 HTTP 交換想像成包含多個資源的捆綁包，可以透過目錄表（manifest）以任意順序存取，並且包含的資源可以根據其相對重要性有效地存儲和標記，同時保持個別文件的概念。因為這樣，原生捆綁包可以改善調試體驗。在 DevTools 中查看資產時，瀏覽器可以定位到原始模組，無需複雜的 source-maps。

原生捆包格式的透明性開啟了多種優化的機會。例如，若瀏覽器已經在本地緩存了部分原生捆包，它可以將此訊息傳達給網頁伺服器，然後僅下載缺少的部分。

Chrome 已經支持了提案的一部分（[`SignedExchanges`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html)），但捆包格式本身以及其應用於高度模組化的應用依然處於探索階段。我們非常歡迎您在倉庫上提供反饋，或者通過電子郵件 [loading-dev@chromium.org](mailto:loading-dev@chromium.org) 聯繫我們！

### 分層 API

發布新功能和網頁 API 需要持續的維護和運行成本——每個新功能都會污染瀏覽器命名空間，增加啟動成本，並且為整個代碼庫增加引入錯誤的可能性。[分層 API](https://github.com/drufball/layered-apis) 是一項旨在用更可擴展的方式與網頁瀏覽器一起實現並發布高階 API 的努力。JS 模組是實現分層 API 的關鍵技術：

- 因為模組是顯式導入的，要求分層 API 通過模組暴露可以確保開發者僅需為其使用的分層 API 付出代價。
- 由於模組加載是可配置的，分層 API 可以內建機制以自動加載那些尚不支持分層 API 的瀏覽器的 polyfill。

模組和分層 API 如何協作的細節仍在[討論中](https://github.com/drufball/layered-apis/issues)，但當前的提案看起來像這樣：

```html
<script
  type="module"
  src="std:virtual-scroller|https://example.com/virtual-scroller.mjs"
></script>
```

`<script> `標籤從瀏覽器的內建分層 API 集合（`std:virtual-scroller`）或指向 polyfill 的備用 URL 加載 `virtual-scroller` API。此 API 能執行網頁瀏覽器中 JS 模組可以執行的任何操作。一個例子是定義[自訂的 `<virtual-scroller>` 元素](https://www.chromestatus.com/feature/5673195159945216)，以便如下的 HTML 可根據需要逐步增強：

```html
<virtual-scroller>
  <!-- 此處放置內容。 -->
</virtual-scroller>
```

## 致謝

感謝 Domenic Denicola、Georg Neis、Hiroki Nakagawa、Hiroshige Hayashizaki、Jakob Gruber、Kouhei Ueno、Kunihiko Sakamoto 和 Yang Guo，讓 JavaScript 模組更快！

此外，感謝 Eric Bidelman、Jake Archibald、Jason Miller、Jeffrey Posnick、Philip Walton、Rob Dodson、Sam Dutton、Sam Thorogood 和 Thomas Steiner 閱讀此指南的草稿版本並提供反饋。
