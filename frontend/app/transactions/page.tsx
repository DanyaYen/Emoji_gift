"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState(0);
  const [title, setTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
  }, [user, loading, router]);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || amount <= 0) return;
    setIsSubmitting(true);
    setStatusMessage("Отправка транзакции...");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/transactions/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipient_email: recipientEmail,
            amount: Number(amount),
            title: title,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Transaction failed");
      setStatusMessage("Успех! Транзакция завершена.");
    } catch (err) {
      if (err instanceof Error) {
        setStatusMessage(`Ошибка: ${err.message}`);
      } else {
        setStatusMessage("Произошла непредвиденная ошибка");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div>Загрузка...</div>;
  }

  return (
    <div>
      <h1>Новая транзакция</h1>
      <form onSubmit={handleTransaction}>
        <div>
          <label htmlFor="email">Email получателя:</label>
          <input
            id="email"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="amount">Сумма:</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
            min="1"
          />
        </div>
        <div>
          <label htmlFor="title">Назначение:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Отправка..." : "Отправить"}
        </button>
      </form>
      {statusMessage && (
        <p>
          <strong>{statusMessage}</strong>
        </p>
      )}
    </div>
  );
}
