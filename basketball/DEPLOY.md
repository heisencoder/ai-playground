# Deployment Guide

This document covers deployment options for the Basketball Stats Tracker.

## Overview

The app is a React SPA served by a tiny Express server that also exposes
`/health` for platform probes. It can deploy to any platform that supports
Node.js 22+. Detailed GCP instructions follow.

## Automated Deployment with GitHub Actions

The GitHub Actions workflow (`.github/workflows/basketball-deploy.yml`)
automatically builds the Docker image and deploys to GCP Cloud Run when a
release is published with a tag starting with `basketball/` (e.g.
`basketball/v1.0.0`).

### Creating a Release

1. Go to GitHub → Releases → "Create a new release".
2. Create a tag like `basketball/v1.0.0`.
3. Fill in title and notes.
4. Click "Publish release".

The workflow builds, pushes to Artifact Registry, and deploys to Cloud Run.

### GCP Setup for GitHub Actions

Configure GCP with scoped permissions for this app only. Values set in the
final step become GitHub Actions Variables.

#### 1. Set environment variables

```bash
export PROJECT_ID="your-gcp-project-id"
export GITHUB_ORG="your-github-username-or-org"
export GITHUB_REPO="your-repo-name"
export REGION="us-central1"
```

#### 2. Enable required GCP APIs

```bash
gcloud services enable \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  iamcredentials.googleapis.com \
  --project=$PROJECT_ID
```

> Enabling `compute.googleapis.com` creates the default Compute Engine
> service account, which Cloud Run uses as its runtime identity.

#### 3. Create an Artifact Registry repository

```bash
gcloud artifacts repositories create basketball \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for Basketball Stats Tracker" \
  --project=$PROJECT_ID
```

#### 4. Create a service account with minimal permissions

```bash
gcloud iam service-accounts create basketball-deploy \
  --display-name="Basketball Stats Deployer" \
  --description="Service account for deploying Basketball app via GitHub Actions" \
  --project=$PROJECT_ID

export SA_EMAIL="basketball-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
```

#### 5. Grant minimal permissions

```bash
# Push images to this Artifact Registry repo only
gcloud artifacts repositories add-iam-policy-binding basketball \
  --location=$REGION \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" \
  --project=$PROJECT_ID

# Deploy to Cloud Run (project-level is needed for initial service creation)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.developer"

# Act as the Cloud Run runtime service account (the default compute SA)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding \
  ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project=$PROJECT_ID
```

#### 6. Set up Workload Identity Federation

```bash
gcloud iam workload-identity-pools create "github-actions" \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --project=$PROJECT_ID

gcloud iam workload-identity-pools providers create-oidc "github" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --project=$PROJECT_ID

# Allow the GitHub repo to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-actions/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}" \
  --project=$PROJECT_ID
```

> If the `github-actions` pool already exists from another app in this repo
> (e.g. `stock-gift-value`), skip the pool/provider `create` commands and
> reuse them — just run the `add-iam-policy-binding` step so this app's
> service account can be impersonated.

#### 7. Configure GitHub Actions Variables

GitHub repository → Settings → Secrets and variables → Actions →
**Variables** tab → New repository variable.

These are plaintext Variables (not Secrets) — security comes from Workload
Identity Federation, which issues short-lived tokens only to workflows in
the authorized repository.

```bash
gcloud iam workload-identity-pools providers describe github \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --format="value(name)" \
  --project=$PROJECT_ID
```

| Variable Name | Value |
|---------------|-------|
| `BASKETBALL_GCP_PROJECT_ID` | `your-gcp-project-id` |
| `BASKETBALL_GCP_SERVICE_ACCOUNT` | `basketball-deploy@your-gcp-project-id.iam.gserviceaccount.com` |
| `BASKETBALL_GCP_WORKLOAD_IDENTITY_PROVIDER` | The provider resource name from the command above |
| `BASKETBALL_GCP_ARTIFACT_REPO` | `basketball` |

### Security Notes

- No long-lived credentials are stored in GitHub.
- The service account is scoped to Artifact Registry writer (this repo
  only) and Cloud Run developer.
- Variable names are prefixed `BASKETBALL_` so other apps in this repo can
  coexist with their own isolated credentials.

### Troubleshooting

- **Artifact Registry push denied:** verify `artifactregistry.writer` on
  the repository and that Workload Identity Federation is wired up.
- **Cloud Run deploy denied:** verify `run.developer` on the project and
  `iam.serviceAccountUser` on the compute SA.
- **Workload Identity auth fails:** repository name in the IAM binding
  must match exactly (case-sensitive) and the workflow must request
  `id-token: write`.

---

## Manual Deployment Options

### Option 1: GCP Cloud Run (recommended, serverless)

```bash
export PROJECT_ID=YOUR_PROJECT_ID

# Build via Cloud Build and deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/basketball

gcloud run deploy basketball \
  --image gcr.io/$PROJECT_ID/basketball \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 5 \
  --port 8080
```

Cloud Run returns a URL like `https://basketball-xxxxx-uc.a.run.app`.

Update the app with the same two commands.

#### Faster cold starts

```bash
gcloud run services update basketball \
  --region=us-central1 \
  --startup-probe httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=2,periodSeconds=1,timeoutSeconds=1,failureThreshold=3
```

The automated GitHub Actions workflow already passes this probe.

### Option 2: GCP Compute Engine (e2-micro free tier)

```bash
gcloud compute instances create basketball-app \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=10GB \
  --tags=http-server

gcloud compute firewall-rules create allow-app \
  --allow tcp:8080 --target-tags http-server

gcloud compute ssh basketball-app --zone=us-central1-a

# On the VM:
git clone https://github.com/YOUR_USER/YOUR_REPO.git
cd YOUR_REPO/basketball
sudo docker build -t basketball .
sudo docker run -d --name basketball --restart unless-stopped \
  -p 8080:8080 -e PORT=8080 -e NODE_ENV=production basketball
```

Get the external IP:

```bash
gcloud compute instances describe basketball-app \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Visit `http://EXTERNAL_IP:8080`.

### Option 3: Other platforms

Works on AWS (ECS, App Runner, Elastic Beanstalk), Azure (App Service,
Container Apps), Railway, Render, Fly.io, and similar. The contract:

1. Build: `npm run build:all`
2. Env: `NODE_ENV=production PORT=8080`
3. Start: `npm start`

Or ship the Dockerfile to anything that runs OCI containers.

---

## Local Docker Testing

```bash
docker build -t basketball .
docker run -p 8080:8080 --name basketball basketball
# visit http://localhost:8080

docker stop basketball && docker rm basketball
```

## Local Development

```bash
npm install

# Frontend dev server (Vite, hot reload)
npm run dev

# Express server against the built dist/ (simulates production)
npm run build && npm run dev:server
```
