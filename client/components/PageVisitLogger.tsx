"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import apiClient from "@/utils/axios";

export function PageVisitLogger() {
  const pathname = usePathname();

  useEffect(() => {
    const logPageVisit = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await apiClient.post("/logPageVisit", {
          page: pathname,
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error("Error logging page visit:", error);
      }
    };

    logPageVisit();
  }, [pathname]);

  return null;
}
