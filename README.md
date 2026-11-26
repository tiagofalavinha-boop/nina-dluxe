# Nina D’luxe — vitrine de produtos

Site público para apresentar os perfumes da Nina D’luxe e receber pedidos pelo WhatsApp.

Endereço do site: [https://ninadluxe.com.br](https://ninadluxe.com.br)

Os preços de venda ainda não estão preenchidos: o site mostra **Consulte**. Quando vocês quiserem exibir o valor, basta editar o arquivo de produtos, como explicado abaixo. **Não coloque preço de compra** neste site — só o preço de venda, se for mostrar.

---

## Área da Nina (jeito mais fácil de editar)

Endereço: **https://ninadluxe.com.br/admin/** (não aparece no site nem no Google).

Pelo celular, com a senha da Nina, dá para:

- buscar um perfume e mudar **preço de venda**, **nome**, **marca**, **tamanho (ml)** e **Disponível/Esgotado**;
- **tirar ou escolher uma foto** (ela é diminuída e convertida sozinha);
- **adicionar** e **excluir** perfumes.

Cada **Salvar e publicar** aparece no site em 1 a 2 minutos.

### Como o acesso funciona (para o Tiago)

A área grava direto no GitHub usando um *token* (fine-grained) que só tem acesso a este repositório.
O token fica no arquivo `admin/credenciais.json`, **cifrado** com a senha da Nina
(AES-GCM 256, chave derivada com PBKDF2-SHA256 de 600 mil iterações). Sem a senha, o arquivo não serve para nada.

Para configurar ou renovar o token:

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. Repository access: **Only select repositories** → `nina-dluxe`.
3. Permissions → Repository permissions → **Contents: Read and write** (Metadata: Read-only entra sozinho). Nada mais.
4. Expiração: a maior possível. Quando vencer, a área avisa “O acesso expirou”; é só gerar outro e repetir o passo 5.
5. Abra **https://ninadluxe.com.br/admin/?configurar**, cole o token, escolha a senha (mín. 10 caracteres) e salve.
   (Alternativa no computador: `NINA_TOKEN=... NINA_SENHA=... node tools/encrypt-token.mjs`, depois commit de `admin/credenciais.json`.)

Para trocar só a senha: dentro da área, menu **Mais → Trocar senha**.
Se a senha vazar, revogue o token no GitHub e configure um novo.

---

## Como editar no GitHub (sem instalar nada)

1. Abra o repositório no GitHub.
2. Clique no arquivo que deseja alterar.
3. Clique no ícone de lápis (Edit).
4. Faça a alteração.
5. Role até o final da página, confirme e clique em **Commit changes**.

Em alguns minutos o site atualiza sozinho.

---

## Preços

Arquivo: **[produtos.json](produtos.json)**

Cada perfume tem um campo `"preco"`:

```json
"preco": null
```

Para mostrar o preço de venda, troque `null` pelo valor em reais (use ponto nos centavos):

```json
"preco": 89.90
```

O site passa a exibir **R$ 89,90**. Se o campo estiver `null`, vazio ou `0`, aparece **Consulte**.

Exemplo completo de um produto:

```json
{
  "id": "yara-trad",
  "nome": "Yara Trad",
  "marca": null,
  "linha": null,
  "tamanhoMl": null,
  "preco": 89.90,
  "foto": "fotos/yara-trad.jpg",
  "disponivel": true
}
```

- `"disponivel": true` mostra o selo **Disponível**.
- `"disponivel": false` mostra o selo **Esgotado**.
- `"tamanhoMl"` pode receber o volume, por exemplo `100`, para aparecer “100 ml”. Deixe `null` se não quiser mostrar.
- `"marca"` aparece no cartão e também no filtro de marcas, quando preenchida.

Cuidado com vírgulas e aspas: o arquivo precisa continuar um JSON válido. Se algo quebrar, o site pode não listar os produtos. Nesse caso, desfaça a última alteração ou peça ajuda.

---

## Fotos

1. Abra a pasta **[fotos](fotos)**.
2. Clique em **Add file** → **Upload files** e envie a imagem (JPG ou PNG, de preferência quadrada ou vertical).
3. Use um nome simples, sem espaço, por exemplo `yara-trad.jpg`.
4. No **produtos.json**, encontre o perfume e preencha:

```json
"foto": "fotos/yara-trad.jpg"
```

O caminho precisa ser exatamente o nome do arquivo enviado. Enquanto `"foto"` estiver `null`, o site mostra um frasco ilustrado no lugar da foto.

---

## Número do WhatsApp

Arquivo: **[config.js](config.js)**

Altere só a linha do número, com código do país e DDD, apenas dígitos:

```js
whatsapp: "5565996296349",
```

O valor atual é o telefone do Tiago. Quando quiser, troque para o número da Nina.

A mensagem enviada ao clicar em **Pedir no WhatsApp** também fica nesse arquivo. `{nome}` é trocado pelo nome do perfume.

---

## O que não deve ir neste site

- Preço de compra / custo
- Quantidade exata em estoque (use só Disponível ou Esgotado)
- Dados internos do caderno ou do app de estoque

Este repositório é público: qualquer pessoa pode ver os arquivos.
