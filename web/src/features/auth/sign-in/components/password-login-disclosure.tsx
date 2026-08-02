/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { ChevronDown, KeyRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type PasswordLoginDisclosureProps = {
  collapsedByDefault: boolean
  children: ReactNode
}

export function PasswordLoginDisclosure(props: PasswordLoginDisclosureProps) {
  const { t } = useTranslation()
  const [requestedOpen, setRequestedOpen] = useState(false)
  const open = !props.collapsedByDefault || requestedOpen

  return (
    <Collapsible open={open} onOpenChange={setRequestedOpen}>
      {props.collapsedByDefault && (
        <div className='flex items-center gap-3'>
          <span className='bg-border/70 h-px flex-1' aria-hidden='true' />
          <CollapsibleTrigger className='text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none'>
            <KeyRound className='size-4' aria-hidden='true' />
            {t('Sign in with password')}
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                open && 'rotate-180'
              )}
              aria-hidden='true'
            />
          </CollapsibleTrigger>
          <span className='bg-border/70 h-px flex-1' aria-hidden='true' />
        </div>
      )}

      <CollapsibleContent
        className='CollapsibleContent'
        style={{ animation: 'none' }}
      >
        <div className={cn('grid gap-4', props.collapsedByDefault && 'pt-3')}>
          {props.children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
