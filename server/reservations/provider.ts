import type {
  AvailabilityRequest,
  AvailabilityResponse,
  CreateReservationRequest,
  Reservation,
  CancelReservationRequest,
  ReservationProviderConfig,
  ReservationProviderResult,
} from "./types";

export interface IReservationProvider {
  readonly name: string;
  readonly supportsRealTimeAvailability: boolean;
  readonly supportsDirectBooking: boolean;

  getAvailability(
    request: AvailabilityRequest,
    config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<AvailabilityResponse>>;

  createReservation(
    request: CreateReservationRequest,
    config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<Reservation>>;

  cancelReservation(
    request: CancelReservationRequest,
    config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<{ cancelled: boolean }>>;
}

export abstract class BaseReservationProvider implements IReservationProvider {
  abstract readonly name: string;
  abstract readonly supportsRealTimeAvailability: boolean;
  abstract readonly supportsDirectBooking: boolean;

  abstract getAvailability(
    request: AvailabilityRequest,
    config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<AvailabilityResponse>>;

  abstract createReservation(
    request: CreateReservationRequest,
    config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<Reservation>>;

  abstract cancelReservation(
    request: CancelReservationRequest,
    config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<{ cancelled: boolean }>>;

  protected generateConfirmationCode(): string {
    return `RL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  protected notImplementedError(method: string): ReservationProviderResult<any> {
    return {
      success: false,
      error: `${method} is not implemented for ${this.name} provider`,
      errorCode: "NOT_IMPLEMENTED",
    };
  }
}
