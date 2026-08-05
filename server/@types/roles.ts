export enum Role {
  /** @deprecated */
  RECALL_MAINTAINER = 'ROLE_RECALL_MAINTAINER',
  COURT_CASES = 'ROLE_COURT_CASES',
  RELEASE_DATES_CALCULATOR = 'ROLE_RELEASE_DATES_CALCULATOR',
}

export const Roles = {
  getAuthority(role: Role): string {
    return role
  },

  getRole(role: Role): string {
    return role.replace(/^ROLE_/, '')
  },

  values(): Role[] {
    return Object.values(Role) as Role[]
  },
}
