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
import type { LucideIcon } from 'lucide-react'
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
/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { stringToColor } from '@/lib/colors'
import { cn } from '@/lib/utils'

export const dotColorMap = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-neutral',
  purple: 'bg-chart-4',
  amber: 'bg-warning',
  blue: 'bg-chart-1',
  cyan: 'bg-chart-2',
  green: 'bg-success',
  grey: 'bg-neutral',
  indigo: 'bg-chart-1',
  'light-blue': 'bg-info',
  'light-green': 'bg-emerald-400',
  lime: 'bg-chart-3',
  orange: 'bg-warning',
  pink: 'bg-chart-5',
  red: 'bg-destructive',
  teal: 'bg-chart-2',
  violet: 'bg-chart-4',
  yellow: 'bg-warning',
} as const

export const textColorMap = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  neutral: 'text-muted-foreground',
  purple: 'text-chart-4',
  amber: 'text-warning',
  blue: 'text-chart-1',
  cyan: 'text-chart-2',
  green: 'text-success',
  grey: 'text-muted-foreground',
  indigo: 'text-chart-1',
  'light-blue': 'text-info',
  'light-green': 'text-emerald-500 dark:text-emerald-300',
  lime: 'text-chart-3',
  orange: 'text-warning',
  pink: 'text-chart-5',
  red: 'text-destructive',
  teal: 'text-chart-2',
  violet: 'text-chart-4',
  yellow: 'text-warning',
} as const

export const bgVariantMap = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  'light-green': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  orange: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  yellow: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
  red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
  neutral: 'bg-muted/80 text-muted-foreground border-border/60',
  grey: 'bg-muted/80 text-muted-foreground border-border/60',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
  'light-blue': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
  lime: 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/25',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25',
} as const

export type StatusVariant = keyof typeof dotColorMap

/** Controls the visual style of the badge.
 * - `badge`    — default pill with background and padding (default)
 * - `text`     — plain text, no background or padding, only color
 * - `underline`— plain text with a bottom border underline
 */
export type StatusBadgeType = 'badge' | 'text' | 'underline'

/** Context that lets ancestor components (e.g. MobileCardList field area)
 *  override the badge type without modifying every call site. */
export const StatusBadgeTypeContext =
  React.createContext<StatusBadgeType>('badge')

const sizeMap = {
  sm: 'h-5 gap-1 px-1.5 text-sm leading-none',
  md: 'h-5 gap-1 px-1.5 text-sm leading-none',
  lg: 'h-6 gap-1.5 px-2 text-sm leading-none',
} as const

const textSizeMap = {
  sm: 'gap-1 text-sm leading-none',
  md: 'gap-1 text-sm leading-none',
  lg: 'gap-1.5 text-sm leading-none',
} as const

export interface StatusBadgeProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  label?: string
  children?: React.ReactNode
  icon?: LucideIcon
  pulse?: boolean
  /** Kept for compatibility. Badges no longer render leading dots. */
  showDot?: boolean
  variant?: StatusVariant | null
  size?: 'sm' | 'md' | 'lg' | null
  copyable?: boolean
  copyText?: string
  autoColor?: string
  /** Visual style. Defaults to 'badge'. Can be overridden via StatusBadgeTypeContext. */
  type?: StatusBadgeType
}

export function StatusBadge({
  label,
  children,
  icon: Icon,
  variant,
  size = 'sm',
  pulse = false,
  showDot = false,
  copyable = true,
  copyText,
  autoColor,
  type: typeProp,
  className,
  onClick,
  ...props
}: StatusBadgeProps) {
  const { copyToClipboard } = useCopyToClipboard()
  const contextType = React.useContext(StatusBadgeTypeContext)
  const type = typeProp ?? contextType

  const computedVariant: StatusVariant = autoColor
    ? (stringToColor(autoColor) as StatusVariant)
    : (variant ?? 'neutral')

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (copyable) {
      e.stopPropagation()
      copyToClipboard(copyText || label || '')
    }
    onClick?.(e)
  }

  const content =
    children ??
    (label ? (
      <span className='min-w-0 truncate leading-normal'>{label}</span>
    ) : null)

  const isBadge = type === 'badge'
  const title = copyable
    ? `Click to copy: ${copyText || label || ''}`
    : label || undefined

  return (
    <span
      data-slot='status-badge'
      className={cn(
        'inline-flex w-fit max-w-full min-w-0 shrink items-center font-medium tracking-normal whitespace-nowrap transition-all',
        isBadge
          ? cn('rounded-full border px-2.5 shadow-2xs', sizeMap[size ?? 'sm'], bgVariantMap[computedVariant] ?? textColorMap[computedVariant])
          : cn(
              textSizeMap[size ?? 'sm'],
              textColorMap[computedVariant],
              type === 'underline' && 'border-b border-current pb-px'
            ),
        pulse && 'animate-pulse',
        copyable &&
          'cursor-copy hover:brightness-95 active:scale-95 dark:hover:brightness-110',
        className
      )}
      onClick={handleClick}
      title={title}
      {...props}
    >
      {showDot && (
        <span className='relative flex size-2 items-center justify-center shrink-0 me-0.5' aria-hidden='true'>
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                dotColorMap[computedVariant]
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              dotColorMap[computedVariant]
            )}
          />
        </span>
      )}
      {Icon && <Icon className='size-3.5 shrink-0' />}
      {content}
    </span>
  )
}

export interface StatusBadgeListProps<T> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  empty?: React.ReactNode
  getKey?: (item: T, index: number) => React.Key
  items: T[]
  max?: number
  moreLabel?: (remaining: number) => string
  renderItem: (item: T, index: number) => React.ReactNode
}

export function StatusBadgeList<T>(props: StatusBadgeListProps<T>) {
  const {
    className,
    empty = <span className='text-muted-foreground text-xs'>-</span>,
    getKey,
    items,
    max = 2,
    moreLabel,
    renderItem,
    ...domProps
  } = props

  if (items.length === 0) {
    return empty
  }

  const displayed = items.slice(0, max)
  const remaining = items.length - max

  return (
    <div
      className={cn(
        'flex max-w-full min-w-0 items-center gap-1 overflow-hidden',
        className
      )}
      {...domProps}
    >
      {displayed.map((item, index) => (
        <React.Fragment key={getKey?.(item, index) ?? index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
      {remaining > 0 && (
        <StatusBadge
          label={moreLabel?.(remaining) ?? `+${remaining}`}
          variant='neutral'
          size='sm'
          copyable={false}
          className='shrink-0'
        />
      )}
    </div>
  )
}

export const statusPresets = {
  active: {
    variant: 'success' as const,
    label: 'Active',
  },
  inactive: {
    variant: 'neutral' as const,
    label: 'Inactive',
  },
  invited: {
    variant: 'info' as const,
    label: 'Invited',
  },
  suspended: {
    variant: 'danger' as const,
    label: 'Suspended',
  },
  pending: {
    variant: 'warning' as const,
    label: 'Pending',
    pulse: true,
  },
} as const

export type StatusPreset = keyof typeof statusPresets
