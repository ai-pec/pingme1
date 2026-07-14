import MainLayout from "@/layouts/MainLayout";
import { APP_CONFIG } from "@/config/constants";

const PricingShipment = () => {
  return (
    <MainLayout>
      <div className="py-16">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Pricing & Shipment</h1>

          <div className="prose prose-lg">
            <p className="text-muted-foreground mb-6">
              Last updated: January 2026
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Pricing</h2>

            <div className="bg-secondary rounded-xl p-6 mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-3">Standard Car Card</td>
                    <td className="text-right font-bold">₹499</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Pet Tag</td>
                    <td className="text-right font-bold">₹299</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">NFC Card</td>
                    <td className="text-right font-bold">₹599</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Lost and Found Sticker</td>
                    <td className="text-right font-bold">₹249</td>
                  </tr>
                  <tr>
                    <td className="py-3">Keychain Tag</td>
                    <td className="text-right font-bold">₹349</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Shipping Information</h2>
            <p className="text-muted-foreground mb-4">
              We offer free shipping across {APP_CONFIG.DEFAULT_COUNTRY} on all orders. Standard delivery takes
              5-7 business days, while express delivery (additional ₹50) takes 2-3 business days.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Order Tracking</h2>
            <p className="text-muted-foreground mb-4">
              Once your order is shipped, you'll receive a tracking number via SMS and email.
              You can track your order status on our website or through our delivery partner's portal.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Bulk Orders</h2>
            <p className="text-muted-foreground">
              For bulk orders (10+ items), please contact us at contact@pingiff.ai for special pricing
              and custom branding options.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-border/60 bg-background/90 p-6">
            <h2 className="text-lg font-bold mb-3">Contact Us</h2>
            <address className="not-italic text-muted-foreground leading-7">
              <strong className="text-foreground">Ping IFF LLP</strong><br />
              745, First Floor,<br /> Rani Boutique<br />
              Kesho Ram Complex<br />
              Near By Ram Electricals, Sector 45<br />
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

export default PricingShipment;