/**
 * Event Wi-Fi — Since AI Hackathon 2026.
 *
 * BioCity and Joki: the event network and how to get its password (organiser,
 * 3 Nov 2026). The password itself never goes in this public repository.
 * EduCity: Turku UAS' own visitor network, TUAS Guest ("Register in a browser
 * with your email address", turkuamk.fi campuses page) and eduroam (Turku UAS
 * IT services page), both checked 25 Oct 2026.
 */

export const WIFI_ANCHOR = "wifi";

export const WIFI = {
  title: "Wi-Fi & Internet",
  answer: "Free Wi-Fi is available for hackathon participants at the event venues.",
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
    network: "Hackathon",
    password: "Available at check-in and in the Since AI participant app.",
    // Not yet load-tested for the expected numbers (organiser, 26 Oct 2026): no capacity claim until it is.
    text: "Network capacity is shared, so download what you need before you arrive.",
  },
  beforeArriving: [
    "Download your programming tools, dependencies, container images and AI models in advance.",
    "Bring your laptop, charger and any adapters you need.",
    "A personal mobile hotspot is a useful backup, if you have one.",
    "Network capacity is shared — avoid large downloads at peak times.",
    "Do not scan, attack or run unauthorised security tests on the venue networks.",
  ],
  problems: "If you experience connectivity issues, please contact our on-site support team.",
  links: [
    { label: "Turku UAS visitor Wi-Fi", href: "https://www.turkuamk.fi/en/about-us/campuses/" },
    { label: "eduroam setup", href: "https://www.turkuamk.fi/en/about-us/contact-us/it-services/" },
  ],
} as const;
