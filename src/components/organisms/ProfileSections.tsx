import { EditorialLabel } from '@/components/atoms/EditorialLabel'

const roles = [
  {
    company: 'Inenvi',
    title: 'Software Engineer',
    dates: '2025–Present',
    description:
      'Modernizing web platforms with shared React components and accessible, localized interfaces.',
    current: true,
  },
  {
    company: 'BIZIQ',
    title: 'Web Developer II',
    dates: '2022–2025',
    description:
      'Built and launched responsive sites, improved accessibility and performance, and mentored developers.',
  },
  {
    company: 'BIZIQ',
    title: 'Web Developer I',
    dates: '2021–2022',
    description:
      'Shipped client sites and connected forms, email workflows, and third-party services.',
  },
  {
    company: 'VAREP National',
    title: 'Junior Web Developer',
    dates: '2019–2021',
    description: 'Helped migrate Joomla to WordPress and turn design wireframes into live pages.',
  },
]

function InterfaceLayers() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 52 540 398"
      className="mx-auto block w-full max-w-[39rem]"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g className="fill-lime stroke-on-lime" strokeWidth="1.25">
        <path d="m55 358 273-88 156 65-273 89z" />
        <path d="m55 358 156 66 273-89v9l-273 89-156-66z" />
        <path fill="none" d="m172 388 175-57m-153 67 175-57m-153 67 175-57" />
      </g>
      <g className="fill-orchid-paper stroke-on-orchid-paper" strokeWidth="1.25">
        <path d="m55 308 273-88 156 65-273 89z" />
        <path d="m55 308 156 66 273-89v9l-273 89-156-66z" />
      </g>
      <g className="stroke-on-orchid-paper/75" strokeWidth="1.25">
        <path d="m116 311 90 38 219-71M163 296l91 38M213 280l92 39M262 264l91 39M310 249l92 39M145 324l218-71M174 336l218-71" />
      </g>
      <path
        className="stroke-muted"
        d="M55 320v35m156 29v38m273-127v38"
        strokeDasharray="3 8"
        strokeWidth="1.25"
      />
      <g className="fill-on-orchid-paper stroke-orchid-paper" strokeWidth="1.25">
        <path d="m55 236 273-88 156 65-273 89z" />
        <path d="m55 236 156 66 273-89v8l-273 89-156-65z" />
      </g>
      <g className="stroke-orchid-paper" strokeWidth="1.25">
        <path d="m102 238 48 20 57-19-48-20z" />
        <path d="m176 214 48 20 57-19-48-20z" />
        <path d="m250 190 48 20 57-19-48-20z" />
        <path d="m183 272 49 20 57-19-48-20z" />
        <path d="m257 248 49 20 57-19-48-20z" />
        <path d="m331 224 49 20 57-19-48-20z" />
      </g>
      <path
        className="fill-lime stroke-on-lime"
        strokeWidth="1.25"
        d="m257 248 49 20 57-19-48-20z"
      />
      <g className="fill-[#f7eaf8] stroke-on-orchid-paper" strokeWidth="1.5">
        <path d="m55 161 273-88 156 65-273 89z" />
        <path d="m55 161 156 66 273-89v8l-273 89-156-66z" />
      </g>
      <g className="stroke-on-orchid-paper" strokeWidth="1.5">
        <path d="m55 161 273-88 156 65-273 89z" />
        <path d="m84 173 273-88M125 180l95-31 81 34-96 31zM126 180l175 3m-81-34-15 65M245 141l104-34m-92 40 103-34m-91 40 103-34m-91 40 75-25" />
        <path d="m299 166 61-20 18 7-61 20z" />
      </g>
      <path
        className="stroke-on-orchid-paper"
        d="M55 170v64m156-6v71m273-151v63"
        strokeDasharray="3 8"
        strokeWidth="1.25"
      />
      <ellipse
        cx="213"
        cy="183"
        rx="40"
        ry="18"
        transform="rotate(-10 213 183)"
        className="stroke-lime"
        strokeWidth="3"
      />
      <g className="fill-canvas stroke-accent" strokeWidth="1.5">
        <path d="M407 125h49l24-25h22M373 248h58l36 29h35M155 332H97l-33 23H37" />
        <circle cx="407" cy="125" r="3" />
        <circle cx="373" cy="248" r="3" />
        <circle cx="155" cy="332" r="3" />
      </g>
      <g className="fill-accent font-body text-[11px] font-bold tracking-widest">
        <text x="512" y="104">
          01
        </text>
        <text x="512" y="281">
          02
        </text>
        <text x="14" y="359">
          03
        </text>
      </g>
    </svg>
  )
}

export function ProfileSections() {
  return (
    <>
      <section
        id="experience"
        aria-labelledby="experience-heading"
        className="scroll-mt-8 py-16 sm:py-24 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] lg:gap-16"
      >
        <div className="mb-10 lg:mb-0">
          <EditorialLabel>Experience</EditorialLabel>
          <h2
            id="experience-heading"
            className="editorial-display mt-4 max-w-[13ch] font-display text-[clamp(2.75rem,5.4vw,6rem)] leading-[0.93] font-black tracking-tight text-balance"
          >
            From sites to systems<span className="text-accent">.</span>
          </h2>
        </div>
        <ol className="divide-y divide-rule/45">
          {roles.map(({ company, title, dates, description, current }) => (
            <li
              key={title}
              className="grid gap-2 py-5 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_auto] sm:items-baseline sm:gap-x-4"
            >
              <h3 className="flex items-baseline gap-2 font-display text-xl leading-tight font-black text-muted sm:text-2xl">
                {current && (
                  <span
                    aria-hidden="true"
                    className="h-2 w-3 shrink-0 self-center rounded-full bg-accent"
                  />
                )}
                {company}
              </h3>
              <p className="text-base leading-tight font-semibold sm:text-lg">{title}</p>
              <p className="text-sm whitespace-nowrap text-muted sm:text-right">{dates}</p>
              <p className="max-w-[58ch] text-sm leading-relaxed text-muted sm:col-span-3">
                {description}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <section
        id="about"
        aria-labelledby="profile-heading"
        className="scroll-mt-8 py-16 sm:py-24 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-12"
      >
        <div className="lg:order-2">
          <div className="text-muted">
            <EditorialLabel>Profile</EditorialLabel>
          </div>
          <h2
            id="profile-heading"
            className="editorial-display mt-4 max-w-[14ch] font-display text-[clamp(2.75rem,5.4vw,6rem)] leading-[0.93] font-black tracking-tight text-balance"
          >
            Behind the interface<span className="text-accent">.</span>
          </h2>
          <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted">
            I’m Jacob Moya. I build reusable design systems and carry accessible interfaces from
            design into production.
          </p>
          <p className="mt-5">
            <EditorialLabel>Southern California</EditorialLabel>
          </p>
        </div>
        <figure className="mt-10 lg:order-1 lg:mt-0">
          <InterfaceLayers />
          <figcaption className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted">
            <span>
              <span className="mr-1 text-accent">01</span> Interfaces
            </span>
            <span>
              <span className="mr-1 text-accent">02</span> Systems
            </span>
            <span>
              <span className="mr-1 text-accent">03</span> Platforms
            </span>
          </figcaption>
        </figure>
      </section>
    </>
  )
}
