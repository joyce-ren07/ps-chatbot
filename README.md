# Product Space Chatbot

A single-page chat widget for **Product Space at UC San Diego**. The UI talks to a Vercel serverless route (`/api/chat`), which calls the Anthropic API with a system prompt built from `knowledge-base.txt`.

## Setup

1. **Fill in the knowledge base**  
   Edit `knowledge-base.txt` with club info (events, how to join, contacts, etc.).

2. **Add your API key**  
   Copy the example env file and set your key locally:

   ```bash
   cp .env.local.example .env.local
   ```

   Then put your real key in `.env.local`:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Push to GitHub** (if you haven’t yet):

   ```bash
   git add .
   git commit -m "Add Product Space chatbot widget"
   git push -u origin main
   ```

## Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `joyce-ren07/ps-chatbot`.
2. In **Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your Anthropic key
3. Deploy.

After deploy, open the site URL and use the gold chat bubble in the bottom-right corner.

### CLI alternative

```bash
npx vercel login
npx vercel          # preview
npx vercel --prod   # production
```

Add `ANTHROPIC_API_KEY` in the Vercel project settings (or via `vercel env add ANTHROPIC_API_KEY`).

## Local API testing

Vercel CLI can run the serverless function locally:

```bash
npx vercel dev
```

Open the printed localhost URL, open the widget, and send a message.

## Project structure

| Path | Purpose |
|------|---------|
| `index.html` | Demo page + chat widget markup |
| `styles.css` | UCSD navy/gold widget styles |
| `chat.js` | UI logic, typing indicator, `/api/chat` client |
| `api/chat.js` | Vercel Node.js function → Anthropic |
| `knowledge-base.txt` | Club facts used in the system prompt |
| `.env.local.example` | Documents `ANTHROPIC_API_KEY` |
| `vercel.json` | Includes `knowledge-base.txt` with the function |

## Notes

- The browser never calls Anthropic directly; only `/api/chat` uses `ANTHROPIC_API_KEY`.
- Model: `claude-sonnet-4-6`.
- You can drop this widget into another club site by copying the `#ps-chat` markup plus `styles.css` / `chat.js` (keep `/api/chat` and `knowledge-base.txt` on the same Vercel project).
