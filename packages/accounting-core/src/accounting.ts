import { AppRole, Prisma } from "@prisma/client"

import { db } from "@surabie/db"

type JournalLineInput = {
  accountId: string
  description?: string
  debit: number
  credit: number
  currencyCode: string
  fxRateToBase: number
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export async function ensureUserRole(
  userId: string,
  companyId: string,
  allowedRoles: AppRole[]
) {
  const role = await db.userRole.findFirst({
    where: { userId, companyId, isActive: true },
    select: { role: true },
  })

  if (!role || !allowedRoles.includes(role.role)) {
    return null
  }

  return role.role
}

export function validateBalancedJournal(lines: JournalLineInput[]) {
  let totalDebit = 0
  let totalCredit = 0
  let totalDebitBase = 0
  let totalCreditBase = 0

  for (const line of lines) {
    totalDebit += line.debit
    totalCredit += line.credit

    const debitBase = round2(line.debit * line.fxRateToBase)
    const creditBase = round2(line.credit * line.fxRateToBase)
    totalDebitBase += debitBase
    totalCreditBase += creditBase
  }

  if (round2(totalDebit) !== round2(totalCredit)) {
    throw new Error("Journal not balanced: debit and credit totals differ.")
  }
  if (round2(totalDebitBase) !== round2(totalCreditBase)) {
    throw new Error(
      "Journal not balanced in base currency: debitInBase and creditInBase differ."
    )
  }
}

function pad2(value: number) {
  return value.toString().padStart(2, "0")
}

export async function generateJournalNo(companyId: string, entryDate: Date) {
  const y = entryDate.getFullYear()
  const m = pad2(entryDate.getMonth() + 1)
  const prefix = `JE-${y}${m}`
  const count = await db.journalEntry.count({
    where: {
      companyId,
      journalNo: {
        startsWith: prefix,
      },
    },
  })
  return `${prefix}-${(count + 1).toString().padStart(4, "0")}`
}

export async function getOrCreateFiscalPeriod(
  companyId: string,
  userId: string,
  entryDate: Date
) {
  const year = entryDate.getFullYear()
  const month = entryDate.getMonth() + 1

  const existing = await db.fiscalPeriod.findUnique({
    where: {
      companyId_year_month: { companyId, year, month },
    },
  })

  if (existing) return existing

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59))

  return db.fiscalPeriod.create({
    data: {
      companyId,
      year,
      month,
      startDate,
      endDate,
      status: "OPEN",
      createdByUserId: userId,
      updatedByUserId: userId,
    },
  })
}

export async function ensureCompanyExists(companyId: string) {
  const existing = await db.company.findUnique({ where: { id: companyId } })
  if (existing) return existing
  return db.company.create({
    data: {
      id: companyId,
      name: "Default Company",
    },
  })
}

export async function ensureUserCompanyContext(userId: string) {
  const existing = await db.userRole.findFirst({
    where: { userId, isActive: true },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  })
  if (existing) return existing

  const company = await db.company.create({
    data: {
      name: "Surabie Default Company",
    },
  })

  const userRole = await db.userRole.create({
    data: {
      userId,
      companyId: company.id,
      role: "OWNER",
      isActive: true,
    },
    include: { company: true },
  })

  return userRole
}

export async function createJournalEntry(params: {
  userId: string
  companyId: string
  entryDate: Date
  description: string
  sourceType: "MANUAL" | "CASH_IN" | "CASH_OUT" | "INVENTORY_ADJUSTMENT"
  lines: JournalLineInput[]
  postNow: boolean
}) {
  validateBalancedJournal(params.lines)
  await ensureCompanyExists(params.companyId)
  const period = await getOrCreateFiscalPeriod(
    params.companyId,
    params.userId,
    params.entryDate
  )

  if (period.status !== "OPEN") {
    throw new Error("Fiscal period is not OPEN.")
  }

  const journalNo = await generateJournalNo(params.companyId, params.entryDate)

  return db.$transaction(async (tx) => {
    const created = await tx.journalEntry.create({
      data: {
        companyId: params.companyId,
        fiscalPeriodId: period.id,
        journalNo,
        entryDate: params.entryDate,
        description: params.description,
        sourceType: params.sourceType,
        status: params.postNow ? "POSTED" : "DRAFT",
        postedAt: params.postNow ? new Date() : null,
        postedByUserId: params.postNow ? params.userId : null,
        createdByUserId: params.userId,
        updatedByUserId: params.userId,
      },
    })

    await tx.journalLine.createMany({
      data: params.lines.map((line, index) => ({
        journalEntryId: created.id,
        lineNo: index + 1,
        accountId: line.accountId,
        description: line.description,
        debit: toDecimal(line.debit),
        credit: toDecimal(line.credit),
        currencyCode: line.currencyCode,
        fxRateToBase: toDecimal(line.fxRateToBase),
        debitInBase: toDecimal(round2(line.debit * line.fxRateToBase)),
        creditInBase: toDecimal(round2(line.credit * line.fxRateToBase)),
        createdByUserId: params.userId,
        updatedByUserId: params.userId,
      })),
    })

    return created
  })
}
