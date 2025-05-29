---
title: 'RegExp lookbehind assertions'
author: 'Yang Guo, Regular Expression Engineer'
avatars:
  - 'yang-guo'
date: 2016-02-26 13:33:37
tags:
  - ECMAScript
  - RegExp
description: 'JavaScript regular expressions are getting some new functionality: lookbehind assertions.'
---
Introduced with the third edition of the ECMA-262 specification, regular expressions have been part of Javascript since 1999. In functionality and expressiveness, JavaScript’s implementation of regular expressions roughly mirrors that of other programming languages.

One feature in JavaScript’s RegExp that is often overlooked, but can be quite useful at times, is lookahead assertions. For example, to match a sequence of digits that is followed by a percent sign, we can use `/\d+(?=%)/`. The percent sign itself is not part of the match result. The negation thereof, `/\d+(?!%)/`, would match a sequence of digits not followed by a percent sign:

```js
/\d+(?=%)/.exec('100% of US presidents have been male'); // ['100']
/\d+(?!%)/.exec('that’s all 44 of them');                // ['44']
```

The opposite of lookahead, lookbehind assertions, have been missing in JavaScript, but are available in other regular expression implementations, such as that of the .NET framework. Instead of reading ahead, the regular expression engine reads backwards for the match inside the assertion. A sequence of digits following a dollar sign can be matched by `/(?<=\$)\d+/`, where the dollar sign would not be part of the match result. The negation thereof, `/(?<!\$)\d+/`, matches a sequence of digits following anything but a dollar sign.

```js
/(?<=\$)\d+/.exec('Benjamin Franklin is on the $100 bill'); // ['100']
/(?<!\$)\d+/.exec('it’s worth about €90');                  // ['90']
```

Generally, there are two ways to implement lookbehind assertions. Perl, for example, requires lookbehind patterns to have a fixed length. That means that quantifiers such as `*` or `+` are not allowed. This way, the regular expression engine can step back by that fixed length, and match the lookbehind the exact same way as it would match a lookahead, from the stepped back position.

The regular expression engine in the .NET framework takes a different approach. Instead of needing to know how many characters the lookbehind pattern will match, it simply matches the lookbehind pattern backwards, while reading characters against the normal read direction. This means that the lookbehind pattern can take advantage of the full regular expression syntax and match patterns of arbitrary length.

Clearly, the second option is more powerful than the first. That is why the V8 team, and the TC39 champions for this feature, have agreed that JavaScript should adopt the more expressive version, even though its implementation is slightly more complex.

Because lookbehind assertions match backwards, there are some subtle behaviors that would otherwise be considered surprising. For example, a capturing group with a quantifier captures the last match. Usually, that is the right-most match. But inside a lookbehind assertion, we match from right to left, therefore the left-most match is captured:

```js
/h(?=(\w)+)/.exec('hodor');  // ['h', 'r']
/(?<=(\w)+)r/.exec('hodor'); // ['r', 'h']
```

A capturing group can be referenced via back reference after it has been captured. Usually, the back reference has to be to the right of the capture group. Otherwise, it would match the empty string, as nothing has been captured yet. However, inside a lookbehind assertion, the match direction is reversed:

```js
/(?<=(o)d\1)r/.exec('hodor'); // null
/(?<=\1d(o))r/.exec('hodor'); // ['r', 'o']
```

Lookbehind assertions are currently in a very [early stage](https://github.com/tc39/proposal-regexp-lookbehind) in the TC39 specification process. However, because they are such an obvious extension to the RegExp syntax, we decided to prioritize their implementation. You can already experiment with lookbehind assertions by running V8 version 4.9 or later with `--harmony`, or by enabling experimental JavaScript features (use `about:flags`) in Chrome from version 49 onwards.
