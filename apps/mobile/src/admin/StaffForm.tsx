import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { api, apiImage, apiUpload } from "../api/client";
import { copy } from "../copy";
import { theme } from "../theme";
import { guard } from "./session";
import { blankShifts, SHIFT_DAYS, type Shift, type StaffGender, type StaffRow } from "./types";
import { cardStyle, Field, Notice, PrimaryButton, QuietButton } from "./ui";

const TIME_PATTERN = /^\d{2}:\d{2}$/;
const GENDERS: { id: StaffGender; label: string }[] = [
  { id: "nam", label: copy.genderNam },
  { id: "nu", label: copy.genderNu },
  { id: "khac", label: copy.genderKhac },
];

function blank(): StaffRow {
  return {
    id: "",
    name: "",
    gender: "nu",
    specialties: "",
    yearsExperience: 0,
    bio: "",
    active: true,
    sortOrder: 0,
    photoPath: null,
    shifts: blankShifts(),
  };
}

function withShifts(row: StaffRow): StaffRow {
  const shifts = blankShifts().map((shift) => row.shifts.find((item) => item.weekday === shift.weekday) ?? shift);
  return { ...row, active: Boolean(row.active), shifts };
}

export function StaffForm({
  token,
  setToken,
  staffId,
}: {
  token: string;
  setToken: (token: string | null) => Promise<void>;
  staffId: string;
}) {
  const router = useRouter();
  const creating = staffId === "new";
  const [person, setPerson] = useState<StaffRow>(blank);
  const [years, setYears] = useState("0");
  const [photo, setPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (creating) return;
    void guard(setToken, setError, async () => {
      const data = await api<{ staff: StaffRow[] }>("/api/admin/staff", token);
      const found = data.staff.find((item) => item.id === staffId);
      if (!found) {
        setError(copy.loadError);
        return;
      }
      const next = withShifts(found);
      setPerson(next);
      setYears(String(next.yearsExperience));
      setPhoto(await apiImage(`/api/admin/staff/${staffId}/photo`, token));
    });
  }, [creating, setToken, staffId, token]);

  function setShift(weekday: number, key: "startTime" | "endTime", value: string) {
    setPerson((current) => ({
      ...current,
      shifts: current.shifts.map((shift) => (shift.weekday === weekday ? { ...shift, [key]: value } : shift)),
    }));
  }

  function collectShifts(): Shift[] | null {
    const filled: Shift[] = [];
    for (const shift of person.shifts) {
      if (!shift.startTime && !shift.endTime) continue;
      if (!TIME_PATTERN.test(shift.startTime) || !TIME_PATTERN.test(shift.endTime)) return null;
      filled.push(shift);
    }
    return filled;
  }

  async function save() {
    const yearsExperience = Number(years);
    const shifts = collectShifts();
    if (!Number.isInteger(yearsExperience) || yearsExperience < 0 || !shifts) {
      setError(!shifts ? copy.shiftInvalid : copy.numberInvalid);
      return;
    }
    const body = {
      name: person.name,
      gender: person.gender,
      specialties: person.specialties,
      yearsExperience,
      bio: person.bio,
      active: person.active,
      sortOrder: person.sortOrder,
      shifts,
    };
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      if (creating) {
        const created = await api<StaffRow>("/api/admin/staff", token, { method: "POST", body: JSON.stringify(body) });
        router.replace(`/manage/staff/${created.id}`);
        return;
      }
      await api(`/api/admin/staff/${staffId}`, token, { method: "PUT", body: JSON.stringify(body) });
    });
    if (ok && !creating) setMessage(copy.saved);
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(copy.photoDenied);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? "staff.jpg";
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      await apiUpload(`/api/admin/staff/${staffId}/photo`, token, {
        uri: asset.uri,
        name,
        type: imageContentType(asset.mimeType, name),
      });
      setPhoto(await apiImage(`/api/admin/staff/${staffId}/photo`, token));
    });
    if (ok) setMessage(copy.saved);
  }

  return (
    <ScrollView contentContainerStyle={cardStyle.card} keyboardShouldPersistTaps="handled">
      <Field label={copy.staffName} value={person.name} onChangeText={(name) => setPerson((current) => ({ ...current, name }))} />
      <Text style={cardStyle.meta}>{copy.gender}</Text>
      <View style={cardStyle.row}>
        {GENDERS.map((gender) => (
          <QuietButton
            key={gender.id}
            label={person.gender === gender.id ? `• ${gender.label}` : gender.label}
            onPress={() => setPerson((current) => ({ ...current, gender: gender.id }))}
          />
        ))}
      </View>
      <Field
        label={copy.specialties}
        value={person.specialties}
        onChangeText={(specialties) => setPerson((current) => ({ ...current, specialties }))}
      />
      <Field label={copy.years} value={years} keyboard="numeric" onChangeText={setYears} />
      <Field label={copy.bio} value={person.bio} multiline onChangeText={(bio) => setPerson((current) => ({ ...current, bio }))} />
      <View style={cardStyle.row}>
        <Text style={cardStyle.meta}>{copy.accepting}</Text>
        <Switch
          accessibilityLabel={copy.accepting}
          value={person.active}
          onValueChange={(active) => setPerson((current) => ({ ...current, active }))}
        />
      </View>
      <Text style={cardStyle.title}>{copy.shifts}</Text>
      {person.shifts.map((shift) => (
        <View key={shift.weekday} style={cardStyle.card}>
          <Text style={cardStyle.meta}>{SHIFT_DAYS[shift.weekday]}</Text>
          <Field label={copy.shiftStart} value={shift.startTime} onChangeText={(value) => setShift(shift.weekday, "startTime", value)} />
          <Field label={copy.shiftEnd} value={shift.endTime} onChangeText={(value) => setShift(shift.weekday, "endTime", value)} />
        </View>
      ))}
      <PrimaryButton label={copy.save} onPress={() => void save()} />
      <Text style={cardStyle.title}>{copy.photo}</Text>
      {creating ? <Text style={cardStyle.meta}>{copy.photoLater}</Text> : null}
      {photo ? <Image source={{ uri: photo }} accessibilityLabel={copy.photo} style={styles.photo} /> : null}
      {creating ? null : <PrimaryButton label={copy.pickPhoto} onPress={() => void pickPhoto()} />}
      <Notice message={message} error={error} />
    </ScrollView>
  );
}

function imageContentType(mime: string | null | undefined, name: string): string {
  if (mime === "image/png" || mime === "image/webp" || mime === "image/jpeg") return mime;
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

const PHOTO_SIZE = 160;

const styles = StyleSheet.create({
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, backgroundColor: theme.white },
});
