import { Inbox, Send, FileEdit, Archive, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MessagesSidebarProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function MessagesSidebar({ currentView, onViewChange }: MessagesSidebarProps) {
  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: 12 },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: FileEdit, count: 3 },
    { id: 'archive', label: 'Archive', icon: Archive },
  ]

  return (
    <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 md:gap-6 border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 md:pr-6">
      <Button
        className="w-full bg-primary text-primary-foreground justify-center md:justify-start"
        onClick={() => onViewChange('composer')}
      >
        <Megaphone className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">New Broadcast</span>
        <span className="sm:hidden">Broadcast</span>
      </Button>

      <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'flex items-center justify-center md:justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0',
              currentView === item.id
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <div className="flex items-center">
              <item.icon className="md:mr-3 h-4 w-4 mr-2" />
              <span className="hidden sm:inline md:inline">{item.label}</span>
            </div>
            {item.count && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  currentView === item.id ? 'bg-background/50' : 'bg-muted',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
