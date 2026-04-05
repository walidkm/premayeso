# PreMayeso – Project Plan

## Overview

PreMayeso is a Malawi MANEB exam-learning platform. It helps students prepare for JCE and MSCE exams through structured lessons, practice questions, and progress tracking.

## Phase 1 – Core Learner Loop (Current Focus)

Build the minimum viable product that lets a student:

1. Sign in
2. Choose exam type (JCE or MSCE)
3. Open a subject
4. Read a lesson
5. Answer practice questions

### Apps to build first

- **apps/mobile** – Expo React Native learner app
- **apps/admin** – Next.js admin CMS (for adding lessons and questions)
- **apps/api** – Node.js backend (authentication, content API, progress tracking)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo (React Native) |
| Admin | Next.js |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT |
| CI/CD | GitHub Actions |
| Hosting | TBD |

## Repository Structure

```
premayeso/
  apps/
    mobile/   # Expo React Native app
    admin/    # Next.js admin panel
    api/      # Node.js backend
  docs/       # Project documentation
  infra/      # Infrastructure config
```

## Branch Strategy

- `main` – stable, production-ready
- `dev` – active development

Work on `dev`, merge to `main` when stable.

## Build Order

1. apps/mobile – Expo app scaffolding
2. apps/api – Node.js backend with auth and content routes
3. apps/admin – Next.js admin panel for content management

## Out of Scope for Phase 1

- Payments
- AI features
- Anti-cheat systems
- GitHub Actions CI/CD (set up after basic scaffold is done)

## Status

- [x] GitHub monorepo created
- [x] Folder structure set up (apps/mobile, apps/admin, apps/api, docs, infra)
- [x] Two branches: main and dev
- [x] README.md updated
- [ ] Scaffold apps/mobile (Expo)
- [ ] Scaffold apps/api (Node.js)
- [ ] Scaffold apps/admin (Next.js)
