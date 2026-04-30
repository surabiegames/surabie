import * as z from "zod"

export const moneySchema = z.number().finite().nonnegative()

export const journalLineInputSchema = z
  .object({
    accountId: z.string().min(1),
    description: z.string().max(500).optional(),
    debit: moneySchema.default(0),
    credit: moneySchema.default(0),
    currencyCode: z.string().min(3).max(3).default("IDR"),
    fxRateToBase: z.number().finite().positive().default(1),
  })
  .superRefine((line, ctx) => {
    const hasDebit = line.debit > 0
    const hasCredit = line.credit > 0
    if (hasDebit === hasCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each line must have exactly one side > 0 (debit XOR credit).",
      })
    }
  })

export const createJournalEntrySchema = z.object({
  companyId: z.string().min(1),
  entryDate: z.string().datetime(),
  description: z.string().min(3).max(500),
  sourceType: z
    .enum(["MANUAL", "CASH_IN", "CASH_OUT", "INVENTORY_ADJUSTMENT"])
    .default("MANUAL"),
  lines: z.array(journalLineInputSchema).min(2),
  postNow: z.boolean().default(false),
})

export const createLedgerAccountSchema = z.object({
  companyId: z.string().min(1),
  code: z.string().min(1).max(20),
  name: z.string().min(2).max(120),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  parentAccountId: z.string().min(1).optional(),
  allowManualEntry: z.boolean().default(true),
})
