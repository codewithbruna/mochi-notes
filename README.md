# Mochi Notes ✦

<p align="center">
  <img src="public/mochi-readme-hero.png" alt="Mochi Notes: caderno lilás, chá de morango e flores em uma mesa cor-de-rosa" width="100%" />
</p>

<p align="center">
  <img src="public/app-icon-256.png" width="72" alt="Ícone do Mochi Notes" />
</p>

<h3 align="center">Seu pequeno universo de ideias, feito para florescer. ♡</h3>

<p align="center">
  Um cantinho bonito e inteligente para guardar planos, listas, notas, arquivos e todas aquelas ideias que merecem ser lembradas.
</p>

<p align="center">
  <a href="#o-que-tem-por-aqui">Recursos</a> ·
  <a href="#instalação">Instalação</a> ·
  <a href="#sua-conta-e-seus-dados">Sua conta</a> ·
  <a href="#para-desenvolver">Desenvolvimento</a>
</p>

---

## Para dias cheios de ideias ✿

O Mochi Notes transforma o seu espaço digital em algo gostoso de usar. Ele foi feito para a pessoa que anota uma inspiração antes de dormir, planeja a semana com carinho, guarda referências de projetos e quer encontrar tudo sem perder o fio da meada.

> **Menos bagunça, mais espaço para você.**

### O que tem por aqui?

| ✦ | Seu espaço Mochi |
| :-- | :-- |
| **Notas que acompanham você** | Crie notas rápidas, favoritas, arquive, recupere da lixeira e reveja versões anteriores. |
| **Tudo no seu lugar** | Organize com pastas aninhadas, categorias, tags e filtros feitos para a sua lógica. |
| **Planos viram realidade** | Faça checklists, transforme uma nota em tarefa e use modelos para reuniões, estudos, diário, projetos e semanas especiais. |
| **Seu acervo inteiro** | Adicione anexos, importe planilhas `.xlsx` e `.csv` e mantenha o contexto pertinho da nota. |
| **Do seu jeitinho** | Escolha temas, preferências e o modo de visualização que combina com o seu momento: biblioteca, dividido ou foco. |

## Instalação

### Windows ♡

Abra a pasta `release/` e execute `Mochi Notes Setup <versão>.exe`. Depois é só procurar por **Mochi Notes** no Menu Iniciar e começar a preencher seu cantinho.

### Pelo código-fonte

Você vai precisar do [Node.js](https://nodejs.org/) 20 ou superior.

```powershell
npm install
npm start
```

## Sua conta e seus dados

O Mochi Notes está sendo preparado para manter seu conteúdo seguro e acessível mesmo quando você troca de computador. A sincronização de conta permitirá abrir o mesmo universo de notas em diferentes máquinas, mantendo cada espaço separado e protegido.

Durante o desenvolvimento, os dados locais ficam em `.mochi-data`. As senhas nunca são salvas como texto simples.

## Para desenvolver

```powershell
# Interface com atualização automática
npm run dev

# Verificar qualidade e gerar a versão de produção
npm run typecheck
npm run build

# Criar um novo instalador Windows em release/
npm run dist
```

## Feito com carinho usando

`Electron` · `React` · `TypeScript` · `Vite` · `SQLite`

---

<p align="center">
  <strong>Um lugar bonito para ideias bonitas. ✧</strong><br />
  Feito para você criar, sonhar e lembrar.
</p>
