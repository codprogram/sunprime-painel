const TABLE_NAME = process.env.SUPABASE_LEADS_TABLE || "leads";
const RESET_MASTER_KEY = process.env.MASTER_RESET_KEY || process.env.RESETKEY || process.env.ADMIN_RESET_KEY;

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

function normalizeLead(payload, currentLead = {}) {
    const id = String(payload.id || currentLead.id || Date.now());
    const now = new Date().toISOString();

    return {
        id,
        nome: payload.nome || currentLead.nome || "Lead sem nome",
        telefone: payload.telefone || currentLead.telefone || payload.telefoneContato || "Nao informado",
        telefoneContato: payload.telefoneContato || currentLead.telefoneContato || payload.telefone || "Nao informado",
        cidade: payload.cidade || currentLead.cidade || "Nao informada",
        contaLuz: payload.contaLuz ?? payload.conta ?? currentLead.contaLuz ?? "Nao informado",
        tipoImovel: payload.tipoImovel ?? currentLead.tipoImovel ?? "Nao informado",
        motivo: payload.motivo || currentLead.motivo || "Sem motivo definido",
        status: payload.status || currentLead.status || "AGUARDANDO_OPCAO",
        botEstado: payload.botEstado || currentLead.botEstado || payload.status || "AGUARDANDO_OPCAO",
        prioridade: payload.prioridade || currentLead.prioridade || "warm",
        origem: Array.isArray(payload.origem) ? payload.origem : (currentLead.origem || ["whatsapp"]),
        resumo: payload.resumo || currentLead.resumo || "Sem resumo operacional registrado.",
        timeline: Array.isArray(payload.timeline) ? payload.timeline : (currentLead.timeline || ["Lead recebido no pipeline do bot."]),
        owner: payload.owner || currentLead.owner || "Sem dono",
        note: payload.note ?? currentLead.note ?? "",
        sourceStatus: payload.sourceStatus || currentLead.sourceStatus || "Ativo",
        stage: payload.stage || currentLead.stage || "new",
        criadoEm: currentLead.criadoEm || payload.criadoEm || now,
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

async function getLeadById(id) {
    const data = await supabaseFetch(`?id=eq.${encodeURIComponent(id)}&limit=1`);
    return Array.isArray(data) ? data[0] : null;
}

async function listLeads() {
    return supabaseFetch("?select=*&order=updatedAt.desc");
}

async function deleteLead(id) {
    return supabaseFetch(`?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
}

async function deleteFinalizedLeads() {
    return supabaseFetch("?or=(stage.eq.done,botEstado.eq.FINALIZADO,status.eq.FINALIZADO)&select=id,stage,botEstado,status", {
        method: "DELETE"
    });
}

async function upsertLead(payload) {
    const id = String(payload.id || Date.now());
    const currentLead = await getLeadById(id);
    const normalizedLead = normalizeLead({ ...payload, id }, currentLead || {});

    const data = await supabaseFetch("?on_conflict=id", {
        method: "POST",
        body: JSON.stringify([normalizedLead]),
        headers: {
            Prefer: "resolution=merge-duplicates,return=representation"
        }
    });

    return Array.isArray(data) ? data[0] : normalizedLead;
}

export default async function handler(req, res) {
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).end();
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
        if (!getSupabaseConfig()) {
            return jsonResponse(res, 503, {
                ok: false,
                error: "Supabase nao configurado",
                missing: [
                    "SUPABASE_URL",
                    "SUPABASE_SERVICE_ROLE_KEY"
                ]
            });
        }

        if (req.method === "GET") {
            const items = await listLeads();
            return jsonResponse(res, 200, { ok: true, items });
        }

        if (req.method === "DELETE") {
            const { id, scope, masterKey } = req.query || {};

            if (scope === "finalized") {
                if (!RESET_MASTER_KEY) {
                    return jsonResponse(res, 503, { ok: false, error: "MASTER_RESET_KEY nao configurada" });
                }

                if (masterKey !== RESET_MASTER_KEY) {
                    return jsonResponse(res, 403, { ok: false, error: "Chave mestre invalida" });
                }

                const deletedItems = await deleteFinalizedLeads();
                return jsonResponse(res, 200, {
                    ok: true,
                    deletedCount: Array.isArray(deletedItems) ? deletedItems.length : 0
                });
            }

            if (!id) {
                return jsonResponse(res, 400, { ok: false, error: "ID obrigatorio" });
            }

            await deleteLead(id);
            return jsonResponse(res, 200, { ok: true });
        }

        if (req.method === "POST" && req.body?.action === "reset_finalized") {
            const masterKey = req.body?.masterKey;

            if (!RESET_MASTER_KEY) {
                return jsonResponse(res, 503, { ok: false, error: "MASTER_RESET_KEY nao configurada" });
            }

            if (masterKey !== RESET_MASTER_KEY) {
                return jsonResponse(res, 403, { ok: false, error: "Chave mestre invalida" });
            }

            const deletedItems = await deleteFinalizedLeads();
            return jsonResponse(res, 200, {
                ok: true,
                deletedCount: Array.isArray(deletedItems) ? deletedItems.length : 0
            });
        }

        if ((req.method === "POST" && !req.body?.action) || req.method === "PUT") {
            const item = await upsertLead(req.body || {});
            return jsonResponse(res, 200, { ok: true, item });
        }

        return jsonResponse(res, 405, { ok: false, error: "Method not allowed" });
    } catch (error) {
        return jsonResponse(res, 500, { ok: false, error: error.message });
    }
}
