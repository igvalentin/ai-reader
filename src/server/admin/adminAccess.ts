export function isAdminUserId(userId: string): boolean {
  const allowlistedIds = (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return allowlistedIds.includes(userId)
}
