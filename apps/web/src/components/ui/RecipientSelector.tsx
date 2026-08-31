import React, { useState, useRef, useEffect } from 'react'
import { useContacts, useAudiences } from '@project/sdk'
import type { components } from '@project/sdk'
import { User, Users, X, Mail, Globe } from 'lucide-react'

type Contact = components['schemas']['Contact']
type Audience = components['schemas']['Audience']

export type Recipient = {
  id: string
  type: 'contact' | 'audience' | 'raw_email' | 'platform'
  name: string
  detail?: string
}

interface RecipientSelectorProps {
  selectedContactIds: string[]
  selectedAudienceIds: string[]
  selectedRawEmails?: string[]
  suggestedChips?: {
    id: string
    name: string
    type: 'audience' | 'platform' | 'contact' | 'raw_email'
  }[]
  onChange: (
    contacts: string[],
    audiences: string[],
    rawEmails: string[],
    platforms: string[],
  ) => void
}

export function RecipientSelector({ suggestedChips = [], onChange }: RecipientSelectorProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch data
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts({ q: query, limit: 10 })
  const { data: audiencesData, isLoading: isLoadingAudiences } = useAudiences({ limit: 50 })

  useEffect(() => {
    const contacts = selectedRecipients.filter((r) => r.type === 'contact').map((r) => r.id)
    const audiences = selectedRecipients.filter((r) => r.type === 'audience').map((r) => r.id)
    const rawEmails = selectedRecipients.filter((r) => r.type === 'raw_email').map((r) => r.id)
    const platforms = selectedRecipients.filter((r) => r.type === 'platform').map((r) => r.id)

    // We only trigger onChange if it's a structural change, avoid deep equal loops.
    // For simplicity we just use JSON.stringify on the arrays.
    // Note: the prop doesn't have selectedPlatforms yet but we pass it up anyway.
    onChangeRef.current(contacts, audiences, rawEmails, platforms)
  }, [selectedRecipients])

  // Process options
  const contactOptions: Recipient[] = (contactsData?.pages?.[0]?.data || []).map((c: Contact) => ({
    id: c.id,
    type: 'contact',
    name: c.name,
    detail: c.email || c.phone || undefined,
  }))

  const allAudiences: Recipient[] = (audiencesData?.pages?.[0]?.data || []).map((a: Audience) => ({
    id: a.id,
    type: 'audience',
    name: a.name,
    detail: `${a.type.replace('_', ' ').toLowerCase()}`,
  }))

  const audienceOptions = allAudiences.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  )

  const allOptions = [...audienceOptions, ...contactOptions].filter(
    (opt) => !selectedRecipients.find((r) => r.id === opt.id && r.type === opt.type),
  )

  const handleSelect = (recipient: Recipient) => {
    if (!selectedRecipients.find((r) => r.id === recipient.id && r.type === recipient.type)) {
      setSelectedRecipients([...selectedRecipients, recipient])
    }
    setQuery('')
    inputRef.current?.focus()
  }

  const handleRemove = (recipient: Recipient) => {
    setSelectedRecipients(
      selectedRecipients.filter((r) => !(r.id === recipient.id && r.type === recipient.type)),
    )
  }

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  }

  const handleAddRawEmail = (emailStr: string) => {
    const email = emailStr.trim()
    if (!email) return

    // 1. Check if it's already selected as a raw email
    if (
      selectedRecipients.find(
        (r) => r.type === 'raw_email' && r.id.toLowerCase() === email.toLowerCase(),
      )
    ) {
      setQuery('')
      return
    }

    // 2. Check if it matches a contact we already have loaded (naive check, a real app might do a specific lookup)
    // For simplicity, we just check current contactOptions
    const existingContact = contactOptions.find(
      (c) => c.detail?.toLowerCase() === email.toLowerCase(),
    )
    if (existingContact) {
      if (!selectedRecipients.find((r) => r.id === existingContact.id && r.type === 'contact')) {
        setSelectedRecipients([...selectedRecipients, existingContact])
      }
      setQuery('')
      return
    }

    // 3. Otherwise add as raw email if valid
    if (validateEmail(email)) {
      setSelectedRecipients([
        ...selectedRecipients,
        {
          id: email,
          type: 'raw_email',
          name: email,
        },
      ])
      setQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && query === '' && selectedRecipients.length > 0) {
      const last = selectedRecipients[selectedRecipients.length - 1]
      if (last) handleRemove(last)
    } else if (e.key === 'Enter' || e.key === ',') {
      if (query.trim()) {
        e.preventDefault()
        handleAddRawEmail(query)
      }
    }
  }

  return (
    <div className="space-y-3 relative" ref={containerRef}>
      {/* Quick Select Audience Chips */}
      {suggestedChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestedChips.map((chip) => {
            const isSelected = selectedRecipients.find(
              (r) => r.id === chip.id && r.type === chip.type,
            )
            return (
              <button
                key={`${chip.type}-${chip.id}`}
                type="button"
                onClick={() =>
                  isSelected ? handleRemove(chip as Recipient) : handleSelect(chip as Recipient)
                }
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  isSelected
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {chip.type === 'platform' ? <Globe size={14} /> : <Users size={14} />}
                {chip.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">To</label>
        <div
          className={`relative flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 shadow-sm transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 cursor-text ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
          onClick={() => {
            setIsOpen(true)
            inputRef.current?.focus()
          }}
        >
          {selectedRecipients.map((recipient) => {
            let Icon = User
            let colorClass = 'bg-blue-50 text-blue-700 border-blue-200'
            let iconColor = 'text-blue-500'
            let hoverClass = 'hover:bg-blue-200 hover:text-blue-900 focus:bg-blue-200'

            if (recipient.type === 'audience') {
              Icon = Users
              colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
              iconColor = 'text-emerald-500'
              hoverClass = 'hover:bg-emerald-200 hover:text-emerald-900 focus:bg-emerald-200'
            } else if (recipient.type === 'platform') {
              Icon = Globe
              colorClass = 'bg-purple-50 text-purple-700 border-purple-200'
              iconColor = 'text-purple-500'
              hoverClass = 'hover:bg-purple-200 hover:text-purple-900 focus:bg-purple-200'
            } else if (recipient.type === 'raw_email') {
              Icon = Mail
              colorClass = 'bg-gray-50 text-gray-700 border-gray-200'
              iconColor = 'text-gray-500'
              hoverClass = 'hover:bg-gray-200 hover:text-gray-900 focus:bg-gray-200'
            }

            return (
              <span
                key={`${recipient.type}-${recipient.id}`}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium border ${colorClass}`}
              >
                <Icon size={14} className={iconColor} />
                {recipient.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(recipient)
                  }}
                  className={`ml-0.5 rounded-full p-0.5 focus:outline-none ${hoverClass}`}
                >
                  <X size={12} />
                </button>
              </span>
            )
          })}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={
              selectedRecipients.length === 0
                ? 'Search contacts or audiences, or type an email...'
                : ''
            }
            className="flex-1 min-w-[200px] bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {isOpen && (query || allOptions.length > 0) && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {isLoadingContacts || isLoadingAudiences ? (
              <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
            ) : allOptions.length === 0 && !validateEmail(query) ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                No results found. Type a valid email and press Enter to add.
              </div>
            ) : (
              <>
                {allOptions.map((opt) => (
                  <button
                    key={`${opt.type}-${opt.id}`}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(opt)
                    }}
                  >
                    <div
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${opt.type === 'contact' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}
                    >
                      {opt.type === 'contact' ? <User size={16} /> : <Users size={16} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{opt.name}</span>
                      {opt.detail && <span className="text-xs text-gray-500">{opt.detail}</span>}
                    </div>
                  </button>
                ))}

                {query &&
                  validateEmail(query) &&
                  !contactOptions.find((c) => c.detail?.toLowerCase() === query.toLowerCase()) && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2 border-t text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddRawEmail(query)
                      }}
                    >
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <Mail size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{query}</span>
                        <span className="text-xs text-gray-500">Add as raw email address</span>
                      </div>
                    </button>
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
