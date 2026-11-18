import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

function debug(msg) {
  writeFileSync(
    "C:\\Users\\alfim\\AppData\\Local\\Temp\\opencode\\debug.log",
    msg + "\n",
    { flag: "a" },
  );
}

debug("DEBUG: Script started");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("Environment Supabase lokal belum lengkap.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createTestUser(label) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const email = `${label}-${crypto.randomUUID()}@keywordscope.local`;
  const password = `Local-${crypto.randomUUID()}!`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.user || !data.session) {
    throw error ?? new Error(`Signup ${label} gagal.`);
  }

  const { data: membership, error: membershipError } = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", data.user.id)
    .single();
  if (membershipError) throw membershipError;

  return {
    client,
    userId: data.user.id,
    workspaceId: membership.workspace_id,
  };
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const userA = await createTestUser("keyword-a");
const userB = await createTestUser("keyword-b");
debug(
  "DEBUG: After creating users " + userA.workspaceId + " " + userB.workspaceId,
);

const { data: project, error: projectError } = await userA.client
  .from("projects")
  .insert({
    workspace_id: userA.workspaceId,
    name: "Keyword Operations",
    site_url: "https://keyword.example.test",
    domain: `keyword-${crypto.randomUUID()}.example.test`,
    default_country: "ID",
    default_language: "id",
    timezone: "Asia/Jakarta",
  })
  .select("id")
  .single();
if (projectError) throw projectError;

const { error: invalidAssigneeError } = await userA.client
  .from("keyword_targets")
  .insert({
    workspace_id: userA.workspaceId,
    project_id: project.id,
    phrase: "keyword invalid assignee",
    country_code: "ID",
    language_code: "id",
    device: "desktop",
    target_position: 10,
    assignee_user_id: userB.userId,
    created_by: userA.userId,
  });
assert(invalidAssigneeError, "PIC dari workspace lain dapat ditugaskan.");

const { data: target, error: targetError } = await userA.client
  .from("keyword_targets")
  .insert({
    workspace_id: userA.workspaceId,
    project_id: project.id,
    phrase: "  Jasa   SEO Jakarta  ",
    country_code: "ID",
    language_code: "id",
    device: "mobile",
    location: "Jakarta",
    target_position: 5,
    priority: "high",
    deadline: "2026-12-31",
    maintain_enabled: true,
    maintain_position_limit: 10,
    check_frequency_days: 7,
    assignee_user_id: userA.userId,
    created_by: userA.userId,
  })
  .select("id, canonical_phrase, normalized_location")
  .single();
if (targetError) throw targetError;
assert(
  target.canonical_phrase === "jasa seo jakarta",
  "Canonical phrase salah.",
);
assert(target.normalized_location === "jakarta", "Normalized location salah.");

const { error: duplicateError } = await userA.client
  .from("keyword_targets")
  .insert({
    workspace_id: userA.workspaceId,
    project_id: project.id,
    phrase: "jasa seo jakarta",
    country_code: "ID",
    language_code: "id",
    device: "mobile",
    location: " jakarta ",
    target_position: 3,
    created_by: userA.userId,
  });
assert(duplicateError?.code === "23505", "Target canonical duplikat diterima.");

const { error: invalidPositionError } = await userA.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    position: 101,
    not_found_top_100: false,
    country_code: "ID",
    device: "mobile",
    created_by: userA.userId,
  });
assert(invalidPositionError, "Posisi di luar 1..100 diterima.");

const { error: futureCheckinError } = await userA.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    source: "manual",
    position: 6,
    not_found_top_100: false,
    checked_at: "2099-01-01T00:00:00.000Z",
    country_code: "ID",
    device: "mobile",
    location: "Jakarta",
    created_by: userA.userId,
  });
assert(futureCheckinError, "Check-in bertanggal masa depan diterima.");

const { error: fakeProviderError } = await userA.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    source: "serp_provider",
    position: 6,
    not_found_top_100: false,
    country_code: "ID",
    device: "mobile",
    created_by: userA.userId,
  });
assert(fakeProviderError, "Member dapat memalsukan check-in serp_provider.");

