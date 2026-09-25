import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api/client";
import { copy } from "../copy";
import { guard } from "./session";
import { STATUS_LABEL, type CustomerCard } from "./types";
import { cardStyle, Field, Notice, PrimaryButton } from "./ui";

export function CustomerList({
  token,
  setToken,
}: {
  token: string;
  setToken: (token: string | null) => Promise<void>;
}) {
  const [customers, setCustomers] = useState<CustomerCard[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void guard(setToken, setError, async () => {
      const data = await api<{ customers: CustomerCard[] }>("/api/admin/customers", token);
      setCustomers(data.customers);
    });
  }, [setToken, token]);

  function patch(conversationId: string, next: Partial<CustomerCard>) {
    setCustomers((current) =>
      current.map((item) => (item.conversationId === conversationId ? { ...item, ...next } : item)),
    );
  }

  async function save(card: CustomerCard) {
    setMessage("");
    const ok = await guard(setToken, setError, async () => {
      await api(`/api/admin/customers/${card.conversationId}`, token, {
        method: "PUT",
        body: JSON.stringify({ displayName: card.displayName, phone: card.phone }),
      });
    });
    if (ok) setMessage(copy.saved);
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {customers.length === 0 ? <Text style={cardStyle.meta}>{copy.emptyList}</Text> : null}
      {customers.map((card) => (
        <View key={card.conversationId} style={cardStyle.card}>
          <Text style={cardStyle.title}>{card.zaloName || copy.zaloName}</Text>
          <Field
            label={copy.customerName}
            value={card.displayName}
            onChangeText={(displayName) => patch(card.conversationId, { displayName })}
          />
          <Field
            label={copy.phone}
            value={card.phone}
            keyboard="phone-pad"
            onChangeText={(phone) => patch(card.conversationId, { phone })}
          />
          <Text style={cardStyle.meta}>{copy.orders}</Text>
          {card.orders.length === 0 ? <Text style={cardStyle.meta}>{copy.noOrders}</Text> : null}
          {card.orders.map((order) => (
            <Text key={order.id} style={cardStyle.meta}>
              {order.serviceName} · {order.staffName || "—"} · {order.whenText} · {STATUS_LABEL[order.status] ?? order.status}
            </Text>
          ))}
          <PrimaryButton label={copy.save} onPress={() => void save(card)} />
        </View>
      ))}
      <Notice message={message} error={error} />
    </ScrollView>
  );
}
