import React from "react";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <SmoothScroll>
      <Navbar />
      
      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight">
            Terms of Service
          </h1>
          
          <div className="prose prose-invert prose-neutral max-w-none">
            <p className="text-lg text-neutral-400 mb-8">
              Last updated: January 20, 2026
            </p>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Acceptance of Terms
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                By accessing and using the Since AI website and community services, you accept and agree to be 
                bound by these Terms of Service. Since AI is a registered non-profit organization (Since AI ry, Business ID: 3593920-2) 
                in Finland.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Community Guidelines
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                As a member of the Since AI community, you agree to:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li>Treat all community members with respect and professionalism</li>
                <li>Contribute constructively to discussions and events</li>
                <li>Respect intellectual property rights of others</li>
                <li>Not engage in harassment, discrimination, or harmful behavior</li>
                <li>Comply with Discord&apos;s Terms of Service and Community Guidelines</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Event Participation
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Participation in Since AI hackathons and events is subject to:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li>Registration and acceptance of event-specific rules</li>
                <li>Compliance with venue policies and local laws</li>
                <li>Respect for sponsors, partners, and organizers</li>
                <li>Agreement that projects created remain the intellectual property of participants</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Partnerships & Sponsorships
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Partnership and sponsorship agreements are subject to separate written contracts. 
                Inquiries submitted through our contact form do not constitute binding agreements.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Intellectual Property
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                The Since AI website, logo, and branding materials are the property of Since AI ry. 
                Content shared in our community by members remains the property of those members.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Disclaimer
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Since AI provides community services and events &ldquo;as is&rdquo; without warranties of any kind. 
                We are not responsible for interactions between community members, project outcomes, 
                or employment opportunities that may arise from participation.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Limitation of Liability
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                To the fullest extent permitted by Finnish law, Since AI ry shall not be 
                liable for any indirect, incidental, special, or consequential damages arising from your 
                use of our services.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Changes to Terms
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We reserve the right to modify these Terms of Service at any time. Continued use of our 
                services after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Governing Law
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                These Terms of Service are governed by the laws of Finland. Any disputes shall be 
                resolved in the courts of Turku, Finland.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Contact
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                For questions about these Terms of Service, please contact:
              </p>
              <p className="text-neutral-300 leading-relaxed">
                Email: <a href="mailto:info@sinceai.fi" className="text-white hover:text-neutral-300 transition-colors">info@sinceai.fi</a>
                <br />
                Organization: Since AI ry
                <br />
                Business ID: 3593920-2
                <br />
                Location: Turku, Finland
              </p>
            </section>
          </div>
        </div>

        <Footer discordUrl="https://discord.com/invite/YkqJswRGSW" />
      </main>
    </SmoothScroll>
  );
}
