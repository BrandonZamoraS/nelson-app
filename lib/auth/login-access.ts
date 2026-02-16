import type { AdminProfileRecord } from "@/lib/types/domain";

type LoginUser = {
  id: string;
} | null;

type LoginAdminProfile = Pick<AdminProfileRecord, "is_active"> | null;

export function shouldRedirectAuthenticatedUserFromLogin(
  user: LoginUser,
  adminProfile: LoginAdminProfile,
) {
  if (!user) {
    return false;
  }

  return adminProfile?.is_active === true;
}
