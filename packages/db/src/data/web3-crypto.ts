import { PageModel } from '../content'

export const web3CryptoData: PageModel = {
  title: 'NexusProtocol - Web3',
  slug: 'web3-crypto',
  seo: {
    title: 'Nexus Protocol | The Future of Decentralized Finance',
    description: 'Trade, earn, and build on the most scalable layer 1 blockchain.',
  },
  theme: {
    mode: 'dark',
    fontFamily: 'sans',
  },
  navLinks: [
    { label: 'Ecosystem', url: '#ecosystem' },
    { label: 'Developers', url: '#developers' },
    { label: 'Community', url: '#community' },
    { label: 'Tokenomics', url: '#tokenomics' },
  ],
  blocks: [
    {
      _type: 'hero',
      headline: 'Next generation\ndecentralized finance.',
      subheadline:
        'Experience zero-gas fees, sub-second finality, and infinite scalability. The foundation for the decentralized web is here.',
      interactionType: 'carousel',
      states: [
        {
          label: 'DeFi Ecosystem',
          headline: 'Next generation\ndecentralized finance.',
          subheadline: 'Experience zero-gas fees, sub-second finality, and infinite scalability.',
          media: {
            url: 'https://images.unsplash.com/photo-1639762681485-074b7f4ec08d?auto=format&fit=crop&w=1200&q=80',
            alt: 'Abstract 3D Crystal',
          },
          ctas: [{ label: 'Launch App', url: '#app', variant: 'primary', icon: 'Rocket' }],
        },
        {
          label: 'Liquid Staking',
          headline: 'Earn 14% APY\non your assets.',
          subheadline: 'Secure the network and earn rewards instantly without lockup periods.',
          media: {
            url: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?auto=format&fit=crop&w=1200&q=80',
            alt: 'Neon network visualization',
          },
          ctas: [{ label: 'Start Staking', url: '#stake', variant: 'primary', icon: 'Coins' }],
        },
        {
          label: 'NFT Marketplace',
          headline: 'Trade digital\nartifacts instantly.',
          subheadline: 'Discover, collect, and trade extraordinary NFTs with zero gas fees.',
          media: {
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
            alt: 'Abstract Digital Art',
          },
          ctas: [{ label: 'Explore Marketplace', url: '#nft', variant: 'primary', icon: 'Image' }],
        },
      ],
      badges: ['Mainnet Live', 'TVL $1.2B'],
    },
    {
      _type: 'feature_grid',
      title: 'Built for scale',
      subtitle: 'Uncompromising performance without sacrificing decentralization.',
      features: [
        {
          title: 'Zero Gas Fees',
          description: 'Our novel consensus mechanism eliminates transaction fees for end users.',
          icon: 'Zap',
        },
        {
          title: 'Sub-second Finality',
          description: 'Transactions are confirmed and irreversible in less than 400 milliseconds.',
          icon: 'Clock',
        },
        {
          title: 'Carbon Negative',
          description:
            'Energy efficient PoS architecture that actively removes carbon from the atmosphere.',
          icon: 'Leaf',
        },
      ],
    },
    {
      _type: 'service_selector',
      title: 'Developer first',
      subtitle: 'Everything you need to build scalable dApps.',
      services: [
        {
          id: 'evm',
          label: 'EVM Compatible',
          icon: 'Code',
          headline: 'Deploy existing contracts seamlessly.',
          description:
            'Nexus is fully EVM compatible. Deploy your existing Solidity smart contracts without any modifications and instantly benefit from infinite scalability.',
          media: {
            url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
            alt: 'Code on screen',
          },
          cta: { label: 'Read Documentation', url: '#docs', icon: 'ArrowRight' },
        },
        {
          id: 'sdks',
          label: 'Robust SDKs',
          icon: 'Terminal',
          headline: 'Build in your favorite language.',
          description:
            'Native libraries and comprehensive SDKs for Rust, Go, Python, and TypeScript. Build powerful dApps faster than ever before.',
          media: {
            url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80',
            alt: 'Terminal window',
          },
          cta: { label: 'Explore GitHub', url: '#github', icon: 'Github' },
        },
        {
          id: 'grants',
          label: 'Grant Program',
          icon: 'Gem',
          headline: '$50M Ecosystem Fund.',
          description:
            'We are actively funding innovative projects launching on Nexus. Get non-dilutive funding, technical support, and marketing resources.',
          media: {
            url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
            alt: 'Abstract money',
          },
          cta: { label: 'Apply for Grant', url: '#grants', icon: 'ArrowRight' },
        },
      ],
    },
    {
      _type: 'image_browser',
      title: 'Trending Collections',
      subtitle: 'The hottest NFTs minting on Nexus Protocol right now.',
      layout: 'masonry',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
          alt: 'Digital Artifact 1',
          caption: 'CyberPunk #1042',
        },
        {
          url: 'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&w=800&q=80',
          alt: 'Digital Artifact 2',
          caption: 'Nebula Fragments',
        },
        {
          url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=800&q=80',
          alt: 'Digital Artifact 3',
          caption: 'Holographic Apes',
        },
        {
          url: 'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?auto=format&fit=crop&w=800&q=80',
          alt: 'Digital Artifact 4',
          caption: 'Metaverse Land',
        },
      ],
    },
    {
      _type: 'metrics',
      metrics: [
        { label: 'Total Value Locked', value: '$1.2B', description: 'Secured by cryptography' },
        { label: 'Transactions', value: '45M+', description: 'With zero failures' },
        { label: 'Active Wallets', value: '850K', description: 'Across 120 countries' },
      ],
    },
    {
      _type: 'timeline',
      title: 'Roadmap to fully decentralized future',
      steps: [
        {
          title: 'Mainnet Launch',
          description: 'Genesis block mined and core protocol deployed successfully.',
          date: 'Q1 2026',
          status: 'completed',
        },
        {
          title: 'DeFi Summer',
          description: 'Launch of native DEX, lending protocols, and liquidity mining programs.',
          date: 'Q2 2026',
          status: 'current',
        },
        {
          title: 'Cross-chain Bridges',
          description: 'Interoperability with Ethereum, Solana, and Cosmos ecosystems.',
          date: 'Q3 2026',
          status: 'upcoming',
        },
        {
          title: 'Zero-Knowledge Rollups',
          description: 'Implementation of ZK-proofs for ultimate privacy and infinite scaling.',
          date: 'Q4 2026',
          status: 'upcoming',
        },
      ],
    },
    {
      _type: 'calculator',
      title: 'Staking Yield Calculator',
      subtitle: 'Calculate your potential returns by securing the Nexus network.',
      inputs: [
        {
          id: 'stakedAmount',
          label: 'Amount to Stake (NEX)',
          type: 'slider',
          min: 100,
          max: 100000,
          step: 100,
          defaultValue: 10000,
        },
        {
          id: 'lockupPeriod',
          label: 'Lockup Period (Months)',
          type: 'slider',
          min: 1,
          max: 48,
          step: 1,
          defaultValue: 12,
        },
      ],
    },
    {
      _type: 'form',
      title: 'Stay updated',
      formType: 'newsletter',
      buttonLabel: 'Subscribe',
      successMessage: 'Welcome to the Nexus ecosystem.',
    },
  ],
}
