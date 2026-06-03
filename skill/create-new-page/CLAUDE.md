# Guia de Criação de Novas Páginas — RH Vision

Este arquivo define o processo completo e obrigatório para criar qualquer nova tela no projeto.
A IA deve ler este documento inteiro antes de escrever uma linha de código.

---

## PASSO 0 — Perguntar antes de criar

Antes de criar qualquer tela, a IA **deve perguntar ao usuário**:

1. **Nome da tela** — qual será o nome do arquivo e do componente? (ex: `Reports`, `TeamManagement`)
2. **O que a tela precisa ter** — quais seções, dados, ações, filtros?
3. **Rota da tela** — qual será o path? (ex: `/relatorios`, `/equipe`)
4. **Comunica com outras telas?** — a tela lê ou muda dados que afetam outra tela já existente?

Só começar a implementar depois que essas perguntas forem respondidas.

---

## PASSO 1 — Ler o guia de componentes

**OBRIGATÓRIO:** antes de criar qualquer elemento visual, ler completamente:

```
skill/use-component/CLAUDE.md
```

Verificar **todos** os componentes disponíveis. Nunca criar botão, input, badge, modal, drawer, toast, tabela, paginação, filtro ou card do zero — sempre usar o componente existente.

Se a tela precisar de algo que **não existe** nos componentes:
1. Criar o novo componente em `src/components/ui/NomeComponente.tsx`
2. Exportar no barrel `src/components/ui/index.ts`
3. Documentar no `skill/use-component/CLAUDE.md` seguindo o padrão existente
4. Só então usar na tela

---

## PASSO 2 — Registrar a rota no App.tsx

Toda nova tela precisa ser registrada em `src/App.tsx`.

### 2a — Importar o componente da página

```tsx
// src/App.tsx — adicionar no bloco de imports de páginas
import NomeDaTela from "./pages/NomeDaTela";
```

### 2b — Adicionar no menu (se aparecer na navegação)

```tsx
// src/App.tsx — APP_MENU_ITEMS
const APP_MENU_ITEMS: MenuItem[] = [
  // ... itens existentes ...
  {
    path: "/nome-da-rota",
    label: "Nome do Menu",
    helper: "Descrição curta da seção",
    icon: IconeLucide,
    permissionKey: "chave_de_permissao",
  },
];
```

### 2c — Adicionar a Route no bloco de rotas

```tsx
// Dentro do <Routes> no App.tsx
<Route path="/nome-da-rota" element={<NomeDaTela />} />
```

### Chaves de permissão disponíveis (`permissionKey`)

| Chave | Acesso |
|-------|--------|
| `dashboard` | Dashboard |
| `aurora_ai` | Aurora AI / Matches |
| `jobs` | Vagas e Aprovações |
| `candidates` | Candidatos |
| `imports` | Importar CVs |
| `tools` | Ferramentas / DISC |
| `administration` | Administração / Configurações |
| `super_admin` | Apenas root admin |

---

## PASSO 3 — Estrutura obrigatória do arquivo de página

**Local do arquivo:** `src/pages/NomeDaTela.tsx`

### Template base de página

```tsx
import React, { useState, useEffect, useCallback } from "react";
import { IconeLucide, OutroIcone } from "lucide-react";
import {
  PageWrapper,
  SectionTitle,
  Button,
  // ... outros componentes necessários
  useToast,
} from "@/src/components/ui";
import { getTenantId, getAuthUser } from "@/src/lib/auth";
import { getActionPermissions } from "@/src/lib/access";

export default function NomeDaTela() {
  const toast = useToast();
  const tenantId = getTenantId();
  const user = getAuthUser();
  const perms = getActionPermissions(user);

  // ── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TipoDosDados[]>([]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rota?tenantId=${tenantId}`);
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Cabeçalho */}
        <SectionTitle
          title="Nome da Tela"
          subtitle="Descrição curta"
          icon={<IconeLucide size={20} />}
          actions={
            perms.canEdit && (
              <Button iconLeft={<OutroIcone size={15} />} onClick={() => {}}>
                Ação Principal
              </Button>
            )
          }
        />

        {/* Conteúdo */}
        {/* ... */}

      </div>
    </PageWrapper>
  );
}
```

---

## PASSO 4 — Regras de responsividade (OBRIGATÓRIO)

Toda tela deve funcionar perfeitamente nos seguintes dispositivos:

| Dispositivo | Largura de referência |
|-------------|----------------------|
| iPhone SE / Android pequeno | 375px |
| iPhone 14 / Android médio | 390px–430px |
| iPad / Tablet | 768px–1024px |
| Notebook pequeno | 1280px |
| Desktop / Notebook grande | 1440px+ |

### Regras de padding e espaçamento

Sempre usar padding responsivo no container raiz da página:

```tsx
// CORRETO — padding que cresce com a tela
<div className="p-4 sm:p-6 lg:p-8 space-y-6">

