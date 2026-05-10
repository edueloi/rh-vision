# Mapa de Telas e Uso de UI

Atualizado em 2026-05-09.

## 1. Telas raiz renderizadas pelo `App.tsx`

| Tela | Origem de abertura | Status de uso | Status `ui/` |
| --- | --- | --- | --- |
| `Login.tsx` | quando não há `auth_user` | em uso | migrada para `../components/ui` |
| `Welcome.tsx` | após primeiro login | em uso | ainda usa HTML cru |
| `Dashboard.tsx` | aba `dashboard` | em uso | usa `@/src/components/ui` |
| `AuroraAI.tsx` | aba `nexusai` | em uso | parcial, imports diretos fora do barrel |
| `Jobs.tsx` | aba `jobs` | em uso | usa `@/src/components/ui` |
| `Candidates.tsx` | aba `candidates` | em uso | usa `@/src/components/ui` |
| `ImportResumes.tsx` | aba `import` | em uso | usa `@/src/components/ui` |
| `HRTools.tsx` | aba `tools` | em uso | usa `@/src/components/ui` |
| `Administration.tsx` | aba `admin` | em uso | migrada para `../components/ui` |
| `SuperAdmin.tsx` | usuário `admin-root` | em uso | migrada para `../components/ui` |
| `PublicPortal.tsx` | `?mode=portal` | em uso | usa `@/src/components/ui` |
| `PublicToolResponse.tsx` | caminho `/public/tools/...` | em uso | ainda usa HTML cru |

## 2. Subtelas internas usadas por outras páginas

| Tela | Usada por | Status de uso | Status `ui/` |
| --- | --- | --- | --- |
| `JobForm.tsx` | `Jobs.tsx` | em uso | usa `@/src/components/ui` |
| `JobDetails.tsx` | `Jobs.tsx` | em uso | usa `@/src/components/ui` |
| `CandidateForm.tsx` | `Candidates.tsx` | em uso | usa `@/src/components/ui` |
| `CandidateDetails.tsx` | `Candidates.tsx` | em uso | usa `@/src/components/ui` |

## 3. Arquivos de tela órfãos

No estado atual, **nenhum arquivo de `src/pages` está órfão**.

Todos os 16 arquivos em `src/pages` entram no fluxo por uma destas vias:

- render direto em `App.tsx`
- abertura condicional por estado interno
- composição dentro de `Jobs.tsx` ou `Candidates.tsx`

## 4. Pendências de padronização do kit `src/components/ui`

### Prioridade alta

- `App.tsx`
  - sidebar, header, busca global e botões ainda usam HTML cru
  - ainda importa `ToastProvider` direto do arquivo, não do barrel
- `PublicToolResponse.tsx`
  - usa `input`, `button` e cards próprios
  - é tela pública e deve ser estabilizada primeiro
- `Welcome.tsx`
  - tela importante de entrada, ainda sem `PanelCard`, `Button` ou `Badge`

### Prioridade média

- `AuroraAI.tsx`
  - usa `PanelCard` e `Toast`, mas com imports diretos
  - vale migrar para `@/src/components/ui` ou `../components/ui`
- padronizar estilo de import do kit
  - hoje existe mistura entre `../components/ui`
  - e `@/src/components/ui`

## 5. Quebras identificadas

- `PublicToolResponse.tsx`
  - estava lendo `slug` com `useParams()`
  - o app não declara `<Routes>` com `:slug`
  - resultado: a tela podia abrir sem `slug`
  - status: corrigido com leitura direta de `window.location.pathname`

## 6. Próxima sequência recomendada

1. Padronizar `App.tsx` para consumir o barrel de `src/components/ui`.
2. Migrar `PublicToolResponse.tsx` para `PanelCard`, `Input` e `Button`.
3. Migrar `Welcome.tsx` para o kit.
4. Unificar imports do projeto inteiro para um único padrão.
5. Só depois atacar refinos visuais das telas já em uso.
