# Mochi Notes ✦

Um aplicativo desktop para transformar ideias soltas em um espaço organizado, bonito e só seu. Guarde notas, listas, arquivos e pequenos planos sem perder a leveza. ♡

## Recursos

- **Notas sem complicação** — crie, favorite, pesquise, arquive, restaure e consulte o histórico de versões.
- **Organização do seu jeitinho** — use pastas aninhadas, categorias, tags e filtros para deixar tudo no lugar.
- **Planos que saem do papel** — faça checklists, crie tarefas e comece com modelos para reunião, projeto, estudo, diário e semana.
- **Tudo pertinho** — anexe arquivos, importe planilhas `.xlsx` e `.csv` e mantenha o contexto em uma só tela.
- **Um espaço que combina com você** — escolha temas, preferências e o modo de visualização: biblioteca, dividido ou foco.

## Especificações

| Item | Detalhes |
| --- | --- |
| Plataforma | Windows (aplicativo desktop) |
| Interface | Electron + React + TypeScript |
| Dados locais | SQLite durante o desenvolvimento |
| Sincronização | Preparado para sincronização segura por conta em diferentes computadores |
| Arquivos | Anexos e importação de `.xlsx` e `.csv` |
| Requisitos para desenvolver | Node.js 20 ou superior |

## Instalação

### Windows

Abra a pasta `release/` e execute `Mochi Notes Setup <versão>.exe`. Depois, procure por **Mochi Notes** no Menu Iniciar. ✿

### Executar pelo código-fonte

```powershell
npm install
npm start
```

## Dados e privacidade

O Mochi Notes está sendo preparado para manter suas anotações acessíveis com segurança em mais de um computador. Cada conta terá seu próprio espaço protegido.

Enquanto a sincronização está em integração, os dados de desenvolvimento ficam em `.mochi-data`. Senhas nunca são armazenadas como texto simples.

## Desenvolvimento

```powershell
# Inicia a interface com atualização automática
npm run dev

# Confere o projeto antes de publicar uma mudança
npm run typecheck
npm run build

# Gera o instalador atualizado em release/
npm run dist
```

Feito com carinho para ideias bonitas. ✧
