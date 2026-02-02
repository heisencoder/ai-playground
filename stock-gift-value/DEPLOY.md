# Deployment Guide

This document covers deployment options for the Stock Gift Value Calculator application.

## Overview

This is a standard Node.js Express app that can be deployed to any platform supporting Node.js 22+. Below are detailed instructions for deploying to **Google Cloud Platform (GCP)**.

## Automated Deployment with GitHub Actions

The GitHub Actions workflow (`.github/workflows/stock-gift-value-deploy.yml`) automatically deploys to GCP Cloud Run when a new release is created with a tag starting with `stock-gift-value/` (e.g., `stock-gift-value/v1.0.0`).

### Creating a Release

1. Go to GitHub → Releases → "Create a new release"
2. Create a new tag with the format: `stock-gift-value/v1.0.0`
3. Fill in the release title and notes
4. Click "Publish release"

The deployment workflow will automatically build and deploy to Cloud Run.

### Setting Up GitHub Secrets for GCP Deployment

This deployment uses **Workload Identity Federation** for secure authentication without storing long-lived credentials. You need to configure the following GitHub Secrets specific to this app:

| Secret Name | Description |
|-------------|-------------|
| `STOCK_GIFT_VALUE_GCP_PROJECT_ID` | Your GCP project ID (e.g., `my-project-123`) |
| `STOCK_GIFT_VALUE_GCP_SERVICE_ACCOUNT` | Service account email (e.g., `stock-gift-deploy@my-project.iam.gserviceaccount.com`) |
| `STOCK_GIFT_VALUE_GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider resource name |
| `STOCK_GIFT_VALUE_GCP_ARTIFACT_REPO` | Artifact Registry repository name (e.g., `stock-gift-value`) |

### Step-by-Step GCP Setup

Follow these steps to configure GCP with minimal permissions for deploying only this app:

#### 1. Set Environment Variables

```bash
# Replace with your values
export PROJECT_ID="your-gcp-project-id"
export GITHUB_ORG="your-github-username-or-org"
export GITHUB_REPO="your-repo-name"
export REGION="us-central1"
```

#### 2. Enable Required GCP APIs

```bash
gcloud services enable \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  iamcredentials.googleapis.com \
  --project=$PROJECT_ID
```

> **Note:** Enabling `compute.googleapis.com` creates the default Compute Engine service account, which Cloud Run uses as its runtime identity.

#### 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create stock-gift-value \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for Stock Gift Value app" \
  --project=$PROJECT_ID
```

#### 4. Create a Service Account with Minimal Permissions

```bash
# Create the service account
gcloud iam service-accounts create stock-gift-deploy \
  --display-name="Stock Gift Value Deployer" \
  --description="Service account for deploying Stock Gift Value app via GitHub Actions" \
  --project=$PROJECT_ID

# Get the service account email
export SA_EMAIL="stock-gift-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
```

#### 5. Grant Minimal Required Permissions

These permissions are scoped to only what's needed for deploying this specific app:

```bash
# Permission to push images to Artifact Registry (scoped to this repository only)
gcloud artifacts repositories add-iam-policy-binding stock-gift-value \
  --location=$REGION \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" \
  --project=$PROJECT_ID

# Permission to deploy to Cloud Run (scoped to this service only)
# First, create the Cloud Run service if it doesn't exist (or grant project-level for initial creation)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.developer"

# Permission to act as the Cloud Run service's runtime service account
gcloud iam service-accounts add-iam-policy-binding \
  ${PROJECT_ID}-compute@developer.gserviceaccount.com \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project=$PROJECT_ID
```

#### 6. Set Up Workload Identity Federation

This allows GitHub Actions to authenticate without storing service account keys:

```bash
# Create a Workload Identity Pool
gcloud iam workload-identity-pools create "github-actions" \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --project=$PROJECT_ID

# Create a Workload Identity Provider for GitHub
gcloud iam workload-identity-pools providers create-oidc "github" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --project=$PROJECT_ID

# Allow the GitHub repo to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-actions/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}" \
  --project=$PROJECT_ID
```

