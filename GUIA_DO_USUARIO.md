# Manual do Usuário — Recrute IA
### Guia Completo de Acesso e Uso da Plataforma

> **Recrute IA** é uma plataforma de recrutamento inteligente que utiliza a **Aurora IA** para automatizar triagem de currículos, calcular compatibilidade candidato × vaga, gerar perfis comportamentais DISC e sugerir perguntas de entrevista — tudo em um painel centralizado e responsivo.

---

## Índice

1. [Primeiro Acesso e Tela de Login](#1-primeiro-acesso-e-tela-de-login)
2. [Estrutura da Plataforma](#2-estrutura-da-plataforma)
3. [Dashboard — Painel Principal](#3-dashboard--painel-principal)
4. [Vagas](#4-vagas)
5. [Candidatos — Gestão de Talentos](#5-candidatos--gestão-de-talentos)
6. [Perfil Completo do Candidato](#6-perfil-completo-do-candidato)
7. [Cadastro Manual de Candidato](#7-cadastro-manual-de-candidato)
8. [Importar Currículos em Lote](#8-importar-currículos-em-lote)
9. [Aurora IA](#9-aurora-ia)
10. [DISC e Ferramentas de Avaliação](#10-disc-e-ferramentas-de-avaliação)
11. [Notificações](#11-notificações)
12. [Preferências e Tema](#12-preferências-e-tema)
13. [Fluxo Completo de Recrutamento](#13-fluxo-completo-de-recrutamento)
14. [Dúvidas Frequentes](#14-dúvidas-frequentes)

---

## 1. Primeiro Acesso e Tela de Login

### Como acessar

Abra o navegador e acesse o endereço fornecido pelo administrador da sua empresa (ex.: `recruteia.suaempresa.com.br`). Você verá a tela de login com campos de **e-mail** e **senha**.

Após autenticar, você é redirecionado automaticamente para o **Dashboard**.

> **Primeira vez?** Na primeira sessão, a plataforma pode exibir uma tela de boas-vindas com orientações iniciais. Ela aparece apenas uma vez.

### Esqueci minha senha

Fale com o administrador da sua unidade para redefinição de acesso.

---

## 2. Estrutura da Plataforma

A plataforma tem três áreas fixas visíveis em todas as telas:

```
┌─────────────────────────────────────────────────────────────────┐
│  BARRA SUPERIOR (Topbar)                          🔔  👤 Nome   │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│   MENU       │           CONTEÚDO PRINCIPAL                     │
│  LATERAL     │                                                  │
│  (Sidebar)   │                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### 2.1 Menu Lateral (Sidebar)

Localizado à esquerda em telas grandes. Em dispositivos móveis, aparece como um **menu gaveta** acionado pelo botão ≡ no canto superior esquerdo.

**Itens do menu:**

| Ícone | Item | O que faz |
|-------|------|-----------|
| `⊞` | **Dashboard** | Painel principal com métricas e resumo |
| `🧠` | **Aurora AI** | Inteligência artificial de recrutamento |
| `💼` | **Vagas** | Criar e gerenciar vagas abertas |
| `👥` | **Candidatos** | Banco de talentos e perfis |
| `📂` | **Importar CVs** | Upload em lote de currículos |
| `🔧` | **Ferramentas** | DISC e avaliações de candidatos |
| `🛡` | **Administração** | Configurações do sistema (apenas admins) |

**Rodapé do menu:**
- Exibe seu **avatar com iniciais**, nome e cargo
- Botão de **logout** (ícone ×) para sair da sessão

### 2.2 Barra Superior (Topbar)

**Lado esquerdo:** Nome da sua unidade + página atual (ex.: `Matriz › Dashboard`)

**Lado direito:**

- **Sino 🔔** — Notificações. Um número vermelho indica mensagens não lidas.
- **Avatar + Nome** — Clique para abrir o menu do usuário:
  - `Meu Perfil` — ver e editar seus dados
  - `Configurações` — preferências do sistema
  - `Suporte` — canal de ajuda
  - `Modo Escuro / Claro` — alterna o tema visual
  - `Sair da Plataforma` — encerrar sessão

### 2.3 Barra informativa de sessão

Se você pertence a uma unidade específica (não é a matriz), uma faixa azul aparece abaixo da topbar:

> `Sessão Ativa: [NOME DA UNIDADE]. Você só vê candidatos e vagas desta localidade.`

---

## 3. Dashboard — Painel Principal

**Rota:** `/dashboard`

O Dashboard é sua central de inteligência. Tudo o que acontece no recrutamento aparece aqui: vagas, candidatos, funil, gráficos, atalhos pessoais e tarefas.

### 3.1 Cabeçalho e Controles

```
Dashboard                                    [7d] [30d] [90d] [Hist.]  ↺  + Nova Vaga
Matriz · Visão geral do recrutamento
```

**Filtros de período** — controlam o intervalo de dados exibidos:

| Botão | Período coberto |
|-------|----------------|
| **7d** | Últimos 7 dias |
| **30d** | Últimos 30 dias (padrão) |
| **90d** | Últimos 90 dias |
| **Hist.** | Todo o histórico da unidade |

**Botão ↺ (Atualizar)** — recarrega os dados sem sair da tela. O ícone gira enquanto carrega.

**Botão `+ Nova Vaga`** — atalho direto para criar uma nova vaga.

---

### 3.2 Cards de Métricas

Cinco indicadores principais logo abaixo do cabeçalho:

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  💼           │ │  👥           │ │  ✅           │ │  🎯           │ │  🧠           │
│  Vagas Ativas │ │  Candidatos  │ │ Novos no Per.│ │ Comp. >80%   │ │ DISC Resp.   │
│    12         │ │    348       │ │     24       │ │     15       │ │     87       │
│  abertas agora│ │  cadastrados │ │  no período  │ │  alto fit    │ │  avaliações  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

- **Vagas Ativas** — posições abertas no momento
- **Candidatos** — total no banco de talentos da unidade
- **Novos no Período** — candidatos que entraram no intervalo selecionado
- **Compatíveis >80%** — candidatos com alto score de fit prontos para revisão
- **DISC Respondidos** — avaliações comportamentais concluídas

Cada card mostra uma seta de tendência (↑ crescimento, ↓ queda) e a variação percentual.

---

### 3.3 Funil de Recrutamento

Visualização do fluxo de candidatos em cada etapa do processo:

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Triagem │→ │ IA Match │→ │Entrevista│→ │Finalista │→ │ Aprovado │→ │Contratado│
│   142    │  │    87    │  │    34    │  │    12    │  │     6    │  │     3    │
│   100%   │  │   61%    │  │   24%   │  │    8%    │  │    4%    │  │    2%    │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

Cada bloco exibe **número absoluto** de candidatos e **percentual** em relação ao total. O funil atualiza automaticamente conforme o status dos candidatos muda.

---

### 3.4 Gráficos de Desempenho

**Score IA por Vaga** — gráfico de barras com a média de compatibilidade de cada vaga aberta. Permite identificar vagas com poucos candidatos compatíveis que precisam de atenção.

**Perfis DISC** — gráfico de pizza com a distribuição dos perfis comportamentais (D, I, S, C) dos candidatos que responderam a avaliação.

---

### 3.5 Vagas Recentes

Lista as últimas vagas abertas com:
- Título e localização
- Status da vaga (badge colorido)
- Número de candidatos inscritos
- Número de candidatos compatíveis (em verde)
- Seta `›` para abrir a vaga

Clique em **"Ver todas"** no canto superior direito do painel para ir à página de Vagas.

---

### 3.6 Acesso Rápido ⚡

Atalhos personalizados que **você mesmo cria e gerencia**. Nenhum outro usuário vê seus atalhos.

**Como adicionar um atalho:**

1. Clique no `+` no canto direito do painel "Acesso Rápido"
2. Preencha o formulário que aparece:

| Campo | Descrição |
|-------|-----------|
| **Nome do acesso** | Como o atalho será identificado (ex.: "Portal SEFAZ", "LinkedIn") |
| **Link (URL)** | O endereço completo ou só o domínio (o sistema adiciona `https://` automaticamente) |
| **Ícone** | Escolha entre 30+ ícones disponíveis na grade |
| **Cor do círculo** | 19 cores para personalizar visualmente |

3. Veja o **preview** em tempo real enquanto preenche
4. Clique em **Salvar**

**Como remover um atalho:**
- Passe o mouse sobre o ícone circular
- O botão `×` aparece no canto superior direito do ícone
- Clique para remover

> Os atalhos são salvos por usuário no navegador e permanecem entre sessões.

---

### 3.7 Aurora IA — Widget do Dashboard

Painel com fundo escuro no lado direito, traz **observações automáticas** geradas pela IA sobre a saúde do seu processo:

- Se a taxa de conversão entre etapas está acima ou abaixo do esperado
- Quantos candidatos de alto fit estão aguardando revisão
- Alertas sobre vagas sem candidatos compatíveis

O botão **"Consultoria Completa"** leva ao módulo Aurora IA completo.

---

### 3.8 Talentos em Destaque

Lista os candidatos com maior score de compatibilidade em vagas abertas. Para cada talento:
- Iniciais em avatar colorido
- Nome e cargo desejado
- Score percentual com barra de progresso
- Clique no nome para abrir o perfil completo

---

### 3.9 Importações Recentes

Mostra os últimos lotes de currículos enviados com barra de progresso indicando quantos arquivos já foram processados pela Aurora IA (`processados / total`). Clique em qualquer item para ir à tela de gerenciamento do lote.

---

### 3.10 Checklist Pessoal ✓

Lista de tarefas pessoal, criada e gerenciada inteiramente por você.

**Adicionar tarefa:**
- Digite no campo "Nova tarefa..." e pressione **Enter** (ou clique no `+`)

**Marcar como concluída:**
- Clique no círculo `○` à esquerda da tarefa — vira `✓` e o texto é riscado

**Remover tarefa:**
- Passe o mouse sobre a tarefa → ícone de lixeira aparece à direita → clique

**Limpar concluídas:**
- Botão "Limpar feitos" remove todas as tarefas marcadas de uma vez

A barra de progresso no topo mostra o percentual de conclusão.

> O checklist também é salvo por usuário e persiste entre sessões.

---

## 4. Vagas

**Rota:** `/vagas`

Gerenciamento completo das posições abertas.

### 4.1 Lista de Vagas

A página exibe todas as vagas com:
- Título e localização
- Modelo de trabalho (Presencial / Híbrido / Home Office)
- Status atual
- Número de candidatos inscritos
- Número de candidatos compatíveis

**Filtros disponíveis:**
- Busca por título
- Filtro por status
- Filtro por modelo de trabalho

### 4.2 Status das Vagas

| Status | Significado | Ação possível |
|--------|-------------|---------------|
| **Rascunho** | Em elaboração, invisível para candidatos | Editar, Publicar |
| **Aberta** | Ativa, recebendo candidaturas | Pausar, Fechar |
| **Pausada** | Temporariamente suspensa | Reabrir, Fechar |
| **Fechada** | Encerrada, sem novas candidaturas | Reabrir |

### 4.3 Criar Nova Vaga

Clique em **"+ Nova Vaga"** (no dashboard ou na página de vagas) e preencha:

**Informações obrigatórias:**
- Título da vaga
- Localização (cidade e estado)
- Modelo de trabalho

**Informações complementares:**
- Descrição detalhada da função
- Habilidades exigidas
- Faixa salarial
- Nível de experiência
- Link do portal público (gerado automaticamente ao publicar)

### 4.4 Ações por Vaga

Dentro de cada vaga você pode:
- **Editar** — alterar qualquer informação
- **Duplicar** — criar cópia para reaproveitamento
- **Publicar no portal** — tornar visível para candidatos externos
- **Vincular candidatos** — associar candidatos manualmente à vaga
- **Ver análise Aurora IA** — score médio e ranking de candidatos

---

## 5. Candidatos — Gestão de Talentos

**Rota:** `/candidatos`

Banco completo de talentos. Todos os candidatos chegam aqui, independente de como entraram no sistema (importação, cadastro manual ou portal público).

### 5.1 Cabeçalho da Página

```
Gestão de Talentos                              ↺   ⬆ Importar   + Novo Talento
348 currículos na unidade
```

| Botão | Função |
|-------|--------|
| **↺** | Atualizar a lista |
| **⬆ Importar** | Ir para a tela de importação em lote |
| **+ Novo Talento** | Abrir formulário de cadastro manual |

### 5.2 Cards de Resumo

Quatro indicadores rápidos acima da lista:

| Card | O que conta |
|------|-------------|
| **Total** | Todos os candidatos da unidade |
| **Novos** | Com status "Novo" |
| **Entrevista** | Com status "Entrevista" |
| **Aprovados** | Com status "Aprovado" ou "Contratado" |

### 5.3 Busca e Filtros

```
┌─────────────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  [A↑] [📅]
│  🔍 Nome, cargo, skill...   │  │  Status: Todos ▼ │  │  Origem: Todas ▼ │
└─────────────────────────────┘  └──────────────────┘  └──────────────────┘
```

**Busca** — pesquisa por nome, cargo desejado ou habilidade. Resultado aparece automaticamente após digitar.

**Filtro de Status:**

| Opção | Candidatos em |
|-------|--------------|
| Novo | Recém cadastrados |
| Em análise | Em revisão pela equipe |
| Compatível | Score IA alto para alguma vaga |
| Entrevista | Agendados para entrevista |
| Aprovado | Aprovados no processo |
| Reprovado | Não seguiram adiante |
| Banco de talentos | Para oportunidades futuras |
| Contratado | Efetivados |

**Filtro de Origem:**

| Opção | Como chegou ao sistema |
|-------|----------------------|
| Manual | Cadastrado pela equipe de RH |
| Portal | Se inscreveu na vaga pública |
| LinkedIn | Importado do LinkedIn |
| Indicação | Indicado por alguém |
| Importação em Lote | Chegou via upload de CVs |

**Ordenação** (botões à direita):
- **A↑ Nome** — ordena por nome (clique alterna A→Z / Z→A)
- **📅 Data** — ordena por data de cadastro (mais recente / mais antigo)

### 5.4 Tabela de Candidatos

Cada linha exibe:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [AB]  Ana Beatriz Santos        •  2a        💼 Analista RH   📍 SP         │
│        Em análise                                            Hoje   👁 ✏ 🗑  │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Elemento | Descrição |
|----------|-----------|
| **Avatar** | Iniciais do nome em círculo |
| **Nome** | Nome completo |
| **Badge de experiência** | Anos de experiência (`2a`, `5a`, etc.) |
| **Cargo** | Cargo desejado |
| **Localização** | Cidade do candidato |
| **Status** | Badge colorido com etapa atual |
| **Data** | Data de cadastro |
| **Ações** | Ícones de ação (aparecem ao passar o mouse) |

**Cores dos status:**
- 🟡 Amarelo — Novo
- 🟢 Verde — Compatível / Aprovado / Contratado
- 🔵 Azul — Entrevista
- 🔴 Vermelho — Reprovado
- ⚫ Cinza — Em análise / Banco de talentos

### 5.5 Ações por Candidato

Ao passar o mouse sobre uma linha aparecem 3 ícones:

| Ícone | Ação |
|-------|------|
| **👁 Olho** | Abrir perfil completo |
| **✏ Lápis** | Editar dados do candidato |
| **🗑 Lixeira** | Excluir candidato (pede confirmação) |

> **Atenção:** A exclusão é permanente e remove todos os dados do candidato, incluindo análises e histórico.

---

## 6. Perfil Completo do Candidato

**Rota:** `/candidatos/{id}`

Ao clicar em um candidato, você acessa o perfil detalhado com **7 abas**.

### Layout da Página

**Desktop:** coluna lateral esquerda com resumo + abas à direita  
**Mobile:** cabeçalho compacto + abas em rolagem horizontal

**Botões de ação (topo direito):**
- **Editar** — abre o formulário de edição
- **🗑 Excluir** — remove o candidato (com confirmação)

---

### Aba 1: Resumo

Visão geral do candidato.

**Informações rápidas:**

| Campo | Exemplo |
|-------|---------|
| Pretensão Salarial | R$ 4.500,00 |
| Anos de Experiência | 5 anos |
| Escolaridade | Graduação |
| Modelo Desejado | Híbrido |

**Resumo profissional** — texto descritivo da trajetória do candidato.

**Habilidades técnicas (hard skills)** — exibidas como tags clicáveis. Passe o mouse para destaque.

**Histórico Profissional** — lista de experiências com:
- Cargo e período (ex.: "Jan 2020 – Dez 2022")
- Nome da empresa
- Descrição das responsabilidades

**Formação Acadêmica** — lista de cursos com:
- Nome do curso e instituição
- Status (Completo, Em andamento, Interrompido)
- Período de realização

---

### Aba 2: Currículo

Exibe o **texto extraído** do PDF pelo sistema, formatado para leitura.

**Botões de ação:**
- **Baixar PDF Original** — faz download do arquivo enviado
- **Ver Arquivo** — abre o PDF no navegador em nova aba

> Se o candidato não tem currículo anexado, os botões ficam desabilitados.

---

### Aba 3: Vagas

Todos os processos seletivos em que esse candidato está envolvido.

**Vincular a uma nova vaga:**
1. Clique em **"+ Vincular a Vaga"**
2. Selecione a vaga no dropdown
3. Clique em **"Vincular"**
4. A Aurora IA calcula automaticamente o score de compatibilidade

**Para cada vaga vinculada:**
- Nome da vaga e status
- **Score de compatibilidade** (ex.: `87%`)
- Classificação de fit (Alto Fit, Médio Fit, etc.)
- Pontos fortes identificados
- Pontos de atenção
- Botão **"Rodar Análise IA"** / **"Refazer Análise"**

**Cores do score:**
- **Verde** — ≥ 90% (Altíssimo Fit)
- **Amarelo** — ≥ 60% (Bom Fit)
- **Cinza** — < 60% (Fit Baixo)

---

### Aba 4: Avaliações

Instrumentos de avaliação que o candidato respondeu.

Para cada avaliação:
- Nome do instrumento (ex.: "DISC Comportamental")
- Data de conclusão
- Score obtido
- Resumo gerado pela Aurora IA
- Botão **"Ver Detalhes"** — abre resultado completo
- Botão **"Analisar IA"** — processa a avaliação na Aurora (aparece se ainda não foi analisado)

**Estado vazio:** "Nenhuma avaliação. O candidato ainda não respondeu nenhum instrumento de RH."

---

### Aba 5: Análise IA

Análise completa gerada pela Aurora para cada vaga vinculada.

**Estrutura da análise:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🌟 Relatório Aurora AI — Análise automatizada de compatibilidade│
├─────────────────┬───────────────────────────────────────────────┤
│   87%           │  Classificação: Alto Fit                      │
│ Compatibilidade │                                               │
├─────────────────┴───────────────────────────────────────────────┤
│  ✅ Pontos de Destaque      │  ⚠ Riscos e Atenção               │
│  • Experiência em gestão    │  • Salário acima da faixa          │
│  • Liderança comprovada     │  • Não tem inglês avançado         │
│  • Perfil analítico (DISC C)│                                   │
├─────────────────────────────────────────────────────────────────┤
│  Resumo: "Candidato com forte aderência técnica ao perfil..."   │
├─────────────────────────────────────────────────────────────────┤
│  💬 Perguntas Sugeridas para Entrevista                         │
│  1. "Conte sobre um projeto de transformação que liderou..."    │
│  2. "Como você lida com prazos sob pressão?"                    │
│  3. "Descreva sua experiência com times distribuídos..."        │
└─────────────────────────────────────────────────────────────────┘
```

> As perguntas sugeridas são geradas pela Aurora com base no currículo + requisitos da vaga. Use-as como guia na entrevista.

**Estado vazio:** "Vincule o candidato a uma vaga para rodar a análise comportamental da Aurora AI."

---

### Aba 6: DISC

Exibe o perfil comportamental DISC do candidato, se ele respondeu a avaliação.

**As 4 dimensões:**

| Letra | Perfil | Características principais |
|-------|--------|---------------------------|
| **D** | Dominância | Direto, decidido, orientado a resultados |
| **I** | Influência | Comunicativo, entusiasta, constrói relacionamentos |
| **S** | Estabilidade | Paciente, colaborativo, consistente |
| **C** | Conformidade | Analítico, preciso, segue normas e processos |

**Estado vazio:** "Nenhuma avaliação DISC disponível para este candidato."

---

### Aba 7: Histórico

Linha do tempo completa de tudo que aconteceu com o candidato:
- Quando foi cadastrado e por quem
- Mudanças de status
- Análises realizadas pela Aurora IA
- Vínculos com vagas
- Notas internas adicionadas pela equipe

**Adicionar nota interna:**
- Role até o final do histórico
- Escreva no campo de texto
- Clique em **"Salvar Observação"**
- A nota ficará registrada com seu nome e horário

---

## 7. Cadastro Manual de Candidato

**Rota:** `/candidatos/novo`

Use quando precisar cadastrar um candidato individualmente, sem PDF para importar.

### 7.1 Barra Superior (fixa)

```
← Voltar  |  Novo Talento                           🟢 Sincronizado    [Finalizar]
```

- **Status "Sincronizado"** — indica que os dados foram salvos
- **Botão "Finalizar"** — conclui o cadastro e vai para o perfil

### 7.2 Barra de Controles Rápidos

Logo abaixo do cabeçalho, antes do formulário:

| Controle | Opções |
|----------|--------|
| **Status** | Novo / Em análise / Compatível / Entrevista / Aprovado / Reprovado / Banco de talentos / Contratado |
| **Modelo de Trabalho** | Presencial / Híbrido / Home Office |
| **Pretensão Salarial** | Campo numérico em R$ |
| **✨ Importar CV** | Upload de PDF para preenchimento automático |

### 7.3 Importar CV — Preenchimento Automático

Esta é a forma mais rápida de cadastrar candidatos:

1. Clique em **"✨ Importar CV"**
2. Selecione o arquivo PDF do candidato
3. A Aurora IA lê e extrai automaticamente:
   - Nome, e-mail, telefone, localização
   - Histórico profissional completo
   - Habilidades técnicas
   - Formação acadêmica
   - Idiomas e certificações
4. Uma janela de preview exibe os dados extraídos
5. Clique em **"Confirmar"** para preencher o formulário automaticamente
6. Revise e ajuste o que precisar

### 7.4 Seções do Formulário

#### Dados de Contato

| Campo | Obrigatório | Exemplo |
|-------|------------|---------|
| Nome completo | Sim | Ana Beatriz Santos |
| E-mail | Sim | ana@email.com |
| Telefone | Não | (11) 99999-9999 |
| LinkedIn | Não | linkedin.com/in/anabeatriz |
| Cidade | Não | São Paulo |
| Estado (UF) | Não | SP |
| CNH | Não | B / AB / Não possui |

#### Resumo Profissional

Campo de texto livre para descrever a trajetória do candidato. Pode ser o mesmo texto do currículo.

#### Habilidades

**Hard Skills (Técnicas):**
- Digite a habilidade e pressione **Enter** para adicionar como tag
- Exemplos: Python, Excel Avançado, Gestão de Projetos
- Clique no `×` de uma tag para remover

**Soft Skills (Comportamentais):**
- Mesma dinâmica das hard skills
- Exemplos: Liderança, Comunicação, Trabalho em equipe

#### Experiências Profissionais

Clique em **"Adicionar Experiência"** para cada cargo:
- Empresa
- Cargo
- Período (ex.: "Jan 2020 – Dez 2022")
- Localização
- Descrição das responsabilidades

Clique no ícone 🗑 ao lado de uma experiência para removê-la.

#### Formação Acadêmica

Clique em **"Adicionar Formação"** para cada curso:
- Nome do curso
- Instituição
- Período
- Tipo (Bacharelado, MBA, Técnico, etc.)
- Status (Completo / Em andamento / Interrompido)

#### Idiomas

Clique em **"Adicionar Idioma"**:
- Idioma (ex.: Inglês, Espanhol)
- Nível: Básico / Intermediário / Avançado / Fluente

#### Certificações

Clique em **"Adicionar Certificação"**:
- Nome do certificado
- Instituição emissora
- Ano de emissão

#### Projetos

Clique em **"Adicionar Projeto"**:
- Nome do projeto
- Tecnologias utilizadas (separadas por vírgula)
- Descrição

---

## 8. Importar Currículos em Lote

**Rota:** `/importar-cvs`

Processe dezenas ou centenas de currículos de uma vez. A Aurora IA extrai os dados de cada PDF automaticamente.

### 8.1 Visão Geral — Painel de Lotes

**Métricas gerais:**

| Indicador | O que mostra |
|-----------|-------------|
| Total de arquivos | Todos os CVs já enviados |
| Processados | Analisados pela Aurora IA |
| Candidatos criados | Registros efetivados |
| Duplicatas | Arquivos de candidatos já existentes |
| Erros | Arquivos que não puderam ser lidos |

**Lista de lotes:** Cada lote aparece com:
- Nome do lote
- Status (Processando / Concluído / Com Falhas)
- Data de criação
- Vaga vinculada (se houver)
- Contagem: arquivos / candidatos criados / erros
- Botão 🗑 para excluir o lote

### 8.2 Criar Novo Lote

Clique em **"Novo Lote de Importação"** e configure:

**Nome do lote** (obrigatório):
- Use um nome descritivo, ex.: "Candidatos Feira Emprego Maio 2025"

**Vincular a uma vaga** (opcional, mas recomendado):
- Quando vinculado, a Aurora calcula automaticamente o score de compatibilidade de cada CV com a vaga

**Modo de análise:**

| Modo | O que faz |
|------|-----------|
| **Extração Simples** | Extrai apenas os dados básicos do currículo |
| **Full Parsing** | Extração completa com estruturação inteligente de todos os campos |
| **Neural Match** | Extração completa + cálculo de compatibilidade com a vaga vinculada |

**Estratégia para duplicatas** — o que fazer se o candidato já existe no sistema:

| Opção | Ação |
|-------|------|
| Sinalizar para revisão | Marca como duplicata, você decide depois |
| Ignorar | O arquivo é pulado automaticamente |
| Mesclar | Atualiza os dados do candidato existente |

**Upload de arquivos:**
- Arraste os arquivos para a área pontilhada, ou clique para selecionar
- Formatos aceitos: **PDF, DOCX, TXT, CSV, XLS, XLSX**
- Múltiplos arquivos de uma vez
- Barra de uso mostra quantos arquivos você ainda pode enviar no seu plano

Clique em **"Iniciar Importação"** para começar.

### 8.3 Acompanhar o Processamento

Na tela de detalhes do lote, uma tabela exibe cada arquivo:

| Coluna | Informação |
|--------|-----------|
| **Arquivo** | Nome do PDF enviado |
| **Status** | Processando (%) / Concluído / Erro / Duplicata |
| **Candidato** | Nome e e-mail extraídos pela Aurora |
| **Score** | Compatibilidade com a vaga vinculada |
| **Tags** | Júnior / Pleno / Sênior / Duplicata / Erro IA |
| **Ações** | Ver detalhes / Reprocessar / Excluir arquivo |

**Filtros da tabela:**
- Busca por nome do arquivo ou candidato
- Filtro por status (Todos / Concluídos / Erros / Duplicatas)

**Exportar:** Botão para baixar a lista do lote como CSV.

**Ações em massa:** Selecione múltiplos arquivos para excluir em lote.

### 8.4 Efetivar o Lote

Quando o processamento concluir, clique em **"Efetivar Lote"** para transformar os candidatos analisados em registros reais no banco de talentos.

Na confirmação, você pode optar por:
- ☑ Enviar **avaliação DISC** automaticamente para todos os candidatos criados
- ☑ Enviar outros formulários de avaliação configurados

> Uma notificação é enviada automaticamente quando o lote termina de ser processado.

---

## 9. Aurora IA

**Rota:** `/aurora-ai`

O módulo de inteligência central. A Aurora analisa currículos, calcula compatibilidades, responde perguntas e faz correspondência inteligente entre candidatos e vagas.

### 9.1 Navegação entre Modos

```
                  [ 💬 Conversa ]   [ 🎯 Match ]   [ 🕐 Histórico ]
```

Três modos disponíveis. O ativo fica com fundo escuro.

---

### Modo 1: Conversa (Chat)

Converse diretamente com a Aurora como um assistente especialista em RH.

**Interface do chat:**

```
┌─────────────────────────────────────────────────────────┐
│  🌟 Aurora Core                     • Neural Link Active │
├─────────────────────────────────────────────────────────┤
│                                                         │
│     [Você]  Como está meu funil de recrutamento?  14:32 │
│                                                         │
│  🌟 [Aurora]  Sua taxa de conversão de Triagem         │
│     para Entrevista está em 24%, acima da média        │
│     do setor de 18%. Destaque para...           14:32  │
│                                                         │
│         •••  (Aurora digitando...)                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Como Aurora pode ajudar você hoje?...       [Enviar ➜] │
└─────────────────────────────────────────────────────────┘
```

**Como usar:**
1. Digite sua pergunta ou solicitação no campo inferior
2. Pressione **Enter** ou clique no botão de envio
3. A Aurora responde com análises baseadas nos seus dados reais

**Exemplos de perguntas úteis:**
- "Qual candidato é mais adequado para a vaga de Analista de Dados?"
- "Como está minha taxa de contratação nos últimos 30 dias?"
- "Me explica o perfil DISC da Ana Beatriz"
- "Quais habilidades estão faltando nos candidatos para a vaga de Dev?"
- "Qual a diferença entre os perfis D e C no DISC?"

---

### Modo 2: Match Inteligente

Encontre os melhores candidatos para uma vaga usando toda a inteligência da Aurora.

**Painel de configuração:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Vaga Alvo: [Analista de RH - São Paulo/SP              ▼]      │
├─────────────────────────────────────────────────────────────────┤
│  Rigor da IA:  [ Flexível ]  [ Equilibrada ]  [ Rigorosa ]     │
├────────────────────────┬────────────────────────────────────────┤
│  Score Mínimo:  [70]%  │  Raio Geográfico:  [50] km           │
├────────────────────────┴────────────────────────────────────────┤
│  ○ Apenas candidatos com DISC                                   │
│  ○ Apenas candidatos com currículo                              │
├─────────────────────────────────────────────────────────────────┤
│           [ ⚡ Rodar Análise Aurora AI ]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Parâmetros explicados:**

| Parâmetro | O que controla |
|-----------|---------------|
| **Vaga Alvo** | Qual posição você quer preencher |
| **Rigor Flexível** | Retorna mais candidatos, critérios amplos |
| **Rigor Equilibrada** | Balanço entre volume e aderência (recomendado) |
| **Rigor Rigorosa** | Só candidatos com alto score, critérios estritos |
| **Score Mínimo** | Percentual mínimo de compatibilidade para aparecer |
| **Raio Geográfico** | Distância máxima do candidato à vaga em km |
| **Apenas DISC** | Filtrar só candidatos que responderam a avaliação |
| **Apenas Currículo** | Filtrar só candidatos com CV enviado |

**Resultados — Cards de candidatos:**

```
┌─────────────────────────────────────────────────┐
│  [AB]  Ana Beatriz Santos          87%           │
│        📍 São Paulo, SP · 12 km    Match AI      │
│        ✅ Alto Fit    🟦 Perfil DISC: C           │
│        📍 No Raio (12km de 50km)                 │
├─────────────────────────────────────────────────┤
│  Pontos Fortes Principais:                       │
│  [Gestão de Pessoas] [Excel Avançado] [RH Ágil] │
├─────────────────────────────────────────────────┤
│  "Candidata com sólida experiência em triagem    │
│   e alto alinhamento com cultura de inovação."  │
├─────────────────────────────────────────────────┤
│  Ver Análise Completa ›                          │
└─────────────────────────────────────────────────┘
```

Clique em **"Ver Análise Completa"** para abrir o perfil do candidato direto na aba Análise IA.

---

### Modo 3: Histórico

Exibe as últimas buscas e conversas (máximo 8 sessões). Clique em qualquer item para recarregar aquela sessão.

---

### Painel Lateral (Insights do Dia)

Painel dourado à direita com métricas em tempo real:
- Vagas Ativas no momento
- Candidatos processados no período
- Candidatos compatíveis prontos para revisão

---

## 10. DISC e Ferramentas de Avaliação

**Rota:** `/ferramentas`

### 10.1 O que é o DISC?

O DISC é um modelo de análise comportamental amplamente utilizado em RH que classifica as pessoas em quatro dimensões complementares:

| Perfil | Letra | Características |
|--------|-------|----------------|
| **Dominância** | D | Direto, decidido, competitivo, orientado a resultados. Gosta de desafios e autonomia. |
| **Influência** | I | Comunicativo, entusiasta, persuasivo. Motiva equipes e constrói relacionamentos. |
| **Estabilidade** | S | Paciente, colaborativo, confiável. Prefere ambientes harmoniosos e previsíveis. |
| **Conformidade** | C | Analítico, preciso, sistemático. Segue processos e busca qualidade. |

> Ninguém tem apenas um perfil puro — todos têm combinações. O que muda é o perfil **predominante**.

### 10.2 Como Funciona no Sistema

**Passo a passo:**

1. **Crie ou selecione** o questionário DISC (ou formulário personalizado) em `/ferramentas`
2. **Envie o link** para o candidato responder:
   - Individualmente: pelo perfil do candidato, aba **Avaliações** → "Enviar Nova"
   - Em massa: ao efetivar um lote de importação, marque a opção de envio automático
3. O candidato acessa o link no próprio dispositivo, **sem precisar de login**
4. Após responder, a Aurora IA processa automaticamente:
   - Calcula o perfil predominante (D, I, S ou C)
   - Gera resumo comportamental em texto
   - Atribui pontuação por dimensão
5. O resultado aparece na **aba DISC** e **aba Avaliações** do perfil

### 10.3 Como o DISC Influencia o Matching

A Aurora usa o perfil DISC nos cálculos de compatibilidade com vagas. Exemplos:

- Vaga de **Liderança Comercial** → favorece perfis **D** e **I**
- Vaga de **Analista de Dados** → favorece perfis **C** e **S**
- Vaga de **Atendimento ao Cliente** → favorece perfis **I** e **S**
- Vaga de **Gestor de Operações** → favorece perfis **D** e **C**

### 10.4 Formulários Personalizados

Além do DISC, você pode criar formulários personalizados para:
- Testes técnicos específicos
- Questionários de fit cultural
- Avaliações de competências específicas

O funcionamento é idêntico ao DISC: envie o link, o candidato responde, a Aurora processa.

---

## 11. Notificações

O ícone do sino 🔔 na barra superior mostra o número de notificações não lidas.

**Tipos de notificação:**

| Cor | Tipo | Exemplos |
|-----|------|---------|
| 🟢 Verde | Sucesso | Lote processado, análise concluída, candidato aprovado |
| 🔵 Azul | Informação | Novo candidato inscrito, análise iniciada |
| 🟡 Amarelo | Atenção | Arquivos com erro no lote, prazo próximo |
| 🔴 Vermelho | Erro | Falha no processamento, problema na importação |

**Gerenciar notificações:**
- Clique no sino para abrir o painel
- **"Limpar"** — remove todas as notificações de uma vez
- Novas notificações aparecem em tempo real, sem precisar recarregar a página

---

## 12. Preferências e Tema

### Modo Escuro / Claro

Clique no seu **avatar** no canto superior direito → **"Modo Escuro"** ou **"Modo Claro"**.

- **Claro (padrão):** Fundo branco, textos escuros, cores vibrantes
- **Escuro:** Fundo azul-marinho escuro, textos em branco, destaques em dourado

A preferência é salva e mantida entre sessões.

### Seu Perfil

Acesse via menu do usuário → **"Meu Perfil"** para:
- Atualizar nome e foto
- Alterar e-mail
- Outras configurações pessoais

---

## 13. Fluxo Completo de Recrutamento

O processo padrão do início ao fim:

```
ETAPA 1 — CRIAR A VAGA
━━━━━━━━━━━━━━━━━━━━━━
  Dashboard ou /vagas → "+ Nova Vaga"
  Preencha: título, requisitos, localização, modelo, salário
  Mude o status para "Aberta"
  Opcionalmente publique no portal para candidaturas externas

         ↓

ETAPA 2 — RECEBER CANDIDATOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Opção A: Importação em Lote (recomendado para grandes volumes)
  → /importar-cvs → "Novo Lote"
  → Faça upload dos PDFs (PDF, DOCX, etc.)
  → Vincule à vaga para cálculo automático de score
  → Aurora extrai dados automaticamente
  → "Efetivar Lote" → candidatos criados no sistema

  Opção B: Cadastro Manual
  → /candidatos → "+ Novo Talento"
  → Use "✨ Importar CV" para preenchimento automático por PDF

  Opção C: Portal Público
  → Candidato acessa o link da vaga e se inscreve sozinho

         ↓

ETAPA 3 — TRIAGEM INTELIGENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  /aurora-ai → Modo "Match"
  Selecione a vaga → Configure filtros
  Clique "Rodar Análise Aurora AI"
  Aurora rankeia candidatos por compatibilidade
  Identifique os melhores em segundos

         ↓

ETAPA 4 — AVALIAÇÃO COMPORTAMENTAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Perfil do candidato → Aba "Avaliações" → "Enviar Nova"
  Ou: envio automático em massa ao efetivar lote
  Candidato responde pelo link (sem login)
  Aurora processa e atualiza o score automaticamente

         ↓

ETAPA 5 — ANÁLISE DETALHADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  /candidatos → Clique no candidato → Aba "Análise IA"
  Leia: pontos fortes, riscos, perguntas de entrevista sugeridas
  Aba "DISC": perfil comportamental completo

         ↓

ETAPA 6 — ENTREVISTA
━━━━━━━━━━━━━━━━━━━━
  Use as perguntas sugeridas pela Aurora como guia
  Atualize o status: "Em análise" → "Entrevista" → "Finalista"

         ↓

ETAPA 7 — DECISÃO E FECHAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Status → "Aprovado" ou "Reprovado"
  Feche a vaga ao contratar: status → "Fechada"
  Dashboard atualiza o funil e métricas automaticamente
```

---

## 14. Dúvidas Frequentes

**Como encontro rapidamente o melhor candidato para uma vaga?**
> Aurora IA (`/aurora-ai`) → modo **Match** → selecione a vaga → defina filtros → "Rodar Análise". A Aurora rankeia todos os candidatos em segundos.

**Tenho 80 currículos em PDF. O que faço?**
> Importar CVs (`/importar-cvs`) → "Novo Lote" → arraste todos os arquivos → vincule a uma vaga → "Iniciar Importação". A Aurora processa tudo automaticamente.

**Como ver o perfil comportamental de um candidato?**
> Perfil do candidato → aba **Avaliações** → envie o DISC → aguarde o candidato responder → aba **DISC** exibe o resultado.

**Onde vejo as perguntas sugeridas para entrevista?**
> Perfil do candidato → aba **Análise IA** → seção "Perguntas Sugeridas para Entrevista" (geradas pela Aurora com base no CV + requisitos da vaga).

**Como monitoro o processo seletivo em geral?**
> Dashboard (`/dashboard`) → ajuste o período → leia os cards de métricas e o funil de recrutamento.

**Posso buscar candidatos por habilidade específica?**
> Candidatos (`/candidatos`) → campo de busca → digite a habilidade (ex.: "Python", "LGPD", "Gestão de pessoas"). A busca procura em nome, cargo e skills.

**O que significa "Compatível >80%"?**
> São candidatos que a Aurora avaliou com 80% ou mais de compatibilidade com alguma vaga aberta. Eles já estão prontos para revisão e têm alta chance de serem bons matches.

**Um arquivo deu erro na importação. E agora?**
> Na tela de detalhes do lote, encontre o arquivo com status "Erro" → clique em **"Reprocessar"**. Se o erro persistir, o arquivo pode estar corrompido ou em formato não suportado.

**Posso adicionar observações em um candidato?**
> Sim. Perfil do candidato → aba **Histórico** → campo de texto no final → "Salvar Observação". A nota fica registrada com seu nome e horário.

**Como crio atalhos no meu dashboard?**
> Dashboard → painel "Acesso Rápido" → clique no `+` → preencha nome, URL, escolha ícone e cor → Salvar. Os atalhos são pessoais e ficam disponíveis toda vez que você acessar.

---

*Recrute IA — Plataforma de Recrutamento Inteligente desenvolvida por Develoi.*  
*Dúvidas? Acesse o Suporte via menu do usuário ou contate o administrador da sua empresa.*
