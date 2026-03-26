# Setup Supabase

## 1. Criar tabela

No SQL Editor do Supabase, execute:

```sql
\i supabase/leads.sql
```

Se o editor nao aceitar `\i`, copie o conteudo de [`supabase/leads.sql`](/Users/marcosgomesfilho/Desktop/PAINEL%20SUNPRIME/PAINEL%20SUNPRIME/sunprime-painel/supabase/leads.sql) e rode manualmente.

## 2. Configurar variaveis na Vercel

No projeto da Vercel, adicione:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_LEADS_TABLE`
- `MASTER_RESET_KEY`

Opcionalmente, se a Vercel implicar com esse nome no formulário, você pode usar:

- `RESETKEY`
- ou `ADMIN_RESET_KEY`

Valor sugerido para `SUPABASE_LEADS_TABLE`:

```txt
leads
```

Valor sugerido para `MASTER_RESET_KEY`:

```txt
crie-uma-chave-forte-so-para-admin
```

## 3. Redeploy

Depois de salvar as variaveis, faça um novo deploy na Vercel.

## 4. Resultado esperado

- os leads deixam de sumir ao atualizar
- todos os dispositivos passam a ver os mesmos dados
- alterações de etapa, responsável e nota passam a ser compartilhadas
- o painel atualiza automaticamente a cada 15 segundos
