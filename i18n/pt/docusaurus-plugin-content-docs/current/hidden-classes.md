---
title: 'Mapas (Classes Ocultas) no V8'
description: 'Como o V8 rastreia e otimiza a estrutura percebida de seus objetos?'
---

Vamos mostrar como o V8 constrói suas classes ocultas. As principais estruturas de dados são:

- `Map`: a própria classe oculta. É o primeiro valor de ponteiro em um objeto e, portanto, permite fácil comparação para ver se dois objetos têm a mesma classe.
- `DescriptorArray`: A lista completa de propriedades que esta classe possui junto com informações sobre elas. Em alguns casos, o valor da propriedade está até mesmo neste array.
- `TransitionArray`: Um array de "arestas" desta `Map` para mapas irmãos. Cada aresta é um nome de propriedade, e deve ser pensado como "se eu adicionar uma propriedade com este nome à classe atual, para qual classe eu faria a transição?"

Como muitos objetos `Map` têm apenas uma transição para outro (ou seja, eles são mapas "transicionais", usados apenas como caminho para algo mais), o V8 nem sempre cria um `TransitionArray` completo para ele. Em vez disso, ele simplesmente se conecta diretamente a este "próximo" `Map`. O sistema precisa investigar um pouco no `DescriptorArray` do `Map` sendo apontado para descobrir o nome associado à transição.

Este é um assunto extremamente rico. Também está sujeito a mudanças, mas se você entender os conceitos deste artigo, mudanças futuras devem ser compreensíveis de forma incremental.

## Por que ter classes ocultas?

O V8 poderia funcionar sem classes ocultas, claro. Ele trataria cada objeto como um conjunto de propriedades. No entanto, um princípio muito útil teria sido deixado de lado: o princípio do design inteligente. O V8 presume que você criará apenas um número limitado de tipos **diferentes** de objetos. E cada tipo de objeto será usado de maneiras que eventualmente podem ser vistas como estereotipadas. Eu digo "eventualmente podem ser vistas" porque a linguagem JavaScript é uma linguagem de script, não pré-compilada. Então o V8 nunca sabe o que virá a seguir. Para fazer uso do design inteligente (isto é, a suposição de que há uma mente por trás do código que chega), o V8 tem que observar e esperar, permitindo que o senso de estrutura se infiltre. O mecanismo de classe oculta é o principal meio de fazer isso. Claro, pressupõe um mecanismo sofisticado de escuta, e esses são os Inline Caches (ICs) sobre os quais muito já foi escrito.

Então, se você está convencido de que este é um bom e necessário trabalho, siga comigo!

## Um exemplo

```javascript
function Peak(nome, altura, extra) {
  this.nome = nome;
  this.altura = altura;
  if (isNaN(extra)) {
    this.experiencia = extra;
  } else {
    this.prominencia = extra;
  }
}

m1 = new Peak("Matterhorn", 4478, 1040);
m2 = new Peak("Wendelstein", 1838, "bom");
```

Com este código, já temos uma interessante árvore de mapas a partir do mapa raiz (também conhecido como o mapa inicial) que está ligado à função `Peak`:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-one.svg" width="400" height="480" alt="Exemplo de classe oculta" loading="lazy"/>
</figure>

Cada caixa azul é um mapa, começando com o mapa inicial. Este é o mapa do objeto retornado se de alguma forma conseguirmos executar a função `Peak` sem adicionar uma única propriedade. Os mapas subsequentes são aqueles resultantes da adição das propriedades indicadas pelos nomes nas arestas entre os mapas. Cada mapa tem uma lista de propriedades associadas a um objeto desse mapa. Além disso, descreve a localização exata de cada propriedade. Finalmente, a partir de um desses mapas, digamos, `Map3`, que é a classe oculta do objeto que você obterá se passar um número para o argumento `extra` em `Peak()`, você pode seguir um link de volta até o mapa inicial.

Vamos desenhá-lo novamente com estas informações extras. A anotação (i0), (i1), significa local do campo no objeto 0, 1, etc.:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-two.svg" width="400" height="480" alt="Exemplo de classe oculta" loading="lazy"/>
</figure>

