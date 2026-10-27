import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react'
import { crashOf, type Crash } from '@/features/report/model'

interface Props {
  readonly children: ReactNode
  /** What shows in place of the children once they failed while drawing; `retry` draws them again. */
  readonly fallback: (crash: Crash, retry: () => void) => ReactNode
}

interface State {
  readonly crash: Crash | null
  /** Bumped by each retry, so that the children start again from scratch. */
  readonly attempt: number
}

/** A net under part of the app: what fails while drawing in it shows the fallback, and the rest goes on.
 * React catches render errors in class components only. */
export class CrashBoundary extends Component<Props, State> {
  override state: State = { crash: null, attempt: 0 }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { crash: crashOf(error) }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    // The same error, with the components that drew it.
    this.setState({ crash: crashOf(error, info.componentStack) })
  }

  private readonly retry = () => {
    this.setState(({ attempt }) => ({ crash: null, attempt: attempt + 1 }))
  }

  override render() {
    const { crash, attempt } = this.state
    return crash ? (
      this.props.fallback(crash, this.retry)
    ) : (
      <Fragment key={attempt}>{this.props.children}</Fragment>
    )
  }
}
