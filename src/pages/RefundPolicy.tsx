import MainLayout from "@/layouts/MainLayout";
import { APP_CONFIG } from "@/config/constants";

const RefundPolicy = () => {
  return (
    <MainLayout>
      <div className="py-16">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>

          <div className="prose prose-lg">
            <p className="text-muted-foreground mb-6">
              Last updated: January 2026
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Refund Eligibility</h2>
            <p className="text-muted-foreground mb-4">
              We offer a 60-day money-back guarantee on all our products. If you're not satisfied
              with your purchase, you can request a full refund within 60 days of delivery.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. How to Request a Refund</h2>
            <p className="text-muted-foreground mb-4">
              To request a refund, please contact our support team at hello@pingme.in with your
              order number and reason for the refund. We'll process your request within 5-7 business days.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. Refund Process</h2>
            <p className="text-muted-foreground mb-4">
              Once approved, refunds will be credited to your original payment method within
              7-10 business days. You may be required to return the product in its original condition.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Non-Refundable Items</h2>
            <p className="text-muted-foreground mb-4">
              Custom-designed products and bulk orders may not be eligible for refunds.
              Please check with our support team before placing such orders.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Contact Us</h2>
            <p className="text-muted-foreground">
              For any refund-related queries, please reach out to us at {APP_CONFIG.SUPPORT_EMAIL} or
              call us at {APP_CONFIG.SUPPORT_PHONE}.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-border/60 bg-background/90 p-6">
            <h2 className="text-lg font-bold mb-3">Contact Us</h2>
            <address className="not-italic text-muted-foreground leading-7">
              <strong className="text-foreground">Ping IFF LLP</strong><br />
              745, First Floor,<br /> Rani Boutique<br />
              Kesho Ram Complex<br />
              Ram Electricals, Sector 45<br />
              Burail, Chandigarh<br />
              Chandigarh – 160047<br />
              India
              Phone: <a href="tel:+917347340007" className="hover:underline">+91 73473 40007</a><br />
              Email: <a href="mailto:contact@pingiff.ai" className="hover:underline">contact@pingiff.ai</a>
            </address>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RefundPolicy;