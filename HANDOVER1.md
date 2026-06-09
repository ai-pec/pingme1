# PingME — Complete Function Reference

> Every exported function, hook, component, and utility in the codebase. Organized by file.
> Use Ctrl+F to search by function name.

---

## 1. src/lib/authService.ts

All functions here wrap Firebase Authentication. Used exclusively by AuthContext.tsx.

### signUpWithEmail(email, password, displayName)

Creates a new Firebase Auth account, sets the display name on the user object, then sends a verification email. Returns Firebase UserCredential. Called by AuthContext signUp().

### signInWithEmail(email, password)

Signs in an existing user with email and password. Returns Firebase UserCredential. Called by AuthContext signIn().

### signInWithGoogle()

Opens a Google sign-in popup. If popup is blocked, automatically falls back to a full-page redirect. Returns UserCredential or null (when redirect is used). Called by AuthContext signInGoogle().

### logOut()

Signs the current user out of Firebase Auth. Called by AuthContext logout().

### sendPasswordReset(email)

Sends a Firebase password-reset email. Called by AuthContext resetPassword().

### resendVerificationEmail(user)

Resends the email verification link to the signed-in user. Called by AuthContext resendVerification().

### changeEmail(user, currentPassword, newEmail)

Re-authenticates the user with their current password (required by Firebase), updates the email address, then sends a verification email to the new address. Called by AuthContext changeUserEmail().

### getAuthErrorMessage(errorCode)

Maps Firebase Auth error codes like "auth/user-not-found" to human-readable UI messages. Called by every catch block in AuthContext.

---

## 2. src/lib/userService.ts

All Firestore reads/writes for the /users collection. Used exclusively by AuthContext.

### createUserProfile(uid, data)

Creates /users/{uid} in Firestore with name, email, mobile, photo URL, auth provider, and timestamps. Google users are marked emailVerified: true automatically. Called on first signup and first Google login.

### getUserProfile(uid)

Fetches /users/{uid} and returns a UserProfile object, or null if the doc doesn't exist. Called by AuthContext every time auth state changes.

### updateUserProfile(uid, data)

Updates specific fields on /users/{uid} — displayName, mobile, emailVerified, addresses. Always writes updatedAt. Called by AuthContext updateProfile().

### updateUserAddresses(uid, addresses)

Replaces the entire addresses array on /users/{uid}. Called by AuthContext updateAddresses().

### updateUserEmail(uid, newEmail)

Updates the email field and sets emailVerified: false to force re-verification. Called by AuthContext changeUserEmail().

### userProfileExists(uid)

Checks if /users/{uid} exists without reading its data. Returns boolean. Called by AuthContext signInGoogle() to decide whether to create a new profile.

### syncEmailVerification(uid, emailVerified)

Updates only the emailVerified field on /users/{uid} to match Firebase Auth. Called by AuthContext on every auth state change when the values differ.

---

## 3. src/lib/productService.ts

Firestore reads/writes for /products and /productCategories. Components never call Firestore directly — always use these functions.

### subscribeToProducts(onUpdate, onError)

Opens a real-time Firestore listener on the /products collection. Calls onUpdate with the full product array on every change. Returns an unsubscribe function — call it in useEffect cleanup. Used by Admin.tsx, Products.tsx, ProductDetail.tsx, LandingHero.tsx.

### getProducts()

One-time fetch of all /products documents. Returns DbProduct[]. Use when you need a snapshot, not real-time.

### saveProduct(product)

Creates or updates a product in /products. Generates a new Firestore ID if product.id is empty. Normalizes slug, image URL, emoji, and features before writing. Called by Admin.tsx handleSaveProduct() and handleCopyProduct().

### deleteProductDoc(id)

Deletes /products/{id}. Called by Admin.tsx handleDeleteProduct().

### uploadProductImage(file, rawCategorySlug?)

Uploads a file to Firebase Storage at products/{categorySlug}/{timestamp}_{filename} with 1-year cache headers. Returns the public download URL. Called by Admin.tsx handleImageUpload().

### saveProductCategory(rawSlugOrName, data)

Creates or merges a /productCategories/{slug} document. Normalizes the slug. Called when creating a new category from the Admin panel.

### subscribeToProductCategories(onUpdate, onError)

Real-time listener on /productCategories. Returns { [slug]: CategoryDoc } map on every change. Used by Admin.tsx, Products.tsx, ProductDetail.tsx.

