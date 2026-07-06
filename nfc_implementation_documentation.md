# PingME NFC Smart Card System

This documentation provides both a **Simple Overview** (for high-level understanding) and a **Highly Detailed Technical Guide** (for developer code-tracing) of how the NFC card system is built, wired, and executed in the PingME application.

---

# PART 1: The Simple Overview

Imagine an NFC card as a physical link that someone carries in their pocket. When they meet someone new, they tap their card against a phone. Here is how that translates to the software, in simple terms:

```
┌──────────────┐          ┌───────────────────────┐          ┌─────────────────────┐
│  1. Physical │  Tapped  │ 2. Digital Profile    │  Clicks  │ 3. Save Contact     │
│  NFC Smart   │ ────────>│ Landing Page          │ ────────>│ & Share Lead        │
│  Card        │          │ (Name, Socials, UPI)  │          │ (vCard / Form Popup)│
└──────────────┘          └───────────────────────┘          └─────────────────────┘
```

1. **The Tap (NFC Redirection)**: The card has an embedded chip programmed with a URL like `http://nfc.plzpingme.com/neetabasile` or `https://plzpingme.com/neetabasile`. Tapping it triggers the phone's browser to open this link.
2. **The Landing Page**: The website reads the username (e.g. `neetabasile`) from the link and loads their premium profile page showing details like their Bio, Company, Phone, LinkedIn, and payment info.
3. **Saving the Contact (vCard)**: The visitor clicks the **SAVE** button. The phone opens a prompt to save the owner's contact directly to the phone's address book.
4. **Lead Capture (Share Back)**: Right after the contact is saved, a popup asks the visitor: *"Would you like to share your info back?"* If they fill it out, their contact info is emailed to the card owner and saved in the owner's dashboard as a lead.

---

# PART 2: Detailed Technical Guide

## 1. Directory Map (Where the Code Lives)

All of the NFC files reside in these primary paths in the workspace:

- **Subdomain Routing & App Entry**:
  - [src/App.tsx](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/src/App.tsx): Routes traffic for subdomains and catchment parameters.
- **Frontend Pages & Components**:
  - [src/pages/PublicNFCProfile.tsx](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/src/pages/PublicNFCProfile.tsx): Renders the profile page, vCard builder, Share Back popup, and trigger events.
  - [src/pages/NFCLanding.tsx](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/src/pages/NFCLanding.tsx): Renders the home landing page for the `nfc.` subdomain.
  - [src/components/NFCProfileBuilder.tsx](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/src/components/NFCProfileBuilder.tsx): Multi-step setup wizard for users claiming their username and editing profile contents during/after order checkout.
- **Frontend Services & Fetchers**:
  - [src/lib/publicNfcService.ts](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/src/lib/publicNfcService.ts): Controls in-memory caching and fetches public profiles from Cloud Functions.
  - [src/lib/nfcCheckout.ts](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/src/lib/nfcCheckout.ts): Handles cart expansion for orders containing multiple cards (creates sub-slots like `orderId_0`, `orderId_1`).
- **Backend Firebase Cloud Functions**:
  - [functions/src/index.js](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/functions/src/index.js): Defines API endpoints for fetching profiles, saving profile drafts, reverse lead submissions, and recording page hits.
- **Admin Setup Scripts**:
  - [scripts/create_nfc_orders.cjs](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/scripts/create_nfc_orders.cjs): Script to batch-import new profiles, populate Firestore records, link Auth users, and append details to CSV tracker sheets.

---

## 2. Router Routing Logic

