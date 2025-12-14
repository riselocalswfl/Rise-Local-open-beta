import { BaseReservationProvider } from "../provider";
import type {
  AvailabilityRequest,
  AvailabilityResponse,
  CreateReservationRequest,
  Reservation,
  CancelReservationRequest,
  ReservationProviderConfig,
  ReservationProviderResult,
} from "../types";

export class ResyProvider extends BaseReservationProvider {
  readonly name = "Resy";
  readonly supportsRealTimeAvailability = true;
  readonly supportsDirectBooking = true;

  async getAvailability(
    request: AvailabilityRequest,
    _config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<AvailabilityResponse>> {
    return this.notImplementedError("getAvailability");
  }

  async createReservation(
    request: CreateReservationRequest,
    _config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<Reservation>> {
    return this.notImplementedError("createReservation");
  }

  async cancelReservation(
    request: CancelReservationRequest,
    _config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<{ cancelled: boolean }>> {
    return this.notImplementedError("cancelReservation");
  }
}
