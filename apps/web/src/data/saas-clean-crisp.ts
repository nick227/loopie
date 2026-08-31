import { PageModel } from '../types/content'

export const saasCleanCrispData: PageModel = {
  title: 'AcmeCorp - Clean & Crisp SaaS',
  slug: 'saas-clean-crisp',
  seo: {
    title: 'AcmeCorp | Cut integration time by up to 80%',
    description:
      'The all-in-one infrastructure platform to manage microservices, automate deployments, and ship products faster.',
  },
  theme: {
    mode: 'light',
    fontFamily: 'sans',
  },
  navLinks: [
    { label: 'Features', url: '#features' },
    { label: 'Platform', url: '#platform' },
    { label: 'Customers', url: '#testimonials' },
    { label: 'Pricing', url: '#pricing' },
  ],
  blocks: [
    {
      _type: 'hero',
      badges: ['AcmeCorp 2.0 is now live'],
      headline: 'Cut integration time by up to 80%.',
      subheadline:
        'The all-in-one infrastructure platform to manage microservices, automate deployments, and ship products faster than your competitors. Zero maintenance required.',
      interactionType: 'inline-form',
      ctas: [{ label: 'Get early access', url: '#', variant: 'primary', icon: 'ArrowRight' }],
      media: {
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000',
        alt: 'Dashboard Preview',
      },
      proof: {
        text: 'Join 10,000+ developers',
        rating: 4.9,
      },
      variant: 'centered',
    },
    {
      _type: 'logo_cloud',
      title: 'Integrates with your existing stack',
      logos: [
        { name: 'GitHub', icon: 'Github' },
        { name: 'Figma', icon: 'Figma' },
        { name: 'Slack', icon: 'Slack' },
        { name: 'Notion', icon: 'Command' },
        { name: 'Stripe', icon: 'Globe' },
      ],
    },
    {
      _type: 'metrics',
      metrics: [
        {
          value: '40+',
          label: 'Hours Saved',
          description: 'Average weekly time saved per engineering team after full integration.',
        },
        {
          value: '99.9%',
          label: 'Uptime SLA',
          description:
            'Enterprise-grade reliability backed by our globally distributed infrastructure.',
        },
        {
          value: '3x',
          label: 'Faster Deploys',
          description:
            'Accelerate your release cycles with automated testing and continuous delivery.',
        },
      ],
    },
    {
      _type: 'service_selector',
      title: 'A unified platform for your entire team',
      subtitle: 'See how AcmeCorp empowers every department to move faster together.',
      services: [
        {
          id: 'engineering',
          label: 'Engineering',
          headline: 'Ship code, not infrastructure',
          description:
            'Automate your CI/CD pipelines, manage microservices visually, and get real-time observability without configuring complex dashboards.',
          icon: 'Code',
          media: {
            url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
            alt: 'Engineering dashboard',
          },
          cta: {
            label: 'Explore Developer Tools',
            url: '#',
            variant: 'primary',
            icon: 'ArrowRight',
          },
        },
        {
          id: 'devops',
          label: 'DevOps',
          headline: 'Zero-downtime deployments',
          description:
            'Manage clusters, secrets, and environments with a single click. Roll back instantly if something goes wrong.',
          icon: 'Server',
          media: {
            url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800',
            alt: 'DevOps view',
          },
          cta: { label: 'View Infrastructure Specs', url: '#', variant: 'primary' },
        },
        {
          id: 'security',
          label: 'Security',
          headline: 'Enterprise-grade protection by default',
          description:
            'SOC2 compliant, end-to-end encryption, and automated vulnerability scanning built directly into your workflow.',
          icon: 'ShieldCheck',
          media: {
            url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800',
            alt: 'Security monitoring',
          },
          cta: { label: 'Read Security Whitepaper', url: '#', variant: 'outline' },
        },
      ],
    },
    {
      _type: 'feature_grid',
      title: 'Everything you need to scale',
      subtitle:
        'Streamline your workflow with our suite of powerful tools designed for modern engineering teams.',
      features: [
        {
          title: 'Real-time Telemetry',
          description:
            'Get deep insights into your microservices with our powerful observability engine. See bottlenecks as they happen.',
          icon: 'BarChart3',
        },
        {
          title: 'Enterprise Security',
          description:
            'Bank-grade encryption, SSO, and SOC2 compliance ensure your data is always safe and audit-ready.',
          icon: 'Shield',
        },
        {
          title: 'Automated CI/CD',
          description:
            'Save time by automating deployments. Connect your Git repository and let AcmeCorp handle the rest.',
          icon: 'Zap',
        },
      ],
      columns: 3,
    },
    {
      _type: 'faq',
      title: 'Frequently asked questions',
      layout: 'accordion',
      questions: [
        {
          question: 'Is there a free trial available?',
          answer: 'Yes, you can try AcmeCorp for free for 14 days. No credit card required.',
        },
        {
          question: 'Can I change my plan later?',
          answer:
            'Absolutely. You can upgrade or downgrade your plan at any time. Prorated charges will be applied automatically.',
        },
        {
          question: 'What is your cancellation policy?',
          answer:
            'We understand that things change. You can cancel your subscription at any time with no penalty.',
        },
        {
          question: 'Do you offer custom enterprise pricing?',
          answer:
            'Yes, for large teams requiring custom SLAs, dedicated support, and volume discounts, please contact our sales team.',
        },
      ],
    },
    {
      _type: 'comparison',
      title: 'AcmeCorp vs The Old Way',
      items: [
        { feature: 'Setup Time', us: 'Minutes', them: 'Weeks' },
        { feature: 'Maintenance', us: 'Zero', them: 'Full-time team' },
        { feature: 'Cost', us: 'Predictable', them: 'Hidden fees' },
        { feature: 'Enterprise Security', us: true, them: false },
        { feature: 'Automated Rollbacks', us: true, them: false },
      ],
    },
    {
      _type: 'sticky_media',
      sections: [
        {
          id: 'step-1',
          headline: 'Connect your repository',
          body: 'Simply link your GitHub, GitLab, or Bitbucket account. We automatically detect your framework and configure the optimal build environment.',
          media: {
            url: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=800',
            alt: 'Repository integration',
          },
        },
        {
          id: 'step-2',
          headline: 'Configure your environments',
          body: 'Set up staging, production, and preview environments with a few clicks. Manage environment variables securely across your team.',
          media: {
            url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
            alt: 'Environment configuration',
          },
        },
        {
          id: 'step-3',
          headline: 'Deploy globally in seconds',
          body: 'Push code and let our global edge network deliver it to your users with near-zero latency, automatically scaling to meet demand.',
          media: {
            url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800',
            alt: 'Global deployment map',
          },
        },
      ],
    },
    {
      _type: 'pricing',
      title: 'Simple, transparent pricing',
      subtitle: 'Choose the plan that best fits your needs. No hidden fees.',
      billingToggle: {
        monthly: 'Monthly',
        yearly: 'Yearly',
        discount: 'Save 20%',
      },
      plans: [
        {
          id: 'pro',
          name: 'Pro',
          description: 'Perfect for small teams and startups.',
          price: { monthly: '$29', yearly: '$24' },
          features: [
            'Up to 10 users',
            'Unlimited projects',
            'Basic analytics',
            '24/7 email support',
          ],
          cta: { label: 'Get Started', url: '#' },
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'For large organizations with complex needs.',
          price: { monthly: '$99', yearly: '$79' },
          features: [
            'Unlimited users',
            'Advanced security',
            'Custom reporting',
            'Dedicated success manager',
          ],
          isPopular: true,
          cta: { label: 'Contact Sales', url: '#' },
        },
      ],
    },
  ],
}
