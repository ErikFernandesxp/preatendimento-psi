# Pré-Atendimento Psicológico

Sistema de gerenciamento de pré-atendimento e acompanhamento entre consultas,
para psicólogos organizarem informações de pacientes e pacientes responderem
atividades enviadas por seus psicólogos.

Stack: **Next.js (App Router) + Supabase (Auth, Postgres, Storage) + Tailwind CSS**,
pronto para deploy na **Vercel**.

> Este sistema é uma ferramenta de apoio ao atendimento psicológico. Não realiza
> diagnóstico automático nem classificação clínica por IA.

---

## 1. Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do seu projeto Supabase
npm run dev
```

Antes de rodar, execute as migrations no seu projeto Supabase (seção 4).

---

## 2. Estrutura de pastas

```
src/
  app/
    (auth)/              # login, cadastro, esqueci/redefinir senha - sem sidebar
    (psicologo)/          # rotas protegidas por role=psychologist
      psicologo/
        dashboard/
        pacientes/[id]/    # perfil do paciente com abas
        pacientes/novo/
        atividades/nova/
        pre-atendimento/[id]/
        notificacoes/
        configuracoes/
    (paciente)/            # rotas protegidas por role=patient
      paciente/
        inicio/
        atividades/[id]/   # tela de resposta da atividade
        historico/
        perfil/
        notificacoes/
    api/
      patients/            # POST - psicólogo cadastra paciente (via Admin API)
      activities/send/     # POST - envia atividade a um paciente + notificação
  components/
    ui/                    # Button, Card, Badge, Tabs, EmptyState (design system mínimo)
    layout/                # Sidebars do psicólogo e do paciente
    activities/            # Formulário de resposta, botão de envio de atividade
    patients/              # Anotações privadas
    pre-atendimento/       # Pontos para consulta, marcação de respostas
    notifications/         # Lista de notificações
  lib/
    supabase/
      client.ts            # cliente Supabase para Client Components
      server.ts             # cliente para Server Components/Route Handlers + service role
      middleware.ts         # sessão + proteção de rotas por papel
    utils/                  # formatação de datas, labels de status, cn()
  types/
    database.types.ts       # tipos do banco (recomenda-se gerar via Supabase CLI)
supabase/
  migrations/
    0001_schema.sql          # tabelas, enums, índices, triggers de updated_at
    0002_rls.sql              # Row Level Security completo
    0003_storage.sql          # bucket privado + políticas de Storage
