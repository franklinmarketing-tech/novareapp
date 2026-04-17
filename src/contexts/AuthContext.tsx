import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "client" | null;
type ClientStatus = "onboarding_pendente" | "em_diagnostico" | "em_acompanhamento" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  clientStatus: ClientStatus;
  refreshClientStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [clientStatus, setClientStatus] = useState<ClientStatus>(null);
  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const r = (data?.role as UserRole) ?? null;
    setRole(r);
    return r;
  };

  const fetchClientStatus = async (userId: string) => {
    const { data } = await supabase
      .from("clients")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    setClientStatus((data?.status as ClientStatus) ?? null);
  };

  const refreshClientStatus = async () => {
    if (user) await fetchClientStatus(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            const r = await fetchRole(session.user.id);
            if (r === "client") await fetchClientStatus(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setClientStatus(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id).then((r) => {
          if (r === "client") fetchClientStatus(session.user.id);
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setClientStatus(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, clientStatus, refreshClientStatus, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
