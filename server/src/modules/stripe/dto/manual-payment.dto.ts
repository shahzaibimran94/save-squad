import { IsIn, IsNotEmpty } from "class-validator";
import { PaymentType } from "src/utils/enums/payment-type.enum";

export class ManualPaymentDto {
    @IsNotEmpty()
    @IsIn([PaymentType.SUBSCRIPTION, PaymentType.SAVING_POD])
    type: string;
    [PaymentType.SAVING_POD]?: {
        id: string;
    };
}