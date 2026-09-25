"use client";

import { useCMS } from "@/components/cms-provider";
import { ContentPage } from "@/components/content-page";
import { ContactForm } from "@/components/contact-form";

export function DynamicContactContent() {
  const { config } = useCMS();
  const contact = config.contact;

  return (
    <ContentPage
      eyebrow={contact.eyebrow || "Human support"}
      title={contact.title || "Talk to Zucero"}
      intro={contact.intro || "Questions about products, orders, wholesale, or the launch are welcome."}
    >
      <div className="contact-grid">
        <aside className="contact-details">
          <p className="eyebrow">Email</p>
          <p>
            <a href={`mailto:${contact.supportEmail || "zucero.thegoodsugar@gmail.com"}`}>
              {contact.supportEmail || "zucero.thegoodsugar@gmail.com"}
            </a>
          </p>
          {contact.whatsappPhone && (
            <>
              <h3>WhatsApp</h3>
              <p>
                <a href={`https://wa.me/${contact.whatsappPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  {contact.whatsappPhone}
                </a>
              </p>
            </>
          )}
          <h3>Order support</h3>
          <p>Please include your order number and the email or mobile number used at checkout.</p>
          <h3>Response times</h3>
          <p>{contact.responseNote || "We aim to respond during Indian business hours. Launch periods may take a little longer."}</p>
          {contact.officeAddress && (
            <>
              <h3>Registered office</h3>
              <p>{contact.officeAddress}</p>
            </>
          )}
        </aside>
        <ContactForm />
      </div>
    </ContentPage>
  );
}
