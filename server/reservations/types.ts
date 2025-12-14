import { z } from "zod";

export const reservationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const timeSlotSchema = z.object({
  time: z.string(),
  available: z.boolean(),
  partySize: z.number().optional(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

export const availabilityRequestSchema = z.object({
  vendorId: z.string(),
  date: z.string(),
  partySize: z.number(),
  time: z.string().optional(),
});

export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;

export const availabilityResponseSchema = z.object({
  date: z.string(),
  slots: z.array(timeSlotSchema),
  providerName: z.string(),
});

export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;

export const createReservationRequestSchema = z.object({
  vendorId: z.string(),
  userId: z.string(),
  date: z.string(),
  time: z.string(),
  partySize: z.number(),
  guestName: z.string(),
  guestEmail: z.string(),
  guestPhone: z.string().optional(),
  specialRequests: z.string().optional(),
});

export type CreateReservationRequest = z.infer<typeof createReservationRequestSchema>;

export const reservationSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  userId: z.string(),
  providerReservationId: z.string().optional(),
  date: z.string(),
  time: z.string(),
  partySize: z.number(),
  guestName: z.string(),
  guestEmail: z.string(),
  guestPhone: z.string().optional(),
  specialRequests: z.string().optional(),
  status: reservationStatusSchema,
  confirmationCode: z.string().optional(),
  providerName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Reservation = z.infer<typeof reservationSchema>;

export const cancelReservationRequestSchema = z.object({
  reservationId: z.string(),
  vendorId: z.string(),
  reason: z.string().optional(),
});

export type CancelReservationRequest = z.infer<typeof cancelReservationRequestSchema>;

export interface ReservationProviderConfig {
  apiKey?: string;
  restaurantId?: string;
  webhookSecret?: string;
  sandbox?: boolean;
}

export interface ReservationProviderResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}
