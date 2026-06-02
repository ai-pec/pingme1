import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve(process.cwd(), "dist");
const templatePath = path.join(distDir, "index.html");

if (!fs.existsSync(templatePath)) {
  throw new Error("dist/index.html was not found. Run the Vite build before generating static HTML pages.");
}

const baseHtml = fs.readFileSync(templatePath, "utf8");

const siteNav = `
  <header class="border-b border-border/40 bg-background/95 backdrop-blur-md">
    <div class="container flex items-center justify-between py-4">
      <a href="/" class="font-bold tracking-tight text-foreground">PingME</a>
      <nav aria-label="Primary" class="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <a href="/">Home</a>
        <a href="/products">Products</a>
        <a href="/blog">Blog</a>
        <a href="/partners">Partners</a>
        <a href="/about">About Us</a>
        <a href="/contact">Contact Us</a>
      </nav>
    </div>
  </header>`;

const siteFooter = `
  <footer class="border-t border-border/40 bg-background py-8">
    <div class="container space-y-3 text-sm text-muted-foreground">
      <p>&copy; 2026 Ping IFF LLP. All rights reserved. PingME is a brand of Ping IFF LLP.</p>
      <address style="font-style:normal;">Ping IFF LLP, 745, Burail, Ekta Market, Burail Village, Sector 45, Chandigarh &ndash; 160047, India</address>
      <p>Phone: <a href="tel:+917347340007">+91 73473 40007</a> &nbsp;|&nbsp; Email: <a href="mailto:contact@pingiff.ai">contact@pingiff.ai</a></p>
      <nav style="display:flex;flex-wrap:wrap;gap:16px;margin-top:4px;">
        <a href="/blog">Blog</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/refund-policy">Refund Policy</a>
        <a href="/terms-conditions">Terms &amp; Conditions</a>
        <a href="/pricing-shipment">Pricing &amp; Shipment</a>
        <a href="/faq">FAQ</a>
        <a href="/contact">Contact Us</a>
      </nav>
    </div>
  </footer>`;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const pageShell = ({ title, description, content }) => {
  const htmlWithContent = baseHtml
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/s, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content=".*?" \/>/s, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content=".*?" \/>/s, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:title" content=".*?" \/>/s, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content=".*?" \/>/s, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<div id="root"><\/div>/s, `<div id="root">${siteNav}${content}${siteFooter}</div>`);

  return htmlWithContent;
};

const homeContent = `
  <main class="bg-cream">
    <section class="container py-12 md:py-16 space-y-8">
      <div class="max-w-4xl space-y-4">
        <p class="section-eyebrow">Privacy-first contact ecosystem</p>
        <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">Reach people, not their personal data.</h1>
        <p class="text-lg md:text-xl leading-8 text-muted-foreground">
          PingME connects people to vehicles, belongings, and pets through elegantly designed QR and NFC-enabled smart tags.
          It solves the real-world need for contact without exposing your phone number, identity, or unnecessary access.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <a href="/products">Get Your Tag</a>
        <a href="https://app.plzpingme.com">Register Your Tag</a>
      </div>

      <section>
        <h2 class="text-3xl font-bold tracking-tight text-foreground">What We Offer</h2>
        <p class="mt-3 text-muted-foreground">Built for the everyday moments where privacy matters most.</p>
        <ul class="mt-4 grid gap-3 md:grid-cols-2 text-muted-foreground">
          <li><strong>Vehicle Tags</strong> - Secure masked contact for parking issues, damage, and emergencies.</li>
          <li><strong>Lost & Found Tags</strong> - Help backpacks, laptops, keychains, and essentials find their way back faster.</li>
          <li><strong>Pet Safety Tags</strong> - Help anyone who finds your pet contact you instantly and safely.</li>
          <li><strong>NFC Smart Cards</strong> - Tap-enabled cards for quick, seamless, private information exchange.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-3xl font-bold tracking-tight text-foreground">Why PingME Is Different</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2 text-muted-foreground">
          <p><strong>Privacy First</strong> - Your phone number is never the public entry point.</p>
          <p><strong>Effortless Experience</strong> - No downloads or setup for the person reaching you.</p>
          <p><strong>Contextual Communication</strong> - Predefined alerts keep every interaction clear and purposeful.</p>
          <p><strong>Built for Scale</strong> - A platform shaped for everyday use across multiple product lines.</p>
        </div>
      </section>
    </section>
  </main>`;

