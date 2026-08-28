// Room.ts
// Define Room(s)
export type Room = {
    id: string,
    schoolId:string,
    name: string,
    nameNormalised:string,
    isBookable: boolean, 
    rules: {
        maxBookingHours:number,
        requiresApproval: boolean,

        allowedDays:number[],
        openHour:number,
        closeHour:number,

        allowedYearLevels:number[],

        agreement:string // What do people who try to book this room have to agree to to do so?
    },
    createdBy:string,
    createdAt:string,
    deactivatedAt?:string,
    deactivatedBy?:string
}