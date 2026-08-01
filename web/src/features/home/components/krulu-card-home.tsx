/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/
import { useEffect, useState } from 'react'

import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'

const CARD_COUNT = 3

function TerminalCard() {
  const { status } = useStatus()
  const systemName = (status?.system_name as string | undefined) || ''

  return (
    <>
      <div className='krulu-terminal-toolbar'>
        <span className='krulu-window-dots' aria-hidden='true'>
          <i />
          <i />
          <i />
        </span>
        <span>codex-cli</span>
        <span>~/{systemName}</span>
      </div>
      <div className='krulu-terminal-body'>
        <div className='krulu-terminal-question'>
          <span className='krulu-terminal-prompt'>›</span>
          <span className='krulu-terminal-question-text'>
            如何接入一个新的模型？
          </span>
        </div>
        <div className='krulu-terminal-thinking'>
          <span>thinking</span>
          <i aria-hidden='true' />
        </div>
        <p className='krulu-terminal-step krulu-terminal-step-one'>
          检查端点与认证方式
        </p>
        <p className='krulu-terminal-step krulu-terminal-step-two'>
          验证可用模型与请求格式
        </p>
        <p className='krulu-terminal-step krulu-terminal-step-three'>
          生成最小接入配置
        </p>
        <div className='krulu-terminal-answer'>
          <span aria-hidden='true'>✓</span>
          <p>已生成接入方案：使用统一 Base URL 与 API Key 即可调用。</p>
        </div>
      </div>
    </>
  )
}

function ConnectionCard() {
  const { status } = useStatus()
  const serverAddress = (status?.server_address as string | undefined) || ''

  return (
    <>
      <div className='krulu-connection-heading'>
        <span>connection.setup</span>
        <i aria-hidden='true' />
      </div>
      <div className='krulu-connection-fields'>
        <div className='krulu-connection-field'>
          <span className='krulu-connection-label'>Base URL</span>
          <span className='krulu-connection-value krulu-connection-base'>
            {serverAddress}
          </span>
        </div>
        <div className='krulu-connection-field'>
          <span className='krulu-connection-label'>API Key</span>
          <span className='krulu-connection-value krulu-connection-key'>
            sk-api-••••••••••
          </span>
        </div>
      </div>
      <div className='krulu-connection-progress'>
        <i aria-hidden='true' />
        <span>正在验证端点与凭证…</span>
      </div>
      <div className='krulu-connection-success'>
        <i aria-hidden='true' />
        <div>
          <strong>连接成功</strong>
          <span>模型服务已就绪</span>
        </div>
      </div>
    </>
  )
}

export function KruluCardHome() {
  const { logo, systemName } = useSystemConfig()
  const [order, setOrder] = useState([0, 1, 2])
  const [dropping, setDropping] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let returnTimer: number | undefined
    const interval = window.setInterval(() => {
      setDropping(true)
      returnTimer = window.setTimeout(() => {
        setOrder((current) => [...current.slice(1), current[0]])
        setDropping(false)
      }, 520)
    }, 4800)

    return () => {
      window.clearInterval(interval)
      if (returnTimer !== undefined) window.clearTimeout(returnTimer)
    }
  }, [])

  const cards = [
    <div className='krulu-grok-card' key='grok'>
      <img src={logo} alt={systemName} />
    </div>,
    <div
      className='krulu-terminal-card'
      aria-label='Codex CLI 模拟运行过程'
      key='terminal'
    >
      <TerminalCard />
    </div>,
    <div
      className='krulu-connection-card'
      aria-label='正在输入 Base URL 和 API Key，随后显示连接成功'
      key='connection'
    >
      <ConnectionCard />
    </div>,
  ]

  return (
    <main className='krulu-card-home'>
      <div className='krulu-home-content'>
        <div className='krulu-home-message'>
          <h1 className='krulu-home-copy'>
            <span className='krulu-home-copy-line'>连接，</span>
            <span className='krulu-home-copy-line krulu-home-copy-line-with-cursor'>
              使用。
              <i className='krulu-copy-cursor' aria-hidden='true' />
            </span>
          </h1>
          <p className='krulu-home-tagline'>{systemName}</p>
        </div>

        <div className='krulu-card-stage'>
          <div className='card-swap-container'>
            {order.map((cardIndex, position) => {
              const isDropping = dropping && position === 0
              return (
                <div
                  key={cardIndex}
                  className='card krulu-swap-card'
                  data-card-active={position === 0 ? 'true' : 'false'}
                  style={{
                    zIndex: CARD_COUNT - position,
                    opacity: isDropping ? 0 : 1,
                    transform: `translate(-50%, -50%) translate3d(${position * 28}px, ${isDropping ? 360 : position * -34}px, ${position * -42}px) skewY(3deg)`,
                  }}
                >
                  {cards[cardIndex]}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
