# Nina D’luxe — vitrine de produtos

Site público para apresentar os perfumes da Nina D’luxe e receber pedidos pelo WhatsApp.

Endereço do site (depois de publicado):
[https://tiagofalavinha-boop.github.io/nina-dluxe/](https://tiagofalavinha-boop.github.io/nina-dluxe/)

Os preços de venda ainda não estão preenchidos: o site mostra **Consulte**. Quando vocês quiserem exibir o valor, basta editar o arquivo de produtos, como explicado abaixo. **Não coloque preço de compra** neste site — só o preço de venda, se for mostrar.

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
whatsapp: "5565996406349",
```

O valor atual é o telefone do Tiago. Quando quiser, troque para o número da Nina.

A mensagem enviada ao clicar em **Pedir no WhatsApp** também fica nesse arquivo. `{nome}` é trocado pelo nome do perfume.

---

## O que não deve ir neste site

- Preço de compra / custo
- Quantidade exata em estoque (use só Disponível ou Esgotado)
- Dados internos do caderno ou do app de estoque

Este repositório é público: qualquer pessoa pode ver os arquivos.
