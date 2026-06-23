import MainLayout from "@/layouts/MainLayout";

const PrivacyPolicy = () => {
  return (
    <MainLayout>
      <div className="py-16">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

          <div className="prose prose-lg">
            <p className="text-muted-foreground mb-6">
              Last updated: January 2026
            </p>

            <p className="text-muted-foreground mb-8">
              At PingME, your privacy matters. This policy explains what personal
              information we collect, why we collect it, how we use it, how long
              we keep it, and how you can reach us with any concerns.
            </p>

            {/* 1. What data is collected */}
            <h2 className="text-2xl font-bold mt-8 mb-4">1. What Data We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect only the information you choose to provide to us. Depending
              on the services you use, this may include:
            </p>
            <ul className="text-muted-foreground mb-4 list-disc pl-6 space-y-1">
              <li><strong>Identity &amp; contact details</strong> — name, email address, phone number</li>
              <li><strong>Professional information</strong> — job title, company name</li>
              <li><strong>Profile media</strong> — profile photo</li>
              <li><strong>Online presence</strong> — social media links (LinkedIn, Instagram, Twitter, YouTube, Facebook), website URL</li>
              <li><strong>Location</strong> — address (only if you provide it)</li>
              <li><strong>Payment identifiers</strong> — UPI IDs or payment links (only if you choose to add them)</li>
              <li><strong>Portfolio content</strong> — documents or items you upload to your profile</li>
              <li><strong>Vehicle details</strong> — if you use our vehicle-registration features</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              We do not collect any information beyond what you explicitly enter or
              authorise. No data is collected passively without your knowledge.
            </p>

            {/* 2. Why it is collected */}
            <h2 className="text-2xl font-bold mt-8 mb-4">2. Why We Collect It</h2>
            <p className="text-muted-foreground mb-4">
              Your information is collected for the following purposes:
            </p>
            <ul className="text-muted-foreground mb-4 list-disc pl-6 space-y-1">
              <li>To create and manage your PingME account and profile</li>
              <li>To enable you to share your contact details and professional information with others</li>
              <li>To provide, operate, and improve our services</li>
              <li>To process transactions and send you relevant service notifications</li>
              <li>To respond to your support requests and enquiries</li>
              <li>To comply with applicable legal obligations</li>
            </ul>

            {/* 3. How it will be used */}
            <h2 className="text-2xl font-bold mt-8 mb-4">3. How Your Data Will Be Used</h2>
            <p className="text-muted-foreground mb-4">
              Your data is used solely to deliver the PingME service to you and the
              people you choose to share your profile with. Specifically:
            </p>
            <ul className="text-muted-foreground mb-4 list-disc pl-6 space-y-1">
              <li>Profile information is displayed on your public profile page, which is accessible to anyone you share your link or card with</li>
              <li>Contact and vehicle details are used to power our privacy-protected communication features — your personal phone number is <strong>never</strong> revealed directly to third parties</li>
              <li>Your data is <strong>not sold</strong> to advertisers or data brokers</li>
              <li>Your data is <strong>not used</strong> for targeted advertising</li>
              <li>Your data is <strong>not shared</strong> with any party outside PingME's service infrastructure, except where required by law</li>
            </ul>

            {/* 4. How long it is retained */}
            <h2 className="text-2xl font-bold mt-8 mb-4">4. How Long We Retain Your Data</h2>
            <p className="text-muted-foreground mb-4">
              We retain your personal data for as long as your account remains active
              or as needed to provide you with our services. If you request deletion
              of your account or personal data, we will remove or anonymise it within
              a reasonable timeframe.
            </p>
            <p className="text-muted-foreground mb-4">
              Some data may be retained beyond this period only where required by
              applicable law, regulatory obligations, or for legitimate business
              purposes such as fraud prevention, dispute resolution, or legal
              compliance.
            </p>

            {/* 5. Contact */}
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Privacy Concerns &amp; Contact</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions, concerns, or requests regarding your personal
              data or this Privacy Policy — including requests to access, correct, or
              delete your data — please contact us:
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/90 p-6">
            <h2 className="text-lg font-bold mb-3">Contact Us</h2>
            <address className="not-italic text-muted-foreground leading-7">
              <strong className="text-foreground">Ping IFF LLP</strong><br />
              745, First Floor, Rani Boutique<br />
              Kesho Ram Complex<br />
              Ram Electricals, Sector 45<br />
              Burail, Chandigarh<br />
              Chandigarh &ndash; 160047<br />
              India<br />
              Phone: <a href="tel:+917347340007" className="hover:underline">+91 73473 40007</a><br />
              Email: <a href="mailto:contact@pingiff.ai" className="hover:underline">contact@pingiff.ai</a>
            </address>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PrivacyPolicy;