import { Organization, WithContext, FAQPage, Event, Blog, BreadcrumbList, ItemList } from 'schema-dts'
import { ORG } from './org'
import { FOUNDING_YEAR, FIRST_EVENT, UPCOMING_EVENT_2026, getEventStatus, LINKS } from './sinceai'
import { blogPosts } from './blog'

/**
 * Generate Organization schema for Since AI
 * Injected globally in root layout for LLM/SEO discoverability
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrganizationSchema(): WithContext<Organization> & Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG.name,
    alternateName: 'Since AI Community',
    legalName: ORG.legalName,
    url: ORG.baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${ORG.baseUrl}/assets/logo/SINCE AI white.png`,
      width: '512',
      height: '512',
    },
    image: `${ORG.baseUrl}/assets/logo/SINCE AI full black.png`,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'Business ID',
      value: ORG.businessId,
    },
    description:
      "Since AI is a global full-lifecycle AI innovation ecosystem with 1000+ members, based in Turku, Finland. Founded in 2025, we support AI projects from challenge ideation through 72-hour hackathons to production deployment and commercialization. Our flagship hackathon brought 260 builders together to ship 30+ AI projects with 15+ partner companies including Valmet, Sandvik, Kongsberg, and ElevenLabs. We provide 8+ weeks of post-hackathon production support, entrepreneurship assistance through Antler partnership, and research-to-market bridges with universities.",
    address: {
      '@type': 'PostalAddress',
      addressLocality: ORG.location.city,
      addressRegion: 'Southwest Finland',
      addressCountry: ORG.location.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '60.4518',
      longitude: '22.2666',
    },
    areaServed: [
      {
        '@type': 'Country',
        name: 'Finland',
      },
      {
        '@type': 'Place',
        name: 'Global',
      },
    ],
    knowsAbout: [
      'Artificial Intelligence',
      'AI Development',
      'Hackathons',
      'Machine Learning',
      'Large Language Models',
      'AI Community Building',
      'Developer Events',
      'AI Product Development',
      'RAG Applications',
      'Computer Vision',
    ],
    sameAs: [
      ORG.social.discord,
      ORG.social.telegram,
      ORG.social.linkedin,
      ORG.social.instagram,
      ORG.social.x,
      ORG.social.github,
      ORG.social.facebook,
      ORG.social.youtube,
      ORG.social.tiktok,
      ORG.social.medium,
      ORG.social.substack,
      LINKS.lumaOrg,
    ],
    foundingDate: FOUNDING_YEAR.toString(),
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      value: 500,
      unitText: 'community members',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: ORG.contact.infoEmail,
        contactType: 'General Inquiries',
        availableLanguage: ['English', 'Finnish'],
      },
      {
        '@type': 'ContactPoint',
        email: ORG.contact.partnershipEmail,
        contactType: 'Partnerships',
        availableLanguage: ['English', 'Finnish'],
      },
    ],
    event: {
      '@type': 'Event',
      name: UPCOMING_EVENT_2026.name,
      startDate: `${UPCOMING_EVENT_2026.year}-11`,
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: 'Turku',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Turku',
          addressCountry: 'FI',
        },
      },
    },
  }
}

/**
 * Generate FAQPage schema
 * @param faqItems - Array of {question: string, answer: string}
 */
export function getFAQSchema(
  faqItems: Array<{ question: string; answer: string }>
): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * Generate Event schema for hackathons
 * @param event - Event details
 */
export function getEventSchema(event: {
  name: string
  description: string
  startDate: string
  endDate: string
  location: string
  organizer?: string
  url?: string
  eventStatus?: 'scheduled' | 'past' | 'cancelled'
  attendees?: number
  image?: string
}): WithContext<Event> {
  const statusMap = {
    scheduled: 'https://schema.org/EventScheduled' as const,
    past: 'https://schema.org/EventScheduled' as const, // Use EventScheduled for past events (EventPassed is not in schema.org)
    cancelled: 'https://schema.org/EventCancelled' as const,
  }

  const baseSchema: WithContext<Event> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus: statusMap[event.eventStatus || 'scheduled'] as Event['eventStatus'],
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Turku',
        addressCountry: 'FI',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer || ORG.name,
      url: event.url || ORG.baseUrl,
    },
  }

  // Add optional fields
  if (event.image) {
    baseSchema.image = event.image
  }

  return baseSchema
}

/**
 * Get the First Event (flagship hackathon) schema
 * Uses the FIRST_EVENT constant for consistency
 */
export function getFirstEventSchema(): WithContext<Event> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: FIRST_EVENT.name,
    description: `Since AI's flagship launch event brought together ${FIRST_EVENT.attendance} AI builders to collaborate on real-world projects with partner companies in Turku, Finland.`,
    url: LINKS.lumaHackathon2025,
    startDate: FIRST_EVENT.startDate,
    endDate: FIRST_EVENT.endDate,
    eventStatus: getEventStatus() as Event['eventStatus'],
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: FIRST_EVENT.locationName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: FIRST_EVENT.addressLocality,
        addressCountry: FIRST_EVENT.addressCountry,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: ORG.name,
      url: ORG.baseUrl,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/SoldOut',
    },
  }
}

/**
 * Get the Upcoming 2026 Event schema
 * No exact dates yet - uses "November 2026"
 */
export function getUpcoming2026EventSchema(): WithContext<Event> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: UPCOMING_EVENT_2026.name,
    description: `${UPCOMING_EVENT_2026.name} will be held in ${UPCOMING_EVENT_2026.month} ${UPCOMING_EVENT_2026.year} in Turku, Finland. ${UPCOMING_EVENT_2026.dateNote}`,
    url: LINKS.lumaOrg,
    eventStatus: 'https://schema.org/EventScheduled' as Event['eventStatus'],
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: UPCOMING_EVENT_2026.city,
        addressCountry: UPCOMING_EVENT_2026.country,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: ORG.name,
      url: ORG.baseUrl,
    },
  }
}

/**
 * Generate Blog + BlogPosting JSON-LD schema
 * Each post uses mainEntityOfPage pointing to its Medium URL
 */
export function getBlogSchema(): WithContext<Blog> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${ORG.name} Blog`,
    description: 'Comprehensive guides from the leading global AI builders community. Learn hackathon strategies, AI development techniques, and discover the best developer events globally.',
    url: `${ORG.baseUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: ORG.name,
      url: ORG.baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${ORG.baseUrl}/assets/logo/SINCE AI white.png`,
      },
    },
    blogPost: blogPosts.map((post) => ({
      '@type': 'BlogPosting' as const,
      headline: post.title,
      description: post.description,
      url: post.url,
      mainEntityOfPage: {
        '@type': 'WebPage' as const,
        '@id': `${ORG.baseUrl}/blog/${post.slug}`,
      },
      datePublished: post.datePublished,
      dateModified: post.datePublished,
      image: `${ORG.baseUrl}/assets/logo/SINCE AI white.png`,
      author: {
        '@type': 'Organization' as const,
        name: ORG.name,
        url: ORG.baseUrl,
      },
      publisher: {
        '@type': 'Organization' as const,
        name: ORG.name,
        url: ORG.baseUrl,
        logo: {
          '@type': 'ImageObject' as const,
          url: `${ORG.baseUrl}/assets/logo/SINCE AI white.png`,
        },
      },
      keywords: post.keywords.join(', '),
    })),
  }
}

/**
 * Generate ItemList schema for blog index page
 * Helps search engines understand the list of blog posts
 */
export function getBlogItemListSchema(): WithContext<ItemList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: blogPosts.map((post, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: post.title,
      url: post.url,
    })),
  }
}

/**
 * Generate BreadcrumbList schema
 * @param items - Array of breadcrumb items with name and url
 */
export function getBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Blog FAQ schema — common questions AI engines surface
 * Helps with GEO (Generative Engine Optimization)
 */
export function getBlogFAQSchema(): WithContext<FAQPage> {
  return getFAQSchema([
    {
      question: 'What is the best tech stack for an AI hackathon?',
      answer: 'The recommended default stack is Next.js for frontend, FastAPI for backend, and PostgreSQL for the database. For AI-specific features, use LangChain or LlamaIndex with a vector database for RAG applications, and keep deployment simple with Vercel and Railway. Prioritize reliability over complexity during hackathons.',
    },
    {
      question: 'How do you build a hackathon demo in 72 hours?',
      answer: 'Use a demo-first approach: build the full user flow skeleton with hardcoded data first, then layer AI features incrementally. Implement caching, offline modes, and graceful fallbacks for reliability. Focus on creating measurable proof — before/after metrics, accuracy numbers, or speed improvements that judges can verify.',
    },
    {
      question: 'What are the best AI hackathons globally?',
      answer: 'Top global AI hackathons include Junction in Helsinki, Datathon at ETH Zurich, GenAI Zurich, Hack Kosice in Slovakia, MLH global network events, innovation challenges, and Since AI Hackathon in Turku, Finland. Choose based on your goals: networking, prizes, learning, or portfolio projects.',
    },
    {
      question: 'What are good AI project ideas for a hackathon?',
      answer: 'Good hackathon AI projects include RAG question-answering systems, document extraction tools, classification applications, computer vision demos, and multi-agent systems. Start with the demo you want to show judges and build backwards. Projects should solve a specific, demonstrable problem with measurable results.',
    },
    {
      question: 'How do you form a winning hackathon team?',
      answer: 'Build a team of 3-5 people with clear roles: technical lead, product/design, AI specialist, and pitch lead. Designate one person for final decisions to avoid analysis paralysis. Use regular check-ins, set sprint milestones, and operate like a startup founding team with fast decision-making.',
    },
    {
      question: 'How do you win an AI hackathon?',
      answer: 'Winning teams follow a demo-first playbook: pick problems with clear, visible impact, build something that works reliably every time you demo it, show measurable proof rather than slides, and structure your pitch around problem-solution-proof. Focus on demonstrating the most convincing solution rather than building the most complex AI.',
    },
  ])
}
