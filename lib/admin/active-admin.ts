import { unauthorized } from "@/lib/api/response";
import { dbQuery } from "@/lib/db";

export async function assertActiveAdminActor(adminUserId: string) {
  const result = await dbQuery<{ id: string }>(
    `
      select id
      from admin_users
      where id = $1 and is_active is true
      limit 1
    `,
    [adminUserId]
  );

  if (!result.rows[0]) {
    throw unauthorized(
      "Your administrator session is no longer active. Sign in again."
    );
  }
}
