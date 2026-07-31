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
  LogOut,
  UserRound,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationPopover } from '@/components/notification-popover'
import { SignOutDialog } from '@/components/sign-out-dialog'
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
  const { navGroups } = useSidebarView()
  const notifications = useNotifications()
  const panelRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [tooltip, setTooltip] = useState<DockTooltip | null>(null)

  const isCommonUser = !!user && user.role < ROLE.ADMIN

  const standardItems = useMemo<DockLinkItem[]>(() => {
    const items: DockLinkItem[] = [
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
      items.splice(1, 0, {
        key: 'console',
        title: t('Console'),
        href: '/dashboard',
        icon: <LayoutDashboard />,
      })
      items.push({
        key: 'profile',
        title: t('Profile'),
        href: '/profile',
        icon: <UserRound />,
      })
    } else {
      items.push({
        key: 'login',
        title: t('Login'),
        href: '/sign-in',
        icon: <UserRound />,
      })
    }

    return items
  }, [t, user])

  const userItems = useMemo<DockLinkItem[]>(() => {
    const items: DockLinkItem[] = [
      {
        key: 'home',
        title: t('Home'),
        href: '/',
        icon: <Home />,
      },
    ]

    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        const links = isDockLinkItem(item) ? [item] : item.items
        links.forEach((link) => {
          if (!link.url || !link.icon) return
          const Icon = link.icon
          items.push({
            key: String(link.url),
            title: link.title,
            href: String(link.url),
            icon: <Icon />,
            activeUrls: link.activeUrls?.map(String),
          })
        })
      })
    })

    return items
  }, [navGroups, t])

  const items = isCommonUser ? userItems : standardItems

  const updateMagnification = useCallback((clientX: number | null) => {
    const panel = panelRef.current
    if (!panel) return

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = window.requestAnimationFrame(() => {
      panel.querySelectorAll<HTMLElement>('.krulu-dock-item').forEach((item) => {
        const rect = item.getBoundingClientRect()
        const distance =
          clientX === null
            ? MAGNIFICATION_DISTANCE
            : Math.abs(clientX - (rect.left + rect.width / 2))
        const influence = Math.max(0, 1 - distance / MAGNIFICATION_DISTANCE)
        const size =
          BASE_ITEM_SIZE +
          (MAGNIFIED_ITEM_SIZE - BASE_ITEM_SIZE) * influence
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
        </Link>
      </div>
    )
  }

  return (
    <>
      <div
        className='krulu-dock-outer'
        data-user-dock={isCommonUser ? '' : undefined}
        data-user-dock-guest={!user ? '' : undefined}
      >
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

        {isCommonUser && (
          <div className='krulu-dock-panel krulu-dock-panel-secondary'>
            <div
              className='krulu-dock-item'
              onMouseEnter={(event) =>
                showTooltip(event.currentTarget, t('Notifications'))
              }
              onMouseLeave={() => setTooltip(null)}
              onFocusCapture={(event) =>
                showTooltip(event.currentTarget as HTMLElement, t('Notifications'))
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

      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  )
}
