'use client'

import { useEffect, useRef, useState } from 'react'

const SCRAMBLE_CHARS = '!@#$%^&*<>?/|[]{}~0123456789'
const CYCLE_MS       = 3800  // time between new pair
const SPIN_MS        = 480   // emoji spin duration
const SPIN_FRAME_MS  = 75    // ms per emoji frame while spinning
const UNSCRAMBLE_MS  = 700   // text unscramble duration
const UNSCRAMBLE_TICK = 40   // repaint interval during unscramble

const SCRAPE_PAIRS: [string, string][] = [
  ['🔍', 'Interrogating the job board...'],
  ['📖', 'Reading the fine print...'],
  ['🤖', 'Deploying AI overlords...'],
  ['☕', 'Brewing digital coffee...'],
  ['🧠', 'Thinking very hard...'],
  ['👾', 'Alien intelligence online...'],
  ['📊', 'Counting your buzzwords...'],
  ['🔬', 'Analyzing requirements...'],
  ['💼', 'Checking corporate speak...'],
  ['🎯', 'Targeting the good stuff...'],
  ['🚀', 'Almost there... probably'],
  ['🤔', 'Hmm, interesting choice of job...'],
]

const TAILOR_PAIRS: [string, string][] = [
  ['✨', 'Briefing the AI on your career...'],
  ['🎯', 'Matching skills to requirements...'],
  ['🧠', 'Deep in thought...'],
  ['📝', 'Drafting suggestions...'],
  ['🤖', 'Robot reviewer engaged...'],
  ['🚀', 'Polishing your narrative...'],
  ['🃏', 'Playing your best cards...'],
]

const SPIN_POOL = ['🔍','📖','🤖','☕','🧠','👾','📊','🔬','💼','🎯','🚀','✨','📝','🃏','💫','⚡','🎲']

function scrambleText(target: string, progress: number): string {
  return target
    .split('')
    .map((char, i) => {
      if (char === ' ') return ' '
      if (i / target.length <= progress) return char
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    })
    .join('')
}

interface SlotMachineLoaderProps {
  variant: 'scrape' | 'tailor'
}

export function SlotMachineLoader({ variant }: SlotMachineLoaderProps) {
  const pairs = variant === 'scrape' ? SCRAPE_PAIRS : TAILOR_PAIRS
  const indexRef = useRef(0)
  const [emoji, setEmoji] = useState(pairs[0][0])
  const [text, setText] = useState(pairs[0][1])

  useEffect(() => {
    let spinTimer: ReturnType<typeof setInterval> | null = null
    let unscrambleTimer: ReturnType<typeof setTimeout> | null = null

    function triggerCycle() {
      indexRef.current = (indexRef.current + 1) % pairs.length
      const [nextEmoji, nextMessage] = pairs[indexRef.current]

      // Phase 1 — spin emoji through random pool, then land
      let spun = 0
      const maxSpins = Math.floor(SPIN_MS / SPIN_FRAME_MS)
      spinTimer = setInterval(() => {
        spun++
        if (spun >= maxSpins) {
          clearInterval(spinTimer!)
          setEmoji(nextEmoji)
        } else {
          setEmoji(SPIN_POOL[Math.floor(Math.random() * SPIN_POOL.length)])
        }
      }, SPIN_FRAME_MS)

      // Phase 2 — unscramble text (starts immediately alongside spin)
      const start = Date.now()
      function unscrambleStep() {
        const progress = Math.min((Date.now() - start) / UNSCRAMBLE_MS, 1)
        setText(progress < 1 ? scrambleText(nextMessage, progress) : nextMessage)
        if (progress < 1) unscrambleTimer = setTimeout(unscrambleStep, UNSCRAMBLE_TICK)
      }
      unscrambleStep()
    }

    const cycleTimer = setInterval(triggerCycle, CYCLE_MS)
    return () => {
      clearInterval(cycleTimer)
      if (spinTimer) clearInterval(spinTimer)
      if (unscrambleTimer) clearTimeout(unscrambleTimer)
    }
  }, [pairs])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '28px 16px',
      }}
    >
      <div style={{ fontSize: '44px', lineHeight: 1, userSelect: 'none' }}>{emoji}</div>
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '13px',
          color: 'var(--color-muted)',
          letterSpacing: '0.03em',
          minWidth: '260px',
          textAlign: 'center',
          minHeight: '20px',
        }}
      >
        {text}
      </div>
    </div>
  )
}
