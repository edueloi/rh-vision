# Guia de Componentes UI — RH Vision

Este arquivo é lido pela IA antes de criar qualquer tela ou componente.
**Regra obrigatória:** antes de criar qualquer elemento visual, percorra esta lista inteira e use os componentes aqui descritos. Nunca crie elementos HTML brutos (botões, inputs, badges, modais, etc.) se existir um componente correspondente nesta lista.

---

## Importações

Todos os componentes são exportados de `@/src/components/ui`. Exemplo:

```tsx
import { Button, IconButton } from "@/src/components/ui/Button";
import { Badge, StatusBadge } from "@/src/components/ui/Badge";
import { Input, Textarea, Select } from "@/src/components/ui/Input";
import { Modal } from "@/src/components/ui/Modal";
import { Drawer } from "@/src/components/ui/Drawer";
import { Toast, ToastProvider, useToast } from "@/src/components/ui/Toast";
import { Switch } from "@/src/components/ui/Switch";
import { StatCard } from "@/src/components/ui/StatCard";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { PageWrapper, ContentCard, SectionTitle, StatGrid, FormRow, Divider } from "@/src/components/ui/PageWrapper";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Pagination, usePagination } from "@/src/components/ui/Pagination";
import { FilterSection, FilterGroup, FilterItem, FilterSelect, FilterSearch, SegmentedControl, FilterDateRange } from "@/src/components/ui/FilterLine";
import { Combobox } from "@/src/components/ui/Combobox";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { TokenTextarea } from "@/src/components/ui/TokenTextarea";
import { RichTextEditor } from "@/src/components/ui/RichTextEditor";
import { SplitterLine } from "@/src/components/ui/SplitterLine";
```

Ou use o barrel:
```tsx
import { Button, Badge, Input, ... } from "@/src/components/ui";
```

---

## 1. Button / IconButton

**Arquivo:** `src/components/ui/Button.tsx`
**Quando usar:** qualquer ação clicável com texto. Para ações com apenas ícone, use `IconButton`.

### Button — Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `variant` | `primary \| secondary \| outline \| ghost \| danger \| success` | `primary` | Cor semântica |
| `size` | `xs \| sm \| md \| lg` | `md` | Tamanho |
| `loading` | `boolean` | `false` | Exibe spinner e desabilita |
| `iconLeft` | `ReactNode` | — | Ícone à esquerda do texto |
| `iconRight` | `ReactNode` | — | Ícone à direita do texto |
| `fullWidth` | `boolean` | `false` | Ocupa 100% da largura |
| `disabled` | `boolean` | — | Desabilita o botão |

### Passo a passo — criar um botão

1. Importe: `import { Button } from "@/src/components/ui/Button";`
2. Use `variant` para semântica: `primary` (ação principal), `outline` (secundária), `danger` (destrutiva), `ghost` (discreta).
3. Adicione ícones com `iconLeft` ou `iconRight` usando lucide-react.
4. Para carregamento assíncrono, passe `loading={isLoading}`.

```tsx
// Botão primário simples
<Button>Salvar</Button>

// Com ícone e loading
<Button variant="primary" iconLeft={<Plus size={15} />} loading={isSaving}>
  Nova Vaga
</Button>

// Destrutivo
<Button variant="danger" iconLeft={<Trash2 size={15} />}>
  Excluir
</Button>

// Largura total
<Button fullWidth variant="outline">Cancelar</Button>
```

### IconButton — Props

Igual ao Button, mas renderiza um botão quadrado só com ícone. `variant` padrão é `ghost`.

```tsx
import { IconButton } from "@/src/components/ui/Button";

<IconButton variant="ghost" size="md" onClick={onClose}>
  <X size={16} />
</IconButton>

<IconButton variant="outline" size="sm">
  <Edit size={14} />
</IconButton>
```

---

## 2. Badge / StatusBadge / PaymentBadge

**Arquivo:** `src/components/ui/Badge.tsx`
**Quando usar:** rótulos de status, categorias, contagens, etiquetas visuais.

### Badge — Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `color` | `default \| primary \| success \| warning \| danger \| info \| purple \| orange \| teal \| gold` | `default` | Cor semântica |
| `size` | `sm \| md` | `sm` | Tamanho |
| `dot` | `boolean` | `false` | Ponto colorido antes do texto |
| `icon` | `ReactNode` | — | Ícone antes do texto |
| `pill` | `boolean` | `false` | Bordas totalmente arredondadas |

