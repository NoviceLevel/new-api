/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { Link, useLocation } from '@tanstack/react-router'
import {
  Boxes,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  ScanFace,
  UserRound,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationPopover } from '@/components/notification-popover'
import { SignOutDialog } from '@/components/sign-out-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useNotifications } from '@/hooks/use-notifications'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { isDockLinkItem } from './navigation-dock-utils'

const BASE_ITEM_SIZE = 50
const MAGNIFIED_ITEM_SIZE = 70
const MAGNIFICATION_DISTANCE = 140

type DockLinkItem = {
  key: string
  title: string
  href: string
  icon: React.ReactNode
  activeUrls?: string[]
}

type DockTooltip = {
  label: string
  left: number
  top: number
}

function isItemActive(pathname: string, item: DockLinkItem): boolean {
  const paths = [item.href, ...(item.activeUrls ?? [])]
  return paths.some((path) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(`${path}/`)
  })
}

export function NavigationDock() {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const user = useAuthStore((state) => state.auth.user)
  const isCommonUser = !!user && user.role < ROLE.ADMIN
  const { navGroups } = useSidebarView()
  const notifications = useNotifications({ enabled: !!user })
  const panelRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [tooltip, setTooltip] = useState<DockTooltip | null>(null)

  const items = useMemo<DockLinkItem[]>(() => {
    const list: DockLinkItem[] = [
      {
        key: 'home',
        title: t('Home'),
        href: '/',
        icon: <Home />,
      },
      {
        key: 'pricing',
        title: t('Model Square'),
        href: '/pricing',
        icon: <Boxes />,
      },
    ]

    if (user) {
      list.splice(1, 0, {
        key: 'console',
        title: t('Console'),
        href: '/dashboard',
        icon: <LayoutDashboard />,
      })
      list.push({
        key: 'profile',
        title: t('Profile'),
        href: '/profile',
        icon: <UserRound />,
      })
    } else {
      list.push({
        key: 'login',
        title: t('Login'),
        href: '/sign-in',
        icon: <ScanFace />,
      })
    }

    return list
  }, [t, user])

  const updateMagnification = useCallback((clientX: number | null) => {
    const panel = panelRef.current
    if (!panel) return

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = window.requestAnimationFrame(() => {
      panel
        .querySelectorAll<HTMLElement>('.krulu-dock-item')
        .forEach((item) => {
          const rect = item.getBoundingClientRect()
          const distance =
            clientX === null
              ? MAGNIFICATION_DISTANCE
              : Math.abs(clientX - (rect.left + rect.width / 2))
          const influence = Math.max(0, 1 - distance / MAGNIFICATION_DISTANCE)
          const size =
            BASE_ITEM_SIZE + (MAGNIFIED_ITEM_SIZE - BASE_ITEM_SIZE) * influence
          item.style.setProperty('--user-dock-size', `${size}px`)
        })
      frameRef.current = null
    })
  }, [])

  const showTooltip = useCallback((element: HTMLElement, label: string) => {
    const rect = element.getBoundingClientRect()
    setTooltip({
      label,
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    })
  }, [])

  const renderDockLink = (item: DockLinkItem) => {
    const active = isItemActive(pathname, item)
    return (
      <div
        key={item.key}
        className='krulu-dock-item'
        onMouseEnter={(event) => showTooltip(event.currentTarget, item.title)}
        onFocusCapture={(event) =>
          showTooltip(event.currentTarget as HTMLElement, item.title)
        }
        onBlurCapture={() => setTooltip(null)}
      >
        <Link
          to={item.href}
          aria-current={active ? 'page' : undefined}
          aria-label={item.title}
          data-status={active ? 'active' : undefined}
          className={cn('krulu-dock-link', active && 'krulu-dock-link-active')}
        >
          <span className='krulu-dock-icon' aria-hidden='true'>
            {item.icon}
          </span>
          {active && <span className='krulu-dock-active-dot' />}
        </Link>
      </div>
    )
  }

  const hasExtraNav = navGroups.some((group) => group.items.length > 0)

  return (
    <>
      <div
        className='krulu-dock-outer'
        data-user-dock={isCommonUser ? '' : undefined}
        data-user-dock-guest={!user ? '' : undefined}
      >
        <div className='krulu-dock-scroll'>
          <nav
            ref={panelRef}
            className='krulu-dock-panel'
            aria-label={t('Primary navigation')}
            onMouseMove={(event) => updateMagnification(event.clientX)}
            onMouseLeave={() => {
              updateMagnification(null)
              setTooltip(null)
            }}
          >
            {items.map(renderDockLink)}

            {user && hasExtraNav && (
              <div
                className='krulu-dock-item'
                onMouseEnter={(event) =>
                  showTooltip(event.currentTarget, t('Navigation'))
                }
                onFocusCapture={(event) =>
                  showTooltip(event.currentTarget as HTMLElement, t('Navigation'))
                }
                onBlurCapture={() => setTooltip(null)}
              >
                <button
                  type='button'
                  className='krulu-dock-link'
                  aria-label={t('Navigation')}
                  onClick={() => setMoreOpen(true)}
                >
                  <span className='krulu-dock-icon' aria-hidden='true'>
                    <LayoutGrid />
                  </span>
                </button>
              </div>
            )}

            {isCommonUser && (
              <div
                className='krulu-dock-item'
                onMouseEnter={(event) =>
                  showTooltip(event.currentTarget, t('Sign out'))
                }
                onFocusCapture={(event) =>
                  showTooltip(event.currentTarget as HTMLElement, t('Sign out'))
                }
                onBlurCapture={() => setTooltip(null)}
              >
                <button
                  type='button'
                  className='krulu-dock-link'
                  aria-label={t('Sign out')}
                  onClick={() => setSignOutOpen(true)}
                >
                  <span className='krulu-dock-icon' aria-hidden='true'>
                    <LogOut />
                  </span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {isCommonUser && (
          <div className='krulu-dock-panel krulu-dock-panel-secondary'>
            <div
              className='krulu-dock-item'
              onMouseEnter={(event) =>
                showTooltip(event.currentTarget, t('Notifications'))
              }
              onMouseLeave={() => setTooltip(null)}
              onFocusCapture={(event) =>
                showTooltip(
                  event.currentTarget as HTMLElement,
                  t('Notifications')
                )
              }
              onBlurCapture={() => setTooltip(null)}
            >
              <NotificationPopover
                open={notifications.popoverOpen}
                onOpenChange={notifications.setPopoverOpen}
                unreadCount={notifications.unreadCount}
                activeTab={notifications.activeTab}
                onTabChange={notifications.setActiveTab}
                notice={notifications.notice}
                announcements={notifications.announcements}
                loading={notifications.loading}
                className='krulu-dock-link'
              />
            </div>
          </div>
        )}
      </div>

      {tooltip && (
        <div
          className='krulu-user-dock-tooltip'
          data-visible=''
          aria-hidden='true'
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          {tooltip.label}
        </div>
      )}

      {/* Navigation Drawer Sheet for extra links */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side='bottom'
          className='mx-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-4'
        >
          <SheetHeader className='border-b pb-3'>
            <SheetTitle className='text-base font-semibold'>
              {t('Navigation')}
            </SheetTitle>
          </SheetHeader>

          <div className='flex flex-col gap-4 py-3'>
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className='flex flex-col gap-2'>
                {group.title && (
                  <span className='text-muted-foreground px-1 text-xs font-semibold uppercase tracking-wider'>
                    {group.title}
                  </span>
                )}
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                  {group.items.map((item) => {
                    const links = isDockLinkItem(item) ? [item] : (item.items || [])
                    return links.map((link) => {
                      if (!link.url) return null
                      const Icon = (link.icon as React.ComponentType<{ className?: string }>) || LayoutGrid
                      const active =
                        pathname === link.url ||
                        pathname.startsWith(`${link.url}/`)
                      return (
                        <Link
                          key={String(link.url)}
                          to={String(link.url)}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl border p-2.5 text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                              : 'hover:bg-muted/80 border-border/40 text-foreground/80'
                          )}
                        >
                          <Icon className='size-4 shrink-0' />
                          <span className='truncate'>{link.title}</span>
                        </Link>
                      )
                    })
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  )
}
