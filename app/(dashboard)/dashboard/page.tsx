import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { formatIDR } from "@/lib/format-money"
import { getCurrentUser } from "@/lib/session"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Dashboard",
}

/** Contoh statis—ganti dengan agregasi dari ledger saat backend siap */
const DEMO_SUMMARY = {
  equity: 128_450_000,
  cashAndBank: 42_180_000,
  incomeMonth: 18_750_000,
  expenseMonth: 12_920_000,
}

const DEMO_ENTRIES = [
  {
    date: "30 Apr 2026",
    ref: "JE-0402",
    description: "Penjualan + PPN dikreditkan Piutang",
    amount: "+ " + formatIDR(5_250_000),
    tone: "text-emerald-600 dark:text-emerald-400" as const,
  },
  {
    date: "29 Apr 2026",
    ref: "JE-0401",
    description: "Biaya penyusutan perangkat lunak",
    amount: "- " + formatIDR(780_000),
    tone: "text-rose-600 dark:text-rose-400" as const,
  },
  {
    date: "28 Apr 2026",
    ref: "JE-0399",
    description: "Transfer antar kas & bank",
    amount: formatIDR(0),
    tone: "text-muted-foreground" as const,
  },
]

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
  }

  const netMonth =
    DEMO_SUMMARY.incomeMonth - DEMO_SUMMARY.expenseMonth

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Ringkasan keuangan"
        text={`Halo${user.email ? `, ${user.email}` : ""} — gambaran singkat apa yang biasanya ada di dashboard keuangan (contoh demo, bukan dari database).`}
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/journal"
            className={cn(buttonVariants())}
          >
            Catat jurnal
          </Link>
          <Link
            href="/dashboard/accounts"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Kelola akun
          </Link>
        </div>
      </DashboardHeader>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ekuitas bersih</CardTitle>
            <span className="text-[10px] uppercase text-muted-foreground">
              contoh
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatIDR(DEMO_SUMMARY.equity)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Aset − kewajiban (setelah pemetaan akun balance sheet).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kas & bank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatIDR(DEMO_SUMMARY.cashAndBank)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Agregasi dari akun tipe Kas/Perbankan dari chart of accounts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pemasukan (bulan ini)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatIDR(DEMO_SUMMARY.incomeMonth)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Biasanya akun pendapatan/penjualan yang sudah diakui.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pengeluaran (bulan ini)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatIDR(DEMO_SUMMARY.expenseMonth)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Biaya operasional & non-operasional (sesu pemetaan Anda).
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Saldo bersih bulan berjalan</CardTitle>
          <CardDescription>
            Pendapatan dikurangi beban untuk periode yang sama (contoh).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-3xl font-semibold tabular-nums tracking-tight",
              netMonth >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {netMonth >= 0 ? "+ " : ""}
            {formatIDR(netMonth)}
          </p>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground border-t bg-muted/20 py-3">
          Di produksi, angka ini dihitung dari posting jurnal dua sisi; bukan dari
          input manual di dashboard.
        </CardFooter>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,320px)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Jurnal terbaru</CardTitle>
              <CardDescription className="mt-1">
                Jalur cepat untuk audit percobaan apa yang baru diposting.
              </CardDescription>
            </div>
            <Link
              href="/dashboard/journal"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "shrink-0"
              )}
            >
              Semua →
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border rounded-md border">
              {DEMO_ENTRIES.map((row) => (
                <li
                  key={row.ref}
                  className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {row.date}
                      </span>
                      <span className="text-xs rounded bg-muted px-1.5 py-0 font-mono">
                        {row.ref}
                      </span>
                    </div>
                    <p className="text-sm truncate">{row.description}</p>
                  </div>
                  <p className={cn("text-sm font-medium tabular-nums", row.tone)}>
                    {row.amount}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4 content-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Langkah cepat</CardTitle>
              <CardDescription>
                Umum dalam aplikasi keuangan berskala besar.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link
                href="/dashboard/journal"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "justify-start font-normal"
                )}
              >
                Buat atau impor voucher jurnal
              </Link>
              <Link
                href="/dashboard/accounts"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "justify-start font-normal"
                )}
              >
                Reconcile chart of accounts
              </Link>
              <Link
                href="/dashboard/reports"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "justify-start font-normal"
                )}
              >
                Buka laporan (neraca / P&amp;L)
              </Link>
              <Link
                href="/dashboard/billing"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-start font-normal"
                )}
              >
                Langganan aplikasi &amp; pembayaran
              </Link>
            </CardContent>
          </Card>

          <Card className="border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                Integritas data
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc space-y-1 pl-4">
                <li>Jurnal bersifat dua sisi: total debit harus sama dengan kredit.</li>
                <li>Setelah diposting, lebih aman revisi pakai pembalik, bukan edit mentah.</li>
                <li>Kontrol akses per peran (owner/admin/staff) dilayer di atas Prisma/API.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
