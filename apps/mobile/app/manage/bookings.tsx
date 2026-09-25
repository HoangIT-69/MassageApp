import { Redirect } from "expo-router";
import { BookingList } from "../../src/admin/BookingList";
import { ManageFrame } from "../../src/admin/ui";
import { useAuth } from "../../src/auth";
import { LoadingState } from "../../src/components/StatusText";
import { copy } from "../../src/copy";

export default function BookingsScreen() {
  const { token, ready, setToken } = useAuth();
  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  return (
    <ManageFrame title={copy.manageBookings}>
      <BookingList token={token} setToken={setToken} />
    </ManageFrame>
  );
}
