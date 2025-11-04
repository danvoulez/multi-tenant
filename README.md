# LogLineOS Multi-Tenant Next.js Template

A minimalistic multi-tenant Next.js starter template with LogLineOS authentication. Ledger-native auth with API Keys, Wallets, and Ed25519 signatures.

[Demo](https://multi-tenant.vercel.app/)

## Landing Page

<div align="center">
<img src="./assets/landing-page.png" alt="Teams" width="600"/>
</div>

## Dashboard

<div align="center">
<img src="./assets/dashboard-overview.png" alt="Teams" width="600"/>
</div>

## Multi-tenancy (Teams)

<div align="center">
<img src="./assets/team-switcher.png" alt="Teams" width="400"/>
</div>

## Account Settings

<div align="center">
<img src="./assets/account-settings.png" alt="Teams" width="500"/>
</div>

## Getting Started

1. Clone the repository

    ```bash
    git clone git@github.com:danvoulez/multi-tenant.git
    ```

2. Install dependencies

    ```bash
    npm install
    ```

3. Configure LogLineOS API endpoint in `.env.local`:

    ```env
    NEXT_PUBLIC_LOGLINE_API_URL=http://localhost:3001
    ```

    **LogLineOS** uses ledger-native authentication with API Keys and Wallets. No passwords required - everything is signed with Ed25519 and recorded as immutable spans in the ledger.

4. Start the development server and go to [http://localhost:3000](http://localhost:3000)

    ```bash
    npm run dev 
    ```

## Authentication

This template uses **LogLineOS** - a ledger-based authentication system where:

- **API Keys** (`Authorization: ApiKey tok_live_...`) authenticate requests
- **Wallets** securely store cryptographic keys and credentials
- **All mutations** are signed with Ed25519 before entering the ledger
- **Multi-tenancy** is built-in with tenant isolation via PostgreSQL RLS
- **Everything is auditable** - every operation is a versioned span

### How It Works

1. Users authenticate with API Keys
2. Each key is linked to a Wallet with cryptographic keys
3. Wallets sign all mutations (Ed25519 + BLAKE3)
4. Tenant isolation is enforced at the database level
5. All operations are immutable spans in the ledger

## Features & Tech Stack

- Next.js 14 app router
- TypeScript
- Tailwind & Shadcn UI
- LogLineOS Authentication (Ledger-native, API Keys, Wallets, Ed25519)
- Multi-tenancy (teams/orgs) with tenant isolation
- Dark mode

## LogLineOS Features

- **Ledger-Only**: All logic as versioned spans in PostgreSQL
- **No Passwords**: API Key authentication with cryptographic wallets
- **Immutable & Auditable**: Every operation is a signed span
- **Multi-Tenant by Design**: Row-Level Security ensures tenant isolation
- **Serverless-First**: Stateless REST APIs
- **Cryptographically Signed**: Ed25519 + BLAKE3 signatures on all mutations

## Inspired by

- [Shadcn UI](https://github.com/shadcn-ui/ui)
- [Shadcn Taxonomy](https://github.com/shadcn-ui/taxonomy)
- [LogLineOS](https://github.com/danvoulez/loglineos)
