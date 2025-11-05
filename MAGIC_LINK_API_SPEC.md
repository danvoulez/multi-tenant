# LogLineOS Magic Link API Specification

## Required Endpoints

### 1. Send Magic Link
**`POST /auth/magic-link`**

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Backend Logic:**
1. Check if email exists in `identity_registration` spans
2. **If NEW USER:**
   - Generate Ed25519 keypair
   - Create wallet (`POST /wallet/create`)
   - Generate API key `tok_live_...`
   - Generate activation token (JWT or UUID, 24h expiry)
   - Send email with:
     - Subject: "Welcome to LogLineOS"
     - Body: Your API Key + activation link
     - Link: `https://app.com/auth/callback?token={activation_token}&key={api_key}`
3. **If EXISTING USER:**
   - Generate magic link token (nonce, 15 min expiry)
   - Send email with:
     - Subject: "Sign in to LogLineOS"
     - Link: `https://app.com/auth/callback?token={magic_token}`

**Response:**
```json
{
  "ok": true,
  "email_sent": true
}
```

---

### 2. Verify Magic Link
**`POST /auth/magic-link/verify`**

**Request:**
```json
{
  "token": "abc123xyz..."
}
```

**Backend Logic:**
1. Validate token (check expiry, not used before)
2. Mark token as used (prevent replay attacks)
3. **If activation token (new user):**
   - Return wallet info + API key
4. **If magic link (existing user):**
   - Get wallet by email
   - Return API key or generate temporary session token

**Response (New User):**
```json
{
  "ok": true,
  "api_key": "tok_live_abc123...",
  "wallet": {
    "wallet_id": "wlt_tenant_user",
    "tenant_id": "tenant",
    "scopes": ["wallet.open", "span.sign", "memory.*"],
    "display_name": "User Name",
    "email": "user@example.com"
  }
}
```

**Response (Existing User):**
```json
{
  "ok": true,
  "api_key": "tok_live_existing...",
  "wallet": {
    "wallet_id": "wlt_tenant_user",
    "tenant_id": "tenant",
    "scopes": ["wallet.open", "span.sign"],
    "display_name": "User Name",
    "email": "user@example.com"
  }
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "invalid_token",
  "message": "Token expired or already used"
}
```

---

## Email Service Requirements

### Provider Options
- AWS SES
- SendGrid
- Resend
- Mailgun

### Email Templates

**New User Email:**
```html
Subject: Welcome to LogLineOS 🚀

Hi there!

Your LogLineOS account is ready. Here's your API Key:

tok_live_abc123def456...

⚠️ Save this key securely - you won't see it again!

Click here to activate your account:
https://app.com/auth/callback?token=xyz&key=tok_live_abc123

This link expires in 24 hours.

---
LogLineOS Team
```

**Existing User Email:**
```html
Subject: Sign in to LogLineOS

Hi {name}!

Click the link below to sign in:
https://app.com/auth/callback?token=xyz

This link expires in 15 minutes.

Didn't request this? Ignore this email.

---
LogLineOS Team
```

---

## Token Storage (DynamoDB)

**Table: `magic_link_tokens`**
```json
{
  "token_hash": "blake3_hash_of_token",
  "email": "user@example.com",
  "token_type": "activation" | "magic_link",
  "created_at": 1699123456,
  "expires_at": 1699209856,
  "used": false,
  "used_at": null,
  "wallet_id": "wlt_tenant_user",
  "api_key_hash": "hash..." // only for activation tokens
}
```

**Index:** `email-index` (for looking up by email)

---

## Security Considerations

1. **Rate Limiting:** Max 3 magic links per email per hour
2. **Token Entropy:** Use cryptographically secure random (32 bytes)
3. **Expiry:** 
   - Activation tokens: 24 hours
   - Magic links: 15 minutes
4. **One-time Use:** Mark as used immediately after verification
5. **Hash Tokens:** Store BLAKE3 hash in DB, not plaintext
6. **Email Validation:** Verify email format before sending

---

## Implementation Checklist

- [ ] `POST /auth/magic-link` endpoint
- [ ] `POST /auth/magic-link/verify` endpoint
- [ ] Email service integration (SES/SendGrid)
- [ ] Token generation (secure random)
- [ ] Token storage (DynamoDB)
- [ ] Email templates (HTML)
- [ ] Rate limiting (per email)
- [ ] Token expiry logic
- [ ] One-time use enforcement
- [ ] Wallet creation for new users
- [ ] API key issuance
- [ ] Error handling & logging
- [ ] Span creation for audit trail

---

## Example AWS SES Code

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "us-east-1" });

async function sendMagicLink(email: string, token: string, isNewUser: boolean) {
  const link = isNewUser
    ? `https://app.com/auth/callback?token=${token}&key=${apiKey}`
    : `https://app.com/auth/callback?token=${token}`;

  const params = {
    Source: "noreply@loglineos.com",
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: isNewUser ? "Welcome to LogLineOS" : "Sign in to LogLineOS" },
      Body: {
        Html: { Data: `<p>Click here: <a href="${link}">${link}</a></p>` }
      }
    }
  };

  await ses.send(new SendEmailCommand(params));
}
```

---

**Status:** Specification ready for implementation  
**Last updated:** 2025-11-05
