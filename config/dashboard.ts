import { DashboardConfig } from "types"

export const dashboardConfig: DashboardConfig = {
  mainNav: [
    {
      title: "Documentation",
      href: "/docs",
    },
    {
      title: "Support",
      href: "/support",
      disabled: true,
    },
  ],
  sidebarNav: [
    {
      title: "Overview",
      href: "/dashboard",
      icon: "activity",
    },
    {
      title: "Accounts",
      href: "/dashboard/accounts",
      icon: "scale",
    },
    {
      title: "Journal",
      href: "/dashboard/journal",
      icon: "post",
    },
    {
      title: "Reports",
      href: "/dashboard/reports",
      icon: "page",
    },
    {
      title: "Billing",
      href: "/dashboard/billing",
      icon: "billing",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "settings",
    },
  ],
}
