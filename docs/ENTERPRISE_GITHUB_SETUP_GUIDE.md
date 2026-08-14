# Enterprise GitHub Multi-Environment Administration Guide

This guide details how Fortune 500 tech companies and enterprise organizations configure GitHub to enforce strict **Dev ➔ QA ➔ Prod** lifecycle governance.

---

## 1. GitHub Organization Team Structure

To implement role-based access control (RBAC), create three dedicated teams under **GitHub Organization ➔ Teams**:

```
Your Organization
├── 👥 engineers (All Developers)
│   ├── Access: Read & Write on repositories
│   └── Allowed Actions: Create feature branches, open PRs to `dev`
│
├── 👥 qa-team (QA Engineers & SDET Leads)
│   ├── Access: Write on repositories
│   └── Allowed Actions: Review `dev ➔ qa` PRs, approve QA deployments
│
└── 👥 release-managers (DevOps, SRE, Engineering Directors)
    ├── Access: Admin / Maintainer
    └── Allowed Actions: Review `qa ➔ main` PRs, approve Production deployments
```

---

## 2. Configuring Repository Branch Rulesets

GitHub **Rulesets** (recommended over legacy branch protection rules) allow fine-grained enforcement across branches.

### Ruleset 1: Lock Down `main` (Production)
* **Navigate to:** Repository ➔ **Settings** ➔ **Rules** ➔ **Rulesets** ➔ **New ruleset** ➔ **New branch ruleset**.
* **Ruleset Name:** `Production Protection (main)`
* **Enforcement status:** `Active`
* **Target branches:** `Include default branch` OR `refs/heads/main`
* **Bypass list:**
  - Add `release-managers` team (Role: "Always allow").
* **Rules to enable:**
  - ✅ **Restrict creations** (Prevents anyone from pushing a new branch named main).
  - ✅ **Restrict deletions**
  - ✅ **Block force pushes**
  - ✅ **Require a pull request before merging**:
    - Required approvals: **`2`**
    - Dismiss stale pull request approvals when new commits are pushed: **Enabled**
    - Require review from Code Owners: **Enabled**
    - Require approval of the most recent reviewable push: **Enabled**
  - ✅ **Require status checks to pass**:
    - Status check: `02 - Governance: Branch Protection Guard / Enforce Dev ➔ QA ➔ Prod Governance`
    - Status check: `04 - CD: QA Deploy, Smoke Tests & Auto-Promote to Prod / Run QA Integration & Smoke Tests`
    - Require branches to be up to date before merging: **Enabled**

---

### Ruleset 2: Lock Down `qa` (QA / Staging)
* **Ruleset Name:** `QA Staging Protection (qa)`
* **Enforcement status:** `Active`
* **Target branches:** `refs/heads/qa`
* **Bypass list:**
  - Add `qa-team` and `release-managers`.
* **Rules to enable:**
  - ✅ **Restrict deletions**
  - ✅ **Block force pushes**
  - ✅ **Require a pull request before merging**:
    - Required approvals: **`1`** (QA Lead approval)
    - Dismiss stale approvals on push: **Enabled**
  - ✅ **Require status checks to pass**:
    - Status check: `02 - Governance: Branch Protection Guard / Enforce Dev ➔ QA ➔ Prod Governance` (Validates source is `dev`)
    - Status check: `01 - CI: Pull Request Validation (dev) / Lint, Unit Test & Build Check`

---

### Ruleset 3: Protect `dev` (Development Branch)
* **Ruleset Name:** `Development Branch Protection (dev)`
* **Enforcement status:** `Active`
* **Target branches:** `refs/heads/dev`
* **Bypass list:** None (all engineers must follow the PR process).
* **Rules to enable:**
  - ✅ **Block force pushes**
  - ✅ **Require a pull request before merging**:
    - Required approvals: **`1`** (Peer engineer review)
  - ✅ **Require status checks to pass**:
    - Status check: `validate-pr` (Lint, Unit Test & Build Check)

---

## 3. Configuring GitHub Environments & Approval Gates

GitHub Environments isolate variables, secrets, and deployment gates between stages.

Navigate to: **Settings ➔ Environments ➔ New environment**

### Environment 1: `development`
* **Name:** `development`
* **Environment Protection Rules:** None (Continuous deployment upon PR merge into `dev`).
* **Deployment Branches:** Select **Selected branches** ➔ Add `dev`.
* **Environment Secrets:**
  - `DATABASE_URL` = `postgresql://dev_user:...@dev-db.internal/app_dev`
  - `API_KEY` = `dev_secret_key_123`

---

### Environment 2: `qa`
* **Name:** `qa`
* **Environment Protection Rules:**
  - ✅ **Required reviewers:** Add `@your-org/qa-team` (Optional if approval on the `dev ➔ qa` PR is sufficient, or enabled for secondary manual deployment gating).
* **Deployment Branches:** Select **Selected branches** ➔ Add `qa`.
* **Environment Secrets:**
  - `DATABASE_URL` = `postgresql://qa_user:...@qa-db.internal/app_qa`
  - `API_KEY` = `qa_staging_key_456`

---

### Environment 3: `production`
* **Name:** `production`
* **Environment Protection Rules:**
  - ✅ **Required reviewers:** Add `@your-org/release-managers` (GitHub will pause deployment and send Slack/Email notifications until an authorized manager clicks **Approve**).
  - ✅ **Wait timer:** `5 minutes` (Optional soak/baking time).
  - ✅ **Prevent self-review:** Enabled (The committer cannot approve their own production deployment).
* **Deployment Branches:** Select **Selected branches** ➔ Add `main`.
* **Environment Secrets:**
  - `DATABASE_URL` = `postgresql://prod_admin:...@prod-cluster.internal/app_prod` (Encrypted, restricted access).
  - `API_KEY` = `prod_live_key_789`

---

## 4. End-to-End Walkthrough of a Feature Release

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    actor Peer as Peer Reviewer
    actor QA as QA Lead
    actor RM as Release Manager
    participant GitHub as GitHub Actions
    participant Cloud as Cloud Infrastructure

    Dev->>GitHub: Open PR: `feature/login` ➔ `dev`
    GitHub->>GitHub: Run CI: Linter, Unit Tests, SAST
    Peer->>GitHub: Review & Approve PR
    Dev->>GitHub: Merge PR into `dev`
    
    GitHub->>Cloud: Build Docker SHA & Deploy to DEV Environment
    GitHub->>GitHub: Auto-create Promotion PR: `dev` ➔ `qa`
    
    QA->>GitHub: Review & Merge PR into `qa`
    GitHub->>Cloud: Deploy SHA Artifact to QA Environment
    GitHub->>Cloud: Run Automated Smoke & E2E Tests
    GitHub->>GitHub: Auto-create Release PR: `qa` ➔ `main`
    
    RM->>GitHub: Review & Merge PR into `main`
    GitHub->>RM: Prompt: Production Environment Approval Required
    RM->>GitHub: Click "Approve and Deploy"
    GitHub->>Cloud: Zero-Downtime Rollout to Production
    GitHub->>Cloud: Run Live Canary Health Check
    GitHub->>GitHub: Publish GitHub Release Tag
```
