# Running agents on the user's own subscription — ACP, headless CLIs, and native skills

**Status: live, not archive.** Unlike the tool studies beside it, this file is meant to be picked up
when the multi-agent work starts. It records what has been verified, with citations, and marks every
gap as a gap. Research dates: 2026-08-16 (pass 1, partial — the search backend failed mid-run),
2026-08-17 (pass 2), 2026-08-17 (pass 3).

The decision this feeds: **how design-playground drives Claude Code, Codex, Cursor, and OpenCode
without asking anyone for an API key** — and whether it should keep spawning CLIs or speak the Agent
Client Protocol.

**Read order.** Sections 1–5 are pass 1, written before two prior-art codebases were read. Where
pass 2 corrected them, section 6's *Contradictions with pass 1* says which section and why — read
that list before acting on anything in 1–5. Section 8 is the current statement of the choices.

---

## 1. What the app does today (verified from source)

- **Spawn, don't integrate.** `server/lib/spawn-agent.ts` runs the `claude` binary as a child
  process. `buildAgentArgs` (`shared/lib/agent-config.ts:60`) produces
  `['-p', '--dangerously-skip-permissions', '--verbose']`, then `--output-format stream-json
  --include-partial-messages` (or `text`), then `--model` and `--effort`.
- **The subscription works because of that shape.** The CLI reads the developer's own login from
  disk. No token is handled by our code, and no API key is asked for.
- **We hand-parse the stream.** `server/lib/claude-jsonl.ts` reads `tool_use` / `tool_result` out of
  the JSONL to learn which iteration files were written.
- **We re-implement skill discovery.** `server/routes/skills.ts` walks two roots — our bundled
  `skills/` and the host's `process.cwd()/.claude/skills` — for `SKILL.md` files, parses their
  frontmatter, and serves them to the `/` picker. At submit time
  (`features/chat/DockedChatBar.tsx:190`) the picked skill contributes its **path**, which
  `formatSkillSection` (`features/generation/prompts/shared-sections.ts:104`) wraps as
  `SKILL CONTEXT (read each SKILL.md at the repo paths below)` and pastes into the prompt.

That last point is the one worth acting on: **the agent already knows how to find and load its own
skills, and we are paying a scanner, a parser, a route, and a prompt section to tell it something it
knows.**

---

## 2. Skills — invoking the agent's own instead of managing ours

**Claude Code, confirmed.** `code.claude.com/docs/en/headless`: *"User-invoked skills and custom
commands work in `-p` mode: include `/skill-name` in the prompt string and Claude Code expands it
before running."* So sending the literal token `/my-skill` in the `-p` prompt is a supported path,
and every skill the developer already has — personal, project, and plugin — becomes available with
no scanning on our side.

**`--bare` is the flag to keep avoiding.** It skips skill discovery *and*, per the same docs,
"doesn't use your subscription login". We do not pass it, and this is the reason not to start.

**Codex uses a different sigil** — `$skill-name`, not `/skill-name`. Any picker that emits tokens
has to know the sigil per agent, which is exactly the kind of CLI-shaped knowledge `agent-config.ts`
exists to hold.

**Enumeration is the missing half.** Token expansion means we can *invoke* a skill; it does not tell
us what skills exist, so a picker still needs a list. Two candidate sources:
- ACP's `available_commands_update` notification (see below) — the agent pushes its command list to
  the client. This is the designed answer and Zed consumes it today.
- Claude Code's `stream-json` `init` event, which is believed to carry `slash_commands`.
  **Unverified — one local run of `claude -p --output-format stream-json` settles it and costs
  nothing.**

---

## 3. Agent Client Protocol

- **Methods in v1:** `session/new`, `session/prompt`, `session/update`, `session/request_permission`,
  `fs/read_text_file`, `fs/write_text_file` (an optional client capability), cancellation, and
  `available_commands_update`.
- **Why it is interesting here, in priority order:**
  1. `available_commands_update` — the skill list, pushed, per agent, without us scanning anything.
  2. `session/request_permission` — the composer's Permission-mode chip (`composer.md`) currently has
     nothing behind it; `--dangerously-skip-permissions` is hardcoded. ACP is the only path that makes
     Ask / Auto / Full / Read real rather than decorative.
  3. `fs/write_text_file` — the client performs the write, so the app *knows* which files landed
     instead of inferring it from parsed tool calls.
  4. `session/update` — a typed event stream replacing `claude-jsonl.ts`.
- **Provider-neutrality is the weakest reason to adopt it**, not the strongest. Each agent still
  needs its own adapter binary, so "one protocol, many agents" does not remove per-agent work.
- **Authentication was the blocking unknown, and the answer is favourable in practice:** the
  `claude-agent-acp` adapter wraps the same CLI, so the same on-disk login applies. Spawning a CLI is
  what makes subscription reuse work in every case examined — ACP does not change the auth story, it
  changes the event story.

**Anthropic's stated position cuts the other way for products.** Anthropic's legal/usage page says
third-party product builders "should use API key authentication". Weigh this honestly: it is guidance
aimed at products that ship to other people's machines, and this tool is local-dev-only, running on
the machine of the developer whose subscription it is. Recorded here so nobody rediscovers it and
panics.

---

## 4. What pass 1 did not reach

The search backend failed partway, so the vendor matrix is one-quarter filled. **Pass 2 closed most
of this** — kept as the record of what was asked, not as a live to-do list:

- **Cursor CLI** (`cursor-agent`) — subscription reuse, headless flags, whether `/skill` expands.
  Testable locally for free: `cursor-agent -p "/some-skill"`.
- **OpenAI Codex CLI** — subscription vs API-credit billing under ChatGPT Plus/Pro; ToS text.
- **Per-vendor ToS on headless driving** — quoted clauses, not paraphrase, for each vendor.
- **`stream-json` stability** — documented and versioned, or an implementation detail that has
  shifted between releases? We parse it, so this is a real risk to size.
- **ACP maturity** — version, cadence, which agents ship adapters, breaking changes a consumer would
  feel.
- **Prior art:** `Emanuele-web04/synara` and `pingdotgg/t3code`. t3code's own pitch is
  *"Orchestrate Claude Code, Codex, OpenCode, Cursor, and Grok from one surface. Bring your own
  subscription. Fork the whole thing."* — the exact problem, solved, with readable source. How it
  authenticates each agent, and whether it uses ACP or per-CLI adapters, is the highest-value
  unknown left.

---

## 5. Working recommendation (pass 1 — read section 6's "Contradictions" first)

**Keep spawning CLIs; adopt the pieces of ACP that buy a feature we cannot otherwise build.** The
current design is already correct on the thing that matters most — subscription reuse — and a full
migration would trade a working spawn path for an adapter dependency to gain an event model.

Two changes stand on their own merit regardless of ACP:
1. **Send skill tokens instead of pasted paths.** Drops a route, a scanner, and a prompt section, and
   gives users every skill they already have.
2. **Treat permission mode as ACP-gated.** It is the one settled UI element with no non-ACP
   implementation path, so it should not be scheduled as if it were ordinary work.

The counter-argument to hold onto: if `stream-json` turns out to be an unversioned implementation
detail, `claude-jsonl.ts` is a standing liability and `session/update` stops being a luxury.

---

## 6. Pass 2 — prior art and the vendor matrix

Research date: 2026-08-17. Clones (shallow, outside this tree): `pingdotgg/t3code` at `cd096b9a`, `Emanuele-web04/synara` at `8f9f600`. Local Claude Code CLI used for the `stream-json` probe: `2.1.233`.

### Sources

Pinned revisions the path citations in this section (and §7) resolve against. Local trees are a **convenience only and ephemeral** — Windows may sweep `%LOCALAPPDATA%\Temp`. Recreate with the commands below; do not assume the temp dirs still exist.

- **t3code** — `https://github.com/pingdotgg/t3code` @ `cd096b9ad5a4156ffeab85de617cbb219057007f` (2026-08-17). Ephemeral local path: `C:\Users\Ahmed Ibrahim\AppData\Local\Temp\acp-pass2-research\t3code`.
  ```
  git clone https://github.com/pingdotgg/t3code
  git checkout cd096b9ad5a4156ffeab85de617cbb219057007f
  ```
- **synara** — `https://github.com/Emanuele-web04/synara` @ `8f9f60045ea652db7d4a6822e2f723dde073f40a` (2026-08-17). Ephemeral local path: `C:\Users\Ahmed Ibrahim\AppData\Local\Temp\acp-pass2-research\synara`.
  ```
  git clone https://github.com/Emanuele-web04/synara
  git checkout 8f9f60045ea652db7d4a6822e2f723dde073f40a
  ```
- **OpenCode** — `https://github.com/sst/opencode` @ `4d68d30b48a99379b2baaf597dbad576707ea36d` (commit date 2026-08-17 00:39:52 -0500). Ephemeral local path: `C:\Users\Ahmed Ibrahim\AppData\Local\Temp\acp-pass3-research\opencode`.
  ```
  git clone --depth 1 https://github.com/sst/opencode
  ```
  That shallow clone of default `HEAD` on 2026-08-17 resolved to the SHA above (`git rev-parse HEAD`).

Local Claude Code CLI behind the pass 2 `init` probe: **`2.1.233`**.

### Contradictions with pass 1

These are the highest-value corrections. Each names the section it contradicts.

- **Section 5 (“Keep spawning CLIs”).** The two codebases that already solved “bring your own subscription” do spawn child processes, but they do **not** drive Claude with `-p --output-format stream-json`. t3code’s Claude path is `@anthropic-ai/claude-agent-sdk` `query()` (`t3code/apps/server/src/provider/Layers/ClaudeAdapter.ts:createQuery` / `query()`). Codex is `codex app-server` over JSON-RPC (`t3code/apps/server/src/provider/Layers/codexLaunchArgs.ts:codexAppServerArgs`, spawned in `CodexSessionRuntime.ts`). Cursor is `cursor-agent acp` over ACP stdio (`t3code/apps/server/src/provider/acp/CursorAcpSupport.ts:buildCursorAcpSpawnInput`). Our current spawn+JSONL shape is the odd one out, not the proven pattern.
- **Section 2 (`--bare` is the flag to keep avoiding).** Official headless docs now say: “`--bare` is the recommended mode for scripted and SDK calls, **and will become the default for `-p` in a future release**.” (`https://code.claude.com/docs/en/headless`). The same page still says bare mode “doesn't use your subscription login.” If that default ships, our current argv (`-p` without `--bare`) stops being the subscription-preserving path unless we explicitly opt out of bare mode. Pass 1 treated `--bare` as a static “do not pass”; it is now a timed trap.
- **Section 2 (enumeration via `init.slash_commands` as the missing half).** Confirmed: the `system`/`init` event **does** carry `slash_commands`. It also carries a separate `skills` array. t3code still walks the filesystem for Claude skills (`t3code/apps/server/src/provider/Drivers/ClaudeSkills.ts:discoverClaudeSkills`) because, in their words, “The Agent SDK init handshake surfaces skills only as slash commands without their filesystem paths.” Sending `/name` is enough to *invoke*; it is not enough to *label a picker with paths and descriptions*. The “drop the scanner” recommendation in section 5 is only true if the picker can live on names alone.
- **Section 3 (ACP does not change the auth story; wrapping the CLI is the favourable answer).** That holds for Cursor (`agent login` / inherited CLI login) and for Claude-via-SDK (on-disk OAuth, `CLAUDE_CONFIG_DIR`). It does **not** hold as a general vendor claim.
- **Section 3 (ACP v1 method list as the interesting surface).** t3code’s generated ACP client is pinned to schema **v0.11.3** with `PROTOCOL_VERSION = 1` (`t3code/packages/effect-acp/src/_generated/meta.gen.ts`). ACP **v2 is draft**; the migration table removes `session/load`, `fs/read_text_file`, `fs/write_text_file`, and the whole `terminal/*` family (`https://github.com/agentclientprotocol/agent-client-protocol/blob/main/docs/protocol/v2/migration.mdx`). Pass 1 listed `fs/write_text_file` as a reason to adopt ACP. That client capability is on the chopping block in v2. A consumer that bets on it is betting against the draft.

### t3code (`cd096b9a`)

Built-in drivers: Codex, Claude, Cursor, Grok, OpenCode (`t3code/apps/server/src/provider/builtInDrivers.ts:BUILT_IN_DRIVERS`).

1. **How each agent is driven**
   - **Claude:** vendored Agent SDK, not raw CLI JSONL. `makeClaudeAdapter` builds `query({ prompt, options })` with `pathToClaudeCodeExecutable` (`ClaudeAdapter.ts:createQuery`, `queryOptions` around the `query()` call).
   - **Codex:** child process `codex app-server` plus a typed JSON-RPC client (`codexLaunchArgs.ts:codexAppServerArgs` returns `["app-server", ...]`; `CodexSessionRuntime.ts` `spawner.spawn(...)`). `codex exec` exists only as a filtered-args helper for text-generation side paths (`codexExecLaunchArgs`).
   - **Cursor:** ACP over stdio. `buildCursorAcpSpawnInput` → `{ command: binaryPath || "cursor-agent", args: ["acp"] }` (`CursorAcpSupport.ts:buildCursorAcpSpawnInput`).
   - **Grok:** ACP over stdio. `buildGrokAcpSpawnInput` → `{ command: "grok", args: ["agent", "stdio"] }` (`GrokAcpSupport.ts:buildGrokAcpSpawnInput`).
   - **OpenCode:** `@opencode-ai/sdk/v2` against a local OpenCode server; the adapter can spawn that server when `serverUrl` is unset (`OpenCodeAdapter.ts`, `OpenCodeDriver.ts` comment on scoped child processes).

2. **Auth**
   - **Claude:** inherit the CLI’s on-disk OAuth. They **do not** parse a token to send it. They set `CLAUDE_CONFIG_DIR` and deliberately **do not** override `HOME`, because “Overriding HOME also relocates the macOS login keychain lookup … so the spawned CLI can't find its stored OAuth credentials” (`ClaudeHome.ts:makeClaudeEnvironment`). Status probe: `claude auth status`, with SDK `initializationResult()` as fallback (`ClaudeProvider.ts:probeClaudeCapabilities`).
   - **Codex:** inherit `~/.codex/auth.json` via `CODEX_HOME`. Shadow homes copy/link layout entries; `auth.json` is treated as a private file that must not be a symlink into the shared home (`CodexHomeLayout.ts:ensureShadowAuthIsPrivate`, `PRIVATE_ENTRY_NAMES` includes `"auth.json"`). Unauthenticated snapshot message: `"Codex CLI is not authenticated. Run \`codex login\` and try again."` (`CodexProvider.ts`).
   - **Cursor:** inherited CLI login. Probe parses `agent about`. Unauthenticated: `"Cursor Agent is not authenticated. Run \`agent login\` and try again."` (`CursorProvider.ts:parseCursorAboutOutput`). ACP `authMethodId: "cursor_login"` (`CursorAcpSupport.ts:makeCursorAcpRuntime`).
   - **Grok:** `XAI_API_KEY` → ACP method `xai.api_key`, else `cached_token` after `grok login` (`GrokAcpSupport.ts:resolveGrokAuthMethodId`). Sets `GROK_OAUTH2_REFERRER=t3code`.

3. **Event/stream contract.** Claude: SDK `SDKMessage` stream (`includePartialMessages: true`), mapped to their canonical `ProviderRuntimeEvent`. Codex: app-server notifications/requests (`effect-codex-app-server`). Cursor/Grok: ACP `session/update` plus `session/request_permission` (`AcpSessionRuntime.ts`). No hand-parser equivalent of our `claude-jsonl.ts`. No version pin of Claude `stream-json` — they are not on that wire.

4. **Permissions.** Real approval UI, not a hardcoded skip. Claude maps runtime modes to SDK `permissionMode` (`"full-access"` → `"bypassPermissions"` plus `allowDangerouslySkipPermissions: true`) and implements `canUseTool` (`ClaudeAdapter.ts` `runtimeModeToPermission` / `canUseTool`). Cursor/Grok implement ACP `handleRequestPermission` and only auto-approve in full-access mode (`CursorAdapter.ts` tests: `"auto-approves ACP tool permissions in full-access mode"`). Codex approvals go through the app-server request channel (`CodexAdapter.ts` / `CodexSessionRuntime.ts` pending-approval maps).

5. **Skills / slash commands.** Filesystem scan for Claude (`discoverClaudeSkills` walks `<config>/skills`, `<cwd>/.agents/skills`, `<cwd>/.claude/skills`). Slash commands come from SDK `init.commands` (`ClaudeProvider.ts:parseClaudeInitializationCommands`). Codex skills come from the app-server catalog (tests assert paths like `~/.codex/skills/.../SKILL.md`). They do **not** paste `SKILL.md` bodies into the prompt as our `formatSkillSection` does; they expose names to a `$` picker. Invocation of Claude skills is the agent’s own `/name` / Skill tool, not a pasted path list.

6. **Per-agent adapter size (non-test lines, this clone)**
   - Claude: `ClaudeAdapter.ts` 4644 + `ClaudeDriver.ts` / `ClaudeHome.ts` / `ClaudeSkills.ts` / `ClaudeProvider.ts` (probe + snapshot).
   - Codex: `CodexAdapter.ts` 2001 + `CodexSessionRuntime.ts` 1976 + `effect-codex-app-server` protocol/client (~1.3k across `protocol.ts`+`client.ts`+`errors.ts`).
   - Cursor: `CursorAdapter.ts` 1188 + `CursorAcpSupport.ts` 115 + shared ACP runtime `AcpSessionRuntime.ts` 1005 + `effect-acp` client/protocol (~1.1k).
   - Grok: `GrokAdapter.ts` 1470 + `GrokAcpSupport.ts` 108 + same ACP shared runtime.
   - OpenCode: `OpenCodeAdapter.ts` 1739.
   Shared ACP + Codex RPC packages are the tax of *not* hand-parsing vendor JSONL. Adding a fourth agent here is still four-digit lines, not a 200-line argv swap.

7. **Gave up on.** Claude skill discovery is a filesystem reimplementation because the SDK list has no paths (`ClaudeSkills.ts` header comment). Codex schema generator is known incomplete: `TODO: Verify ... V2TurnStartParams schema includes collaborationMode` (`CodexSessionRuntime.ts`). Cursor is ACP-only; there is no `cursor-agent -p` parser in this tree.

### synara (`8f9f600`)

Same Effect-adapter shape, more vendors: Claude, Codex, Cursor, Grok, OpenCode, Droid, Pi, and Kilo (Kilo reuses the OpenCode adapter with different process settings — `Services/KiloAdapter.ts`).

1. **How driven.** Claude is again Agent SDK (`synara/.../Layers/ClaudeAdapter.ts`, `loadClaudeAgentSdk`). Cursor/Grok/Droid: ACP. Codex: app-server (same idea as t3code). Pi has its own adapter (`PiAdapter.ts`, 2946 lines). OpenCode/Kilo: OpenCode-compatible HTTP SDK (`opencodeRuntime.ts`).

2. **Auth.** Claude: inherit CLI OAuth, **and** they *read* `~/.claude/.credentials.json` to decide whether login is usable (`claudeProcessEnv.ts:resolveClaudeCredentialsPaths`, `readClaudeCliCredentialsContentSummary` reads `claudeAiOauth.accessToken` / `refreshToken`). They also **strip** stale `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` from the child env so API-key billing does not override the subscription (`claudeProcessEnv.ts` `CLAUDE_DIRECT_CREDENTIAL_ENV_KEYS`; tests in `ProviderHealth.test.ts`). Cursor: same `agent login` / `CURSOR_API_KEY` probe text as t3code (`ProviderHealth.test.ts` asserts `"Please run 'agent login' first, or set CURSOR_API_KEY"`).

3. **Event/stream.** Claude: SDK messages. ACP agents: `session/update`.

4. **Permissions.** Same approval-request machinery as t3code for SDK/ACP agents.

