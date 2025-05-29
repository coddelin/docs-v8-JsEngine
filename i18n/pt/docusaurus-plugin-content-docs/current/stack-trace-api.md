---
title: "API de rastreamento de pilha"
description: "Este documento descreve a API de rastreamento de pilha de JavaScript do V8."
---
Todos os erros internos lançados no V8 capturam uma rastreamento de pilha quando são criados. Esse rastreamento pode ser acessado a partir do JavaScript por meio da propriedade não-padrão `error.stack`. O V8 também possui vários hooks para controlar como os rastreamentos de pilha são coletados e formatados, permitindo que erros personalizados também coletem rastreamentos de pilha. Este documento descreve a API de rastreamento de pilha de JavaScript do V8.

## Rastreamentos de pilha básicos

Por padrão, quase todos os erros lançados pelo V8 têm uma propriedade `stack` que contém os 10 quadros de pilha mais superiores, formatados como uma string. Aqui está um exemplo de um rastreamento de pilha totalmente formatado:

```
ReferenceError: FAIL não está definido
   at Constraint.execute (deltablue.js:525:2)
   at Constraint.recalculate (deltablue.js:424:21)
   at Planner.addPropagate (deltablue.js:701:6)
   at Constraint.satisfy (deltablue.js:184:15)
   at Planner.incrementalAdd (deltablue.js:591:21)
   at Constraint.addConstraint (deltablue.js:162:10)
   at Constraint.BinaryConstraint (deltablue.js:346:7)
   at Constraint.EqualityConstraint (deltablue.js:515:38)
   at chainTest (deltablue.js:807:6)
   at deltaBlue (deltablue.js:879:2)
```

O rastreamento de pilha é coletado quando o erro é criado e é o mesmo, independentemente de onde ou quantas vezes o erro é lançado. Coletamos 10 quadros porque geralmente é suficiente para ser útil, mas não tantos que tenha um impacto negativo perceptível no desempenho. Você pode controlar quantos quadros de pilha são coletados configurando a variável

```js
Error.stackTraceLimit
```

Defini-lo como `0` desativa a coleta de rastreamentos de pilha. Qualquer valor inteiro finito pode ser usado como o número máximo de quadros a serem coletados. Definir como `Infinity` significa que todos os quadros serão coletados. Esta variável afeta apenas o contexto atual; deve ser configurada explicitamente para cada contexto que precisa de um valor diferente. (Observe que o que é conhecido como “contexto” na terminologia do V8 corresponde a uma página ou `<iframe>` no Google Chrome). Para definir um valor padrão diferente que afeta todos os contextos, use a seguinte flag de linha de comando do V8:

```bash
--stack-trace-limit <valor>
```

Para passar esta flag para o V8 ao executar o Google Chrome, use:

```bash
--js-flags='--stack-trace-limit <valor>'
```

## Rastreamentos de pilha assíncronos

