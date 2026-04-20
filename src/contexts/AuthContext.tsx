import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "super_admin" | "admin" | "client" | null;
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
    // Pega TODOS os papéis e prioriza super_admin > admin > client
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (data ?? []).map((r) => r.role as string);
    let r: UserRole = null;
    if (roles.includes("super_admin")) r = "super_admin";
    else if (roles.includes("admin")) r = "admin";
    else if (roles.includes("client")) r = "client";
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
    // Defer loading=false until role/status are fetched, so ProtectedRoute
    // doesn't bounce the user to /login during the auth-resolution gap.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // setTimeout(0) evita deadlock no callback do auth state
          setTimeout(async () => {
            try {
              const r = await fetchRole(session.user.id);
              if (r === "client") await fetchClientStatus(session.user.id);
              else setClientStatus(null);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setRole(null);
          setClientStatus(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const r = await fetchRole(session.user.id);
          if (r === "client") await fetchClientStatus(session.user.id);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
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
