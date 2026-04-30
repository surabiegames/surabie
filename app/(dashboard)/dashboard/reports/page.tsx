import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { buttonVariants } from "@/components/ui/button"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export const metadata = { title: "Reports" }

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/login")

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Laporan"
        text="Neraca, laba rugi, arus kas, dan buku besar—dihitung dari jurnal yang sudah diposting."
      >
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Kembali ke ringkasan
        </Link>
      </DashboardHeader>
      <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
        Laporan akan membaca aggregate dari ledger yang sama. Ini placeholder untuk
        alur UX.
      </div>
    </DashboardShell>
  )
}
