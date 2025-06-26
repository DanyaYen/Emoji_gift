"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, profileData, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    console.log("Нажата кнопка 'Выйти'"); 
    try {
      await signOut(clientAuth);
      console.log("Выход из Firebase успешен");
      router.push("/login");
    } catch (error) {
      console.error("Ошибка при выходе:", error); 
    }
  };

  if (loading) {
    return (
      <nav style={{ padding: "20px", borderBottom: "1px solid #ccc" }}>
        Загрузка...
      </nav>
    );
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        padding: "20px",
        borderBottom: "1px solid #ccc",
      }}
    >
      <Link href="/">Главная</Link>
      {user ? (
        <>
          <Link href="/profile">Профиль</Link>
          <Link href="/transactions">Транзакции</Link>
          {profileData && (
            <span style={{ marginLeft: "auto" }}>
              <strong>Баланс: {profileData.balance}</strong>
            </span>
          )}
          <span style={{ marginLeft: profileData ? "20px" : "auto" }}>
            (Вы вошли как: {user.email})
          </span>
          <button onClick={handleLogout}>Выйти</button>
        </>
      ) : (
        <>
          <Link href="/login" style={{ marginLeft: "auto" }}>
            Войти
          </Link>
          <Link href="/register">Регистрация</Link>
        </>
      )}
    </nav>
  );
}