### renameCategory(oldSlug, newNameOrSlug)

Creates a new category doc with the new slug. Batch-updates categorySlug on all products in the old category. Deletes the old category doc. If slugs are the same, only updates the display name.

### moveProductsToCategory(productIds, targetSlugRaw)

Batch-updates categorySlug on the given product IDs to the target slug.

### deleteCategory(slugRaw)

Moves all products in the category to "uncategorized", then deletes the category metadata doc. Throws if you try to delete "uncategorized".

---

## 4. src/lib/productCatalog.ts

Pure utility functions — no Firestore calls. Used everywhere for URL building, slug handling, and category display.

### normalizeCategorySlug(rawSlug)

Converts any string to a valid URL slug: lowercase, hyphens only, trimmed. "Car Tags!" becomes "car-tags". Used everywhere slugs are stored or compared — never store a raw slug without running it through this function first.

### categoryNameFromSlug(slug)

Converts a slug to a display name. "car-tags" becomes "Car Tags".

### buildProductImageUrl(fileNameOrPath)

Takes a Firebase Storage path like products/car-tags/image.png and builds the full public download URL using VITE_FIREBASE_STORAGE_BUCKET.

### resolveProductImageUrl(image?)

Smart resolver that handles full Firebase Storage URLs, relative paths, and data URIs. Always returns a canonical Firebase Storage URL where possible. Called wherever an image URL is read from Firestore or stored to cart.

### categoryDescriptionFromName(slug, name?)

Returns a hardcoded description for known category slugs. Falls back to a generic description for unknown ones.

### categoryGradientFromSlug(slug)

Deterministically picks a Tailwind gradient class for a category using a hash of its slug. Same slug always gets the same gradient.

### categoryIconFromProducts(products)

Finds the first product with an emoji and returns it. Falls back to the box emoji.

### categoryCoverImageFromProducts(products)

Finds the best cover image for a category — prefers popular products, then alphabetical order.

### startingPriceFromProducts(products)

Returns the lowest price string among all products in the array — e.g. "Rs.235".

### buildGenericCategoryTutorial(categoryName)

Returns a generic 4-step tutorial for any category that doesn't have a hardcoded entry in categoryTutorials.

---

## 5. src/lib/adminService.ts

Admin-only Firestore operations. Used exclusively by Admin.tsx.

### getAllOrders()

One-time fetch from both /booking and /prebookings. Merges, deduplicates by ID, sorts newest first. Returns PrebookingRecord[].

### subscribeToOrders(onUpdate, onError)

Two parallel real-time listeners on /booking and /prebookings. Waits for both to be ready before emitting merged results. Returns a single unsubscribe function that closes both listeners. Used in Admin.tsx Orders tab.

### deleteOrder(orderId)

Tries to delete from both /booking and /prebookings. Succeeds if at least one delete works.

### getAllUsers()

Fetches all /users documents ordered by createdAt descending. Returns UserProfile[].

### updateOrderStatus(orderId, status)

Updates the status field on the order in both /booking and /prebookings. Succeeds if at least one write works. Called by Admin.tsx handleStatusUpdate().

### subscribeToContactMessages(onUpdate, onError)

Real-time listener on /contacts ordered newest first. Calls onUpdate on every change. Used in Admin.tsx Messages tab.

### deleteContactMessage(messageId)

Deletes /contacts/{messageId}. Called by Admin.tsx handleDeleteMessage().

### markContactMessageRead(messageId)

Sets status: "read" on /contacts/{messageId}. Called silently when a message dialog is opened.

---

## 6. src/lib/adminAccess.ts

### canAccessAdminPanel()

Two-step admin check: (1) force-refreshes the Firebase ID token and checks for claims.admin === true, (2) if no claim, checks if /admins/{uid} exists. Returns true if either passes. Called by AdminRoute.tsx on every navigation to /admin.

---

## 7. src/lib/paymentService.ts

Handles Razorpay integration. All functions require a signed-in user.

### loadRazorpayCheckoutScript()

Dynamically adds the Razorpay SDK script tag. Does nothing if already loaded. Called automatically by openRazorpayCheckout().

### createRazorpayOrder(input)

Calls the Cloud Function POST /createOrder with amount, currency, receipt. Sends Firebase ID token. Returns { orderId, amount, currency, keyId }. Called by Prebook.tsx when user clicks Pay Now.

### verifyRazorpayPaymentAndCreatePrebooking(input)

Calls Cloud Function POST /verifyPayment with the Razorpay payment response plus full delivery and cart data. The function verifies the HMAC signature and writes the order to Firestore. Returns { success, prebookingId }. Called by Prebook.tsx inside the Razorpay handler callback.

### deleteNfcProfileDraft(profileId)

Calls Cloud Function POST /deleteNfcProfileDraft to remove a draft NFC profile.

### downloadReceipt(prebooking, invoiceEmail)

Builds invoice data, generates a PDF blob client-side, creates an object URL, triggers a browser file download. No server required. Called by Admin.tsx and Profile.tsx download buttons.

### openRazorpayCheckout(input)

Loads the SDK, creates a Razorpay instance with order details and prefill, opens the payment modal. Calls input.onSuccess on payment, input.onDismiss if modal is closed. Called by Prebook.tsx.

---

## 8. src/lib/prebookService.ts

Order creation in Firestore, input sanitization, NFC profile updates.

### sanitizeText(text)

Runs text through DOMPurify with all HTML tags stripped, then decodes remaining HTML entities. Prevents XSS in user-submitted data before Firestore writes. Called internally by all write functions in this file.

### createPrebooking(data)

Validates required delivery fields are present and cart is not empty. Sanitizes all text. Normalizes quantities (max 10 per item). Writes to /booking with a 10-second timeout. Returns the new document ID.

### getUserPrebookings()

Fetches order history from both /booking and /prebookings. Prefers userId query (more reliable than email since email can change). Falls back to email. Deduplicates and sorts newest first. Called by Profile.tsx OrderHistory.

### updatePrebookingNFCProfile(orderId, nfcProfile, profileId?, lineKey?)

Sanitizes the profile. Updates the order document in both collections. Handles single-card (sets nfcProfile) and multi-card orders (updates the specific lineKey in nfcLineProfiles). Then calls syncNfcProfileToPublicDomain(). Called by NFCProfileBuilder.tsx on save.

### syncNfcProfileToPublicDomain(profileId, nfcProfile, orderData?)

Calls Cloud Function POST /syncNfcProfileDraft to write the profile to the public collection that powers /:username pages. Called automatically after every updatePrebookingNFCProfile().

---

## 9. src/lib/faqService.ts

Firestore reads/writes for /faqs collection.

### subscribeToFAQs(onUpdate, onError)

Real-time listener on /faqs ordered by sortOrder ascending. Returns unsubscribe function. Used by Admin.tsx and FAQ.tsx.

### getFAQs()

One-time fetch of all FAQs ordered by sortOrder. Returns FAQItem[].

### saveFAQ(faq)

Creates or updates a FAQ doc. New items get createdAt. Existing items merge. Trims all text fields. Returns the doc ID. Called by Admin.tsx handleSaveFaq().

### deleteFAQ(id)

Deletes /faqs/{id}. Called by Admin.tsx handleDeleteFaq().

### initializeDefaultFAQs()

Checks if /faqs is empty. If empty, writes all 10 items from DEFAULT_FAQS in parallel. Does nothing if FAQs already exist. Called by Admin.tsx handleInitializeDefaultFaqs().

---

## 10. src/lib/publicNfcService.ts

Fetches public NFC profiles for the /:username scan page. No auth required.

### normalizeNfcUsername(rawUsername)

Trims and lowercases a username string.

### fetchPublicNfcProfile(username)

Checks in-memory cache (5-minute TTL). On cache miss, calls GET /getPublicNfcProfile?username=... from the Cloud Function. Validates the response shape, rejects draft profiles, caches the result. Throws "Profile not found." on 404. Called by PublicNFCProfile.tsx and checkUsernameUniqueness().

### isUsernameOwnedByProfileDoc(profileDocOrderId, owner?)

Checks whether a profile's orderId matches any IDs belonging to the current editor. Used to allow the owner to keep their existing username during edits without triggering a conflict error.

### checkUsernameUniqueness(username, owner?)

Calls fetchPublicNfcProfile() to see if the username is taken. Returns false (available) if not found or owned by the current user. Returns true (taken) if owned by someone else. Called by NFCProfileBuilder.tsx for real-time username validation.

### generateUsernameSuggestions(baseName)