### Passo a passo — criar um badge

1. Escolha `color` pela semântica: `success` (ativo/aprovado), `danger` (erro/rejeitado), `warning` (pendente), `info` (informativo), `primary` (destaque da marca).
2. Use `dot` para status que precisam de indicador visual rápido.
3. Textos são automaticamente em UPPERCASE com tracking.

```tsx
import { Badge } from "@/src/components/ui/Badge";

<Badge color="success">Aprovado</Badge>
<Badge color="danger" dot>Rejeitado</Badge>
<Badge color="warning" size="md">Pendente Revisão</Badge>
<Badge color="info" icon={<Star size={10} />}>Destaque</Badge>
```

### StatusBadge — wrapper pronto para status de agendamento

Status disponíveis: `scheduled | confirmed | in_progress | completed | cancelled | no_show | open | paid | pending | partial`

```tsx
import { StatusBadge } from "@/src/components/ui/Badge";

<StatusBadge status="confirmed" />
<StatusBadge status="pending" size="md" dot />
```

### PaymentBadge — wrapper para formas de pagamento

Métodos: `cash | card | pix | mixed | transfer | voucher`

```tsx
import { PaymentBadge } from "@/src/components/ui/Badge";

<PaymentBadge method="pix" />
<PaymentBadge method="card" size="md" />
```

---

## 3. Input / Textarea / Select

**Arquivo:** `src/components/ui/Input.tsx`
**Quando usar:** qualquer campo de formulário — texto, área de texto, dropdown nativo.

### Input — Props comuns

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `label` | `string` | — | Label acima do campo |
| `error` | `string` | — | Mensagem de erro (borda vermelha + ícone) |
| `hint` | `string` | — | Texto de ajuda abaixo |
| `required` | `boolean` | — | Asterisco vermelho no label |
| `fullWidth` | `boolean` | `true` | Ocupa 100% |
| `icon` | `ReactNode` | — | Ícone à esquerda dentro do campo |
| `addonLeft` | `ReactNode` | — | Prefixo (ex: "R$") colado à esquerda |
| `addonRight` | `ReactNode` | — | Sufixo colado à direita |
| `success` | `boolean` | — | Borda verde de validação ok |
| `showPasswordToggle` | `boolean` | `false` | Olho toggle (só para `type="password"`) |

### Passo a passo — criar um Input

1. Sempre passe `label` para identificar o campo.
2. Use `error` com mensagem quando validação falhar.
3. Use `icon` com lucide-react para campos com contexto visual (busca, email, etc.).
4. Para senha, use `type="password" showPasswordToggle`.

```tsx
import { Input } from "@/src/components/ui/Input";

// Básico
<Input label="Nome completo" placeholder="João Silva" required />

// Com ícone e erro
<Input
  label="E-mail"
  type="email"
  icon={<Mail size={15} />}
  error="E-mail inválido"
  placeholder="email@empresa.com"
/>

// Senha com toggle
<Input label="Senha" type="password" showPasswordToggle />

// Com prefixo
<Input label="Salário" addonLeft="R$" type="number" placeholder="5000" />
```

### Textarea — Props adicionais

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `rows` | `number` | `4` | Número de linhas |
| `maxChars` | `number` | — | Contador de caracteres |

```tsx
import { Textarea } from "@/src/components/ui/Input";

<Textarea
  label="Descrição da vaga"
  rows={6}
  maxChars={500}
  placeholder="Descreva as responsabilidades..."
  required
/>
```

### Select — uso

```tsx
import { Select } from "@/src/components/ui/Input";

<Select label="Departamento" icon={<Building size={15} />} required>
  <option value="">Selecione...</option>
  <option value="ti">TI</option>
  <option value="rh">RH</option>
</Select>
```

---

## 4. Modal

**Arquivo:** `src/components/ui/Modal.tsx`
**Quando usar:** diálogos centrados na tela — confirmações, formulários compactos, detalhes.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `open` | `boolean` | — | Controla visibilidade |
| `onClose` | `() => void` | — | Callback de fechamento |
| `title` | `string` | — | Título no header |
| `description` | `string` | — | Subtítulo no header |
| `icon` | `ReactNode` | — | Ícone no header (estilo navy) |
| `footer` | `ReactNode` | — | Rodapé com ações |
| `size` | `sm \| md \| lg \| xl` | `md` | Largura máxima |
| `closeOnOverlayClick` | `boolean` | `true` | Fecha ao clicar fora |