const { error: mismatchedContextError } = await userA.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    source: "manual",
    position: 7,
    not_found_top_100: false,
    country_code: "US",
    device: "desktop",
    location: "Bandung",
    created_by: userA.userId,
  });
assert(
  mismatchedContextError,
  "Konteks locale/device check-in dapat berbeda dari target.",
);

const { data: checkin, error: checkinError } = await userA.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    source: "manual",
    position: 8,
    not_found_top_100: false,
    country_code: "ID",
    device: "mobile",
    location: "Jakarta",
    notes: "Observasi manual lokal.",
    created_by: userA.userId,
  })
  .select("id")
  .single();
if (checkinError) throw checkinError;

const { data: otherCheckin, error: otherCheckinError } = await userA.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    source: "manual",
    position: 9,
    not_found_top_100: false,
    country_code: "ID",
    device: "mobile",
    location: "Jakarta",
    created_by: userA.userId,
  })
  .select("id")
  .single();
if (otherCheckinError) throw otherCheckinError;

const { error: mutateHistoryError } = await admin
  .from("rank_checkins")
  .update({ position: 4 })
  .eq("id", checkin.id);
assert(mutateHistoryError, "Check-in historis dapat diubah.");

const { error: deleteHistoryError } = await admin
  .from("rank_checkins")
  .delete()
  .eq("id", checkin.id);
assert(deleteHistoryError, "Check-in historis dapat dihapus.");

const evidencePath = `${userA.workspaceId}/${target.id}/${checkin.id}/${crypto.randomUUID()}.png`;
const evidenceBytes = new TextEncoder().encode("keywordscope-evidence");
const orphanPath = `${userA.workspaceId}/${target.id}/${crypto.randomUUID()}/${crypto.randomUUID()}.png`;
const { error: orphanUploadError } = await userA.client.storage
  .from("rank-evidence")
  .upload(orphanPath, evidenceBytes, { contentType: "image/png" });
assert(
  orphanUploadError,
  "Member dapat mengunggah evidence tanpa check-in valid.",
);

const { error: evidenceUploadError } = await userA.client.storage
  .from("rank-evidence")
  .upload(evidencePath, evidenceBytes, { contentType: "image/png" });
if (evidenceUploadError) throw evidenceUploadError;

const { error: mismatchedEvidencePathError } = await userA.client
  .from("rank_evidence")
  .insert({
    workspace_id: userA.workspaceId,
    rank_checkin_id: otherCheckin.id,
    storage_path: evidencePath,
    file_name: "evidence.png",
    mime_type: "image/png",
    size_bytes: evidenceBytes.byteLength,
    uploaded_by: userA.userId,
  });
assert(
  mismatchedEvidencePathError,
  "Metadata evidence dapat menunjuk object milik check-in lain.",
);

const { data: evidence, error: evidenceMetadataError } = await userA.client
  .from("rank_evidence")
  .insert({
    workspace_id: userA.workspaceId,
    rank_checkin_id: checkin.id,
    storage_path: evidencePath,
    file_name: "evidence.png",
    mime_type: "image/png",
    size_bytes: evidenceBytes.byteLength,
    uploaded_by: userA.userId,
  })
  .select("id")
  .single();
if (evidenceMetadataError) throw evidenceMetadataError;

const { error: fakeSnapshotError } = await userA.client
  .from("rank_status_snapshots")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    based_on_checkin_id: checkin.id,
    status: "achieved",
    rule_version: "fake-rule",
    explanation: "Status palsu.",
    rule_input: {},
    evaluated_at: "2099-01-01T00:00:00.000Z",
  });
assert(fakeSnapshotError, "Member dapat memalsukan snapshot status.");

const { error: mismatchedSnapshotCheckinError } = await admin
  .from("rank_status_snapshots")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    based_on_checkin_id: crypto.randomUUID(),
    status: "on_track",
    rule_version: "rank-status-v1",
    explanation: "Relasi check-in tidak valid.",
    rule_input: {},
  });
assert(
  mismatchedSnapshotCheckinError,
  "Snapshot status dapat merujuk check-in yang bukan milik target.",
);

