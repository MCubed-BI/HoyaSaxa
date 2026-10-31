# Gmail OAuth for Blast (no App Password)

Use this when Google says App Passwords are unavailable and you do not want to turn on 2-Step Verification.

Blasts send through the **Gmail HTTP API** (`gmail.users.messages.send`) with a refresh token stored in Neon. SMTP is not used for OAuth on Vercel.

## One-time Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) (any Google account that can own a project is fine).
2. Create or select a project.
3. APIs & Services → **Enable Gmail API** (required — Connect can succeed while Send still fails if this is off).
4. APIs & Services → **OAuth consent screen**
   - User type: External
   - Publishing status: **Testing** is fine
   - Add test user: `georgetownfootball35@gmail.com`
   - Add scope: `https://www.googleapis.com/auth/gmail.send` (Send email on your behalf), plus `email` / `openid`
   - Do **not** rely on the restricted `https://mail.google.com/` scope — Testing apps often grant only openid/email for it, which produces `Request had insufficient authentication scopes` on Send
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
3. Click **Connect Gmail** (or **Reconnect Gmail** if a prior link lacks Send).
4. Sign in as **georgetownfootball35@gmail.com**.
5. On the consent screen, leave **Send email on your behalf** checked, then Allow.

Blasts then send From that mailbox via the Gmail API. No App Password.