### Passo a passo

1. Controle com estado `const [open, setOpen] = useState(false)`.
2. Passe `footer` com botões de ação (Cancelar + Confirmar).
3. Use `size="lg"` para formulários com muitos campos.
4. ESC fecha automaticamente.

```tsx
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { UserPlus } from "lucide-react";

const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Novo Candidato</Button>

<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Adicionar Candidato"
  description="Preencha os dados do candidato"
  icon={<UserPlus size={20} />}
  size="md"
  footer={
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button variant="primary" loading={isSaving} onClick={handleSave}>Salvar</Button>
    </div>
  }
>
  {/* conteúdo do formulário aqui */}
  <Input label="Nome" required />
</Modal>
```

---

## 5. Drawer

**Arquivo:** `src/components/ui/Drawer.tsx`
**Quando usar:** painéis laterais deslizantes — detalhes de registro, formulários longos, filtros avançados.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `open` | `boolean` | — | Controla visibilidade |
| `onClose` | `() => void` | — | Callback de fechamento |
| `title` | `string` | — | Título no header |
| `description` | `string` | — | Subtítulo (uppercase, zinc) |
| `icon` | `ReactNode` | — | Ícone navy no header |
| `actions` | `ReactNode` | — | Botões extras no header (ao lado do X) |
| `footer` | `ReactNode` | — | Rodapé sticky |
| `size` | `sm \| md \| lg \| xl \| full` | `md` | Largura do drawer |
| `closeOnOverlayClick` | `boolean` | `true` | Fecha ao clicar fora |

### Passo a passo

1. Use Drawer para conteúdo extenso que não cabe em Modal.
2. `size="lg"` para formulários com muitas seções.
3. `actions` aceita botões adicionais no header (ex: botão Editar).
4. O conteúdo (`children`) é scrollável automaticamente.

```tsx
import { Drawer } from "@/src/components/ui/Drawer";
import { Briefcase } from "lucide-react";

<Drawer
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  title="Detalhes da Vaga"
  description="Informações completas"
  icon={<Briefcase size={20} />}
  size="lg"
  actions={
    <Button variant="outline" size="sm" iconLeft={<Edit size={13} />}>
      Editar
    </Button>
  }
  footer={
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={() => setDrawerOpen(false)}>Fechar</Button>
    </div>
  }
>
  {/* conteúdo longo aqui */}
</Drawer>
```

---

## 6. Toast / useToast

**Arquivo:** `src/components/ui/Toast.tsx`
**Quando usar:** notificações de feedback para ações do usuário (sucesso, erro, aviso, informação, carregamento).

### Setup (já feito no projeto)

`ToastProvider` envolve o app. Para usar, apenas chame o hook.

### useToast — métodos

| Método | Descrição |
|--------|-----------|
| `toast.success(msg)` | Notificação verde de sucesso |
| `toast.error(msg)` | Notificação vermelha de erro |
| `toast.warning(msg)` | Notificação amarela de atenção |
| `toast.info(msg)` | Notificação azul informativa |
| `toast.loading(msg, autoCloseMs?)` | Spinner persistente, retorna `id` |
| `toast.dismiss(id)` | Remove toast específico por id |

### Passo a passo

1. Importe `useToast` e chame no componente.
2. Use `loading` + `dismiss` para operações assíncronas.
3. Toasts fecham automaticamente em 5s (exceto `loading`).

```tsx
import { useToast } from "@/src/components/ui/Toast";

const toast = useToast();

// Sucesso simples
toast.success("Candidato salvo com sucesso!");

// Erro
toast.error("Erro ao salvar. Tente novamente.");

// Loading + dismiss após operação
const handleSave = async () => {
  const id = toast.loading("Salvando...");
  try {
    await saveData();
    toast.dismiss(id);
    toast.success("Salvo!");
  } catch {
    toast.dismiss(id);
    toast.error("Falha ao salvar.");
  }
};
```

---

## 7. Switch

