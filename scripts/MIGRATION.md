# Website → App project: orders unification runbook

Goal: the app project becomes the single Firebase project. Website orders move
into the shared, canonical `orders` collection. **No data is deleted** from
either project at any step.

## 0. Prerequisites (you provide)

- `scripts/serviceAccountKey.json` — SOURCE = website project (already present, `pingmereg`).
- `scripts/appServiceAccountKey.json` — TARGET = app project. Firebase Console →
  Project Settings → Service accounts → "Generate new private key".
- The app project's **web config** (apiKey, authDomain, projectId, storageBucket,
  messagingSenderId, appId) for `.env.local`.

## 1. Deploy Firestore rules to the app project

The `orders` rule + helpers are in [`firestore.rules`](../firestore.rules).
Point the Firebase CLI at the app project and deploy:

```bash
firebase use <app-project-id>
firebase deploy --only firestore:rules
```

(The app project's own collections — articles, vehicles, smartDoors, etc. — keep
their existing rules; we only add `orders`.)

## 2. Migrate website orders → app `orders`

```bash
cd scripts
npm install                              # firebase-admin
node migrate-orders-to-app.cjs           # DRY RUN — prints summary, writes nothing
node migrate-orders-to-app.cjs --commit  # performs the migration
```

What it does:
- Reads website `booking` + `prebookings`.
- Transforms each into the canonical nested order (`customer{}`, `delivery{}`,
  `amount{}`, `items[].productType`, `nfc{}`, `payment.status`), `source:"website"`.
- Resolves `customer.uid` by **phone** against the app's users/orders/articles,
  so the same person links to their existing app UID. Unmatched orders keep their
  original website UID and are flagged (`migration.uidMatchedByPhone = false`).
- Writes to `orders/web_<collection>_<sourceId>` — **idempotent** (safe to re-run).

Review the dry-run summary (matched vs unmatched) before `--commit`.

## 2b. Merge website users → app `users`

```bash
node merge-users-to-app.cjs            # DRY RUN
node merge-users-to-app.cjs --commit   # performs the merge
```

- **Matched by phone:** website profile data is attached under a namespaced
  `website` sub-object on the existing app user — it **never overwrites** any app
  field (fullName, email, medical info, roles).
- **Unmatched:** imported as a fresh `users/<websiteUid>` doc, flagged
  `migration.matchedByPhone:false`. These reconcile automatically when the person
  next logs into the app by phone (new app UID), or can be merged later.
- Idempotent; nothing deleted.

## 3. Re-point the website to the app project

Put the app project's web config in `.env.local` (see `.env.example` for keys),
then rebuild:

```bash
npm run build
```

The website now authenticates (phone OTP) and reads/writes orders against the app
project. Returning customers logging in by phone resolve to their existing app UID,
so identity unifies automatically going forward.

## 4. Still to do (tracked separately)

- **Confirm the app's primary phone field** — the merge scripts try
  `phone`/`mobile`/`phoneNumber`/`contact` on app `users`, plus `orders.customer`
  and `articles.owner`. If the app stores phone under a different key, tell me and
  I'll add it to `buildPhoneUidMap` to raise the match rate.
- **Cloud Functions / payment API** — `VITE_PAYMENT_API_BASE_URL` and the NFC-sync /
  Razorpay functions must also exist in the app project before cutover.
- Legacy website `booking`/`prebookings` stay untouched as a backup; delete only
  after you've verified the migrated `orders` in production.
```
