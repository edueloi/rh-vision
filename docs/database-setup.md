# Banco e Migração

Atualizado em 2026-05-09.

## O que foi preparado

- arquivo real `.env`
- template `.env.example`
- `prisma/schema.prisma`
- `prisma/init.sql`
- `scripts/migrate.js`
- scripts `db:*` no `package.json`

## Importante

Hoje o backend ainda executa as queries pelo arquivo [db.ts](/C:/Users/Eduardo/Desktop/rh-vision/src/lib/db.ts) usando `better-sqlite3`.

Ou seja:

- o runtime atual continua funcional em SQLite
- o Prisma foi preparado para iniciar a migração estrutural do banco para MySQL
- a próxima etapa, se você quiser trocar de vez para MySQL, é substituir as queries de `server.ts` por Prisma Client ou outro driver SQL

## Credenciais configuradas no `.env`

- usuário: `root`
- senha original informada: `Edu@06051992`
- senha codificada na URL: `Edu%4006051992`
- banco alvo: `rh_vision`

## Como subir o banco

1. Ative Node 22:

```powershell
nvs use 22
```

2. Instale as dependências:

```powershell
npm install
```

3. Garanta que o MySQL local esteja rodando.

4. Crie o banco:

```powershell
mysql -u root -p < prisma/init.sql
```

Quando o terminal pedir a senha, use:

```text
Edu@06051992
```

5. Rode a migração Prisma:

```powershell
npm run db:migrate
```

Se você já criou as tabelas manualmente pelo SQL inicial, use baseline em vez de tentar aplicar a `0001_init` de novo:

```powershell
npm run db:baseline
```

## Fluxo manual no MySQL Workbench

Se você rodar o SQL manualmente no Workbench, precisa selecionar o schema antes de criar as tabelas.

Opção 1:

- dê duplo clique em `rh_vision` na lista `SCHEMAS`
- depois execute o conteúdo de `prisma/migrations/0001_init/migration.sql`

Opção 2:

```sql
USE rh_vision;
```

e só então rode o SQL da migração.

Sem isso, o Workbench retorna:

```text
Error Code: 1046. No database selected
```

6. Suba o sistema:

```powershell
npm run dev
```

## Scripts disponíveis

- `npm run db:migrate`
  - roda `prisma migrate dev` com o nome `init`
- `npm run db:deploy`
  - roda `prisma migrate deploy`
- `npm run db:baseline`
  - marca a `0001_init` como aplicada quando o schema já foi criado manualmente
- `npm run db:generate`
  - gera o Prisma Client
- `npm run db:status`
  - mostra o status das migrações

## Observações sobre boas-vindas e super admin

- a tela de boas-vindas agora é controlada por usuário, não mais por uma flag global
- o `admin-root` volta sempre para a tela de `SuperAdmin`
- as telas autenticadas deixaram de usar `tenantId=develoi` fixo
- `units` e `users` agora são filtrados pelo `tenant_id` do usuário logado
