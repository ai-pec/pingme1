import React, { useEffect, useState } from 'react';
import MainLayout from "@/layouts/MainLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { subscribeToFAQs, FAQItem, DEFAULT_FAQS } from "@/lib/faqService";
import { Loader2 } from "lucide-react";

const FAQ = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToFAQs(
      (items) => {
        if (items.length > 0) {
          setFaqs(items);
        } else {
          // If empty in Firestore, map DEFAULT_FAQS to have temporary IDs
          const fallbackItems = DEFAULT_FAQS.map((item, idx) => ({
            id: `default-${idx}`,
            ...item,
          }));
          setFaqs(fallbackItems);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load FAQs", error);
        const fallbackItems = DEFAULT_FAQS.map((item, idx) => ({
          id: `default-${idx}`,
          ...item,
        }));
        setFaqs(fallbackItems);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.category || "General Questions";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <MainLayout>
      <div className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold mb-4">PingME - FAQ</h1>
            <p className="text-lg text-muted-foreground">Find answers to common questions about our smart parking and privacy solution.</p>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading FAQ database...</span>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedFaqs).map(([category, items]) => (
                <section key={category} className="space-y-4">
                  <h2 className="text-2xl font-semibold mb-2 text-primary border-b pb-2">{category}</h2>
                  <Accordion type="single" collapsible className="w-full">
                    {items.map((item) => (
                      <AccordionItem key={item.id} value={item.id}>
                        <AccordionTrigger className="text-left font-medium">{item.question}</AccordionTrigger>
                        <AccordionContent className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ))}

              <section className="mt-10 rounded-2xl border border-border/60 bg-background/90 p-6 md:p-8">
                <h2 className="text-xl font-bold mb-4">Still have questions?</h2>
                <p className="text-muted-foreground mb-4">Our team is happy to help. Reach out to us directly:</p>
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
              </section>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default FAQ;

