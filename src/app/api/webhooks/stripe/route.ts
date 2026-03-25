import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { constructWebhookEvent } from '@/lib/stripe'
import Stripe from 'stripe'

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const type = session.metadata?.type

        if (type === 'support' && userId) {
          // Record the donation
          await admin.from('donations').upsert(
            {
              user_id: userId,
              stripe_session_id: session.id,
              stripe_payment_intent_id: typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || null,
              amount_cents: session.amount_total || 0,
              currency: session.currency || 'usd',
              status: 'succeeded',
              metadata: {
                customer_email: session.customer_details?.email,
                customer_name: session.customer_details?.name,
              },
            },
            { onConflict: 'stripe_session_id' }
          )

          // Grant supporter badge (idempotent — grantBadge checks for duplicates)
          const { data: badgeDef } = await admin
            .from('badge_definitions')
            .select('id')
            .eq('slug', 'supporter')
            .single()

          if (badgeDef) {
            // Check if user already has the badge
            const { data: existing } = await admin
              .from('user_badges')
              .select('id')
              .eq('user_id', userId)
              .eq('badge_definition_id', badgeDef.id)
              .is('revoked_at', null)
              .single()

            if (!existing) {
              await admin.from('user_badges').insert({
                user_id: userId,
                badge_definition_id: badgeDef.id,
                source: 'stripe',
                metadata: {
                  first_donation_at: new Date().toISOString(),
                  session_id: session.id,
                },
              })
            }
          }

          // Send admin notification
          const { data: adminUsers } = await admin
            .from('profiles')
            .select('id')
            .eq('role', 'admin')

          if (adminUsers?.length) {
            const amountFormatted = ((session.amount_total || 0) / 100).toFixed(2)
            const { data: donor } = await admin
              .from('profiles')
              .select('display_name, email')
              .eq('id', userId)
              .single()

            for (const adminUser of adminUsers) {
              await admin.from('notifications').insert({
                user_id: adminUser.id,
                type: 'admin',
                title: 'New Supporter!',
                message: `${donor?.display_name || donor?.email || 'Someone'} contributed $${amountFormatted}`,
                link: '/admin',
              })
            }
          }

          console.log(`[stripe/webhook] Donation recorded: $${((session.amount_total || 0) / 100).toFixed(2)} from ${userId}`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntent = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id

        if (paymentIntent) {
          await admin
            .from('donations')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('stripe_payment_intent_id', paymentIntent)
        }
        break
      }

      default:
        // Unhandled event type — log but don't fail
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe/webhook] Processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
