"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, storeItems, loading } = useAuth();
  const [purchaseStatus, setPurchaseStatus] = useState<string>("");

  const handlePurchase = async (itemId: string) => {
    if (!user) return;
    setPurchaseStatus("Обработка покупки...");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchase/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ item_id: itemId }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Purchase failed");
      setPurchaseStatus(
        `Покупка успешна! Ваш новый баланс: ${data.new_balance}`
      );
    } catch (err) {
      if (err instanceof Error) {
        setPurchaseStatus(`Ошибка: ${err.message}`);
      } else {
        setPurchaseStatus("Произошла непредвиденная ошибка");
      }
    }
  };

  if (loading) return <p>Загрузка товаров...</p>;

  return (
    <div>
      <h1>Магазин Эмодзи</h1>
      {purchaseStatus && (
        <p>
          <strong>{purchaseStatus}</strong>
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {storeItems.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "48px", margin: "0" }}>{item.emoji_char}</p>
            <p>{item.name}</p>
            <p>
              <strong>Цена: {item.price}</strong>
            </p>
            {user && (
              <button onClick={() => handlePurchase(item.id)}>Купить</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
