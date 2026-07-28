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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className='text-foreground grid min-h-svh bg-[#f9f9f7] lg:grid-cols-2 dark:bg-[#05080a]'>
      {/* Left — editorial headline + carded auth form. */}
      <div className='relative flex flex-col justify-center px-6 py-20 sm:px-10 lg:px-16'>
        <Link
          to='/'
          className='absolute top-6 left-6 flex items-center gap-2 transition-opacity hover:opacity-80 sm:top-8 sm:left-8'
        >
          {loading ? (
            <Skeleton className='h-8 w-8 rounded-full' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='h-8 w-8 rounded-full object-cover'
            />
          )}
          {loading ? (
            <Skeleton className='h-6 w-24' />
          ) : (
            <span className='text-lg font-medium tracking-tight'>
              {systemName}
            </span>
          )}
        </Link>

        <div className='mx-auto w-full max-w-[400px]'>
          <h1 className='font-serif text-[2.75rem] leading-[1.05] font-normal tracking-tight text-balance sm:text-5xl'>
            {t('Your unified gateway to every AI model.')}
          </h1>

          <div className='mt-9 rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.04),0_10px_30px_-16px_rgba(20,20,20,0.18)] sm:p-7 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none'>
            {children}
          </div>
        </div>
      </div>

      {/* Right — contained key-visual card, centered with breathing room
          around it (not full-bleed), mirroring the claude.ai login. */}
      <div className='hidden items-center justify-center p-8 lg:flex xl:p-12'>
        <div className='bg-muted relative aspect-[4/5] w-full max-w-[580px] overflow-hidden rounded-[1rem] grayscale'>
          <img
            src='/seraph-cinematic.jpg'
            alt=''
            aria-hidden
            className='size-full object-cover object-center'
          />
        </div>
      </div>
    </div>
  )
}
