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
                    <td className="text-right font-bold">₹249</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Backpack Sticker</td>
                    <td className="text-right font-bold">₹199</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Pet Tag</td>
                    <td className="text-right font-bold">₹299</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">NFC Card</td>
                    <td className="text-right font-bold">₹399</td>
                  </tr>
                  <tr>
                    <td className="py-3">Keychain Tag</td>
                    <td className="text-right font-bold">₹179</td>
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
              For bulk orders (10+ items), please contact us at hello@pingme.in for special pricing 
              and custom branding options.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PricingShipment;