/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getUserDockDestinationOrder } from '../components/navigation-dock-utils'

describe('navigation dock destinations', () => {
  test('keeps the user dock in sidebar order with home first', () => {
    const destinations = getUserDockDestinationOrder([
      {
        items: [
          { title: 'Overview', url: '/dashboard/overview' },
          {
            title: 'Personal',
            items: [
              { title: 'Profile', url: '/profile' },
              { title: 'Wallet', url: '/wallet' },
            ],
          },
        ],
      },
    ])

    assert.deepEqual(destinations, [
      '/',
      '/dashboard/overview',
      '/profile',
      '/wallet',
    ])
  })

  test('does not add navigation entries from an empty group', () => {
    const destinations = getUserDockDestinationOrder([
      {
        items: [{ title: 'Empty group', items: [] }],
      },
    ])

    assert.deepEqual(destinations, ['/'])
  })
})
