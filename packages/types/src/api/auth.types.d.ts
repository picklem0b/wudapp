import type { User } from '../domain/user.types';
export interface RegisterBody {
    username: string;
    displayName: string;
    pin: string;
}
export interface LoginBody {
    username: string;
    pin: string;
}
export interface AuthResponse {
    user: User;
    token: string;
}
//# sourceMappingURL=auth.types.d.ts.map