/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { createFileRoute } from '@tanstack/react-router'

import { redirectReferenceSettingsRoute } from '@/lib/reference-settings-route'

export const Route = createFileRoute('/site/')({
  beforeLoad: ({ location }) =>
    redirectReferenceSettingsRoute(location, 'site'),
})
