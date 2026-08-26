# Enterprise Multi-Environment Delivery Pipeline (Dev ➔ QA ➔ Prod)

An enterprise-grade reference architecture and template for automated **Dev ➔ QA ➔ Prod** environments with strict branch governance, environment protection gates, artifact promotion, and automated deployment pipelines on GitHub.

---

## Architecture Overview

```
[ Developer Local ]
       │  (Creates feature branch `feature/ABC-123`)
       ▼
 [ Feature PR to `dev` ] ───► [ CI: Lint, Security Scan, Unit Tests ]
       │
       │  (Merged by Peer Approval)
       ▼
 [ `dev` Branch ] ──────────► [ CD: Deploy to Dev Cluster / Cloud ]
       │                      [ CI: Build & Tag Immutable Docker Artifact (SHA) ]
       │                      [ Auto-Create/Update Promotion PR: dev ➔ qa ]
       ▼
 [ Promotion PR to `qa` ] ───► [ Restricted to QA Leads / Release Managers ]
       │
       │  (QA Lead Approves & Merges)
       ▼
  [ `qa` Branch ] ──────────► [ CD: Deploy SHA Artifact to QA / Staging ]
       │                      [ Automated Integration & Smoke Test Suite ]
       │                      [ Auto-Create Promotion PR: qa ➔ main ]
       ▼
 [ Release PR to `main` ] ───► [ Restricted to Release Managers / DevOps ]
       │
       │  (Approved & Merged)
       ▼
 [ `main` Branch ] ─────────► [ Pauses for GitHub Environment Manual Approval Gate ]
                              [ CD: Deploy SHA Artifact to Production (Zero Downtime) ]
                              [ Live Production Health & Canary Verification ]
```

---

## Table of Contents

