'use client'

import { useState, useEffect } from 'react'
import { getHealthChecks, runHealthTest } from './actions'

interface HealthCheck {
  id: string
  endpoint: string
  status_code: number | null
  response_time_ms: number | null
  structure_valid: boolean
  structure_hash: string | null
  issues: string[]
  checked_at: string
}

interface EndpointSummary {
  endpoint: string
  latest: HealthCheck | null
  lastValid: boolean
  avgResponseTime: number
}

export default function MonitoringPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    const result = await getHealthChecks()
    if (result.data) {
      setChecks(result.data as HealthCheck[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTest = async () => {
    setTesting(true)
    setMessage(null)
    const result = await runHealthTest()
    if (result.success) {
      setMessage({ type: 'success', text: `Test complete. Scoreboard: ${result.scoreboardValid ? 'valid' : 'INVALID'}. Rankings: ${result.rankingsValid ? 'valid' : 'INVALID'}.` })
      await loadData()
    } else {
      setMessage({ type: 'error', text: result.error || 'Test failed' })
    }
    setTesting(false)
  }

  // Build endpoint summaries
  const endpoints = ['scoreboard', 'rankings']
  const summaries: EndpointSummary[] = endpoints.map((endpoint) => {
    const endpointChecks = checks.filter((c) => c.endpoint === endpoint)
    const latest = endpointChecks[0] || null
    const avgTime = endpointChecks.length > 0
      ? Math.round(endpointChecks.reduce((sum, c) => sum + (c.response_time_ms || 0), 0) / endpointChecks.length)
      : 0

    return {
      endpoint,
      latest,
      lastValid: latest?.structure_valid ?? true,
      avgResponseTime: avgTime,
    }
  })

  return (
    <div className="min-h-screen bg-page">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">ESPN API Monitoring</h1>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            {testing ? 'Testing...' : 'Test Now'}
          </button>
        </div>

        {message && (
          <div
            className={`rounded-lg p-4 mb-6 text-sm ${
              message.type === 'success'
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Endpoint Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {summaries.map((summary) => (
            <div
              key={summary.endpoint}
              className={`bg-surface rounded-lg p-5 border ${
                !summary.lastValid ? 'border-danger' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-text-primary font-semibold capitalize">{summary.endpoint}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    summary.lastValid
                      ? 'bg-success/10 text-success'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {summary.lastValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              {summary.latest ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Last Check</span>
                    <span>{new Date(summary.latest.checked_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Status Code</span>
                    <span>{summary.latest.status_code}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Response Time</span>
                    <span>{summary.latest.response_time_ms}ms</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Avg Response Time</span>
                    <span>{summary.avgResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Structure Hash</span>
                    <span className="font-mono text-xs">{summary.latest.structure_hash || '-'}</span>
                  </div>
                  {summary.latest.issues.length > 0 && (
                    <div className="mt-2 p-2 bg-danger/5 rounded text-danger text-xs">
                      {summary.latest.issues.map((issue, i) => (
                        <div key={i}>{issue}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-text-muted text-sm">No health checks recorded yet.</p>
              )}
            </div>
          ))}
        </div>

        {/* Health Check History */}
        <div className="bg-surface rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-text-primary font-semibold">Recent Health Checks</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading...</div>
          ) : checks.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No health checks recorded yet. Run a sync or click &ldquo;Test Now&rdquo;.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-xs uppercase tracking-wider bg-surface-subtle">
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Endpoint</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Response</th>
                    <th className="px-4 py-2 text-center">Valid</th>
                    <th className="px-4 py-2 text-left">Hash</th>
                    <th className="px-4 py-2 text-left">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checks.map((check) => (
                    <tr key={check.id}>
                      <td className="px-4 py-2 text-text-secondary whitespace-nowrap">
                        {new Date(check.checked_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-text-primary capitalize">{check.endpoint}</td>
                      <td className="px-4 py-2 text-center text-text-secondary">{check.status_code}</td>
                      <td className="px-4 py-2 text-center text-text-secondary">{check.response_time_ms}ms</td>
                      <td className="px-4 py-2 text-center">
                        <span className={check.structure_valid ? 'text-success' : 'text-danger'}>
                          {check.structure_valid ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-text-muted font-mono text-xs">{check.structure_hash || '-'}</td>
                      <td className="px-4 py-2 text-danger text-xs">
                        {check.issues.length > 0 ? check.issues.join(', ') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
