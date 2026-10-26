/**
 * Event Wi-Fi — Since AI Hackathon 2026.
 *
 * EduCity: Turku UAS' own visitor network, TUAS Guest ("Register in a browser
 * with your email address", turkuamk.fi campuses page) and eduroam (Turku UAS
 * IT services page), both checked 25 Oct 2026. BioCity and Joki: the event
 * network is being prepared with the venue's network operator (organiser,
 * 26 Oct 2026) — no network name or login is published until it is confirmed.
 */

export const WIFI_ANCHOR = "wifi";

export const WIFI = {
  question: "Is free Wi-Fi available at the event?",
  answer: "Yes — free Wi-Fi is arranged for participants at the event venues. How you connect depends on the venue.",
  educity: {
    title: "EduCity",
    when: "Friday opening and Sunday finals",
    network: "TUAS Guest",
    steps: [
      "Open your device's Wi-Fi settings.",
      "Select TUAS Guest.",
      "Open your browser to reach the registration portal.",
      "Enter a valid email address, accept the network's acceptable use policy and connect.",
    ],
    eduroam:
      "Already use eduroam through your university or research institution? Connect with your existing institutional credentials.",
  },
  buildSpaces: {
    title: "BioCity & Visitor Center Joki",
    when: "The main build spaces",
    text: "Event Wi-Fi is being prepared with the venue's network operator, including more capacity for the number of developers expected over the weekend.",
    pending:
      "The network name and connection instructions will come from event staff and the official event channels once they are confirmed.",
  },
  beforeArriving: [
    "Download your programming tools, dependencies, container images and AI models in advance.",
    "Bring your laptop, charger and any adapters you need.",
    "A personal mobile hotspot is a useful backup, if you have one.",
    "Network capacity is shared — avoid large downloads at peak times.",
    "Do not scan, attack or run unauthorised security tests on the venue networks.",
  ],
  problems:
    "Ask an event volunteer or Since AI staff. They direct your issue to the right venue or technical support contact.",
  links: [
    { label: "Turku UAS visitor Wi-Fi", href: "https://www.turkuamk.fi/en/about-us/campuses/" },
    { label: "eduroam setup", href: "https://www.turkuamk.fi/en/about-us/contact-us/it-services/" },
  ],
} as const;