// ERRADO — padding fixo
<div className="p-8 space-y-6">
```

### Regras de grid e colunas

```tsx
// 1 coluna no mobile, 2 no tablet, 4 no desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// 1 coluna no mobile, 2 no desktop
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// 1 no mobile, 3 no desktop
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

### Regras de tipografia

```tsx
// Títulos responsivos
<h1 className="text-xl sm:text-2xl lg:text-3xl font-black">

// Subtítulos
<p className="text-xs sm:text-sm text-zinc-500">
```

### Regras de tabelas

Tabelas nunca podem quebrar o layout no mobile. Sempre envolver em scroll horizontal:

```tsx
// CORRETO
<div className="overflow-x-auto rounded-xl border border-zinc-200">
  <table className="w-full min-w-[600px]">
    ...
  </table>
</div>

// ERRADO — tabela sem scroll wrapper
<table className="w-full">
```

### Regras de actions/botões em mobile

Em mobile, botões de ação do header podem ser recolhidos ou ficar em linha separada:

```tsx
// SectionTitle com actions que quebra bem no mobile
<SectionTitle
  title="Vagas"
  actions={
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm">Filtrar</Button>
      <Button size="sm" iconLeft={<Plus size={14} />}>Nova Vaga</Button>
    </div>
  }
/>
```

### Regras de formulários em modal/drawer

Formulários dentro de Modal ou Drawer usam `FormRow` para responsividade:

```tsx
import { FormRow } from "@/src/components/ui/PageWrapper";

// 2 colunas no desktop, 1 no mobile
<FormRow cols={2}>
  <Input label="Nome" />
  <Input label="Sobrenome" />
</FormRow>
```

---

## PASSO 5 — Checklist anti-quebra antes de finalizar

Antes de entregar a tela, verificar mentalmente cada item:

### Layout
- [ ] Container raiz tem `p-4 sm:p-6 lg:p-8`
- [ ] Nenhum elemento tem largura fixa maior que a tela mobile (>375px sem responsividade)
- [ ] Grids usam `grid-cols-1` como base mobile
- [ ] Textos longos têm `truncate` ou `break-words` onde necessário
- [ ] Imagens têm `max-w-full` ou são responsivas

### Componentes
- [ ] Todos os botões usam `Button` ou `IconButton`
- [ ] Todos os campos de formulário usam `Input`, `Textarea`, `Select`, `Combobox` ou `DatePicker`
- [ ] Todos os badges usam `Badge`, `StatusBadge` ou `PaymentBadge`
- [ ] Modais usam `Modal`, painéis laterais usam `Drawer`
- [ ] Feedback de ações usa `useToast`
- [ ] Listas vazias usam `EmptyState`
- [ ] Paginação usa `Pagination` ou `usePagination`
- [ ] Seções agrupadas usam `PanelCard`
- [ ] Métricas usam `StatCard` dentro de `StatGrid`

### Tabelas
- [ ] Envolvidas em `overflow-x-auto`
- [ ] `min-w-[XXXpx]` definido na tabela interna
- [ ] Header da tabela em uppercase com `text-[10px] font-black tracking-widest text-zinc-400`

### Acessibilidade básica
- [ ] Botões têm texto descritivo ou `aria-label`
- [ ] Formulários têm `label` em todos os campos
- [ ] Carregamentos mostram estado visual (skeleton, spinner, ou `loading` no Button)

---

## PASSO 6 — Comunicação entre telas

Se a nova tela **lê ou altera dados que afetam outras telas existentes**, identificar e atualizar:

### Mapa de comunicação atual