**Arquivo:** `src/components/ui/Switch.tsx`
**Quando usar:** alternâncias booleanas (ativo/inativo, habilitar/desabilitar).

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `checked` | `boolean` | — | Estado atual |
| `onCheckedChange` | `(checked: boolean) => void` | — | Callback de mudança |
| `size` | `sm \| md` | `md` | Tamanho |
| `disabled` | `boolean` | — | Desabilita |

```tsx
import { Switch } from "@/src/components/ui/Switch";

const [active, setActive] = useState(true);

<div className="flex items-center gap-3">
  <Switch checked={active} onCheckedChange={setActive} />
  <span className="text-sm font-medium">{active ? "Ativo" : "Inativo"}</span>
</div>

// Tamanho pequeno
<Switch checked={enabled} onCheckedChange={setEnabled} size="sm" />
```

---

## 8. StatCard

**Arquivo:** `src/components/ui/StatCard.tsx`
**Quando usar:** cards de métricas/KPIs no dashboard — exibe valor numérico, título, ícone e tendência.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `title` | `string` | — | Label da métrica |
| `value` | `string \| number` | — | Valor principal (grande) |
| `icon` | `React.ElementType` | — | Ícone lucide (componente, não elemento) |
| `color` | `default \| success \| info \| danger \| purple \| warning \| navy \| red \| gold` | `default` | Cor do ícone |
| `trend` | `{ value: number; isUp: boolean }` | — | Indicador de tendência percentual |
| `description` | `string` | — | Texto descritivo abaixo do valor |
| `delay` | `number` | `0` | Delay de animação escalonada (segundos) |

### Passo a passo

1. Passe `icon` como componente lucide, não como JSX: `icon={Users}` não `icon={<Users />}`.
2. Use `delay` para animar cards em sequência (0, 0.05, 0.1, 0.15...).
3. Use dentro de `StatGrid` para layout responsivo automático.

```tsx
import { StatCard } from "@/src/components/ui/StatCard";
import { StatGrid } from "@/src/components/ui/PageWrapper";
import { Users, Briefcase, CheckCircle, Clock } from "lucide-react";

<StatGrid cols={4}>
  <StatCard
    title="Total de Candidatos"
    value={342}
    icon={Users}
    color="default"
    trend={{ value: 12, isUp: true }}
    description="vs. mês anterior"
    delay={0}
  />
  <StatCard
    title="Vagas Abertas"
    value={18}
    icon={Briefcase}
    color="info"
    delay={0.05}
  />
  <StatCard
    title="Contratados"
    value={7}
    icon={CheckCircle}
    color="success"
    trend={{ value: 5, isUp: true }}
    delay={0.1}
  />
  <StatCard
    title="Em Andamento"
    value={24}
    icon={Clock}
    color="warning"
    delay={0.15}
  />
</StatGrid>
```

---

## 9. PanelCard

**Arquivo:** `src/components/ui/PanelCard.tsx`
**Quando usar:** seções/painéis com header — agrupa conteúdo com título, ícone e ação opcional.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `title` | `string` | — | Título do painel |
| `description` | `string` | — | Subtítulo abaixo do título |
| `icon` | `React.ElementType` | — | Ícone lucide (componente) |
| `action` | `ReactNode` | — | Botão/elemento no canto direito do header |
| `padding` | `boolean` | `true` | Se o conteúdo tem padding interno |
| `color` | `string` | — | Cor da borda superior (hex ou tailwind value) |
| `className` | `string` | — | Classes extras no container |
| `contentClassName` | `string` | — | Classes extras na área de conteúdo |

```tsx
import { PanelCard } from "@/src/components/ui/PanelCard";
import { Users } from "lucide-react";

<PanelCard
  title="Candidatos Recentes"
  description="Últimas 24 horas"
  icon={Users}
  action={
    <Button variant="outline" size="sm">Ver todos</Button>
  }
>
  {/* conteúdo da lista aqui */}
</PanelCard>

// Sem padding (para tabelas que usam borda completa)
<PanelCard title="Resultados" icon={List} padding={false}>
  <table>...</table>
</PanelCard>
```

---

## 10. PageWrapper / ContentCard / SectionTitle / StatGrid / FormRow / Divider

**Arquivo:** `src/components/ui/PageWrapper.tsx`
**Quando usar:** estrutura e layout de páginas.

### PageWrapper
Container principal da página com animação de entrada.

```tsx
<PageWrapper maxWidth="full">
  {/* conteúdo da página */}
</PageWrapper>
```

