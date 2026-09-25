import { Redirect } from "expo-router";
import { CustomerList } from "../../src/admin/CustomerList";
import { ManageFrame } from "../../src/admin/ui";
import { useAuth } from "../../src/auth";
import { LoadingState } from "../../src/components/StatusText";
import { copy } from "../../src/copy";

export default function CustomersScreen() {
  const { token, ready, setToken } = useAuth();
  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  return (
    <ManageFrame title={copy.manageCustomers}>
      <CustomerList token={token} setToken={setToken} />
    </ManageFrame>
  );
}