5. **Skills.** Catalog walker (`skillsCatalog.ts`) plus **prompt inlining** for agents that cannot load a foreign skill (`skillPromptInjection.ts:shouldInlineSkillForProvider`). Claude: inline unless the path is under `.claude`. Codex: inline if the skill lives under `.claude` / `.cursor` / `.agents`. Cursor: inline only `.synara` paths. Grok/Droid/Kilo/OpenCode: always inline. Claude `listSkills` on the adapter returns `{ skills: [], source: "unsupported" }` (`ClaudeAdapter.ts:listSkills`); `listCommands` uses SDK `supportedCommands()`. They did **not** drop the scanner. They built a bigger one, then paste bodies when the agent cannot see the file.

6. **Per-agent adapter size (non-test)**
   - Claude `ClaudeAdapter.ts` 6407
   - Codex `CodexAdapter.ts` 2342
   - Cursor `CursorAdapter.ts` 1853
   - Grok `GrokAdapter.ts` 2658
   - OpenCode `OpenCodeAdapter.ts` 4805 (also serves Kilo)
   - Droid `DroidAdapter.ts` 2312
   - Pi `PiAdapter.ts` 2946
   Shared ACP under `provider/acp/` is larger than t3code’s (elicitation, turn watchdog, Droid teardown).

7. **Gave up on.** Claude native skill listing (`source: "unsupported"`). `TODO.md` in the clone is product UX, not vendor-block notes.

### Vendor matrix

| | Headless flags | Subscription reuse | ToS (verbatim) | Skill/command invocation | Enumeration |
|---|---|---|---|---|---|
| **Claude Code** | `-p` / `--print`; `--output-format stream-json` (and `json` / `text`); `--verbose`; `--include-partial-messages`. Docs: `https://code.claude.com/docs/en/headless`. | Yes, when the CLI is **not** in `--bare` and no `ANTHROPIC_API_KEY` is set. Mechanism: on-disk OAuth / keychain. Help Center: “When an API key is set as an environment variable, you'll be charged via API pay-as-you-go rates … To use Claude Code with your Claude subscription: Keep the ANTHROPIC_API_KEY environment variable unset.” (`https://support.claude.com/en/articles/12304248-manage-api-key-environment-variables-in-claude-code`). Local probe this date: `apiKeySource":"none"` on the init event with a Pro/Max-style login. | From Claude Code legal page (`https://code.claude.com/docs/en/legal-and-compliance`): “OAuth authentication is intended exclusively for purchasers of Claude Free, Pro, Max, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications.” And: “Developers building products or services that interact with Claude's capabilities, including those using the Agent SDK, should use API key authentication through Claude Console or a supported cloud provider. Anthropic does not permit third-party developers to offer Claude.ai login or to route requests through Free, Pro, or Max plan credentials on behalf of their users.” Agent SDK overview repeats: “Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK.” (`https://code.claude.com/docs/en/agent-sdk/overview`). Consumer ToS (`https://www.anthropic.com/legal/consumer-terms`): “You may not share your Account login information, Anthropic API key, or Account credentials with anyone else. You also may not make your Account available to anyone else.” No clause found, after searching that legal page, the consumer terms, and the commercial terms landing page, that **explicitly names** “spawning `claude -p` from another local app on the subscriber’s machine” as permitted or forbidden. | Headless docs: “User-invoked skills and custom commands work in `-p` mode: include `/skill-name` in the prompt string and Claude Code expands it before running.” SDK slash-commands page: send `/compact` etc. in the prompt (`https://code.claude.com/docs/en/agent-sdk/slash-commands`). | **Yes, on the wire.** `system`/`init` includes `slash_commands` (names, no `/` prefix in the SDK example; local CLI 2.1.233 emitted unprefixed names) **and** a separate `skills` array. Documented for the SDK (`message.slash_commands`). Not a dedicated `claude /list-skills` CLI. Changelog keeps adding init fields (`mcp_server_errors`, `plugin_errors`) rather than freezing a schema. |
| **OpenAI Codex CLI** | `codex exec` for non-interactive (`https://developers.openai.com/codex/noninteractive`). Deep product integration: `codex app-server` (what t3code/synara spawn). MCP: `codex mcp-server`. | Yes, if the CLI was signed in with ChatGPT. Docs: “When you sign in with an API key, Codex uses standard API pricing instead of included ChatGPT plan credits.” (`https://developers.openai.com/codex/auth`). “`codex exec` reuses saved CLI authentication by default.” Auth file: `~/.codex/auth.json`. Help Center: Codex usage on a ChatGPT plan draws from the shared agentic pool (`https://help.openai.com/en/articles/11369540/`). | Consumer Terms of Use (`https://openai.com/policies/row-terms-of-use`, effective 2026-01-01), “What you cannot do”: “Automatically or programmatically extract data or Output (defined below).” Same page: “Interfere with or disrupt our Services, including circumvent any rate limits or restrictions or bypass any protective measures or safety mitigations we put on our Services.” No clause found, after searching that page, Service Terms section “4. Codex and Code Generation” (`https://openai.com/policies/service-terms/`), and Codex auth/exec docs, that names wrapping `codex app-server` or `codex exec` from a third-party desktop as allowed or banned. Official exec/SDK pages describe programmatic control; an OpenAI staff reply on a fork thread declined to give a legal yes (`https://github.com/openai/codex/discussions/8338`). | Explicit invocation: “In CLI/IDE, run `/skills` or type `$` to mention a skill.” Example `$skill-creator` (`https://developers.openai.com/codex/skills`). Sigil is `$`, as pass 1 said. | Implicit: Codex injects an initial skills list (name, description, path) into context, capped at 2% of the window. No documented `codex list-skills` JSON API for a third-party picker. t3code/synara read the app-server catalog instead. |
| **Cursor CLI (`cursor-agent` / `agent`)** | Print/headless: `agent -p "..."`. `--output-format text` (also `json` / `stream-json` in help-center material). `--model`, `--mode=plan\|ask`. ACP: `cursor-agent acp` (t3code spawn args). Docs: `https://cursor.com/docs/cli/overview`. | Yes, via `agent login` (browser) storing credentials locally, **or** `CURSOR_API_KEY` / `--api-key` for automation (`https://cursor.com/docs/cli/reference/authentication`). Blog: “The CLI works with any model as part of your Cursor subscription.” (`https://cursor.com/blog/cli`). t3code probe of `agent about` returns `subscriptionTier`. | Cursor Terms (`https://cursor.com/terms-of-service`) 1.5 Use Restrictions: “Except and solely to the extent such a restriction is impermissible under applicable law, you may not: (i) reverse engineer, disassemble, decompile, decode, or otherwise attempt to derive or gain access to the source code, object code or underlying structure of the Service; … (vi) probe, scan or attempt to penetrate the Service; … (viii) harvest, scrape, or extract data from the Service; … (xi) knowingly permit any third party to do any of the foregoing.” No clause found, after searching that ToS, that forbids driving the **official** CLI/`cursor-agent` from another local app. Cursor staff on the forum treat unofficial proxies to private client endpoints as a 1.5 violation, and name the supported outsides-the-IDE path as “Cursor CLI `cursor-agent`”, the Agent SDK, and the public Cloud Agents API (`https://forum.cursor.com/t/does-using-oh-my-pi-s-cursor-provider-or-an-openai-compatible-proxy-to-the-same-endpoints-violate-cursors-tos/167778`). | Editor+CLI skills: type `/skill-name` in Agent chat (`https://cursor.com/docs/skills`). Whether `-p "/my-skill"` expands the same way as Claude’s `-p` is **not documented** on the CLI overview or headless pages after searching those plus `https://cursor.com/docs/skills`. | Cursor discovers skills from `.cursor/skills/`, `.agents/skills/`, `~/.cursor/skills/`, `~/.agents/skills/` at startup. No documented `agent list-skills` JSON for a host app. t3code uses ACP `available_commands_update` / config options rather than a CLI list. synara walks those directories (`cursorSkillsDiscovery.ts`). |

