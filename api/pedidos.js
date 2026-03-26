let dados = [];

function upsertLead(payload) {
    const id = String(payload.id || Date.now());
    const currentIndex = dados.findIndex((item) => String(item.id) === id);
    const currentItem = currentIndex >= 0 ? dados[currentIndex] : null;

    const nextItem = {
        id,
        nome: payload.nome || currentItem?.nome || "Lead sem nome",
        telefone: payload.telefone || currentItem?.telefone || payload.telefoneContato || "Nao informado",
        telefoneContato: payload.telefoneContato || currentItem?.telefoneContato || payload.telefone || "Nao informado",
        cidade: payload.cidade || currentItem?.cidade || "Nao informada",
        contaLuz: payload.contaLuz ?? currentItem?.contaLuz ?? null,
        tipoImovel: payload.tipoImovel ?? currentItem?.tipoImovel ?? null,
        motivo: payload.motivo || currentItem?.motivo || "Sem motivo definido",
        status: payload.status || currentItem?.status || "AGUARDANDO_OPCAO",
        botEstado: payload.botEstado || currentItem?.botEstado || payload.status || "AGUARDANDO_OPCAO",
        prioridade: payload.prioridade || currentItem?.prioridade || "morno",
        origem: payload.origem || currentItem?.origem || ["whatsapp"],
        resumo: payload.resumo || currentItem?.resumo || "Sem resumo operacional registrado.",
        timeline: payload.timeline || currentItem?.timeline || ["Lead recebido no pipeline do bot."],
        criadoEm: currentItem?.criadoEm || payload.criadoEm || new Date().toISOString(),
        ultimoEventoEm: payload.ultimoEventoEm || new Date().toISOString()
    };

    if (currentIndex >= 0) {
        dados[currentIndex] = nextItem;
    } else {
        dados.unshift(nextItem);
    }

    return nextItem;
}

export default function handler(req, res) {
    if (req.method === "GET") {
        return res.status(200).json(dados);
    }

    if (req.method === "POST") {
        const item = upsertLead(req.body || {});
        return res.status(200).json({ ok: true, item });
    }

    if (req.method === "PUT") {
        const item = upsertLead(req.body || {});
        return res.status(200).json({ ok: true, item });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
}
