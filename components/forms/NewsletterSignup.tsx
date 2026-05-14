'use client'

import { useState } from 'react'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const substackUrl = `https://sinceai.substack.com/subscribe?email=${encodeURIComponent(email)}`
    window.open(substackUrl, '_blank')

    setTimeout(() => {
      setEmail('')
      setIsSubmitting(false)
    }, 1000)
  }

  return (
    <div className="p-8 md:p-10 rounded-3xl border border-white/10 bg-white/[0.02]">
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
        Stay Updated
      </h3>
      <p className="text-neutral-400 text-sm leading-relaxed mb-8">
        Join 1000+ AI developers. Get monthly updates on hackathons, production
        guides, and global AI projects.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={isSubmitting}
            className="flex-1 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-100 transition-all duration-300 disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting ? 'Opening...' : 'Subscribe Free'}
          </button>
        </div>

        <p className="text-neutral-500 text-xs mt-4">
          No spam. Unsubscribe anytime.
        </p>
      </form>
    </div>
  )
}
