import { AppRole } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { authOptions } from "@/lib/auth"
import { ensureUserRole } from "@/lib/accounting"
import { getTrialBalance } from "@/lib/reports"

const querySchema = z.object({
  companyId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(3000),
  month: z.coerce.number().int().min(1).max(12),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return new Response("Unauthorized", { status: 403 })

    const url = new URL(req.url)
    const query = querySchema.parse({
      companyId: url.searchParams.get("companyId"),
      year: url.searchParams.get("year"),
      month: url.searchParams.get("month"),
    })

    const role = await ensureUserRole(session.user.id, query.companyId, [
      AppRole.OWNER,
      AppRole.ADMIN,
      AppRole.STAFF,
    ])
    if (!role) return new Response("Forbidden", { status: 403 })

    const rows = await getTrialBalance(query)
    return new Response(JSON.stringify(rows))
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
