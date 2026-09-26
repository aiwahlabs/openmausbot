/**
 * Credentials an agent may ask the person to provide through an inline
 * card. The id is the entire authority surface: agents never choose a
 * config path, label, URL, or arbitrary field name.
 */
export const CREDENTIAL_TARGETS = {
  xaiApiKey: {
    label: "xAI API key",
    description: "Used by the built-in Grok provider.",
    placeholder: "xai-…",
    helpUrl: "https://console.x.ai/",
  },
  boxToken: {
    label: "Box API key",
    description: "Gives bots an isolated cloud computer when Box is selected.",
    placeholder: "Paste your Box API key",
    helpUrl: "https://docs.boat.dev/api-keys",
  },
  opencodeGoApiKey: {
    label: "OpenCode API key",
    description: "Used for OpenCode Go and other key-backed OpenCode providers.",
    placeholder: "Paste your OpenCode API key",
    helpUrl: "https://opencode.ai/docs/providers/",
  },
  ttsKey: {
    label: "ElevenLabs API key",
    description: "Enables text-to-speech voices in calls.",
    placeholder: "Paste your ElevenLabs API key",
    helpUrl: "https://elevenlabs.io/app/settings/api-keys",
  },
  fishAudioKey: {
    label: "Fish Audio API key",
    description: "Enables Fish Audio voices in calls.",
    placeholder: "Paste your Fish Audio API key",
    helpUrl: "https://fish.audio/app/api-keys/",
  },
  openaiImageApiKey: {
    label: "OpenAI API key",
    description: "Used only to generate custom bot avatar images.",
    placeholder: "sk-…",
    helpUrl: "https://platform.openai.com/api-keys",
  },
  aiwahLlmGatewayApiKey: {
    label: "Aiwah model gateway key",
    description: "Lets the Aiwah Pi profile use the company model catalog.",
    placeholder: "Paste the key supplied by your Aiwah workspace owner",
    helpUrl: "https://github.com/aiwahlabs/aiwah-workspace",
  },
  aiwahCrmApiKey: {
    label: "Aiwah HQ access key",
    description: "Lets Aiwah Pi read and update the company HQ/CRM.",
    placeholder: "Paste the key supplied by your Aiwah workspace owner",
    helpUrl: "https://github.com/aiwahlabs/aiwah-workspace",
  },
  aiwahBrowserToken: {
    label: "Aiwah browser token",
    description: "Lets Aiwah Pi use the authenticated company browser profile.",
    placeholder: "Paste the token supplied by your Aiwah workspace owner",
    helpUrl: "https://github.com/aiwahlabs/aiwah-workspace",
  },
} as const;

export type CredentialTargetId = keyof typeof CREDENTIAL_TARGETS;
export type CredentialConfig = {
  xai?: { key?: string };
  box?: { token?: string };
  opencodeGo?: { apiKey?: string };
  tts?: { key?: string; fishKey?: string };
  imageGen?: { key?: string };
  aiwah?: { llmGatewayApiKey?: string; crmApiKey?: string; browserToken?: string };
};

export function isCredentialTargetId(value: unknown): value is CredentialTargetId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CREDENTIAL_TARGETS, value);
}

export function credentialConfigPatch(id: CredentialTargetId, value: string): CredentialConfig {
  switch (id) {
    case "xaiApiKey":
      return { xai: { key: value } };
    case "boxToken":
      return { box: { token: value } };
    case "opencodeGoApiKey":
      return { opencodeGo: { apiKey: value } };
    case "ttsKey":
      return { tts: { key: value } };
    case "fishAudioKey":
      return { tts: { fishKey: value } };
    case "openaiImageApiKey":
      return { imageGen: { key: value } };
    case "aiwahLlmGatewayApiKey":
      return { aiwah: { llmGatewayApiKey: value } };
    case "aiwahCrmApiKey":
      return { aiwah: { crmApiKey: value } };
    case "aiwahBrowserToken":
      return { aiwah: { browserToken: value } };
  }
}

export function credentialIsConfigured(config: CredentialConfig, id: CredentialTargetId): boolean {
  switch (id) {
    case "xaiApiKey":
      return Boolean(config.xai?.key);
    case "boxToken":
      return Boolean(config.box?.token);
    case "opencodeGoApiKey":
      return Boolean(config.opencodeGo?.apiKey);
    case "ttsKey":
      return Boolean(config.tts?.key);
    case "fishAudioKey":
      return Boolean(config.tts?.fishKey);
    case "openaiImageApiKey":
      return Boolean(config.imageGen?.key);
    case "aiwahLlmGatewayApiKey":
      return Boolean(config.aiwah?.llmGatewayApiKey);
    case "aiwahCrmApiKey":
      return Boolean(config.aiwah?.crmApiKey);
    case "aiwahBrowserToken":
      return Boolean(config.aiwah?.browserToken);
  }
}

/** A still-pending credential card for this target — the set a newer
 * request supersedes. Provided, dismissed, and already-superseded cards
 * keep their settled state untouched. */
export function isPendingCredentialRequest(
  message: {
    kind?: unknown;
    secret?: { target?: unknown; provided?: unknown; dismissed?: unknown; superseded?: unknown };
    from?: { botId?: unknown };
  },
  target: CredentialTargetId,
  requestingBotId: string,
  roomThread: boolean,
): boolean {
  return (
    message.kind === "secret" &&
    message.secret?.target === target &&
    message.secret.provided !== true &&
    message.secret.dismissed !== true &&
    message.secret.superseded !== true &&
    (!roomThread || message.from?.botId === requestingBotId)
  );
}

export function credentialResumeOutcome(state: {
  provided?: unknown;
  dismissed?: unknown;
}): "provided" | "dismissed" | null {
  const provided = state.provided === true;
  const dismissed = state.dismissed === true;
  if (provided === dismissed) return null;
  return provided ? "provided" : "dismissed";
}
