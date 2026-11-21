const deployedUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL

export const siteUrl = deployedUrl && /^https?:\/\//i.test(deployedUrl) && URL.canParse(deployedUrl)
  ? new URL('/', deployedUrl)
  : undefined

export const portfolioTitle = 'Jacob Moya | Software Engineer & Creative Developer'
export const portfolioDescription =
  'Portfolio of Jacob Moya, a software engineer and creative developer in Southern California. Explore accessible web interfaces, design systems, WordPress projects, and developer tools.'
