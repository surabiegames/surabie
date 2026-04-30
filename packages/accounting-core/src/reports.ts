import { LedgerAccountType, NormalBalance, Prisma } from "@prisma/client"

import { db } from "@surabie/db"

type TrialBalanceRow = {
  accountId: string
  code: string
  name: string
  type: LedgerAccountType
  normalBalance: NormalBalance
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  ending: Prisma.Decimal
}

function decimal(value: number | string) {
  return new Prisma.Decimal(value)
}

export async function getTrialBalance(params: {
  companyId: string
  year: number
  month: number
}): Promise<TrialBalanceRow[]> {
  const period = await db.fiscalPeriod.findUnique({
    where: {
      companyId_year_month: {
        companyId: params.companyId,
        year: params.year,
        month: params.month,
      },
    },
    select: { id: true },
  })

  if (!period) return []

  const grouped = await db.journalLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: {
        companyId: params.companyId,
        fiscalPeriodId: period.id,
        status: "POSTED",
      },
    },
    _sum: {
      debitInBase: true,
      creditInBase: true,
    },
  })

  if (!grouped.length) return []

  const accountMap = new Map(
    (
      await db.ledgerAccount.findMany({
        where: {
          id: { in: grouped.map((g) => g.accountId) },
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          normalBalance: true,
        },
      })
    ).map((a) => [a.id, a])
  )

  const rows = grouped
    .map((g): TrialBalanceRow | null => {
      const account = accountMap.get(g.accountId)
      if (!account) return null
      const debit = g._sum.debitInBase ?? decimal(0)
      const credit = g._sum.creditInBase ?? decimal(0)
      const ending =
        account.normalBalance === "DEBIT"
          ? debit.sub(credit)
          : credit.sub(debit)

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        debit,
        credit,
        ending,
      }
    })
    .filter((row): row is TrialBalanceRow => row !== null)
    .sort((a, b) => a.code.localeCompare(b.code))

  return rows
}
