/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import type { NavItem } from '@/components/layout/types'

export function isDockLinkItem(
  item: NavItem
): item is Extract<NavItem, { url: unknown }> {
  return 'url' in item && typeof item.url === 'string'
}

export function getUserDockDestinationOrder(
  navGroups: ReadonlyArray<{ items: NavItem[] }>
): string[] {
  const destinations = ['/']
  navGroups.forEach((group) => {
    group.items.forEach((item) => {
      const links = isDockLinkItem(item) ? [item] : item.items
      links.forEach((link) => {
        if (link.url) destinations.push(String(link.url))
      })
    })
  })
  return destinations
}
