/* Nina D’luxe — criptografia do acesso da área administrativa.
 * O token do GitHub fica guardado CIFRADO (AES-GCM 256) em admin/credenciais.json.
 * A chave é derivada da senha da Nina com PBKDF2-SHA256 (600 mil iterações).
 * Funciona no navegador e no Node 18+ (usa a Web Crypto padrão). */
(function (raiz) {
  "use strict";
  const ITERACOES = 600000;
  const subtle = raiz.crypto.subtle;

  function paraB64(bytes) {
    let s = "";
    const u = new Uint8Array(bytes);
    for (let i = 0; i < u.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }

  function deB64(texto) {
    const s = atob(texto);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }

  async function derivarChave(senha, sal, iteracoes) {
    const base = await subtle.importKey(
      "raw",
      new TextEncoder().encode(senha),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return subtle.deriveKey(
      { name: "PBKDF2", salt: sal, iterations: iteracoes, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function cifrar(token, senha) {
    if (!token || !senha) throw new Error("Token e senha são obrigatórios");
    const sal = raiz.crypto.getRandomValues(new Uint8Array(16));
    const iv = raiz.crypto.getRandomValues(new Uint8Array(12));
    const chave = await derivarChave(senha, sal, ITERACOES);
    const conteudo = new TextEncoder().encode(JSON.stringify({ token: String(token).trim() }));
    const cifrado = await subtle.encrypt({ name: "AES-GCM", iv }, chave, conteudo);
    return {
      versao: 1,
      kdf: "PBKDF2-SHA256",
      iteracoes: ITERACOES,
      cifra: "AES-GCM-256",
      sal: paraB64(sal),
      iv: paraB64(iv),
      dados: paraB64(cifrado),
    };
  }

  /* Devolve o token. Lança erro "senha-incorreta" se a senha não confere. */
  async function decifrar(blob, senha) {
    if (!blob || blob.versao !== 1) throw new Error("credenciais-invalidas");
    const chave = await derivarChave(senha, deB64(blob.sal), Number(blob.iteracoes) || ITERACOES);
    let claro;
    try {
      claro = await subtle.decrypt({ name: "AES-GCM", iv: deB64(blob.iv) }, chave, deB64(blob.dados));
    } catch (e) {
      throw new Error("senha-incorreta");
    }
    return JSON.parse(new TextDecoder().decode(claro)).token;
  }

  raiz.NinaCripto = { cifrar, decifrar, paraB64, deB64, ITERACOES };
})(typeof window !== "undefined" ? window : globalThis);