1. [How Industry Leaders Manage Environments](#1-how-industry-leaders-manage-environments)
2. [Branch Governance & Access Control Matrix](#2-branch-governance--access-control-matrix)
3. [Step-by-Step GitHub Configuration Guide](#3-step-by-step-github-configuration-guide)
   - [A. Organization Teams](#a-organization-teams)
   - [B. GitHub Repository Rulesets](#b-github-repository-rulesets)
   - [C. GitHub Environments & Secrets Isolation](#c-github-environments--secrets-isolation)
4. [Automated CI/CD Workflow Pipeline](#4-automated-cicd-workflow-pipeline)
5. [The "Build Once, Deploy Everywhere" Golden Rule](#5-the-build-once-deploy-everywhere-golden-rule)
6. [Daily Developer & Release Workflow](#6-daily-developer--release-workflow)
7. [Repository File Structure](#7-repository-file-structure)

---

## 1. How Industry Leaders Manage Environments

Top engineering organizations (e.g., Google, Netflix, Amazon, Meta) solve multi-environment deployments using two fundamental pillars:

1. **Strict Branch Guardrails**: Developers write code in feature branches and are **only allowed to open Pull Requests into `dev`**. They are blocked by GitHub branch rules and automated CI policies from opening PRs directly to `qa` or `main`/`prod`.
2. **Artifact Promotion (Build Once, Deploy Everywhere)**: You compile code and create your Docker image or binary **exactly once** during the `dev` stage, tagged with `app:sha-<git-commit>`. That identical image is tested in QA and promoted to Production—only configuration variables and secrets change at runtime.

---

## 2. Branch Governance & Access Control Matrix

| Branch          | Target Environment | Who Can Open PRs?         | Required Approvals                | Required Status Checks              | Who Can Merge / Bypass?         |
| --------------- | ------------------ | ------------------------- | --------------------------------- | ----------------------------------- | ------------------------------- |
| **`feature/*`** | Local / Ephemeral  | Developers                | N/A                               | Local pre-commit hooks              | Developers                      |
| **`dev`**       | **Development**    | All Developers            | 1 Peer Approval                   | Lint + Unit Tests + SAST Scan       | Any Developer                   |
| **`qa`**        | **QA / Staging**   | Automated Bot or QA Leads | 1 QA Lead Approval                | Dev Deployment Status + Smoke Tests | `qa-team` or `release-managers` |
| **`main`**      | **Production**     | Release Managers / CI Bot | 2 Approvals (Eng Lead + Security) | QA Sign-off + Security Scan         | `release-managers` only         |

---

## 3. Step-by-Step GitHub Configuration Guide

### A. Organization Teams

Go to your **GitHub Organization $\rightarrow$ Teams** and create:

- **`engineers`**: All software developers (Push access to feature branches).
- **`qa-team`**: QA engineers and SDETs (Reviewers for `qa` environment).
- **`release-managers`**: DevOps and Tech Leads (Reviewers for `production` environment).

---

### B. GitHub Repository Rulesets

Navigate to **Repo Settings $\rightarrow$ Rules $\rightarrow$ Rulesets**:

#### Rule 1: Protect `main` (Production)

- **Target branches**: Include `refs/heads/main`
- **Restrictions**:
  - Check **Restrict deletions** and **Restrict force pushes**.
  - Check **Require a pull request before merging**:
    - Required approvals: `2`
    - Dismiss stale pull request approvals when new commits are pushed: `Checked`
    - Require review from Code Owners: `Checked`
  - Check **Require status checks to pass**:
    - `build-and-test`
    - `security-scan`
  - **Bypass list**: Add only the `release-managers` team or CI service bot with "Always allow".

#### Rule 2: Protect `qa` (QA/Staging)

- **Target branches**: Include `refs/heads/qa`
- **Restrictions**:
  - Check **Require a pull request before merging**:
    - Required approvals: `1` (QA Lead)
  - Check **Require status checks to pass**:
    - `branch-guard` (Validates PR source is `dev`)
    - `build-and-test`
  - **Bypass list**: Add `qa-team` and `release-managers`.

#### Rule 3: Protect `dev` (Development)

- **Target branches**: Include `refs/heads/dev`
- **Restrictions**:
  - Check **Require a pull request before merging**:
    - Required approvals: `1`
  - Check **Require status checks to pass**:
    - `pr-validation / test-and-lint`
  - **Bypass list**: None (All developers must pass PR review and CI).

---

### C. GitHub Environments & Secrets Isolation

Navigate to **Repo Settings $\rightarrow$ Environments**:

```
GitHub Repository Environments
│
├── 1. development
│   ├── Deployment branches: Selected branches -> `dev`
│   ├── Protection rules: None (Immediate continuous deployment)
│   └── Environment Secrets:
│       ├── APP_ENV = "development"
│       ├── DATABASE_URL = "postgres://dev-db..."
│       └── API_ENDPOINT = "https://dev-api.company.com"
│
├── 2. qa
│   ├── Deployment branches: Selected branches -> `qa`
│   ├── Protection rules:
│   │   └── Required reviewers: `@your-org/qa-team`
│   └── Environment Secrets:
│       ├── APP_ENV = "qa"
│       ├── DATABASE_URL = "postgres://qa-db..."
│       └── API_ENDPOINT = "https://qa-api.company.com"
│
└── 3. production
    ├── Deployment branches: Selected branches -> `main`
    ├── Protection rules:
    │   ├── Required reviewers: `@your-org/release-managers`
    │   └── Wait timer: 5 minutes (optional bake time)
    └── Environment Secrets:
        ├── APP_ENV = "production"
        ├── DATABASE_URL = "postgres://prod-db..." (Strictly restricted)
        └── API_ENDPOINT = "https://api.company.com"
```

---

## 4. Automated CI/CD Workflow Pipeline

This repository includes turnkey GitHub Actions workflows:

1. **[`.github/workflows/01-pr-dev-validation.yml`](.github/workflows/01-pr-dev-validation.yml)**:
   - Triggers on any PR opened against `dev`.
   - Runs linting, unit tests, code formatting checks, and security scan.
2. **[`.github/workflows/02-branch-guard.yml`](.github/workflows/02-branch-guard.yml)**:
   - Protects `qa` and `main` against direct developer PRs. If a developer accidentally opens a PR from a feature branch targeting `qa` or `main`, the workflow fails immediately with a polite, automated instruction.
3. **[`.github/workflows/03-dev-deploy-and-promote.yml`](.github/workflows/03-dev-deploy-and-promote.yml)**:
   - Triggers when PR merges into `dev`.
   - Builds immutable Docker image with commit SHA tag.
   - Deploys to Dev environment.
   - Automatically generates or updates an automated Promotion PR: `dev ➔ qa`.
4. **[`.github/workflows/04-qa-deploy-and-test.yml`](.github/workflows/04-qa-deploy-and-test.yml)**:
   - Triggers when QA Lead merges the promotion PR into `qa`.
   - Deploys the exact SHA artifact to QA environment.
   - Executes automated E2E and smoke test suites.
   - Automatically opens a Release PR: `qa ➔ main`.
5. **[`.github/workflows/05-prod-deploy.yml`](.github/workflows/05-prod-deploy.yml)**:
   - Triggers on merge to `main`.
   - Hits GitHub Environment Approval Gate (DevOps / VP must click "Approve and Deploy").
   - Performs zero-downtime deployment to Production.
   - Runs live post-deployment health check.

---

## 5. The "Build Once, Deploy Everywhere" Golden Rule

```
                                  [ Build Phase (DEV) ]
                                            │
                                            ▼
                             ┌─────────────────────────────┐
                             │ Docker Image:               │
                             │ company/app:sha-8f3a12b     │
                             └──────────────┬──────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      [ DEV Environment ]           [ QA Environment ]          [ PROD Environment ]
  • Injected Secrets (DEV)      • Injected Secrets (QA)     • Injected Secrets (PROD)
  • Debug Logs = ON             • Debug Logs = OFF          • Debug Logs = OFF
  • Dev Database                • QA Staging Database       • Multi-AZ Prod Database
```

---

## 6. Daily Developer & Release Workflow

### For Developers:

1. Create feature branch: `git checkout -b feature/auth-module dev`
2. Write code, test locally.
3. Open PR: `feature/auth-module ➔ dev`
4. CI runs validations. Peer reviews & approves.
5. Merge PR into `dev`. Your work is now live on Dev environment.

### For QA Leads:

1. A Promotion PR (`dev ➔ qa`) is created automatically by GitHub Actions.
2. Review the changelog and QA ticket IDs.
3. Approve and merge into `qa`.
4. QA pipeline deploys to QA Staging and runs automated integration test suites.
5. Perform manual exploratory testing.

### For Release Managers:

1. An automated Release PR (`qa ➔ main`) is created.
2. Review final release readiness and audit report.
3. Merge PR into `main`.
4. Production workflow pauses $\rightarrow$ Release Manager clicks **"Review deployments" $\rightarrow$ "Approve"** in GitHub Actions.
5. Application goes live to production customers.

Dhananjay Sable
