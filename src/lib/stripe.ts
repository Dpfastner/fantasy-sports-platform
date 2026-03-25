import Stripe from 'stripe'

// Lazy-init to avoid build-time crashes when env vars are missing
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' })
  }
  return _stripe
}

/**
 * Find or create a Stripe customer for a Supabase user.
 * Stores stripe_customer_id in profiles for reuse.
 */
export async function getOrCreateCustomer(
  supabaseAdmin: any,
  userId: string,
  email: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  // Create new Stripe customer
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  // Store on profile
  await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

/**
 * Create a Checkout Session for a support contribution.
 */
export async function createCheckoutSession(opts: {
  customerId: string
  amountCents: number
  successUrl: string
  cancelUrl: string
  userId: string
}): Promise<string> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    customer: opts.customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Support Rivyls',
            description: 'Voluntary contribution to keep Rivyls free',
          },
          unit_amount: opts.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: {
      supabase_user_id: opts.userId,
      type: 'support',
    },
  })

  return session.url || session.id
}

/**
 * Create a Customer Portal session for managing payment methods.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}

/**
 * Verify and parse a Stripe webhook event.
 */
export function constructWebhookEvent(
  body: string,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  return stripe.webhooks.constructEvent(body, signature, secret)
}
