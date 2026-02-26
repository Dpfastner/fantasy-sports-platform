import { ZodSchema } from 'zod'
import { NextResponse } from 'next/server'

type ValidationSuccess<T> = { success: true; data: T }
type ValidationFailure = { success: false; response: NextResponse }

/**
 * Validate a request body against a Zod schema.
 * Returns typed data on success, or a 400 NextResponse on failure.
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): ValidationSuccess<T> | ValidationFailure {
  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    }
  }
  return { success: true, data: result.data }
}
