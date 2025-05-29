---
title: "Integridade do Fluxo de Controle no V8"
description: "Este post no blog discute os planos para implementar a integridade do fluxo de controle no V8."
author: "Stephen Röttger"
date: 2023-10-09
tags:
 - segurança
---
A integridade do fluxo de controle (CFI) é uma funcionalidade de segurança que visa impedir que explorações assumam o controle do fluxo de controle. A ideia é que, mesmo que um invasor consiga corromper a memória de um processo, verificações adicionais de integridade podem impedir que executem código arbitrário. Neste post no blog, queremos discutir nosso trabalho para habilitar o CFI no V8.

<!--truncate-->
# Antecedentes

A popularidade do Chrome torna-o um alvo valioso para ataques de dia zero (0-day), e a maioria dos exploits em ambiente real que vimos têm como alvo o V8 para obter execução inicial de código. Exploits do V8 normalmente seguem um padrão semelhante: um bug inicial leva à corrupção de memória, mas frequentemente a corrupção inicial é limitada e o invasor precisa encontrar uma maneira de ler/escrever de forma arbitrária em todo o espaço de endereços. Isso lhes permite assumir o controle do fluxo de controle e executar shellcode que realiza o próximo passo da cadeia de exploração, que tentará escapar do sandbox do Chrome.


Para impedir que o invasor transforme corrupção de memória em execução de shellcode, estamos implementando a integridade do fluxo de controle no V8. Isso é especialmente desafiador na presença de um compilador JIT. Se você transforma dados em código de máquina em tempo de execução, agora é necessário garantir que dados corrompidos não possam se transformar em código malicioso. Felizmente, os recursos modernos de hardware nos fornecem os blocos de construção para projetar um compilador JIT que seja robusto mesmo ao processar memória corrompida.


A seguir, analisaremos o problema dividido em três partes separadas:

- **CFI de Borda Direta (Forward-Edge CFI)** verifica a integridade de transferências indiretas de fluxo de controle, como ponteiros de função ou chamadas de vtable.
- **CFI de Borda Reversa (Backward-Edge CFI)** garante que endereços de retorno lidos da pilha sejam válidos.
- **Integridade da Memória JIT** valida todos os dados que são escritos na memória executável em tempo de execução.

# CFI de Borda Direta

Existem dois recursos de hardware que queremos usar para proteger chamadas e saltos indiretos: landing pads e autenticação de ponteiros.


## Landing Pads

