import { Redirect } from "expo-router";
import { StaffList } from "../../../src/admin/StaffList";
import { ManageFrame } from "../../../src/admin/ui";
import { useAuth } from "../../../src/auth";
import { LoadingState } from "../../../src/components/StatusText";
import { copy } from "../../../src/copy";

export default function StaffScreen() {
  const { token, ready, setToken } = useAuth();
  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  return (
    <ManageFrame title={copy.manageStaff}>
      <StaffList token={token} setToken={setToken} />
    </ManageFrame>
  );
}
