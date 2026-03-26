let dados = [];

export default function handler(req, res) {

  if (req.method === 'POST') {
    const item = {
      id: Date.now(),
      ...req.body
    };

    dados.unshift(item);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    return res.status(200).json(dados);
  }

  if (req.method === 'PUT') {
    const { id, status } = req.body;

    dados = dados.map(d =>
      d.id === id ? { ...d, status } : d
    );
async function testeLead() {
  await fetch("/api/pedidos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nome: "Cliente Teste",
      telefone: "81999999999",
      cidade: "Recife",
      status: "novo"
    })
  });
}
    return res.status(200).json({ ok: true });
  }
}
