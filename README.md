# Mochi Notes

Aplicativo desktop de notas com dados locais, login e cadastro. Nada precisa ser enviado a um servidor para usar o app.

## Executar localmente

No PowerShell, dentro desta pasta:

```powershell
npm start
```

Para desenvolvimento com atualização automática da interface:

```powershell
npm run dev
```

## Dados locais

O banco SQLite e os anexos ficam em `.mochi-data` dentro desta pasta do projeto. A senha é armazenada como hash criptográfico, nunca em texto aberto.

## Verificação

```powershell
npm run typecheck
npm run build
```
