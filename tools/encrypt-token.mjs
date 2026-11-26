#!/usr/bin/env node
/* Gera admin/credenciais.json com o token do GitHub CIFRADO pela senha da Nina.
 *
 * Uso (na pasta do site):
 *   NINA_TOKEN=github_pat_xxx NINA_SENHA='senha-da-nina' node tools/encrypt-token.mjs
 * ou sem variáveis (pergunta no terminal):
 *   node tools/encrypt-token.mjs
 *
 * Depois: git add admin/credenciais.json && git commit -m "Área da Nina: acesso" && git push
 * (Alternativa sem terminal: abrir https://ninadluxe.com.br/admin/?configurar e colar o token lá.) */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const aqui = dirname(fileURLToPath(import.meta.url));
await import(join(aqui, "..", "admin", "cripto.js"));
const { NinaCripto } = globalThis;

async function perguntar(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const r = await rl.question(texto);
  rl.close();
  return r.trim();
}

const token = process.env.NINA_TOKEN || (await perguntar("Token do GitHub (github_pat_…): "));
const senha = process.env.NINA_SENHA || (await perguntar("Senha da Nina (mín. 10 caracteres): "));
if (!token) throw new Error("Token vazio");
if (!senha || senha.length < 10) throw new Error("A senha precisa ter pelo menos 10 caracteres");

const blob = await NinaCripto.cifrar(token, senha);
const conferido = await NinaCripto.decifrar(blob, senha);
if (conferido !== token.trim()) throw new Error("Falha ao conferir a cifra");

const destino = process.env.NINA_SAIDA || join(aqui, "..", "admin", "credenciais.json");
writeFileSync(destino, JSON.stringify(blob, null, 2) + "\n");
console.log("OK: " + destino + " gerado (" + blob.iteracoes + " iterações PBKDF2).");
