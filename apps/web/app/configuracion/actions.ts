"use server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseProfileForm, ProfileInputError, profileRpcError, type ProfileSaveState } from "@/lib/profile-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveProfile(form: FormData): Promise<ProfileSaveState> {
  const user = await requireAdmin("/configuracion");
  let input: ReturnType<typeof parseProfileForm>;
  try { input = parseProfileForm(form); }
  catch (error) {
    if (error instanceof ProfileInputError) return { error: error.message, field: error.field };
    throw error;
  }
  let version: unknown;
  try {
    const { data, error } = await db().rpc("save_account_profile_v1", {
      p_account_id: input.accountId, p_expected_version: input.expectedVersion,
      p_changed_by: user.email, p_profile: input.profile,
    });
    if (error) return profileRpcError(error.code, error.message);
    version = data;
  } catch { return profileRpcError(); }
  if (!Number.isInteger(version) || version !== input.expectedVersion + 1) return profileRpcError();
  revalidatePath("/configuracion"); revalidatePath("/cuenta"); revalidatePath("/hoy");
  redirect(`/configuracion?account=${input.accountId}&revision=${version}`);
}

export async function saveProfileState(_previous: ProfileSaveState, form: FormData): Promise<ProfileSaveState> {
  return saveProfile(form);
}
