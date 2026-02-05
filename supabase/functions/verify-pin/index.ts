import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "no auth" }), { status: 401 });
  }

  const { pin } = await req.json();
  if (!pin) {
    return new Response(JSON.stringify({ error: "no pin" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    return new Response(JSON.stringify({ error: "not logged in" }), { status: 401 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("pin_test")
    .eq("user_id", user.user.id)
    .single();

  const isCorrect = settings?.pin_test === pin;

  return new Response(JSON.stringify({ ok: isCorrect }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});