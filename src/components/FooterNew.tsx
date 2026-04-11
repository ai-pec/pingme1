import { Link } from "react-router-dom";
import logo from "@/assets/ping-me-logo.png";

const FooterNew = () => {
  return (
    <footer className="bg-background border-t border-border-light py-3 mt-auto">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <img src={logo} alt="PingME" className="h-14 w-14 object-contain" />
            <p className="text-sm text-muted-foreground">
              © 2026 PingME. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link 
              to="/privacy-policy" 
              className="text-muted-foreground hover:text-primary-dark transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/refund-policy" 
              className="text-muted-foreground hover:text-primary-dark transition-colors"
            >
              Refund Policy
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/pricing-shipment" 
              className="text-muted-foreground hover:text-primary-dark transition-colors"
            >
              Pricing & Shipment
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/terms-conditions" 
              className="text-muted-foreground hover:text-primary-dark transition-colors"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterNew;