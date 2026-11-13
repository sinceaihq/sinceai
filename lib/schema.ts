import { WithContext, FAQPage, Event, Blog, BlogPosting, BreadcrumbList, ItemList } from 'schema-dts'
import { ORG } from './org'
import { FIRST_EVENT, HACKATHON_2026, HACKATHON_2026_PARTNERS, LINKS } from './sinceai'
import { VENUES } from './hackathon-2026/venues'
import { blogPosts, type BlogPost } from './blog'
import { getAuthor } from './authors'

const BLOG_IMAGE = encodeURI(`${ORG.baseUrl}/assets/logo/SINCE AI white.png`)

/** Canonical on-site URL for a blog post. */
export function getPostUrl(slug: string): string {
  return `${ORG.baseUrl}/blog/${slug}`
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
 * schema.org has no "completed" event status: `eventStatus` only says whether an
 * event runs as planned (EventScheduled, EventCancelled, EventPostponed, …).
 * An event that took place as planned keeps EventScheduled, and its dates tell
 * search engines it is over. What must change when an event ends is everything
 * that invites people to it: no `offers`, and a description in the past tense.
 */
const TOOK_PLACE_AS_SCHEDULED = 'https://schema.org/EventScheduled' as Event['eventStatus']

const ORGANIZER = { '@id': `${ORG.baseUrl}/#organization` }

/** Since AI Hackathon 2025 — the first event. */
export function getFirstEventSchema(): WithContext<Event> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${ORG.baseUrl}/events#hackathon-2025`,
    name: FIRST_EVENT.name,
    description: `Since AI's flagship launch event brought together ${FIRST_EVENT.attendance} AI builders to collaborate on real-world projects with partner companies in Turku, Finland.`,
    url: LINKS.lumaHackathon2025,
    startDate: FIRST_EVENT.startDate,
    endDate: FIRST_EVENT.endDate,
    eventStatus: TOOK_PLACE_AS_SCHEDULED,
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
    organizer: ORGANIZER,
  }
}

/** Challenge partner websites for the Event schema, in roster order. */
const SPONSOR_URLS: Record<(typeof HACKATHON_2026_PARTNERS.challengePartners)[number], string> = {
  Valmet: 'https://www.valmet.com/',
  Bayer: 'https://www.bayer.com/',
  'Turku Energia': 'https://www.turkuenergia.fi/en',
  Apetit: 'https://apetit.fi/',
  'Takomo Golf': 'https://takomogolf.com/',
  'FORCIT Group': 'https://forcitgroup.com/',
  Elisa: 'https://www.elisa.com/',
  'Meyer Turku': 'https://www.meyerturku.fi/en/',
  Traficom: 'https://www.traficom.fi/',
  'Lindström': 'https://lindstromgroup.com/',
  'Business Turku': 'https://businessturku.fi/',
  DNA: 'https://www.dna.fi/',
  Fonecta: 'https://www.fonecta.fi/',
  Europress: 'https://europressgroup.com/',
  TrustED: 'https://trustedproject.eu/',
}

/**
 * Since AI Hackathon 2026 — one Event for /hackathon and /events, with the same
 * `@id`. Dates and venues come from lib/hackathon-2026; nothing here says the
 * event is still to come (see TOOK_PLACE_AS_SCHEDULED).
 */
export function getHackathon2026EventSchema(): WithContext<Event> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${ORG.baseUrl}/hackathon#event`,
    name: HACKATHON_2026.name,
    description: `${HACKATHON_2026.name} took place on ${HACKATHON_2026.dateLabel} in Turku, Finland: ${HACKATHON_2026_PARTNERS.challengeTarget} company challenges from ${HACKATHON_2026_PARTNERS.challengePartnersShort}, with a cash prize pool of €50,000+. The opening and the finals were at EduCity; teams built at BioCity and Joki.`,
    startDate: HACKATHON_2026.startDate,
    endDate: HACKATHON_2026.endDate,
    eventStatus: TOOK_PLACE_AS_SCHEDULED,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: VENUES.map((venue) => ({
      '@type': 'Place' as const,
      name: venue.name,
      address: {
        '@type': 'PostalAddress' as const,
        streetAddress: venue.address,
        addressLocality: venue.city,
        postalCode: venue.postalCode,
        addressCountry: 'FI',
      },
    })),
    organizer: ORGANIZER,
    // The 15 challenge partners (organiser roster, 1 Nov 2026).
    sponsor: HACKATHON_2026_PARTNERS.challengePartners.map((name) => ({
      '@type': 'Organization' as const,
      name,
      url: SPONSOR_URLS[name],
    })),
    performer: { '@type': 'Person', name: 'Jason Mayes', jobTitle: 'Web AI Lead, Google' },
    image: `${ORG.baseUrl}/assets/og/hackathon-2026.png`,
    url: `${ORG.baseUrl}${HACKATHON_2026.href}`,
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
        url: ORG.logoUrl,
      },
    },
    blogPost: blogPosts.map((post) => ({
      '@type': 'BlogPosting' as const,
      headline: post.title,
      description: post.description,
      url: getPostUrl(post.slug),
      mainEntityOfPage: {
        '@type': 'WebPage' as const,
        '@id': getPostUrl(post.slug),
      },
      datePublished: post.datePublished,
      dateModified: post.dateModified,
      image: BLOG_IMAGE,
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
          url: ORG.logoUrl,
        },
      },
      keywords: post.keywords.join(', '),
    })),
  }
}

/**
 * Per-article BlogPosting schema for an individual /blog/[slug] page.
 * Self-canonical (mainEntityOfPage points to our own URL) so AI engines and
 * search crawlers treat sinceai.ai as the source of record.
 */
export function getArticleSchema(
  post: BlogPost,
  opts: { articleBody?: string } = {}
): WithContext<BlogPosting> {
  const url = getPostUrl(post.slug)
  const author = getAuthor(post.author)
  const schema: WithContext<BlogPosting> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    name: post.title,
    description: post.description,
    abstract: post.keyTakeaway,
    url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    inLanguage: 'en',
    isAccessibleForFree: true,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    image: BLOG_IMAGE,
    articleSection: post.category,
    keywords: post.keywords.join(', '),
    timeRequired: `PT${post.readingTime}M`,
    author: {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.role,
      url: author.linkedin,
      sameAs: [author.linkedin],
      worksFor: {
        '@type': 'Organization',
        name: ORG.name,
        url: ORG.baseUrl,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: ORG.name,
      url: ORG.baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: ORG.logoUrl,
      },
    },
  }

  if (opts.articleBody) schema.articleBody = opts.articleBody

  return schema
}

/**
 * Per-article FAQPage schema built from the post's own FAQ list (GEO).
 */
export function getPostFAQSchema(post: BlogPost): WithContext<FAQPage> | null {
  if (!post.faqs?.length) return null
  return getFAQSchema(post.faqs)
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
      url: getPostUrl(post.slug),
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
