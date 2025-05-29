---
title: 'Mesclagem & aplicação de patches'
description: 'Este documento explica como mesclar patches do V8 para um branch de lançamento.'
---
Se você tem um patch no branch `main` (por exemplo, uma correção importante de bug) que precisa ser mesclado em um dos branches de lançamento do V8 (refs/branch-heads/12.5), continue lendo.

Os exemplos a seguir usam uma versão ramificada 12.3 do V8. Substitua `12.3` pelo número da sua versão. Leia a documentação sobre [números de versão do V8](/docs/version-numbers) para mais informações.

Um problema associado ao rastreador de problemas do V8 é **obrigatório** se um patch for mesclado. Isso ajuda a acompanhar as mesclagens.

## O que qualifica um candidato à mesclagem?

- O patch corrige um bug *grave* (em ordem de importância):
    1. Bug de segurança
    1. Bug de estabilidade
    1. Bug de correção
    1. Bug de desempenho
- O patch não altera APIs.
- O patch não altera o comportamento presente antes do corte do branch (exceto se a alteração de comportamento corrigir um bug).

Mais informações podem ser encontradas na [página relevante do Chromium](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md). Em caso de dúvida, envie um email para &lt;v8-dev@googlegroups.com>.

## O processo de mesclagem

O processo de mesclagem no rastreador do V8 é conduzido por atributos. Portanto, por favor, defina o atributo 'Merge-Request' para o marco relevante do Chrome. Caso a mesclagem afete apenas um [port](https://v8.dev/docs/ports) do V8, ajuste o atributo HW de forma correspondente. Exemplo:

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

Após a revisão, isso será ajustado durante a revisão para:

```
Merge: Approved-123
ou
Merge: Rejected-123
```

Depois que o CL for aceito, isso será ajustado mais uma vez para:

```
Merge: Merged-123, Merged-12.3
```

## Como verificar se um commit já foi mesclado/revertido/tem cobertura no Canary

Use [chromiumdash](https://chromiumdash.appspot.com/commit/) para verificar se o CL relevante tem cobertura no Canary.


No topo da seção **Releases** deve aparecer um Canary.

## Como criar o CL de mesclagem

### Opção 1: Usando o [gerrit](https://chromium-review.googlesource.com/) - Recomendado


1. Abra o CL que você deseja mesclar.
1. Selecione "Cherry pick" no menu expandido (três pontos verticais no canto superior direito).
1. Insira "refs/branch-heads/*XX.X*" como branch de destino (substitua *XX.X* pelo branch apropriado).
1. Modifique a mensagem de commit:
   1. Prefixe o título com "Merged: ".
   1. Remova linhas do rodapé que correspondem ao CL original ("Change-Id", "Reviewed-on", "Reviewed-by", "Commit-Queue", "Cr-Commit-Position"). Certifique-se de manter a linha "(cherry picked from commit XXX)", pois ela é necessária por algumas ferramentas para relacionar mesclagens aos CLs originais.
1. Em caso de conflito de mesclagem, também continue e crie o CL. Para resolver conflitos (se houver) - use a interface do Gerrit ou faça o download do patch localmente usando o comando "download patch" do menu (três pontos verticais no canto superior direito).
1. Enviar para revisão.

### Opção 2: Usando o script automatizado

Vamos supor que você está mesclando a revisão af3cf11 para o branch 12.2 (especifique hashes completos do git - abreviações são usadas aqui para simplicidade).

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```


### Após ser aceito: Observe o [waterfall do branch](https://ci.chromium.org/p/v8)

Se um dos builders não estiver verde após o tratamento do seu patch, reverta a mesclagem imediatamente. Um bot (`AutoTagBot`) cuida da versão correta após uma espera de 10 minutos.

## Aplicando patches a uma versão usada no Canary/Dev

Caso você precise aplicar um patch em uma versão Canary/Dev (o que não deve acontecer com frequência), inclua vahl@ ou machenbach@ na issue. Googlers: por favor, verifiquem o [site interno](http://g3doc/company/teams/v8/patching_a_version) antes de criar o CL.