const { data: snapshot, error: snapshotError } = await admin
  .from("rank_status_snapshots")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    based_on_checkin_id: checkin.id,
    status: "on_track",
    rule_version: "rank-status-v1",
    explanation: "Posisi 8 belum mencapai target 5.",
    rule_input: { latestPosition: 8, targetPosition: 5 },
  })
  .select("id")
  .single();
if (snapshotError) throw snapshotError;

const { error: mutateSnapshotError } = await admin
  .from("rank_status_snapshots")
  .update({ status: "achieved" })
  .eq("id", snapshot.id);
assert(mutateSnapshotError, "Snapshot status historis dapat diubah.");

const { error: deleteSnapshotError } = await admin
  .from("rank_status_snapshots")
  .delete()
  .eq("id", snapshot.id);
assert(deleteSnapshotError, "Snapshot status historis dapat dihapus.");

const { data: leakedTarget, error: leakedTargetError } = await userB.client
  .from("keyword_targets")
  .select("id")
  .eq("id", target.id);
if (leakedTargetError) throw leakedTargetError;
assert(leakedTarget.length === 0, "Non-member dapat membaca target keyword.");

const { data: leakedCheckin, error: leakedCheckinError } = await userB.client
  .from("rank_checkins")
  .select("id")
  .eq("id", checkin.id);
if (leakedCheckinError) throw leakedCheckinError;
assert(leakedCheckin.length === 0, "Non-member dapat membaca check-in.");

const { data: leakedSnapshot, error: leakedSnapshotError } = await userB.client
  .from("rank_status_snapshots")
  .select("id")
  .eq("id", snapshot.id);
if (leakedSnapshotError) throw leakedSnapshotError;
assert(
  leakedSnapshot.length === 0,
  "Non-member dapat membaca snapshot status.",
);

const { data: leakedEvidence, error: leakedEvidenceError } = await userB.client
  .from("rank_evidence")
  .select("id")
  .eq("id", evidence.id);
if (leakedEvidenceError) throw leakedEvidenceError;
assert(
  leakedEvidence.length === 0,
  "Non-member dapat membaca metadata evidence.",
);

const { data: leakedObject, error: leakedObjectError } =
  await userB.client.storage.from("rank-evidence").download(evidencePath);
assert(
  leakedObjectError || !leakedObject,
  "Non-member dapat mengunduh evidence.",
);

const { data: leakedSignedUrl, error: leakedSignedUrlError } =
  await userB.client.storage
    .from("rank-evidence")
    .createSignedUrl(evidencePath, 60);
assert(
  leakedSignedUrlError || !leakedSignedUrl?.signedUrl,
  "Non-member dapat membuat signed URL evidence.",
);

const { error: crossInsertError } = await userB.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    position: 7,
    not_found_top_100: false,
    country_code: "ID",
    device: "mobile",
    created_by: userB.userId,
  });
assert(crossInsertError, "Non-member dapat membuat check-in lintas workspace.");

const { error: addMemberError } = await admin.from("workspace_members").insert({
  workspace_id: userA.workspaceId,
  user_id: userB.userId,
  role: "member",
});
if (addMemberError) throw addMemberError;

const { data: sharedTarget, error: sharedTargetError } = await userB.client
  .from("keyword_targets")
  .select("id")
  .eq("id", target.id)
  .single();
if (sharedTargetError) throw sharedTargetError;
assert(
  sharedTarget.id === target.id,
  "Member tidak dapat membaca target bersama.",
);

const { data: sharedEvidence, error: sharedEvidenceError } = await userB.client
  .from("rank_evidence")
  .select("id")
  .eq("id", evidence.id)
  .single();
if (sharedEvidenceError) throw sharedEvidenceError;
assert(
  sharedEvidence.id === evidence.id,
  "Member tidak dapat membaca evidence.",
);

const { data: signedEvidence, error: signedEvidenceError } =
  await userB.client.storage
    .from("rank-evidence")
    .createSignedUrl(evidencePath, 60);
