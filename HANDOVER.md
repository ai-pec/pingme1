# PingME Website — Full Handover Report

> **Purpose:** This document is the complete reference for anyone taking over, maintaining, or extending the PingME website. Read it end to end before touching any code.

**Company:** Ping IFF LLP  
**Product:** PingME — Privacy-first contact ecosystem  
**Contact:** contact@pingiff.ai | +91 73473 40007  
**Tech Stack:** React 18 + TypeScript + Vite + Firebase + Tailwind CSS + Razorpay  

---

## Table of Contents

1. [What Is PingME?](#1-what-is-pingme)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites & Local Setup](#3-prerequisites--local-setup)
4. [Environment Variables](#4-environment-variables)
5. [Project Structure — Full Annotated Map](#5-project-structure--full-annotated-map)
6. [Routing Map](#6-routing-map)
7. [How the App Is Wired Together](#7-how-the-app-is-wired-together)
8. [Firebase — Collections, Rules & Access](#8-firebase--collections-rules--access)
9. [Authentication System](#9-authentication-system)
10. [Cart & Checkout Flow](#10-cart--checkout-flow)
11. [Payment Flow (Razorpay)](#11-payment-flow-razorpay)
12. [NFC Profile System](#12-nfc-profile-system)
13. [Admin Panel](#13-admin-panel)
14. [Product Catalog System](#14-product-catalog-system)
15. [Cloud Functions (Backend)](#15-cloud-functions-backend)
16. [Key Shared Utilities & Services](#16-key-shared-utilities--services)
17. [UI Component System (shadcn/ui)](#17-ui-component-system-shadcnui)
18. [Deployment & CI](#18-deployment--ci)
19. [Common Tasks — How-To Guide](#19-common-tasks--how-to-guide)
20. [Known Patterns & Conventions](#20-known-patterns--conventions)
21. [Security Notes](#21-security-notes)
22. [Frequently Asked Developer Questions](#22-frequently-asked-developer-questions)

---

## 1. What Is PingME?

PingME sells QR and NFC-enabled smart tags for vehicles, bags, pets, and professional networking (NFC smart cards). The core value proposition:

- A stranger finds your car blocking their way, or your lost bag, or your stray pet
- They scan the PingME tag on it
- They can reach you instantly — **without ever seeing your real phone number**
- You get alerted via the platform and can respond safely

The website is a full-stack e-commerce + SaaS application:

| What it does | How |
|---|---|
| Sell physical products | Product catalog → cart → Razorpay payment |
| User accounts | Firebase Authentication + Firestore profiles |
| Post-purchase NFC setup | NFCProfileBuilder wizard → Firebase Functions |
| Public NFC profile pages | Public scan page at `/:username` |
| Admin operations | Admin panel at `/admin` |

---

## 2. Tech Stack

| Layer | Library / Service | Version | Why |
|---|---|---|---|
| Frontend | React | 18.3.1 | UI framework |
| Language | TypeScript | 5.8.3 | Type safety |
| Build tool | Vite | 7.x | Fast dev server and build |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| UI primitives | shadcn/ui + Radix UI | Latest | Accessible, unstyled components |
| Routing | React Router | v6.30 | Client-side routing |
| Forms | React Hook Form + Zod | 7.x + 3.x | Form state + validation |
| Database | Firebase Firestore | 12.x | Real-time NoSQL database |
| Auth | Firebase Authentication | 12.x | Email/password + Google OAuth |
| File storage | Firebase Storage | 12.x | Product images |
| Backend logic | Firebase Cloud Functions | (in `/functions`) | Payment processing |
| Payments | Razorpay | SDK via CDN | Indian payment gateway |
| Smooth scroll | Lenis | 1.3.x | Kinetic scrolling |
| HTTP queries | TanStack React Query | 5.x | Server state management |
| XSS protection | DOMPurify | 3.x | Sanitize user input before Firestore writes |
| Testing | Vitest + Testing Library | 3.x | Unit tests |
| Package manager | npm (or Bun) | — | `bun.lockb` present for Bun |

---

## 3. Prerequisites & Local Setup

### What you need installed
- **Node.js 18+** — check with `node -v`
- **npm** — comes with Node. Or install **Bun** for faster installs
- A **Firebase project** with these services enabled:
  - Authentication (Email/Password + Google providers)
  - Firestore Database
  - Storage
  - Functions (for payment)
- A **Razorpay account** — get test keys from [dashboard.razorpay.com](https://dashboard.razorpay.com)

### Step-by-step setup

```bash
# 1. Clone
git clone <repo-url>
cd <project-folder>

# 2. Install frontend dependencies
npm install
# or: bun install

# 3. Create environment file
cp .env.example .env
# Open .env and fill in all values (see Section 4)

# 4. Install Cloud Functions dependencies
cd functions
npm install
cp .env.example .env   # fill in RAZORPAY_KEY_SECRET and Firebase config
cd ..

# 5. Start dev server (frontend only)
npm run dev
# Opens at http://localhost:8080

# 6. Run tests
npm test
```

### Build & preview
```bash
npm run build      # creates dist/ folder + runs static HTML generator
npm run preview    # serves dist/ locally to check the production build
```

### Deploy Firestore security rules only
```bash
npm run deploy:rules
```

---

## 4. Environment Variables

All frontend variables are prefixed `VITE_` — Vite injects them at build time into the browser bundle.

**Create a `.env` file in the project root (never commit this file).**

```env
# ─── Firebase ──────────────────────────────────────────────────────────────
# Get all of these from: Firebase Console → Project Settings → General → Your Apps
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# ─── Razorpay ──────────────────────────────────────────────────────────────
# Get from: Razorpay Dashboard → Settings → API Keys
# Use rzp_test_... for development, rzp_live_... for production
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx

# ─── Firebase Cloud Functions ──────────────────────────────────────────────
# Get from: Firebase Console → Functions → copy the region base URL
# Format: https://<region>-<project-id>.cloudfunctions.net
VITE_PAYMENT_API_BASE_URL=https://asia-south1-your-project-id.cloudfunctions.net

# ─── Optional: Hero image ──────────────────────────────────────────────────
# Path in Firebase Storage to use as the landing page hero image
# Defaults to: products/hero_i.PNG
VITE_HERO_IMAGE_PATH=products/hero_i.PNG
```

### Functions environment (`functions/.env`)
```env
# These live in /functions/.env — NOT the root .env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key   # NEVER goes in the frontend

# Same Firebase values as above (Functions use Admin SDK)
FIREBASE_PROJECT_ID=your-project-id
```

**The Razorpay secret key must never be in the frontend.** Only in Cloud Functions.

---

## 5. Project Structure — Full Annotated Map

```
pingme-website/
│
├── .env                    ← Your local secrets (git-ignored)
├── .env.example            ← Template showing what keys are needed
├── .firebaserc             ← Firebase project alias config
├── firebase.json           ← Firebase hosting + functions deploy config
├── firestore.rules         ← Firestore security rules (edit here, then deploy)
├── storage.rules           ← Firebase Storage security rules
├── package.json            ← Frontend dependencies + scripts
├── vite.config.ts          ← Vite configuration
├── tailwind.config.ts      ← Tailwind config + custom design tokens
├── tsconfig.json           ← TypeScript config
│
├── public/                 ← Static assets served as-is
│   ├── favicon.ico
│   ├── site.webmanifest    ← PWA manifest
│   ├── robots.txt
│   └── firebase-image-sw.js ← Service worker for image caching
│
├── functions/              ← Firebase Cloud Functions (separate Node project)
│   ├── package.json        ← Functions dependencies (including Razorpay SDK)
│   ├── .env                ← Functions secrets (RAZORPAY_KEY_SECRET, etc.)
│   └── src/                ← Function source code
│       └── index.ts        ← createOrder, verifyPayment, syncNfcProfileDraft, etc.
│
└── src/                    ← All frontend source code
    │
    ├── main.tsx            ← Entry point — mounts <App /> into DOM
    ├── App.tsx             ← Root: providers, router, all <Route> definitions
    ├── App.css             ← Global CSS overrides
    ├── index.css           ← Tailwind directives + CSS custom properties (design tokens)
    │
    ├── assets/             ← Static images & videos bundled by Vite
    │   ├── ping-me-logo.png
    │   ├── product-card.png
    │   ├── pingprocard.jpeg
    │   └── IMG_9847.mp4    ← Hero demo video
    │
    ├── config/
    │   └── constants.ts    ← App-wide constants (support email, phone, country)
    │
    ├── types/
    │   └── user.ts         ← TypeScript interfaces: UserProfile, DeliveryAddress, SavedCard
    │
    ├── contexts/           ← React Context providers (global state)
    │   ├── AuthContext.tsx  ← Auth state: user, profile, signUp/signIn/logout, updateProfile
    │   └── CartContext.tsx  ← Cart state: items, add/remove/update, cartTotal (→ localStorage)
    │
    ├── hooks/
    │   ├── use-toast.ts    ← Toast notification hook (wraps Radix toast)
    │   └── use-mobile.tsx  ← Returns true if screen width < 768px
    │
    ├── layouts/
    │   └── MainLayout.tsx  ← Wraps every page: <Navbar> + {children} + <FooterNew>
    │
    ├── lib/                ← All data / service logic. Components never call Firebase directly.
    │   ├── firebase.ts          ← Firebase app init → exports: auth, db, storage
    │   ├── authService.ts       ← Firebase Auth wrappers (signUpWithEmail, signInWithGoogle, etc.)
    │   ├── userService.ts       ← Firestore CRUD for /users collection
    │   ├── productService.ts    ← Firestore real-time + CRUD for /products + /productCategories
    │   ├── productCatalog.ts    ← Slug normalization, image URL resolvers, static catalog helpers
    │   ├── adminService.ts      ← Admin-only: orders from /booking + /prebookings, contacts
    │   ├── adminAccess.ts       ← Checks if current user has admin access (claim or Firestore doc)
    │   ├── prebookService.ts    ← Creates orders in Firestore, sanitizes input (DOMPurify)
    │   ├── paymentService.ts    ← Razorpay: createOrder, verifyPayment, downloadReceipt
    │   ├── faqService.ts        ← Firestore CRUD for /faqs collection
    │   ├── publicNfcService.ts  ← Fetches public NFC profiles via Cloud Function (no auth)
    │   ├── publicStatsService.ts ← Cached public stats (customer count, vehicles protected)
    │   ├── nfcCheckout.ts       ← Expands NFC cart items into line profiles
    │   ├── blogContent.ts       ← Static blog post content (no CMS)
    │   ├── invoiceUtils.ts      ← Builds invoice PDF blob from order data
    │   ├── installTrackingService.ts ← Tracks PWA install events
    │   └── utils.ts             ← `cn()` — merges Tailwind classes safely
    │
    ├── pages/              ← One file per route
    │   ├── Landing.tsx          ← / (home page)
    │   ├── Products.tsx         ← /products and /products/:categorySlug
    │   ├── ProductDetail.tsx    ← /products/:categorySlug/:productId
    │   ├── Prebook.tsx          ← /booking (checkout page, payment)
    │   ├── Profile.tsx          ← /profile and /profile/:userId
    │   ├── Admin.tsx            ← /admin (admin panel)
    │   ├── About.tsx            ← /about
    │   ├── Blog.tsx             ← /blog
    │   ├── Contact.tsx          ← /contact
    │   ├── FAQ.tsx              ← /faq
    │   ├── Partners.tsx         ← /partners
    │   ├── PublicNFCProfile.tsx ← /:username (public scan landing page)
    │   ├── PricingShipment.tsx  ← /pricing-shipment
    │   ├── PrivacyPolicy.tsx    ← /privacy-policy
    │   ├── TermsConditions.tsx  ← /terms-conditions
    │   ├── RefundPolicy.tsx     ← /refund-policy
    │   ├── NotFound.tsx         ← 404 page
    │   └── auth/
    │       ├── Login.tsx             ← /login
    │       ├── Signup.tsx            ← /signup
    │       ├── ForgotPassword.tsx    ← /forgot-password
    │       ├── VerifyEmail.tsx       ← /verify-email
    │       └── CompletePhone.tsx     ← /complete-phone (Google sign-in phone step)
    │
    └── components/
        ├── Navbar.tsx           ← Top nav + cart drawer (Sheet) + user menu
        ├── FooterNew.tsx        ← Site footer with links, contacts, PINGME letters
        ├── SmoothScroll.tsx     ← Lenis smooth scroll + scroll-to-top on route change
        ├── NFCProfileBuilder.tsx ← Post-purchase NFC profile setup wizard
        ├── LandingReviews.tsx   ← Customer reviews section
        ├── Seo.tsx              ← <head> meta tags per page
        ├── DocsPage.tsx         ← Documentation page content
        ├── InvoiceTemplate.tsx  ← PDF invoice HTML layout
        ├── CartButton.tsx       ← Cart icon with item count badge
        │
        ├── landing/
        │   ├── LandingHero.tsx         ← Hero section, product cards, stats, reviews
        │   └── LandingDownloadSection.tsx ← App download CTA section
        │
        ├── auth/
        │   ├── ProtectedRoute.tsx  ← Redirects to /login if not signed in
        │   ├── AdminRoute.tsx      ← Redirects to / if not an admin
        │   ├── AuthLayout.tsx      ← Shared wrapper for auth pages
        │   ├── LoginForm.tsx
        │   ├── SignupForm.tsx
        │   ├── GoogleAuthButton.tsx
        │   └── ForgotPasswordForm.tsx
        │
        ├── profile/
        │   ├── PersonalInfoForm.tsx
        │   ├── AddressManagement.tsx
        │   ├── OrderHistory.tsx
        │   ├── EmailSettings.tsx
        │   ├── SavedPayments.tsx
        │   ├── NFCEditModal.tsx
        │   └── UserAvatar.tsx
        │
        └── ui/                 ← shadcn/ui components (DO NOT edit manually)
            └── button.tsx, card.tsx, dialog.tsx, input.tsx, table.tsx, ... (40+ files)
```

---

## 6. Routing Map

| URL Pattern | Component | Auth | Notes |
|---|---|---|---|
| `/` | `Landing.tsx` | No | Home page |
| `/products` | `Products.tsx` | No | All categories grid |
| `/products/:categorySlug` | `Products.tsx` | No | Single category product list |
| `/products/:categorySlug/:productId` | `ProductDetail.tsx` | No | Product detail + buy |
| `/booking` | `Prebook.tsx` | **Yes** | Checkout + Razorpay |
| `/profile` | `Profile.tsx` | **Yes** | Own profile |
| `/profile/:userId` | `Profile.tsx` | **Yes** | Admin can view any user |
| `/admin` | `Admin.tsx` | **Yes + Admin** | Admin panel |
| `/about` | `About.tsx` | No | |
| `/blog` | `Blog.tsx` | No | Static content from `blogContent.ts` |
| `/contact` | `Contact.tsx` | No | Writes to Firestore `contacts` |
| `/faq` | `FAQ.tsx` | No | Reads from Firestore `faqs` |
| `/partners` | `Partners.tsx` | No | |
| `/login` | `auth/Login.tsx` | No | Redirects home if already logged in |
| `/signup` | `auth/Signup.tsx` | No | |
| `/forgot-password` | `auth/ForgotPassword.tsx` | No | |
| `/verify-email` | `auth/VerifyEmail.tsx` | No | Gate until email confirmed |
| `/complete-phone` | `auth/CompletePhone.tsx` | **Yes** | Google users must add phone |
| `/privacy-policy` | `PrivacyPolicy.tsx` | No | |
| `/terms-conditions` | `TermsConditions.tsx` | No | |
| `/refund-policy` | `RefundPolicy.tsx` | No | |
| `/pricing-shipment` | `PricingShipment.tsx` | No | |
| `/docs` | `DocsPage.tsx` | No | |
| `/prebook` | Redirects → `/booking` | — | Legacy URL redirect |
| `/report` | Redirects → `/contact` | — | Legacy URL redirect |
| `/:username` | `PublicNFCProfile.tsx` | No | Public NFC scan page |

> **Note on `/:username`:** This catch-all route is last in the router. Any path that doesn't match a named route is treated as an NFC username lookup. If the username doesn't exist in the NFC system, the page shows a "not found" state.

---

## 7. How the App Is Wired Together

### Provider tree (App.tsx)
```
QueryClientProvider       ← TanStack React Query
  └── AuthProvider        ← AuthContext: user session
        └── CartProvider  ← CartContext: shopping cart
              └── TooltipProvider
                    └── BrowserRouter
                          └── SmoothScroll   ← Lenis + scroll-to-top on route change
                                └── Routes
                                      └── <all pages>
```

Every page is lazy-loaded via `React.lazy()` + `<Suspense>` with a full-screen spinner fallback. This means the first load of any page fetches only the code it needs.

### Layout pattern
Every page (except public NFC profile which has its own layout) is wrapped in `MainLayout`:
```tsx
<MainLayout>
  <Navbar />
  {/* page content */}
  <FooterNew />
</MainLayout>
```

### Data access pattern
Components **never** import from `firebase/firestore` directly. All Firestore access goes through service files in `src/lib/`:

```
Component
  → calls function from src/lib/someService.ts
    → talks to Firestore / Cloud Functions
```

This keeps data logic testable and isolated from UI.

---

## 8. Firebase — Collections, Rules & Access

### Firestore Collections

| Collection | Documents | Purpose | Read | Write |
|---|---|---|---|---|
| `users/{uid}` | One per user | Profile: name, email, phone, addresses | Owner or Admin | Owner (create/update) or Admin |
| `products/{productId}` | One per product | Product catalog | Public | Admin only |
| `productCategories/{slug}` | One per category | Category metadata: name, icon, description | Public | Admin only |
| `booking/{orderId}` | One per order | Orders placed via Razorpay (primary) | Owner or Admin | Owner (create) or Admin |
| `prebookings/{orderId}` | One per order | Legacy order collection — still in use | Owner or Admin | Owner (create) or Admin |
| `contacts/{contactId}` | One per submission | Contact form messages | Admin only | Anyone (strict field validation) |
| `faqs/{faqId}` | One per FAQ | FAQ items shown at /faq | Public | Signed-in users |
| `admins/{uid}` | One per admin | Admin access control list | Admin or self | Admin claim holders only |
| `adminAccess/panel` | Single doc | Admin panel access gate | Admin only | Never (write: false) |

> **Two order collections exist** (`booking` + `prebookings`) because the system was migrated. New orders go to `booking`. Legacy orders remain in `prebookings`. All admin queries and user order history queries **read from both** and merge the results.

### Admin Access
A user is an admin if **either** condition is true:
1. Their Firebase Auth ID token has the custom claim `admin: true` (set via Firebase Admin SDK / Cloud Functions)
2. A document exists at `admins/{uid}` in Firestore

The check happens in `src/lib/adminAccess.ts → canAccessAdminPanel()`. The `AdminRoute` component calls this on every navigation to `/admin`.

**To grant admin access to a new user**, create a document in Firestore at `admins/{the-user-uid}` with any content (e.g., `{ granted: true }`). No code change needed.

### Deploying rules
After editing `firestore.rules` or `storage.rules`:
```bash
npm run deploy:rules
# or full deploy:
firebase deploy --only firestore:rules,storage
```

---

## 9. Authentication System

### Sign-up flow (Email/Password)
```
SignupForm.tsx
  → AuthContext.signUp()
    → authService.signUpWithEmail()
      → Firebase: createUserWithEmailAndPassword()
      → Firebase: updateProfile() — sets displayName
      → Firebase: sendEmailVerification()
    → userService.createUserProfile() — creates /users/{uid} in Firestore
  → Redirect to /verify-email
```

### Email verification gate
`VerifyEmail.tsx` polls `user.emailVerified` every few seconds. Once Firebase marks it as verified, the user is redirected to the home page.

### Google sign-in flow
```
GoogleAuthButton.tsx
  → AuthContext.signInGoogle()
    → authService.signInWithGoogle() — tries popup, falls back to redirect
    → checks if /users/{uid} exists in Firestore
      → if not: creates profile with authProvider: "google"
    → checks if profile has mobile number
      → if not: redirects to /complete-phone
```

### Login flow
```
LoginForm.tsx
  → AuthContext.signIn()
    → authService.signInWithEmail()
  → AuthContext listener (onAuthStateChanged) fires
  → Loads /users/{uid} profile from Firestore
  → Redirect to location.state.from (the page they tried to visit) or "/"
```

### Auth state in components
Use the `useAuth()` hook anywhere inside `AuthProvider`:
```tsx
const { user, profile, loading, signIn, logout } = useAuth();
```
- `user` — Firebase `User` object (has `.uid`, `.email`, `.emailVerified`)
- `profile` — Firestore `UserProfile` object (has `.displayName`, `.mobile`, `.addresses`)
- `loading` — true while Firebase auth state is being resolved on first load

### Route protection
- `ProtectedRoute` — wraps any route that needs authentication. Redirects to `/login` if `user` is null. Saves current path in `location.state.from` so login can redirect back.
- `AdminRoute` — additionally calls `canAccessAdminPanel()`. Shows spinner while checking. Redirects to `/` if not admin.

---

## 10. Cart & Checkout Flow

### Cart (CartContext)
The cart lives in React state, **persisted to `localStorage`** under key `pingme_cart`.

```tsx
const { items, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal } = useCart();
```

| Property/Method | Description |
|---|---|
| `items` | Array of `CartItem` objects |
| `addToCart(item)` | Adds item; increments quantity if same ID already in cart |
| `removeFromCart(id)` | Removes item by product ID |
| `updateQuantity(id, qty)` | Updates quantity; removes if qty ≤ 0 |
| `clearCart()` | Empties cart (called after successful payment) |
| `cartCount` | Total number of individual items (sum of quantities) |
| `cartTotal` | Sum of (price × quantity) for all items, in rupees |

### Cart UI
The cart opens as a side drawer in `Navbar.tsx`. The "Proceed to Checkout" button:
- If user is not logged in → redirects to `/login` with `{ from: { pathname: "/booking" } }` state
- If user is logged in → navigates to `/booking`

### Checkout page (Prebook.tsx)
1. User fills delivery form: Full Name, Email, Phone, Address, City, State, Pincode
2. Validation runs with inline error messages on blur
3. On submit → triggers Razorpay (see Section 11)

---

## 11. Payment Flow (Razorpay)

This is the most critical flow. Understanding it fully is important.

```
User clicks "Pay ₹XXX Securely"
        │
        ▼
paymentService.createRazorpayOrder()
  → POST /createOrder (Firebase Cloud Function)
  → Sends: { amount, currency, receipt, notes }
  → Auth: Firebase ID token in Authorization header
  → Receives: { orderId, amount, currency, keyId }
        │
        ▼
paymentService.openRazorpayCheckout()
  → Loads Razorpay checkout.js SDK from CDN (if not already loaded)
  → Opens Razorpay modal with orderId + amount
  → User completes payment in Razorpay modal
        │
        ▼
Razorpay calls handler() with { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
paymentService.verifyRazorpayPaymentAndCreatePrebooking()
  → POST /verifyPayment (Firebase Cloud Function)
  → Sends: { orderId, paymentId, signature, prebooking: { all delivery + cart data } }
  → Cloud Function verifies HMAC signature using Razorpay secret
  → If valid: writes order to Firestore /booking collection
  → Returns: { success: true, prebookingId }
        │
        ▼
Frontend: cart is cleared, success screen shown
User can download PDF invoice (built client-side using invoiceUtils.ts)
```

**If payment is cancelled** → user is redirected back to `/booking` (cart still intact).  
**If verification fails** → error toast shown, user redirected to `/booking` to retry.

### Invoice / Receipt
Invoices are generated entirely client-side — no backend needed. `invoiceUtils.ts` builds invoice data from the order object. `InvoiceTemplate.tsx` renders it as HTML. The PDF is generated as a Blob and downloaded directly.

---

## 12. NFC Profile System

After purchasing an NFC card product, users can set up their public NFC profile.

### Profile setup (NFCProfileBuilder.tsx)
- Wizard with steps: basic info → contact details → social links → projects
- Lets user claim a unique username (e.g., `pingme.com/johndoe`)
- Username uniqueness is checked against the Cloud Function: `GET /getPublicNfcProfile?username=...`
- On save: `prebookService.updatePrebookingNFCProfile()` → calls `POST /syncNfcProfileDraft` Cloud Function
- The Cloud Function writes the profile to a separate public-facing collection

### Public profile page (PublicNFCProfile.tsx at `/:username`)
- Fetches profile via `publicNfcService.fetchPublicNfcProfile(username)`
- Calls `GET /getPublicNfcProfile?username=...` from Cloud Function
- Profiles are cached in memory for 5 minutes
- If the profile is a draft (not yet activated) or doesn't exist → shows "not found"

### Multiple NFC cards (line profiles)
If a user buys multiple NFC cards in one order, each card gets its own profile slot. `nfcCheckout.ts → expandNfcCartUnits()` expands cart items into individual "line profiles" keyed by `{itemId}__{lineIndex}`.

---

## 13. Admin Panel

The admin panel (`/admin`) has 4 tabs. Access requires admin status.

### Tab 1: Order History
- Reads from **both** `booking` and `prebookings` collections in real-time
- Search by order ID, customer name, phone, email, or product name
- Filter by status: pending / confirmed / cancelled
- Sort by newest, oldest, amount, or name
- Actions per order: View (dialog with full details), Confirm, Cancel
- Download receipt PDF per order

### Tab 2: Products
- Accordion view grouped by category
- Per category: rename, delete (moves products to Uncategorized), add product
- Per product: edit, copy to another category, move category, delete
- Product edit dialog: scrollable form with image upload to Firebase Storage

### Tab 3: Message Queries
- Real-time view of contact form submissions
- Search, view full message in dialog, delete
- New messages show a badge count on the tab

### Tab 4: FAQ Manager
- Full CRUD for FAQ items
- Load default FAQs button (only shown if FAQs collection is empty)
- Search by question, answer, or category

---

## 14. Product Catalog System

### How products are stored
Each product is a document in `/products` with these fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Firestore document ID |
| `categorySlug` | string | e.g. `"car-tags"`, `"pet-tags"` |
| `title` | string | Product display name |
| `price` | string | e.g. `"₹352"` |
| `originalPrice` | string? | Strike-through price e.g. `"₹599"` |
| `image` | string? | Firebase Storage URL or relative path |
| `emoji` | string? | Fallback emoji if no image |
| `popular` | boolean | Shows "Best Seller" badge |
| `features` | string[] | Bullet points shown on product detail |

### Category slugs
- Always lowercase, hyphen-separated: `car-tags`, `backpack-stickers`, `pet-tags`, `nfc-cards`
- Normalized via `normalizeCategorySlug()` in `productCatalog.ts`
- Category metadata (name, icon, description, cover image) is stored separately in `/productCategories/{slug}`

### Routing
- `/products` → shows all categories
- `/products/car-tags` → shows all products in `car-tags` category
- `/products/car-tags/some-product-id` → product detail page

---

## 15. Cloud Functions (Backend)

The `/functions` folder is a **separate Node.js project** from the frontend.

### Functions overview

| Function endpoint | Method | Purpose | Auth required |
|---|---|---|---|
| `/createOrder` | POST | Creates a Razorpay order | Firebase ID token |
| `/verifyPayment` | POST | Verifies Razorpay signature + saves order to Firestore | Firebase ID token |
| `/syncNfcProfileDraft` | POST | Saves NFC profile to public Firestore collection | Firebase ID token |
| `/getPublicNfcProfile` | GET | Returns a public NFC profile by username | None |
| `/deleteNfcProfileDraft` | POST | Deletes a draft NFC profile | Firebase ID token |

### Deploying functions
```bash
cd functions
npm install
firebase deploy --only functions --project <project-id>
```

### How the frontend authenticates with Functions
The frontend gets a Firebase ID token from `auth.currentUser.getIdToken()` and sends it as `Authorization: Bearer <token>` in the request header. The Cloud Function uses Firebase Admin SDK to verify the token.

---

## 16. Key Shared Utilities & Services

### `src/lib/utils.ts`
```ts
import { cn } from "@/lib/utils";
// Merges Tailwind classes, handles conflicts correctly
// e.g.: cn("px-4 py-2", conditional && "bg-red-500")
```

### `src/lib/productCatalog.ts`
- `normalizeCategorySlug(slug)` — converts any string to a valid slug
- `buildProductImageUrl(path)` — converts a Storage path to a full download URL
- `resolveProductImageUrl(url)` — handles both full URLs and Storage paths
- `categoryNameFromSlug(slug)` — converts slug to display name

### `src/config/constants.ts`
```ts
APP_CONFIG.SUPPORT_EMAIL    // "contact@pingiff.ai"
APP_CONFIG.SUPPORT_PHONE    // "+91 7347340007"
APP_CONFIG.DEFAULT_COUNTRY  // "India"
```

### `src/hooks/use-mobile.tsx`
```ts
const isMobile = useMobile(); // true if window width < 768px
```

### `src/components/SmoothScroll.tsx`
- Initializes Lenis smooth scrolling globally
- On every route change (`useLocation`) — scrolls to top
- Exports `scrollToTop()` utility for pages that need to trigger scroll-to-top after mount

---

## 17. UI Component System (shadcn/ui)

All UI primitives are in `src/components/ui/`. These are generated by shadcn/ui CLI and should **not be edited manually**.

To add a new shadcn component:
```bash
npx shadcn-ui@latest add <component-name>
# e.g.: npx shadcn-ui@latest add calendar
```

Design tokens (colors, border radius, etc.) are defined as CSS custom properties in `src/index.css`. The `tailwind.config.ts` maps them to Tailwind class names like `bg-primary`, `text-muted-foreground`, etc.

Custom colors for PingME branding:
- `--ping-yellow` — the signature yellow/gold
- `--ping-dark` — dark ink color
- `--ping-brown` — warm brown
- `--ping-ash` — grey text
- `bg-cream` — warm off-white background

---

## 18. Deployment & CI

### Firebase Hosting
The site is deployed on Firebase Hosting. Config is in `firebase.json`.

```bash
# Full deploy (hosting + functions + rules)
firebase deploy

# Hosting only
firebase deploy --only hosting

# Functions only  
firebase deploy --only functions

# Rules only
npm run deploy:rules
```

### Build output
`npm run build` runs two steps:
1. `vite build` — produces `dist/` with hashed filenames
2. `node scripts/generate-static-html.mjs` — generates static HTML for SEO / pre-rendering

### Custom domain
Configured in Firebase Hosting Console. DNS records point to Firebase's servers.

### `.firebase/` folder
Contains build cache for Firebase hosting. Safe to delete if deploying fails.

---

## 19. Common Tasks — How-To Guide

### Add a new product
1. Go to `/admin` → Products tab
2. If the category doesn't exist: click "Add Category" first
3. Click "Add to [Category Name]"
4. Fill in the form — upload an image or enter an emoji fallback
5. Save — product appears on the website immediately

### Change an order status
1. Go to `/admin` → Order History tab
2. Find the order (use search if needed)
3. Click Confirm or Cancel

### Add/edit FAQ items
1. Go to `/admin` → FAQ Manager tab
2. Click "Add FAQ Item" or the Edit icon on an existing FAQ
3. Fill in question, answer, category, sort order
4. Save — appears on `/faq` immediately

### Grant admin access to a new user
1. Get the user's Firebase UID (from Firebase Console → Authentication)
2. In Firebase Console → Firestore → `admins` collection
3. Create a new document with the UID as the document ID
4. Add any field e.g. `{ granted: true }`
5. User can now access `/admin`

### Add a new page
1. Create `src/pages/NewPage.tsx`
2. Add lazy import in `App.tsx`:
   ```tsx
   const NewPage = lazy(() => import("./pages/NewPage"));
   ```
3. Add route in `App.tsx`:
   ```tsx
   <Route path="/new-page" element={<NewPage />} />
   ```
4. Wrap in `<ProtectedRoute>` if login is required

### Add a new product category
From the Admin panel: Products tab → "Add Product Category" button.
Or directly in Firestore: add a document to `productCategories/{slug}` with fields `name`, `icon`, `description`.

### Update the hero image on the landing page
1. Upload the new image to Firebase Storage at path `products/hero_i.PNG` (or any path)
2. Update `VITE_HERO_IMAGE_PATH` in your `.env` to point to the new path
3. Rebuild and redeploy

### Change support contact details
Edit `src/config/constants.ts` — update `SUPPORT_EMAIL` or `SUPPORT_PHONE`. These are used throughout the codebase.

---

## 20. Known Patterns & Conventions

### Real-time data subscriptions
All real-time Firestore data uses `onSnapshot`. The pattern is:
```tsx
useEffect(() => {
  const unsubscribe = subscribeToSomething(
    (data) => setData(data),
    (error) => console.error(error)
  );
  return unsubscribe; // cleanup on unmount
}, []);
```

### Price format
Prices are stored as strings like `"₹352"`. Never stored as numbers.  
To get the numeric value: `parseFloat(price.replace(/[^\d.]/g, ""))`  
To normalize user input: `normalizePriceInput(rawValue)` in `Admin.tsx`

### Category slugs
Always go through `normalizeCategorySlug()` before storing or comparing:
```ts
// ✅ correct
const slug = normalizeCategorySlug(userInput); // "Car Tags" → "car-tags"

// ❌ wrong — never store raw user input as slug
const slug = userInput.toLowerCase();
```

### Tailwind class merging
Never concatenate Tailwind classes with string interpolation. Use `cn()`:
```tsx
// ✅ correct
className={cn("px-4 py-2", isActive && "bg-primary")}

// ❌ wrong — can produce conflicting classes
className={`px-4 py-2 ${isActive ? "bg-primary" : ""}`}
```

### Input sanitization
All user input that gets written to Firestore goes through `sanitizeText()` from `prebookService.ts`. This uses DOMPurify to strip HTML/XSS. Always sanitize before writing untrusted content.

### Inline styles vs Tailwind
Most pages use Tailwind classes. `ProductDetail.tsx` and `Products.tsx` use a pattern of CSS-in-JS via `<style>` tags with class names (e.g. `.pm-detail-layout`) for complex responsive layouts and animations that Tailwind can't express easily. This is intentional — don't refactor it out without a plan.

### `shadcn/ui` components
Files in `src/components/ui/` are auto-generated. Don't edit them. To customize, override at the usage site or extend via Tailwind config.

---

## 21. Security Notes

| Topic | What's in place |
|---|---|
| XSS in Firestore writes | DOMPurify sanitizes all user input before write in `prebookService.ts` |
| Firestore rules | `firestore.rules` enforces access at the database level — frontend rules are a secondary defense |
| Admin access | Double-checked: Firestore rules + `AdminRoute` component + `canAccessAdminPanel()` |
| Payment secrets | Razorpay secret key is only in Cloud Functions env (`functions/.env`), never in frontend |
| Firebase ID tokens | All authenticated Cloud Function calls verify Firebase ID tokens server-side |
| Price manipulation | Payment amount is calculated server-side in Cloud Function from cart contents, not trusted from client |
| Contact form spam | Firestore rules validate all contact form fields (length, format, required fields) before accepting writes |
| Environment secrets | `.env` is git-ignored. Only `.env.example` (no real values) is committed |

---

## 22. Frequently Asked Developer Questions

**Q: Why are there two order collections — `booking` and `prebookings`?**  
A: The system was originally called "prebookings". It was later renamed to "booking". Both collections are still read from for backward compatibility with old orders. New orders go to `booking`.

**Q: Why does the checkout page scroll to the bottom on first load?**  
A: This was a bug caused by Lenis smooth scroll firing before the lazy-loaded page finished rendering. It's fixed — `Prebook.tsx` calls `scrollToTop()` on mount, which fires after the component is painted.

**Q: How does the `/:username` route not conflict with real routes like `/about`?**  
A: In `App.tsx`, the `/:username` route is defined last. React Router v6 matches routes in order, so `/about`, `/blog`, etc. are matched first. `/:username` only catches paths that didn't match anything else.

**Q: How do I find which Cloud Function handles a specific API call?**  
A: All Cloud Function calls go through `VITE_PAYMENT_API_BASE_URL`. The path after the base URL (e.g. `/createOrder`, `/syncNfcProfileDraft`) maps directly to a function name or endpoint in `functions/src/index.ts`.

**Q: The product image isn't showing — how do I debug?**  
A: Check `resolveProductImageUrl()` in `productCatalog.ts`. Images can be either a full `https://` Firebase Storage URL or a relative path like `products/car-tags/image.jpg`. The function handles both. Make sure Storage rules allow public read access.

**Q: How do I add a new field to the UserProfile?**  
A: Update `src/types/user.ts`, update `userService.ts` to read/write the field, and update the Firestore Security Rules if the field needs access control. Existing user documents won't have the field — handle `undefined` in your code.

**Q: Can I run this without Firebase Functions (payments)?**  
A: The product catalog, auth, and admin panel work without Functions. Payment checkout will fail. You'll see an error: "Payment API is not configured." You can test everything except checkout without Functions deployed.

**Q: Where does the blog content come from? Is there a CMS?**  
A: No CMS. Blog post content is hard-coded in `src/lib/blogContent.ts` as a TypeScript array. To add a post, edit that file and redeploy.
