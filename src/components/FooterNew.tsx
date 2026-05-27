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
          <iframe style={{ width: '114px', height: '97px' ,border: '1px solid #ccc' ,marginLeft: '40px'}} src='https://dunsregistered.dnb.com/SealAuthentication.aspx?Cid=1' frameborder='0' scrolling='no' allowtransparency='true' ></iframe>
          

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link 
              to="/privacy-policy" 
              className="px-2 py-1 rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-yellow-400 hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/refund-policy" 
              className="px-2 py-1 rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-yellow-400 hover:underline"
            >
              Refund Policy
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/pricing-shipment" 
              className="px-2 py-1 rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-yellow-400 hover:underline"
            >
              Pricing & Shipment
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/terms-conditions" 
              className="px-2 py-1 rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-yellow-400 hover:underline"
            >
              Terms & Conditions
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link 
              to="/faq" 
              className="px-2 py-1 rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-yellow-400 hover:underline"
            >
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterNew;