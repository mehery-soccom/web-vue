## UI Flow

Land on Dashboard → see list of catalogs

Create/Edit → fill general info

Define Options

Save as Draft → can still edit

Publish → locks snapshot → rules engine consumes it

Version tab → diff history, rollback if needed

## Catalog Versioning Lifecycle

    🔹 States

    - Draft

        - Editable workspace.

        - Each catalog has at most 1 active draft.

    - Published Versions

        - Immutable snapshots (v1, v2, v3…).

        - Cannot be edited.

    - Default Version

        - Exactly 1 published version is marked default → the “live/in-use” version.

    🔹 Actions

    - Create Draft

        - Either start fresh, or “Rollback to Draft” from an old version.

        - Draft is the only mutable copy.

    - Edit Draft

        - Modify schema, options, metadata.

        - Auto-save until explicitly published.

    - Publish Draft

        - Locks the draft → becomes new version (vN).

        - Draft is cleared.

        - System may auto-set this new version as default (configurable).

    - Set Default Version

        - Admin can mark any published version as “Default”.

        - Changes the live config without creating new versions.

        - Only one version is default at a time.

    - Rollback Options

        - Make Default: Instantly switch live config to an old version.

        - Rollback to Draft: Copy old version into draft for edits → then republish.

    - Archive Version (optional, for cleanup)

        - Mark old versions as archived (hidden from UI but still in DB).

    🔹 Example Flows

    A. Normal Evolution

        - Create Draft → Edit → Publish → v1 (auto-default).

        - Later edits → Publish → v2 (auto-default).

        - Clients use v2 by default.

    B. Quick Rollback

        Something breaks in v2.

        Admin clicks “Make Default v1”.

        v1 instantly goes live (default).

        v2 still exists for history.

    C. Corrective Rollback

        v2 breaks, admin wants to modify and republish.

        “Rollback to Draft from v1” → edit → publish → v3.

        v3 auto-default.

        v2 & v1 remain in history.


    ✅ This covers:

        Draft → Publish → Version

        Default switching

        Rollback (quick & corrective)

        Clean audit trail of history
