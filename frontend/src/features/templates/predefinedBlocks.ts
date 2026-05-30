import { PREDEFINED_BLOCKS } from "./blocks";

export interface PredefinedBlock {
  type: string;
  label: string;
  description: string;
  aiInstructions: string;
  placeholders: string;
}

export { PREDEFINED_BLOCKS };
