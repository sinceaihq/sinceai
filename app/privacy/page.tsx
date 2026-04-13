import React from "react";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { ManageCookies } from "@/components/ManageCookies";

export default function PrivacyPage() {
  return (
    <SmoothScroll>
      <Navbar />
      
      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight">
            Privacy Policy
          </h1>
          
          <div className="prose prose-invert prose-neutral max-w-none">
            <p className="text-lg text-neutral-400 mb-8">
              Last updated: April 13, 2026
            </p>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Introduction
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Since AI (Since AI ry, Business ID: 3593920-2) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and safeguard your personal information when you use 
                our website and services.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Information We Collect
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li>Name and email address when you contact us</li>
                <li>Company information for partnership inquiries</li>
                <li>Discord username when you join our community</li>
                <li>Professional information shared in our community</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                How We Use Your Information
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li>Respond to your inquiries and requests</li>
                <li>Send you updates about events and community activities</li>
                <li>Facilitate partnerships and sponsorships</li>
                <li>Improve our services and community experience</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Data Security
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Your Rights (GDPR)
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Under the General Data Protection Regulation (GDPR), you have the right to:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li>Access your personal data</li>
                <li>Rectify inaccurate personal data</li>
                <li>Request erasure of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Cookies &amp; Analytics
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We use Google Analytics to understand how visitors use our site. This service uses cookies
                to collect anonymous usage data such as pages visited, time on site, and general location
                (country/region). No personally identifiable information is collected through analytics.
              </p>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Analytics cookies are only placed after you give explicit consent via the cookie banner.
                You can withdraw your consent at any time using the button below — analytics will stop
                on your next page load.
              </p>
              <ManageCookies />
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Third-Party Services
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We use Discord for community management and Google Analytics for website analytics.
                Please review their respective privacy policies for information about how they handle
                your data. We do not share your personal information with third parties for marketing purposes.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Contact Us
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or wish to exercise your rights, 
                please contact us at:
              </p>
              <p className="text-neutral-300 leading-relaxed">
                Email: <a href="mailto:info@sinceai.fi" className="text-white hover:text-neutral-300 transition-colors">info@sinceai.fi</a>
                <br />
                Organization: Since AI ry
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
