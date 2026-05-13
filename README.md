# RH Vision

Plataforma de recrutamento e gestão operacional com arquitetura multi-tenant, painel `Super Admin`, controle de contratos, gestão de vagas, candidatos, ferramentas de RH e rotas públicas.

## Visão geral

- painel root para criar clientes, contratos e acessos
- gestão de vagas com fluxo público e interno
- cadastro e acompanhamento de candidatos
- importação de currículos
- controle de permissões por perfil e por módulo
- base preparada para migração com Prisma + MySQL

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Express
- SQLite no runtime atual
- Prisma preparado para MySQL

## Requisitos

- Node.js 22
- npm
- MySQL local opcional, caso você queira usar o fluxo Prisma

## Instalação

```bash
npm install
```

## Ambiente

Use o arquivo [`.env.example`](.env.example) como base.

Variáveis principais:

- `PORT`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SQLITE_DB_PATH`
- `DATABASE_URL`

## Rodando em desenvolvimento

Ative o Node 22 e suba o servidor:

```powershell
nvs use 22
npm run dev
```

Aplicação local:

- `http://localhost:3000`

## Build

```powershell
nvs use 22
npm run build
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:baseline
npm run db:status
```

## Banco de dados

Hoje o runtime principal ainda usa SQLite via [`src/lib/db.ts`](src/lib/db.ts).

O projeto também já está preparado para evolução com Prisma + MySQL:

- schema em [`prisma/schema.prisma`](prisma/schema.prisma)
- migração inicial em [`prisma/migrations/0001_init/migration.sql`](prisma/migrations/0001_init/migration.sql)
- utilitário em [`scripts/migrate.js`](scripts/migrate.js)

Guia detalhado:

- [docs/database-setup.md](docs/database-setup.md)

## Rotas principais

- `/login`
- `/welcome`
- `/dashboard`
- `/aurora-ai`
- `/vagas`
- `/candidatos`
- `/importar-cvs`
- `/ferramentas`
- `/administracao`
- `/super-admin`
- `/portal`
- `/public/tools/:slug`

## Estrutura resumida

```text
src/
  components/
    ui/
  lib/
  pages/
  services/
prisma/
docs/
server.ts
index.html
```

## Documentação interna

- [docs/database-setup.md](docs/database-setup.md)
- [docs/ui-screen-map.md](docs/ui-screen-map.md)

## Status atual

- layout operacional e shell root já separados
- favicon e título do navegador personalizados
- navegação do `Super Admin` pela sidebar root
- build validado com Node 22
