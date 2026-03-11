import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/AdminNav'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  if (!ADMIN_USER_IDS.includes(user.id)) {
    redirect('/dashboard')
  }

  return (
    <>
      <AdminNav />
      {children}
    </>
  )
}
