const steps = [
  {
    title: 'Understand the problem.',
    description: 'Start with the people, the content, and the constraints. Make the goal clear before choosing the tools.',
  },
  {
    title: 'Build a shared foundation.',
    description: 'Turn patterns into reusable components and content models. Give the next page a solid place to start.',
  },
  {
    title: 'Refine the details.',
    description: 'Check the interface across screen sizes, keyboard interactions, and motion preferences. Make the experience hold together.',
  },
]

export function ApproachScene() {
  return (
    <div className="approach-scene scene-content">
      <div className="approach-heading">
        <p className="eyebrow">03 &mdash; Approach</p>
        <h2>How I<br />get there.</h2>
        <p>From the first question<br />to the finishing touches.</p>
      </div>
      <ol className="approach-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="approach-step-number" aria-hidden="true">0{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="arch-portal" data-portal="about" aria-hidden="true" />
      <div className="scene-footnote">
        <span>Thoughtful foundations. Considered details.</span>
        <span>03 / 05</span>
      </div>
    </div>
  )
}
