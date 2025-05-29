---
title: "Mitigações de código não confiável"
description: "Se você integrar o V8 e executar código JavaScript não confiável, habilite as mitigações do V8 para ajudar a proteger contra ataques especulativos de canal lateral."
---
No início de 2018, pesquisadores do Project Zero do Google divulgaram [uma nova classe de ataques](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) que [exploram](https://security.googleblog.com/2018/01/more-details-about-mitigations-for-cpu_4.html) otimizações de execução especulativa usadas por muitos CPUs. Como o V8 usa um compilador JIT otimizado, TurboFan, para executar JavaScript rapidamente, em certas circunstâncias ele é vulnerável aos ataques de canal lateral descritos na divulgação.

## Nada muda se você executar apenas código confiável

Se o seu produto usa apenas uma instância incorporada do V8 para executar código JavaScript ou WebAssembly que está totalmente sob seu controle, o uso do V8 provavelmente não é afetado pela vulnerabilidade de Ataques Especulativos de Canal Lateral (SSCA). Um exemplo não afetado é uma instância do Node.js executando apenas código de sua confiança.

Para tirar proveito da vulnerabilidade, um atacante precisa executar código JavaScript ou WebAssembly cuidadosamente elaborado no seu ambiente incorporado. Se, como desenvolvedor, você tem controle completo sobre o código executado na sua instância incorporada do V8, é muito improvável que isso seja possível. No entanto, se sua instância incorporada do V8 permitir que códigos JavaScript ou WebAssembly arbitrários ou não confiáveis sejam baixados e executados, ou até mesmo gerar e subsequentemente executar código JavaScript ou WebAssembly que não está totalmente sob seu controle (por exemplo, se usar qualquer um como alvo de compilação), você pode precisar considerar mitigações.

## Se você executar código não confiável…

### Atualize para a versão mais recente do V8 para aproveitar as mitigações e habilite as mitigações

Mitigações para esta classe de ataques estão disponíveis no próprio V8 a partir do [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1), portanto, atualizar sua cópia incorporada do V8 para [v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1) ou posterior é recomendado. As versões anteriores do V8, incluindo versões do V8 que ainda usam FullCodeGen e/ou CrankShaft, não possuem mitigações para SSCA.

A partir do [V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1), uma nova flag foi introduzida no V8 para ajudar a fornecer proteção contra vulnerabilidades SSCA. Esta flag, chamada `--untrusted-code-mitigations`, é habilitada por padrão em tempo de execução através de uma flag GN de tempo de compilação chamada `v8_untrusted_code_mitigations`.

Essas mitigações são ativadas pela flag de tempo de execução `--untrusted-code-mitigations`:

- Mascaramento de endereços antes de acessos de memória no WebAssembly e asm.js para garantir que cargas de memória executadas especulativamente não possam acessar memória fora dos heaps de WebAssembly e asm.js.
- Mascaramento dos índices no código JIT usado para acessar arrays e strings JavaScript em caminhos executados especulativamente para garantir que cargas especulativas não possam acessar endereços de memória que não devem ser acessíveis ao código JavaScript.

Os incorporadores devem estar cientes de que as mitigações podem trazer uma redução no desempenho. O impacto real depende significativamente da sua carga de trabalho. Para cargas de trabalho como o Speedometer o impacto é negligenciável, mas para cargas de trabalho computacional mais extremas pode chegar a até 15%. Se você confia plenamente no código JavaScript e WebAssembly que sua instância incorporada do V8 executa, pode optar por desativar essas mitigações de JIT especificando a flag `--no-untrusted-code-mitigations` em tempo de execução. A flag GN `v8_untrusted_code_mitigations` pode ser usada para habilitar ou desabilitar as mitigações no momento de compilação.

Note que o V8 desativa essas mitigações por padrão em plataformas onde se presume que o incorporador usará isolamento de processo, como plataformas onde o Chromium usa isolamento de sites.

### Isolar a execução não confiável em um processo separado

Se você executar códigos JavaScript e WebAssembly não confiáveis em um processo separado de qualquer dado sensível, o impacto potencial da SSCA é muito reduzido. Através do isolamento de processo, ataques SSCA só podem observar dados que estão isolados dentro do mesmo processo juntamente com o código executado, e não dados de outros processos.

### Considere ajustar seus temporizadores de alta precisão oferecidos

Um temporizador de alta precisão torna mais fácil observar canais laterais na vulnerabilidade SSCA. Se o seu produto oferecer temporizadores de alta precisão que podem ser acessados por código JavaScript ou WebAssembly não confiável, considere tornar esses temporizadores mais grosseiros ou adicionar variabilidade a eles.
