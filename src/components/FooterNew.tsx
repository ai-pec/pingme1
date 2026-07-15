import { Link } from "react-router-dom";
import logo from "@/assets/ping-me-logo.png";
import type { MouseEvent } from "react";
import { Mail, Phone, MapPin, Linkedin, Instagram } from "lucide-react";

const MAIN_SITE = "https://plzpingme.com";
const isNfcSubdomain =
  typeof window !== "undefined" && window.location.hostname.startsWith("nfc.");

const mainSiteUrl = (path: string) => `${MAIN_SITE}${path}`;

const FooterNavLink = ({ item }: { item: { name: string; href: string } }) => {
  const className = "text-sm transition-all duration-300 relative group";
  const style = {
    color: "hsl(var(--ping-ash))",
    fontFamily: "'Poppins', sans-serif",
  };
  const content = (
    <span className="relative inline-block">
      {item.name}
      <span
        className="absolute bottom-0 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300 rounded"
        style={{ background: "hsl(var(--ping-yellow))" }}
      />
    </span>
  );

  return isNfcSubdomain ? (
    <a href={mainSiteUrl(item.href)} className={className} style={style}>
      {content}
    </a>
  ) : (
    <Link to={item.href} className={className} style={style}>
      {content}
    </Link>
  );
};

const FooterNew = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = {
    products: [
      { name: "Vehicle Tags", href: "/products/car-tags" },
      { name: "Lost & Found Tags", href: "/products/keychain-tags" },
      { name: "Pet Safety Tags", href: "/products/pet-tags" },
      { name: "NFC Smart Cards", href: "/products/nfc-cards" },
    ],
    company: [
      { name: "About Us", href: "/about" },
      { name: "Partners", href: "/partners" },
      { name: "Contact Us", href: "/contact" },
      { name: "Blog", href: "/blog" },
    ],
    legal: [
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Terms & Conditions", href: "/terms-conditions" },
      { name: "Refund Policy", href: "/refund-policy" },
      { name: "Pricing & Shipment", href: "/pricing-shipment" },
    ],
    support: [
      { name: "FAQ", href: "/faq" },
      { name: "Documentation", href: "/docs" },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: "https://instagram.com/plzping.me", label: "Instagram" },
    { icon: Linkedin, href: "https://www.linkedin.com/company/plzpingme", label: "LinkedIn" },
  ];

  return (
    <footer
      className="relative text-foreground"
      style={{ backgroundColor: "hsl(var(--ping-cream))", color: "hsl(var(--ping-dark))" }}
    >
      <div
        className="h-0.5 mb-6"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(var(--ping-yellow) / 10.5), transparent)",
        }}
      />

      <div className="container mx-auto px-4 py-8 md:py-10 lg:py-12">
        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8 mb-6 md:mb-10">

          {/* Brand Section */}
          <div className="lg:col-span-1 flex flex-col space-y-2.5">
            <div className="flex flex-col items-start space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="PingME"
                  className="h-10 w-auto sm:h-12 md:h-14 object-contain hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "hsl(var(--ping-ash))",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Privacy-first contact ecosystem for vehicles, belongings, and pets.
              </p>
            </div>

            {/* Contact Info */}
            <div
              className="flex flex-col space-y-3 pt-4"
              style={{ borderTop: "1px solid hsl(var(--ping-brown) / 0.15)" }}
            >
              <a
                href="tel:+917347340007"
                className="flex items-center gap-2 text-sm transition-all duration-300 group"
                style={{
                  color: "hsl(var(--ping-ash))",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <Phone className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span
                  style={{ color: "hsl(var(--ping-yellow))" }}
                  className="group-hover:underline"
                >
                  +91 73473 40007
                </span>
              </a>

              <a
                href="mailto:contact@pingiff.ai"
                className="flex items-center gap-2 text-sm transition-all duration-300 group"
                style={{
                  color: "hsl(var(--ping-ash))",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <Mail className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span
                  style={{ color: "hsl(var(--ping-yellow))" }}
                  className="group-hover:underline break-all"
                >
                  contact@pingiff.ai
                </span>
              </a>

              <div
                className="flex items-start gap-2 text-sm"
                style={{
                  color: "hsl(var(--ping-ash))",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  745, First Floor, Rani Boutique,<br />
                  Kesho Ram Complex, Near By Ram Electricals,<br />
                  Sector 45, Burail, Chandigarh - 160047, India
                </span>
              </div>
            </div>
          </div>

          {/* Link columns — 2-col grid on small, individual cols on md+ */}
          <div className="col-span-1 md:col-span-1 lg:col-span-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">

            {/* Products */}
            <div className="flex flex-col space-y-4">
              <h3
                className="text-xs font-black uppercase"
                style={{
                  color: "hsl(var(--ping-brown))",
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: "0.14em",
                }}
              >
                Products
              </h3>
              <nav className="flex flex-col space-y-2.5">
                {footerSections.products.map((item) => (
                  <FooterNavLink key={item.name} item={item} />
                ))}
              </nav>
            </div>

            {/* Company */}
            <div className="flex flex-col space-y-4">
              <h3
                className="text-xs font-black uppercase"
                style={{
                  color: "hsl(var(--ping-brown))",
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: "0.14em",
                }}
              >
                Company
              </h3>
              <nav className="flex flex-col space-y-2.5">
                {footerSections.company.map((item) => (
                  <FooterNavLink key={item.name} item={item} />
                ))}
              </nav>
            </div>

            {/* Legal */}
            <div className="flex flex-col space-y-4">
              <h3
                className="text-xs font-black uppercase"
                style={{
                  color: "hsl(var(--ping-brown))",
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: "0.14em",
                }}
              >
                Legal
              </h3>
              <nav className="flex flex-col space-y-2.5">
                {footerSections.legal.map((item) => (
                  <FooterNavLink key={item.name} item={item} />
                ))}
              </nav>
            </div>

            {/* Support */}
            <div className="flex flex-col space-y-4">
              <h3
                className="text-xs font-black uppercase"
                style={{
                  color: "hsl(var(--ping-brown))",
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: "0.14em",
                }}
              >
                Support
              </h3>
              <nav className="flex flex-col space-y-2.5">
                {footerSections.support.map((item) => (
                  <FooterNavLink key={item.name} item={item} />
                ))}
              </nav>
            </div>

          </div>
        </div>

        {/* PING ME — letters justified across full width */}
        <div className="mb-1 mt-[-30px] pt-4">
          <div
            className="flex justify-between items-baseline w-full"
            style={{
              fontFamily: "'Poppins', sans-serif",
              color: "hsl(var(--ping-dark))",
            }}
          >
            {["P", "I", "N", "G", "M", "E"].map((letter) => (
              <span
                key={letter}
                className="text-3xl md:text-4xl lg:text-5xl font-black"
                style={{ letterSpacing: "0", lineHeight: 1 }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>

        {/* DIVIDER */}
        <div
          className="h-0.5 mb-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--ping-yellow) / 10.5), transparent)",
          }}
        />

        {/* BOTTOM */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
          <div className="flex flex-col space-y-2 text-center md:text-left">
            <p
              className="text-sm"
              style={{
                color: "hsl(var(--ping-ash))",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {`© ${currentYear} `}
              <span
                style={{ color: "hsl(var(--ping-dark))" }}
                className="font-bold"
              >
                Ping IFF LLP
              </span>
              {". All rights reserved."}
            </p>
            <p
              className="text-xs sm:text-sm"
              style={{
                color: "hsl(var(--ping-ash) / 0.7)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              PingME is a privacy-first contact ecosystem powered by advanced NFC and QR technology.
            </p>
          </div>

          {/* Social Links + D&B DUNS Seal */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">

            {/* D&B DUNS Registered Seal */}
            <div
              style={{
                border: "1.5px solid hsl(var(--ping-brown) / 0.4)",
                borderRadius: "6px",
                overflow: "hidden",
                flexShrink: 0,
                lineHeight: 0,
              }}
            >
              <iframe
                style={{
                  width: "114px",
                  height: "97px",
                  border: "none",
                  display: "block",
                }}
                src="https://dunsregistered.dnb.com/SealAuthentication.aspx?Cid=1"
                frameBorder={0}
                scrolling="no"
                title="DnB Seal"
              />
            </div>

            {/* Social icons */}
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="transition-all duration-300 group hover:scale-110"
                style={{ color: "hsl(var(--ping-ash))" }}
              >
                <Icon
                  className="w-6 h-6 group-hover:scale-125 transition-transform"
                  onMouseEnter={(e: MouseEvent<SVGSVGElement>) => {
                    e.currentTarget.style.color = "hsl(var(--ping-yellow))";
                  }}
                  onMouseLeave={(e: MouseEvent<SVGSVGElement>) => {
                    e.currentTarget.style.color = "hsl(var(--ping-ash))";
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterNew;