const aboutContent = `
  <main>
    <section class="container py-16 max-w-5xl">
      <p class="section-eyebrow">About Us</p>
      <h1 class="text-4xl font-bold tracking-tight text-foreground">The story behind privacy-first vehicle contact</h1>
      <p class="mt-6 text-lg leading-8 text-muted-foreground">
        We started PingME because we saw a simple problem: how do you let someone contact you about your parked vehicle
        without giving away your phone number? Whether it is wrong parking, an emergency, or just someone trying to help,
        you should be reachable without compromising your privacy.
      </p>
      <p class="mt-4 text-lg leading-8 text-muted-foreground">
        Our solution is a beautifully designed QR code card that hangs on your vehicle. When scanned, it allows the person
        to send you predefined alerts or make a privacy-protected call, all without ever seeing your number.
      </p>
      <section class="mt-10 grid gap-4 md:grid-cols-2 text-muted-foreground">
        <p><strong>Our Mission</strong> - To create a world where vehicle owners can be contacted safely and privately.</p>
        <p><strong>Privacy First</strong> - Your phone number is never shared. All calls are masked and you control who can reach you.</p>
        <p><strong>Community Driven</strong> - Built with feedback from thousands of vehicle owners across 3+ cities in India.</p>
        <p><strong>Made in India</strong> - Proudly designed and manufactured in India, for Indian vehicle owners.</p>
      </section>
    </section>
  </main>`;

const productsContent = `
  <main>
    <section class="container py-16 max-w-5xl">
      <p class="section-eyebrow">Products</p>
      <h1 class="text-4xl font-bold tracking-tight text-foreground">Browse privacy-first QR and NFC products</h1>
      <p class="mt-6 text-lg leading-8 text-muted-foreground">
        Explore vehicle tags, lost and found stickers, pet safety tags, and NFC smart cards. Each product is designed to
        help people reach you without exposing your personal contact details.
      </p>
      <ul class="mt-6 grid gap-3 md:grid-cols-2 text-muted-foreground">
        <li>Vehicle Tags for parking and roadside contact.</li>
        <li>Lost & Found Tags for bags, laptops, and accessories.</li>
        <li>Pet Safety Tags for quick reunion when pets wander.</li>
        <li>NFC Smart Cards for tap-to-share contact experiences.</li>
      </ul>
      <p class="mt-6 text-muted-foreground">Use the product cards to view details, add to cart, or choose Buy Now for a direct checkout flow.</p>
    </section>
  </main>`;

const blogContent = `
  <main>
    <section class="container py-16 max-w-6xl space-y-10">
      <div class="space-y-4">
        <p class="section-eyebrow">Blog</p>
        <h1 class="text-4xl font-bold tracking-tight text-foreground">Smart tag stories, setup guides, and privacy-first ideas.</h1>
        <p class="max-w-3xl text-lg leading-8 text-muted-foreground">
          One blog page for everything we want to teach clearly: vehicle tags, pet tags, lost and found tags, door tags,
          privacy, and practical guides. No attribute categories, no extra pages, just a scalable content hub that is easy
          to browse and easy to index.
        </p>
      </div>
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <article class="rounded-3xl border border-border bg-card p-6">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Tag</p>
          <h2 class="mt-4 text-xl font-bold text-foreground">Vehicle Tags: The privacy-first way to reach a parked car owner</h2>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">A practical guide to why vehicle tags matter, what problems they solve, and how they keep contact private when someone needs to reach you.</p>
        </article>
        <article class="rounded-3xl border border-border bg-card p-6">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pet Tag</p>
          <h2 class="mt-4 text-xl font-bold text-foreground">Pet Tags that help lost pets get home faster</h2>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">How pet tags turn a moment of uncertainty into a safe return path with fast, private owner contact.</p>
        </article>
        <article class="rounded-3xl border border-border bg-card p-6">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lost and Found Tag</p>
          <h2 class="mt-4 text-xl font-bold text-foreground">Lost and Found Tags for bags, keys, and everyday essentials</h2>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">Best practices for tags that help people return lost items quickly while keeping owner information protected.</p>
        </article>
        <article class="rounded-3xl border border-border bg-card p-6">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Door Tag</p>
          <h2 class="mt-4 text-xl font-bold text-foreground">Door Tags that make home and office contact effortless</h2>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">A practical look at door tags for apartments, offices, and shared spaces where quick communication matters.</p>
        </article>
        <article class="rounded-3xl border border-border bg-card p-6">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Privacy</p>
          <h2 class="mt-4 text-xl font-bold text-foreground">Privacy by design: why PingME keeps contact protected by default</h2>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">Why privacy-first communication should be the default for every smart tag product, not an afterthought.</p>
        </article>
        <article class="rounded-3xl border border-border bg-card p-6">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Guides</p>
          <h2 class="mt-4 text-xl font-bold text-foreground">Guides that help customers set up tags the right way</h2>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">A scalable content approach for setup guides that helps customers activate, place, and use their tags correctly.</p>
        </article>
      </div>
    </section>
  </main>`;

