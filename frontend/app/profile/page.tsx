// app/profile/page.tsx (финальная исправленная версия)
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, profileData, storeItems, loading } = useAuth();
  const router = useRouter();

  const [statusMessage, setStatusMessage] = useState("");
  const [giftingItemId, setGiftingItemId] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleGiftSubmit = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (!user || !recipientEmail) return;

    setStatusMessage(`Дарим предмет пользователю ${recipientEmail}...`);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/gift/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            item_id: itemId,
            recipient_email: recipientEmail,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gifting failed");

      setStatusMessage(
        data.success +
          " Пожалуйста, обновите страницу, чтобы увидеть изменения."
      );
      setGiftingItemId(null);
      setRecipientEmail("");
    } catch (err) {
      // ПРАВИЛЬНАЯ ОБРАБОТКА ОШИБКИ
      if (err instanceof Error) {
        setStatusMessage(`Ошибка: ${err.message}`);
      } else {
        setStatusMessage("Произошла непредвиденная ошибка");
      }
    }
  };

  const openGiftForm = (itemId: string) => {
    setGiftingItemId(itemId);
    setStatusMessage("");
  };

  if (loading || !user || !profileData) {
    return <div>Загрузка профиля...</div>;
  }

  const owned_ids = profileData.owned_items
    ? Object.keys(profileData.owned_items)
    : [];
  // ИСПРАВЛЕНА ЛОГИКА ФИЛЬТРАЦИИ
  const myOwnedEmojis = storeItems.filter(
    (item) =>
      owned_ids.includes(item.id) && profileData.owned_items[item.id] > 0
  );

  return (
    <div>
      <h1>Профиль пользователя</h1>
      <p>
        <strong>Email:</strong> {profileData.email}
      </p>
      <p>
        <strong>Баланс:</strong> {profileData.balance}
      </p>
      {statusMessage && (
        <p>
          <strong>{statusMessage}</strong>
        </p>
      )}
      <hr />
      <h2>Мои Эмодзи</h2>
      {myOwnedEmojis.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {myOwnedEmojis.map((item) => (
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
              {/* УБРАЛИ '(as any)' */}
              <p>
                <strong>Количество: {profileData.owned_items[item.id]}</strong>
              </p>
              <button onClick={() => openGiftForm(item.id)}>Подарить</button>
              {giftingItemId === item.id && (
                <form
                  onSubmit={(e) => handleGiftSubmit(e, item.id)}
                  style={{ marginTop: "10px" }}
                >
                  <div>
                    <label htmlFor={`gift-email-${item.id}`}>
                      Email получателя:
                    </label>
                    <input
                      id={`gift-email-${item.id}`}
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <button type="submit">Подтвердить</button>
                  <button type="button" onClick={() => setGiftingItemId(null)}>
                    Отмена
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>У вас пока нет купленных эмодзи.</p>
      )}
    </div>
  );
}
