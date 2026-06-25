import { getSessionUser } from './auth';

/**
 * Checks if the currently logged-in session belongs to an authorized administrator.
 * Matches the user's GitHub username against the ADMIN_USERNAMES environment variable.
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const user = await getSessionUser();
    if (!user) return false;

    // Default to 'atharvabaodhankar' if the environment variable is not set
    const adminList = process.env.ADMIN_USERNAMES || 'atharvabaodhankar';
    const admins = adminList.split(',').map(name => name.trim().toLowerCase());
    
    return admins.includes(user.username.toLowerCase());
  } catch (error) {
    console.error('[Admin Auth] Error checking admin status:', error);
    return false;
  }
}

/**
 * Validates that the current user is an admin, throwing an error if unauthorized.
 * Returns the user record if validation succeeds.
 */
export async function isUserAdminOrThrow() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const adminList = process.env.ADMIN_USERNAMES || 'atharvabaodhankar';
  const admins = adminList.split(',').map(name => name.trim().toLowerCase());
  
  if (!admins.includes(user.username.toLowerCase())) {
    throw new Error('Forbidden');
  }

  return user;
}