const contactContent = `
  <main>
    <section class="container py-16 max-w-5xl">
      <p class="section-eyebrow">Contact Us</p>
      <h1 class="text-4xl font-bold tracking-tight text-foreground">We'd love to hear from you</h1>
      <p class="mt-6 text-lg leading-8 text-muted-foreground">Have questions about PingME? Want to partner with us? We're here to help.</p>
      <div class="mt-8 grid gap-6 md:grid-cols-3 text-muted-foreground">
        <div><strong>Address</strong><address style="font-style:normal;margin-top:4px;line-height:1.7;">Ping IFF LLP<br>745, Burail, Ekta Market,<br>Burail Village, Sector 45,<br>Chandigarh &ndash; 160047, India</address></div>
        <div><strong>Phone</strong><p>+91 91151 12345</p></div>
        <div><strong>Email</strong><p>hello@pingme.in</p></div>
      </div>
      <form class="mt-10 space-y-4">
        <label class="block"><span>Name</span><input class="mt-1 w-full border rounded-md p-3" type="text" placeholder="Your name" /></label>
        <label class="block"><span>Email</span><input class="mt-1 w-full border rounded-md p-3" type="email" placeholder="you@example.com" /></label>
        <label class="block"><span>Message</span><textarea class="mt-1 w-full border rounded-md p-3" rows="5" placeholder="How can we help?"></textarea></label>
      </form>
    </section>
  </main>`;

const partnersContent = `
  <main>
    <section class="container py-16 max-w-5xl">
      <p class="section-eyebrow">Partners</p>
      <h1 class="text-4xl font-bold tracking-tight text-foreground">Building safer experiences through strategic collaboration</h1>
      <p class="mt-6 text-lg leading-8 text-muted-foreground">
        PingME is proud to announce a pilot partnership with Pro Ultimate Gym Chain, our first collaborator. This program
        validates how privacy-first communication can improve member safety and day-to-day operations.
      </p>
      <ul class="mt-6 space-y-2 text-muted-foreground">
        <li>Pilot onboarding for Pro Ultimate locations</li>
        <li>Operational feedback loop between gym teams and PingME</li>
        <li>Measure notification response and issue resolution time</li>
        <li>Prepare a scalable partnership rollout model</li>
      </ul>
    </section>
  </main>`;

const faqContent = `
  <main>
    <section class="container py-16 max-w-5xl">
      <p class="section-eyebrow">FAQ</p>
      <h1 class="text-4xl font-bold tracking-tight text-foreground">PingME - FAQ</h1>
      <p class="mt-4 text-lg text-muted-foreground">Find answers to common questions about our smart parking and privacy solution.</p>
      <div class="mt-8 space-y-6 text-muted-foreground">
        <details open><summary class="font-semibold text-foreground">What is PingME?</summary><p class="mt-2">PingME is a smart parking and privacy solution that uses QR codes to facilitate communication between vehicle owners and others without revealing personal phone numbers.</p></details>
        <details><summary class="font-semibold text-foreground">How does the QR code work?</summary><p class="mt-2">Once you place a PingME sticker on your vehicle, anyone who needs you to move your car can simply scan the QR code and send a secure alert.</p></details>
        <details><summary class="font-semibold text-foreground">Is my personal information safe?</summary><p class="mt-2">Absolutely. The person scanning your QR code never sees your phone number or name. All communication is routed through our secure platform.</p></details>
      </div>
    </section>
  </main>`;

