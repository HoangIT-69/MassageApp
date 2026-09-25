import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../api/client";
import { copy } from "../copy";
import { guard } from "./session";
import { SHIFT_DAYS, type StaffRow } from "./types";
import { cardStyle, PrimaryButton } from "./ui";

export function StaffList({
  token,
  setToken,
}: {
  token: string;
  setToken: (token: string | null) => Promise<void>;
}) {
  const router = useRouter();
  const [people, setPeople] = useState<StaffRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void guard(setToken, setError, async () => {
      const data = await api<{ staff: StaffRow[] }>("/api/admin/staff", token);
      setPeople(data.staff.map((person) => ({ ...person, active: Boolean(person.active) })));
    });
  }, [setToken, token]);

  return (
    <ScrollView>
      {people.length === 0 ? <Text style={cardStyle.meta}>{copy.emptyList}</Text> : null}
      {people.map((person) => (
        <Pressable
          key={person.id}
          accessibilityLabel={person.name}
          onPress={() => router.push(`/manage/staff/${person.id}`)}
          style={cardStyle.card}
        >
          <Text style={cardStyle.title}>{person.name}</Text>
          <Text style={cardStyle.meta}>{person.specialties || copy.specialties}</Text>
          <Text style={cardStyle.meta}>{shiftSummary(person)}</Text>
        </Pressable>
      ))}
      {error ? <Text style={cardStyle.meta}>{error}</Text> : null}
      <PrimaryButton label={copy.addStaff} onPress={() => router.push("/manage/staff/new")} />
    </ScrollView>
  );
}

function shiftSummary(person: StaffRow): string {
  const lines = person.shifts.map((shift) => `${SHIFT_DAYS[shift.weekday]} ${shift.startTime}–${shift.endTime}`);
  return lines.join(" · ");
}
