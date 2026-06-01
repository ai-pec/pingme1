import React from 'react';
import MainLayout from "@/layouts/MainLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <MainLayout>
      <div className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold mb-4">PingME - FAQ</h1>
            <p className="text-lg text-muted-foreground">Find answers to common questions about our smart parking and privacy solution.</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">General Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left">What is PingME?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    PingME is a smart parking and privacy solution that uses QR codes to facilitate communication between vehicle owners and others without revealing personal phone numbers. It ensures your car is reachable when parked, while keeping your data secure.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left">How does the QR code work?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    Once you place a PingME sticker on your vehicle, anyone who needs you to move your car can simply scan the QR code. This opens a secure portal where they can send you a notification or call you via our encrypted system.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left">Why should I use PingME instead of leaving my phone number on the dashboard?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    Leaving your phone number in plain sight exposes you to unsolicited calls, scams, and privacy risks. PingME acts as a protective shield, allowing people to contact you only for vehicle-related matters while keeping your private number hidden.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">Privacy & Security</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-left">Is my personal information safe?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    Absolutely. The person scanning your QR code never sees your phone number or name. All communication is routed through our secure platform to maintain 100% anonymity.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-left">Is my location tracked when someone scans the code?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    No. The scan only triggers a notification to you. PingME does not share your real-time GPS coordinates with the person scanning the code.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-left">How does PingME handle spam scans?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    The interface is designed specifically for vehicle alerts. We use rate-limiting and reporting features to prevent misuse of the scanning system.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">Usage & Technical</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-7">
                  <AccordionTrigger className="text-left">Do I need a special app to scan the QR code?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    No. Any smartphone with a standard camera can scan the PingME sticker. Vehicle owners use the app to manage alerts, but the person scanning does not need to install anything.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-8">
                  <AccordionTrigger className="text-left">Can I link multiple family members to the same car?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    Yes. You can set up 'Secondary Contacts' so that if you don't respond to a scan, the system can automatically notify another person to ensure the vehicle is moved promptly.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-9">
                  <AccordionTrigger className="text-left">What if my QR sticker is damaged or stolen?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    You can instantly deactivate that specific QR code through your app and link a replacement sticker to your profile in seconds.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-10">
                  <AccordionTrigger className="text-left">Can I use PingME in basement parkings with no signal?</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    The person scanning needs a signal to send the alert. If you are in a dead zone, PingME will queue the notification and alert you the moment you reconnect to Wi-Fi or cellular data.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default FAQ;
