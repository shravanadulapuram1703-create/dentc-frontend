# Frontend Deployment Runbook — DentC SPA on Google Cloud Run

> Audience: DentC engineering team.
> Scope: deploy the **Vite/React SPA** (`dentc-frontend`) to **Cloud Run**, served by the
> existing Express `server.js`.
> Deploy the **backend first** — the frontend bakes the backend URL into the bundle at build time.

**Current environment values**
| Thing | Value |
|---|---|
| GCP project | `reckon-dental` |
| Region | `us-central1` |
| Artifact Registry repo | `dentc` |
| Backend URL | `https://dentc-backend-477406612596.us-central1.run.app` |

> ⚠️ **The backend is currently NOT publicly invokable** (IAM locked). The SPA calls the backend
> **directly from the user's browser**, and a browser cannot present a Google identity token — so
> the app will **not work end-to-end until you resolve backend access**. See
> **[Section 7 — Backend is private](#7-backend-is-private-options--workarounds)** for the fix and
> three workarounds (including how to test *right now* while it stays private).

---

## 0. Facts about this service (so the commands make sense)

| Thing | Value |
|---|---|
| Build | `npm run build` → `tsc -b && vite build` → static `dist/` |
| Server | `server.js` (Express: gzip, security headers, SPA fallback, `/health`) |
| Container port | `8080` (Cloud Run standard; `server.js` reads `process.env.PORT`) |
| Health check | `GET /health` → `{"status":"ok",...}` |
| API base URL var | **`VITE_API_BASE_URL`** — baked at **build time** (not a runtime env var) |
| Env validation | `src/shared/config/env.ts` requires a **non-empty** `VITE_API_BASE_URL` |

**Key consequence:** to change which backend the SPA talks to, you must **rebuild the image** with a
new `VITE_API_BASE_URL` build arg. Setting it as a Cloud Run env var does nothing.

---

## 1. Prerequisites (one-time, each engineer)

- Docker Desktop installed and running.
- Google Cloud SDK (`gcloud`) installed.
- Project access. Set once:

```powershell
gcloud auth login
gcloud config set project reckon-dental
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## 2. Test locally FIRST

### 2a. Dev server (fastest — hot reload)

```powershell
# from dentc-frontend/
npm install
npm run dev
# open http://localhost:5173
```

Set the backend it talks to in `.env` (this file is git-ignored):
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```
> While the deployed backend is private, point this at a **local backend** (`uvicorn` on `:8000`) or
> at the authenticated tunnel from [Section 7c](#7c-test-now-against-the-private-backend-authenticated-tunnel).

### 2b. Local run **in the Docker image** (this is what Cloud Run actually runs)

Build the image, passing the backend URL as a build arg:
```powershell
# from dentc-frontend/
docker build `
  --build-arg VITE_API_BASE_URL=https://dentc-backend-477406612596.us-central1.run.app `
  --build-arg VITE_APP_ENV=production `
  -t dentc-frontend:local .
```

Run it:
```powershell
docker run --rm -p 8080:8080 -e PORT=8080 dentc-frontend:local
```

Verify:
- <http://localhost:8080/health> → `{"status":"ok",...}`
- <http://localhost:8080> → the app loads.
- Open browser **DevTools → Network**: API calls should target the backend URL. (They will fail with
  401/403 until the backend is reachable — that's expected; see Section 7.)

If the page loads and assets resolve, the image is good to ship.

---

## 3. Provision GCP resources (one-time)

APIs and the Artifact Registry repo are shared with the backend. If the backend runbook was already
followed, **skip this**. Otherwise:

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create dentc --repository-format=docker --location=us-central1
```

---

## 4. Build & push the image

The backend URL must reach the Docker **build arg**, so use the committed `cloudbuild.yaml`
(plain `gcloud builds submit --tag` can't pass build args):

```powershell
# from dentc-frontend/
gcloud builds submit --config cloudbuild.yaml `
  --substitutions=_API_BASE_URL=https://dentc-backend-477406612596.us-central1.run.app
```

This builds the image with `VITE_API_BASE_URL` baked in and pushes it to
`us-central1-docker.pkg.dev/reckon-dental/dentc/dentc-frontend:latest`.

> Alternative (no Cloud Build): build locally as in 2b, then
> `docker push us-central1-docker.pkg.dev/reckon-dental/dentc/dentc-frontend:local` and deploy that tag.

---

## 5. Deploy to Cloud Run

```powershell
gcloud run deploy dentc-frontend `
  --image us-central1-docker.pkg.dev/reckon-dental/dentc/dentc-frontend:latest `
  --region us-central1 `
  --port 8080 `
  --allow-unauthenticated `
  --cpu 1 --memory 512Mi `
  --min-instances 0 --max-instances 10
```

- The frontend serves only static files + SPA fallback, so it's light — `1 CPU / 512Mi` is plenty.
- `--allow-unauthenticated` makes the website publicly reachable (this is a public web app).
- On success, gcloud prints the **Service URL**: `https://dentc-frontend-xxxxxxxx-uc.a.run.app`.

<!-- https://dentc-frontend-477406612596.us-central1.run.app -->

---

## 6. Wire CORS on the backend

The backend must allow the frontend origin (it sends credentials, so wildcard `*` is rejected):
```powershell
gcloud run services update dentc-backend `
  --region us-central1 `
  --update-env-vars "CORS_ORIGINS=https://dentc-frontend-xxxxxxxx-uc.a.run.app"
```

Then verify in the browser: open the frontend URL, log in, and confirm in **DevTools → Network**
that API calls succeed with no CORS errors.

---

## 7. Backend is private — options & workarounds

The SPA in a user's browser calls the backend directly. A browser **cannot** authenticate to an
IAM-locked Cloud Run service (it has no Google identity token). So while the backend requires
authentication, the deployed site cannot reach it. Pick one:

### 7a. Recommended fix — make the backend publicly invokable
Your backend already enforces its **own JWT auth** in the application layer, so "allow
unauthenticated" at the *Cloud Run* layer does **not** make your data public — every protected route
still requires a valid JWT. This is the normal setup for a public API backing a SPA.

```powershell
gcloud run services add-iam-policy-binding dentc-backend `
  --region us-central1 `
  --member="allUsers" `
  --role="roles/run.invoker"
```

If that command is **rejected by an org policy** (`Domain Restricted Sharing` /
`iam.allowedPolicyMemberDomains` blocks `allUsers`), use 7b.

### 7b. Workaround — authenticated reverse proxy (keeps the backend private)
Make the **frontend** the only public service and have its Express server proxy API calls to the
private backend, attaching a Google-signed **ID token** server-side. The browser only ever talks to
the public frontend (this also eliminates CORS entirely — same origin).

**1. Grant the frontend's service account permission to invoke the backend:**
```powershell
# frontend runtime SA = the compute default SA unless you set a custom one
$PROJNUM = gcloud projects describe reckon-dental --format="value(projectNumber)"
$SA = "$PROJNUM-compute@developer.gserviceaccount.com"
gcloud run services add-iam-policy-binding dentc-backend `
  --region us-central1 `
  --member="serviceAccount:$SA" `
  --role="roles/run.invoker"
```

**2. Add a proxy to `server.js`** (needs `http-proxy-middleware` + `google-auth-library`):
```powershell
npm install http-proxy-middleware google-auth-library
```
```js
// server.js — add ABOVE the SPA fallback ("app.get('*', ...)")
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GoogleAuth } from 'google-auth-library';

const BACKEND = process.env.BACKEND_URL; // e.g. https://dentc-backend-...run.app
const auth = new GoogleAuth();

app.use('/api', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  onProxyReq: async (proxyReq) => {
    // Mint an ID token whose audience is the backend, attach as Bearer.
    const client = await auth.getIdTokenClient(BACKEND);
    const headers = await client.getRequestHeaders();
    proxyReq.setHeader('Authorization', headers.Authorization);
  },
}));
```

**3. Build the SPA to call its own origin** (so requests hit the proxy):
set `VITE_API_BASE_URL` to the **frontend** URL, and deploy the frontend with `BACKEND_URL` set:
```powershell
# build pointing at the frontend's own origin
gcloud builds submit --config cloudbuild.yaml `
  --substitutions=_API_BASE_URL=https://dentc-frontend-xxxxxxxx-uc.a.run.app

# deploy with the private backend wired in for the proxy
gcloud run deploy dentc-frontend `
  --image us-central1-docker.pkg.dev/reckon-dental/dentc/dentc-frontend:latest `
  --region us-central1 --port 8080 --allow-unauthenticated `
  --set-env-vars "BACKEND_URL=https://dentc-backend-477406612596.us-central1.run.app"
```
> Note: the app's API client prefixes routes with `/api/v1/...`, which the `/api` proxy rule covers.
> The user's own login JWT is forwarded by the proxy alongside the Google ID token, so app-level auth
> still works. The WebSocket AI-chat path is not proxied by this rule — extend it later if needed.

### 7c. Test NOW against the private backend (authenticated tunnel)
For local development while the backend stays private, open an authenticated localhost tunnel — your
gcloud identity supplies the token, so the browser can reach it via `localhost`:
```powershell
gcloud run services proxy dentc-backend --region us-central1 --port 8000
```
Leave it running, then point the frontend dev server at it:
```
# dentc-frontend/.env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
```powershell
npm run dev
```
This is for **local testing only** — it does not make the deployed site work.

---

## 8. Redeploying after code changes

```powershell
# rebuild with the backend URL baked in, then roll out
gcloud builds submit --config cloudbuild.yaml `
  --substitutions=_API_BASE_URL=https://dentc-backend-477406612596.us-central1.run.app
gcloud run deploy dentc-frontend `
  --image us-central1-docker.pkg.dev/reckon-dental/dentc/dentc-frontend:latest `
  --region us-central1
```

Remember: **any change to which backend the SPA targets requires a rebuild**, not just a redeploy.

---

## 9. Custom domain (later)
Cloud Run → Manage Custom Domains: map `app.reckondental.com` → `dentc-frontend`. Then rebuild the
SPA with `VITE_API_BASE_URL=https://api.reckondental.com` (or keep the same-origin proxy from 7b) and
update the backend `CORS_ORIGINS` to the new domain.

---

### Quick reference — values for this project
```
PROJECT_ID                 = reckon-dental
REGION                     = us-central1
Artifact Registry repo     = dentc
Backend URL                = https://dentc-backend-477406612596.us-central1.run.app
Frontend URL (after deploy)= ____________________
```



######################################################################################

You do **not need Docker running locally**.

That's exactly what **Cloud Build** is for.

Your `cloudbuild.yaml` is already set up correctly. Cloud Build will:

1. Upload your source code to GCP
2. Build the Docker image in Google Cloud
3. Push it to Artifact Registry
4. Then you deploy that image to Cloud Run

---

## Step 1: Verify Frontend Repo Has Dockerfile

From:

```powershell
C:\Users\Sravan\Desktop\dentc-frontend
```

Run:

```powershell
Get-ChildItem
```

I want to confirm:

```text
Dockerfile
cloudbuild.yaml
package.json
```

exist.

---

## Step 2: Build in Cloud Build

From the frontend folder:

```powershell
gcloud builds submit `
  --config cloudbuild.yaml `
  --substitutions=_API_BASE_URL=https://dentc-backend-477406612596.us-central1.run.app
```

Cloud Build will use your `cloudbuild.yaml`.

You do **not** need:

```text
docker build
docker push
```

locally.

---

## Step 3: Verify Image

After build succeeds:

```powershell
gcloud artifacts docker images list `
  us-central1-docker.pkg.dev/reckon-dental/dentc
```

You should see:

```text
dentc-frontend
```

---

## Step 4: Deploy Frontend to Cloud Run

```powershell
gcloud run deploy dentc-frontend `
  --image us-central1-docker.pkg.dev/reckon-dental/dentc/dentc-frontend:latest `
  --region us-central1 `
  --port 80 `
  --allow-unauthenticated `
  --cpu 1 `
  --memory 512Mi `
  --min-instances 1 `
  --max-instances 5
```

---

## Possible Issue

Because you're an **Editor**, you'll probably get the same warning:

```text
Setting IAM policy failed
```

If that happens:

* Deployment succeeds
* Frontend works
* But nobody can access it publicly

The admin will need to grant:

```text
allUsers
Cloud Run Invoker
```

for `dentc-frontend` exactly like they must for `dentc-backend`.

---

## Before Running Build

Run:

```powershell
Get-ChildItem
```

from `dentc-frontend` and paste the output.

I want to verify the Dockerfile path and ensure Cloud Build will succeed on the first attempt.
