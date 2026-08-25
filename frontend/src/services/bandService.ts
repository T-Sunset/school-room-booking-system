// bandService.ts
import api from './api'
import type { Band, CreateBandRequest, CreateBandResponse, SchoolStudent } from '../types/Band'

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