### `stream-json` stability

It is a **documented CLI output format**, not a versioned schema.

- Headless docs describe `--output-format stream-json` as newline-delimited JSON events. They do **not** publish a JSON Schema or a `stream-json@1` version id.
- The changelog treats the init payload as an open bag: v2.1.111 added `plugin_errors` on init (`https://github.com/anthropics/claude-code/issues/49308` citing the changelog); later entries add `mcp_server_errors` on init and nested subagent forwarding (`https://code.claude.com/docs/en/changelog` / `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md`).
- Independent consumers write drift checkers because “No published schema exists for Claude Code” (`https://github.com/meawoppl/rust-code-agent-sdks/commit/c27eb83`).
- GitHub issue `[DOCS] Headless stream-json control protocol does not document set_model validation` (`https://github.com/anthropics/claude-code/issues/77632`) is the same gap on the input side.

This confirms the section 5 counter-argument: `claude-jsonl.ts` is coupled to an unversioned, still-growing event bag. t3code/synara avoided that file by taking the Agent SDK’s typed `SDKMessage` instead — which is the same process under a library, not a frozen contract.

### `init.slash_commands` — confirmed locally

Command: `claude -p --output-format stream-json --verbose --max-turns 1 "hi"` (CLI 2.1.233, this machine, 2026-08-17). First line, trimmed:

```json
{"type":"system","subtype":"init","session_id":"fbbedd07-bee0-4629-a35d-45b3d6c92638","slash_commands":["codebase-design","grilling", "...", "compact","config","usage", "..."],"skills":["codebase-design","grilling", "..."],"apiKeySource":"none","claude_code_version":"2.1.233"}
```

`slash_commands` is a string array of names **without** a leading `/`. `skills` is a second array; real `SKILL.md` skills appeared in both, matching `https://github.com/anthropics/claude-code/issues/79998`. Official SDK docs show the same field on `system`/`init` (`https://code.claude.com/docs/en/agent-sdk/slash-commands`). Pass 1’s belief is true, and incomplete: there is also `skills`, `agents`, `plugins`, `tools`, `mcp_servers`.

### ACP maturity (spec/schema, not the landing page)

- **Shipped wire:** protocol version **1**. t3code’s generated client: “Current ACP schema release: v0.11.3”, `PROTOCOL_VERSION = 1` (`effect-acp/src/_generated/meta.gen.ts`). Schema still includes `fs/read_text_file`, `fs/write_text_file`, `session/request_permission`, `session/update`, `session/load`, `terminal/*` (`https://raw.githubusercontent.com/agentclientprotocol/agent-client-protocol/main/schema/schema.json`).
- **Draft:** ACP v2. `protocolVersion: 2`. Breaking: `session/load` removed (use `session/resume`); `fs/*` and `terminal/*` **removed**; `authenticate` renamed `auth/login`; `session/set_mode` removed (`docs/protocol/v2/migration.mdx` via Context7 `/agentclientprotocol/agent-client-protocol`).
- **Cadence.** Artifact tags like `v0.11.3` move independently of `protocolVersion`. v2 is explicitly “draft form for community review.” No published calendar of v1 patch releases was found on the spec repo README/versioning notes beyond “incremented for breaking changes; non-breaking via capabilities.”
- **Agents that ship adapters today** (registry + spawn commands used by clients): Claude via `@agentclientprotocol/claude-agent-acp` (Zed’s wrapper); Cursor via `cursor-agent acp`; Codex via `@zed-industries/codex-acp` (adapter, not native `codex acp` in t3code — they skipped ACP for Codex); Gemini CLI `--experimental-acp`; OpenCode `opencode acp`; GitHub Copilot language-server `--acp`; Goose `acp`; Qwen Code `--acp`; Auggie `--acp`; Qoder `--acp`; OpenClaw `acp`; Kiro `kiro-cli acp`; Hermes `hermes acp`; Grok `grok agent stdio`; Factory Droid (synara ACP adapter); Pi via `pi-acp`. Registry: `https://agentclientprotocol.com/get-started/registry`.

A consumer of v1 `fs/write_text_file` will feel a break if they later move to v2. Permission (`session/request_permission`) survives the v2 table.

### Other tools in this category (named)

Orchestrators / multi-agent front-ends that spawn vendor CLIs or ACP adapters and bill the user’s existing login:

- **t3code** and **synara** (this pass).
- **Zed** — native ACP client; `claude-agent-acp` for Claude (`https://zed.dev/docs/ai/external-agents`, `https://github.com/zed-industries/claude-code-acp`).
- **JetBrains IDEs** — native ACP (`https://www.jetbrains.com/help/ai-assistant/acp.html`).
- **OpenCode** — its own TUI/server plus `opencode acp` for editors (`https://opencode.ai/docs/acp/`); auth via its `auth.json` (synara `opencodeRuntime.ts`).
- **ACP Client for VS Code** (`formulahendry/vscode-acp`) — spawns Copilot/Claude-ACP/Gemini/Codex-ACP/OpenCode/OpenClaw/Kiro/Hermes; permission policy `ask` or `allowAll`.
- **ACP UI** (`formulahendry/acp-ui`) — standalone ACP desktop client.
- **Emacs** `agent-shell.el` + `acp.el` (`https://github.com/xenodium/agent-shell`).
- **Neovim:** CodeCompanion, avante.nvim, agentic.nvim, hermes.nvim (listed at `https://agentclientprotocol.com/get-started/clients`).
- **Obsidian:** Agent Client, Agent Console, Obsidian Harness plugins (same clients page).
- **Codeg** — multi-agent ACP workbench (`https://github.com/xintaofei/codeg`).
- **Poolside Assistant** — VS / VS Code ACP client.
- **Multicoder**, **ACP Patchbay**, **ACP Pro** — VS Code-family ACP hosts.
- **Goose** (Block) — `goose` ACP command.
- **Factory Droid** — ACP agent; synara has a dedicated adapter.
- **Pi** (`pi --mode rpc` / `pi-acp`) — synara `PiAdapter.ts`.
- **Kilo** — OpenCode-compatible CLI; synara reuses OpenCode runtime.
- **OpenClaw** — `openclaw acp`.
- **Gemini CLI** — `--experimental-acp`.

