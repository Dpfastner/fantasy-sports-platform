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
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 font-medium">
            Something went wrong{this.props.sectionName ? ` loading ${this.props.sectionName}` : ''}.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
