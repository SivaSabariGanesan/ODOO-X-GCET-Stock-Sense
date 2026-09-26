import { UnitOfMeasure } from "../../db/schema/units-of-measure";

export type UomDetails = UnitOfMeasure;

export interface CreateUomInput {
  name: string;
  abbreviation: string;
  description?: string;
  measureType?: string;
  isActive?: boolean;
}

export interface UpdateUomInput {
  name?: string;
  abbreviation?: string;
  description?: string | null;
  measureType?: string | null;
  isActive?: boolean;
}

export interface ListUomsQuery {
  page?: number;
  limit?: number;
  search?: string;
  measureType?: string;
  isActive?: boolean;
}
