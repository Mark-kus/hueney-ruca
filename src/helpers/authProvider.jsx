import { createBrowserClient } from "@supabase/ssr";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * Reemplazo de @supabase/auth-helpers-react (deprecado) sobre @supabase/ssr.
 * Mantiene la misma API (useSession / useUser / useSupabaseClient) para no
 * tocar los componentes que ya la consumían.
 */

const SessionContext = createContext({ session: null, supabase: null });

export function SessionContextProvider({ children, initialSession = null, supabaseClient }) {
  const [supabase] = useState(
    () =>
      supabaseClient ||
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
  );
  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <SessionContext.Provider value={{ session, supabase }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSupabaseClient() {
  return useContext(SessionContext).supabase;
}

export function useSession() {
  return useContext(SessionContext).session;
}

export function useUser() {
  return useContext(SessionContext).session?.user ?? null;
}
