export interface LoginDto {
    mobile: string;
    password: string;
}

export interface LoginResponse {
    token: string;
}