Takes a name, normalizes it, tries 8 common suffixes ("", "123", "_nfc", etc.), returns the first 3 available ones. Falls back to numeric suffixes. Called by NFCProfileBuilder.tsx when a username is already taken.

---

## 11. src/lib/publicStatsService.ts

Manages the stats shown on the landing page and About page.

### getCachedPublicStats()

Reads stats from localStorage key pingme_public_stats_v1. Returns null if missing, corrupt, or older than 5 minutes. Used for instant display before network fetch.

### getPublicStats()

Returns cached stats if fresh. Otherwise calls GET /getPublicStats, parses, writes to cache, returns. Falls back to zeros on error.

### refreshPublicStats()

Always fetches fresh stats bypassing cache (uses cache: "no-store"). Writes to cache on success. Falls back to stale cache on error. Called by About.tsx and LandingHero.tsx after initial render.

---

## 12. src/lib/nfcCheckout.ts

Multi-card NFC order expansion logic.

### isNfcCartItem(item)

Returns true if the cart item ID starts with "nfc-". Identifies NFC products vs physical tags.

### expandNfcCartUnits(items)

Expands NFC cart items by quantity into individual units. A cart with 3x NFC cards becomes 3 units with keys nfc-cards__0, nfc-cards__1, nfc-cards__2. Each unit gets its own profile slot. Called by NFCProfileBuilder.tsx.

### resolveNfcProfileDocId(params)

Determines the Firestore doc ID for an NFC profile. Multi-card orders with stored line profiles use {orderId}_{lineKey}. Single-card orders use the payment order ID or booking ID.

### getOwnedNfcProfileDocIds(params)

Returns all possible doc IDs that could belong to an order's NFC profiles. Used for ownership checks during username uniqueness validation.

### isNfcLineProfileComplete(profile)

Checks that a profile has all 4 required fields: username, name, valid email (contains @), phone. Returns boolean. Used by NFCProfileBuilder.tsx to show completion status indicators.

### getNfcLineProfilesFromOrder(order)

Returns nfcLineProfiles array if it exists. Otherwise expands cart items and fills with the fallback nfcProfile. Called by NFCProfileBuilder.tsx to populate the editor.

---

## 13. src/lib/invoiceUtils.ts

Generates PDF invoices entirely client-side using raw PDF spec. No external PDF library needed.

### formatCurrency(value, currency, locale?)

Formats a number as a currency string using Intl.NumberFormat. 352 becomes "Rs.352.00".

### dynamicCurrencyFormatter(currency, locale?)

Returns a reusable formatter function pre-configured for a specific currency/locale.

### formatDate(value, locale?)

Parses an ISO date string and formats it as "29 May 2026" style.

### computeLineItem(item)

Calculates the total for an invoice line item as grossAmount minus discount.

### computeTotals(items)

Sums all line items to produce totalQuantity, totalAmount, totalTaxableValue, totalTaxes (always 0 - GST inclusive), and grandTotal.

### generateQrPdfStream(text, sizeInPts?)

Uses the qrcode npm package to generate a QR code matrix, then converts each module (black square) into a PDF rectangle command. Returns a raw PDF graphics stream ready to embed as an XObject. Called by buildInvoicePdfBlob().

### buildInvoicePdfBlob(invoice)

The main PDF generator. Generates the QR stream, lays out a full A4 invoice (header, company details, order info row, bill-to/ship-to, product table, totals, notes, footer, signatory). Assembles valid PDF binary with xref table. Returns a Blob for download. Called by paymentService.downloadReceipt().

### buildInvoiceDataFromPrebooking(prebooking, options?)

Transforms a raw order record into a fully structured InvoiceData object with company details, billing address, line items, and totals. This is the adapter between the order system and the PDF generator. Called by paymentService.downloadReceipt().

---

## 14. src/lib/installTrackingService.ts

### initInstallTracking()

Called once at app startup in main.tsx. Checks if the app is already running in standalone mode (installed PWA). Listens for the browser appinstalled event. On first install, calls Cloud Function POST /trackInstall with the install timestamp and user agent. Uses localStorage to prevent double-tracking.

---

## 15. src/lib/utils.ts

### cn(...inputs)

Merges Tailwind CSS classes safely. Uses clsx for conditionals and twMerge to resolve conflicts (e.g. px-2 px-4 resolves to px-4). Used everywhere classes are conditionally applied.

---

## 16. src/contexts/AuthContext.tsx

