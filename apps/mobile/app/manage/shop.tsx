import { Redirect } from "expo-router";
import { ShopEditor } from "../../src/admin/ShopEditor";
import { ManageFrame } from "../../src/admin/ui";
import { useAuth } from "../../src/auth";
import { LoadingState } from "../../src/components/StatusText";
import { copy } from "../../src/copy";

export default function ShopScreen() {
  const { token, ready, setToken } = useAuth();
  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  return (
    <ManageFrame title={copy.manageShop}>
      <ShopEditor token={token} setToken={setToken} />
    </ManageFrame>
  );
}
