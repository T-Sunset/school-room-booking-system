import type { UserRole } from './UserRole'

export type AdminUser = {
    id: string
    email: string
    role: Exclude<UserRole, 'na'>
}

export type ChangeUserRoleResponse = {
    status: 'updated' | 'unchanged'
    role: AdminUser['role']
}