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

export class DeepLinkProvider extends BaseReservationProvider {
  readonly name = "DeepLink";
  readonly supportsRealTimeAvailability = false;
  readonly supportsDirectBooking = false;

  async getAvailability(
    _request: AvailabilityRequest,
    _config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<AvailabilityResponse>> {
    return {
      success: false,
      error: "Deep link providers do not support availability checks. Redirect user to external booking URL.",
      errorCode: "DEEP_LINK_ONLY",
    };
  }

  async createReservation(
    _request: CreateReservationRequest,
    _config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<Reservation>> {
    return {
      success: false,
      error: "Deep link providers do not support direct booking. Redirect user to external booking URL.",
      errorCode: "DEEP_LINK_ONLY",
    };
  }

  async cancelReservation(
    _request: CancelReservationRequest,
    _config?: ReservationProviderConfig
  ): Promise<ReservationProviderResult<{ cancelled: boolean }>> {
    return {
      success: false,
      error: "Deep link providers do not support cancellation. User must cancel on external platform.",
      errorCode: "DEEP_LINK_ONLY",
    };
  }
}
