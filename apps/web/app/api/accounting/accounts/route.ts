import { AppRole } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { authOptions } from "@/lib/auth"
import { ensureCompanyExists, ensureUserRole } from "@/lib/accounting"
import { db } from "@/lib/db"
import { createLedgerAccountSchema } from "@/lib/validations/accounting"

const querySchema = z.object({
  companyId: z.string().min(1),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return new Response("Unauthorized", { status: 403 })

    const url = new URL(req.url)
    const query = querySchema.parse({
      companyId: url.searchParams.get("companyId"),
    })

    const role = await ensureUserRole(session.user.id, query.companyId, [
      AppRole.OWNER,
      AppRole.ADMIN,
      AppRole.STAFF,
    ])
    if (!role) return new Response("Forbidden", { status: 403 })

    const accounts = await db.ledgerAccount.findMany({
      where: { companyId: query.companyId },
      orderBy: { code: "asc" },
    })
    return new Response(JSON.stringify(accounts))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return new Response("Unauthorized", { status: 403 })

    const body = createLedgerAccountSchema.parse(await req.json())
    const role = await ensureUserRole(session.user.id, body.companyId, [
      AppRole.OWNER,
      AppRole.ADMIN,
    ])
    if (!role) return new Response("Forbidden", { status: 403 })

    await ensureCompanyExists(body.companyId)

    const created = await db.ledgerAccount.create({
      data: {
        companyId: body.companyId,
        code: body.code,
        name: body.name,
        type: body.type,
        normalBalance: body.normalBalance,
        parentAccountId: body.parentAccountId,
        allowManualEntry: body.allowManualEntry,
        createdByUserId: session.user.id,
        updatedByUserId: session.user.id,
      },
    })
    return new Response(JSON.stringify(created), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(
      JSON.stringify({ message: (error as Error).message || "Server error" }),
      { status: 500 }
    )
  }
}
