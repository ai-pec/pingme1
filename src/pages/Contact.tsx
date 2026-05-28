import { useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Copy, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { APP_CONFIG } from "@/config/constants";
import { sanitizeText } from "@/lib/prebookService";

// Input validation constants
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 1000;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SUPPORT_ADDRESS = "Ping IFF LPP, 745, Burail, Ekta Market, Burail Village, Sector 45, Chandigarh, 160047";

const buildGoogleMapsUrl = (address: string): string => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const buildTelUrl = (phone: string): string => {
  const normalizedPhone = phone.replace(/[^+\d]/g, "");
  return `tel:${normalizedPhone}`;
};

const buildGmailComposeUrl = (email: string): string => {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
};

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleCopyContactDetail = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} copied`,
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      console.error(`Failed to copy ${label.toLowerCase()}:`, error);
      toast({
        title: "Copy failed",
        description: `Unable to copy the ${label.toLowerCase()}.`,
        variant: "destructive",
      });
    }
  };

  const validateForm = (): boolean => {
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedMessage = formData.message.trim();

    // Name validation
    if (!trimmedName || trimmedName.length > MAX_NAME_LENGTH) {
      toast({
        title: "Invalid Name",
        description: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.`,
        variant: "destructive",
      });
      return false;
    }

    // Email validation
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > MAX_EMAIL_LENGTH) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return false;
    }

    // Phone validation (optional but if provided, must be valid)
    if (trimmedPhone && (trimmedPhone.length > MAX_PHONE_LENGTH || !/^[+\d\s()-]*$/.test(trimmedPhone))) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return false;
    }

    // Message validation
    if (!trimmedMessage || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Invalid Message",
        description: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submission
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Sanitize and save contact form data to Firebase Firestore
      await addDoc(collection(db, "contacts"), {
        name: sanitizeText(formData.name).substring(0, MAX_NAME_LENGTH),
        email: formData.email.trim().toLowerCase().substring(0, MAX_EMAIL_LENGTH),
        phone: sanitizeText(formData.phone).substring(0, MAX_PHONE_LENGTH),
        message: sanitizeText(formData.message).substring(0, MAX_MESSAGE_LENGTH),
        createdAt: serverTimestamp(),
        status: "new"
      });
      
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });
      
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      console.error("Error saving contact form:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="py-16">
        <div className="container">
          <p className="section-eyebrow">Contact Us</p>
          <h1 className="section-title text-4xl">
            We'd love to hear from you
          </h1>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
              <p className="text-muted-foreground mb-8">
                Have questions about PingME? Want to partner with us? 
                We're here to help.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <a
                    href={buildGoogleMapsUrl(SUPPORT_ADDRESS)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                    aria-label="Open address in Google Maps"
                  >
                    <MapPin className="w-6 h-6 text-primary-foreground" />
                  </a>
                  <div className="space-y-2">
                    <h3 className="font-bold mb-1">Address</h3>
                    <a
                      href={buildGoogleMapsUrl(SUPPORT_ADDRESS)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span>{SUPPORT_ADDRESS}</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <a
                    href={buildTelUrl(APP_CONFIG.SUPPORT_PHONE)}
                    className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                    aria-label={`Call ${APP_CONFIG.SUPPORT_PHONE}`}
                  >
                    <Phone className="w-6 h-6 text-primary-foreground" />
                  </a>
                  <div className="space-y-2">
                    <h3 className="font-bold mb-1">Phone</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={buildTelUrl(APP_CONFIG.SUPPORT_PHONE)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {APP_CONFIG.SUPPORT_PHONE}
                      </a>
                      
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <a
                    href={buildGmailComposeUrl(APP_CONFIG.SUPPORT_EMAIL)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                    aria-label={`Email ${APP_CONFIG.SUPPORT_EMAIL}`}
                  >
                    <Mail className="w-6 h-6 text-primary-foreground" />
                  </a>
                  <div className="space-y-2">
                    <h3 className="font-bold mb-1">Email</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={buildGmailComposeUrl(APP_CONFIG.SUPPORT_EMAIL)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {APP_CONFIG.SUPPORT_EMAIL}
                      </a>
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card rounded-2xl p-8 border border-border">
              <h2 className="text-xl font-bold mb-6">Send us a message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input-styled"
                    placeholder="Your name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input-styled"
                    placeholder="mohitshrrivastava@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input-styled"
                    placeholder="+91 98765XXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="form-input-styled resize-y min-h-[120px]"
                    placeholder="How can we help you?"
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Contact;