Authentication pattern across the ACP clients: spawn the vendor binary (or `npx` adapter) on the local machine and let that binary read its own login. None of the clients above, in the code/docs checked, paste the user’s API key into their own HTTP client as the default path for Claude/Cursor/Codex subscriptions.

### Ruled out — Antigravity

Out of scope. Google Antigravity Additional Terms clause 6 (`https://antigravity.google/terms`): “You must not abuse, harm, interfere with, or disrupt the Service. This includes, but is not limited to, using the Service in connection with products not provided by us. Using third party software, tools, or services to access the Service (e.g. using OpenClaw with Antigravity OAuth) is a breach of this Agreement. Such actions may be grounds for suspension or termination of your account.” No first-party ACP adapter in the registry (`https://agentclientprotocol.com/get-started/registry`). synara’s driver is raw `-p` spawn, transcript/hook-file polling, and hardcoded `--dangerously-skip-permissions` on every turn (`AntigravityAdapter.ts`) — evidence of the cost. Whether Google would enforce clause 6 against a local-dev host that only `spawn`s unmodified `agy -p` is unconfirmed (forum ≠ contract).

### Unconfirmed

- Whether `cursor-agent -p "/some-skill"` expands the skill the way `claude -p "/some-skill"` does. Not run locally (`cursor-agent` was not on PATH). Not stated on the CLI overview or skills page for print mode.
- Whether Cursor print-mode usage always bills the Cursor subscription vs `CURSOR_API_KEY` credits when both exist. Auth docs present them as alternative methods, not a precedence table like Anthropic’s.
- Whether Anthropic would treat a local-dev-only playground that spawns `claude -p` (or the Agent SDK with the user’s OAuth) as “ordinary use of Claude Code” or as a “product” that must use API keys. Legal page and SDK overview are written for product builders; they do not carve out “runs only on the subscriber’s machine.”
- ACP v2 ship date, and whether `fs/write_text_file` removal will land as written.
- Exact `stream-json` field set across CLI versions other than 2.1.233 (this run) and the changelog-mentioned additions. No schema file to diff.
- Codex app-server JSON-RPC schema version t3code generates against; the `collaborationMode` TODO is the only pin weakness found, not a full compatibility matrix.
- Whether synara is a t3code fork (file layout matches; no provenance statement was read from a README, per method).
- `codex exec` skill `$name` expansion in non-interactive mode — skills page describes CLI/IDE `$` mentions; exec page does not repeat it.
- Line counts for t3code `ClaudeProvider.ts` / synara ACP shared files were not summed into the adapter totals; the adapter-file numbers above are the right order of magnitude, not a complete “all files touched to add vendor X” audit.
- This pass did not run `codex exec` or `agent -p` locally (those binaries were not on PATH).
- Whether a user-installed third-party Anthropic Pro/Max plugin still works against OpenCode after the 1.3.0 unbundle. Official docs say previous versions bundled those plugins and that Anthropic prohibits the practice (`https://opencode.ai/docs/providers/`, Anthropic section). Bundled plugin list in this clone has no Anthropic OAuth hook (`packages/opencode/src/plugin/index.ts:internalPlugins`).
- Whether GitHub would treat a third-party host that spawns `opencode serve` (which then spends Copilot tokens from OpenCode’s `auth.json`) as permitted use of a Copilot subscription. OpenCode documents the Copilot login as a first-party feature; this pass did not read GitHub Copilot ToS for that wrapping.
- Whether OpenAPI `info.version` `1.0.0` (`packages/sdk/openapi.json`) is bumped when members are added to the `Event` union. The checked spec is still `1.0.0` while the generated union contains both `permission.asked` and `permission.v2.asked` (`packages/sdk/js/src/v2/gen/types.gen.ts`).
- Mapping of this app’s Read permission chip onto OpenCode’s built-in `plan` agent was not verified by running OpenCode.

---

## 7. OpenCode

Research date: 2026-08-17. Source: `sst/opencode` @ `4d68d30b48a99379b2baaf597dbad576707ea36d` (section 6 Sources). Docs: `https://opencode.ai/docs/`. SDK package in-tree: `@opencode-ai/sdk` `1.18.18` (`packages/sdk/js/package.json`).

1. **Every way it can be driven.** Four surfaces exist; MCP is not a fifth.

   - **`opencode serve` + HTTP SDK** — documented headless server, OpenAPI 3.1 at `/doc`, default `127.0.0.1:4096` (`https://opencode.ai/docs/server/`, `packages/opencode/src/cli/cmd/serve.ts:ServeCommand`). JS client: `createOpencode()` starts a server, or `createOpencodeClient({ baseUrl })` attaches (`https://opencode.ai/docs/sdk/`). t3code and synara both spawn `["serve", "--hostname=…", "--port=…"]` and talk `@opencode-ai/sdk/v2` (`t3code/.../opencodeRuntime.ts` args around the `serve` spawn; `OpenCodeAdapter.ts` imports `OpencodeClient` from `@opencode-ai/sdk/v2`). Neither tree contains an `opencode acp` spawn for this vendor.
   - **`opencode acp`** — documented editor integration; stdio nd-JSON ACP (`https://opencode.ai/docs/acp/`, `https://opencode.ai/docs/cli/`). Implementation starts the same HTTP `Server.listen`, then `createOpencodeClient` against that URL, then `@agentclientprotocol/sdk` `AgentSideConnection` (`packages/opencode/src/cli/cmd/acp.ts:AcpCommand`). ACP is a facade over the HTTP server, not a separate runtime. Registry lists it (`https://agentclientprotocol.com/get-started/registry`).
   - **`opencode run`** — non-interactive one-shot; `--format json` streams raw events; `--attach http://…` reuses a running serve; `--command` runs a slash command; `--auto` auto-approves (`packages/opencode/src/cli/cmd/run.ts` header comment; `https://opencode.ai/docs/cli/`). Same SDK client underneath.
   - **MCP** — `opencode mcp add|list|auth` configures MCP *servers OpenCode consumes* (`packages/opencode/src/cli/cmd/mcp.ts`). No `opencode mcp-server` (or equivalent) command in `packages/opencode/src/cli/cmd/`. A host cannot drive OpenCode by speaking MCP to it.

   Docs do not mark serve / SDK / ACP / run as experimental. The HTTP “Tools” routes are labelled experimental (`https://opencode.ai/docs/server/`). For a host app, the HTTP SDK is the surface to prefer: it is what OpenCode’s own ACP command uses, it is what t3code/synara already pay for, and it exposes permission reply, `GET /command`, and `GET /skill` without an ACP client. ACP is the right choice only if the host is already an ACP client and is willing to lose those HTTP-only calls (or reimplement them). That reasoning still holds at this SHA.