### ContentCard
Card de conteúdo com borda e fundo branco.

```tsx
<ContentCard padding="md">
  {/* conteúdo */}
</ContentCard>

// Transparente (sem fundo/borda)
<ContentCard transparent>...</ContentCard>
```

### SectionTitle
Cabeçalho de seção com título, subtítulo, ícone e ações.

```tsx
<SectionTitle
  title="Candidatos"
  subtitle="Gestão de talentos"
  icon={<Users size={20} />}
  actions={
    <Button iconLeft={<Plus size={15} />}>Novo</Button>
  }
/>
```

### StatGrid
Grid responsivo para StatCards.

```tsx
// cols: 1 | 2 | 3 | 4 | 5
<StatGrid cols={4}>
  <StatCard ... />
  <StatCard ... />
</StatGrid>
```

### FormRow
Grid de colunas para formulários.

```tsx
// cols: 1 | 2 | 3 | 4
<FormRow cols={2}>
  <Input label="Nome" />
  <Input label="Sobrenome" />
</FormRow>

<FormRow cols={3}>
  <Input label="CEP" />
  <Input label="Cidade" />
  <Input label="Estado" />
</FormRow>
```

### Divider
Linha divisória horizontal.

```tsx
<Divider />
<Divider className="my-4" />
```

---

## 11. EmptyState

**Arquivo:** `src/components/ui/EmptyState.tsx`
**Quando usar:** quando uma lista ou seção não tem dados para exibir.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `title` | `string` | — | Mensagem principal |
| `description` | `string` | — | Texto explicativo |
| `icon` | `ReactNode` | `<FolderOpen />` | Ícone grande centralizado |
| `action` | `ReactNode` | — | Botão de ação (ex: "Criar primeiro") |

```tsx
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Users } from "lucide-react";

<EmptyState
  title="Nenhum candidato encontrado"
  description="Ajuste os filtros ou adicione um novo candidato para começar."
  icon={<Users size={48} />}
  action={
    <Button iconLeft={<Plus size={15} />} onClick={() => setOpen(true)}>
      Adicionar candidato
    </Button>
  }
/>
```

---

## 12. Pagination / usePagination

**Arquivo:** `src/components/ui/Pagination.tsx`
**Quando usar:** qualquer listagem com múltiplas páginas.

### Pagination — Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `total` | `number` | Total de itens |
| `page` | `number` | Página atual (1-indexed) |
| `pageSize` | `number` | Itens por página |
| `onPageChange` | `(page: number) => void` | Callback de troca de página |
| `onPageSizeChange` | `(size: number) => void` | Callback de troca de tamanho |
| `showPageSizeSelector` | `boolean` | Exibe seletor de itens por página |

### usePagination — hook client-side

Para paginação local (sem API), use o hook:

```tsx
import { Pagination, usePagination } from "@/src/components/ui/Pagination";

// Hook para paginação local
const { page, pageSize, paginatedData, setPage, setPageSize } = usePagination(allItems, 15);

// Renderização
return (
  <>
    {paginatedData.map(item => <Row key={item.id} {...item} />)}
    <Pagination
      total={allItems.length}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  </>
);
```

---

## 13. FilterLine — FilterSection / FilterGroup / FilterItem / FilterSelect / FilterSearch / SegmentedControl / FilterDateRange

**Arquivo:** `src/components/ui/FilterLine.tsx`
**Quando usar:** barras de filtro em listagens e dashboards.

### Componentes disponíveis

**FilterSearch** — campo de busca textual:
```tsx
<FilterSearch
  placeholder="Buscar candidato..."
  value={search}
  onChange={e => setSearch(e.target.value)}
/>
```

**FilterGroup + FilterItem** — grupo de filtros tipo tab:
```tsx
<FilterGroup label="Status">
  <FilterItem label="Todos" count={120} active={status === "all"} onClick={() => setStatus("all")} />
  <FilterItem label="Ativos" count={80} active={status === "active"} onClick={() => setStatus("active")} />
  <FilterItem label="Inativos" count={40} active={status === "inactive"} onClick={() => setStatus("inactive")} />
</FilterGroup>
```

**SegmentedControl** — seletor de visualização:
```tsx
<SegmentedControl
  value={view}
  onChange={setView}
  options={[
    { label: "Lista", value: "list", icon: <List size={12} /> },
    { label: "Grade", value: "grid", icon: <LayoutGrid size={12} /> },
  ]}
/>
```

