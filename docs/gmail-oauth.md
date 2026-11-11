# Gmail OAuth for Blast (no App Password)

Use this when Google says App Passwords are unavailable and you do not want to turn on 2-Step Verification.

## One-time Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) (any Google account that can own a project is fine).
2. Create or select a project.
3. APIs & Services → **Enable Gmail API**.
4. APIs & Services → **OAuth consent screen**
   - User type: External
   - Add test user: `georgetownfootball35@gmail.com`
   - Scopes later requested by the app: `https://mail.google.com/`, `email`, `openid`
5. APIs & Services → **Credentials** → Create **OAuth client ID**
   - Application type: **Web application**
   - Name: `HoyaSaxa Blast`
   - Authorized redirect URIs:
     - `https://georgetown-alum.vercel.app/api/gmail/oauth/callback`
     - `http://localhost:43173/api/gmail/oauth/callback` (local)
6. Copy Client ID and Client Secret into Vercel production:
   - `GMAIL_USER=georgetownfootball35@gmail.com`
   - `GMAIL_CLIENT_ID=...`
   - `GMAIL_CLIENT_SECRET=...`
7. Redeploy.

## Connect the mailbox

1. Sign into the app as Admin/Coach.
2. Open `/blast`, choose **Email**.
3. Click **Connect Gmail**.
4. Sign in as **georgetownfootball35@gmail.com** and Allow.

Blasts then send From that mailbox over Gmail SMTP with OAuth2. No App Password.
