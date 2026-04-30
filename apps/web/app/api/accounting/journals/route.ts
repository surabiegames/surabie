import { AppRole } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { authOptions } from "@/lib/auth"
import { createJournalEntry, ensureUserRole } from "@/lib/accounting"
import { createJournalEntrySchema } from "@/lib/validations/accounting"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return new Response("Unauthorized", { status: 403 })

    const body = createJournalEntrySchema.parse(await req.json())
    const allowedRoles = body.postNow
      ? [AppRole.OWNER, AppRole.ADMIN]
      : [AppRole.OWNER, AppRole.ADMIN, AppRole.STAFF]

    const role = await ensureUserRole(session.user.id, body.companyId, allowedRoles)
    if (!role) return new Response("Forbidden", { status: 403 })

    const created = await createJournalEntry({
      userId: session.user.id,
      companyId: body.companyId,
      entryDate: new Date(body.entryDate),
      description: body.description,
      sourceType: body.sourceType,
      lines: body.lines,
      postNow: body.postNow,
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
