import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api/client";
import { copy } from "../copy";
import { guard } from "./session";
import { STATUS_LABEL, type BookingRow, type StaffRow } from "./types";
import { cardStyle, Field, Notice, PrimaryButton, QuietButton } from "./ui";

export function BookingList({
  token,
  setToken,
}: {
  token: string;
  setToken: (token: string | null) => Promise<void>;
}) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void guard(setToken, setError, async () => {
      const [bookingData, staffData] = await Promise.all([
        api<{ bookings: BookingRow[] }>("/api/admin/bookings", token),
        api<{ staff: StaffRow[] }>("/api/admin/staff", token),
      ]);
      setBookings(bookingData.bookings);
      setStaff(staffData.staff.map((person) => ({ id: person.id, name: person.name })));
    });
  }, [setToken, token]);

  function patch(id: string, next: Partial<BookingRow>) {
    setBookings((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  async function act(id: string, body: Record<string, unknown>) {
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      const saved = await api<BookingRow>(`/api/admin/bookings/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setBookings((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    });
    if (ok) setMessage(copy.saved);
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {bookings.length === 0 ? <Text style={cardStyle.meta}>{copy.emptyBookings}</Text> : null}
      {bookings.map((booking) => (
        <View key={booking.id} style={cardStyle.card}>
          <Text style={cardStyle.title}>{STATUS_LABEL[booking.status] ?? booking.status}</Text>
          <Text style={cardStyle.meta}>{booking.serviceName}</Text>
          <Text style={cardStyle.meta}>
            {booking.customerName || copy.displayName} · {booking.phone || copy.phone}
          </Text>
          {booking.status === "cho_xac_nhan" ? (
            <PendingBooking
              booking={booking}
              staff={staff}
              onWhen={(whenText) => patch(booking.id, { whenText })}
              onStaff={(staffId, staffName) => patch(booking.id, { staffId, staffName })}
              onAct={(body) => void act(booking.id, body)}
            />
          ) : (
            <Text style={cardStyle.meta}>
              {booking.whenText}
              {booking.staffName ? ` · ${booking.staffName}` : ""}
            </Text>
          )}
          {booking.status === "da_chot" || booking.status === "cho_xac_nhan" ? (
            <View style={cardStyle.row}>
              <PrimaryButton label={copy.completeBooking} onPress={() => void act(booking.id, { action: "complete" })} />
              <QuietButton label={copy.cancelBooking} onPress={() => void act(booking.id, { action: "cancel" })} />
            </View>
          ) : null}
        </View>
      ))}
      <Notice message={message} error={error} />
    </ScrollView>
  );
}

function PendingBooking({
  booking,
  staff,
  onWhen,
  onStaff,
  onAct,
}: {
  booking: BookingRow;
  staff: { id: string; name: string }[];
  onWhen: (value: string) => void;
  onStaff: (staffId: string | null, staffName: string) => void;
  onAct: (body: Record<string, unknown>) => void;
}) {
  return (
    <View style={cardStyle.card}>
      <Field label={copy.bookingWhen} value={booking.whenText} onChangeText={onWhen} />
      <Text style={cardStyle.meta}>{copy.bookingStaff}</Text>
      <View style={cardStyle.row}>
        <QuietButton label={booking.staffId ? copy.staffUnset : `• ${copy.staffUnset}`} onPress={() => onStaff(null, "")} />
        {staff.map((person) => (
          <QuietButton
            key={person.id}
            label={booking.staffId === person.id ? `• ${person.name}` : person.name}
            onPress={() => onStaff(person.id, person.name)}
          />
        ))}
      </View>
      <View style={cardStyle.row}>
        <QuietButton label={copy.saveWhen} onPress={() => onAct({ whenText: booking.whenText, staffId: booking.staffId })} />
        <PrimaryButton label={copy.confirmBooking} onPress={() => onAct({ action: "confirm" })} />
        <QuietButton label={copy.rejectBooking} onPress={() => onAct({ action: "reject" })} />
      </View>
    </View>
  );
}
