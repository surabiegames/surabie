import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import EmailProvider from "next-auth/providers/email"
import GitHubProvider from "next-auth/providers/github"
import { Client as PostmarkClient } from "postmark"

import { env } from "@/env.mjs"
import { siteConfig } from "@/config/site"
import { db } from "@/lib/db"

/** True when GitHub OAuth is wired with non-placeholder credentials. */
export function isGitHubOAuthConfigured(): boolean {
  const id = env.GITHUB_CLIENT_ID
  const secret = env.GITHUB_CLIENT_SECRET
  if (!id || !secret) return false
  if (id.startsWith("dev-") || secret.startsWith("dev-")) return false
  return true
}

function getPostmarkClient(): PostmarkClient | null {
  const token = env.POSTMARK_API_TOKEN.trim()
  if (!token || token.startsWith("dev-")) return null
  return new PostmarkClient(token)
}

/** True when we can call Postmark (production must satisfy this). */
function canSendEmailViaPostmark(): boolean {
  const token = env.POSTMARK_API_TOKEN.trim()
  if (!token || token.startsWith("dev-")) return false
  const signInT = env.POSTMARK_SIGN_IN_TEMPLATE.trim()
  const activationT = env.POSTMARK_ACTIVATION_TEMPLATE.trim()
  if (!signInT || !activationT) return false
  return (
    !Number.isNaN(parseInt(signInT, 10)) &&
    !Number.isNaN(parseInt(activationT, 10))
  )
}

const emailProvider = EmailProvider({
  from: env.SMTP_FROM,
  sendVerificationRequest: async ({ identifier, url, provider }) => {
    const postmarkClient = getPostmarkClient()

    // Local dev: always print the URL so login works without Postmark; look for `[1]` (Next) not `[0]` (contentlayer).
    if (process.env.NODE_ENV === "development") {
      console.info(`[auth:dev] Magic link for ${identifier}: ${url}`)
      if (!canSendEmailViaPostmark() || !postmarkClient) {
        return
      }
    }

    if (!postmarkClient) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "Email is not configured: set POSTMARK_API_TOKEN (not dev-*) and numeric Postmark template IDs."
        )
      }
      return
    }

    const email = identifier.toLowerCase()
    const user = await db.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    })

    const templateId = user?.emailVerified
      ? env.POSTMARK_SIGN_IN_TEMPLATE.trim()
      : env.POSTMARK_ACTIVATION_TEMPLATE.trim()
    const templateIdNum = parseInt(templateId, 10)
    if (!templateId || Number.isNaN(templateIdNum)) {
      throw new Error(
        "Invalid Postmark template id: set POSTMARK_SIGN_IN_TEMPLATE and POSTMARK_ACTIVATION_TEMPLATE to numeric template IDs."
      )
    }

    const result = await postmarkClient.sendEmailWithTemplate({
      TemplateId: templateIdNum,
      To: identifier,
      From: provider.from as string,
      TemplateModel: {
        action_url: url,
        product_name: siteConfig.name,
      },
      Headers: [
        {
          Name: "X-Entity-Ref-ID",
          Value: new Date().getTime() + "",
        },
      ],
    })

    if (result.ErrorCode) {
      throw new Error(result.Message)
    }
  },
})

export const authOptions: NextAuthOptions = {
  // @see https://github.com/prisma/prisma/issues/16117
  adapter: PrismaAdapter(db as any),
  session: {
    strategy: "jwt",
    // How long “stay logged in” lasts without visiting /login again (cookie/session).
    maxAge: 90 * 24 * 60 * 60, // ~90 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(isGitHubOAuthConfigured()
      ? [
          GitHubProvider({
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    emailProvider,
  ],
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        user.email = user.email.toLowerCase()
      }
      return true
    },
    async session({ token, session }) {
      const userId = token.sub ?? (token.id as string | undefined)
      if (userId && session.user) {
        session.user.id = userId
        session.user.email = token.email ?? undefined
        session.user.name = (token.name ?? null) as string | null
        session.user.image = (token.picture as string | undefined) ?? null
      }
      return session
    },
    async jwt({ token, user }) {
      const emailRaw =
        typeof user?.email === "string"
          ? user.email
          : typeof token.email === "string"
            ? token.email
            : null
      const email = emailRaw?.toLowerCase() ?? null

      if (!email) {
        if (user?.id) {
          return {
            ...token,
            id: user.id,
            sub: user.id,
          }
        }
        return token
      }

      const dbUser = await db.user.findUnique({
        where: { email },
      })

      if (!dbUser) {
        if (user) {
          return {
            ...token,
            id: user.id,
            sub: user.id ?? token.sub,
            email,
            name: user.name ?? token.name,
            picture: user.image ?? token.picture,
          }
        }
        return { ...token, email }
      }

      return {
        ...token,
        id: dbUser.id,
        sub: dbUser.id,
        email: dbUser.email ?? email,
        name: dbUser.name,
        picture: dbUser.image,
      }
    },
  },
}
