import { JwtValidateResponse } from "src/modules/auth/interfaces/jwt-validate-response.interface";
import { IUserSubscription } from "./user-subscription.interface";

export interface JwtAndSubscription {
    user: JwtValidateResponse;
    subscription: IUserSubscription;
}