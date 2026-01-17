import React from "react"
import { Toaster as Sonner, toast } from "sonner"
import { useTheme } from "@/components/theme-provider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#0f1629] group-[.toaster]:text-white group-[.toaster]:border-[#1e2a4a] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-400",
          actionButton:
            "group-[.toast]:bg-blue-500 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-700 group-[.toast]:text-slate-300",
          success: "group-[.toaster]:border-emerald-500/30",
          error: "group-[.toaster]:border-red-500/30",
          info: "group-[.toaster]:border-blue-500/30",
          warning: "group-[.toaster]:border-amber-500/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
