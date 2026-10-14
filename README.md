# Mochi Notes

<p align="center">
  <img src="public/app-icon-256.png" width="112" alt="Ícone do Mochi Notes" />
</p>

<p align="center">
  <strong>Um espaço calmo, completo e pessoal para pensar, registrar e realizar.</strong><br />
  Notas, listas, planilhas e arquivos — organizados do seu jeito e guardados no seu computador.
</p>

<p align="center">
  <a href="#recursos">Recursos</a> ·
  <a href="#instalação">Instalação</a> ·
  <a href="#privacidade-e-dados-locais">Privacidade</a> ·
  <a href="#desenvolvimento">Desenvolvimento</a>
</p>

---

## Por que Mochi Notes?

Ideias importantes merecem um lugar que não interrompa o seu raciocínio. O Mochi Notes foi pensado como uma central de trabalho pessoal: simples para anotar algo rápido, estruturada para projetos contínuos e inteiramente sua.

- **Foco no conteúdo** — uma interface desktop acolhedora, com modos de visualização para biblioteca, painel dividido e concentração.
- **Organização flexível** — crie pastas aninhadas, categorias e etiquetas para encontrar qualquer nota pela sua própria lógica.
- **Do rascunho à ação** — transforme notas em tarefas e mantenha checklists junto do contexto em que elas surgiram.
- **Tudo reunido** — use modelos para reuniões, projetos, estudos, diário e planejamento semanal; armazene anexos e gerencie planilhas no mesmo espaço.
- **Histórico e segurança** — acompanhe revisões, favorite, arquive ou restaure notas quando precisar.

## Recursos

| Área | O que você encontra |
| --- | --- |
| Notas | Criação rápida, pesquisa, favoritos, lixeira, arquivamento e histórico de versões. |
| Organização | Pastas com hierarquia, categorias, tags e filtros para navegar sem fricção. |
| Produtividade | Checklists, tarefas e modelos prontos para diferentes contextos de trabalho. |
| Arquivos | Anexos e importação de planilhas `.xlsx` e `.csv`. |
| Experiência | Temas, preferências de interface e diferentes modos de visualização. |

## Instalação

### Windows

Execute o instalador mais recente disponível na pasta `release/` do projeto. Ele é criado com o nome `Mochi Notes Setup <versão>.exe`.

Depois da instalação, abra **Mochi Notes** pelo Menu Iniciar. O instalador é gerado a partir desta versão do código.

### Executar a partir do código-fonte

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou superior.

```powershell
npm install
npm start
```

## Privacidade e dados locais

O Mochi Notes funciona sem depender de um servidor para guardar suas informações. O banco SQLite, os anexos e as preferências ficam em `.mochi-data` dentro da pasta do projeto durante o uso em desenvolvimento.

As credenciais são armazenadas como hash criptográfico, nunca como senha em texto simples. Como os dados são locais, manter cópias de segurança da pasta de dados é a melhor forma de preservar seu acervo.

## Desenvolvimento

Para desenvolver com atualização automática da interface:

```powershell
npm run dev
```

Antes de enviar uma alteração, verifique o projeto:

```powershell
npm run typecheck
npm run build
```

Para gerar uma nova versão instalável do aplicativo:

```powershell
npm run dist
```

O instalador é criado em `release/`, junto com a versão desempacotada para testes locais.

## Tecnologias

- Electron + React + TypeScript
- Vite
- SQLite

---

<p align="center">Feito para que suas ideias tenham um lugar só delas.</p>
