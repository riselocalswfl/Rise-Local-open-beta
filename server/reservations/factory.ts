import type { IReservationProvider } from "./provider";
import { DeepLinkProvider } from "./providers/deep-link";
import { OpenTableProvider } from "./providers/opentable";
import { SevenRoomsProvider } from "./providers/sevenrooms";
import { ResyProvider } from "./providers/resy";

export type ReservationSystemType = 
  | "OpenTable" 
  | "SevenRooms" 
  | "Resy" 
  | "Website" 
  | "Phone" 
  | "None";

const providerInstances: Map<string, IReservationProvider> = new Map();

function getOrCreateProvider<T extends IReservationProvider>(
  key: string,
  factory: () => T
): T {
  if (!providerInstances.has(key)) {
    providerInstances.set(key, factory());
  }
  return providerInstances.get(key) as T;
}

export function getReservationProvider(
  reservationSystem: ReservationSystemType | string | undefined
): IReservationProvider {
  switch (reservationSystem) {
    case "OpenTable":
      return getOrCreateProvider("OpenTable", () => new OpenTableProvider());
    
    case "SevenRooms":
      return getOrCreateProvider("SevenRooms", () => new SevenRoomsProvider());
    
    case "Resy":
      return getOrCreateProvider("Resy", () => new ResyProvider());
    
    case "Website":
    case "Phone":
    case "None":
    case undefined:
    default:
      return getOrCreateProvider("DeepLink", () => new DeepLinkProvider());
  }
}

export function getReservationInfo(
  reservationSystem: ReservationSystemType | string | undefined,
  reservationLink: string | undefined
): {
  provider: IReservationProvider;
  useDeepLink: boolean;
  deepLinkUrl: string | null;
  supportsDirectBooking: boolean;
  supportsAvailability: boolean;
} {
  const provider = getReservationProvider(reservationSystem);
  
  const useDeepLink = 
    !provider.supportsDirectBooking || 
    reservationSystem === "Website" ||
    reservationSystem === "Phone";
  
  return {
    provider,
    useDeepLink,
    deepLinkUrl: useDeepLink && reservationLink ? reservationLink : null,
    supportsDirectBooking: provider.supportsDirectBooking && !useDeepLink,
    supportsAvailability: provider.supportsRealTimeAvailability && !useDeepLink,
  };
}

export function isDirectBookingSupported(
  reservationSystem: ReservationSystemType | string | undefined
): boolean {
  if (!reservationSystem || reservationSystem === "Website" || reservationSystem === "Phone" || reservationSystem === "None") {
    return false;
  }
  const provider = getReservationProvider(reservationSystem);
  return provider.supportsDirectBooking;
}