2. **Auth and the subscription question.** Credentials live in `auth.json` under `Global.Path.data` (`packages/opencode/src/auth/index.ts` `file = path.join(Global.Path.data, "auth.json")`). `Global.Path.data` is `xdgData/opencode` (`packages/core/src/global.ts`). Docs name the Unix path `~/.local/share/opencode/auth.json` (`https://opencode.ai/docs/providers/`, `https://opencode.ai/docs/cli/` `opencode auth login`). `OPENCODE_AUTH_CONTENT` can replace the file (`auth/index.ts:all`). Login CLI: `opencode auth login|list|logout`. Env keys such as `ANTHROPIC_API_KEY` are also read for API-key providers (`packages/llm/src/providers/anthropic.ts` via `Auth.config("ANTHROPIC_API_KEY")`; providers docs).

   **Claude Pro/Max:** no. Providers docs: “There are plugins that allow you to use your Claude Pro/Max models with OpenCode. Anthropic explicitly prohibits this. Previous versions of OpenCode came bundled with these plugins but that is no longer the case as of 1.3.0.” Same page still shows a “select the **Claude Pro/Max** option” step whose prompt listing is only “Manually enter API Key” (`https://opencode.ai/docs/providers/` Anthropic). Bundled plugins are Codex/ChatGPT, Copilot, GitLab, etc. — not Anthropic OAuth (`packages/opencode/src/plugin/index.ts:internalPlugins`). Native LLM runtime rejects Anthropic OAuth: `if (input.auth?.type === "oauth" && !(input.provider.id === "openai" && fetch)) return { type: "unsupported", reason: "OAuth auth requires a provider fetch override" }` (`packages/opencode/src/session/llm/native-runtime.ts:statusWithFetch`). Driving Claude through OpenCode is API-key / pay-as-you-go, which is the opposite of this app’s current spawn path.

   **GitHub Copilot:** yes, on a Copilot subscription. First-party plugin `CopilotAuthPlugin`, method label `"Login with GitHub Copilot"`, GitHub device-code OAuth, tokens stored as `type: "oauth"` (`packages/opencode/src/plugin/github-copilot/copilot.ts`). Docs: `/connect` → GitHub Copilot → `github.com/login/device` (`https://opencode.ai/docs/providers/` GitHub Copilot). Some models may need Pro+ (`https://github.com/features/copilot/plans`).

   **ChatGPT Plus/Pro:** yes, native. `CodexAuthPlugin` methods `"ChatGPT Pro/Plus (browser)"` and `"ChatGPT Pro/Plus (headless)"` (`packages/opencode/src/plugin/openai/codex.ts`). Docs match (`https://opencode.ai/docs/providers/` OpenAI). Old npm plugins `opencode-openai-codex-auth` and `opencode-copilot-auth` are marked deprecated because they are now built-in (`packages/opencode/src/plugin/shared.ts:DEPRECATED_PLUGIN_PACKAGES`). GitLab Duo is also a bundled auth plugin (`plugin/index.ts`).

   Adding OpenCode is a gateway to Copilot + ChatGPT (and API-key providers), through OpenCode’s own `auth.json`. It is not a second adapter for the Claude Pro/Max login already used by `spawn-agent.ts`.

3. **Events.** SSE: `GET /event`, `GET /global/event`, `GET /api/event` (`packages/opencode/src/server/routes/instance/httpapi/public.ts`). SDK: `client.event.list()` async iterable (`https://opencode.ai/docs/sdk/`). The payload is a generated TypeScript union `Event` in `@opencode-ai/sdk/v2` (`packages/sdk/js/src/v2/gen/types.gen.ts`, header: auto-generated by `@hey-api/openapi-ts`), sourced from OpenAPI 3.1 `packages/sdk/openapi.json` (`openapi: "3.1.0"`, `info.version: "1.0.0"`). Members include `session.*`, `message.*`, `permission.asked` / `permission.replied`, `permission.v2.asked` / `permission.v2.replied`, plus a long `session.next.*` family. That is a versioned contract in the sense Claude `stream-json` is not: there is a schema file and a typed SDK. It is not a frozen `stream-json@1` id; v1 and v2 permission events coexist in one union. `opencode run --format json` is the same event bag on stdout.

4. **Permissions.** Real approval flow. Config actions `"allow" | "ask" | "deny"` per tool (`https://opencode.ai/docs/permissions/`). `--auto` / `opencode run --auto` auto-approves requests that are not explicitly denied. Host drive: SSE `permission.asked`, then `POST /permission/:requestID/reply` with `once | always | reject` (`packages/opencode/src/server/routes/instance/httpapi/groups/permission.ts`; ACP maps the same three onto ACP `allow_once` / `allow_always` / `reject_once` in `packages/opencode/src/acp/permission.ts`). t3code stamps a ruleset on each prompt: `full-access` → `{ permission: "*", pattern: "*", action: "allow" }`, otherwise mostly `ask` (`t3code/.../opencodeRuntime.ts:buildOpenCodePermissionRules`). Prompt-level `permission` field is on the session message API (`httpapi/groups/session.ts`).

5. **Skills and slash commands.** `SKILL.md` discovery from `.opencode/skills/`, `~/.config/opencode/skills/`, `.claude/skills/`, `~/.claude/skills/`, `.agents/skills/`, `~/.agents/skills/` (`https://opencode.ai/docs/skills/`; `packages/opencode/src/skill/index.ts` patterns). Agent loads via the `skill` tool (`skill({ name })`); `/name` is the TUI sigil for **commands**. Custom commands are markdown under `.opencode/commands/` or `command` in `opencode.json`, invoked as `/my-command` (`https://opencode.ai/docs/commands/`). Host enumeration: `GET /skill` (`httpapi/handlers/instance.ts:getSkill` → `skill.all()`) and `GET /command` (`getCommand` → `Command.list`). Skills are also registered as commands with `source: "skill"` (`packages/opencode/src/command/index.ts`). ACP pushes `available_commands_update` from that command list (`packages/opencode/src/acp/service.ts:sendAvailableCommands`). HTTP `session.command` / `POST /session/:id/command` executes a named command.