#### 7. Get the Workload Identity Provider Resource Name

```bash
# Get the full provider resource name (you'll need this for the GitHub secret)
gcloud iam workload-identity-pools providers describe github \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --format="value(name)" \
  --project=$PROJECT_ID
```

This will output something like:
```
projects/123456789/locations/global/workloadIdentityPools/github-actions/providers/github
```

#### 8. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `STOCK_GIFT_VALUE_GCP_PROJECT_ID` | `your-gcp-project-id` |
| `STOCK_GIFT_VALUE_GCP_SERVICE_ACCOUNT` | `stock-gift-deploy@your-gcp-project-id.iam.gserviceaccount.com` |
| `STOCK_GIFT_VALUE_GCP_WORKLOAD_IDENTITY_PROVIDER` | The full provider name from step 7 |
| `STOCK_GIFT_VALUE_GCP_ARTIFACT_REPO` | `stock-gift-value` |

### Security Notes

- **Workload Identity Federation** is used instead of service account keys. This means no long-lived credentials are stored in GitHub.
- The service account has **minimal permissions**:
  - Can only push to the `stock-gift-value` Artifact Registry repository
  - Can only deploy Cloud Run services (with `run.developer` role)
  - Cannot access other GCP resources
- All secret names are prefixed with `STOCK_GIFT_VALUE_` to allow adding other apps to this repo with their own isolated credentials.

### Troubleshooting Deployment

**Permission denied pushing to Artifact Registry:**
- Verify the service account has `artifactregistry.writer` role on the repository
- Check that Workload Identity Federation is configured correctly

**Cannot deploy to Cloud Run:**
- Verify the service account has `run.developer` role
- Verify the service account has `iam.serviceAccountUser` role on the compute service account

**Workload Identity authentication fails:**
- Verify the repository name in the IAM binding matches exactly (case-sensitive)
- Check that the `id-token: write` permission is set in the workflow

---

## Manual Deployment Options

### Option 1: GCP Compute Engine (e2-micro - Free Tier)

Deploy to a small VM instance with full control. The e2-micro instance is part of GCP's free tier (750 hours/month).

#### Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`

#### Deployment Steps

**1. Create an e2-micro VM instance:**

```bash
gcloud compute instances create stock-gift-app \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=10GB \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server
```

**2. Configure firewall rules to allow HTTP/HTTPS traffic:**

```bash
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --target-tags http-server

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --target-tags https-server

# Allow the app port (8080)
gcloud compute firewall-rules create allow-app \
  --allow tcp:8080 \
  --target-tags http-server
```

**3. SSH into your instance:**

```bash
gcloud compute ssh stock-gift-app --zone=us-central1-a
```

**4. Install Docker (on Container-Optimized OS, Docker is pre-installed):**

If using a different OS, install Docker:
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

**5. Build and run your Docker container:**

First, copy your code to the VM or clone from git:

```bash
# Option A: Clone from git repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/typescript/stock-gift-value

# Option B: Copy files from local machine (run on your local machine)
gcloud compute scp --recurse ./typescript/stock-gift-value stock-gift-app:~/app --zone=us-central1-a
```

Then build and run:

```bash
cd ~/app  # or your app directory

# Build the Docker image
sudo docker build -t stock-gift-app .

# Run the container
sudo docker run -d \
  --name stock-gift-app \
  --restart unless-stopped \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  stock-gift-app

# Check if running
sudo docker ps
sudo docker logs stock-gift-app
```

**6. Access your app:**

Get your VM's external IP:
```bash
gcloud compute instances describe stock-gift-app \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Visit: `http://YOUR_EXTERNAL_IP:8080`

#### Managing the Deployment

**View logs:**
```bash
sudo docker logs -f stock-gift-app
```