| Tela | Dados que produz | Telas que consomem |
|------|------------------|--------------------|
| `Jobs` (`/vagas`) | Vagas criadas/editadas | `Dashboard`, `Candidates`, `Approvals`, `Matches`, `PublicPortal` |
| `Candidates` (`/candidatos`) | Candidatos e etapas do funil | `Dashboard`, `Matches`, `CandidateDetails` |
| `Approvals` (`/aprovacoes`) | Status de aprovação de vagas | `Jobs`, `Dashboard` |
| `Dashboard` (`/dashboard`) | Lê estatísticas | Todos (é consumidor) |
| `ImportResumes` (`/importar-cvs`) | Candidatos importados | `Candidates`, `Dashboard` |
| `Administration` (`/administracao`) | Usuários, unidades | `Jobs`, `Candidates` (filtro por unidade) |

### O que verificar ao criar uma tela nova

1. **A tela cria/edita registros?** → verificar se Dashboard precisa ser atualizado (os `StatCard` de métricas).
2. **A tela altera status de vaga?** → `Jobs.tsx` e `Approvals.tsx` precisam refletir.
3. **A tela altera candidatos?** → `Candidates.tsx` e `CandidateDetails.tsx` precisam refletir.
4. **A tela usa `tenantId`?** → sempre buscar com `getTenantId()` de `@/src/lib/auth`.
5. **A tela filtra por unidade?** → usar `useUnit()` de `@/src/lib/useUnit`.

### Padrão de invalidação de cache

As telas do projeto não usam cache global (sem Redux/React Query). O padrão é:
- Cada tela faz `fetch` próprio ao montar (`useEffect` + `fetchData`)
- Para forçar atualização de outra tela, usar `navigate` com `state: { refresh: true }` e verificar no `useEffect` da tela destino:

```tsx
// Tela A — navegar pedindo refresh
navigate("/candidatos", { state: { refresh: true } });

// Tela B (Candidates) — verificar e recarregar
const location = useLocation();
useEffect(() => {
  if (location.state?.refresh) fetchData();
}, [location.state]);
```

---

## PASSO 7 — Padrões de estilo visual

### Paleta de cores do projeto

```
Navy (primário):    #0a1c3e  → text-develoi-navy / bg-develoi-navy
Gold (secundário):  #b8860b  → text-develoi-gold / bg-develoi-gold
Zinc (neutros):     zinc-50 → zinc-900
Emerald (sucesso):  emerald-500 / emerald-50
Red (erro):         red-500 / red-50
Blue (info):        blue-500 / blue-50
```

### Bordas e arredondamentos

```tsx
// Cards e painéis principais
rounded-2xl  // cards internos
rounded-3xl  // painéis/seções
rounded-full // badges e botões (já no componente Button)

// Bordas
border border-zinc-200        // padrão
border border-develoi-navy/10 // elementos com destaque navy
```

### Sombras

```tsx
shadow-sm    // cards padrão
shadow-md    // cards no hover
shadow-2xl   // modais e drawers
```

### Header de tabela — padrão obrigatório

```tsx
<thead>
  <tr className="border-b border-zinc-100">
    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">
      Nome da Coluna
    </th>
  </tr>
</thead>
```

### Linha de tabela — padrão obrigatório

```tsx
<tbody>
  <tr className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors group">
    <td className="px-4 py-3 text-sm font-semibold text-zinc-800">
      Conteúdo
    </td>
  </tr>
</tbody>
```

### Estados de loading — skeleton pattern

```tsx
// Skeleton para cards
{loading ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-28 rounded-2xl bg-zinc-100 animate-pulse" />
    ))}
  </div>
) : (
  <StatGrid cols={4}>
    {stats.map((s, i) => <StatCard key={s.title} {...s} delay={i * 0.05} />)}
  </StatGrid>
)}

// Skeleton para linhas de tabela
{loading ? (
  Array.from({ length: 8 }).map((_, i) => (
    <tr key={i}>
      <td colSpan={5} className="px-4 py-3">
        <div className="h-5 rounded-lg bg-zinc-100 animate-pulse" />
      </td>
    </tr>
  ))
) : (
  data.map(item => <Row key={item.id} {...item} />)
)}
```

---

## PASSO 8 — Animações permitidas

O projeto usa `motion/react` (Framer Motion). Padrões aprovados:

