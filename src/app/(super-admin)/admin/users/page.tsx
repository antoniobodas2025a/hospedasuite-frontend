import { getUsersAction } from '@/app/actions/super-admin';
import UsersTable from './UsersTable';

export const dynamic = 'force-dynamic';

// ============================================================================
// Superadmin Users Page — Server Component
//
// Fetches all users with their roles from user_roles, joined with auth.users
// for email and hotels for owner hotel name. Passes the full list to the
// interactive UsersTable client component which handles search, grant/revoke
// role modals, and create superadmin flow.
// ============================================================================

export default async function UsersPage() {
  const users = await getUsersAction();

  return <UsersTable initialUsers={users} />;
}
