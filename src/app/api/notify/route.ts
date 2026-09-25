import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Cette route tourne côté serveur uniquement : c'est le seul endroit où la
// clé privée VAPID et la clé de service Supabase (qui contourne RLS)
// doivent exister. Jamais dans du code "use client".
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface NotifyBody {
  scope: "class" | "school" | "national";
  school_id: string | null;
  class_id: string | null;
  title: string;
  body: string;
}

export async function POST(req: NextRequest) {
  if (!vapidPublicKey || !vapidPrivateKey || !serviceRoleKey) {
    // Notifications non configurées : on n'échoue pas bruyamment, la
    // publication elle-même ne doit jamais dépendre de ça.
    return NextResponse.json({ skipped: true }, { status: 200 });
  }

  webpush.setVapidDetails(
    "mailto:contact@echo-benin.example",
    vapidPublicKey,
    vapidPrivateKey
  );

  const { scope, school_id, class_id, title, body } =
    (await req.json()) as NotifyBody;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Retrouve les parents concernés, avec la même logique de portée que le fil.
  let parentIdsQuery = supabaseAdmin.from("children").select("parent_id");
  if (scope === "class" && class_id) {
    parentIdsQuery = parentIdsQuery.eq("class_id", class_id);
  } else if (scope === "school" && school_id) {
    parentIdsQuery = parentIdsQuery.eq("school_id", school_id);
  }
  // scope === "national" : pas de filtre, tous les parents sont concernés.

  const { data: children, error: childrenError } = await parentIdsQuery;
  if (childrenError) {
    return NextResponse.json({ error: childrenError.message }, { status: 500 });
  }

  const parentIds = [...new Set((children || []).map((c) => c.parent_id))];

  let subsQuery = supabaseAdmin.from("push_subscriptions").select("*");
  if (scope !== "national") {
    if (parentIds.length === 0) {
      return NextResponse.json({ sent: 0 });
    }
    subsQuery = subsQuery.in("parent_id", parentIds);
  }

  const { data: subscriptions, error: subsError } = await subsQuery;
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const payload = JSON.stringify({ title, body, url: "/feed" });

  const results = await Promise.allSettled(
    (subscriptions || []).map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  // Un abonnement expiré/révoqué renvoie 404/410 : on le supprime pour ne
  // pas réessayer indéfiniment.
  const expired = (subscriptions || []).filter((sub, i) => {
    const r = results[i];
    return (
      r.status === "rejected" &&
      typeof r.reason === "object" &&
      r.reason !== null &&
      "statusCode" in r.reason &&
      [404, 410].includes((r.reason as { statusCode: number }).statusCode)
    );
  });
  if (expired.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("id", expired.map((s) => s.id));
  }

  return NextResponse.json({
    sent: results.filter((r) => r.status === "fulfilled").length,
  });
}
