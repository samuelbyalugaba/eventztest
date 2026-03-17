"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-neutral-900 group-[.toaster]:border-neutral-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl group-[.toaster]:font-sans",
          description: "group-[.toast]:text-neutral-500",
          actionButton:
            "group-[.toast]:bg-neutral-900 group-[.toast]:text-neutral-50",
          cancelButton:
            "group-[.toast]:bg-neutral-100 group-[.toast]:text-neutral-500",
          success: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-black",
          error: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-red-500",
          info: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-blue-500",
          warning: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
