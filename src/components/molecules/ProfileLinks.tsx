'use client'

import { motion, useReducedMotion } from 'motion/react'

const socials = [
  { label: 'GitHub', href: 'https://github.com/jacobEliasMoya' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jacob-moya-317998174' },
]

export function ProfileLinks({ placement, inactive = false, onSlide, onRaised }: {
  placement: 'about' | 'menu'
  inactive?: boolean
  onSlide?: (offset: number) => void
  onRaised?: () => void
}) {
  const reduced = useReducedMotion()
  const menu = placement === 'menu'
  return (
    <motion.nav
      className={`profile-links profile-links-${placement}`}
      aria-label={placement === 'about' ? 'About social profiles' : 'Social profiles'}
      inert={inactive}
      initial={menu && !reduced ? { y: 58 } : false}
      animate={menu ? { y: inactive && !reduced ? 58 : 0 } : undefined}
      onUpdate={({ y }) => {
        if (typeof y === 'number') onSlide?.(y)
      }}
      onAnimationComplete={(definition) => {
        if (typeof definition === 'object' && 'y' in definition && definition.y === 0) onRaised?.()
      }}
      transition={reduced ? { duration: 0 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {socials.map((link) => (
          <motion.a
            key={link.label}
            href={link.href}
            aria-label={`${link.label} (opens in a new tab)`}
            title={link.label}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reduced ? undefined : { y: -2, scale: 1.08 }}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
              {link.label === 'GitHub' ? (
                <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.63 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.09c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
              ) : (
                <>
                  <circle cx="5" cy="5" r="2" />
                  <path d="M3 9h4v12H3zm7 0h3.8v1.65C14.5 9.5 15.65 8.7 17.5 8.7c3.2 0 3.5 2.1 3.5 5V21h-4v-6.5c0-1.5-.3-2.5-1.7-2.5-1.5 0-1.3 1.3-1.3 2.5V21h-4Z" />
                </>
              )}
            </svg>
          </motion.a>
      ))}
    </motion.nav>
  )
}
