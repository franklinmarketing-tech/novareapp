import { supabase } from "@/integrations/supabase/client";

export async function sendClientEmail(
  clientId: string,
  templateName: string,
  templateData: Record<string, any>
) {
  try {
    // Fetch client email via profile
    const { data: client } = await supabase
      .from("clients")
      .select("user_id")
      .eq("id", clientId)
      .single();
    if (!client) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", client.user_id)
      .single();
    if (!profile?.email) return;

    await supabase.functions.invoke("send-client-email", {
      body: {
        to: profile.email,
        templateName,
        templateData: { ...templateData, clientName: profile.full_name },
      },
    });
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error sending client email:", err);
  }
}