### AuthProvider()

The context provider component. Sets up Firebase onAuthStateChanged that runs on every auth state change: sets user, loads Firestore profile, syncs emailVerified if different, sets loading: false. Wraps all auth methods. Used in App.tsx to wrap the entire app.

### useAuth()

Returns the current auth context. Throws if called outside AuthProvider. Used in every component that needs the current user or auth actions.

Methods exposed through useAuth():

- signUp(email, password, displayName, mobile?) — Creates account, Firestore profile, sends verification email
- signIn(email, password) — Signs in with email/password
- signInGoogle() — Signs in with Google popup/redirect, creates Firestore profile if first time
- logout() — Signs out of Firebase Auth
- resetPassword(email) — Sends Firebase password reset email
- resendVerification() — Resends verification email to current user
- updateProfile(data) — Updates displayName/mobile in Firestore and local state
- updateAddresses(addresses) — Replaces addresses array in Firestore and local state
- changeUserEmail(currentPassword, newEmail) — Re-authenticates, changes email in Auth and Firestore
- refreshProfile() — Reloads Firebase user, re-fetches Firestore profile, syncs emailVerified
- clearError() — Clears the error message state

---

## 17. src/contexts/CartContext.tsx

### CartProvider()

Initializes cart state from localStorage on first render, resolving all image URLs. Persists cart to localStorage on every change. Used in App.tsx.

### useCart()

Returns the current cart context. Throws if called outside CartProvider. Used in Navbar.tsx, ProductDetail.tsx, Prebook.tsx.

Properties and methods exposed through useCart():

- items — Current array of CartItem objects
- addToCart(item) — Adds item; increments quantity if same ID exists
- removeFromCart(id) — Removes item by product ID
- updateQuantity(id, qty) — Updates quantity; removes item if qty <= 0
- clearCart() — Empties the cart completely
- cartCount — Total unit count (sum of all quantities)
- cartTotal — Total price in rupees (price x quantity, summed)

---

## 18. src/components/SmoothScroll.tsx

### SmoothScroll (component)

Initializes Lenis smooth scrolling on mount. Skips on prefers-reduced-motion or fewer than 3 CPU cores. Runs a requestAnimationFrame loop to drive Lenis. On every route change, immediately jumps to page top. Exposes Lenis as window.__lenis. Renders nothing. Used in App.tsx inside BrowserRouter.

### scrollToTop()

Exported utility function. Uses window.__lenis.scrollTo(0, immediate: true) if Lenis is active, otherwise falls back to window.scrollTo(0, 0). Called by Prebook.tsx on mount to fix the "scrolls to footer" issue caused by lazy loading.

---

## 19. src/pages/Admin.tsx — Handler Functions

These are internal event handlers inside the Admin component.

### handleEditProduct(product, categorySlug?)

Opens the Edit Product dialog. If product is null, initializes empty form for a new product. If product is existing, populates form with its values. Called by "Add to Category" button and product card edit icon.

### handleImageUpload(e)

Reads the selected file from the input event, calls uploadProductImage() to upload to Firebase Storage, updates editingProduct.image state with the returned URL. Called by file input in the product dialog.

### handleSaveProduct(e)

Prevents form default, normalizes price strings and category slug, filters empty features, calls saveProduct(). Closes dialog on success. Called by product edit form submit.

### handleCopyProduct(e)

Finds the source product by ID, creates a copy with id: "" (new Firestore doc) and the target category slug. Calls saveProduct(). Called by copy dialog form submit.

### handleDeleteProduct(id)

Shows browser confirm. On confirm, calls deleteProductDoc(id). Called by trash icon on product cards.

### handleDeleteCategory(slug)

Shows confirm dialog explaining products will move to Uncategorized. Calls deleteCategory(slug). Called by trash icon on accordion headers.

### handleStatusUpdate(orderId, status)

Calls updateOrderStatus(), then updates both the orders array and selectedOrder in local state for immediate UI feedback. Called by Confirm/Cancel buttons in the order table and dialog.

### handleViewOrder(order)

Sets selectedOrder inside startTransition to open the order detail dialog. Called by View button on order rows.

### handleOpenMessage(msg)

Sets selectedMessage to open the message dialog. If status is "new", silently calls markContactMessageRead() in the background. Called by clicking a message row.

### handleDeleteMessage(msgId)

