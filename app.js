/* Vitrine Nina D’luxe — busca, filtro e pedidos no WhatsApp. */

(function () {
  const config = window.NINA_CONFIG || {};
  const WHATSAPP = String(config.whatsapp || "").replace(/\D/g, "");
  const MENSAGEM = config.mensagem || "Olá! Tenho interesse no perfume {nome}";

  const elBusca = document.getElementById("busca");
  const elFiltrosWrap = document.getElementById("filtros-marcas");
  const elListaMarcas = document.getElementById("lista-marcas");
  const elResultado = document.getElementById("resultado");
  const elGrade = document.getElementById("grade");
  const elVazio = document.getElementById("vazio");

  let produtos = [];
  let marcaAtiva = "todas";

  function linkWhatsApp(nome) {
    const texto = MENSAGEM.replaceAll("{nome}", nome || "");
    const base = "https://wa.me/" + WHATSAPP;
    return base + "?text=" + encodeURIComponent(texto);
  }

  function aplicarLinksGerais() {
    const geral = "https://wa.me/" + WHATSAPP +
      "?text=" + encodeURIComponent("Olá! Gostaria de conhecer os perfumes da Nina D’luxe.");
    const flutuante = document.getElementById("whatsapp-flutuante");
    const rodape = document.getElementById("rodape-whatsapp");
    if (flutuante) flutuante.href = geral;
    if (rodape) rodape.href = geral;
  }

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function precoVisivel(preco) {
    if (preco === null || preco === undefined || preco === "") return null;
    const n = Number(String(preco).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function tamanhoVisivel(ml) {
    const n = Number(ml);
    if (!Number.isFinite(n) || n <= 0) return "";
    return n + " ml";
  }

  const SVG_FRASCO = `
    <svg class="card__placeholder" viewBox="0 0 80 140" fill="none" aria-hidden="true">
      <rect x="30" y="6" width="20" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M28 16h24v8c0 3-2 6-6 8l-2 14h-8l-2-14c-4-2-6-5-6-8V16z" stroke="currentColor" stroke-width="1.4"/>
      <path d="M24 48c-8 6-12 16-12 30 0 22 12 48 28 48s28-26 28-48c0-14-4-24-12-30" stroke="currentColor" stroke-width="1.5"/>
      <path d="M28 64c4 6 8 8 12 8s8-2 12-8" stroke="currentColor" stroke-width="1" opacity="0.7"/>
    </svg>`;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cardHTML(p) {
    const disponivel = p.disponivel !== false;
    const seloClasse = disponivel ? "" : " is-esgotado";
    const seloTexto = disponivel ? "Disponível" : "Esgotado";
    const preco = precoVisivel(p.preco);
    const precoHTML = preco
      ? `<p class="card__preco">${escapeHtml(preco)}</p>`
      : `<p class="card__preco is-consulte">Consulte</p>`;
    const marca = p.marca ? `<p class="card__marca">${escapeHtml(p.marca)}</p>` : "";
    const tamanho = tamanhoVisivel(p.tamanhoMl);
    const linha = p.linha ? escapeHtml(p.linha) : "";
    const metaPartes = [linha, tamanho].filter(Boolean);
    const meta = metaPartes.length
      ? `<p class="card__meta">${metaPartes.join(" · ")}</p>`
      : "";
    const temFoto = p.foto && String(p.foto).trim();
    const foto = temFoto
      ? `<img src="${escapeHtml(String(p.foto).trim())}" alt="${escapeHtml(p.nome)}" />`
      : SVG_FRASCO;
    const fotoClasse = temFoto ? " card__foto--com-foto" : "";
    const wa = linkWhatsApp(p.nome);

    return `
      <article class="card${disponivel ? "" : " is-esgotado"}">
        <div class="card__foto${fotoClasse}">
          ${foto}
          <span class="card__selo${seloClasse}">${seloTexto}</span>
        </div>
        <div class="card__corpo">
          ${marca}
          <h2 class="card__nome">${escapeHtml(p.nome)}</h2>
          ${meta}
          ${precoHTML}
          <a class="card__pedir" href="${wa}" target="_blank" rel="noopener noreferrer">
            Pedir no WhatsApp
          </a>
        </div>
      </article>`;
  }

  function produtosFiltrados() {
    const q = normalizar(elBusca.value);
    return produtos.filter((p) => {
      if (marcaAtiva !== "todas") {
        if (normalizar(p.marca) !== normalizar(marcaAtiva)) return false;
      }
      if (!q) return true;
      const alvo = [p.nome, p.marca, p.linha].map(normalizar).join(" ");
      return alvo.includes(q);
    });
  }

  function renderizar() {
    const lista = produtosFiltrados();
    const total = produtos.length;
    const q = elBusca.value.trim();

    if (q || marcaAtiva !== "todas") {
      const parteMarca = marcaAtiva !== "todas" ? ` na marca ${marcaAtiva}` : "";
      const parteBusca = q ? ` para “${q}”` : "";
      elResultado.textContent = `${lista.length} de ${total} produtos${parteMarca}${parteBusca}`;
    } else {
      elResultado.textContent = `${total} produtos`;
    }

    elGrade.innerHTML = lista.map(cardHTML).join("");
    elVazio.hidden = lista.length > 0;
    elGrade.hidden = lista.length === 0;
  }

  function montarFiltros() {
    const marcas = [...new Set(produtos.map((p) => (p.marca || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    if (!marcas.length) return;

    elFiltrosWrap.hidden = false;
    const botoes = ["Todas", ...marcas].map((nome) => {
      const valor = nome === "Todas" ? "todas" : nome;
      const ativo = marcaAtiva === valor;
      return `<button type="button" class="filtro${ativo ? " is-ativo" : ""}" data-marca="${escapeHtml(valor)}" aria-pressed="${ativo}">${escapeHtml(nome)}</button>`;
    });
    elListaMarcas.innerHTML = botoes.join("");
  }

  elListaMarcas.addEventListener("click", (ev) => {
    const botao = ev.target.closest("[data-marca]");
    if (!botao) return;
    marcaAtiva = botao.getAttribute("data-marca") || "todas";
    montarFiltros();
    renderizar();
  });

  elBusca.addEventListener("input", renderizar);

  aplicarLinksGerais();

  fetch("produtos.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("Falha ao carregar produtos");
      return r.json();
    })
    .then((dados) => {
      produtos = Array.isArray(dados) ? dados : (dados.produtos || []);
      montarFiltros();
      renderizar();
    })
    .catch(() => {
      elResultado.textContent = "";
      elVazio.hidden = false;
      elVazio.textContent = "Não foi possível carregar os produtos agora. Tente de novo em instantes ou fale no WhatsApp.";
    });
})();
