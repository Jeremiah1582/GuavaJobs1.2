/** Client-safe exports (constants, types, row styles). */
export {
  PIPELINE_APPLICATION_STATUSES,
  PIPELINE_STATUS_OPTIONS,
  STAGE_ORDER,
  formatApplicationStatusLabel,
} from "./constants";

export {
  EMPLOYMENT_TYPE_VALUES,
  JOB_CATEGORY_VALUES,
  formatEmploymentTypeLabel,
  formatJobCategoryLabel,
} from "./job-taxonomy";

export type {
  EmploymentType,
  JobCategory,
} from "@/generated/prisma";

export { getApplicationRowClass } from "./row-styles";

export type {
  ApplicationBundle,
  ApplicationBundleFlags,
  ApplicationDetail,
  ApplicationListItem,
  ApplicationNoteDto,
  ApplicationProfileSnapshotDto,
  JobListingSnapshot,
} from "./types";

export type {
  CoverLetterDto,
  CoverLetterCitation,
  GenerateCoverLetterOptions,
  GenerateCoverLetterResult,
} from "./cover-letter/types";

export type {
  ApplicationNoteInput,
  ApplicationUpdateInput,
  InterviewUpdateInput,
  ManualApplicationCreateInput,
  InterviewUpdateInput as InterviewDetailsInput,
} from "../validators/applications";
