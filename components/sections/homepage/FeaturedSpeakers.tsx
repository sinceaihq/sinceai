"use client";
import React from "react";
import Image from "next/image";
import { Linkedin, Twitter, Github, Youtube } from "lucide-react";

interface Talk {
  type: "Keynote" | "Tech Talk";
  title: string;
  description: string;
}

interface Speaker {
  name: string;
  title: string;
  company: string;
  companyLogo?: string;
  bio: string;
  image: string;
  talks: Talk[];
  socials: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    youtube?: string;
    discord?: string;
  };
}

const speakers: Speaker[] = [
  {
    name: "Jason Mayes",
    title: "Web AI Lead",
    company: "Google",
    companyLogo: "/assets/speakers/Logo.png",
    bio: "Google's Web AI lead for client side AI with 15+ years at the company. Creator of the world's first Web AI Summit and author of Google's Web AI course enabling 100K+ developers. Represents teams including LiteRT.js, DeepMind (Gemma web models), Chrome, and TensorFlow.js.",
    image: "/assets/speakers/JasonMayes.png",
    talks: [
      {
        type: "Keynote",
        title: "Client side Web AI Agents for the agentic internet of the future",
        description:
          "See how to use the latest generative AI models from Google that run entirely client side (no cloud) to perform agentic behaviors on any website — bringing privacy, low latency, offline capability, and zero inference costs.",
      },
      {
        type: "Tech Talk",
        title: "Vibing with Antigravity as a Senior Engineer for custom solutions",
        description:
          "Learn how seasoned engineers can use Antigravity and Gemini 3 to reach 100x productivity. Jason demonstrates Web AI solutions using LiteRT.js to create RAG systems with minimal effort while maintaining control.",
      },
    ],
    socials: {
      linkedin: "https://www.linkedin.com/in/WebAI/",
      twitter: "https://twitter.com/jason_mayes",
      github: "https://github.com/jasonmayes",
      youtube: "https://www.youtube.com/jasonmayes",
    },
  },
];

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Linkedin;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-neutral-500 hover:text-white transition-colors duration-300"
    >
      <Icon size={18} strokeWidth={1.5} />
    </a>
  );
}

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      {/* Image Column */}
      <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-full lg:h-auto lg:aspect-square max-w-[280px]">
          <Image
            src={speaker.image}
            alt={`${speaker.name} headshot`}
            fill
            className="object-cover grayscale"
            sizes="(max-width: 768px) 192px, (max-width: 1024px) 224px, 280px"
            priority
          />
        </div>

        <div className="flex items-center gap-4 mt-6">
          {speaker.socials.linkedin && (
            <SocialLink href={speaker.socials.linkedin} icon={Linkedin} label="LinkedIn" />
          )}
          {speaker.socials.twitter && (
            <SocialLink href={speaker.socials.twitter} icon={Twitter} label="X (Twitter)" />
          )}
          {speaker.socials.github && (
            <SocialLink href={speaker.socials.github} icon={Github} label="GitHub" />
          )}
          {speaker.socials.youtube && (
            <SocialLink href={speaker.socials.youtube} icon={Youtube} label="YouTube" />
          )}
        </div>
      </div>

      {/* Content Column */}
      <div className="lg:col-span-8">
        <div className="mb-6">
          <h3 className="text-3xl font-bold tracking-tight text-white">
            {speaker.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-neutral-400">
              {speaker.title}
            </p>

            {speaker.companyLogo && (
              <Image
                src={speaker.companyLogo}
                alt={`${speaker.company} logo`}
                width={45}
                height={18}
                className="object-contain"
              />
            )}
          </div>
        </div>

        <p className="text-sm text-neutral-400 leading-relaxed mb-8">
          {speaker.bio}
        </p>

        <div className="space-y-6">
          {speaker.talks.map((talk, index) => (
            <div key={index} className="border-l border-white/10 pl-6">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">
                {"// "}{talk.type}
              </p>
              <h4 className="text-base font-bold text-white mb-2 leading-snug">
                {talk.title}
              </h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {talk.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeaturedSpeakers() {
  return (
    <section className="py-24 px-6 border-t border-white/10 border-b border-white/10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
          {"// featured speakers"}
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-10">
          Learn from the best in AI.
        </h2>

        <div className="space-y-16">
          {speakers.map((speaker) => (
            <SpeakerCard key={speaker.name} speaker={speaker} />
          ))}
        </div>
      </div>
    </section>
  );
}
