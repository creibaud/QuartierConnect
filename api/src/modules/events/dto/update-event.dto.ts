import { PartialType } from "@nestjs/swagger";
import { CreateEventDto } from "src/modules/events/dto/create-event.dto";

export class UpdateEventDto extends PartialType(CreateEventDto) {}