```tsx
import { motion, AnimatePresence } from "motion/react";

// Entrada de card/lista
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
>

// Fade in simples
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.2 }}
>

// Lista com saída animada
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
    </motion.div>
  ))}
</AnimatePresence>
```

---

## PASSO 9 — Exemplo completo de tela de listagem

Este é o padrão canônico para qualquer tela com lista + filtros + paginação:

```tsx
import React, { useState, useEffect, useCallback } from "react";
import { Plus, FileText, RefreshCcw } from "lucide-react";
import {
  PageWrapper, SectionTitle, PanelCard, Button, IconButton,
  EmptyState, Pagination, usePagination,
  FilterSection, FilterSearch, FilterGroup, FilterItem,
  Badge, useToast, StatGrid, StatCard,
} from "@/src/components/ui";
import { getTenantId, getAuthUser } from "@/src/lib/auth";
import { getActionPermissions } from "@/src/lib/access";

type Item = { id: string; name: string; status: string };

export default function MinhaListagem() {
  const toast = useToast();
  const tenantId = getTenantId();
  const user = getAuthUser();
  const perms = getActionPermissions(user);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/items?tenantId=${tenantId}`);
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Filtros client-side
  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Paginação
  const { page, pageSize, paginatedData, setPage, setPageSize } = usePagination(filtered, 15);

  return (
    <PageWrapper>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Cabeçalho */}
        <SectionTitle
          title="Minha Listagem"
          subtitle="Gerenciamento de itens"
          icon={<FileText size={20} />}
          actions={
            perms.canEdit && (
              <Button iconLeft={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
                Novo Item
              </Button>
            )
          }
        />

        {/* Stats */}
        <StatGrid cols={3}>
          <StatCard title="Total" value={items.length} icon={FileText} delay={0} />
          <StatCard title="Ativos" value={items.filter(i => i.status === "active").length} icon={FileText} color="success" delay={0.05} />
          <StatCard title="Inativos" value={items.filter(i => i.status === "inactive").length} icon={FileText} color="danger" delay={0.1} />
        </StatGrid>

        {/* Painel com filtros e tabela */}
        <PanelCard
          title="Itens"
          icon={FileText}
          action={
            <IconButton variant="ghost" size="sm" onClick={fetchItems} title="Atualizar">
              <RefreshCcw size={14} />
            </IconButton>
          }
          padding={false}
        >
          {/* Filtros */}
          <div className="p-4 sm:p-5 border-b border-zinc-100">
            <FilterSection>
              <FilterSearch
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 min-w-[200px]"
              />
              <FilterGroup label="Status">
                <FilterItem label="Todos" count={items.length} active={statusFilter === "all"} onClick={() => { setStatusFilter("all"); setPage(1); }} />
                <FilterItem label="Ativos" active={statusFilter === "active"} onClick={() => { setStatusFilter("active"); setPage(1); }} />
                <FilterItem label="Inativos" active={statusFilter === "inactive"} onClick={() => { setStatusFilter("inactive"); setPage(1); }} />
              </FilterGroup>
            </FilterSection>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">Nome</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-zinc-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={3} className="px-4 py-3">
                        <div className="h-5 rounded-lg bg-zinc-100 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState
                        title="Nenhum item encontrado"
                        description="Ajuste os filtros ou crie um novo item."
                        action={
                          perms.canEdit && (
                            <Button iconLeft={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
                              Criar primeiro
                            </Button>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedData.map(item => (
                    <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors group">
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-800">{item.name}</td>
                      <td className="px-4 py-3">
                        <Badge color={item.status === "active" ? "success" : "danger"}>
                          {item.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="xs">Ver</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {!loading && filtered.length > 0 && (
            <Pagination
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </PanelCard>

      </div>
    </PageWrapper>
  );
}
```

---

## Resumo rápido — ordem de execução

```
1. Perguntar: nome, conteúdo, rota, comunicação
2. Ler: skill/use-component/CLAUDE.md (todos os componentes)
3. Criar: src/pages/NomeDaTela.tsx
4. Registrar: importar + adicionar menu + Route em src/App.tsx
5. Verificar: responsividade (375px → 1440px)
6. Verificar: tabelas com overflow-x-auto
7. Verificar: EmptyState, loading skeleton, useToast
8. Verificar: comunicação com telas afetadas
9. Criar novos componentes se necessário + documentar em use-component/CLAUDE.md
```
