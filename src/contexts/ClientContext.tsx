import { createContext, useContext } from "react";

interface ClientContext {
  clientId: string;
  clientSlug: string;
}

const ClientCtx = createContext<ClientContext | null>(null);

export const ClientProvider = ClientCtx.Provider;

export const useClientId = () => {
  const ctx = useContext(ClientCtx);
  if (!ctx) throw new Error("useClientId must be used within ClientProvider");
  return ctx;
};
