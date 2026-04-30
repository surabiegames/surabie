import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { buttonVariants } from "@/components/ui/button"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export const metadata = { title: "Accounts" }

export default async function AccountsPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/login")

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Akun chart of accounts"
        text="Kelompokkan aset, kewajiban, ekuitas, pendapatan, dan biaya untuk jurnal dua sisi."
      >
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Kembali ke ringkasan
        </Link>
      </DashboardHeader>
      <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
        Modul ini akan terhubung ke tabel ledger (mis. Account) sesuai rancangan
        aplikasi Anda. Belum ada data dari database.
      </div>
    </DashboardShell>
  )
}
