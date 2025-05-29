---
title: 'What’s in that `.wasm`? Introducing: `wasm-decompile`'
author: 'Wouter van Oortmerssen ([@wvo](https://twitter.com/wvo))'
avatars:
  - 'wouter-van-oortmerssen'
date: 2020-04-27
tags:
  - WebAssembly
  - tooling
description: 'WABT gains a new decompilation tool that can make it easier to read the contents of Wasm modules.'
tweet: '1254829913561014272'
---
We have a growing number of compilers and other tools that generate or manipulate `.wasm` files, and sometimes you might want to have a look inside. Maybe you’re a developer of such a tool, or more directly, you’re a programmer targeting Wasm, and wondering what the generated code looks like, for performance or other reasons.

Problem is, Wasm is rather low-level, much like actual assembly code. In particular, unlike, say, the JVM, all data structures have been compiled down to load/store operations, rather than conveniently named classes and fields. Compilers like LLVM can do an impressive amount of transformations that make the generated code look nothing like the code that went in.

## Disassemble or.. decompile?

You could use tools like `wasm2wat` (part of the [WABT](https://github.com/WebAssembly/wabt) toolkit), to transform a `.wasm` into Wasm’s standard text format, `.wat`, which is a very faithful but not particularly readable representation.

For example, a simple C function like a dot product:

```c
typedef struct { float x, y, z; } vec3;

float dot(const vec3 *a, const vec3 *b) {
    return a->x * b->x +
           a->y * b->y +
           a->z * b->z;
}
```

We use `clang dot.c -c -target wasm32 -O2` followed by `wasm2wat -f dot.o` to turn it into this `.wat`:

```wasm
(func $dot (type 0) (param i32 i32) (result f32)
  (f32.add
    (f32.add
      (f32.mul
        (f32.load
          (local.get 0))
        (f32.load
          (local.get 1)))
      (f32.mul
        (f32.load offset=4
          (local.get 0))
        (f32.load offset=4
          (local.get 1))))
    (f32.mul
      (f32.load offset=8
        (local.get 0))
      (f32.load offset=8
        (local.get 1))))))
```

That is a tiny bit of code, but already not great to read for many reasons. Besides the lack of an expression based syntax and general verbosity, having to understand data structures as memory loads is not easy. Now imagine looking at the output of a large program, and things will get incomprehensible fast.

Instead of `wasm2wat`, run `wasm-decompile dot.o`, and you get:

```c
function dot(a:{ a:float, b:float, c:float },
             b:{ a:float, b:float, c:float }):float {
  return a.a * b.a + a.b * b.b + a.c * b.c
}
```

This looks a lot more familiar. Besides an expression based syntax that mimics programming languages you may be familiar with, the decompiler looks at all loads and stores in a function, and tries to infer their structure. It then annotates each variable that is used as a pointer with an "inline" struct declaration. It does not create named struct declarations since it doesn’t necessarily know which uses of 3 floats represent the same concept.

## Decompile to what?

`wasm-decompile` produces output that tries to look like a "very average programming language" while still staying close to the Wasm it represents.

Its #1 goal is readability: help guide readers understand what is in a `.wasm` with as easy to follow code as possible. Its #2 goal is to still represent Wasm as 1:1 as possible, to not lose its utility as a disassembler. Obviously these two goals are not always unifiable.

This output is not meant to be an actual programming language and there is currently no way to compile it back into Wasm.

### Loads and stores

As demonstrated above, `wasm-decompile` looks at all loads and stores over a particular pointer. If they form a continuous set of accesses, it will output one of these "inline" struct declarations.

If not all "fields" are accessed, it can’t tell for sure whether this is meant to be a struct, or some other form of unrelated memory access. In that case it falls back to simpler types like `float_ptr` (if the types are the same), or, in the worst case, will output an array access like `o[2]:int`, which says: `o` points to `int` values, and we’re accessing the third one.

That last case happens more often than you’d think, since Wasm locals function more like registers than variables, so optimized code may share the same pointer for unrelated objects.

The decompiler tries to be smart about indexing, and detects patterns like `(base + (index << 2))[0]:int` that result from regular C array indexing operations like `base[index]` where `base` points to a 4-byte type. These are very common in code since Wasm has only constant offsets on loads and stores. `wasm-decompile` output transforms them back into `base[index]:int`.

Additionally it knows when absolute addresses refer to the data section.

### Control flow

Most familiar is Wasm’s if-then construct, which translates to a familiar `if (cond) { A } else { B }` syntax, with the addition that in Wasm it can actually return a value, so it can also represent the ternary `cond ? A : B` syntax available in some languages.

The rest of Wasm’s control flow is based on the `block` and `loop` blocks, and the `br`, `br_if` and `br_table` jumps. The decompiler stays decently close to these constructs rather than trying to infer the while/for/switch constructs they may have come from, since this tends to work better with optimized output. For example, a typical loop in the `wasm-decompile` output may look like:

```c
loop A {
  // body of the loop here.
  if (cond) continue A;
}
```

Here, `A` is a label that allows multiple of these to be nested. Having an `if` and `continue` to control the loop may look slightly foreign compared to a while loop, but it corresponds directly to Wasm’s `br_if`.

Blocks are similar, but instead of branching backwards, they branch forwards:

```c
block {
  if (cond) break;
  // body goes here.
}
```

This actually implements an if-then. Future versions of the decompiler may translate these into actual if-thens when possible.

Wasm’s most surprising control construct is `br_table`, which implements something like a `switch`, except using nested `block`s, which tends to be hard to read. The decompiler flattens these to make them slightly
easier to follow, for example:

```c
br_table[A, B, C, ..D](a);
label A:
return 0;
label B:
return 1;
label C:
return 2;
label D:
```

This is similar to `switch` on `a`, with `D` being the default case.

### Other fun features

The decompiler:

- Can pull names from debug or linking information, or generate names itself. When using existing names, it has special code to simplify C++ name mangled symbols.
- Already supports the multi-value proposal, which makes turning things into expressions and statements a bit harder. Additional variables are used when multiple values are returned.
- It can even generate names from the _contents_ of data sections.
- Outputs nice declarations for all Wasm section types, not just code. For example, it tries to make data sections readable by outputting them as text when possible.
- Supports operator precedence (common to most C-style languages) to reduce the `()` on common expressions.

### Limitations

Decompiling Wasm is fundamentally harder than, say, JVM bytecode.

The latter is un-optimized, so relatively faithful to the structure of the original code, and even though names may be missing, refers to unique classes rather than just memory locations.

In contrast, most `.wasm` output has been heavily optimized by LLVM and thus has often lost most of its original structure. The output code is very unlike what a programmer would write. That makes a decompiler for Wasm a bigger challenge to make useful, but that doesn’t mean we shouldn’t try!

## More

The best way to see more is of course to decompile your own Wasm project!

Additionally, a more in-depth guide to `wasm-decompile` is [here](https://github.com/WebAssembly/wabt/blob/master/docs/decompiler.md). Its implementation is in the source files starting with `decompiler` [here](https://github.com/WebAssembly/wabt/tree/master/src) (feel free to contribute a PR to make it better!). Some test cases that show further examples of differences between `.wat` and the decompiler are [here](https://github.com/WebAssembly/wabt/tree/master/test/decompile).
