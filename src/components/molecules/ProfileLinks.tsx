'use client'

import { motion, useReducedMotion } from 'motion/react'

const socials = [
  { label: 'GitHub', href: 'https://github.com/jacobEliasMoya' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jacob-moya-317998174' },
]
const phone = '+19096446073'
const textDraft =
  'Hey Jake, I came across your portfolio and would love to chat about working together.'
const menuLinks = [
  ...socials,
  { label: 'Email', href: 'mailto:jemoya1994@gmail.com' },
  { label: 'Call', href: `tel:${phone}` },
  { label: 'Text message', href: `sms:${phone}?body=${encodeURIComponent(textDraft)}` },
]
export const menuSocialStartOffset = 100

export function ProfileLinks({
  placement,
  inactive = false,
  raised = true,
  onSlide,
}: {
  placement: 'about' | 'menu'
  inactive?: boolean
  raised?: boolean
  onSlide?: (offset: number) => void
}) {
  const reduced = useReducedMotion()
  const menu = placement === 'menu'

  return (
    <motion.nav
      className={`profile-links profile-links-${placement}`}
      aria-label={placement === 'about' ? 'About social profiles' : 'Social and contact links'}
      inert={inactive}
      initial={menu && !reduced ? { y: menuSocialStartOffset } : false}
      animate={menu ? { y: !raised && !reduced ? menuSocialStartOffset : 0 } : undefined}
      onUpdate={({ y }) => {
        if (typeof y === 'number') onSlide?.(y)
      }}
      transition={
        reduced ? { duration: 0 } : { duration: menu ? 0.26 : 0.38, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {(menu ? menuLinks : socials).map((link) => {
        const external = link.href.startsWith('https:')

        return (
          <motion.a
            key={link.label}
            href={link.href}
            aria-label={external ? `${link.label} (opens in a new tab)` : link.label}
            title={link.label}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            whileHover={reduced ? undefined : { y: -2, scale: 1.08 }}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
          >
            <svg
              viewBox={menu && link.label === 'GitHub' ? '-1.5 -1.5 27 27' : '0 0 24 24'}
              aria-hidden="true"
              focusable="false"
              fill="currentColor"
            >
              {link.label === 'GitHub' ? (
                <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.63 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.09c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
              ) : link.label === 'Email' ? (
                <path
                  stroke="none"
                  fillRule="evenodd"
                  d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm-.5 3.8 7.9 5.9a1 1 0 0 0 1.2 0l7.9-5.9-1.2-1.6-7.3 5.5-7.3-5.5-1.2 1.6Z"
                />
              ) : link.label === 'Call' ? (
                <path d="M7 3H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17a1 1 0 0 0 1-1v-3a1 1 0 0 0-.7-.95l-4-1.3a1 1 0 0 0-1.05.25l-1.7 1.7A13 13 0 0 1 7.3 10.45l1.7-1.7a1 1 0 0 0 .25-1.05l-1.3-4A1 1 0 0 0 7 3Z" />
              ) : link.label === 'Text message' ? (
                <path
                  stroke="none"
                  fillRule="evenodd"
                  d="M6 3h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H9l-4.5 3v-3.3A4 4 0 0 1 2 15V7a4 4 0 0 1 4-4Zm1.5 7a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
                />
              ) : (
                <>
                  <circle cx="5" cy="5" r="2" />
                  <path d="M3 9h4v12H3zm7 0h3.8v1.65C14.5 9.5 15.65 8.7 17.5 8.7c3.2 0 3.5 2.1 3.5 5V21h-4v-6.5c0-1.5-.3-2.5-1.7-2.5-1.5 0-1.3 1.3-1.3 2.5V21h-4Z" />
                </>
              )}
            </svg>
          </motion.a>
        )
      })}
    </motion.nav>
  )
}