A flag `--async-stack-traces` (ativada por padrão desde [V8 v7.3](https://v8.dev/blog/v8-release-73#async-stack-traces)) habilita os novos [rastreamentos de pilha assíncronos sem custo](https://bit.ly/v8-zero-cost-async-stack-traces), que enriquecem a propriedade `stack` das instâncias de `Error` com quadros de pilha assíncronos, ou seja, locais `await` no código. Esses quadros assíncronos são marcados como `async` na string `stack`:

```
ReferenceError: FAIL não está definido
    at bar (<anonymous>)
    at async foo (<anonymous>)
```

No momento da escrita, essa funcionalidade está limitada a locais `await`, `Promise.all()` e `Promise.any()`, já que para esses casos o motor pode reconstruir as informações necessárias sem qualquer sobrecarga adicional (por isso é sem custo).

## Coleta de rastreamento de pilha para exceções personalizadas

O mecanismo de rastreamento de pilha usado para erros integrados é implementado usando uma API geral de coleta de rastreamento de pilha que também está disponível para scripts de usuários. A função

```js
Error.captureStackTrace(error, constructorOpt)
```

adiciona uma propriedade de pilha ao objeto `error` fornecido, que apresenta o rastreamento de pilha no momento em que `captureStackTrace` foi chamado. Rastreamentos de pilha coletados por `Error.captureStackTrace` são imediatamente coletados, formatados e anexados ao objeto `error` fornecido.

O parâmetro opcional `constructorOpt` permite que você passe um valor de função. Ao coletar o rastreamento de pilha, todos os quadros acima da chamada mais superior para esta função, incluindo essa chamada, são deixados de fora do rastreamento de pilha. Isso pode ser útil para ocultar detalhes de implementação que não serão úteis para o usuário. A maneira usual de definir um erro personalizado que captura um rastreamento de pilha seria:

```js
function MyError() {
  Error.captureStackTrace(this, MyError);
  // Qualquer outra inicialização vai aqui.
}
```

Passar MyError como um segundo argumento significa que a chamada do construtor para MyError não aparecerá no rastreamento de pilha.

## Personalizando rastreamentos de pilha

Ao contrário do Java, onde o rastreamento de pilha de uma exceção é um valor estruturado que permite a inspeção do estado da pilha, a propriedade de pilha no V8 apenas contém uma string plana com o rastreamento de pilha formatado. Isto é apenas por razões de compatibilidade com outros navegadores. No entanto, isso não está codificado, mas apenas o comportamento padrão e pode ser substituído por scripts de usuários.

Por eficiência, rastreamentos de pilha não são formatados quando são capturados, mas sob demanda, na primeira vez que a propriedade de pilha é acessada. Um rastreamento de pilha é formatado chamando

```js
Error.prepareStackTrace(error, structuredStackTrace)
```

e usando o que essa chamada retorna como o valor da propriedade `stack`. Se você atribuir um valor de função diferente a `Error.prepareStackTrace`, essa função será utilizada para formatar rastreamentos de pilha. Ela recebe o objeto de erro para o qual está preparando um rastreamento de pilha, bem como uma representação estruturada da pilha. Os formatadores de rastreamentos de pilha do usuário têm liberdade para formatar o rastreamento da pilha como quiserem e até mesmo retornar valores não-string. É seguro manter referências ao objeto de rastreamento de pilha estruturado após uma chamada para `prepareStackTrace` ser concluída, para que seja também um valor de retorno válido. Note que a função personalizada `prepareStackTrace` só é chamada uma vez quando a propriedade stack do objeto `Error` é acessada.

O rastreamento de pilha estruturado é um array de objetos `CallSite`, cada um dos quais representa um quadro da pilha. Um objeto `CallSite` define os seguintes métodos

- `getThis`: retorna o valor de `this`
- `getTypeName`: retorna o tipo de `this` como uma string. Este é o nome da função armazenada no campo de construtor de `this`, se disponível, caso contrário, a propriedade interna `[[Class]]` do objeto.
- `getFunction`: retorna a função atual
- `getFunctionName`: retorna o nome da função atual, tipicamente sua propriedade `name`. Se uma propriedade `name` não estiver disponível, tenta-se inferir um nome a partir do contexto da função.
- `getMethodName`: retorna o nome da propriedade de `this` ou de um de seus protótipos que contém a função atual
- `getFileName`: se essa função foi definida em um script, retorna o nome do script
- `getLineNumber`: se essa função foi definida em um script, retorna o número da linha atual
- `getColumnNumber`: se essa função foi definida em um script, retorna o número da coluna atual
- `getEvalOrigin`: se essa função foi criada usando uma chamada para `eval`, retorna uma string representando o local onde `eval` foi chamado
- `isToplevel`: esta é uma invocação de nível superior, ou seja, é o objeto global?
- `isEval`: esta chamada ocorre em código definido por uma chamada para `eval`?
- `isNative`: esta chamada está em código nativo do V8?
- `isConstructor`: esta é uma chamada de construtor?
- `isAsync`: esta é uma chamada assíncrona (ou seja, `await`, `Promise.all()` ou `Promise.any()`)?
- `isPromiseAll`: esta é uma chamada assíncrona para `Promise.all()`?
- `getPromiseIndex`: retorna o índice do elemento de promessa que foi seguido em `Promise.all()` ou `Promise.any()` para rastreamentos de pilha assíncronos, ou `null` se o `CallSite` não for uma chamada assíncrona de `Promise.all()` ou `Promise.any()`.

O rastreamento de pilha padrão é criado usando a API CallSite, então qualquer informação disponível lá também está acessível por meio dessa API.

Para manter as restrições impostas a funções em modo estrito, quadros que possuem uma função em modo estrito e todos os quadros abaixo (seu chamador etc.) não podem acessar seus objetos receptores e funções. Para esses quadros, `getFunction()` e `getThis()` retornam `undefined`.

## Compatibilidade

A API descrita aqui é específica do V8 e não é suportada por nenhuma outra implementação de JavaScript. A maioria das implementações fornece uma propriedade `error.stack`, mas o formato do rastreamento de pilha provavelmente será diferente do formato descrito aqui. O uso recomendado dessa API é:

- Confie no layout do rastreamento de pilha formatado apenas se você souber que seu código está sendo executado no V8.
- É seguro definir `Error.stackTraceLimit` e `Error.prepareStackTrace`, independentemente de qual implementação esteja executando seu código, mas esteja ciente de que isso só tem efeito se seu código estiver sendo executado no V8.

## Apêndice: Formato de rastreamento de pilha

O formato de rastreamento de pilha padrão usado pelo V8 pode, para cada quadro de pilha, fornecer as seguintes informações:

- Se a chamada é uma chamada construtora.
- O tipo do valor `this` (`Type`).
- O nome da função chamada (`functionName`).
- O nome da propriedade deste ou de um de seus protótipos que contém a função (`methodName`).
- A localização atual dentro da fonte (`location`)

Qualquer uma dessas informações pode estar indisponível e formatos diferentes para quadros de pilha são usados dependendo de quanto dessa informação está disponível. Se todas as informações acima estiverem disponíveis, um quadro de pilha formatado se parecerá com:

```
at Type.functionName [as methodName] (location)
```

Ou, no caso de uma chamada construtora:

```
at new functionName (location)
```

Ou, no caso de uma chamada assíncrona:

```
at async functionName (location)
```

Se apenas um de `functionName` e `methodName` estiver disponível, ou se ambos estiverem disponíveis mas forem iguais, o formato será:

```
at Type.name (location)
```

Se nenhum estiver disponível, `<anonymous>` será usado como nome.

O valor `Type` é o nome da função armazenado no campo de construtor de `this`. No V8, todas as chamadas de construtor definem essa propriedade na função construtora, então, a menos que esse campo tenha sido alterado ativamente após o objeto ser criado, ele contém o nome da função que o criou. Se estiver indisponível, a propriedade `[[Class]]` do objeto será usada.

Um caso especial é o objeto global, onde o `Type` não é mostrado. Nesse caso, o quadro de pilha é formatado como:

```
at functionName [as methodName] (location)
```

A localização em si tem vários formatos possíveis. O mais comum é o nome do arquivo, número da linha e número da coluna dentro do script que definiu a função atual:

```
fileName:lineNumber:columnNumber
```

Se a função atual foi criada usando `eval`, o formato é:

```
eval at position
```

...onde `position` é a posição completa onde a chamada para `eval` ocorreu. Observe que isso significa que posições podem ser aninhadas se houver chamadas aninhadas para `eval`, por exemplo:

```
eval em Foo.a (eval em Bar.z (myscript.js:10:3))
```

Se uma stack frame está dentro das bibliotecas do V8, a localização é:

```
nativo
```

…e se não estiver disponível, é:

```
localização desconhecida
```
