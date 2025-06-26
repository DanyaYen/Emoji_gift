"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

type ProfileData = {
  email: string;
  balance: number;
  owned_items: { [key: string]: number };
};
type StoreItem = {
  id: string;
  name: string;
  emoji_char: string;
  price: number;
};

type AuthContextType = {
  user: User | null;
  profileData: ProfileData | null;
  storeItems: StoreItem[];
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profileData: null,
  storeItems: [],
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreItems = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/store/`
        );
        if (!response.ok) throw new Error("Failed to fetch store items");
        const data: StoreItem[] = await response.json();
        setStoreItems(data);
      } catch (error) {
        console.error("Failed to load store items:", error);
      }
    };

    fetchStoreItems();

    const unsubscribe = onAuthStateChanged(clientAuth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const token = await user.getIdToken();
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/profile/`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data: ProfileData = await response.json();
          setProfileData(data);
        } catch (error) {
          console.error(error);
          setProfileData(null);
        }
      } else {
        setUser(null);
        setProfileData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, profileData, storeItems, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