**FilterSelect** — dropdown de filtro estilizado:
```tsx
<FilterSelect
  label="Departamento"
  value={dept}
  icon={<Building size={14} />}
  onClick={() => setShowDeptDropdown(true)}
/>
```

**FilterSection** — wrapper flex para agrupar tudo:
```tsx
<FilterSection>
  <FilterSearch value={search} onChange={e => setSearch(e.target.value)} />
  <FilterGroup label="Tipo">
    <FilterItem label="CLT" active={tipo === "clt"} onClick={() => setTipo("clt")} />
    <FilterItem label="PJ" active={tipo === "pj"} onClick={() => setTipo("pj")} />
  </FilterGroup>
  <SegmentedControl value={view} onChange={setView} options={[...]} />
</FilterSection>
```

---

## 14. Combobox

**Arquivo:** `src/components/ui/Combobox.tsx`
**Quando usar:** selects com busca, multi-seleção, opções agrupadas ou criação de novas opções.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `options` | `ComboboxOption[]` | — | Lista de opções |
| `value` | `string \| string[]` | — | Valor selecionado |
| `onChange` | `(value) => void` | — | Callback de mudança |
| `multiple` | `boolean` | `false` | Permite múltipla seleção |
| `allowCustom` | `boolean` | `false` | Permite criar nova opção |
| `placeholder` | `string` | `"Selecionar..."` | Placeholder |
| `disabled` | `boolean` | `false` | Desabilita |
| `size` | `sm \| md` | `sm` | Tamanho |

### ComboboxOption

```ts
{
  value: string;
  label: string;
  subtitle?: string;  // linha secundária
  group?: string;     // agrupa opções com mesmo grupo
  badge?: string;     // etiqueta à direita
  badgeColor?: string; // classes tailwind para cor do badge
}
```

### Passo a passo

```tsx
import { Combobox } from "@/src/components/ui/Combobox";

// Seleção simples
const [cargo, setCargo] = useState("");
<Combobox
  options={[
    { value: "dev", label: "Desenvolvedor" },
    { value: "designer", label: "Designer" },
    { value: "pm", label: "Product Manager" },
  ]}
  value={cargo}
  onChange={v => setCargo(v as string)}
  placeholder="Selecione o cargo..."
/>

// Multi-seleção com grupos
const [skills, setSkills] = useState<string[]>([]);
<Combobox
  options={[
    { value: "react", label: "React", group: "Frontend" },
    { value: "vue", label: "Vue.js", group: "Frontend" },
    { value: "node", label: "Node.js", group: "Backend" },
    { value: "python", label: "Python", group: "Backend" },
  ]}
  value={skills}
  onChange={v => setSkills(v as string[])}
  multiple
  placeholder="Selecione habilidades..."
/>

// Com criação de nova opção
<Combobox
  options={tags}
  value={selectedTag}
  onChange={v => setSelectedTag(v as string)}
  allowCustom
  onCustomAdd={newTag => setTags(prev => [...prev, { value: newTag, label: newTag }])}
/>
```

---

## 15. DatePicker

**Arquivo:** `src/components/ui/DatePicker.tsx`
**Quando usar:** qualquer campo de seleção de data com calendário visual.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `value` | `string \| null` | — | Data no formato `YYYY-MM-DD` |
| `onChange` | `(value: string \| null) => void` | — | Callback |
| `label` | `string` | — | Label acima |
| `placeholder` | `string` | `"Selecionar data"` | Placeholder |
| `min` | `string` | — | Data mínima `YYYY-MM-DD` |
| `max` | `string` | — | Data máxima `YYYY-MM-DD` |
| `disabled` | `boolean` | `false` | Desabilita |
| `error` | `string` | — | Mensagem de erro |
| `hint` | `string` | — | Texto de ajuda |
| `variant` | `default \| ghost` | `default` | Estilo visual |

### Passo a passo

```tsx
import { DatePicker } from "@/src/components/ui/DatePicker";

const [data, setData] = useState<string | null>(null);

// Básico
<DatePicker
  label="Data de nascimento"
  value={data}
  onChange={setData}
/>

// Com restrições de intervalo
<DatePicker
  label="Data limite"
  value={prazo}
  onChange={setPrazo}
  min={new Date().toISOString().split("T")[0]}  // hoje
  error={!prazo ? "Data obrigatória" : undefined}
/>
```

