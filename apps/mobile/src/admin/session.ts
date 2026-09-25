import { ApiError } from "../api/client";
import { copy } from "../copy";

export async function guard(
  setToken: (token: string | null) => Promise<void>,
  setError: (message: string) => void,
  work: () => Promise<void>,
): Promise<boolean> {
  try {
    await work();
    setError("");
    return true;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 401) {
      await setToken(null);
      return false;
    }
    setError(caught instanceof ApiError ? caught.message : copy.loadError);
    return false;
  }
}
