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
  const VISTA_KEY = "nina-dluxe-vista";

  let produtos = [];
  let marcaAtiva = "todas";

  function lerVista() {
    try {
      const v = localStorage.getItem(VISTA_KEY);
      if (v === "lista" || v === "grade") return v;
    } catch (e) {}
    return "grade";
  }

  function aplicarVista(vista) {
    const modo = vista === "lista" ? "lista" : "grade";
    document.body.classList.toggle("is-lista", modo === "lista");
    document.body.classList.toggle("is-grade", modo === "grade");
    document.querySelectorAll(".vista__botao").forEach((btn) => {
      const ativo = btn.getAttribute("data-vista") === modo;
      btn.classList.toggle("is-ativo", ativo);
      btn.setAttribute("aria-pressed", ativo ? "true" : "false");
    });
    try { localStorage.setItem(VISTA_KEY, modo); } catch (e) {}
  }

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
            <svg class="card__pedir-icone" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.5 2 2.02 6.48 2.02 12c0 1.77.46 3.45 1.28 4.91L2 22l5.25-1.38A9.9 9.9 0 0 0 12.04 22c5.52 0 10.02-4.48 10.02-10 0-2.65-1.05-5.15-2.99-7.09ZM12.04 20.15a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.29c0-4.54 3.7-8.23 8.23-8.23 2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.81c0 4.54-3.7 8.15-8.23 8.15Zm4.52-6.13c-.25-.12-1.47-.72-1.7-.81-.22-.08-.39-.12-.55.12-.16.25-.63.8-.77.97-.14.16-.28.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.28.37-.42.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.75-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.10-.22-.16-.47-.28Z"/>
            </svg>
            <span class="card__pedir-curto">Pedir</span>
            <span class="card__pedir-longo">Pedir no WhatsApp</span>
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

  document.querySelector(".vista").addEventListener("click", (ev) => {
    const botao = ev.target.closest("[data-vista]");
    if (!botao) return;
    aplicarVista(botao.getAttribute("data-vista"));
  });

  aplicarVista(lerVista());
  aplicarLinksGerais();

  fetch("produtos.json?t=" + Date.now(), { cache: "no-store" })
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
