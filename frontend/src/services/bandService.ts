// bandService.ts
import api from './api'
import type { Band, CreateBandRequest, CreateBandResponse, SchoolStudent } from '../types/Band'

export type BandActionResponse = {
    success: boolean
    status: Band['status']
}

// List bands that include the authenticated user.
export async function getBandsForUser(): Promise<Band[]> {
    const response = await api.get('/bands/mine')
    return response.data
}

// List same-school students available for a band application.
// This is intentionally scoped to the authenticated user and server-side school.
export async function getSameSchoolStudents(): Promise<SchoolStudent[]> {
    const response = await api.get('/students')
    return response.data
}

// Create a band proposal using the existing backend workflow.
export async function createBand(input: CreateBandRequest): Promise<CreateBandResponse> {
    const response = await api.post('/bands', input)
    return response.data
}

// List pending applications for the authenticated teacher or administrator.
export async function getPendingBands(): Promise<Band[]> {
    const response = await api.get('/bands/pending')
    return response.data
}

// Approve a pending band application.
export async function approveBand(bandId: string): Promise<BandActionResponse> {
    const response = await api.patch(`/bands/${bandId}/approve`)
    return response.data
}

// Deny a pending band application.
export async function denyBand(bandId: string): Promise<BandActionResponse> {
    const response = await api.patch(`/bands/${bandId}/deny`)
    return response.data
}

// List active approved bands in the authenticated user's permitted scope.
export async function getActiveBands(): Promise<Band[]> {
    const response = await api.get('/bands/active')
    return response.data
}

// Disband an approved band.
export async function disbandBand(bandId: string): Promise<BandActionResponse> {
    const response = await api.patch(`/bands/${bandId}/disband`)
    return response.data
}

// Issue individual strikes to every member of an approved band.
export async function strikeBand(bandId: string, reason: string) {
    const response = await api.post(`/bands/${bandId}/strike`, { reason })
    return response.data
}

// Leave an approved band as a student member.
export async function leaveBand(bandId: string): Promise<BandActionResponse> {
    const response = await api.patch(`/bands/${bandId}/leave`)
    return response.data
}

// Use the existing same-school user lookup to resolve member IDs for staff views.
export async function getSameSchoolUsers(): Promise<SchoolStudent[]> {
    const response = await api.get('/users')
    return response.data
}
