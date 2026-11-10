import styles from './Correspondence.module.css'

export function Correspondence() {
  return (
    <footer id="contact" aria-labelledby="contact-heading" className="scroll-mt-8 pt-16 pb-8 md:pt-28">
      <p className="mb-6 text-xs tracking-[0.2em] text-muted uppercase">Correspondence</p>
      <div className={styles.postcard}>
        <div className="flex min-h-72 rounded-t-panel sm:rounded-tr-none sm:rounded-l-panel flex-col justify-between gap-10 bg-orchid-paper p-6 text-on-orchid-paper sm:p-10 lg:min-h-92 lg:p-14">
          <p className="text-xs tracking-[0.2em] uppercase">Contact / Jacob Moya</p>
          <h2
            id="contact-heading"
            className="font-display text-[clamp(2.75rem,6.8vw,7rem)] leading-[0.95] font-black tracking-[-0.045em]"
          >
            Send me a note.
          </h2>
          <p className="text-xs tracking-[0.15em] uppercase">Southern California</p>
        </div>
        <a href="mailto:jemoya1994@gmail.com" className={styles.email}>
          <span
            className={`${styles.tab} flex h-full min-h-24 items-center justify-between gap-4 bg-lime px-6 py-5 text-on-lime sm:flex-col sm:items-start sm:p-8 lg:p-10`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 80 80"
              fill="none"
              className="order-2 size-12 shrink-0 sm:order-0 sm:size-[clamp(3.5rem,11vw,10rem)]"
            >
              <path d="M10 70 70 10M10 10h60v60" stroke="currentColor" strokeWidth="8" />
            </svg>
            <span className="text-2xl tracking-tight md:text-4xl">Email</span>
          </span>
        </a>
      </div>
      <nav
        aria-label="Contact and footer"
        className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:mt-14 sm:gap-x-8"
      >
        <a className="hover:text-accent" href="https://github.com/jacobEliasMoya">
          GitHub <span aria-hidden="true">↗</span>
        </a>
        <a className="hover:text-accent" href="https://www.linkedin.com/in/jacob-moya-317998174">
          LinkedIn <span aria-hidden="true">↗</span>
        </a>
        <a className="ms-auto hover:text-accent" href="#top">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </nav>
    </footer>
  )
}
