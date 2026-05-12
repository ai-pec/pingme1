import { CreditCard, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SavedPayments() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Saved Payment Methods
        </CardTitle>
        <CardDescription>
          Manage your saved cards for faster checkout
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-xl bg-secondary/10">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium">Secure Payments</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            We use Razorpay for secure transactions. Your card details are
            encrypted and safely stored with Razorpay.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
