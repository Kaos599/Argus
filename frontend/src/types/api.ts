/**
 * Re-export of the shared API contract.
 * The shared/ folder is the source of truth; this file is the import surface
 * for everything in src/ so we don't have to think about the relative path.
 *
 * We re-export with explicit names to avoid value/type name collisions in the
 * re-export (Schemas are values, PropsType are types).
 */
export {
  StatCardProps,
  TimeSeriesCardProps,
  BarChartCardProps,
  HeatmapCardProps,
  TableCardProps,
  SummaryCardProps,
  ErrorCardProps,
  CardName,
  CardDescriptor,
  ConnectRequest,
  ConnectResponse,
  ProbeResponse,
  SampleResponse,
  PlanRequest,
  PlanResponse,
  RenderRequest,
  RenderEvent,
  DashboardResponse,
  LayoutRequest,
  LayoutResponse,
  AddCardRequest,
  AddCardResponse,
  RefreshRequest,
  RefreshResponse,
  HealthResponse,
  ErrorCode,
  ErrorResponse,
} from "../../../shared/api-types";

export type {
  StatCardPropsType,
  TimeSeriesCardPropsType,
  BarChartCardPropsType,
  HeatmapCardPropsType,
  TableCardPropsType,
  SummaryCardPropsType,
  ErrorCardPropsType,
  CardNameType,
  CardDescriptorType,
  ConnectRequestType,
  ConnectResponseType,
  ProbeResponseType,
  SampleResponseType,
  PlanRequestType,
  PlanResponseType,
  RenderRequestType,
  RenderEventType,
  DashboardResponseType,
  LayoutRequestType,
  LayoutResponseType,
  AddCardRequestType,
  AddCardResponseType,
  RefreshRequestType,
  RefreshResponseType,
  HealthResponseType,
  ErrorCodeType,
  ErrorResponseType,
} from "../../../shared/api-types";
