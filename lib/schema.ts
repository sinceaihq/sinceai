import { WithContext, FAQPage, Event, Blog, BlogPosting, BreadcrumbList, ItemList } from 'schema-dts'
import { ORG } from './org'
import { FIRST_EVENT, UPCOMING_EVENT_2026, getEventStatus, LINKS } from './sinceai'
import { blogPosts, type BlogPost } from './blog'
import { getAuthor } from './authors'

const BLOG_IMAGE = `${ORG.baseUrl}/assets/logo/SINCE AI white.png`

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
          url: BLOG_IMAGE,
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
        url: BLOG_IMAGE,
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