6. **Cost to support, in this app's architecture.** `opencode run` is the direct analogue of
   `claude -p`, and the flag map is close to one-for-one against `buildAgentArgs`
   (`packages/opencode/src/cli/cmd/run.ts` yargs builder):

   | `agent-config.ts` today (claude) | `opencode run` |
   |---|---|
   | `-p <prompt>` | positional `<message>` |
   | `--output-format stream-json` | `--format json` — "raw JSON events" |
   | `--model <id>` | `--model provider/model` |
   | `--effort <e>` | `--variant <e>` — "provider-specific reasoning effort, e.g., high, max, minimal" |
   | `--dangerously-skip-permissions` | `--dangerously-skip-permissions` (same name), or `--auto` |

   The command's own header comment describes its default mode as: "sends a single prompt, streams
   events to stdout, and exits when the session goes idle." That is our spawn-and-parse shape, so
   supporting OpenCode means a binary name, an arg builder, and a model catalog in
   `shared/lib/agent-config.ts`, plus whatever process handling differs in
   `server/lib/spawn-agent.ts` — the contained change the seam in `CLAUDE.md` was designed for. It
   also carries `--command` (run a named slash command), `--agent`, `--session` / `--continue`, and
   `--attach`.

   The four-digit adapters in the prior art are **not** the cost of supporting OpenCode; they are the
   cost of t3code's and synara's chosen architecture, which drives OpenCode through `opencode serve`
   plus the HTTP SDK and therefore takes on server lifecycle, session bookkeeping, and an Effect
   layer. For reference only: t3code `OpenCodeAdapter.ts` 1739 lines, synara 4805 (the extra ~3k is
   Kilo support from the same file). We do not need that shape to add OpenCode.

   What the HTTP/ACP surfaces buy over `opencode run`, if we ever want them: `GET /skill` and
   `GET /command` for picker enumeration, and `permission.asked` → `POST /permission/:id/reply` for a
   real approval flow. `opencode run` alone gives skip-or-auto, the same limitation our current
   `claude -p` spawn has.

7. **Verdict.** Supporting OpenCode as a fourth agent is cheap in our architecture — `opencode run
   --format json` fits the existing spawn-and-parse path, and `--variant` even maps onto the Effort
   ladder. What is worth knowing before wiring it: it does **not** spend the Claude Pro/Max login
   this app already uses (Anthropic OAuth plugins were unbundled at 1.3.0 and the native runtime
   rejects Anthropic OAuth), so it is not a second route to Claude. What it does add is Copilot on a
   Copilot subscription and ChatGPT Plus/Pro natively, through OpenCode's own `auth.json` — one
   binary reaching subscriptions no other agent on our list reaches. Its event payload is a generated
   union from a checked-in OpenAPI 3.1 schema, so its parser is a firmer contract than
   `claude-jsonl.ts` is against `stream-json`.

---

## 8. What this means for this app

**The Claude wire.** Today: `claude -p --output-format stream-json` parsed in `server/lib/claude-jsonl.ts`. Pass 2: that format is an unversioned, still-growing event bag, and `--bare` is slated to become the `-p` default while still skipping subscription login. Three options, with their costs:

- Keep the JSONL parser. Cost: every CLI release can break `claude-jsonl.ts`; when `--bare` becomes default, argv must explicitly preserve subscription login or the spawn silently starts billing API (or failing closed). No permission-request channel on this wire as we use it (`--dangerously-skip-permissions` is hardcoded).
- Switch Claude to the Agent SDK `query()` path t3code/synara use. Cost: a four-digit adapter (their `ClaudeAdapter.ts` alone is 4644 / 6407 lines), a vendored SDK, and the same Anthropic product-builder guidance that prefers API keys. Gain: typed `SDKMessage`, `permissionMode` / `canUseTool`, `init.commands`, and we stay on the process that already reads the on-disk OAuth (do not set `ANTHROPIC_API_KEY`; do not relocate `HOME`).
- Speak ACP via `@agentclientprotocol/claude-agent-acp`. Cost: another binary and ACP v1→v2 churn (`fs/write_text_file` is on the v2 chopping block). Gain: `session/request_permission` (survives v2) and `available_commands_update`. Auth is still “that wrapper’s CLI login,” which for Claude is the same on-disk OAuth.

Highest-stakes choice in the file: stay on unversioned JSONL under a timed `--bare` trap, or pay the Agent SDK adapter to get off that wire while keeping the Pro/Max login.

**The skills path.** `init.slash_commands` and `init.skills` are names without paths (pass 2 local probe, CLI 2.1.233). t3code still walks the filesystem because of that. Concretely for us:

- `formatSkillSection` (path paste into the prompt) can go once the composer emits the agent’s own invoke token (`/name` for Claude, `$name` for Codex, `/name` command or `skill({ name })` for OpenCode). The agent loads the file.
- `server/routes/skills.ts` cannot go if the picker must show descriptions or distinguish bundled `skills/` from the host’s `.claude/skills` by path. Names from `init` / ACP `available_commands_update` / OpenCode `GET /command`+`GET /skill` are enough only for a names-only picker. A names-only picker is the condition in pass 2’s section 5 correction; it is still the condition.

**Adding the other agents.** All four are planned; the question is what each costs in the seam
`CLAUDE.md` describes, not which one wins.

- **OpenCode** — cheapest. `opencode run --format json` maps onto `buildAgentArgs` almost
  flag-for-flag (§7.6), including `--variant` for Effort. Reaches Copilot and ChatGPT subscriptions.
- **Cursor** — `cursor-agent -p` exists with `--output-format stream-json`, so a spawn-and-parse
  path is available; whether `-p "/skill"` expands is unconfirmed. `cursor-agent acp` is the
  richer surface if we ever take on an ACP client.
- **Codex** — `codex exec` is the spawn-and-parse analogue and reuses the ChatGPT login by default.
  Prior art uses `codex app-server` instead for the approval channel; `exec` is the cheaper entry.

Each stays contained to `agent-config.ts` (binary, args, model catalog, skill sigil) and
`spawn-agent.ts` (process concerns), which is what those two files exist to absorb.

**Permission mode (Ask / Auto / Full / Read).** Mechanisms that can implement the chip:

- Claude Agent SDK `query()` — `permissionMode` / `canUseTool` (t3code: `full-access` → `bypassPermissions`). Ask and Full have a mapped path; Auto and Read need an explicit extra mapping (Read is closest to a deny-edit / plan-style ruleset, not a flag we already pass).
- ACP `session/request_permission` — Cursor (`cursor-agent acp`), OpenCode `opencode acp`, Grok. Ask is native; Full is auto-approve in full-access (t3code tests). Auto is “approve unless denied.” Read is a ruleset/mode, not an ACP method.
- OpenCode HTTP — prompt `permission` ruleset + `permission.asked` / `permission.reply`. t3code only maps two runtime modes onto that. `--auto` is skip-ask-not-deny, which is Auto, not Ask.
- Codex `app-server` approval channel — same idea as t3code’s pending-approval maps.

Mechanism that cannot: current `claude -p --dangerously-skip-permissions`. That spawn makes the chip decorative. `opencode run --auto` alone is the same class of skip, not an Ask UI.
