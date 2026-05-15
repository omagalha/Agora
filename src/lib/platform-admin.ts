import type { User } from "@supabase/supabase-js";

function adminEmails() {
  return [process.env.ADMIN_EMAIL, process.env.PLATFORM_ADMIN_EMAILS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(user: Pick<User, "email" | "app_metadata"> | null | undefined) {
  if (!user) return false;
  if (user.app_metadata?.platform_admin === true) return true;

  const email = user.email?.trim().toLowerCase();
  return !!email && adminEmails().includes(email);
}
