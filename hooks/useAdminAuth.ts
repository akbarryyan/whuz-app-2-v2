"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Hook to check admin authentication.
 * Redirects to /admin/login if not authenticated.
 * Returns { user, loading } — render nothing while loading is true.
 */
export function useAdminAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip auth check on the login page itself
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          router.replace("/admin/login?reason=unauthorized");
        }
      })
      .catch(() => {
        router.replace("/admin/login?reason=unauthorized");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  return { user, loading };
}
