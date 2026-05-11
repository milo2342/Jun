# Discord DM Bot

Forwards DMs sent to the bot to a managed list of recipients, with an admin panel, message logging, and reply support.

## Setup

### 1. Clone & install

```bash
git clone https://github.com/your-username/discord-dm-bot.git
cd discord-dm-bot
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Bot token from [Discord Developer Portal](https://discord.com/developers/applications) |
| `BOT_OWNER_ID` | Your Discord User ID (right-click name with Developer Mode → Copy User ID) |

### 3. Enable Message Content Intent

Discord Developer Portal → Your App → Bot → **Message Content Intent** → Enable

### 4. Run

```bash
npm start
```

## How it works

| Who | Access | What they can do |
|---|---|---|
| **Owner** | `BOT_OWNER_ID` env var | Add/remove admins & recipients, broadcast, view log |
| **Admin** | Added by owner via `/panel` | Add/remove recipients, broadcast, view log |
| **Recipient** | Added by admin via `/panel` | Receive forwarded DMs, reply with `!reply` |
| **Anyone** | — | DM the bot (gets forwarded to all recipients) |

## Commands

| Command | Who | Description |
|---|---|---|
| `/panel` | Owner & Admins | Open the control panel |
| `!reply <ID> <msg>` | Recipients | Reply to a forwarded DM |
| DM the bot | Anyone | Forwards your message to all recipients |

## Deploy to Railway

1. Push this repo to GitHub
2. [Railway](https://railway.app) → New Project → Deploy from GitHub repo
3. Set environment variables: `DISCORD_BOT_TOKEN`, `BOT_OWNER_ID`
4. Railway auto-deploys on every push to `main`
