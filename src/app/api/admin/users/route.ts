import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getAdminContext(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return { ok: false as const, error: "Supabase server configuration is incomplete.", status: 500 };
  }

  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return { ok: false as const, error: "Authentication required.", status: 401 };

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return { ok: false as const, error: "Your session is invalid or expired.", status: 401 };
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not verify user-management role:", profileError);
    return { ok: false as const, error: "Could not verify administrator access.", status: 500 };
  }
  if (profile?.role !== "Admin") {
    return { ok: false as const, error: "Administrator access is required.", status: 403 };
  }

  return { ok: true as const, adminClient, user: authData.user };
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if (!context.ok) return jsonError(context.error, context.status);

  const { data, error } = await context.adminClient
    .from("profiles")
    .select("id,email,name,role,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load user profiles:", error);
    return jsonError("Failed to load users.", 500);
  }

  return NextResponse.json({
    users: data.map((profile) => ({
      uid: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      createdAt: new Date(profile.created_at).getTime(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext(request);
  if (!context.ok) return jsonError(context.error, context.status);

  let body: { name?: string; email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("A valid JSON request body is required.", 400);
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!name || !email || !body.password || body.password.length < 6) {
    return jsonError("Name, valid email, and a password of at least 6 characters are required.", 400);
  }
  if (body.role !== "Admin" && body.role !== "Staff") {
    return jsonError("Role must be Admin or Staff.", 400);
  }

  const { data, error } = await context.adminClient.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error || !data.user) {
    return jsonError(error?.message || "Failed to create the account.", 400);
  }

  const { error: profileError } = await context.adminClient.from("profiles").upsert({
    id: data.user.id,
    email,
    name,
    role: body.role,
  });
  if (profileError) {
    const { error: rollbackError } = await context.adminClient.auth.admin.deleteUser(data.user.id);
    if (rollbackError) console.error("Failed to roll back new Auth user:", rollbackError);
    console.error("Failed to create user profile:", profileError);
    return jsonError("Account created but its profile could not be saved.", 500);
  }

  return NextResponse.json({ uid: data.user.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext(request);
  if (!context.ok) return jsonError(context.error, context.status);

  let body: { uid?: string; name?: string; role?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("A valid JSON request body is required.", 400);
  }

  const name = body.name?.trim();
  if (!body.uid || !name || (body.role !== "Admin" && body.role !== "Staff")) {
    return jsonError("User ID, name, and a valid role are required.", 400);
  }
  if (body.password && body.password.length < 6) {
    return jsonError("Password must be at least 6 characters.", 400);
  }
  if (body.uid === context.user.id && body.role !== "Admin") {
    return jsonError("You cannot remove your own administrator role.", 400);
  }

  const { error: authError } = await context.adminClient.auth.admin.updateUserById(body.uid, {
    user_metadata: { display_name: name },
    ...(body.password ? { password: body.password } : {}),
  });
  if (authError) return jsonError(authError.message, 400);

  const { error } = await context.adminClient
    .from("profiles")
    .update({ name, role: body.role })
    .eq("id", body.uid);
  if (error) {
    console.error("Failed to update user profile:", error);
    return jsonError("Auth account was updated, but its profile could not be saved.", 500);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const context = await getAdminContext(request);
  if (!context.ok) return jsonError(context.error, context.status);

  let body: { uid?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("A valid JSON request body is required.", 400);
  }

  if (!body.uid) return jsonError("User ID is required.", 400);
  if (body.uid === context.user.id) {
    return jsonError("You cannot delete your own account while signed in.", 400);
  }

  const { error } = await context.adminClient.auth.admin.deleteUser(body.uid);
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ success: true });
}