Shows confirm dialog. Closes the dialog if the deleted message is currently open. Calls deleteContactMessage(). Called by trash icon and delete button in message dialog.

### handleEditFaq(faq)

If faq is null, initializes form for a new FAQ with default category. If existing, populates the form. Opens the FAQ dialog. Called by "Add FAQ Item" button and edit icon on rows.

### handleSaveFaq(e)

Calls saveFAQ() with form state. Closes dialog on success. Called by FAQ form submit.

### handleDeleteFaq(id)

Shows confirm. Calls deleteFAQ(id). Called by trash icon on FAQ rows.

### handleInitializeDefaultFaqs()

Shows confirm explaining defaults will be loaded. Calls initializeDefaultFAQs(). Only shown when FAQ collection is empty.

---

## 20. src/pages/Prebook.tsx — Handler Functions

### validate()

Validates all delivery form fields: required checks, 10-digit phone, 6-digit pincode, email format. Returns a FormErrors object. Empty object means no errors. Called before payment triggers.

### handleBlur(field)

Marks a field as touched so its validation error becomes visible when the user leaves the field.

### handleSubmit(e)

Validates form. On error, shows errors and scrolls to first error. On success, calls createRazorpayOrder() then openRazorpayCheckout().

### Razorpay onSuccess callback

Called when Razorpay payment succeeds. Calls verifyRazorpayPaymentAndCreatePrebooking() with delivery + payment data. On success, clears cart, stores order ID, shows the success screen.

### Razorpay onDismiss callback

Called when user closes Razorpay modal without paying. Shows a toast, navigates back to /booking.

---

## 21. src/pages/About.tsx — Helper Functions

### animateNumber(from, to, duration, onUpdate)

Smoothly animates a number from one value to another over a duration in milliseconds using requestAnimationFrame with ease-out quartic. Calls onUpdate every frame with the current value. Used by StatCard for count-up animations.

### useInView(threshold?)

Custom hook. Attaches an IntersectionObserver to a ref. Sets inView: true the first time the element enters the viewport. Disconnects after triggering once to avoid re-animations. Returns { ref, inView }. Used by every section on the About page.

### StatCard (component)

Displays a stat with count-up animation. When inView becomes true, starts animateNumber() with a configurable stagger delay.

### ValueCard (component)

Renders one "What We Stand For" card with icon, title, description. Fades and slides up based on inView and index for staggered animation.

### TimelineItem (component)

Renders one timeline entry (year, title, description) with connecting line. Slides in from left based on inView and index.

### Pill (component)

Floating badge pill in the hero section ("Instant Alert", "Number Hidden"). Absolutely positioned, pointer-events none.

---

## 22. src/pages/ProductDetail.tsx — Handler Functions

### ImageGallery (component)

Renders the product image with click-to-zoom (toggles scale). Shows thumbnails if multiple images. Tracks per-image imageFailed state to fall back to emoji.

### QtySelector (component)

Renders the +/- quantity control. Cannot go below 1. Calls onChange with the new value.

### RelatedProducts (component)

Shows up to 4 other products from the same category. Uses auto-fill CSS grid that adjusts column count to screen width.

### handleAddToCart()

Calls addToCart() from CartContext qty times. Triggers addedAnim state for 1800ms (button turns green). Shows toast with Checkout action. Called by Add to Cart button.

### handleBuyNow()

Clears cart, adds product at current quantity, navigates to /booking. Called by Buy Now button.

### handleShare()

Uses the Web Share API on mobile if available. Falls back to clipboard on desktop. Shows "Link Copied!" state for 2 seconds.

---

## 23. src/components/landing/LandingHero.tsx — Functions

### getBestSellingImage(products, categorySlug, fallback?)

Filters products to the given category, sorts by popular first then alphabetically, returns the first product's image URL. Falls back to the provided static asset.

### getOfferings(products, hasProductSnapshot)

Builds the 4 product offering cards (Vehicle Tags, Lost and Found, Pet Safety, NFC Cards). Calls getBestSellingImage() for each to populate real Firestore images. Falls back to static local assets if Firestore has not loaded yet.

### handleVideoToggle()

Toggles the demo video play/pause state on videoRef.current. Currently wired up but video UI is hidden in JSX — ready to re-enable.

### handleVolumeChange(event)

Adjusts video volume from a range input event. Sets isMuted: false if volume > 0.

### handleMuteToggle()

