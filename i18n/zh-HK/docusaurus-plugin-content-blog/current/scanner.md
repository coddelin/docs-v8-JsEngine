---
title: &apos;極速解析，第1部分：優化掃描器&apos;
author: &apos;Toon Verwaest ([@tverwaes](https://twitter.com/tverwaes))，令人震驚的優化者&apos;
avatars:
  - &apos;toon-verwaest&apos;
date: 2019-03-25 13:33:37
tags:
  - internals
  - parsing
tweet: &apos;1110205101652787200&apos;
description: &apos;解析器性能的基石在於快速的掃描器。這篇文章解釋了V8的JavaScript掃描器如何最近變得快了2.1倍。&apos;
---
要運行一個JavaScript程序，需要對源代碼文本進行處理，以便V8能夠理解它。V8首先將源代碼解析為抽象語法樹（AST），這是一組表示程序結構的物件。該AST由Ignition編譯為位元碼。這些解析和編譯階段的性能非常重要：V8在編譯完成之前無法運行代碼。在這一系列的博客文章中，我們將重點關注解析以及V8為提供極速解析器所做的工作。

<!--truncate-->
事實上，我們從解析器的上一階段開始這個系列。V8的解析器消耗由“掃描器”提供的“標記”。標記是由一個或多個字符組成的具有單一語義的塊：比如字符串、標識符、操作符如`++`。掃描器通過組合底層字符流中的連續字符來構造這些標記。

掃描器消耗的是Unicode字符流。這些Unicode字符始終是從UTF-16代碼單元流中解碼而來的。為了避免在處理不同編碼時出現分支或專門化掃描器和解析器的情況，我們僅支持單一編碼格式，我們選擇了UTF-16，因為這是JavaScript字符串的編碼，且源文件位置需要相對於該編碼提供。[`UTF16CharacterStream`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=46) 提供了一個（可能被緩存的）基於底層Latin1、UTF-8 或 UTF-16 編碼的UTF-16視圖，這些編碼是V8從Chrome接收到的，而Chrome則是從網路接收的。除了支持多種編碼外，掃描器和字符流之間的分離使得V8可以像掃描整個源文件一樣地透明執行，即使我們至今只接收到了一部分的網路數據。

![](/_img/scanner/overview.svg)

掃描器和字符流之間的接口是一個名為[`Utf16CharacterStream::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=54)的方法，該方法會返回下一個UTF-16代碼單元，或返回`-1`來表示輸入結束。UTF-16無法在單個代碼單元中編碼所有的Unicode字符。位於[基本多語種平面](https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane)之外的字符使用兩個代碼單元進行編碼，也稱為代理對。然而，掃描器操作的是Unicode字符而不是UTF-16代碼單元，因此它將這種低層次的流接口包裝成一個[`Scanner::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?sq=package:chromium&g=0&rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=569)方法，該方法將UTF-16代碼單元解碼為完整的Unicode字符。目前解碼的字符被緩存，並由掃描方法（如[`Scanner::ScanString()`](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=775)）使用。

掃描器基於JavaScript中最長的不明確字符序列的最大前瞻4個字符來[選擇](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=422)一個特定的掃描方法或標記。一旦選擇了一個方法如`ScanString`，該方法就會消耗該標記的剩餘字符，並將不屬於該標記的第一字符緩存以供下次掃描的標記使用。在`ScanString`的情況下，它還將掃描的字符解碼為Latin1或UTF-16，並同時處理轉義序列。

[^1]: `<!--`是HTML註釋的開始，而`<!-`則被掃描為“小於”、“非”、“減號”。

## 空白字符

語法記號可以由各種類型的空白分隔，例如換行、空格、縮排、單行註解、多行註解等。一種空白可以接著另一種空白。如果空白導致兩個語法記號之間斷行，則空白具有意義：這可能導致[自動分號插入](https://tc39.es/ecma262/#sec-automatic-semicolon-insertion)。因此，在掃描下一個語法記號之前，會跳過所有空白並記錄是否發生了換行。大多數現實世界的生產 JavaScript 代碼是縮減版，因此多字符空白不太常見。因此，V8 統一地將每種類型的空白獨立掃描，就像它們是普通語法記號一樣。例如，如果第一個語法記號字符是 `/`，後面跟著 `/`，V8 將其掃描為單行註解並返回`Token::WHITESPACE`。該迴圈繼續掃描語法記號[直到](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=671)找到非`Token::WHITESPACE`的語法記號。這意味著如果下一個語法記號前面沒有空白，我們將立即開始掃描相關的語法記號，而無需顯式檢查空白。

然而，該迴圈本身為每個被掃描的語法記號增加了額外的開銷：它需要一個分支來驗證剛剛掃描的語法記號。如果剛掃描的語法記號可能是 `Token::WHITESPACE` 才繼續迴圈會更好。否則，我們應該直接跳出迴圈。我們通過將迴圈本身移動到一個單獨的[輔助方法](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d62ec0d84f2ec8bc0d56ed7b8ed28eaee53ca94e&l=178)，並在確定語法記號不是`Token::WHITESPACE`時立即返回。儘管這些改動看起來很小，但它們為每個被掃描的語法記號移除了額外的開銷。這在掃描非常短的語法記號（如標點符號）時尤其有所不同：

![](/_img/scanner/punctuation.svg)

## 識別符掃描

最複雜但也是最常見的語法記號是 [識別符](https://tc39.es/ecma262/#prod-Identifier)語法記號，識別符在 JavaScript 中用於變量名稱（以及其他用途）。識別符以具有屬性[`ID_Start`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=807)的 Unicode 字符開始，後接具有屬性[`ID_Continue`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=947)的一系列字符。查看 Unicode 字符是否具有`ID_Start`或`ID_Continue`屬性相當耗費資源。通過插入一個從字符映射到它們屬性的緩存，我們可以稍微加快速度。

然而，大多數 JavaScript 源代碼是使用 ASCII 字符寫的。在 ASCII 範圍內的字符中，只有 `a-z`、`A-Z`、`$`和`_` 是識別符的開始字符。`ID_Continue`額外包括`0-9`。我們通過為每個 128 個 ASCII 字符構建一個旗標表來加快識別符的掃描，其中標誌表示是否是`ID_Start`或者`ID_Continue`字符等。當查看的字符在 ASCII 範圍內時，我們通過查這個表以單一分支驗証其屬性。字符在識別符的一部分，直到我們看到第一個不具備`ID_Continue`屬性的字符。

這篇文章提到的所有改進累積起來，導致以下識別符掃描性能的差異：

![](/_img/scanner/identifiers-1.svg)

較長識別符掃描速度更快似乎讓人感到違背直覺。這可能會讓你覺得增長識別符的長度對性能有好處。事實上，較長識別符在 MB/s 的掃描速度方面更快，因為我們在非常緊密的迴圈中停留時間更長，而未返回到解析器。然而，從應用性能角度看，你關注的應該是掃描完整語法記號的速度。下圖大致顯示了與語法記號的長度相比，我們每秒鐘掃描的語法記號數量：

![](/_img/scanner/identifiers-2.svg)

這表明使用較短的識別符對你的應用解析性能有益：我們能夠每秒掃描更多的語法記號。如果有些網站似乎掃描速度快，則只是因為它們的信息密度較低，實際上生成的每秒語法記號數量更少。

## 內部化縮減版識別符

所有字串文字和識別符在掃描器和解析器之間的邊界處去重。如果解析器請求字串或識別符的值，它將為每個可能的文字值接收一個唯一的字串對象。通常需要進行哈希表查找。由於 JavaScript 代碼經常縮減，V8 對單個 ASCII 字符字串使用簡單的查找表。

## 關鍵字

關鍵字是語言定義的一組特殊識別符，例如`if`、`else`和`function`。V8 的掃描器對關鍵字和識別符返回不同的語法記號。在掃描識別符之後，我們需要識別該識別符是否為關鍵字。由於 JavaScript 中所有關鍵字僅包含小寫字元`a-z`，我們也將標誌保持為 ASCII 字符是否可能是關鍵字起始和持續字符。

如果根據標志識別符可以是關鍵字，我們能通過識別符的首字符，找到關鍵字候選的子集。首字符比關鍵字的長度種類更多，因此它減少了後續分支的數量。對每種字符，我們基於可能的關鍵字長度進行分支，並且只有當長度符合時才將識別符與關鍵字進行比較。

最好是使用一種稱為[完美雜湊](https://en.wikipedia.org/wiki/Perfect_hash_function)的技術。由於關鍵字列表是靜態的，我們可以計算一個完美的雜湊函數，為每個標識符提供最多一個候選關鍵字。V8 使用 [gperf](https://www.gnu.org/software/gperf/) 來計算此函數。這個[結果](https://cs.chromium.org/chromium/src/v8/src/parsing/keywords-gen.h) 使用長度和前兩個標識符字符來計算雜湊，以找到唯一的候選關鍵字。我們只有在關鍵字的長度與輸入標識符的長度相匹配時，才會將標識符與關鍵字進行比較。這特別加速了標識符不是關鍵字的情況，因為我們需要更少的分支來確定這一點。

![](/_img/scanner/keywords.svg)

## 代理對

如前所述，我們的掃描器操作的是 UTF-16 編碼的字符流，但消耗的是 Unicode 字符。補充平面中的字符只有在標識符標記中才有特殊意義。例如，這些字符出現在字符串中時，它們不會結束字符串。JS 支持獨立代理，並且簡單地從源中直接複製。因此，最好在絕對必要之前避免組合代理對，讓掃描器直接操作 UTF-16 代碼單元而非 Unicode 字符。當我們掃描字符串時，我們不需要尋找代理對，把它們組合，然後在存儲字符來構建文字的過程中再拆分它們。掃描器只有在兩個地方需要處理代理對。在令牌掃描的開始階段，只有當我們無法將字符識別為其他內容時，我們才需要[組合](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=515)代理對來檢查結果是否是標識符的起始。同樣，我們需要在處理非 ASCII 字符的標識符掃描的慢速路徑中[組合](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=1003)代理對。

## `AdvanceUntil`

掃描器與 `UTF16CharacterStream` 之間的接口使邊界極具狀態性。流會跟蹤其在緩衝區中的位置，並在每次消耗代碼單元後進行遞增。掃描器緩存接收到的代碼單元，然後返回給請求該字符的掃描方法。該方法讀取緩存的字符並根據其值繼續操作。這提供了良好的分層，但相對較慢。去年秋天，我們的實習生 Florian Sattler 提出了一個改進的接口，既保持了分層的好處，又大幅加快了流中代碼單元的訪問速度。一個模版化的函數[`AdvanceUntil`](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=72)，針對特定的掃描幫助器進行專門化，調用該幫助器來處理流中的每個字符，直到幫助器返回 false。這實質上使掃描器能在不破壞抽象的情況下直接訪問底層數據。這實際上簡化了掃描幫助器函數，因為它們不需要處理`EndOfInput`。

![](/_img/scanner/advanceuntil.svg)

`AdvanceUntil` 對於需要消耗大量字符的掃描函數特別有用。我們已經用它來加速早先提到的標識符掃描，但也包括字符串[^2]和註釋的掃描。

[^2]: 無法以 Latin1 編碼的字符串和標識符目前成本更高，因為我們首先嘗試將它們緩存為 Latin1，當遇到無法以 Latin1 編碼的字符時再轉換為 UTF-16。

## 結論

掃描的性能是解析器性能的基石。我們已經對掃描器進行了優化，以使其達到最高效率。這帶來了全面的改進，使單個令牌掃描性能提升了約 1.4 倍，字符串掃描提升了 1.3 倍，多行註釋掃描提升了 2.1 倍，標識符掃描性能根據標識符長度不同增強了 1.2–1.5 倍。

然而，我們的掃描器能力有限。作為開發者，您可以通過提高程式的資訊密度來進一步改善解析性能。最簡單的方法是縮小源代碼，刪除不必要的空白並在可能的情況下避免使用非 ASCII 標識符。理想情況下，這些步驟應該作為構建過程的一部分自動化，這樣您在編寫代碼時就無需擔心這些問題。
