import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api/client";
import { copy } from "../copy";
import { guard } from "./session";
import { emptyHours, WEEKDAYS, type Hours, type ServiceRow, type ShopProfile } from "./types";
import { cardStyle, Field, Notice, PrimaryButton, QuietButton } from "./ui";

type ShopPayload = { profile: ShopProfile | null; services: ServiceRow[] };

function emptyProfile(): ShopProfile {
  return {
    name: "",
    tagline: "",
    address: "",
    directions: "",
    hotline: "",
    hours: emptyHours(),
    intro: "",
    amenities: "",
    policyBooking: "",
    policyCancel: "",
    policyLate: "",
    policyNewGuest: "",
    voice: "",
    forbidden: "",
  };
}

const PROFILE_FIELDS = [
  ["name", copy.shopName],
  ["tagline", copy.tagline],
  ["address", copy.address],
  ["directions", copy.directions],
  ["hotline", copy.hotline],
  ["intro", copy.intro],
  ["amenities", copy.amenities],
  ["policyBooking", copy.policyBooking],
  ["policyCancel", copy.policyCancel],
  ["policyLate", copy.policyLate],
  ["policyNewGuest", copy.policyNewGuest],
  ["voice", copy.voice],
  ["forbidden", copy.forbidden],
] as const;

const LONG_FIELDS = new Set<string>(["directions", "intro", "amenities", "policyBooking", "policyCancel", "policyLate", "policyNewGuest", "voice", "forbidden"]);

export function ShopEditor({
  token,
  setToken,
}: {
  token: string;
  setToken: (token: string | null) => Promise<void>;
}) {
  const [profile, setProfile] = useState<ShopProfile>(emptyProfile);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [draft, setDraft] = useState({ name: "", durationMinutes: "60", priceVnd: "0", description: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void guard(setToken, setError, async () => {
      const data = await api<ShopPayload>("/api/admin/shop", token);
      if (data.profile) setProfile({ ...data.profile, hours: { ...emptyHours(), ...data.profile.hours } });
      setServices(data.services.map((row) => ({ ...row, active: Boolean(row.active) })));
    });
  }, [setToken, token]);

  function setText(key: Exclude<keyof ShopProfile, "hours">, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function setHour(key: keyof Hours, value: string) {
    setProfile((current) => ({ ...current, hours: { ...current.hours, [key]: value } }));
  }

  async function saveProfile() {
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      await api("/api/admin/shop", token, { method: "PUT", body: JSON.stringify(profile) });
    });
    if (ok) setMessage(copy.saved);
  }

  async function addService() {
    const durationMinutes = Number(draft.durationMinutes);
    const priceVnd = Number(draft.priceVnd);
    if (!Number.isInteger(durationMinutes) || !Number.isInteger(priceVnd)) {
      setError(copy.numberInvalid);
      return;
    }
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      const created = await api<ServiceRow>("/api/admin/services", token, {
        method: "POST",
        body: JSON.stringify({
          name: draft.name,
          durationMinutes,
          priceVnd,
          description: draft.description,
          sortOrder: services.length,
          active: true,
        }),
      });
      setServices((current) => [...current, { ...created, active: Boolean(created.active) }]);
      setDraft({ name: "", durationMinutes: "60", priceVnd: "0", description: "" });
    });
    if (ok) setMessage(copy.saved);
  }

  async function saveService(row: ServiceRow) {
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      const saved = await api<ServiceRow>(`/api/admin/services/${row.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ ...row, active: Boolean(row.active) }),
      });
      setServices((current) => current.map((item) => (item.id === saved.id ? { ...saved, active: Boolean(saved.active) } : item)));
    });
    if (ok) setMessage(copy.saved);
  }

  async function removeService(id: string) {
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      await api(`/api/admin/services/${id}`, token, { method: "DELETE" });
      setServices((current) => current.filter((item) => item.id !== id));
    });
    if (ok) setMessage(copy.saved);
  }

  return (
    <ScrollView contentContainerStyle={cardStyle.card} keyboardShouldPersistTaps="handled">
      {PROFILE_FIELDS.map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={profile[key]}
          multiline={LONG_FIELDS.has(key)}
          keyboard={key === "hotline" ? "phone-pad" : "default"}
          onChangeText={(value) => setText(key, value)}
        />
      ))}
      <Text style={cardStyle.title}>{copy.hours}</Text>
      {WEEKDAYS.map(([key, label]) => (
        <Field key={key} label={label} value={profile.hours[key]} onChangeText={(value) => setHour(key, value)} />
      ))}
      <PrimaryButton label={copy.save} onPress={() => void saveProfile()} />
      <Text style={cardStyle.title}>{copy.services}</Text>
      {services.length === 0 ? <Text style={cardStyle.meta}>{copy.emptyList}</Text> : null}
      {services.map((row) => (
        <View key={row.id} style={cardStyle.card}>
          <Field label={copy.serviceName} value={row.name} onChangeText={(name) => patchService(setServices, row.id, { name })} />
          <Field
            label={copy.duration}
            value={String(row.durationMinutes)}
            keyboard="numeric"
            onChangeText={(value) => patchService(setServices, row.id, { durationMinutes: Number(value) || 0 })}
          />
          <Field
            label={copy.price}
            value={String(row.priceVnd)}
            keyboard="numeric"
            onChangeText={(value) => patchService(setServices, row.id, { priceVnd: Number(value) || 0 })}
          />
          <Field
            label={copy.description}
            value={row.description}
            multiline
            onChangeText={(description) => patchService(setServices, row.id, { description })}
          />
          <View style={cardStyle.row}>
            <PrimaryButton label={copy.save} onPress={() => void saveService(row)} />
            <QuietButton label={copy.remove} onPress={() => void removeService(row.id)} />
          </View>
        </View>
      ))}
      <Field label={copy.serviceName} value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} />
      <Field
        label={copy.duration}
        value={draft.durationMinutes}
        keyboard="numeric"
        onChangeText={(durationMinutes) => setDraft((current) => ({ ...current, durationMinutes }))}
      />
      <Field
        label={copy.price}
        value={draft.priceVnd}
        keyboard="numeric"
        onChangeText={(priceVnd) => setDraft((current) => ({ ...current, priceVnd }))}
      />
      <Field
        label={copy.description}
        value={draft.description}
        multiline
        onChangeText={(description) => setDraft((current) => ({ ...current, description }))}
      />
      <PrimaryButton label={copy.addService} onPress={() => void addService()} />
      <Notice message={message} error={error} />
    </ScrollView>
  );
}

function patchService(
  setServices: (value: ServiceRow[] | ((current: ServiceRow[]) => ServiceRow[])) => void,
  id: string,
  patch: Partial<ServiceRow>,
) {
  setServices((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
}
