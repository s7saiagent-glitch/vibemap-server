import { useEffect, useRef, useCallback } from 'react'

interface ProctoringOptions {
  enabled: boolean
  onViolation: (type: string, count: number) => void
  maxViolations?: number
}

export function useProctoring({ enabled, onViolation, maxViolations = 3 }: ProctoringOptions) {
  const violationCount = useRef(0)
  const tabSwitches = useRef(0)

  const recordViolation = useCallback((type: string) => {
    violationCount.current++
    onViolation(type, violationCount.current)
  }, [onViolation])

  useEffect(() => {
    if (!enabled) return

    // Tab switch / visibility detection
    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitches.current++
        recordViolation('tab_switch')
      }
    }

    // Copy/paste detection
    const handleCopy = () => recordViolation('copy')
    const handlePaste = () => recordViolation('paste')

    // Right-click prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      recordViolation('right_click')
    }

    // Keyboard shortcuts (F12, ctrl+c, ctrl+v, ctrl+u, etc.)
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); recordViolation('devtools') }
      if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); recordViolation('devtools') }
      if (e.ctrlKey && e.key === 'u') { e.preventDefault(); recordViolation('view_source') }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); recordViolation('print') }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [enabled, recordViolation])

  // maxViolations is available for callers who want to react when threshold is hit
  void maxViolations

  return { violationCount: violationCount.current, tabSwitches: tabSwitches.current }
}
