import { PageModel } from '../types/content'

export const appWaitlistNeonData: PageModel = {
  title: 'NeonApp - App Waitlist',
  slug: 'app-waitlist-neon',
  seo: {
    title: 'NeonApp | Skip the line. Claim your card.',
    description:
      'The most exclusive financial membership is opening its doors. Join the waitlist to secure your spot for the next batch of Beta invites.',
  },
  theme: {
    mode: 'dark',
    fontFamily: 'sans',
  },
  navLinks: [{ label: 'Join Waitlist', url: '#waitlist' }],
  blocks: [
    {
      _type: 'hero',
      badges: ['Invite-only Beta'],
      headline: 'Skip the line.\nClaim your card.',
      subheadline:
        'The most exclusive financial membership is opening its doors. Join the waitlist to secure your spot for the next batch of Beta invites.',
      interactionType: 'inline-form',
      ctas: [{ label: 'Join Waitlist', url: '#', variant: 'primary', icon: 'ArrowRight' }],
      media: {
        url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
        alt: 'Neon Card',
      },
      variant: 'split',
    },
    {
      _type: 'feature_grid',
      title: 'How it works',
      subtitle: 'Your path to financial freedom in three simple steps.',
      features: [
        {
          title: 'Join the Waitlist',
          description:
            'Enter your email to secure your spot. Invites are sent out in weekly batches.',
        },
        {
          title: 'Claim your Profile',
          description:
            'Once invited, set up your profile and link your existing accounts in seconds.',
        },
        {
          title: 'Receive your Card',
          description:
            'Your exclusive Neon metal card arrives in the mail 3-5 business days later.',
        },
      ],
      columns: 3,
    },
    {
      _type: 'feature_grid',
      features: [
        { title: 'Bank-grade Security', description: '', icon: 'Shield' },
        { title: 'AES-256 Encryption', description: '', icon: 'Lock' },
        { title: 'SOC2 Compliant', description: '', icon: 'Zap' },
        { title: 'FDIC Insured up to $250k', description: '', icon: 'Sparkles' },
      ],
    },
    {
      _type: 'timeline',
      title: 'THE ROADMAP',
      steps: [
        {
          date: 'Q1 2026',
          title: 'Beta Launch',
          description:
            'Initial rollout to the first 1,000 waitlist members. Core banking and trading features.',
        },
        {
          date: 'Q2 2026',
          title: 'Neon Metal Cards',
          description:
            'Physical cards ship out. Integration with Apple Pay and Google Pay goes live.',
        },
        {
          date: 'Q3 2026',
          title: 'Crypto Yield',
          description: 'Earn up to 8% APY on stablecoins directly from your checking account.',
        },
        {
          date: 'Q4 2026',
          title: 'Global Access',
          description: 'Opening doors to international users and adding multi-currency wallets.',
        },
      ],
    },
    {
      _type: 'calculator',
      title: 'Calculate ROI',
      subtitle: 'See how much you could earn with NeonApp Yield.',
      inputs: [
        {
          id: 'deposit',
          label: 'Initial Deposit ($)',
          type: 'slider',
          min: 1000,
          max: 100000,
          step: 1000,
          defaultValue: 10000,
        },
        {
          id: 'monthly',
          label: 'Monthly Contribution ($)',
          type: 'slider',
          min: 0,
          max: 5000,
          step: 100,
          defaultValue: 500,
        },
      ],
    },
    {
      _type: 'testimonials',
      testimonials: [
        {
          quote:
            "We built NeonApp because we were tired of legacy banks dictating how we manage our wealth. We believe your financial tools should be as beautiful, fast, and powerful as the apps you use every day. We're keeping the community small initially to ensure a flawless experience. We can't wait for you to try it.",
          author: 'Elena Rostova',
          role: 'Founder & CEO',
          avatarUrl:
            'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=128&h=128',
        },
      ],
    },
  ],
}
