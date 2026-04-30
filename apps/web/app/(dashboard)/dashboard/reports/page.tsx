import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { ensureUserCompanyContext } from "@/lib/accounting"
import { formatIDR } from "@/lib/format-money"
import { getTrialBalance } from "@/lib/reports"
import { getCurrentUser } from "@/lib/session"
import { buttonVariants } from "@/components/ui/button"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export const metadata = { title: "Reports" }

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/login")
  const userContext = await ensureUserCompanyContext(user.id)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const trialBalance = await getTrialBalance({
    companyId: userContext.companyId,
    year,
    month,
  })

  const totalDebit = trialBalance.reduce(
    (sum, row) => sum + Number(row.debit.toString()),
    0
  )
  const totalCredit = trialBalance.reduce(
    (sum, row) => sum + Number(row.credit.toString()),
    0
  )
  const isBalanced = Math.round(totalDebit * 100) === Math.round(totalCredit * 100)

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Laporan"
        text={`Trial Balance ${month.toString().padStart(2, "0")}/${year} untuk ${userContext.company.name}.`}
      >
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Kembali ke ringkasan
        </Link>
      </DashboardHeader>

      {trialBalance.length ? (
        <div className="rounded-md border">
          <div className="border-b px-4 py-3 text-sm">
            <span className="font-medium">Status keseimbangan:</span>{" "}
            <span className={isBalanced ? "text-emerald-600" : "text-rose-600"}>
              {isBalanced ? "Seimbang" : "Tidak seimbang"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2 font-medium">Kode</th>
                  <th className="px-4 py-2 font-medium">Akun</th>
                  <th className="px-4 py-2 font-medium">Tipe</th>
                  <th className="px-4 py-2 font-medium text-right">Debit (IDR)</th>
                  <th className="px-4 py-2 font-medium text-right">Kredit (IDR)</th>
                  <th className="px-4 py-2 font-medium text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((row) => (
                  <tr key={row.accountId} className="border-b">
                    <td className="px-4 py-2 font-mono">{row.code}</td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2">{row.type}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatIDR(Number(row.debit.toString()))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatIDR(Number(row.credit.toString()))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatIDR(Number(row.ending.toString()))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-medium">
                  <td className="px-4 py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatIDR(totalDebit)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatIDR(totalCredit)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          Belum ada jurnal berstatus POSTED untuk periode ini. Tambahkan account
          dan posting jurnal dulu melalui API `/api/accounting/*`.
        </div>
      )}
    </DashboardShell>
  )
}
