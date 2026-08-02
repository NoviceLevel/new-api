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
along with this program. If not, see <https://www.gnu.org/licenses/>

For commercial licensing, please contact support@quantumnous.com
*/
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Copy, RefreshCw, TicketCheck, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import {
  createInvitations,
  deleteInvitation,
  getInvitations,
  updateInvitationStatus,
} from './api'
import { INVITATION_STATUS, type Invitation } from './types'

const PAGE_SIZE = 20

function invitationStatusMeta(status: number) {
  if (status === INVITATION_STATUS.AVAILABLE) {
    return {
      label: 'Available',
      className:
        'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    }
  }
  if (status === INVITATION_STATUS.DISABLED) {
    return {
      label: 'Disabled',
      className:
        'border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
    }
  }
  return {
    label: 'Used',
    className: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  }
}

function formatTime(value: number) {
  if (!value) return '-'
  return dayjs.unix(value).format('YYYY-MM-DD HH:mm')
}

function StatusBadge({ status }: { status: number }) {
  const { t } = useTranslation()
  const meta = invitationStatusMeta(status)
  return (
    <Badge variant='outline' className={meta.className}>
      {t(meta.label)}
    </Badge>
  )
}

export function Invitations() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState(t('Default invitation batch'))
  const [count, setCount] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  const statusNumber = status === 'all' ? undefined : Number(status)
  const invitationsQueryKey = useMemo(
    () => ['invitations', page, keyword, statusNumber],
    [keyword, page, statusNumber]
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: invitationsQueryKey,
    queryFn: async () => {
      const result = await getInvitations({
        p: page,
        page_size: PAGE_SIZE,
        keyword: keyword.trim() || undefined,
        status: statusNumber,
      })
      if (!result.success) {
        throw new Error(result.message || t('Failed to load invitation codes'))
      }
      return result.data ?? { items: [], total: 0, page, page_size: PAGE_SIZE }
    },
  })

  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const invitations = data?.items ?? []

  const refreshInvitations = () => {
    void queryClient.invalidateQueries({ queryKey: ['invitations'] })
  }

  const createMutation = useMutation({
    mutationFn: createInvitations,
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t('Failed to create invitation codes'))
        return
      }
      setGeneratedCodes(result.data ?? [])
      setName(t('Default invitation batch'))
      setCount(1)
      setPage(1)
      toast.success(t('Invitation codes created successfully'))
      refreshInvitations()
    },
    onError: (error) => {
      toast.error(error.message || t('Failed to create invitation codes'))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: number }) =>
      updateInvitationStatus(id, nextStatus),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t('Failed to update invitation code'))
        return
      }
      toast.success(t('Invitation code updated successfully'))
      refreshInvitations()
    },
    onError: (error) => {
      toast.error(error.message || t('Failed to update invitation code'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInvitation,
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t('Failed to delete invitation code'))
        return
      }
      toast.success(t('Invitation code deleted successfully'))
      refreshInvitations()
    },
    onError: (error) => {
      toast.error(error.message || t('Failed to delete invitation code'))
    },
  })

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || trimmedName.length > 40 || count < 1 || count > 100) {
      toast.error(t('Name must be 1-40 characters and count must be 1-100'))
      return
    }
    createMutation.mutate({ name: trimmedName, count })
  }

  const copyCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      toast.success(t('Copied to clipboard'))
    } catch {
      toast.error(t('Failed to copy invitation codes'))
    }
  }

  const toggleInvitation = (invitation: Invitation) => {
    const nextStatus =
      invitation.status === INVITATION_STATUS.AVAILABLE
        ? INVITATION_STATUS.DISABLED
        : INVITATION_STATUS.AVAILABLE
    statusMutation.mutate({ id: invitation.id, nextStatus })
  }

  const confirmDelete = (invitation: Invitation) => {
    if (!window.confirm(t('Delete this invitation code?'))) return
    deleteMutation.mutate(invitation.id)
  }

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>{t('Invitation Codes')}</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button
          variant='outline'
          onClick={refreshInvitations}
          disabled={isFetching}
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          {t('Refresh')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='grid gap-4 xl:grid-cols-[360px_1fr]'>
          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TicketCheck className='text-primary size-5' />
                  {t('Create invitation codes')}
                </CardTitle>
                <CardDescription>
                  {t(
                    'Full invitation codes are shown only once after creation.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className='grid gap-4' onSubmit={handleCreate}>
                  <div className='grid gap-2'>
                    <Label htmlFor='invitation-name'>{t('Name')}</Label>
                    <Input
                      id='invitation-name'
                      value={name}
                      maxLength={40}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='invitation-count'>{t('Count')}</Label>
                    <Input
                      id='invitation-count'
                      type='number'
                      min={1}
                      max={100}
                      value={count}
                      onChange={(event) =>
                        setCount(Number(event.target.value) || 1)
                      }
                    />
                  </div>
                  <Button type='submit' disabled={createMutation.isPending}>
                    {createMutation.isPending ? t('Creating...') : t('Create')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {generatedCodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('New invitation codes')}</CardTitle>
                  <CardDescription>
                    {t('Copy and save them now. They cannot be viewed again.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='bg-muted/40 max-h-56 overflow-auto rounded-lg border p-3 font-mono text-xs leading-6'>
                    {generatedCodes.map((code) => (
                      <div key={code}>{code}</div>
                    ))}
                  </div>
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={() => copyCodes(generatedCodes)}
                  >
                    <Copy className='size-4' />
                    {t('Copy all')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className='min-w-0'>
            <CardHeader>
              <CardTitle>{t('Invitation code list')}</CardTitle>
              <CardDescription>
                {t(
                  'Available codes can be disabled. Used codes are locked and cannot be reused.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                <Input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value)
                    setPage(1)
                  }}
                  placeholder={t('Search by name or prefix')}
                  className='md:max-w-xs'
                />
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value)
                    setPage(1)
                  }}
                  className='border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3'
                >
                  <option value='all'>{t('All statuses')}</option>
                  <option value={String(INVITATION_STATUS.AVAILABLE)}>
                    {t('Available')}
                  </option>
                  <option value={String(INVITATION_STATUS.DISABLED)}>
                    {t('Disabled')}
                  </option>
                  <option value={String(INVITATION_STATUS.USED)}>
                    {t('Used')}
                  </option>
                </select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ID')}</TableHead>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('Code prefix')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Created by')}</TableHead>
                    <TableHead>{t('Used by')}</TableHead>
                    <TableHead>{t('Created at')}</TableHead>
                    <TableHead>{t('Used at')}</TableHead>
                    <TableHead className='text-right'>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className='text-center'>
                        {t('Loading...')}
                      </TableCell>
                    </TableRow>
                  ) : invitations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className='text-muted-foreground text-center'
                      >
                        {t('No invitation codes found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.id}</TableCell>
                        <TableCell className='font-medium'>
                          {invitation.name}
                        </TableCell>
                        <TableCell className='font-mono'>
                          {invitation.code_prefix}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invitation.status} />
                        </TableCell>
                        <TableCell>{invitation.created_by || '-'}</TableCell>
                        <TableCell>{invitation.used_by || '-'}</TableCell>
                        <TableCell>
                          {formatTime(invitation.created_at)}
                        </TableCell>
                        <TableCell>{formatTime(invitation.used_at)}</TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            {invitation.status !== INVITATION_STATUS.USED && (
                              <>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => toggleInvitation(invitation)}
                                  disabled={statusMutation.isPending}
                                >
                                  {invitation.status ===
                                  INVITATION_STATUS.AVAILABLE
                                    ? t('Disable')
                                    : t('Enable')}
                                </Button>
                                <Button
                                  size='icon-sm'
                                  variant='destructive'
                                  onClick={() => confirmDelete(invitation)}
                                  disabled={deleteMutation.isPending}
                                  aria-label={t('Delete')}
                                >
                                  <Trash2 className='size-4' />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className='text-muted-foreground flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between'>
                <span>
                  {t('Total')}: {total}
                </span>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1}
                  >
                    {t('Previous')}
                  </Button>
                  <span>
                    {page} / {pageCount}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setPage((value) => Math.min(pageCount, value + 1))
                    }
                    disabled={page >= pageCount}
                  >
                    {t('Next')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
