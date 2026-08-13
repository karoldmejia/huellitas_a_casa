import { Gender, ReportStatus, ReportType, Size, Species } from "../enums/report.enums";

export class ReportResponseDto {
    id: string;
    type: ReportType;
    status: ReportStatus;
    petName: string | null;
    species: Species;
    breed: string | null;
    gender: Gender | null;
    color: string;
    size: Size;
    description: string | null;
    latitude: number;
    longitude: number;
    addressText: string | null;
    eventDate: Date | null;
    whatsapp: string;
    termsAccepted: boolean;
    viewsCount: number;
    createdAt: Date;
    updatedAt: Date;
    photos: {
        id: string;
        url: string;
        orderIndex: number;
    }[];
    user: {
        id: string;
        displayName: string;
        photoUrl: string | null;
    } | null;
    distance?: number; // En metros
    isOwner?: boolean;
    canEdit?: boolean;
}