Vite serves the client build. In [App.tsx](file:///Users/viren1974jind/Documents/pingme-react-latest/pingme1/src/App.tsx), routing detects the hostname:

```typescript
const isNfcSubdomain = typeof window !== "undefined" && (
  window.location.hostname.startsWith("nfc.") ||
  window.location.hostname.includes(".nfc.") ||
  (import.meta.env.DEV && new URLSearchParams(window.location.search).get("nfc") === "1")
);
```

### Route Branches
- **Subdomain (`isNfcSubdomain === true`)**:
  - `/` -> Renders `<NFCLanding />`
  - `/:username` -> Renders `<PublicNFCProfile />`
  - `/:username/NFC-Privacy-Policy` -> Renders `<NfcPrivacyPolicy />`
- **Main Domain (`isNfcSubdomain === false`)**:
  - Catch-all route `/:username` (defined at the bottom of the router) redirects matching usernames to `<PublicNFCProfile />`.

---

## 3. Database Schema

Firestore manages NFC data using these collections:

### `booking` (Orders)
```json
{
  "items": [
    { "id": "nfc-card-default", "title": "NFC Card", "price": "₹349", "quantity": 1 }
  ],
  "totalAmount": 349,
  "fullName": "Neeta Basile",
  "phone": "+1 (301) 514-0198",
  "email": "neeta@example.com",
  "status": "confirmed",
  "userId": "firebase_auth_uid_or_null",
  "nfcProfile": {
    "username": "neetabasile",
    "name": "Neeta Basile",
    "phone": "+1 (301) 514-0198"
  }
}
```

### `nfcProfiles` (Public Records)
*Note: The document ID is the same as the corresponding order/booking ID (e.g. `6QEOFhEex3Om8Hzr1hCy`).*
```json
{
  "orderId": "6QEOFhEex3Om8Hzr1hCy",
  "username": "neetabasile",
  "name": "Neeta Basile",
  "phone": "+1 (301) 514-0198",
  "email": null,
  "status": "confirmed",
  "visitCount": 12
}
```

### `nfcVisits` (Hit Analytics)
```json
{
  "username": "neetabasile",
  "timestamp": "serverTimestamp",
  "userAgent": "Mozilla/5.0 ...",
  "device": "mobile",
  "os": "iOS",
  "browser": "Safari"
}
```

### `nfcLeads` (Reverse Shared Contacts)
```json
{
  "cardOwnerUsername": "neetabasile",
  "cardOwnerEmail": "owner@email.com",
  "visitorName": "Visitor Name",
  "visitorEmail": "visitor@email.com",
  "visitorPhone": "+1 222 333 4444",
  "createdAt": "serverTimestamp"
}
```

---

## 4. API Endpoints Reference

All Cloud Functions run under the region `asia-south1` and are hosted on the endpoint `{VITE_PAYMENT_API_BASE_URL}`.

### 1. `GET /getPublicNfcProfile?username={username}`
- **Purpose**: Retrieves a public NFC profile by its claimed unique username.
- **Rules**:
  - If no record matches or the profile is marked `status: "draft"`, it returns a `404 Not Found`.
  - Normalizes usernames to lowercase.

### 2. `POST /trackNfcVisit`
- **Body**: `{ "username": "username" }`
- **Purpose**: Increments the `visitCount` inside the profile document and adds a visit log to `nfcVisits` (parsing client user-agents to record Device, OS, and Browser).

### 3. `POST /sendReverseContactEmail`
- **Body**:
  ```json
  {
    "cardOwnerUsername": "username",
    "cardOwnerName": "Owner Name",
    "visitorName": "John Doe",
    "visitorEmail": "john@doe.com",
    "visitorPhone": "+12345",
    "visitorCompany": "ACME Corp"
  }
  ```
- **Purpose**: Saves lead data into the `nfcLeads` Firestore collection and sends an SMTP email notification to the card owner containing the lead details and optional AI outreach fits.

---

## 5. Local Development & Testing Instructions

To simulate and test NFC profiles on your local machine:

1. **Verify your `.env` File**: Make sure `VITE_PAYMENT_API_BASE_URL` is set to the correct URL (e.g. your local Firebase emulator or the staging Cloud Functions).
2. **Start the Frontend**: Run `npm run dev` or `bun dev` to spin up the local server (typically at `http://localhost:8080`).
3. **Simulate Subdomain routing**: Append `?nfc=1` to test the NFC subdomain layout. E.g.:
   - View NFC Subdomain Landing: `http://localhost:8080/?nfc=1`
   - View Public NFC Profile: `http://localhost:8080/neetabasile?nfc=1`
4. **Inspect with script**: You can query current profiles using Node.js scripts using the service account credentials in the `/scripts` directory.
