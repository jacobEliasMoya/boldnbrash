export function ProfileSections() {
  return (
    <div className="about-scene scene-content">
      <div className="about-heading">
        <p className="eyebrow">
          <span>04 —</span> About
        </p>
        <h2>
          Curious by nature.
          <br />
          Hands on by choice.
        </h2>
      </div>
      <div className="about-copy">
        <p>
          I’m Jacob Moya. I build reusable design systems and carry accessible
          interfaces from design into production.
        </p>
        <p>
          Based in Southern California. Working across interfaces, content
          platforms, and tools.
        </p>
        <details className="about-details">
          <summary>
            Experience <span aria-hidden="true">+</span>
          </summary>
          <ul>
            <li>
              <strong>Inenvi</strong>
              <span>Software Engineer · 2025–Present</span>
            </li>
            <li>
              <strong>BIZIQ</strong>
              <span>Web Developer II · 2022–2025</span>
            </li>
            <li>
              <strong>BIZIQ</strong>
              <span>Web Developer I · 2021–2022</span>
            </li>
            <li>
              <strong>VAREP National</strong>
              <span>Junior Web Developer · 2019–2021</span>
            </li>
          </ul>
        </details>
        <details className="about-details">
          <summary>
            Experiments & tools <span aria-hidden="true">+</span>
          </summary>
          <ul>
            <li>
              <strong>Git-Go</strong>
              <span>A Go CLI exploring Git workflows.</span>
            </li>
            <li>
              <strong>Rusted-Cargo</strong>
              <span>
                Rust exercises in ownership, traits, and error handling.
              </span>
            </li>
            <li>
              <strong>Image Batch Tools</strong>
              <span>
                Python utilities to geotag, resize, compress, and convert images
                to WebP.
              </span>
            </li>
          </ul>
        </details>
      </div>
      <div
        className="contact-portal"
        data-portal="contact"
        aria-hidden="true"
      />
      <div className="scene-footnote">
        <span>Southern California</span>
        <span>04 / 05</span>
      </div>
    </div>
  )
}