Agora, se você gastar tempo examinando esses mapas antes de criar pelo menos 7 objetos `Peak`, encontrará **rastreamento de folga**, que pode ser confuso. Eu tenho [outro artigo](https://v8.dev/blog/slack-tracking) sobre isso. Basta criar mais 7 objetos e o processo será concluído. A partir deste ponto, seus objetos Peak terão exatamente 3 propriedades no objeto, sem possibilidade de adicionar mais diretamente no objeto. Quaisquer propriedades adicionais serão descarregadas para o armazenamento de suporte de propriedades do objeto. É apenas um array de valores de propriedade, cujo índice vem do mapa (Bem, tecnicamente, do `DescriptorArray` vinculado ao mapa). Vamos adicionar uma propriedade a `m2` em uma nova linha e olhar novamente para a árvore de mapas:

```javascript
m2.custo = "um braço, uma perna";
```

<figure>
  <img src="/_img/docs/hidden-classes/drawing-three.svg" width="400" height="480" alt="Exemplo de classe oculta" loading="lazy"/>
</figure>

Eu adicionei algo aqui secretamente. Observe que todas as propriedades estão anotadas com "const," o que significa que, do ponto de vista do V8, ninguém nunca as alterou desde o construtor, então elas podem ser consideradas constantes após serem inicializadas. O TurboFan (o compilador otimizador) adora isso. Digamos que `m2` seja referenciado como uma constante global por uma função. Então a busca por `m2.cost` pode ser feita durante o tempo de compilação, já que o campo está marcado como constante. Retornarei a isso mais adiante no artigo.

Observe que a propriedade "cost" está marcada como `const p0`, o que significa que é uma propriedade constante armazenada no índice zero no **armazenamento de propriedades** em vez de diretamente no objeto. Isso acontece porque não temos mais espaço no objeto. Essas informações são visíveis em `%DebugPrint(m2)`:

```
d8> %DebugPrint(m2);
DebugPrint: 0x2f9488e9: [JS_OBJECT_TYPE]
 - map: 0x219473fd <Map(HOLEY_ELEMENTS)> [FastProperties]
 - protótipo: 0x2f94876d <Object map = 0x21947335>
 - elements: 0x419421a1 <FixedArray[0]> [HOLEY_ELEMENTS]
 - propriedades: 0x2f94aecd <PropertyArray[3]> {
    0x419446f9: [String] in ReadOnlySpace: #name: 0x237125e1
        <String[11]: #Wendelstein> (campo de dados constante 0)
    0x23712581: [String] in OldSpace: #height:
        1838 (campo de dados constante 1)
    0x23712865: [String] in OldSpace: #experience: 0x237125f9
        <String[4]: #good> (campo de dados constante 2)
    0x23714515: [String] in OldSpace: #cost: 0x23714525
        <String[16]: #one arm, one leg>
        (campo de dados constante 3) propriedades[0]
 }
 ...
{name: "Wendelstein", height: 1, experience: "good", cost: "one arm, one leg"}
d8>
```

Você pode ver que temos 4 propriedades, todas marcadas como const. As primeiras 3 no objeto, e a última em `properties[0]`, que significa o primeiro slot do armazenamento de propriedades. Podemos verificar isso:

```
d8> %DebugPrintPtr(0x2f94aecd)
DebugPrint: 0x2f94aecd: [PropertyArray]
 - map: 0x41942be9 <Map>
 - length: 3
 - hash: 0
         0: 0x23714525 <String[16]: #one arm, one leg>
       1-2: 0x41942329 <undefinido>
```

As propriedades extras estão lá caso você decida adicionar mais de repente.

## A estrutura real

Há diferentes coisas que poderíamos fazer neste ponto, mas, já que você deve realmente gostar do V8, tendo lido até aqui, gostaria de tentar desenhar as estruturas de dados reais que usamos, as mencionadas no início: `Map`, `DescriptorArray` e `TransitionArray`. Agora que você tem alguma ideia do conceito de classe oculta sendo construído nos bastidores, também pode ajustar seu pensamento mais próximo ao código usando os nomes e estruturas corretos. Deixe-me tentar reproduzir aquela última figura na representação do V8. Primeiro, vou desenhar os **DescriptorArrays**, que contêm a lista de propriedades para um dado Map. Esses arrays podem ser compartilhados -- a chave para isso é que o próprio Map sabe quantas propriedades ele pode olhar no DescriptorArray. Como as propriedades estão na ordem em que foram adicionadas no tempo, esses arrays podem ser compartilhados por vários mapas. Veja:

<figure>
  <img src="/_img/docs/hidden-classes/drawing-four.svg" width="600" height="480" alt="Exemplo de classe oculta" loading="lazy"/>
</figure>

Observe que **Map1**, **Map2** e **Map3** apontam para **DescriptorArray1**. O número próximo ao campo "descriptors" em cada Map indica quantos campos no DescriptorArray pertencem ao Map. Assim, **Map1**, que só conhece a propriedade "name", olha apenas para a primeira propriedade listada em **DescriptorArray1**. Enquanto **Map2** tem duas propriedades, "name" e "height." Então ele olha para os primeiros e segundos itens em **DescriptorArray1** (name e height). Esse tipo de compartilhamento economiza muito espaço.

Naturalmente, não podemos compartilhar onde há separação. Há uma transição de Map2 para Map4 se a propriedade "experience" for adicionada, e para Map3 se a propriedade "prominence" for adicionada. Você pode ver Map4 e Map5 compartilhando DescriptorArray2 da mesma maneira que DescriptorArray1 foi compartilhado entre três Maps.

A única coisa ausente em nosso diagrama "realista" é o `TransitionArray`, que ainda é metafórico neste ponto. Vamos mudar isso. Tomei a liberdade de remover as linhas do **ponteiro de retorno**, o que limpa um pouco as coisas. Basta lembrar que, a partir de qualquer Map na árvore, você também pode subir pela árvore.

<figure>
  <img src="/_img/docs/hidden-classes/drawing-five.svg" width="600" height="480" alt="Exemplo de classe oculta" loading="lazy"/>
</figure>

O diagrama recompensa o estudo. **Pergunta: o que aconteceria se uma nova propriedade "rating" fosse adicionada depois de "name" em vez de seguir para "height" e outras propriedades?**

**Resposta**: Map1 receberia um verdadeiro **TransitionArray** para acompanhar a bifurcação. Se a propriedade *height* for adicionada, devemos fazer a transição para **Map2**. No entanto, se propriedade *rating* for adicionada, devemos ir para um novo mapa, **Map6**. Esse mapa precisaria de um novo DescriptorArray que menciona *name* e *rating*. O objeto tem slots extras livres neste ponto no objeto (apenas um de três está usado), então a propriedade *rating* receberá um desses slots.

*Verifiquei minha resposta com a ajuda de `%DebugPrintPtr()` e desenhei o seguinte:*

<figure>
  <img src="/_img/docs/hidden-classes/drawing-six.svg" width="500" height="480" alt="Exemplo de classe oculta" loading="lazy"/>
</figure>

Não precisa me implorar para parar, vejo que este é o limite superior de tais diagramas! Mas acho que você pode ter uma ideia de como as partes se movem. Apenas imagine se, após adicionar esta propriedade artificial *rating*, continuássemos com *height*, *experience* e *cost*. Bem, teríamos que criar mapas **Map7**, **Map8** e **Map9**. Porque insistimos em adicionar essa propriedade no meio de uma cadeia já estabelecida de mapas, duplicaremos muito da estrutura. Não tenho coragem de fazer esse desenho -- embora, se você me enviar, eu adicionarei a este documento :).

