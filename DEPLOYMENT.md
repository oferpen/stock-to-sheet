# Deployment Guide

This app can be deployed to run every 5 minutes using several platforms. Here are the easiest options:

## Option 1: Render (Easiest - Recommended) ⭐

**Free tier available**, very simple setup.

### Steps:
1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up/login
3. Click "New +" → "Cron Job"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `stock-to-sheet`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js once`
6. Add environment variables:
   - `GOOGLE_SERVICE_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `SHEET_ID`
   - `SHEET_TAB` (optional, defaults to "Tickers")
   - `PRICE_PROVIDER` (optional, defaults to "alphaVantage")
   - `ALPHA_VANTAGE_KEY`
7. Click "Create Cron Job"

**Cost**: Free tier allows 750 hours/month (enough for every 5 minutes)

---

## Option 2: GitHub Actions (Free) ⭐

**Completely free** for public repos, great for automation.

### Steps:
1. Push your code to GitHub
2. Go to your repository → Settings → Secrets and variables → Actions
3. Add these secrets:
   - `GOOGLE_SERVICE_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `SHEET_ID`
   - `SHEET_TAB` (optional)
   - `PRICE_PROVIDER` (optional)
   - `ALPHA_VANTAGE_KEY`
4. The workflow file (`.github/workflows/update-stocks.yml`) is already created
5. Push to GitHub - it will run automatically every 5 minutes

**Note**: GitHub Actions has rate limits (2000 minutes/month for free), but this should be fine for your use case.

---

## Option 3: Railway

**Simple deployment**, good free tier.

### Steps:
1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and sign up
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables (same as Render)
6. Railway will auto-detect and deploy
7. Go to Settings → Add a Cron Job:
   - **Schedule**: `*/5 * * * *`
   - **Command**: `node dist/index.js once`

**Cost**: $5/month after free credits

---

## Option 4: Google Cloud Run + Cloud Scheduler

**Good fit** since you're already using Google services.

### Steps:
1. Install Google Cloud SDK: `gcloud`
2. Build and push Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/stock-to-sheet
   ```
3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy stock-to-sheet \
     --image gcr.io/YOUR_PROJECT_ID/stock-to-sheet \
     --platform managed \
     --region us-central1 \
     --set-env-vars GOOGLE_SERVICE_EMAIL=...,GOOGLE_PRIVATE_KEY=...,SHEET_ID=...,ALPHA_VANTAGE_KEY=...
   ```
4. Create Cloud Scheduler job:
   ```bash
   gcloud scheduler jobs create http stock-update \
     --schedule="*/5 * * * *" \
     --uri="YOUR_CLOUD_RUN_URL" \
     --http-method=GET
   ```

**Cost**: ~$0-5/month (generous free tier)

---

## Option 5: Fly.io

**Good for scheduled tasks**, simple setup.

### Steps:
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly launch` (follow prompts)
4. Set secrets:
   ```bash
   fly secrets set GOOGLE_SERVICE_EMAIL=...
   fly secrets set GOOGLE_PRIVATE_KEY=...
   fly secrets set SHEET_ID=...
   fly secrets set ALPHA_VANTAGE_KEY=...
   ```
5. Add cron job in `fly.toml`:
   ```toml
   [[services]]
     [[services.schedule]]
       cron = "*/5 * * * *"
   ```

---

## Quick Start (Recommended: Render)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Follow Option 1 steps above
   - The `render.yaml` file is already configured

3. **Done!** Your app will run every 5 minutes automatically.

---

## Environment Variables Needed

Make sure to set these in your deployment platform:

- `GOOGLE_SERVICE_EMAIL` - Your Google service account email
- `GOOGLE_PRIVATE_KEY` - Your Google service account private key (with `\n` as actual newlines)
- `SHEET_ID` - Your Google Sheet ID
- `SHEET_TAB` - Sheet tab name (optional, defaults to "Tickers")
- `PRICE_PROVIDER` - Provider name (optional, defaults to "alphaVantage")
- `ALPHA_VANTAGE_KEY` - Your Alpha Vantage API key

---

## Testing Locally Before Deploying

```bash
# Build
npm run build

# Test the built version
node dist/index.js once
```

If this works locally, it will work in deployment!

