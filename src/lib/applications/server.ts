import "server-only";

export {
  applicationsService,
  ApplicationsServiceError,
  setApplicationResume,
} from "./service";

export { PIPELINE_STATUS_OPTIONS } from "./constants";

export type {
  ApplicationBundle,
  ApplicationBundleFlags,
  ApplicationDetail,
  ApplicationListItem,
  ApplicationNoteDto,
  ApplicationProfileSnapshotDto,
  JobListingSnapshot,
} from "./types";

export {
  coverLettersService,
  CoverLettersServiceError,
  generateForApplication,
  generateCoverLetterForBody,
  previewCoverLetterContent,
} from "./cover-letter";

export type {
  CoverLetterDto,
  CoverLetterCitation,
  GenerateCoverLetterOptions,
  GenerateCoverLetterResult,
  LetterPayload,
  ManualCoverLetterPayload,
} from "./cover-letter";
