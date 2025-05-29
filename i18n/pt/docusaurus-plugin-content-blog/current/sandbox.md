---
title: &apos;O Sandbox do V8&apos;
description: &apos;O V8 apresenta um sandbox leve e em processo para limitar o impacto de bugs de corrupção de memória&apos;
author: &apos;Samuel Groß&apos;
avatars:
  - samuel-gross
date: 2024-04-04
tags:
 - segurança
---

Após quase três anos desde o [documento de design inicial](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) e [centenas de CLs](https://github.com/search?q=repo%3Av8%2Fv8+%5Bsandbox%5D&type=commits&s=committer-date&o=desc) no período, o Sandbox do V8 — um sandbox leve e em processo para o V8 — progrediu ao ponto em que não é mais considerado um recurso experimental de segurança. A partir de hoje, o [Sandbox do V8 está incluído no Programa de Recompensa por Vulnerabilidades do Chrome](https://g.co/chrome/vrp/#v8-sandbox-bypass-rewards) (VRP). Embora ainda existam vários problemas a serem resolvidos antes que se torne uma barreira de segurança robusta, sua inclusão no VRP é um passo importante nessa direção. O Chrome 123 pode ser considerado uma espécie de versão "beta" para o sandbox. Este post de blog aproveita esta oportunidade para discutir a motivação por trás do sandbox, mostrar como ele impede que a corrupção de memória no V8 se espalhe dentro do processo host e, por fim, explicar por que ele é um passo necessário para a segurança de memória.

<!--truncate-->

# Motivação

A segurança de memória continua sendo um problema relevante: todas as explorações do Chrome [detectadas na natureza nos últimos três anos](https://docs.google.com/spreadsheets/d/1lkNJ0uQwbeC1ZTRrxdtuPLCIl7mlUreoKfSIgajnSyY/edit?usp=sharing) (2021 – 2023) começaram com uma vulnerabilidade de corrupção de memória em um processo do renderizador do Chrome que foi explorada para execução remota de código (RCE). Destas, 60% eram vulnerabilidades no V8. No entanto, há um porém: as vulnerabilidades do V8 raramente são bugs "clássicos" de corrupção de memória (uso após liberação, acessos fora dos limites, etc.) e, em vez disso, questões lógicas sutis que podem ser exploradas para corromper a memória. Como tal, as soluções de segurança de memória existentes, em sua maioria, não são aplicáveis ao V8. Em particular, nem [mudar para uma linguagem de segurança de memória](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps), como Rust, nem usar recursos atuais ou futuros de segurança de memória de hardware, como [marcação de memória](https://newsroom.arm.com/memory-safety-arm-memory-tagging-extension), podem ajudar com os desafios de segurança enfrentados pelo V8 hoje.

Para entender por que, considere uma vulnerabilidade altamente simplificada e hipotética em um motor JavaScript: a implementação de `JSArray::fizzbuzz()`, que substitui valores na matriz que são divisíveis por 3 por "fizz", divisíveis por 5 por "buzz" e divisíveis por ambos 3 e 5 por "fizzbuzz". Abaixo está uma implementação dessa função em C++. `JSArray::buffer_` pode ser considerado como um `JSValue*`, ou seja, um ponteiro para uma matriz de valores JavaScript, e `JSArray::length_` contém o tamanho atual desse buffer.

```cpp
 1. for (int index = 0; index < length_; index++) {
 2.     JSValue js_value = buffer_[index];
 3.     int value = ToNumber(js_value).int_value();
 4.     if (value % 15 == 0)
 5.         buffer_[index] = JSString("fizzbuzz");
 6.     else if (value % 5 == 0)
 7.         buffer_[index] = JSString("buzz");
 8.     else if (value % 3 == 0)
 9.         buffer_[index] = JSString("fizz");
10. }
```

Parece simples o suficiente? No entanto, há um bug um pouco sutil aqui: a conversão `ToNumber` na linha 3 pode ter efeitos colaterais, pois pode invocar callbacks JavaScript definidos pelo usuário. Um desses callbacks poderia então reduzir o tamanho da matriz, causando uma gravação fora dos limites posteriormente. O código JavaScript abaixo provavelmente causaria corrupção de memória:

```js
let array = new Array(100);
let evil = { [Symbol.toPrimitive]() { array.length = 1; return 15; } };
array.push(evil);
// No índice 100, o callback @@toPrimitive de |evil| é invocado na
// linha 3 acima, reduzindo a matriz para comprimento 1 e realocando seu
// buffer de suporte. A gravação subsequente (linha 5) ocorre fora dos limites.
array.fizzbuzz();
```

Note que essa vulnerabilidade poderia ocorrer tanto em código de runtime escrito à mão (como no exemplo acima) quanto em código de máquina gerado em runtime por um compilador JIT otimizado (se a função fosse implementada em JavaScript em vez disso). No primeiro caso, o programador concluiria que uma verificação explícita de limites para as operações de armazenamento não é necessária, já que esse índice acabou de ser acessado. No último caso, seria o compilador tirando a mesma conclusão incorreta durante uma das suas etapas de otimização (por exemplo, [eliminação de redundância](https://en.wikipedia.org/wiki/Partial-redundancy_elimination) ou [eliminação de verificação de limites](https://en.wikipedia.org/wiki/Bounds-checking_elimination)), porque não modela corretamente os efeitos colaterais de `ToNumber()`.

Embora este seja um bug artificialmente simples (esse padrão específico de bug tornou-se praticamente extinto devido a melhorias nos fuzzers, conscientização dos desenvolvedores e atenção dos pesquisadores), ainda é útil entender por que as vulnerabilidades nos motores de JavaScript modernos são difíceis de mitigar de forma genérica. Considere a abordagem de usar uma linguagem de programação segura para memória como o Rust, onde é responsabilidade do compilador garantir a segurança da memória. No exemplo acima, uma linguagem segura para memória provavelmente evitaria esse bug no código de tempo de execução escrito manualmente usado pelo interpretador. No entanto, *não* evitaria o bug em qualquer compilador just-in-time, pois o bug neste caso seria um problema de lógica, não uma vulnerabilidade "clássica" de corrupção de memória. Somente o código gerado pelo compilador realmente causaria qualquer corrupção de memória. Fundamentamentalmente, o problema é que *a segurança de memória não pode ser garantida pelo compilador se o compilador fizer parte diretamente da superfície de ataque*.

De maneira semelhante, desabilitar os compiladores JIT também seria apenas uma solução parcial: historicamente, aproximadamente metade dos bugs descobertos e explorados no V8 afetaram um de seus compiladores, enquanto o restante estava em outros componentes, como funções de runtime, o interpretador, o coletor de lixo ou o parser. Usar uma linguagem segura para memória nesses componentes e remover os compiladores JIT poderia funcionar, mas isso reduziria significativamente o desempenho do mecanismo (variando, dependendo do tipo de carga de trabalho, de 1,5 a 10× ou mais para tarefas intensivas em computação).

Agora considere, em vez disso, mecanismos populares de segurança de hardware, em particular [marcação de memória](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-1.html). Existem várias razões pelas quais a marcação de memória também não seria uma solução eficaz. Por exemplo, canais laterais da CPU, que podem [ser explorados facilmente a partir de JavaScript](https://security.googleblog.com/2021/03/a-spectre-proof-of-concept-for-spectre.html), poderiam ser abusados para vazar valores de tags, permitindo que um atacante contornasse a mitigação. Além disso, devido à [compressão de ponteiros](https://v8.dev/blog/pointer-compression), atualmente não há espaço para os bits de tag nos ponteiros do V8. Assim, toda a região do heap teria que ser marcada com a mesma tag, tornando impossível detectar corrupção entre objetos. Como tal, enquanto a marcação de memória [pode ser muito eficaz em certas superfícies de ataque](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-2-mitigation.html), é improvável que represente um grande obstáculo para atacantes no caso de motores de JavaScript.

Resumidamente, motores modernos de JavaScript tendem a conter bugs complexos de lógica de segunda ordem que oferecem primitivas de exploração poderosas. Estes não podem ser efetivamente protegidos pelas mesmas técnicas usadas para vulnerabilidades típicas de corrupção de memória. No entanto, quase todas as vulnerabilidades encontradas e exploradas no V8 hoje têm uma coisa em comum: a eventual corrupção de memória necessariamente acontece dentro do heap do V8 porque o compilador e o runtime (quase) operam exclusivamente em instâncias de `HeapObject` do V8. É aqui que o sandbox entra em ação.


# O Sandbox (Heap) do V8

A ideia básica por trás do sandbox é isolar a memória (heap) do V8 para que qualquer corrupção de memória ali não possa "se espalhar" para outras partes da memória do processo.

Como exemplo motivador para o design do sandbox, considere a [separação entre espaço de usuário e espaço de kernel](https://en.wikipedia.org/wiki/User_space_and_kernel_space) em sistemas operacionais modernos. Historicamente, todos os aplicativos e o núcleo do sistema operacional compartilhavam o mesmo espaço de endereço de memória (física). Assim, qualquer erro de memória em um aplicativo de usuário poderia derrubar todo o sistema, por exemplo, corrompendo a memória do núcleo. Por outro lado, em um sistema operacional moderno, cada aplicativo no espaço de usuário tem seu próprio espaço de endereço (virtual) dedicado. Assim, qualquer erro de memória é limitado ao aplicativo em si, e o restante do sistema é protegido. Em outras palavras, um aplicativo defeituoso pode se falhar, mas não afetar o restante do sistema. De maneira semelhante, o V8 Sandbox tenta isolar o código JavaScript/WebAssembly não confiável executado pelo V8 para que um bug no V8 não afete o restante do processo de hospedagem.

Em princípio, [o sandbox poderia ser implementado com suporte de hardware](https://docs.google.com/document/d/12MsaG6BYRB-jQWNkZiuM3bY8X2B2cAsCMLLdgErvK4c/edit?usp=sharing): semelhante à divisão entre espaço de usuário e núcleo, o V8 executaria uma instrução de mudança de modo ao entrar ou sair do código isolado, que tornaria a CPU incapaz de acessar memória fora do sandbox. Na prática, nenhum recurso de hardware adequado está disponível atualmente, e o sandbox atual é, portanto, implementado puramente em software.

A ideia básica por trás do [sandbox baseado em software](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing) é substituir todos os tipos de dados que podem acessar memória fora do sandbox por alternativas "compatíveis com sandbox". Em particular, todos os ponteiros (tanto para objetos no heap do V8 quanto em outros locais na memória) e tamanhos de 64 bits devem ser removidos, pois um atacante poderia corrompê-los para acessar posteriormente outras memórias no processo. Isso implica que regiões de memória, como a pilha, não podem estar dentro do sandbox, já que devem conter ponteiros (por exemplo, endereços de retorno) devido a restrições de hardware e sistema operacional. Como tal, com o sandbox baseado em software, apenas o heap do V8 está dentro do sandbox, e a construção geral, portanto, não é muito diferente do [modelo de sandbox usado pelo WebAssembly](https://webassembly.org/docs/security/).

Para entender como isso funciona na prática, é útil observar os passos que um exploit precisa realizar após corromper a memória. O objetivo de um exploit RCE geralmente seria realizar um ataque de escalonamento de privilégios, por exemplo, executando shellcode ou efetuando um ataque no estilo de programação orientada a retorno (ROP). Para qualquer uma dessas opções, o exploit primeiro deseja a capacidade de ler e gravar memória arbitrária no processo, por exemplo, para corromper um ponteiro de função ou colocar uma carga útil ROP em algum lugar na memória e redirecionar para ela. Dado um bug que corrompe a memória no heap V8, um invasor, portanto, procuraria por um objeto como o seguinte:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    byte* buffer_;
    size_t size_;
};
```

Dado isso, o invasor então corromperia o ponteiro do buffer ou o valor do tamanho para construir uma operação primitiva de leitura/gravação arbitrária. Este é o passo que a sandbox visa impedir. Em particular, com a sandbox ativada, e assumindo que o buffer referenciado está localizado dentro da sandbox, o objeto acima se tornaria:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    sandbox_ptr_t buffer_;
    sandbox_size_t size_;
};
```

Onde `sandbox_ptr_t` é um deslocamento de 40 bits (no caso de uma sandbox de 1TB) a partir da base da sandbox. Similarmente, `sandbox_size_t` é um tamanho "compatível com a sandbox", [atualmente limitado a 32GB](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-internal.h;l=231;drc=5bdda7d5edcac16b698026b78c0eec6d179d3573).
Alternativamente, se o buffer referenciado estivesse localizado fora da sandbox, o objeto se tornaria:

```cpp
class JSArrayBuffer: public JSObject {
  private:
    external_ptr_t buffer_;
};
```

Aqui, um `external_ptr_t` referencia o buffer (e seu tamanho) através de uma tabela de ponteiros indireta (não muito diferente da [tabela de descritores de arquivo de um kernel unix](https://en.wikipedia.org/wiki/File_descriptor) ou de uma [WebAssembly.Table](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Table)) que fornece garantias de segurança de memória.

Em ambos os casos, o invasor não seria capaz de "alcançar" algo fora da sandbox em outras partes do espaço de endereços. Em vez disso, ele precisaria primeiro de uma vulnerabilidade adicional: um bypass da Sandbox V8. A imagem a seguir resume o design em alto nível, e o leitor interessado pode encontrar mais detalhes técnicos sobre a sandbox nos documentos de design vinculados a partir de [`src/sandbox/README.md`](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/sandbox/README.md).

![Um diagrama de alto nível do design da sandbox](/_img/sandbox/sandbox.svg)

Somente converter ponteiros e tamanhos para uma representação diferente não é suficiente em um aplicativo tão complexo como o V8 e há [uma série de outros problemas](https://issues.chromium.org/hotlists/4802478) que precisam ser corrigidos. Por exemplo, com a introdução da sandbox, um código como o seguinte subitamente se torna problemático:

```cpp
std::vector<std::string> JSObject::GetPropertyNames() {
    int num_properties = TotalNumberOfProperties();
    std::vector<std::string> properties(num_properties);

    for (int i = 0; i < NumberOfInObjectProperties(); i++) {
        properties[i] = GetNameOfInObjectProperty(i);
    }

    // Lidar com outros tipos de propriedades
    // ...
```

Este código faz a suposição (razoável) de que o número de propriedades armazenadas diretamente em um JSObject deve ser menor que o número total de propriedades desse objeto. No entanto, assumindo que esses números são simplesmente armazenados como inteiros em algum lugar no JSObject, um invasor poderia corromper um deles para quebrar este invariante. Subsequentemente, o acesso ao `std::vector` (fora da sandbox) ficaria fora dos limites. Adicionar uma verificação explícita de limites, por exemplo com um [`SBXCHECK`](https://chromium.googlesource.com/v8/v8.git/+/0deeaf5f593b98d6a6a2bb64e3f71d39314c727c), resolveria isso.

Animadoramente, quase todas as "violações da sandbox" descobertas até agora são como esta: bugs triviais (de 1ª ordem) de corrupção de memória, como uso depois de liberar ou acessos fora dos limites devido à falta de uma verificação de limites. Contrariamente às vulnerabilidades de 2ª ordem tipicamente encontradas no V8, esses bugs da sandbox poderiam na verdade ser prevenidos ou mitigados pelas abordagens discutidas anteriormente. Na verdade, o bug particular acima já seria mitigado hoje devido ao [endurecimento do libc++ do Chrome](http://issues.chromium.org/issues/40228527). Assim, a esperança é que, a longo prazo, a sandbox se torne uma **barreira de segurança mais defensável** do que o próprio V8. Embora o conjunto atual de dados de bugs da sandbox seja muito limitado, a integração do VRP lançada hoje ajudará, esperançosamente, a produzir uma visão mais clara do tipo de vulnerabilidades encontradas na superfície de ataque da sandbox.

## Desempenho

Uma grande vantagem dessa abordagem é que ela é fundamentalmente barata: a sobrecarga causada pela sandbox vem principalmente da indireção da tabela de ponteiros para objetos externos (custando aproximadamente um carregamento adicional de memória) e, em menor escala, do uso de deslocamentos em vez de ponteiros brutos (custando principalmente apenas uma operação de deslocamento+adição, que é muito barata). A sobrecarga atual da sandbox é, portanto, de apenas cerca de 1% ou menos em cargas de trabalho típicas (medidas usando os conjuntos de benchmarks [Speedometer](https://browserbench.org/Speedometer3.0/) e [JetStream](https://browserbench.org/JetStream/)). Isso permite que a Sandbox V8 seja ativada por padrão em plataformas compatíveis.

## Teste

Uma característica desejável para qualquer limite de segurança é a testabilidade: a capacidade de testar manualmente e automaticamente que as garantias de segurança prometidas realmente se mantêm na prática. Isso requer um modelo claro de atacante, uma maneira de "emular" um atacante e, idealmente, uma maneira de determinar automaticamente quando o limite de segurança falhou. O V8 Sandbox atende a todos esses requisitos:

1. **Um modelo claro de atacante:** assume-se que um atacante pode ler e escrever arbitrariamente dentro do V8 Sandbox. O objetivo é prevenir a corrupção de memória fora do sandbox.
2. **Uma maneira de emular um atacante:** o V8 fornece uma "API de corrupção de memória" quando compilado com a flag `v8_enable_memory_corruption_api = true`. Isso emula os primitivos obtidos de vulnerabilidades típicas do V8 e, em particular, fornece acesso completo de leitura e gravação dentro do sandbox.
3. **Uma maneira de detectar "violações do sandbox":** o V8 fornece um modo de "teste de sandbox" (ativado via `--sandbox-testing` ou `--sandbox-fuzzing`) que instala um [manipulador de sinal](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/sandbox/testing.cc;l=425;drc=97b7d0066254778f766214d247b65d01f8a81ebb) que determina se um sinal como `SIGSEGV` representa uma violação das garantias de segurança do sandbox.

Por fim, isso permite que o sandbox seja integrado ao programa VRP do Chrome e seja testado por fuzzers especializados.

## Uso

O V8 Sandbox deve ser ativado/desativado no momento da construção usando a flag de construção `v8_enable_sandbox`. Por razões técnicas, não é possível ativar/desativar o sandbox em tempo de execução. O V8 Sandbox requer um sistema de 64 bits, pois precisa reservar uma grande quantidade de espaço de endereço virtual, atualmente um terabyte.

O V8 Sandbox já foi habilitado por padrão em versões de 64 bits (especificamente x64 e arm64) do Chrome no Android, ChromeOS, Linux, macOS e Windows por aproximadamente os últimos dois anos. Embora o sandbox não fosse (e ainda não seja) totalmente funcional, isso foi feito principalmente para garantir que ele não causasse problemas de estabilidade e para coletar estatísticas de desempenho do mundo real. Consequentemente, explorações recentes do V8 já tiveram que passar pelo sandbox, fornecendo feedback inicial útil sobre suas propriedades de segurança.


# Conclusão

O V8 Sandbox é um novo mecanismo de segurança projetado para evitar que a corrupção de memória no V8 impacte outra memória no processo. O sandbox é motivado pelo fato de que as tecnologias atuais de segurança de memória são amplamente inaplicáveis a motores otimizadores de JavaScript. Embora essas tecnologias falhem em prevenir corrupção de memória no próprio V8, elas podem, de fato, proteger a superfície de ataque do V8 Sandbox. Portanto, o sandbox é um passo necessário para garantir a segurança da memória.
