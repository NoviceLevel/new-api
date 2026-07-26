/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import { useReducedMotion } from 'motion/react'

import { useStatus } from '@/hooks/use-status'

import { GridDistortion } from '../grid-distortion'

export function Hero() {
  const reduceMotion = useReducedMotion()
  const shouldReduceMotion = reduceMotion === true
  const { status } = useStatus()
  const systemName = (status?.system_name as string | undefined) || 'Krulu'

  return (
    <main className='dark bg-[#05080a] text-white'>
      <section className='relative h-svh min-h-[38rem] overflow-hidden bg-[#071015]'>
        <picture className='absolute inset-0 size-full'>
          <source media='(max-width: 639px)' srcSet='/seraph-cinematic.jpg' />
          <img
            src='/seraph-wide.jpg'
            alt='Seraph of the End key visual'
            className='size-full object-cover object-center'
          />
        </picture>

        {!shouldReduceMotion && (
          <GridDistortion
            imageSrc='/seraph-wide.jpg'
            mobileImageSrc='/seraph-cinematic.jpg'
            revealDelayMs={0}
          />
        )}

        <div
          aria-hidden
          className='absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,9,0.72)_0%,rgba(3,7,9,0.06)_26%,rgba(3,7,9,0.02)_64%,#05080a_100%)]'
        />
        <div
          aria-hidden
          className='absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,8,0.28)_0%,transparent_38%,transparent_76%,rgba(2,6,8,0.18)_100%)]'
        />

        <h1 className='sr-only'>{systemName}</h1>

        <div
          aria-hidden
          className='absolute inset-x-0 bottom-0 h-px bg-white/20'
        />
      </section>
    </main>
  )
}
