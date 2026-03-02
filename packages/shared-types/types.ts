export interface UserInitData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

export interface WebAppInitData {
    query_id?: string;
    user?: UserInitData;
    receiver?: UserInitData;
    chat?: {
        id: number;
        type: string;
        title: string;
        username?: string;
        photo_url?: string;
    };
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
}
