import { Redirect, useLocalSearchParams } from "expo-router";
import { StaffForm } from "../../../src/admin/StaffForm";
import { ManageFrame } from "../../../src/admin/ui";
import { useAuth } from "../../../src/auth";
import { LoadingState } from "../../../src/components/StatusText";
import { copy } from "../../../src/copy";

export default function StaffEditScreen() {
  const { token, ready, setToken } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const staffId = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  if (!staffId) return <Redirect href="/manage/staff" />;
  return (
    <ManageFrame title={copy.manageStaff}>
      <StaffForm token={token} setToken={setToken} staffId={staffId} />
    </ManageFrame>
  );
}
