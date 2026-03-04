export class SubmitTaskDto {
    taskId!: string;
    proofUrl?: string;
    proofText?: string;
}

export class CreateCustomTaskDto {
    title!: string;
    description!: string;
    reward!: number;
    instructions?: string;
    logoUrl?: string;
    link?: string;
}