```

Cada grupo de rotas - `(auth)`, `(psicologo)`, `(paciente)` - tem seu próprio
`layout.tsx`. Os dois últimos verificam sessão e papel do usuário no servidor
antes de renderizar qualquer página (segunda camada de proteção; a primeira é
o `middleware.ts`, a definitiva é o RLS no banco).

---

## 3. Fluxo de autenticação

1. **Psicólogo** se cadastra em `/cadastro` (cria `auth.users`, depois
   `profiles` e `psychologists`).
2. **Paciente** nunca se autocadastra: o psicólogo cria o paciente em
   `/psicologo/pacientes/novo`, que chama `POST /api/patients`. Essa rota
   roda no servidor e usa a **service role key** para:
   - Convidar o paciente por e-mail via `supabase.auth.admin.inviteUserByEmail`;
   - Criar as linhas em `profiles` e `patients` já vinculadas ao psicólogo.
   O paciente recebe um e-mail, define a senha e passa a acessar `/paciente/*`.
3. `middleware.ts` roda em toda requisição: redireciona não autenticados para
   `/login`, e garante que psicólogos só acessem `/psicologo/*` e pacientes
   só acessem `/paciente/*`.
4. Login, logout, recuperação e redefinição de senha usam `supabase.auth`
   diretamente (`signInWithPassword`, `signOut`, `resetPasswordForEmail`,
   `updateUser`).

**Importante:** o roteamento no frontend é só UX. Quem garante que um
paciente nunca veja dados de outro usuário é o RLS no banco (seção 5).

---

## 4. Banco de dados - como aplicar as migrations

No painel do Supabase, vá em **SQL Editor** e rode, nesta ordem:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_storage.sql`

Ou, com a Supabase CLI:

```bash
supabase link --project-ref SEU-PROJETO
supabase db push
```

### Tabelas principais

| Tabela | Papel |
|---|---|
| `profiles` | 1 linha por usuário autenticado (psicólogo ou paciente) |
| `psychologists` | dados profissionais, ligada a `profiles` |
| `patients` | ligada a `profiles` (o paciente) e a `psychologists` (quem o atende) |
| `activities` | modelos de atividade criados pelo psicólogo |
| `patient_activities` | o envio de uma atividade a um paciente específico (com prazo e status) |
| `responses` | a resposta do paciente a um `patient_activity` |
| `response_files` | arquivos/imagens anexados a uma resposta |
| `psychologist_notes` | anotações clínicas privadas - nunca acessíveis ao paciente |
| `consultation_points` | itens privados para abordar na próxima consulta |
| `response_flags` | marcação de respostas como importante/revisar/atenção |
| `notifications` | notificações internas por usuário |
| `audit_log` | registro de ações sensíveis (login, criação, envio, upload etc.) |

Depois de gerar o projeto no Supabase, regenere os tipos TypeScript reais com:

```bash
npx supabase gen types typescript --project-id SEU-PROJETO > src/types/database.types.ts
```

(o arquivo atual foi escrito manualmente para bater com as migrations, mas o
gerador oficial é a fonte da verdade).

---

## 5. Row Level Security (RLS)

RLS está habilitado em **todas** as tabelas (`0002_rls.sql`). O acesso nunca
depende do frontend - mesmo que alguém chame a API do Supabase diretamente
com a anon key, as políticas abaixo continuam valendo.

Funções auxiliares `security definer` evitam recursão de política e
concentram a lógica de "quem é o usuário atual":

- `auth_profile_id()` - id da linha `profiles` do usuário logado;
- `auth_psychologist_id()` - id da linha `psychologists`, se o usuário for psicólogo;
- `auth_patient_id()` - id da linha `patients`, se o usuário for paciente;
- `is_own_patient(patient_id)` - true se o paciente pertence ao psicólogo logado.

Regras principais:

- Um **paciente** só enxerga a própria linha em `patients`, as próprias
  `patient_activities`/`responses`/`response_files`, e o profile do seu
  psicólogo. Não há **nenhuma** política de `select` para paciente em
  `psychologist_notes` - acesso é zero por padrão, não apenas filtrado.
- Um **psicólogo** só enxerga pacientes onde `psychologist_id = auth_psychologist_id()`.
  Todas as tabelas dependentes (`patient_activities`, `responses`, notas,
  pontos de consulta, flags) filtram por `is_own_patient(...)`.
- `notifications` e `audit_log` são só-leitura para o próprio `user_id`;
  a escrita acontece via **service role** nas route handlers
  (`/api/patients`, `/api/activities/send`), nunca pelo cliente autenticado.

### Testando as políticas

Recomendado antes de ir para produção:

1. Criar 2 psicólogos e 2 pacientes (1 paciente por psicólogo);
2. Autenticado como paciente A, tentar `select` em um `patient_activity` do
   paciente B pelo `id` direto -> deve retornar vazio;
3. Autenticado como psicólogo A, tentar `select` no paciente do psicólogo B ->
   deve retornar vazio;
4. Confirmar que nenhuma sessão de paciente consegue ler `psychologist_notes`,
   mesmo sabendo o `id` da nota.

---

## 6. Supabase Storage

Bucket **`patient-files`**, criado como **privado** (`public: false`) em
`0003_storage.sql`, com limite de 10MB e mimetypes permitidos por policy.

Convenção de caminho (usada em `ActivityResponseForm.tsx`):

```
patient/{patient_id}/activities/{activity_id}/{timestamp}-{filename}
```

Políticas de `storage.objects`:

- Paciente tem acesso total (`select`/`insert`/`update`/`delete`) apenas a
  objetos cujo `patient_id` no caminho bate com `auth_patient_id()`;
- Psicólogo tem **somente leitura** de arquivos de pacientes vinculados a ele
  (`is_own_patient(...)`);
- Nenhuma outra política existe -> qualquer outro usuário tem acesso negado
  por padrão, inclusive outros pacientes e psicólogos não vinculados.

Como o bucket é privado, downloads devem usar URLs assinadas
(`supabase.storage.from('patient-files').createSignedUrl(path, expiresIn)`)
em vez de URLs públicas - isso ainda não está implementado na UI e é um bom
próximo passo (ver seção 8).

---

## 7. Segurança e LGPD

- Toda escrita sensível (criação de paciente, envio de atividade) passa por
  route handlers de servidor que usam a service role apenas para o que o
  cliente autenticado não pode fazer (convidar usuário, notificar, auditar) -
  nunca para contornar RLS em leitura de dados de terceiros.
- `audit_log` registra `patient_created` e `activity_sent` como exemplo;
  amplie para outras ações (login, upload, exclusão) usando o mesmo padrão
  (`createServiceRoleClient().from('audit_log').insert(...)`).
- Nenhuma variável sensível fica hardcoded - tudo vem de `.env.local`
  (nunca commitado; veja `.env.example`).
- O sistema não implementa diagnóstico automático nem classificação clínica
  por IA, propositalmente.

---

## 8. MVP entregue nesta versão

- [x] Login/cadastro (psicólogo) + convite de paciente por e-mail
- [x] Perfis de psicólogo e paciente com áreas e permissões distintas
- [x] Cadastro e listagem de pacientes com busca e filtros
- [x] Criação de atividades (todos os tipos: texto livre, diário, sim/não,
      escala, múltipla escolha, seleção única, upload de imagem/arquivo)
- [x] Envio de atividade a um paciente com prazo
- [x] Dashboard do paciente (pendentes/em andamento/respondidas)
- [x] Resposta de atividades com rascunho, confirmação antes do envio e upload
- [x] Visualização de respostas pelo psicólogo (perfil do paciente, abas)
- [x] Anotações privadas (CRUD, RLS exclusivo do psicólogo)
- [x] Pré-atendimento (resumo, marcação de respostas, pontos para consulta)
- [x] RLS completo + Storage Policies
- [x] Deploy-ready para Vercel

### Próximos passos sugeridos (fora do MVP)

- URLs assinadas para download de arquivos no perfil do paciente (hoje a
  aba "Arquivos" lista os nomes, mas não gera link de download);
- campo `overdue` calculado (hoje é derivado no frontend comparando datas)
  poderia virar um cron/Edge Function que atualiza `patient_activities.status`;
- notificações por e-mail/WhatsApp; agenda de consultas; relatórios; app mobile.

---

## 9. Deploy

```
GitHub -> Vercel -> aplicação
Aplicação -> Supabase Auth / Database / Storage
```

1. Suba o repositório no GitHub;
2. Importe o repositório na Vercel;
3. Configure as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) no painel
   da Vercel;
4. Configure a URL de redirecionamento de recuperação de senha no Supabase
   Auth (`Authentication -> URL Configuration`) apontando para
   `https://SEU-DOMINIO/redefinir-senha`.