const policyContent = (title, intro, sections) => `
  <main>
    <section class="container py-16 max-w-4xl">
      <h1 class="text-4xl font-bold tracking-tight text-foreground">${escapeHtml(title)}</h1>
      <p class="mt-6 text-lg leading-8 text-muted-foreground">${escapeHtml(intro)}</p>
      <div class="mt-8 space-y-6 text-muted-foreground">${sections.map((section) => `<section><h2 class="text-2xl font-bold text-foreground">${escapeHtml(section.heading)}</h2><p class="mt-2 leading-8">${escapeHtml(section.body)}</p></section>`).join("")}</div>
    </section>
  </main>`;

const pricingContent = policyContent("Pricing & Shipment", "Clear information about product pricing, order handling, and delivery timelines.", [
  { heading: "Pricing", body: "All product pricing is shown on the product pages and may vary by design, finish, and product category." },
  { heading: "Shipment", body: "Orders are packed and shipped after payment confirmation. Delivery time depends on your location and the selected service." },
  { heading: "Support", body: "If you need help with shipping or order status, please contact the PingME support team." },
]);

const privacyContent = policyContent("Privacy Policy", "Last updated: January 2026", [
  { heading: "Information We Collect", body: "We collect information you provide directly to us, such as when you create an account, register a vehicle, or contact us for support." },
  { heading: "How We Use Your Information", body: "We use the information we collect to provide, maintain, and improve our services, including to process transactions and send alerts." },
  { heading: "Privacy Protection", body: "Your phone number is never shared with anyone who scans your QR code. All calls are routed through our privacy-protected calling system." },
]);

const refundContent = policyContent("Refund Policy", "Last updated: January 2026", [
  { heading: "Refund Eligibility", body: "We offer a 60-day money-back guarantee on all our products." },
  { heading: "How to Request a Refund", body: "To request a refund, please contact our support team with your order number and reason for the refund." },
  { heading: "Refund Process", body: "Once approved, refunds will be credited to your original payment method within 7-10 business days." },
]);

const termsContent = policyContent("Terms & Conditions", "These terms explain how you can use the PingME website and products.", [
  { heading: "Use of Service", body: "By using PingME, you agree to follow all applicable laws and to use the service only for legitimate purposes." },
  { heading: "Orders", body: "All orders are subject to availability, payment confirmation, and the terms shown at checkout." },
  { heading: "Account Responsibility", body: "You are responsible for maintaining accurate account information and safeguarding your login credentials." },
]);

const loginContent = `
  <main>
    <section class="container py-16 max-w-3xl">
      <h1 class="text-4xl font-bold tracking-tight text-foreground">Welcome back</h1>
      <p class="mt-4 text-lg text-muted-foreground">Sign in to your account to continue.</p>
      <form class="mt-8 space-y-4">
        <label class="block"><span>Email</span><input class="mt-1 w-full border rounded-md p-3" type="email" /></label>
        <label class="block"><span>Password</span><input class="mt-1 w-full border rounded-md p-3" type="password" /></label>
      </form>
    </section>
  </main>`;

const signupContent = `
  <main>
    <section class="container py-16 max-w-3xl">
      <h1 class="text-4xl font-bold tracking-tight text-foreground">Create an account</h1>
      <p class="mt-4 text-lg text-muted-foreground">Get started with PingME today.</p>
      <form class="mt-8 space-y-4">
        <label class="block"><span>Name</span><input class="mt-1 w-full border rounded-md p-3" type="text" /></label>
        <label class="block"><span>Email</span><input class="mt-1 w-full border rounded-md p-3" type="email" /></label>
      </form>
    </section>
  </main>`;

const simplePage = (heading, body) => `
  <main>
    <section class="container py-16 max-w-3xl">
      <h1 class="text-4xl font-bold tracking-tight text-foreground">${escapeHtml(heading)}</h1>
      <p class="mt-4 text-lg leading-8 text-muted-foreground">${body}</p>
    </section>
  </main>`;

