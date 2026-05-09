export interface GlobalAddressType {
    label: string; //home | office | other
    addressLine: string;
    area: string;
    district: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}

export type UserUploadedFileType = {
    blob?: Blob;
    mediaChecksum?: string;
    mediaEntityId?: string;
    mediaId?: string;
    mediaProfile?: string;
    mediaVariant?: string;
    mediaVersion?: number;
    source?: string;
    name?: string;
    size?: number;
    type?: string | null | any;
    url?: string;
    uid?: string;
    isSelected?: boolean;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: number;
    message: string;
    level?: LogLevel;
}
