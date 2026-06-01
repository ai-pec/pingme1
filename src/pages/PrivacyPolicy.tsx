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

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect information you provide directly to us, such as when you create an account, 
              register a vehicle, or contact us for support. This may include your name, email address, 
              phone number, and vehicle details.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect to provide, maintain, and improve our services, 
              including to process transactions, send you alerts about your vehicles, and communicate with you.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. Privacy Protection</h2>
            <p className="text-muted-foreground mb-4">
              Your phone number is never shared with anyone who scans your QR code. All calls are 
              routed through our privacy-protected calling system, ensuring your personal information 
              remains confidential.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at hello@pingme.in.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PrivacyPolicy;