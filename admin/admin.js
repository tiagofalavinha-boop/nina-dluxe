/* Área da Nina — edita produtos.json e fotos direto no GitHub (API "contents").
 * O site (GitHub Pages) republica sozinho em 1–2 minutos após cada salvamento. */
(function () {
  "use strict";

  const REPO = "tiagofalavinha-boop/nina-dluxe";
  const BRANCH = "main";
  const ARQ_PRODUTOS = "produtos.json";
  const ARQ_CREDENCIAIS = "admin/credenciais.json";
  const TAM_FOTO = 800;
  const CHAVE_TOKEN = "nina-admin-token";

  // Só para testes locais: http://localhost:PORTA/admin/?api=http://localhost:PORTA2
  const params = new URLSearchParams(location.search);
  const ehLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = (ehLocal && params.get("api")) || "https://api.github.com";

  const $ = (id) => document.getElementById(id);

  const estado = {
    token: null,
    dados: null, // objeto completo do produtos.json
    sha: null,
    filtro: "todos",
    editandoId: null, // null = novo produto
    fotoNova: null, // { blob, ext, url }
    removerFoto: false,
    previas: {}, // caminho -> objectURL (fotos recém-enviadas, antes do site atualizar)
  };

  /* ---------------- utilidades ---------------- */

  function mostrarTela(id) {
    ["tela-entrar", "tela-configurar", "tela-lista", "tela-editar"].forEach((t) => {
      $(t).hidden = t !== id;
    });
    window.scrollTo(0, 0);
  }

  function aviso(texto, opcoes) {
    const o = opcoes || {};
    $("aviso").hidden = false;
    $("aviso-texto").textContent = texto;
    $("aviso-giro").hidden = !o.carregando;
    $("aviso-ok").hidden = !!o.carregando;
    if (!o.carregando) $("aviso-ok").focus();
  }
  function fecharAviso() {
    $("aviso").hidden = true;
  }
  $("aviso-ok").addEventListener("click", fecharAviso);

  function mostrarErro(id, texto) {
    const el = $(id);
    el.textContent = texto || "";
    el.hidden = !texto;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function normalizar(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function slug(t) {
    return normalizar(t).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "perfume";
  }

  /* "250", "250,90", "1.250,90", "R$ 1250.9" -> 250 / 250.9 / 1250.9. Vazio -> null. */
  function lerPreco(texto) {
    let s = String(texto || "").replace(/[^\d.,]/g, "");
    if (!s) return null;
    if (s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, "");
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return NaN;
    if (n <= 0) return null;
    return Math.round(n * 100) / 100;
  }

  function precoTexto(n) {
    if (n === null || n === undefined || n === "") return "";
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return "";
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function utf8ParaB64(texto) {
    return NinaCripto.paraB64(new TextEncoder().encode(texto));
  }
  function b64ParaUtf8(b64) {
    return new TextDecoder().decode(NinaCripto.deB64(String(b64).replace(/\s/g, "")));
  }

  function urlFoto(caminho) {
    if (!caminho) return "";
    if (estado.previas[caminho]) return estado.previas[caminho];
    return "../" + String(caminho).replace(/^\/+/, "");
  }

  function produtos() {
    return (estado.dados && estado.dados.produtos) || [];
  }

  /* ---------------- GitHub API ---------------- */

  async function gh(metodo, caminho, corpo) {
    const resp = await fetch(API + caminho, {
      method: metodo,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + estado.token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    let json = null;
    try { json = await resp.json(); } catch (e) {}
    if (!resp.ok) {
      const erro = new Error((json && json.message) || "Erro " + resp.status);
      erro.status = resp.status;
      throw erro;
    }
    return json;
  }

  function caminhoConteudo(arquivo) {
    return "/repos/" + REPO + "/contents/" + arquivo.split("/").map(encodeURIComponent).join("/");
  }

  async function lerArquivo(arquivo) {
    const r = await gh("GET", caminhoConteudo(arquivo) + "?ref=" + BRANCH + "&t=" + Date.now());
    return { sha: r.sha, texto: b64ParaUtf8(r.content) };
  }

  async function gravarArquivo(arquivo, conteudoB64, mensagem, sha) {
    const corpo = { message: mensagem, content: conteudoB64, branch: BRANCH };
    if (sha) corpo.sha = sha;
    const r = await gh("PUT", caminhoConteudo(arquivo), corpo);
    return r && r.content && r.content.sha;
  }

  async function carregarProdutos() {
    const { sha, texto } = await lerArquivo(ARQ_PRODUTOS);
    const dados = JSON.parse(texto);
    if (Array.isArray(dados)) {
      estado.dados = { produtos: dados };
    } else {
      estado.dados = dados;
      if (!Array.isArray(estado.dados.produtos)) estado.dados.produtos = [];
    }
    estado.sha = sha;
  }

  /* Aplica "alterar(dados)" sobre a versão mais nova e grava.
   * Se outra pessoa/aparelho salvou antes (conflito), recarrega e tenta de novo. */
  async function salvarProdutos(alterar, mensagem) {
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      if (tentativa > 0) await carregarProdutos();
      const copia = JSON.parse(JSON.stringify(estado.dados));
      alterar(copia);
      const texto = JSON.stringify(copia, null, 2) + "\n";
      try {
        const novoSha = await gravarArquivo(ARQ_PRODUTOS, utf8ParaB64(texto), mensagem, estado.sha);
        estado.dados = copia;
        estado.sha = novoSha;
        return;
      } catch (e) {
        if (e.status === 409 || e.status === 422) {
          await new Promise((ok) => setTimeout(ok, 800 * (tentativa + 1)));
          continue;
        }
        throw e;
      }
    }
    throw new Error("Não consegui salvar porque o arquivo mudou. Tente de novo.");
  }

  function mensagemErro(e) {
    if (!navigator.onLine) return "Sem internet. Confira a conexão e tente de novo.";
    if (e && e.status === 401) return "O acesso expirou ou foi cancelado. Peça para o Tiago renovar o token.";
    if (e && e.status === 403) return "O acesso não tem permissão para salvar. Peça para o Tiago conferir o token.";
    if (e && e.status === 404) return "Arquivo não encontrado no site. Peça ajuda ao Tiago.";
    return "Algo deu errado: " + ((e && e.message) || "erro desconhecido") + ". Tente de novo.";
  }

  /* ---------------- entrar / configurar ---------------- */

  async function lerCredenciais() {
    const r = await fetch("credenciais.json?t=" + Date.now(), { cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("Falha ao abrir credenciais (" + r.status + ")");
    return r.json();
  }

  function guardarToken(token, lembrar) {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
      sessionStorage.removeItem(CHAVE_TOKEN);
      (lembrar ? localStorage : sessionStorage).setItem(CHAVE_TOKEN, token);
    } catch (e) {}
  }

  function tokenGuardado() {
    try {
      return localStorage.getItem(CHAVE_TOKEN) || sessionStorage.getItem(CHAVE_TOKEN);
    } catch (e) {
      return null;
    }
  }

  function sair() {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
      sessionStorage.removeItem(CHAVE_TOKEN);
    } catch (e) {}
    estado.token = null;
    estado.dados = null;
    $("menu").hidden = true;
    $("senha").value = "";
    mostrarTela("tela-entrar");
  }

  async function abrirLista() {
    aviso("Carregando perfumes…", { carregando: true });
    try {
      await carregarProdutos();
      fecharAviso();
      montarMarcas();
      renderizarLista();
      mostrarTela("tela-lista");
      return true;
    } catch (e) {
      fecharAviso();
      if (e.status === 401) {
        sair();
        mostrarErro("erro-entrar", "O acesso expirou ou foi cancelado. Peça para o Tiago renovar o token.");
      } else {
        aviso(mensagemErro(e));
      }
      return false;
    }
  }

  $("form-entrar").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    mostrarErro("erro-entrar", "");
    const senha = $("senha").value;
    if (!senha) return;
    $("botao-entrar").disabled = true;
    aviso("Conferindo a senha…", { carregando: true });
    try {
      const cred = await lerCredenciais();
      if (!cred) {
        fecharAviso();
        mostrarTela("tela-configurar");
        return;
      }
      estado.token = await NinaCripto.decifrar(cred, senha);
      guardarToken(estado.token, $("lembrar").checked);
      $("senha").value = "";
      await abrirLista();
    } catch (e) {
      fecharAviso();
      mostrarErro(
        "erro-entrar",
        e.message === "senha-incorreta" ? "Senha incorreta. Tente de novo." : mensagemErro(e)
      );
    } finally {
      $("botao-entrar").disabled = false;
    }
  });

  let trocandoSenha = false;

  $("form-configurar").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    mostrarErro("erro-configurar", "");
    const token = trocandoSenha ? estado.token : $("cfg-token").value.trim();
    const s1 = $("cfg-senha").value;
    const s2 = $("cfg-senha2").value;
    if (!token) return mostrarErro("erro-configurar", "Cole o token do GitHub.");
    if (s1.length < 10) return mostrarErro("erro-configurar", "A senha precisa ter pelo menos 10 caracteres.");
    if (s1 !== s2) return mostrarErro("erro-configurar", "As duas senhas não são iguais.");
    aviso("Salvando o acesso…", { carregando: true });
    const tokenAnterior = estado.token;
    estado.token = token;
    try {
      await lerArquivo(ARQ_PRODUTOS); // confere se o token funciona neste site
      const blob = await NinaCripto.cifrar(token, s1);
      let sha = null;
      try {
        sha = (await gh("GET", caminhoConteudo(ARQ_CREDENCIAIS) + "?ref=" + BRANCH)).sha;
      } catch (e) {
        if (e.status !== 404) throw e;
      }
      await gravarArquivo(
        ARQ_CREDENCIAIS,
        utf8ParaB64(JSON.stringify(blob, null, 2) + "\n"),
        trocandoSenha ? "Área da Nina: senha trocada" : "Área da Nina: acesso configurado",
        sha
      );
      guardarToken(token, true);
      $("cfg-token").value = $("cfg-senha").value = $("cfg-senha2").value = "";
      fecharAviso();
      const eraTroca = trocandoSenha;
      trocandoSenha = false;
      if (await abrirLista()) {
        aviso(eraTroca ? "Senha trocada! Use a senha nova da próxima vez." : "Pronto! Acesso configurado.\nUse essa senha para entrar.");
      }
    } catch (e) {
      estado.token = tokenAnterior;
      fecharAviso();
      mostrarErro(
        "erro-configurar",
        e.status === 401 || e.status === 404 || e.status === 403
          ? "Esse token não funciona para o site da Nina (precisa ter acesso ao repositório nina-dluxe com Contents: leitura e escrita)."
          : mensagemErro(e)
      );
    }
  });

  /* ---------------- lista ---------------- */

  function montarMarcas() {
    const marcas = [...new Set(produtos().map((p) => (p.marca || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    $("marcas").innerHTML = marcas.map((m) => `<option value="${escapeHtml(m)}"></option>`).join("");
  }

  function filtrados() {
    const q = normalizar($("busca").value);
    return produtos()
      .filter((p) => {
        if (estado.filtro === "sem-preco" && lerPreco(p.preco) !== null && !Number.isNaN(lerPreco(p.preco))) return false;
        if (estado.filtro === "sem-foto" && p.foto) return false;
        if (estado.filtro === "esgotados" && p.disponivel !== false) return false;
        if (!q) return true;
        return normalizar([p.nome, p.marca, p.linha].join(" ")).includes(q);
      })
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  }

  function renderizarLista() {
    const lista = filtrados();
    $("contagem").textContent = lista.length === produtos().length
      ? `${lista.length} perfumes`
      : `${lista.length} de ${produtos().length} perfumes`;
    $("lista").innerHTML = lista.map((p) => {
      const foto = p.foto
        ? `<img src="${escapeHtml(urlFoto(p.foto))}" alt="" loading="lazy" />`
        : "🧴";
      const preco = precoTexto(p.preco);
      return `<li><button type="button" class="item" data-id="${escapeHtml(p.id)}">
        <span class="item__foto">${foto}</span>
        <span class="item__texto">
          <span class="item__nome">${escapeHtml(p.nome)}</span>
          <span class="item__marca">${escapeHtml(p.marca || "Sem marca")}</span>
          <span class="item__info">
            ${preco ? `<span class="etiqueta etiqueta--preco">R$ ${escapeHtml(preco)}</span>` : `<span class="etiqueta">Consulte</span>`}
            ${p.disponivel === false ? `<span class="etiqueta etiqueta--off">Esgotado</span>` : ""}
            ${p.foto ? "" : `<span class="etiqueta etiqueta--off">Sem foto</span>`}
          </span>
        </span>
        <span class="item__seta" aria-hidden="true">›</span>
      </button></li>`;
    }).join("") || `<li class="contagem">Nenhum perfume encontrado.</li>`;
  }

  $("busca").addEventListener("input", renderizarLista);
  document.querySelector(".filtros").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-filtro]");
    if (!b) return;
    estado.filtro = b.getAttribute("data-filtro");
    document.querySelectorAll(".filtro").forEach((f) => f.classList.toggle("is-ativo", f === b));
    renderizarLista();
  });
  $("lista").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-id]");
    if (b) abrirEditor(b.getAttribute("data-id"));
  });
  $("botao-novo").addEventListener("click", () => abrirEditor(null));

  $("botao-menu").addEventListener("click", (ev) => {
    ev.stopPropagation();
    $("menu").hidden = !$("menu").hidden;
  });
  document.addEventListener("click", (ev) => {
    if (!$("menu").hidden && !ev.target.closest("#menu")) $("menu").hidden = true;
  });
  $("botao-sair").addEventListener("click", () => {
    if (confirm("Sair da área da Nina neste celular?")) sair();
  });
  $("botao-recarregar").addEventListener("click", () => {
    $("menu").hidden = true;
    abrirLista();
  });
  $("botao-trocar-senha").addEventListener("click", () => {
    $("menu").hidden = true;
    trocandoSenha = true;
    document.querySelector("#tela-configurar h1").textContent = "Trocar senha";
    $("configurar-aviso").textContent = "Escolha a nova senha (mínimo 10 caracteres).";
    $("cfg-token").closest(".campo").hidden = true;
    $("cfg-token").required = false;
    mostrarTela("tela-configurar");
  });

  /* ---------------- editor ---------------- */

  let sujo = false;

  function mostrarFoto(url) {
    $("foto-img").hidden = !url;
    $("foto-vazia").hidden = !!url;
    if (url) $("foto-img").src = url;
    else $("foto-img").removeAttribute("src");
    $("foto-remover").hidden = !url;
    $("foto-botao-texto").textContent = url ? "📷 Trocar foto" : "📷 Tirar ou escolher foto";
  }

  function abrirEditor(id) {
    const p = id ? produtos().find((x) => x.id === id) : null;
    if (id && !p) return;
    estado.editandoId = id;
    estado.fotoNova = null;
    estado.removerFoto = false;
    $("editar-titulo").textContent = p ? p.nome : "Novo perfume";
    $("ed-nome").value = p ? p.nome || "" : "";
    $("ed-marca").value = p ? p.marca || "" : "";
    $("ed-preco").value = p ? precoTexto(p.preco) : "";
    $("ed-ml").value = p && p.tamanhoMl ? String(p.tamanhoMl) : "";
    document.querySelector(`input[name="ed-disp"][value="${p && p.disponivel === false ? "nao" : "sim"}"]`).checked = true;
    mostrarFoto(p && p.foto ? urlFoto(p.foto) : "");
    $("botao-excluir").hidden = !p;
    mostrarErro("erro-editar", "");
    sujo = false;
    history.pushState({ tela: "editar" }, "");
    mostrarTela("tela-editar");
  }

  function voltarParaLista() {
    estado.editandoId = null;
    renderizarLista();
    mostrarTela("tela-lista");
  }

  function sairDoEditor() {
    if (history.state && history.state.tela === "editar") history.back();
    else voltarParaLista();
  }

  window.addEventListener("popstate", () => {
    if (!$("tela-editar").hidden) voltarParaLista();
  });

  $("botao-voltar").addEventListener("click", () => {
    if (sujo && !confirm("Sair sem salvar as mudanças?")) return;
    sairDoEditor();
  });
  $("form-editar").addEventListener("input", () => { sujo = true; });

  /* Foto: redimensiona para no máximo 800px e converte para WebP (ou JPEG se o aparelho não gerar WebP). */
  async function prepararFoto(arquivo) {
    let fonte;
    try {
      fonte = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch (e) {
      fonte = await new Promise((ok, falha) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => falha(new Error("Não consegui abrir essa foto. Tente outra."));
        img.src = URL.createObjectURL(arquivo);
      });
    }
    const w = fonte.width || fonte.naturalWidth;
    const h = fonte.height || fonte.naturalHeight;
    const escala = Math.min(1, TAM_FOTO / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * escala));
    canvas.height = Math.max(1, Math.round(h * escala));
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    const paraBlob = (tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo, q));
    ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
    let blob = await paraBlob("image/webp", 0.82);
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#f7f3ea";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      blob = await paraBlob("image/jpeg", 0.85);
      ext = "jpg";
    }
    if (!blob) throw new Error("Não consegui preparar a foto.");
    return { blob, ext, url: URL.createObjectURL(blob) };
  }

  $("foto-arquivo").addEventListener("change", async (ev) => {
    const arq = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!arq) return;
    aviso("Preparando a foto…", { carregando: true });
    try {
      estado.fotoNova = await prepararFoto(arq);
      estado.removerFoto = false;
      sujo = true;
      mostrarFoto(estado.fotoNova.url);
      fecharAviso();
    } catch (e) {
      aviso(e.message || "Não consegui abrir essa foto.");
    }
  });

  $("foto-remover").addEventListener("click", () => {
    estado.fotoNova = null;
    estado.removerFoto = true;
    sujo = true;
    mostrarFoto("");
  });

  function blobParaB64(blob) {
    return new Promise((ok, falha) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(",")[1]);
      r.onerror = () => falha(r.error);
      r.readAsDataURL(blob);
    });
  }

  function carimbo() {
    const d = new Date();
    const z = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds());
  }

  $("form-editar").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    mostrarErro("erro-editar", "");
    const nome = $("ed-nome").value.trim().replace(/\s+/g, " ");
    const marca = $("ed-marca").value.trim().replace(/\s+/g, " ");
    const preco = lerPreco($("ed-preco").value);
    const mlTexto = $("ed-ml").value.replace(/\D/g, "");
    const ml = mlTexto ? Number(mlTexto) : null;
    const disponivel = document.querySelector('input[name="ed-disp"]:checked').value === "sim";
    if (!nome) return mostrarErro("erro-editar", "Escreva o nome do perfume.");
    if (Number.isNaN(preco)) return mostrarErro("erro-editar", "Preço inválido. Exemplo: 189,90");

    const novo = !estado.editandoId;
    let id = estado.editandoId;
    if (novo) {
      const base = slug(nome);
      const ids = new Set(produtos().map((p) => p.id));
      id = base;
      for (let i = 2; ids.has(id); i++) id = base + "-" + i;
    }

    $("botao-salvar").disabled = true;
    aviso("Salvando…", { carregando: true });
    try {
      let caminhoFoto = null;
      if (estado.fotoNova) {
        aviso("Enviando a foto…", { carregando: true });
        caminhoFoto = "fotos/" + id + "-" + carimbo() + "." + estado.fotoNova.ext;
        await gravarArquivo(caminhoFoto, await blobParaB64(estado.fotoNova.blob), "Foto: " + nome);
        estado.previas[caminhoFoto] = estado.fotoNova.url;
        aviso("Salvando…", { carregando: true });
      }
      const removerFoto = estado.removerFoto;
      await salvarProdutos((dados) => {
        let p = dados.produtos.find((x) => x.id === id);
        if (!p) {
          if (!novo) throw new Error("Esse perfume foi excluído em outro aparelho.");
          p = { id, nome, marca: null, linha: null, tamanhoMl: null, preco: null, foto: null, disponivel: true };
          dados.produtos.push(p);
        }
        p.nome = nome;
        p.marca = marca || null;
        p.preco = preco;
        p.tamanhoMl = ml;
        p.disponivel = disponivel;
        if (caminhoFoto) p.foto = caminhoFoto;
        else if (removerFoto) p.foto = null;
      }, (novo ? "Novo perfume: " : "Editado: ") + nome);
      montarMarcas();
      sujo = false;
      aviso("Salvo! ✅\nEm 1 a 2 minutos aparece no site.");
      sairDoEditor();
    } catch (e) {
      fecharAviso();
      mostrarErro("erro-editar", e.status ? mensagemErro(e) : (e.message || mensagemErro(e)));
    } finally {
      $("botao-salvar").disabled = false;
    }
  });

  $("botao-excluir").addEventListener("click", async () => {
    const id = estado.editandoId;
    const p = produtos().find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Excluir “${p.nome}” do site?\nIsso não pode ser desfeito por aqui.`)) return;
    aviso("Excluindo…", { carregando: true });
    try {
      await salvarProdutos((dados) => {
        dados.produtos = dados.produtos.filter((x) => x.id !== id);
      }, "Excluído: " + p.nome);
      montarMarcas();
      sujo = false;
      aviso("Excluído. Em 1 a 2 minutos some do site.");
      sairDoEditor();
    } catch (e) {
      fecharAviso();
      mostrarErro("erro-editar", mensagemErro(e));
    }
  });

  /* ---------------- início ---------------- */

  async function iniciar() {
    if (!window.crypto || !window.crypto.subtle) {
      mostrarTela("tela-entrar");
      mostrarErro("erro-entrar", "Este navegador é antigo demais. Atualize o celular ou use o Chrome/Safari.");
      return;
    }
    const salvo = tokenGuardado();
    if (salvo) {
      estado.token = salvo;
      if (await abrirLista()) return;
    }
    try {
      const cred = await lerCredenciais();
      if (!cred || params.has("configurar")) {
        mostrarTela("tela-configurar");
        return;
      }
    } catch (e) {}
    mostrarTela("tela-entrar");
  }

  iniciar();
})();