Landing pads são instruções especiais que podem ser usadas para marcar alvos válidos de ramificação. Se ativadas, ramificações indiretas só podem saltar para uma instrução de landing pad; qualquer outra coisa gerará uma exceção.
No ARM64, por exemplo, landing pads estão disponíveis com o recurso Identificação do Alvo de Ramificação (BTI) introduzido no Armv8.5-A. O suporte ao BTI já está [ativado](https://bugs.chromium.org/p/chromium/issues/detail?id=1145581) no V8.  
No x64, landing pads foram introduzidas com a parte de Rastreamento de Ramificação Indireta (IBT) da tecnologia de Enforcement de Fluxo de Controle (CET).


No entanto, adicionar landing pads a todos os alvos potenciais para ramificações indiretas nos proporciona apenas uma integridade de fluxo de controle de controle grosseiro e ainda dá muita liberdade aos invasores. Podemos restringir ainda mais as restrições adicionando verificações de assinatura de função (os tipos de argumento e retorno no local de chamada devem corresponder à função chamada), bem como removendo dinamicamente instruções de landing pad desnecessárias em tempo de execução.
Esses recursos fazem parte da recente [proposta FineIBT](https://arxiv.org/abs/2303.16353), e esperamos que ela obtenha adoção em sistemas operacionais.

## Autenticação de Ponteiros

O Armv8.3-A introduziu a autenticação de ponteiros (PAC), que pode ser usada para incorporar uma assinatura nos bits superiores não utilizados de um ponteiro. Como a assinatura é verificada antes que o ponteiro seja usado, os invasores não poderão fornecer ponteiros arbitrários falsificados para ramificações indiretas.

# CFI de Borda Reversa

Para proteger endereços de retorno, também queremos fazer uso de dois recursos de hardware separados: pilhas sombreadas e PAC.

## Pilhas Sombreadas

Com as pilhas sombreadas do Intel CET e a pilha de controle protegida (GCS) no [Armv9.4-A](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022), podemos ter uma pilha separada apenas para endereços de retorno que possui proteções de hardware contra gravações maliciosas. Esses recursos oferecem proteções bastante fortes contra sobrescritas de endereços de retorno, mas precisaremos lidar com casos em que modifiquemos legitimamente a pilha de retorno, como durante otimização/desotimização e tratamento de exceções.

## Autenticação de Ponteiros (PAC-RET)

Semelhante às ramificações indiretas, a autenticação de ponteiros pode ser usada para assinar endereços de retorno antes de serem empurrados para a pilha. Isso já está [ativado](https://bugs.chromium.org/p/chromium/issues/detail?id=919548) no V8 em CPUs ARM64.


Um efeito colateral do uso de suporte de hardware para CFI de Borda Direta e Reversa é que isso permitirá que mantenhamos o impacto no desempenho ao mínimo.

# Integridade da Memória JIT

Um desafio único para CFI em compiladores JIT é que precisamos escrever código de máquina na memória executável em tempo de execução. Precisamos proteger essa memória de forma que o compilador JIT possa escrever nela, mas o primitivo de gravação de memória do atacante não possa. Uma abordagem ingênua seria alterar temporariamente as permissões da página para adicionar/remover acesso de gravação. Porém, isso é inerentemente arriscado, pois precisamos assumir que o atacante pode acionar uma gravação arbitrária simultaneamente a partir de uma segunda thread.


## Permissões de Memória por Thread

Em CPUs modernas, podemos ter diferentes visões das permissões de memória que se aplicam apenas à thread atual e podem ser alteradas rapidamente no espaço do usuário.
Em CPUs x64, isso pode ser alcançado com chaves de proteção de memória (pkeys), e a ARM anunciou as [extensões de sobreposição de permissões](https://community.arm.com/arm-community-blogs/b/architectures-and-processors-blog/posts/arm-a-profile-architecture-2022) no Armv8.9-A.
Isso nos permite alternar de forma detalhada o acesso de gravação à memória executável, por exemplo, marcando-a com uma pkey separada.


As páginas JIT agora não são mais graváveis pelo atacante, mas o compilador JIT ainda precisa escrever o código gerado nelas. No V8, o código gerado reside em [AssemblerBuffers](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/codegen/assembler.h;l=255;drc=064b9a7903b793734b6c03a86ee53a2dc85f0f80) no heap, que podem ser corrompidos pelo atacante. Poderíamos proteger também os AssemblerBuffers da mesma maneira, mas isso apenas desloca o problema. Por exemplo, teríamos também que proteger a memória onde o ponteiro para o AssemblerBuffer reside.
Na verdade, qualquer código que habilite o acesso de gravação a essa memória protegida constitui uma superfície de ataque de CFI e precisa ser codificado de forma muito defensiva. Por exemplo, qualquer gravação em um ponteiro que venha de memória desprotegida é uma falha completa, já que o atacante pode usá-lo para corromper memória executável. Assim, nossa meta de design é ter o mínimo possível dessas seções críticas e manter o código dentro delas curto e autocontido.

## Validação de Fluxo de Controle

Se não quisermos proteger todos os dados do compilador, podemos assumir que eles não são confiáveis do ponto de vista de CFI. Antes de escrever qualquer coisa na memória executável, precisamos validar que isso não levará a fluxos de controle arbitrários. Isso inclui, por exemplo, que o código escrito não execute instruções de syscall ou que ele não salte para códigos arbitrários. É claro, também precisamos verificar que ele não altera as permissões de pkey da thread atual. Observe que não tentamos impedir o código de corromper memória arbitrária, já que, se o código está corrompido, podemos assumir que o atacante já possui essa capacidade.
Para realizar essa validação com segurança, também precisaremos manter metadados necessários na memória protegida, além de proteger variáveis locais na pilha.
Realizamos alguns testes preliminares para avaliar o impacto dessa validação no desempenho. Felizmente, a validação não ocorre em caminhos de código críticos para o desempenho, e não observamos nenhuma regressão nos benchmarks jetstream ou speedometer.

# Avaliação

Pesquisa de segurança ofensiva é uma parte essencial de qualquer design de mitigação, e estamos continuamente tentando encontrar novas maneiras de contornar nossas proteções. Aqui estão alguns exemplos de ataques que achamos que serão possíveis e ideias para abordá-los.

## Argumentos de Syscall Corrompidos

Como mencionado antes, assumimos que um atacante pode acionar um primitivo de gravação de memória simultaneamente a outras threads em execução. Se outra thread executar um syscall, alguns dos argumentos poderiam ser controlados pelo atacante se forem lidos da memória. O Chrome opera com um filtro restritivo de syscall, mas ainda há alguns syscalls que poderiam ser usados para contornar as proteções de CFI.


O Sigaction, por exemplo, é um syscall para registrar manipuladores de sinal. Durante nossa pesquisa, descobrimos que uma chamada de sigaction no Chrome é acessível de forma compatível com CFI. Como os argumentos são passados na memória, um atacante poderia acionar esse caminho de código e apontar a função do manipulador de sinal para um código arbitrário. Felizmente, podemos resolver isso facilmente: bloquear o caminho até a chamada de sigaction ou bloqueá-lo com um filtro de syscall após a inicialização.


Outros exemplos interessantes são os syscalls de gerenciamento de memória. Por exemplo, se uma thread chamar munmap em um ponteiro corrompido, o atacante poderia desmapear páginas de leitura apenas, e uma chamada mmap consecutiva poderia reutilizar esse endereço, efetivamente adicionando permissões de gravação à página.
Alguns sistemas operacionais já fornecem proteções contra esse ataque com selagem de memória: plataformas da Apple fornecem a [VM\_FLAGS\_PERMANENT](https://github.com/apple-oss-distributions/xnu/blob/1031c584a5e37aff177559b9f69dbd3c8c3fd30a/osfmk/mach/vm_statistics.h#L274), e OpenBSD possui um syscall [mimmutable](https://man.openbsd.org/mimmutable.2).

## Corrupção de Frame de Sinal

Quando o kernel executa um manipulador de sinal, ele salva o estado atual da CPU na pilha do espaço do usuário. Uma segunda thread poderia corromper o estado salvo, que seria então restaurado pelo kernel.
Proteger contra isso no espaço do usuário parece difícil se os dados de frame de sinal não são confiáveis. Nesse ponto, seria necessário sempre sair ou sobrescrever o frame de sinal com um estado conhecido para retornar.
Uma abordagem mais promissora seria proteger a pilha de sinal usando permissões de memória por thread. Por exemplo, uma sigaltstack marcada com pkey protegeria contra substituições maliciosas, mas exigiria que o kernel permitisse temporariamente permissões de gravação ao salvar o estado da CPU nela.

# v8CTF

Estes foram apenas alguns exemplos de ataques potenciais que estamos trabalhando em abordar e também queremos aprender mais com a comunidade de segurança. Se isso te interessa, teste suas habilidades no recém-lançado [v8CTF](https://security.googleblog.com/2023/10/expanding-our-exploit-reward-program-to.html)! Explore o V8 e ganhe uma recompensa, exploits visando vulnerabilidades n-day estão explicitamente no escopo!