const pages = [
  { route: "", file: "index.html", title: "PingME | Privacy-first contact ecosystem", description: "PingME NFC and QR products for private contact experiences.", content: homeContent },
  { route: "home", file: path.join("home", "index.html"), title: "PingME | Privacy-first contact ecosystem", description: "PingME NFC and QR products for private contact experiences.", content: homeContent },
  { route: "about", file: path.join("about", "index.html"), title: "About PingME", description: "The story behind privacy-first vehicle contact.", content: aboutContent },
  { route: "products", file: path.join("products", "index.html"), title: "PingME Products", description: "Browse privacy-first QR and NFC products.", content: productsContent },
  { route: "blog", file: path.join("blog", "index.html"), title: "PingME Blog", description: "Blog posts about vehicle tags, pet tags, lost and found tags, door tags, privacy, and guides.", content: blogContent },
  { route: "partners", file: path.join("partners", "index.html"), title: "PingME Partners", description: "PingME partnership program and pilot collaboration details.", content: partnersContent },
  { route: "contact", file: path.join("contact", "index.html"), title: "Contact PingME", description: "Get in touch with PingME.", content: contactContent },
  { route: "faq", file: path.join("faq", "index.html"), title: "PingME FAQ", description: "Answers to common PingME questions.", content: faqContent },
  { route: "privacy-policy", file: path.join("privacy-policy", "index.html"), title: "Privacy Policy | PingME", description: "PingME privacy policy.", content: privacyContent },
  { route: "refund-policy", file: path.join("refund-policy", "index.html"), title: "Refund Policy | PingME", description: "PingME refund policy.", content: refundContent },
  { route: "pricing-shipment", file: path.join("pricing-shipment", "index.html"), title: "Pricing & Shipment | PingME", description: "PingME pricing and shipment details.", content: pricingContent },
  { route: "terms-conditions", file: path.join("terms-conditions", "index.html"), title: "Terms & Conditions | PingME", description: "PingME terms and conditions.", content: termsContent },
  { route: "login", file: path.join("login", "index.html"), title: "Login | PingME", description: "Sign in to your PingME account.", content: loginContent },
  { route: "signup", file: path.join("signup", "index.html"), title: "Sign Up | PingME", description: "Create your PingME account.", content: signupContent },
  { route: "forgot-password", file: path.join("forgot-password", "index.html"), title: "Forgot Password | PingME", description: "Reset your PingME password.", content: simplePage("Forgot Password", "Enter your email address and we will send you a reset link.") },
  { route: "verify-email", file: path.join("verify-email", "index.html"), title: "Verify Email | PingME", description: "Verify your PingME email address.", content: simplePage("Verify Email", "Please verify your email address to continue using your account.") },
  { route: "complete-phone", file: path.join("complete-phone", "index.html"), title: "Complete Phone Setup | PingME", description: "Finish your phone setup for PingME.", content: simplePage("Complete Phone Setup", "Add and verify your phone number to finish account setup.") },
  { route: "prebook", file: path.join("prebook", "index.html"), title: "Checkout & Delivery Details | PingME", description: "Review checkout and delivery information.", content: simplePage("Checkout & Delivery Details", "Review your cart, delivery information, and payment details before completing the order.") },
  { route: "profile", file: path.join("profile", "index.html"), title: "Profile Settings | PingME", description: "Manage your PingME account settings.", content: simplePage("Profile Settings", "Manage your account information, delivery preferences, saved payments, and order history.") },
  { route: "admin", file: path.join("admin", "index.html"), title: "Admin Panel | PingME", description: "PingME admin dashboard.", content: simplePage("Admin Panel", "Manage products, categories, orders, and platform data from the admin dashboard.") },
  { route: "public-profile", file: path.join("public-profile", "index.html"), title: "Public NFC Profile | PingME", description: "Public NFC profile page.", content: simplePage("Public NFC Profile", "This page shows a public contact profile that can be shared with QR or NFC-enabled products.") },
  { route: "not-found", file: path.join("404", "index.html"), title: "404 | PingME", description: "Page not found.", content: simplePage("404", "The page you were looking for could not be found.") },
];

for (const page of pages) {
  const outputPath = path.join(distDir, page.file);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const html = pageShell({ title: page.title, description: page.description, content: page.content });
  fs.writeFileSync(outputPath, html, "utf8");
}