---

## 16. TokenTextarea

**Arquivo:** `src/components/ui/TokenTextarea.tsx`
**Quando usar:** editor de texto com variáveis dinâmicas exibidas como chips (ex: templates de mensagem WhatsApp/email).

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `value` | `string` | — | Texto puro com `{{variavel}}` |
| `onChange` | `(plain: string) => void` | — | Retorna texto puro |
| `placeholder` | `string` | — | Placeholder |
| `rows` | `number` | `6` | Altura mínima |
| `availableVars` | `{ key: string; desc: string }[]` | `[]` | Variáveis clicáveis para inserir |

```tsx
import { TokenTextarea } from "@/src/components/ui/TokenTextarea";

<TokenTextarea
  value={mensagem}
  onChange={setMensagem}
  placeholder="Escreva o template..."
  rows={5}
  availableVars={[
    { key: "{{nome_candidato}}", desc: "Nome do candidato" },
    { key: "{{vaga}}", desc: "Título da vaga" },
    { key: "{{empresa}}", desc: "Nome da empresa" },
  ]}
/>
```

---

## 17. RichTextEditor

**Arquivo:** `src/components/ui/RichTextEditor.tsx`
**Quando usar:** editor HTML completo com toolbar — descrições de vagas, e-mails formatados, conteúdo rico.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `value` | `string` | — | HTML atual |
| `onChange` | `(html: string) => void` | — | Callback com HTML atualizado |
| `placeholder` | `string` | `"Comece a escrever..."` | Placeholder |
| `minHeight` | `number` | `400` | Altura mínima em px |

### Funcionalidades da toolbar

- Formatação: **negrito**, *itálico*, sublinhado, tachado
- Títulos: H1, H2, H3, H4, parágrafo
- Família e tamanho da fonte
- Cores de texto e destaque
- Alinhamento (esquerda, centro, direita, justificado)
- Listas (marcadores e numerada), recuo
- Links, imagens (URL ou upload) com resize e posicionamento
- Blocos especiais: divisor, dica, info, alerta, sucesso, citação, código, tabela
- Desfazer/refazer

```tsx
import { RichTextEditor } from "@/src/components/ui/RichTextEditor";

<RichTextEditor
  value={descricao}
  onChange={setDescricao}
  placeholder="Descreva a vaga em detalhes..."
  minHeight={350}
/>
```

---

## 18. SplitterLine

**Arquivo:** `src/components/ui/SplitterLine.tsx`
**Quando usar:** separador horizontal com label/ícone opcional — divide seções dentro de um painel ou formulário.

### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `label` | `string` | Texto do separador |
| `icon` | `ReactNode` | Ícone à esquerda |
| `rightNode` | `ReactNode` | Elemento à direita da linha |

```tsx
import { SplitterLine } from "@/src/components/ui/SplitterLine";
import { Info } from "lucide-react";

// Simples
<SplitterLine label="Informações Pessoais" />

// Com ícone
<SplitterLine label="Documentos" icon={<FileText size={14} />} />

// Com ação à direita
<SplitterLine
  label="Experiências"
  icon={<Briefcase size={14} />}
  rightNode={
    <Button variant="ghost" size="xs" iconLeft={<Plus size={12} />}>
      Adicionar
    </Button>
  }
/>
```

---

## Regras gerais de aplicação

1. **Nunca criar botão HTML `<button>` raw** — use `Button` ou `IconButton`.
2. **Nunca criar `<input>` ou `<select>` raw** em formulários — use `Input`, `Textarea`, `Select`, `Combobox` ou `DatePicker`.
3. **Nunca criar badge/tag/chip raw** — use `Badge`, `StatusBadge` ou `PaymentBadge`.
4. **Nunca criar modal/overlay raw** — use `Modal` ou `Drawer`.
5. **Sempre usar `useToast`** para feedback de ações assíncronas.
6. **Sempre usar `SectionTitle`** no topo de páginas com título + ações.
7. **Sempre usar `StatGrid + StatCard`** para blocos de métricas.
8. **Sempre usar `EmptyState`** quando uma lista estiver vazia.
9. **Sempre usar `Pagination`** (ou `usePagination`) em listagens longas.
10. **Sempre usar `PanelCard`** para agrupar seções com header.
