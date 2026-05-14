'use client'

import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { motion } from 'framer-motion'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<Status>('idle')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')

    try {
      await emailjs.send(
        'service_rxhbj6p',
        'template_4uvoapj',
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
          to_email: 'riku.lauttia@sinceai.fi',
        },
        '9HMsABcTISkdVp92m'
      )

      setStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setStatus('idle'), 5000)
    } catch (error) {
      console.error('EmailJS Error:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="border border-white/5 rounded-xl p-8 md:p-10 hover:border-white/10 transition-colors"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
        Send a message
      </h2>
      <p className="text-neutral-400 text-sm mb-8">
        We typically respond within 24 hours.
      </p>

      {status === 'success' && (
        <div className="mb-6 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
          <p className="text-white text-sm">
            Message sent successfully. We&apos;ll get back to you soon.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
          <p className="text-neutral-400 text-sm">
            Failed to send message. Please try again or email us at{' '}
            <a
              href="mailto:info@sinceai.fi"
              className="text-white hover:text-neutral-300 transition-colors"
            >
              info@sinceai.fi
            </a>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="block text-sm text-neutral-400 mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={status === 'submitting'}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-white/25 disabled:opacity-50 transition-colors text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-neutral-400 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={status === 'submitting'}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-white/25 disabled:opacity-50 transition-colors text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm text-neutral-400 mb-2">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            disabled={status === 'submitting'}
            placeholder="How can we help?"
            className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-white/25 disabled:opacity-50 transition-colors text-sm"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm text-neutral-400 mb-2">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            disabled={status === 'submitting'}
            rows={6}
            placeholder="Tell us more..."
            className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-white/25 disabled:opacity-50 transition-colors text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </motion.div>
  )
}
