---
title: "令人惊叹的快速解析，第1部分：优化扫描器"
author: "Toon Verwaest（[@tverwaes](https://twitter.com/tverwaes)），高效优化专家"
avatars:
  - "toon-verwaest"
date: 2019-03-25 13:33:37
tags:
  - 内部机制
  - 解析
tweet: "1110205101652787200"
description: "解析器性能的核心是一个快速的扫描器。本文解释了V8的JavaScript扫描器最近如何提升到2.1倍的速度。"
---
为了运行JavaScript程序，需要对源代码进行处理，使V8能够理解它。V8首先将源代码解析为抽象语法树（AST），即表示程序结构的一组对象。这些AST随后会由Ignition编译成字节码。这些解析+编译阶段的性能很重要：V8在完成编译之前无法运行代码。在这一系列的博客文章中，我们专注于解析以及V8为实现快速解析器所做的工作。

<!--truncate-->
事实上，我们从解析器之前的一个阶段开始这一系列文章。V8的解析器消耗的是由‘扫描器’提供的‘令牌’。令牌是一个或多个具有单一语义意义的字符块，比如字符串、标识符、运算符如`++`。扫描器通过组合底层字符流中的连续字符来构造这些令牌。

扫描器会消耗一串Unicode字符。这些Unicode字符总是从UTF-16代码单元流中解码出来的。只支持一种编码可以避免为不同编码分支或特化扫描器和解析器，我们选择UTF-16是因为这是JavaScript字符串的编码，并且源代码的位置信息需要相对于这种编码提供。[`UTF16CharacterStream`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=46)提供了一个（可能是缓冲的）UTF-16视图，用于V8从Chrome接收到的底层Latin1、UTF-8或UTF-16编码，而这些编码是Chrome从网络接收的。除了支持多种编码之外，扫描器和字符流之间的分离使得V8能够透明地扫描整个源代码，即使我们可能只从网络中收到部分数据。

![](/_img/scanner/overview.svg)

