# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Razorpay Payment Setup

This project now uses a secure Razorpay flow:

1. Frontend creates an order via Firebase Functions.
2. Razorpay Checkout collects payment.
3. Backend verifies payment signature.
4. Backend writes to Firestore collections:
	- `payments`
	- `prebookings`

### Frontend env (`.env`)

Set:

```sh
VITE_RAZORPAY_KEY_ID=rzp_test_your_public_key
VITE_PAYMENT_API_BASE_URL=https://asia-south1-your-project-id.cloudfunctions.net
```

### Backend secrets (`functions`)

For production deploys, use Firebase Secret Manager:

```sh
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set SMTP_FROM
```

For local emulator only, you can keep using `functions/.env`:

```sh
RAZORPAY_KEY_ID=rzp_test_your_public_key
RAZORPAY_KEY_SECRET=your_server_secret_key

# Order confirmation email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-app-password
SMTP_FROM=your-email@domain.com

# Order confirmation SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Order confirmation WhatsApp (Twilio)
# If TWILIO_WHATSAPP_FROM is set, backend sends WhatsApp first.
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Optional: use an approved WhatsApp template via Twilio Content API
TWILIO_WHATSAPP_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Important:

- Never expose `RAZORPAY_KEY_SECRET` in frontend env.
- If a secret was added to frontend by mistake, rotate it in Razorpay dashboard immediately.
- Keep SMTP and Twilio secrets only in backend env/secrets.

### NFC profile sync behavior

For NFC orders, the profile now syncs inside the same `pingmereg` Firestore project to collection `nfcProfiles` in these moments:

1. Pre-payment draft sync (right before Razorpay checkout opens).
2. Payment verification sync (confirmed payload).
3. Profile edits sync (from account profile order editor + Firestore update triggers).

The sync key is the Razorpay `orderId` when available, which keeps pre-payment and post-payment updates mapped to the same public profile record.

### Order confirmation notifications

When an admin changes a prebooking status from `pending` to `confirmed`, a Cloud Function now attempts to send:

1. Email to customer with order ID, items, and expected delivery date.
2. WhatsApp message to customer if configured; otherwise SMS fallback.

Expected delivery is calculated as current date + 5 days.

### Deploy functions

```sh
cd functions
npm install
firebase deploy --only functions
```

After deploy, use the returned functions URL as `VITE_PAYMENT_API_BASE_URL`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
