'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-danger/10 border border-danger rounded-lg p-6 text-center">
          <p className="text-danger-text font-medium">
            Something went wrong{this.props.sectionName ? ` loading ${this.props.sectionName}` : ''}.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-4 py-2 bg-surface text-text-primary rounded hover:bg-surface-subtle text-sm"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
