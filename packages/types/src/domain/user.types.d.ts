export type UserStatus = 'online' | 'offline' | 'away';
export interface User {
    id: string;
    username: string;
    displayName: string;
    avatarPath: string | null;
    status: UserStatus;
    lastSeen: string;
    createdAt: string;
}
export interface Session {
    id: string;
    userId: string;
    token: string;
    deviceInfo: string;
    createdAt: string;
}
//# sourceMappingURL=user.types.d.ts.map