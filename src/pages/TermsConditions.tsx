import MainLayout from "@/layouts/MainLayout";

const TermsConditions = () => {
  return (
    <MainLayout>
      <div className="py-16">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Terms & Conditions</h1>
          
          <div className="prose prose-lg">
            <p className="text-muted-foreground mb-6">
              Last updated: January 2026
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing or using PingME services, you agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use our services.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Use of Services</h2>
            <p className="text-muted-foreground mb-4">
              Our services are intended for personal, non-commercial use. You agree not to misuse our 
              services or use them for any unlawful purposes.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. QR Code Usage</h2>
            <p className="text-muted-foreground mb-4">
              The QR codes provided are for personal use only. Unauthorized reproduction, modification, 
              or distribution of QR codes is prohibited.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              PingME shall not be liable for any indirect, incidental, special, or consequential damages 
              arising from your use of our services.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">6. Changes to Terms</h2>
            <p className="text-muted-foreground mb-4">
              We reserve the right to modify these terms at any time. Continued use of our services 
              after changes constitutes acceptance of the new terms.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms & Conditions, please contact us at hello@pingme.in.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TermsConditions;