create extension if not exists "pgcrypto";

create table if not exists public.leads (
    id text primary key,
    nome text not null default 'Lead sem nome',
    telefone text not null default 'Nao informado',
    "telefoneContato" text not null default 'Nao informado',
    cidade text not null default 'Nao informada',
    "contaLuz" text not null default 'Nao informado',
    "tipoImovel" text not null default 'Nao informado',
    motivo text not null default 'Sem motivo definido',
    status text not null default 'AGUARDANDO_OPCAO',
    "botEstado" text not null default 'AGUARDANDO_OPCAO',
    prioridade text not null default 'warm',
    origem jsonb not null default '["whatsapp"]'::jsonb,
    resumo text not null default 'Sem resumo operacional registrado.',
    timeline jsonb not null default '["Lead recebido no pipeline do bot."]'::jsonb,
    owner text not null default 'Sem dono',
    note text not null default '',
    "sourceStatus" text not null default 'Ativo',
    stage text not null default 'new',
    "criadoEm" timestamptz not null default now(),
    "ultimoEventoEm" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now()
);

create index if not exists leads_updated_at_idx on public.leads ("updatedAt" desc);
create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_owner_idx on public.leads (owner);

alter table public.leads enable row level security;

drop policy if exists "Public read leads" on public.leads;
create policy "Public read leads"
on public.leads
for select
to anon, authenticated
using (true);

drop policy if exists "Service role full access leads" on public.leads;
create policy "Service role full access leads"
on public.leads
for all
to service_role
using (true)
with check (true);