**Update the app:**
```bash
# Pull latest changes
git pull

# Rebuild and restart
sudo docker stop stock-gift-app
sudo docker rm stock-gift-app
sudo docker build -t stock-gift-app .
sudo docker run -d --name stock-gift-app --restart unless-stopped -p 8080:8080 stock-gift-app
```

**Stop/Start the VM (to save costs):**
```bash
# Stop (from local machine)
gcloud compute instances stop stock-gift-app --zone=us-central1-a

# Start
gcloud compute instances start stock-gift-app --zone=us-central1-a
```

### Option 2: GCP Cloud Run (Serverless)

Fully managed serverless option with automatic scaling. Better for variable traffic patterns.

**1. Build and push to Google Container Registry:**

```bash
# Set your project ID
export PROJECT_ID=YOUR_PROJECT_ID

# Build and push using Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/stock-gift-app

# Or build locally and push
docker build -t gcr.io/$PROJECT_ID/stock-gift-app .
docker push gcr.io/$PROJECT_ID/stock-gift-app
```

**2. Deploy to Cloud Run:**

```bash
gcloud run deploy stock-gift-app \
  --image gcr.io/$PROJECT_ID/stock-gift-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 5 \
  --port 8080
```

**3. Access your app:**

Cloud Run will provide a URL like: `https://stock-gift-app-xxxxx-uc.a.run.app`

**Update the app:**
```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/stock-gift-app
gcloud run deploy stock-gift-app --image gcr.io/$PROJECT_ID/stock-gift-app --region us-central1
```

#### Optimizing Cloud Run for Fast Cold Starts

To achieve sub-5 second cold start times, configure the startup probe for faster health check detection:

```bash
gcloud run services update stock-gift-app \
  --region=us-central1 \
  --startup-probe httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=2,periodSeconds=1,timeoutSeconds=1,failureThreshold=3
```

Or include it during initial deployment:

```bash
gcloud run deploy stock-gift-app \
  --image gcr.io/$PROJECT_ID/stock-gift-app \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 5 \
  --port 8080 \
  --startup-probe httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=2,periodSeconds=1,timeoutSeconds=1,failureThreshold=3
```

**Why this helps:**
- By default, Cloud Run checks health every 3-5 seconds, adding 4-6 seconds of latency
- This configuration waits 2 seconds (for container init + Node startup), then checks every second
- Combined with direct Node invocation in the Dockerfile, cold starts drop from ~10s to ~4-5s

**Performance breakdown:**
- Container initialization: ~2.6s (unavoidable)
- Node.js startup: ~1.5s (optimized with direct `node` command vs `npm start`)
- Health check detection: ~1s (waits 2s, then succeeds on first or second probe)
- **Total: ~10s → ~4-5s** after optimization

### Option 3: Other Platforms

This app can also deploy to:
- **AWS** (Elastic Beanstalk, EC2, ECS)
- **Azure** (App Service, Container Instances)
- **Railway, Render, Fly.io, Heroku, DigitalOcean**

**General deployment steps:**
1. Build: `npm run build:all`
2. Set environment: `NODE_ENV=production PORT=8080`
3. Start: `npm start`

---

## Docker Deployment

A production-ready Dockerfile is included with:
- Multi-stage build for optimal image size
- Non-root user for security
- Health checks
- Alpine Linux base (smaller image)
- Direct Node.js invocation for fast cold starts (optimized for Cloud Run)

**Local Docker testing:**
```bash
# Build the image
docker build -t stock-gift-app .

# Run the container with port forwarding
docker run -p 8080:8080 --name stock-gift-app stock-gift-app

# Stop and remove when done
docker stop stock-gift-app
docker rm stock-gift-app
```

Visit: `http://localhost:8080`

**To rebuild after changes:**
```bash
docker stop stock-gift-app && docker rm stock-gift-app
docker build -t stock-gift-app .
docker run -p 8080:8080 --name stock-gift-app stock-gift-app
```
