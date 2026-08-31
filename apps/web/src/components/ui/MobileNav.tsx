import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export interface MobileNavLink {
  label: string
  href: string
}

interface MobileNavProps {
  links: MobileNavLink[]
  className?: string
  overlayClassName?: string
  linkClassName?: string
  iconClassName?: string
  openIcon?: React.ReactNode
  closeIcon?: React.ReactNode
}

export function MobileNav({
  links,
  className = '',
  overlayClassName = 'bg-white text-black',
  linkClassName = 'text-2xl font-bold',
  iconClassName = 'w-6 h-6',
  openIcon,
  closeIcon,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scrolling
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <div className={`md:hidden ${className}`}>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-current rounded-md"
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        {openIcon || <Menu className={iconClassName} />}
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[100] transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${overlayClassName}`}
      >
        <div className="flex justify-end p-4">
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-current rounded-md"
            aria-label="Close menu"
          >
            {closeIcon || <X className={iconClassName} />}
          </button>
        </div>

        <nav className="flex flex-col items-center justify-center h-[80%] gap-8 px-6">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              className={`hover:opacity-70 transition-opacity ${linkClassName}`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
