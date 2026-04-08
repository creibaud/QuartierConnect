import { PartialType } from "@nestjs/swagger";
import { CreateNeighborhoodDto } from "./create-neighborhood.dto";

export class UpdateNeighborhoodDto extends PartialType(CreateNeighborhoodDto) {}
