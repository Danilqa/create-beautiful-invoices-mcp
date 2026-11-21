# create-beautiful-invoices-mcp

> 🧾 An MCP server that creates beautiful, real PDF invoices. Ask your AI assistant for an invoice and get a PDF on disk.

The invoices use the design of [sample-invoice-generator](https://github.com/Danilqa/sample-invoice-generator): a large amount due, the parties and dates, line items, totals with VAT and bank transfer details, set in Inter on A4.

## ⚡ Quickstart

You need Node 24.

Claude Code:

```bash
claude mcp add invoices -- npx -y create-beautiful-invoices-mcp
```

Claude Desktop, Cursor and other clients take the same command in their MCP config:

```json
{
  "mcpServers": {
    "invoices": {
      "command": "npx",
      "args": ["-y", "create-beautiful-invoices-mcp"],
      "env": { "INVOICES_DIR": "/Users/you/Invoices" }
    }
  }
}
```

Then ask: _"Invoice Fabrikam for 7.5 hours of design review at £95.50 an hour, with 20% VAT, due in 30 days."_

## 🛠️ Tools

### `create_invoice`

Renders the invoice to a PDF, saves it to the invoices folder and returns its path with a link to the file. An invoice number that already has a PDF gets a numbered copy, such as `invoice-INV-001 (2).pdf`, so no invoice is ever replaced.

| Field                  | Description                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `invoiceNumber`        | Unique number, also the payment reference                                                                         |
| `issueDate`, `dueDate` | `YYYY-MM-DD`. The due date can't be before the issue date                                                         |
| `currency`             | `GBP`, `EUR` or `USD`                                                                                             |
| `seller`               | `name`, and optionally `address`, `email`, `phone` and `vatNumber`                                                |
| `client`               | `name`, and optionally `address` and `email`                                                                      |
| `items`                | At least one `{ description, quantity, unitPrice }`. `quantity` defaults to 1                                     |
| `vatRate`              | VAT in percent, `0` by default, which leaves VAT off the invoice                                                  |
| `payment`              | `uk-bank-transfer` with a sort code and account number, or `iban-transfer` with an IBAN and an optional SWIFT/BIC |

## ⚙️ Configuration

| Variable       | Default      | Description                  |
| -------------- | ------------ | ---------------------------- |
| `INVOICES_DIR` | `~/Invoices` | Folder the PDFs are saved to |

## 🧑‍💻 Development

pnpm 12 and Node 24. See [AGENTS.md](AGENTS.md) for the layout and rules.

```bash
pnpm install
pnpm validate   # format check, lint, typecheck and tests
pnpm inspect    # the server from source in the MCP Inspector
pnpm build      # packages/mcp-server/dist/main.js
```

## 📄 License

[MIT](LICENSE)
