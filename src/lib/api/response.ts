import { NextResponse } from 'next/server'

/**
 * Return a successful JSON response with consistent shape.
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Return an error JSON response with consistent shape.
 */
export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}