Toggles mute. If unmuting and volume is 0, resets volume to 80.

### IntersectionObserver effect (auto-play video)

Observes the video element. Auto-plays when 55% is visible in viewport. Pauses when scrolled out.

---

## 24. Firebase Cloud Functions — Complete Reference

All functions live in `functions/src/index.js`. They run on **Node.js 20** in the `asia-south1` region (Mumbai). The frontend calls them via `VITE_PAYMENT_API_BASE_URL`.

---

### Deploy Commands

```bash
# Run from the PROJECT ROOT (not the functions/ folder)

# Full deploy — hosting + functions + Firestore rules + Storage rules
firebase deploy

# Hosting only
firebase deploy --only hosting

# Functions only
firebase deploy --only functions

# Firestore + Storage rules only
npm run deploy:rules

# Run from inside the functions/ folder
cd functions
npm run deploy        # same as: firebase deploy --only functions
npm run serve         # starts local emulator for functions only
```

---

### Secrets (Firebase Secret Manager)

Functions use `defineSecret()` — secrets are stored in Google Cloud Secret Manager, NOT in `.env` files in production. To set them:

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set SMTP_FROM
```

For local development only, values can go in `functions/.env` (git-ignored).

| Secret                  | What it is                                    |
| ----------------------- | --------------------------------------------- |
| `RAZORPAY_KEY_ID`     | Razorpay public key ID (also in frontend env) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key — NEVER in frontend      |
| `SMTP_HOST`           | Email server hostname                         |
| `SMTP_PORT`           | Email server port (587 or 465)                |
| `SMTP_USER`           | Email login username                          |
| `SMTP_PASS`           | Email login password                          |
| `SMTP_FROM`           | From address for outgoing emails              |

---

### HTTP Functions (called by the frontend)

---

#### `createOrder` — POST

**URL:** `POST {VITE_PAYMENT_API_BASE_URL}/createOrder`
**Auth:** Firebase ID token (optional — allows guest checkout)
**What it does:** Creates a Razorpay order using the server-side Razorpay SDK. Returns `{ orderId, amount, currency, keyId }` to the frontend which uses it to open the Razorpay checkout modal.
**Body:** `{ amount (in paise), currency, receipt, notes? }`
**Called by:** `paymentService.createRazorpayOrder()`

---

#### `verifyPayment` — POST

**URL:** `POST {VITE_PAYMENT_API_BASE_URL}/verifyPayment`
**Auth:** Firebase ID token required
**What it does:**

1. Verifies the Razorpay HMAC signature using the secret key
2. Writes payment record to `/payments` collection
3. Writes the confirmed order to both `/booking` and `/prebookings` with `status: "confirmed"`
4. If the order has NFC profiles, syncs each one to `/nfcProfiles` collection
5. Sends a booking confirmation email with PDF invoice attached via SMTP
   **Returns:** `{ success: true, prebookingId }`
   **Called by:** `paymentService.verifyRazorpayPaymentAndCreatePrebooking()`

---

#### `syncNfcProfileDraft` — POST

**URL:** `POST {VITE_PAYMENT_API_BASE_URL}/syncNfcProfileDraft`
**Auth:** Firebase ID token required
**What it does:** Writes a draft NFC profile to `/nfcProfiles/{profileId}` with `status: "draft"`. Draft profiles are not shown on public `/:username` pages. Used when the user is setting up their profile before/after purchase.
**Body:** `{ profileId, nfcProfile }`
**Returns:** `{ success: true, username }`
**Called by:** `prebookService.syncNfcProfileToPublicDomain()`

---

#### `deleteNfcProfileDraft` — POST

**URL:** `POST {VITE_PAYMENT_API_BASE_URL}/deleteNfcProfileDraft`
**Auth:** Firebase ID token required
**What it does:** Deletes the `/nfcProfiles/{profileId}` document if it is a draft. Skips deletion if the profile has `status: "confirmed"` (protects live profiles from accidental deletion).
**Body:** `{ profileId }`
**Called by:** `paymentService.deleteNfcProfileDraft()`

---

#### `getPublicNfcProfile` — GET

**URL:** `GET {VITE_PAYMENT_API_BASE_URL}/getPublicNfcProfile?username={username}`
**Auth:** None — fully public
**What it does:** Queries `/nfcProfiles` where `username == {username}`. Returns only confirmed (non-draft) profiles. Returns 404 if not found or is still a draft.
**Returns:** `{ profile: PublicNfcProfile }`
**Called by:** `publicNfcService.fetchPublicNfcProfile()`

---

#### `getPublicStats` — GET

**URL:** `GET {VITE_PAYMENT_API_BASE_URL}/getPublicStats`
**Auth:** None — fully public
**What it does:** Counts documents in `/users` (happy customers), `/booking` where `status == "confirmed"` (vehicles protected), and `/installs` (PWA install count). Returns the counts as JSON.
**Returns:** `{ happyCustomers, vehiclesProtected, citiesCovered, googleRating, installCount }`
**Called by:** `publicStatsService.getPublicStats()` and `refreshPublicStats()`

---

#### `trackInstall` — POST

**URL:** `POST {VITE_PAYMENT_API_BASE_URL}/trackInstall`
**Auth:** Firebase ID token required
**What it does:** Writes a new document to `/installs` with `installedAt` timestamp and `userAgent`. Used to count PWA installs for the public stats.
**Body:** `{ installedAt, userAgent }`
**Called by:** `installTrackingService.initInstallTracking()` (fires once on PWA install)

---

### Firestore Trigger Functions (run automatically, not called by frontend)

---

#### `syncBookingNfcProfileToNfcCard`

**Trigger:** Any document update in `/booking/{bookingId}`
**What it does:** When a booking document is updated (e.g. user saves their NFC profile), automatically syncs any `nfcProfile` or `nfcLineProfiles` from the booking to the `/nfcProfiles` collection. This keeps the public-facing NFC profile in sync without requiring a separate API call.
**Region:** `asia-south1`

---

#### `syncLegacyPrebookingNfcProfileToNfcCard`

**Trigger:** Any document update in `/prebookings/{prebookingId}`
**What it does:** Identical to `syncBookingNfcProfileToNfcCard` but listens on the legacy `/prebookings` collection. Ensures old orders that were placed before the `/booking` collection existed still get their NFC profiles synced.
**Region:** `asia-south1`

---

### Internal Helper Functions (not exported — used only inside functions/src/index.js)

| Function                                       | What it does                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `authenticate(req)`                          | Verifies the Firebase ID token from the `Authorization: Bearer` header. Returns the decoded token or null.                            |
| `getRazorpayClient()`                        | Creates and returns a Razorpay SDK instance using the secret keys. Throws if keys are missing.                                          |
| `getMailTransporter()`                       | Creates and returns a Nodemailer SMTP transporter. Returns null if SMTP config is missing (email is skipped).                           |
| `sendBookingConfirmationEmail(...)`          | Builds a PDF invoice using `buildInvoicePdfBuffer()` and sends it as an email attachment to the customer.                             |
| `buildInvoicePdfBuffer(...)`                 | Generates a minimal PDF invoice as a Node.js Buffer using raw PDF spec (no library). Used for email attachments.                        |
| `syncProfileToNfcProfilesCollection(...)`    | Writes or merges a profile into `/nfcProfiles/{profileId}`. Called by verifyPayment, syncNfcProfileDraft, and the Firestore triggers. |
| `buildPublicNfcProfilePayload(...)`          | Sanitizes and shapes an NFC profile object into the exact format stored in `/nfcProfiles`.                                            |
| `isConfirmedNfcProfileRecord(data)`          | Returns true if a `/nfcProfiles` document is confirmed (not a draft). Used to filter out drafts from public profile lookups.          |
| `normalizeUsername(value)`                   | Trims and lowercases a username string.                                                                                                 |
| `sanitizeText(value)`                        | Trims a string value, returns empty string for non-strings.                                                                             |
| `getCount(collectionRef, queryConstraints?)` | Counts Firestore documents in a collection with optional where filters. Used by `getPublicStats`.                                     |
| `corsHandler`                                | CORS middleware configured to allow plzpingme.com, Firebase domains, and localhost. All functions go through this.                      |

---

### CORS Policy

The functions allow requests from:

- `plzpingme.com` and all `*.plzpingme.com` subdomains
- All `*.web.app` and `*.firebaseapp.com` domains
- `localhost` on any port (for local development)
- Private network IPs: `192.168.*`, `10.*`, `172.16-31.*`

If you add a new domain (e.g. a staging URL), add it to the `ALLOWED_ORIGINS` array in `functions/src/index.js` and redeploy functions.
