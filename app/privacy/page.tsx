import React from "react";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
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
              Last updated: May 23, 2026
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
                This website collects personal data in two ways:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li><strong className="text-white">Contact form</strong> — your name, email address, and message when you submit an inquiry</li>
                <li><strong className="text-white">Analytics</strong> — anonymous usage data (pages visited, time on site, general location) via Google Analytics, only with your consent</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                How We Use Your Information
              </h2>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li>Contact form submissions are used solely to respond to your inquiry</li>
                <li>Analytics data is used to understand how the site is used and improve it</li>
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
                We use Google Analytics to understand how visitors use our site and to measure the effectiveness
                of our advertising campaigns. We comply with Google Ads Consent Mode v2, which means our analytics
                script loads on every page. Until you consent, it operates in a cookieless mode that collects
                aggregated, de-identified data only. No personally identifiable information is collected.
              </p>
              <p className="text-neutral-300 leading-relaxed mb-4">
                When you click "Accept" in the cookie banner, we set cookies for analytics and advertising
                measurement. These cookies help us understand how visitors discover and use our site. You can
                withdraw your consent at any time using the button below — analytics and advertising cookies
                will stop being used, and the banner will reappear so you can review your choice.
              </p>
              <ManageCookies />
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Third-Party Services
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We use the following third-party services:
              </p>
              <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-4">
                <li><strong className="text-white">Google Analytics</strong> — website usage analytics and advertising measurement (consent required). Analytics data may be used to measure conversion events for Google Ads campaigns and to improve our marketing effectiveness.</li>
                <li><strong className="text-white">EmailJS</strong> — contact form delivery. When you submit our contact form, your name, email address, and message are processed by EmailJS to deliver your inquiry to our team</li>
              </ul>
              <p className="text-neutral-300 leading-relaxed mb-4">
                We do not sell your personal information or share it with third parties for their own marketing purposes.
                Your analytics data is shared with Google only for the purposes of analytics and advertising measurement
                as described above.
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

        <Footer discordUrl="https://discord.gg/vMWdrVUPws" />
      </main>
    </SmoothScroll>
  );
}
