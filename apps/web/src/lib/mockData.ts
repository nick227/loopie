export const mockContacts = [
  {
    id: '1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    phone: '+1234567890',
    source: 'CSV Import',
    tags: ['Enterprise', 'NY'],
  },
  {
    id: '2',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '+1987654321',
    source: 'Salesforce',
    tags: ['SMB', 'CA'],
  },
  {
    id: '3',
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    phone: '+1555555555',
    source: 'HubSpot',
    tags: ['Enterprise', 'TX'],
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    phone: '+1112223333',
    source: 'Manual',
    tags: ['VIP'],
  },
]

export const mockPlatforms = [
  {
    id: 'p1',
    name: 'Twitter / X',
    handle: '@midnightcreative',
    status: 'Connected',
    followers: 12500,
    icon: 'Twitter',
  },
  {
    id: 'p2',
    name: 'LinkedIn',
    handle: 'Midnight Creative',
    status: 'Connected',
    followers: 8400,
    icon: 'Linkedin',
  },
  {
    id: 'p3',
    name: 'Instagram',
    handle: '@midnight.creative',
    status: 'Disconnected',
    followers: 4200,
    icon: 'Instagram',
  },
]

export const mockAudiences = [
  { id: 'a1', name: 'All CRM Contacts', size: 450, channels: ['EMAIL', 'SMS'] },
  { id: 'a2', name: 'Twitter Superfans', size: 12500, channels: ['TWITTER'] },
  { id: 'a3', name: 'Enterprise Leads + LinkedIn', size: 8550, channels: ['EMAIL', 'LINKEDIN'] },
]
