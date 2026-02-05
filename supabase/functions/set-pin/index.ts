import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  await supabase
    .from("user_settings")
    .upsert({ user_id: user.user.id, pin_test: pin });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});