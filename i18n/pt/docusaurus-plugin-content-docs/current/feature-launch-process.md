---
title: &apos;Implementação e envio de recursos de linguagem JavaScript/WebAssembly&apos;
description: &apos;Este documento explica o processo de implementação e envio de recursos de linguagem JavaScript ou WebAssembly no V8.&apos;
---
Em geral, o V8 segue o [processo de intenção do Blink para padrões já definidos com base em consenso](https://www.chromium.org/blink/launching-features/#process-existing-standard) para recursos de linguagem JavaScript e WebAssembly. Erratas específicas do V8 são descritas abaixo. Por favor, siga o processo de intenção do Blink, a menos que as erratas indiquem o contrário.

Se você tiver perguntas sobre este tópico para recursos do JavaScript, envie um e-mail para syg@chromium.org e v8-dev@googlegroups.com.

Para recursos do WebAssembly, envie um e-mail para gdeepti@chromium.org e v8-dev@googlegroups.com.

## Erratas

### Recursos do JavaScript geralmente esperam até o Estágio 3+

Como regra geral, o V8 espera para implementar propostas de recursos de JavaScript até que avancem para o [Estágio 3 ou posterior no TC39](https://tc39.es/process-document/). O TC39 tem seu próprio processo de consenso, e o Estágio 3 ou posterior sinaliza consenso explícito entre os delegados do TC39, incluindo todos os fornecedores de navegadores, de que uma proposta de recurso está pronta para implementação. Esse processo externo de consenso significa que os recursos de Estágio 3+ não precisam enviar e-mails de intenção, exceto de Intenção para Enviar.

### Revisão TAG

Para recursos menores de JavaScript ou WebAssembly, uma revisão TAG não é necessária, já que o TC39 e o Wasm CG já fornecem supervisão técnica significativa. Se o recurso for grande ou abrangente (por exemplo, exigir alterações em outras APIs da Web Platform ou modificações no Chromium), é recomendada uma revisão TAG.

### Ambas flags do V8 e do blink são necessárias

Ao implementar um recurso, são necessárias tanto uma flag do V8 quanto uma `base::Feature` do blink.

Os recursos do Blink são necessários para que o Chrome possa desativar recursos sem distribuir novos binários em situações de emergência. Isso geralmente é implementado em [`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h), [`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc), e [`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc),

### Fuzzing é obrigatório para envio

Os recursos de JavaScript e WebAssembly devem passar por fuzzing por um período mínimo de 4 semanas ou um (1) marco de versão, com todos os bugs de fuzz corrigidos, antes de serem enviados.

Para recursos de JavaScript com código completo, inicie o fuzzing movendo a flag de recurso para a macro `JAVASCRIPT_STAGED_FEATURES_BASE` em [`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h).

Para WebAssembly, veja a [lista de verificação de envio do WebAssembly](/docs/wasm-shipping-checklist).

### [Chromestatus](https://chromestatus.com/) e etapas de revisão

O processo de intenção do Blink inclui uma série de etapas de revisão que devem ser aprovadas na entrada do recurso em [Chromestatus](https://chromestatus.com/) antes de uma Intenção de Enviar ser enviada buscando aprovações dos API OWNER.

Essas etapas são adaptadas a APIs da web, e algumas podem não ser aplicáveis a recursos de JavaScript e WebAssembly. A seguir está uma orientação ampla. Os detalhes diferem de recurso para recurso; não aplique as orientações cegamente!

#### Privacidade

A maioria dos recursos de JavaScript e WebAssembly não afeta a privacidade. Raramente, recursos podem adicionar novos vetores de identificação que revelam informações sobre o sistema operacional ou hardware do usuário.

#### Segurança

Embora JavaScript e WebAssembly sejam vetores comuns de ataques em exploits de segurança, a maioria dos novos recursos não adiciona uma superfície de ataque adicional. [Fuzzing](#fuzzing) é obrigatório e mitiga parte do risco.

Recursos que afetam vetores de ataque populares conhecidos, como `ArrayBuffer`s em JavaScript, e recursos que podem permitir ataques de canal lateral, precisam de mais escrutínio e devem ser revisados.

#### Empresarial

Ao longo de seu processo de padronização no TC39 e no Wasm CG, os recursos de JavaScript e WebAssembly já passam por uma séria análise de compatibilidade retroativa. É extremamente raro que recursos sejam intencionalmente incompatíveis com versões anteriores.

Para JavaScript, recursos enviados recentemente também podem ser desativados via `chrome://flags/#disable-javascript-harmony-shipping`.

#### Depurabilidade

A depurabilidade dos recursos de JavaScript e WebAssembly varia significativamente de recurso para recurso. Recursos do JavaScript que apenas adicionam novos métodos incorporados não precisam de suporte adicional no depurador, enquanto recursos do WebAssembly que adicionam novas capacidades podem exigir um suporte adicional significativo no depurador.

Para mais detalhes, veja a [lista de verificação de depuração de recursos do JavaScript](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9) e a [lista de verificação de depuração de recursos do WebAssembly](https://goo.gle/devtools-wasm-checklist).

Quando em dúvida, este gate é aplicável.

#### Teste

Em vez de WPT, os testes Test262 são suficientes para os recursos do JavaScript, e os testes da especificação WebAssembly são suficientes para os recursos do WebAssembly.

Adicionar Web Platform Tests (WPT) não é obrigatório, pois os recursos de linguagem JavaScript e WebAssembly possuem seus próprios repositórios de teste interoperáveis que são executados por várias implementações. Sinta-se à vontade para adicioná-los, se achar que é benéfico.

Para os recursos do JavaScript, testes de correção explícitos no [Test262](https://github.com/tc39/test262) são obrigatórios. Observe que os testes no [diretório staging](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging) são suficientes.

Para os recursos do WebAssembly, testes de correção explícitos no [repositório de testes da especificação WebAssembly](https://github.com/WebAssembly/spec/tree/master/test) são obrigatórios.

Para testes de desempenho, o JavaScript já sustenta a maioria dos benchmarks de desempenho existentes, como o Speedometer.

### Quem CC

**Todo** email de “intenção de `$algo`” (ex.: “intenção de implementar”) deve CC &lt;v8-users@googlegroups.com> além de &lt;blink-dev@chromium.org>. Dessa forma, outros incorporadores do V8 também são mantidos informados.

### Link para o repositório da especificação

O processo de Intenção do Blink exige um explicador. Em vez de escrever um novo documento, sinta-se à vontade para vincular ao respectivo repositório de especificação (ex.: [`import.meta`](https://github.com/tc39/proposal-import-meta)).