if (signedEvidenceError) throw signedEvidenceError;
assert(
  signedEvidence.signedUrl,
  "Member tidak dapat membuat signed URL evidence.",
);

const { error: memberCheckinError } = await userB.client
  .from("rank_checkins")
  .insert({
    workspace_id: userA.workspaceId,
    keyword_target_id: target.id,
    position: null,
    not_found_top_100: true,
    country_code: "ID",
    device: "mobile",
    location: "Jakarta",
    created_by: userB.userId,
  });
if (memberCheckinError) throw memberCheckinError;

await userB.client.from("keyword_targets").delete().eq("id", target.id);
const { data: targetAfterMemberDelete, error: targetAfterMemberDeleteError } =
  await userA.client
    .from("keyword_targets")
    .select("id")
    .eq("id", target.id)
    .single();
if (targetAfterMemberDeleteError) throw targetAfterMemberDeleteError;
assert(
  targetAfterMemberDelete.id === target.id,
  "Member dapat menghapus target keyword.",
);

const { error: ownerDeleteHistoricalTargetError } = await userA.client
  .from("keyword_targets")
  .delete()
  .eq("id", target.id);
assert(
  ownerDeleteHistoricalTargetError,
  "Target bersejarah terhapus permanen dan menghilangkan check-in immutable.",
);

// Remove userB from userA's workspace to test non-member import access
await admin
  .from("workspace_members")
  .delete()
  .eq("workspace_id", userA.workspaceId)
  .eq("user_id", userB.userId);

debug("DEBUG: Before imports section");

const importKey = `import-test-${crypto.randomUUID()}`;
const { data: importRecord, error: importInsertError } = await admin
  .from("imports")
  .insert({
    workspace_id: userA.workspaceId,
    type: "keyword_targets",
    file_name: "test.xlsx",
    idempotency_key: importKey,
    total_rows: 1,
    valid_rows: 0,
    invalid_rows: 1,
    created_by: userA.userId,
  })
  .select("id, workspace_id")
  .single();
if (importInsertError) throw importInsertError;
debug("DEBUG importRecord: " + JSON.stringify(importRecord));

const { data: importRow, error: importRowError } = await admin
  .from("import_rows")
  .insert({
    import_id: importRecord.id,
    workspace_id: userA.workspaceId,
    row_number: 2,
    status: "invalid",
    input: { foo: "bar" },
    errors: ["test"],
  })
  .select("id")
  .single();
if (importRowError) throw importRowError;

const { data: leakedImport, error: leakedImportError } = await userB.client
  .from("imports")
  .select("id, workspace_id")
  .eq("id", importRecord.id);
if (leakedImportError) throw leakedImportError;
debug(
  "DEBUG leakedImport: " +
    JSON.stringify(leakedImport) +
    " userB workspace: " +
    userB.workspaceId,
);
assert(leakedImport.length === 0, "Non-member dapat membaca import.");

const { data: leakedImportRow, error: leakedImportRowError } =
  await userB.client.from("import_rows").select("id").eq("id", importRow.id);
if (leakedImportRowError) throw leakedImportRowError;
assert(leakedImportRow.length === 0, "Non-member dapat membaca import_rows.");

const { error: crossImportInsertError } = await userB.client
  .from("imports")
  .insert({
    workspace_id: userA.workspaceId,
    type: "keyword_targets",
    file_name: "cross.xlsx",
    idempotency_key: `cross-${crypto.randomUUID()}`,
    total_rows: 1,
    valid_rows: 1,
    invalid_rows: 0,
    created_by: userB.userId,
  });
assert(
  crossImportInsertError,
  "Non-member dapat membuat import lintas workspace.",
);

const { error: crossImportRowInsertError } = await userB.client
  .from("import_rows")
  .insert({
    import_id: importRecord.id,
    workspace_id: userA.workspaceId,
    row_number: 3,
    status: "valid",
    input: {},
    errors: [],
  });
assert(
  crossImportRowInsertError,
  "Non-member dapat membuat import_rows lintas workspace.",
);

await admin.auth.admin.deleteUser(userA.userId);
await admin.auth.admin.deleteUser(userB.userId);
