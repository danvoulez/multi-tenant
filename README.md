# LogLineOS Multi-Tenant Next.js Template

A minimalistic multi-tenant Next.js starter template with LogLineOS authentication. Ledger-native auth with Ed25519 signatures, magic links, and cryptographic wallets.

[Demo](https://multi-tenant.vercel.app/)

## 🔐 Authentication Flow

This template implements LogLineOS's **zero-password** authentication:

1. **Magic Link** - User enters email, receives signed link
2. **Key Attestation** - Proves control of Ed25519 private key
3. **Wallet Creation** - Cryptographic wallet with secure key storage
4. **Token Issuance** - API key for authenticated requests

All operations are recorded as **immutable, signed spans** in the ledger.

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

This template implements **LogLineOS magic link authentication**:

### 🎯 Authentication Pages

- **`/auth/login`** - Magic link (email only, no password)
- **`/auth/callback`** - Magic link verification & auto-login
- **`/auth/api-key`** - Direct API key login (fallback)

### How Magic Links Work

1. **User enters email** → System checks if registered
2. **New user** → Email with API key + activation link
3. **Existing user** → Email with temporary magic link (15 min)
4. **Click link** → Auto-login → Dashboard

### LogLineOS Security

- **API Keys** (`tok_live_...`) for authenticated requests
- **Ed25519 Wallets** - Keys stored in AWS Secrets Manager
- **Key Attestation** - Proves control of private key via nonce signing
- **Signed Spans** - All mutations signed (Ed25519 + BLAKE3)
- **Tenant Isolation** - PostgreSQL Row-Level Security
- **Immutable Ledger** - Complete audit trail

### Authentication Flow

```
User Email → Magic Link → Key Attestation → Wallet Created → Token Issued
     ↓            ↓              ↓                ↓              ↓
  identity    nonce sign    proof of key     secure storage   API Key
registration   (Ed25519)     ownership        (Secrets Mgr)   (tok_live_...)
```

All steps recorded as **signed, immutable spans** in the ledger.

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
