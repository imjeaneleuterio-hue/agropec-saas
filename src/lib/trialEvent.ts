export function triggerTrialExhausted(module: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trial:exhausted', { detail: { module } }))
  }
}

export function handleTrialResponse(data: { trialExhausted?: boolean; module?: string; error?: string }): boolean {
  if (data.trialExhausted && data.module) {
    triggerTrialExhausted(data.module)
    return true
  }
  return false
}