扫描器和字符流之间的接口是一个名为[`Utf16CharacterStream::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=54)的方法，它返回下一个UTF-16代码单元，或`-1`表示输入结束。UTF-16不能用单个代码单元编码每个Unicode字符。在[基本多文种平面](https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane)之外的字符被编码为两个代码单元，也称为代理对。然而，扫描器操作的是Unicode字符而不是UTF-16代码单元，因此它将这种低级流接口包装在[`Scanner::Advance()`](https://cs.chromium.org/chromium/src/v8/src/scanner.h?sq=package:chromium&g=0&rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=569)方法中，该方法将UTF-16代码单元解码为完整的Unicode字符。目前已解码的字符会被缓冲并由扫描方法提取，比如[`Scanner::ScanString()`](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=775)。

扫描器根据最长的JavaScript字符不确定序列[^1]，使用4个字符的最大前瞻，选择特定的扫描方法或令牌。一旦选择了诸如`ScanString`这样的方法，它会消耗该令牌其余的字符，并为下一次扫描的令牌缓冲第一个不属于该令牌的字符。在`ScanString`的情况下，它还会将扫描的字符复制到一个以Latin1或UTF-16编码的缓冲区中，同时解码转义序列。

[^1]: `<!--`是HTML注释的开头，而`<!-`则被解析为“小于”、“非”、“减号”。

## 空白符

令牌可以被多种类型的空白符分隔，例如换行、空格、制表符、单行注释、多行注释等。一种类型的空白符可以接着另一种类型的空白符。如果空白符导致了两个令牌之间的换行，那么它会添加语义：这可能会导致[自动分号插入](https://tc39.es/ecma262/#sec-automatic-semicolon-insertion)。因此，在扫描下一个令牌之前，所有的空白符都会被跳过，并记录是否发生了换行。大多数实际生产环境中的 JavaScript 代码都是经过压缩的，因此幸运的是，多字符空白符并不常见。因此，V8 会统一独立地扫描每种类型的空白符，就像它们是普通令牌一样。例如，如果第一个令牌字符是`/`并后跟另一个`/`，V8 会将其扫描为单行注释，并返回`Token::WHITESPACE`。该循环会继续扫描令牌，[直到](https://cs.chromium.org/chromium/src/v8/src/scanner.cc?rcl=edf3dab4660ed6273e5d46bd2b0eae9f3210157d&l=671)我们找到一个非`Token::WHITESPACE`的令牌。这意味着，如果下一个令牌前没有空白符，我们会立即开始扫描相关令牌，而无需显式检查空白符。

然而，循环本身为每个扫描的令牌增加了开销：它需要一个分支来验证刚刚扫描的令牌。如果刚刚扫描的令牌可能是`Token::WHITESPACE`，我们最好继续循环。否则，我们应直接跳出循环。我们通过将循环移入一个独立的[辅助方法](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d62ec0d84f2ec8bc0d56ed7b8ed28eaee53ca94e&l=178)，并在确定令牌不是`Token::WHITESPACE`时立即返回实现这一目的。虽然这些类型的更改看起来确实很小，但它们为每个扫描令牌减少了开销。这对像标点符号这样非常短的令牌尤为重要：

![](/_img/scanner/punctuation.svg)

## 标识符扫描

最复杂但也最常见的令牌是[标识符](https://tc39.es/ecma262/#prod-Identifier)令牌，它在 JavaScript 中用于变量名（以及其他用途）。标识符以具有属性[`ID_Start`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=807)的 Unicode 字符开头，后面可以跟随一系列具有属性[`ID_Continue`](https://cs.chromium.org/chromium/src/v8/src/unicode.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=947)的字符。查找 Unicode 字符是否具有属性`ID_Start`或`ID_Continue`很耗费资源。通过插入从字符到其属性的缓存映射，我们可以稍微加快这一过程。

不过，大多数 JavaScript 源代码是用 ASCII 字符编写的。在 ASCII 范围的字符中，只有`a-z`、`A-Z`、`$`和`_`是标识符起始字符。`ID_Continue`还包括`0-9`。我们通过为每个 ASCII 字符构建一个表格，其中包含标志以指示该字符是否是`ID_Start`、`ID_Continue`字符等，来加快标识符扫描。当我们查看的字符在 ASCII 范围内时，我们从此表中查找相应的标志，并用一个分支验证属性。字符是标识符的一部分，直到我们看到第一个不具有`ID_Continue`属性的字符为止。

本文提到的所有改进加在一起后，对标识符扫描性能产生了以下差异：

![](/_img/scanner/identifiers-1.svg)

可能看起来违反直觉的是，较长的标识符扫描速度更快。这可能让您认为增加标识符的长度对性能是有益的。扫描较长的标识符在 MB/s 来说确实更快，因为我们可以更长时间停留在一个非常紧凑的循环中，而无需返回解析器。然而，您从应用程序性能的角度关注的是我们扫描完整令牌的速度。以下图表大致显示了我们每秒扫描的令牌数量与令牌长度的关系：

![](/_img/scanner/identifiers-2.svg)

从图中可以清楚地看到，使用较短的标识符对应用程序的解析性能是有益的：我们每秒能够扫描更多的令牌。这意味着那些看起来我们以 MB/s 更快解析的站点实际上信息密度较低，并且实际上每秒生成的令牌数量较少。

## 内部化压缩后的标识符

所有字符串字面量和标识符在扫描器和解析器之间的边界处都会被去重。如果解析器请求字符串或标识符的值，它会为每个可能的字面值接收到唯一的字符串对象。这通常需要一个哈希表查找。由于 JavaScript 代码通常被压缩，V8 为单个 ASCII 字符串使用一个简单的查找表。

## 关键字

关键字是语言定义的一部分标识符，例如`if`、`else`和`function`。V8 的扫描器为关键字返回与标识符不同的令牌。在扫描标识符后，我们需要识别该标识符是否为关键字。由于 JavaScript 中的所有关键字仅包含小写字符`a-z`，我们也保留标志以指示 ASCII 字符是否可能是关键字起始和继续字符。

如果标识符根据标志可以是关键字，我们可以通过切换标识符的第一个字符发现一个关键字候选子集。与关键字的长度相比，有更多不同的首字符，因此它减少了后续分支的数量。对于每个字符，我们根据可能的关键字长度分支，并仅在长度也匹配时将标识符与关键字进行比较。

最好使用一种称为[完美哈希](https://en.wikipedia.org/wiki/Perfect_hash_function)的技术。因为关键字列表是静态的，我们可以计算一个完美哈希函数，该函数可以为每个标识符提供最多一个候选关键字。V8使用[gperf](https://www.gnu.org/software/gperf/)来计算此函数。[结果](https://cs.chromium.org/chromium/src/v8/src/parsing/keywords-gen.h)通过长度和前两个标识符字符计算出一个哈希值，从而找到单一的候选关键字。只有当该关键字的长度与输入标识符的长度匹配时，我们才将标识符与关键字进行比较。这种方法特别加速了标识符不是关键字的情况，因为我们需要更少的分支来确认这一点。

![](/_img/scanner/keywords.svg)

## 代理对

如前所述，我们的扫描器在一个UTF-16编码的字符流上操作，但消费的是Unicode字符。对于标识符标记而言，补充平面中的字符只有特殊含义。例如，如果这种字符出现在字符串中，它们不会导致字符串结束。JS支持单独的代理字符，这些字符也会原样从源代码中拷贝出来。因此，最好在确实需要时才组合代理对，而让扫描器直接处理UTF-16代码单元，而不是Unicode字符。当我们扫描一个字符串时，不需要查找代理对、组合它们，然后在存储字符以构建文字时再将它们拆分开来。扫描器只需要在两个剩下的地方处理代理对：在标记扫描的开始阶段，仅当我们无法识别一个字符时才需要[组合](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner-inl.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=515)代理对以检查结果是否为标识符的开始。同样地，我们在处理非ASCII字符的标识符扫描的慢路径时需要[组合](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.cc?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=1003)代理对。

## `AdvanceUntil`

扫描器和`UTF16CharacterStream`之间的接口使边界非常具有状态性。流会跟踪其在缓冲区中的位置，每消费一个代码单元就递增。扫描器在返回请求字符的方法之前，会将接收到的代码单元缓冲下来。该方法读取缓冲的字符并根据其值继续。这种分层方式很好，但相对较慢。去年秋天，我们的实习生Florian Sattler提出了一种改进的接口，该接口保留了分层的好处，同时为流中的代码单元提供了更快的访问。一个模板化函数[`AdvanceUntil`](https://cs.chromium.org/chromium/src/v8/src/parsing/scanner.h?rcl=d4096d05abfc992a150de884c25361917e06c6a9&l=72)，针对特定扫描助手进行了特殊处理，为流中的每个字符调用助手，直到助手返回false为止。这不仅为扫描器提供了对底层数据的直接访问，同时保持了抽象，还实际上简化了扫描助手函数，因为它们无需处理`EndOfInput`。

![](/_img/scanner/advanceuntil.svg)

`AdvanceUntil`特别适用于加速可能需要消费大量字符的扫描功能。我们已经利用它加速了前面展示的标识符扫描，还加速了字符串[^2]和注释。

[^2]: 目前无法用Latin1编码的字符串和标识符成本较高，因为我们首先尝试将它们缓冲为Latin1，在遇到不能用Latin1编码的字符后再将它们转换为UTF-16。

## 总结

扫描性能是解析器性能的基石。我们已尽可能提高扫描器的效率。这使得各方面性能都有所提高，比如单标记扫描性能提升了约1.4倍，字符串扫描提升了1.3倍，多行注释扫描提升了2.1倍，而标识符扫描根据标识符长度提升了1.2至1.5倍。

然而，我们的扫描器能做的毕竟有限。作为开发者，您可以通过提高程序的信息密度进一步提升解析性能。最简单的方法是压缩代码，删除不必要的空白，并尽量避免使用非ASCII标识符。理想情况下，这些步骤应该作为构建过程的一部分自动化处理，这样您在编写代码时就无需担心这些问题。
