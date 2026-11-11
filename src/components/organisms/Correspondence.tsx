export function Correspondence() {
  return (
    <div className="contact-scene scene-content">
      <p className="eyebrow">05 — Contact</p>
      <h2>
        Have something
        <br />
        in mind?
      </h2>
      <a className="email-link" href="mailto:jemoya1994@gmail.com">
        Get in touch <span aria-hidden="true">↗</span>
      </a>
      <p className="contact-email">jemoya1994@gmail.com</p>
      <div className="contact-arches" aria-hidden="true">
        <span />
        <span />
      </div>
      <footer className="contact-footer">
        <a href="#top">Jacob Moya ↑</a>
        <nav aria-label="Social links">
          <a href="https://github.com/jacobEliasMoya">GitHub ↗</a>
          <a href="https://www.linkedin.com/in/jacob-moya-317998174">LinkedIn ↗</a>
        </nav>
        <span>{new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
