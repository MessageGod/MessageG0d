/**
 * Permission bitmask constants from the MG developer specification.
 */
export const Permissions = {
  SEND_MESSAGES: 1 << 0,
  DELETE_MESSAGES: 1 << 1,
  MANAGE_CHANNELS: 1 << 2,
  MANAGE_ROLES: 1 << 3,
  KICK_USERS: 1 << 4,
  BAN_USERS: 1 << 5,
  CREATE_INVITES: 1 << 6,
} as const;

export type Permission = keyof typeof Permissions;

export function hasPermission(bitmask: number, permission: Permission): boolean {
  return (bitmask & Permissions[permission]) === Permissions[permission];
}
