/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { redirect } from '@tanstack/react-router'

type ReferenceSettingsArea =
  | 'auth'
  | 'billing'
  | 'content'
  | 'operations'
  | 'security'
  | 'site'

interface LocationLike {
  href: string
}

export function redirectReferenceSettingsRoute(
  location: LocationLike,
  area: ReferenceSettingsArea,
  section?: string
): never {
  const source = new URL(location.href, 'https://reference-route.invalid')
  const path = section
    ? `/system-settings/${area}/${section}`
    : `/system-settings/${area}`

  throw redirect({
    href: `${path}${source.search}${source.hash}`,
    replace: true,
  })
}
