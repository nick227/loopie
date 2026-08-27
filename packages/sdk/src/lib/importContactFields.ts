export type ImportFieldGroup = 'identity' | 'consent' | 'profile'

export type ImportField = {
  key: string
  label: string
  group: ImportFieldGroup
  aliases: string[]
  hint: string
}

/** Canonical import columns. CSV headers and JSON keys also match `aliases`. */
export const IMPORT_CONTACT_FIELDS: ImportField[] = [
  {
    key: 'name',
    label: 'Name',
    group: 'identity',
    aliases: ['full_name', 'fullname', 'contact_name'],
    hint: 'Or firstName + lastName. Otherwise Unknown.',
  },
  {
    key: 'firstName',
    label: 'First name',
    group: 'identity',
    aliases: ['first_name', 'firstname', 'given_name'],
    hint: 'Joined with last name when name is empty.',
  },
  {
    key: 'lastName',
    label: 'Last name',
    group: 'identity',
    aliases: ['last_name', 'lastname', 'surname', 'family_name'],
    hint: '',
  },
  {
    key: 'email',
    label: 'Email',
    group: 'identity',
    aliases: ['email_address', 'e_mail', 'emailaddress'],
    hint: 'Match key. Need email, phone, or externalId.',
  },
  {
    key: 'phone',
    label: 'Phone',
    group: 'identity',
    aliases: ['phone_number', 'telephone', 'tel'],
    hint: 'Match key.',
  },
  {
    key: 'mobile',
    label: 'Mobile',
    group: 'identity',
    aliases: ['mobile_phone', 'cell', 'cellphone', 'cell_phone'],
    hint: 'Used as phone when phone is empty.',
  },
  {
    key: 'company',
    label: 'Company',
    group: 'identity',
    aliases: ['company_name', 'organization', 'org', 'account'],
    hint: 'Fills a blank company only.',
  },
  {
    key: 'externalId',
    label: 'External id',
    group: 'identity',
    aliases: ['external_id', 'hs_object_id', 'customer_id', 'record_id', 'vid'],
    hint: 'Id from the exporting system.',
  },
  {
    key: 'source',
    label: 'Source',
    group: 'identity',
    aliases: ['lead_source'],
    hint: 'Defaults to CSV.',
  },
  {
    key: 'tags',
    label: 'Tags',
    group: 'identity',
    aliases: ['tag', 'labels', 'label'],
    hint: 'JSON array, or CSV list split on comma, pipe, or semicolon.',
  },
  {
    key: 'emailEligible',
    label: 'Email eligible',
    group: 'consent',
    aliases: ['email_eligible', 'email_opt_in', 'can_email'],
    hint: 'New people only. Existing consent is not overwritten.',
  },
  {
    key: 'smsEligible',
    label: 'SMS eligible',
    group: 'consent',
    aliases: ['sms_eligible', 'sms_opt_in', 'can_sms'],
    hint: 'New people only.',
  },
  {
    key: 'jobTitle',
    label: 'Job title',
    group: 'profile',
    aliases: ['job_title', 'jobtitle', 'job'],
    hint: 'Kept on the import record, not as display identity.',
  },
  {
    key: 'website',
    label: 'Website',
    group: 'profile',
    aliases: ['url', 'website_url'],
    hint: '',
  },
  {
    key: 'address',
    label: 'Address',
    group: 'profile',
    aliases: ['street', 'address1', 'address_1'],
    hint: '',
  },
  { key: 'city', label: 'City', group: 'profile', aliases: [], hint: '' },
  {
    key: 'state',
    label: 'State',
    group: 'profile',
    aliases: ['region', 'province'],
    hint: '',
  },
  {
    key: 'postalCode',
    label: 'Postal code',
    group: 'profile',
    aliases: ['zip', 'zip_code', 'postal_code'],
    hint: '',
  },
  { key: 'country', label: 'Country', group: 'profile', aliases: [], hint: '' },
  {
    key: 'notes',
    label: 'Notes',
    group: 'profile',
    aliases: ['note', 'description'],
    hint: '',
  },
]

export const SAMPLE_CSV = [
  'name,email,phone,company,jobTitle,tags',
  'Jordan Hale,jordan@example.com,+15551212000,Riverside,Owner,vip|repeat',
].join('\n')

export const SAMPLE_JSON = `[
  {
    "name": "Jordan Hale",
    "email": "jordan@example.com",
    "phone": "+15551212000",
    "company": "Riverside",
    "jobTitle": "Owner",
    "tags": ["vip", "repeat"]
  }
]`
