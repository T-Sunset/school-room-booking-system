import type { StrikeStatus } from './Strike'

export type StudentRosterEntry = {
    id: string
    email: string
    yearLevel: number | null
    strikeStatus: StrikeStatus
}
