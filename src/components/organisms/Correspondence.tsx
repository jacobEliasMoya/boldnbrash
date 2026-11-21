import { DotIcon } from '@/components/atoms/dot-icons/DotIcon'
export function Correspondence() {
  return (
    <div className="contact-scene scene-content">
      <p className="eyebrow">04 — Contact</p>
      <h2>
        Have something
        <br />
        in mind?
      </h2>
      <a className="email-link" href="mailto:jemoya1994@gmail.com">
        Get in touch <span aria-hidden="true"><DotIcon /></span>
      </a>
      <p className="contact-email">jemoya1994@gmail.com</p>
      <div className="contact-arches" aria-hidden="true">
        <span />
        <span />
      </div>
      <footer className="contact-footer">
        <a href="#top">Jacob Moya <DotIcon kind="up" /></a>
        <nav aria-label="Social links">
          <a href="https://github.com/jacobEliasMoya">GitHub <DotIcon /></a>
          <a href="https://www.linkedin.com/in/jacob-moya-317998174">LinkedIn <DotIcon /></a>
        </nav>
        <span>{new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
