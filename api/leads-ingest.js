const TABLE_NAME = process.env.SUPABASE_LEADS_TABLE || "leads";

function jsonResponse(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(payload));
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    restUrl: `${url.replace(/\/$/, "")}/rest/v1/${TABLE_NAME}`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }
  };
}

function normalizeLead(payload) {
  const now = new Date().toISOString();

  return {
    id: String(payload.id || Date.now()),
    nome: payload.nome || "Lead sem nome",
    telefone: payload.telefone || payload.telefoneContato || "Nao informado",
    telefoneContato: payload.telefoneContato || payload.telefone || "Nao informado",
    cidade: payload.cidade || "Nao informada",
    contaLuz: payload.contaLuz ?? payload.conta ?? "Nao informado",
    tipoImovel: payload.tipoImovel ?? "Nao informado",
    motivo: payload.motivo || "Sem motivo definido",
    status: payload.status || "AGUARDANDO_OPCAO",
    botEstado: payload.botEstado || payload.status || "FINALIZADO",
    prioridade: payload.prioridade || "warm",
    origem: Array.isArray(payload.origem) ? payload.origem : ["whatsapp"],
    resumo: payload.resumo || "Lead recebido pelo bot.",
    timeline: Array.isArray(payload.timeline) ? payload.timeline : ["Lead recebido no pipeline do bot."],
    owner: payload.owner || "Bot Sun Prime",
    note: payload.note ?? "",
    sourceStatus: payload.sourceStatus || "Ativo",
    stage: payload.stage || "new",
    criadoEm: payload.criadoEm || now,
    ultimoEventoEm: payload.ultimoEventoEm || now,
    updatedAt: now
  };
}

async function supabaseFetch(path = "", options = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase nao configurado");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      ...config.headers,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Erro ao acessar Supabase");
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-bot-ingest-secret");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const expectedSecret = process.env.BOT_INGEST_SECRET;

    if (!expectedSecret) {
      return jsonResponse(res, 503, { ok: false, error: "BOT_INGEST_SECRET nao configurado" });
    }

    const receivedSecret = req.headers["x-bot-ingest-secret"];

    if (receivedSecret !== expectedSecret) {
      return jsonResponse(res, 401, { ok: false, error: "unauthorized" });
    }

    const payload = normalizeLead(req.body || {});

    const data = await supabaseFetch("?on_conflict=id", {
      method: "POST",
      body: JSON.stringify([payload]),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation"
      }
    });

    return jsonResponse(res, 200, {
      ok: true,
      item: Array.isArray(data) ? data[0] : payload
    });
  } catch (error) {
    return jsonResponse(res, 500, { ok: false, error: error.message });
  }
}