Eu usei o prático projeto [DreamPuf](https://dreampuf.github.io/GraphvizOnline) para fazer os diagramas facilmente. Aqui está um [link](https://dreampuf.github.io/GraphvizOnline/#digraph%20G%20%7B%0A%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%233F53FF%22%5D%0A%20%20edge%20%5Bfontname%3DHelvetica%5D%0A%20%20%0A%20%20Map0%20%5Blabel%3D%22%7B%3Ch%3E%20Map0%20%7C%20%3Cd%3E%20descriptors%20(0)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map1%20%5Blabel%3D%22%7B%3Ch%3E%20Map1%20%7C%20%3Cd%3E%20descriptors%20(1)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%3B%0A%20%20Map2%20%5Blabel%3D%22%7B%3Ch%3E%20Map2%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(2)%7D%22%5D%3B%0A%20%20Map3%20%5Blabel%3D%22%7B%3Ch%3E%20Map3%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map4%20%5Blabel%3D%22%7B%3Ch%3E%20Map4%20%7C%20%3Cd%3E%20descriptors%20(3)%20%7C%20%3Ct%3E%20transitions%20(1)%7D%22%5D%0A%20%20Map5%20%5Blabel%3D%22%7B%3Ch%3E%20Map5%20%7C%20%3Cd%3E%20descriptors%20(4)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%0A%20%20Map6%20%5Blabel%3D%22%7B%3Ch%3E%20Map6%20%7C%20%3Cd%3E%20descriptors%20(2)%20%7C%20%3Ct%3E%20transitions%20(0)%7D%22%5D%3B%0A%20%20Map0%3At%20-%3E%20Map1%20%5Blabel%3D%22name%20(inferred)%22%5D%3B%0A%20%20%0A%20%20Map4%3At%20-%3E%20Map5%20%5Blabel%3D%22cost%20(inferred)%22%5D%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20descriptor%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22black%22%2C%20style%3Dfilled%2C%20color%3D%22%23FFB34D%22%5D%3B%0A%20%20%0A%20%20DA0%20%5Blabel%3D%22%7BDescriptorArray0%20%7C%20(empty)%7D%22%5D%0A%20%20Map0%3Ad%20-%3E%20DA0%3B%0A%20%20DA1%20%5Blabel%3D%22%7BDescriptorArray1%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20prominence%20(const%20i2)%7D%22%5D%3B%0A%20%20Map1%3Ad%20-%3E%20DA1%3B%0A%20%20Map2%3Ad%20-%3E%20DA1%3B%0A%20%20Map3%3Ad%20-%3E%20DA1%3B%0A%20%20%0A%20%20DA2%20%5Blabel%3D%22%7BDescriptorArray2%20%7C%20name%20(const%20i0)%20%7C%20height%20(const%20i1)%20%7C%20experience%20(const%20i2)%20%7C%20cost%20(const%20p0)%7D%22%5D%3B%0A%20%20Map4%3Ad%20-%3E%20DA2%3B%0A%20%20Map5%3Ad%20-%3E%20DA2%3B%0A%20%20%0A%20%20DA3%20%5Blabel%3D%22%7BDescriptorArray3%20%7C%20name%20(const%20i0)%20%7C%20rating%20(const%20i1)%7D%22%5D%3B%0A%20%20Map6%3Ad%20-%3E%20DA3%3B%0A%20%20%0A%20%20%2F%2F%20Create%20the%20transition%20arrays%0A%20%20node%20%5Bfontname%3DHelvetica%2C%20shape%3D%22record%22%2C%20fontcolor%3D%22white%22%2C%20style%3Dfilled%2C%20color%3D%22%23B3813E%22%5D%3B%0A%20%20TA0%20%5Blabel%3D%22%7BTransitionArray0%20%7C%20%3Ca%3E%20experience%20%7C%20%3Cb%3E%20prominence%7D%22%5D%3B%0A%20%20Map2%3At%20-%3E%20TA0%3B%0A%20%20TA0%3Aa%20-%3E%20Map4%3Ah%3B%0A%20%20TA0%3Ab%20-%3E%20Map3%3Ah%3B%0A%20%20%0A%20%20TA1%20%5Blabel%3D%22%7BTransitionArray1%20%7C%20%3Ca%3E%20rating%20%7C%20%3Cb%3E%20height%7D%22%5D%3B%0A%20%20Map1%3At%20-%3E%20TA1%3B%0A%20%20TA1%3Ab%20-%3E%20Map2%3B%0A%20%20TA1%3Aa%20-%3E%20Map6%3B%0A%7D) para o diagrama anterior.

## TurboFan e propriedades constantes

Até agora, todos esses campos estão marcados no `DescriptorArray` como `const`. Vamos brincar com isso. Execute o seguinte código em uma compilação debug:

```javascript
// execute como:
// d8 --allow-natives-syntax --no-lazy-feedback-allocation --code-comments --print-opt-code
function Peak(name, height) {
  this.name = name;
  this.height = height;
}

let m1 = new Peak("Matterhorn", 4478);
m2 = new Peak("Wendelstein", 1838);

// Certifique-se de que o rastreamento de espaço acabou.
for (let i = 0; i < 7; i++) new Peak("blah", i);

m2.cost = "um braço, uma perna";
function foo(a) {
  return m2.cost;
}

foo(3);
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Você terá uma impressão da função otimizada `foo()`. O código é muito curto. Você verá no final da função:

```
...
40  mov eax,0x2a812499          ;; objeto: 0x2a812499 <String[16]: #um braço, uma perna>
45  mov esp,ebp
47  pop ebp
48  ret 0x8                     ;; retorna "um braço, uma perna"!
```

O TurboFan, sendo um pequeno travesso, apenas inseriu diretamente o valor de `m2.cost`. O que acha disso!

Claro, após essa última chamada para `foo()` você poderia inserir esta linha:

```javascript
m2.cost = "inestimável";
```

O que você acha que vai acontecer? Uma coisa é certa, não podemos deixar o `foo()` como está. Ele retornaria a resposta errada. Execute novamente o programa, mas adicione a flag `--trace-deopt` para ser informado quando o código otimizado for removido do sistema. Após a impressão do `foo()` otimizado, você verá estas linhas:

```
[marcando código dependente 0x5c684901 0x21e525b9 <SharedFunctionInfo foo> (opt #0) para desotimização,
    motivo: field-const]
[desotimizar código marcado em todos os contextos]
```

Uau.

<figure>
  <img src="/_img/docs/hidden-classes/i_like_it_a_lot.gif" width="440" height="374" alt="Gosto muito disso" loading="lazy"/>
</figure>

Se você forçar a reotimização, obterá um código que não é tão bom, mas ainda se beneficia muito da estrutura Map que estamos descrevendo. Lembre-se, a partir dos nossos diagramas, que a propriedade *cost* é a primeira propriedade na
armazenagem de propriedades de suporte de um objeto. Bem, ela pode ter perdido sua designação const, mas ainda temos o endereço dela. Basicamente, em um objeto com o mapa **Map5**, o que certamente verificaremos que a variável global `m2` ainda possui, só precisamos--

1. carregar a armazenagem de propriedades de suporte, e
2. ler o primeiro elemento do array.

Vamos ver isso. Adicione este código abaixo da última linha:

```javascript
// Forçar a reotimização de foo().
foo(3);
%OptimizeFunctionOnNextCall(foo);
foo(3);
```

Agora veja o código produzido:

```
...
40  mov ecx,0x42cc8901          ;; objeto: 0x42cc8901 <Peak map = 0x3d5873ad>
45  mov ecx,[ecx+0x3]           ;; Carregar a armazenagem de propriedades de suporte
48  mov eax,[ecx+0x7]           ;; Obter o primeiro elemento.
4b  mov esp,ebp
4d  pop ebp
4e  ret 0x8                     ;; retornar no registrador eax!
```

Ora, isso é exatamente o que dissemos que deveria acontecer. Talvez estejamos começando a Saber.

TurboFan também é inteligente o suficiente para desotimizar se a variável `m2` mudar para uma classe diferente. Você pode ver o último código otimizado desotimizar novamente com algo divertido como:

```javascript
m2 = 42;  // haha.
```

## Onde ir a partir daqui

Muitas opções. Migração de mapas. Modo de dicionário (também conhecido como "modo lento"). Muito a explorar nesta área e espero que você se divirta tanto quanto eu -- obrigado por ler!
