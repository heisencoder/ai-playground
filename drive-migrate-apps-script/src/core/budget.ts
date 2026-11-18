import type { Clock } from './model'

const MS_PER_MINUTE = 60_000
/** Reading the stop flag costs a storage round trip, so do it sparingly. */
const STOP_POLL_MS = 5_000

/**
 * How long one execution may keep working. Apps Script kills an execution at
 * six minutes without warning, so long jobs check `expired()` between units of
 * work, save their place, and let a later execution carry on.
 */
export class Budget {
  private readonly deadline: number
  private lastStopPoll = Number.NEGATIVE_INFINITY
  private stopped = false

  constructor(
    private readonly clock: Clock,
    minutes: number,
    private readonly stopRequested: () => boolean = () => false
  ) {
    this.deadline = clock.now() + minutes * MS_PER_MINUTE
  }

  /** True once the time is used up or someone chose Stop from the menu. */
  expired(): boolean {
    const now = this.clock.now()
    if (now >= this.deadline) {
      return true
    }
    if (!this.stopped && now - this.lastStopPoll >= STOP_POLL_MS) {
      this.lastStopPoll = now
      this.stopped = this.stopRequested()
    }
    return this.stopped
  }

  /** True when the run ended because of the Stop menu item, not the clock. */
  wasStopped(): boolean {
    return this.stopped
  }
}
