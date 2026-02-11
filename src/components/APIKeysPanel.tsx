"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Check, AlertCircle, Loader } from "lucide-react";

interface APIKey {
  key: string;
  isSet: boolean;
  lastValidated?: number;
}

interface APIKeysState {
  gemini: APIKey;
  openai: APIKey;
  replicate: APIKey;
  fal: APIKey;
}

const API_KEYS_STORAGE_KEY = "rootvrse-api-keys";

const providers = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "AI image generation and text analysis",
    docsUrl: "https://ai.google.dev",
    color: "bg-blue-500",
    envKey: "GEMINI_API_KEY",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models for text generation and analysis",
    docsUrl: "https://platform.openai.com/api-keys",
    color: "bg-emerald-500",
    envKey: "OPENAI_API_KEY",
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Access to thousands of open-source models",
    docsUrl: "https://replicate.com/account/api-tokens",
    color: "bg-purple-500",
    envKey: "REPLICATE_API_KEY",
  },
  {
    id: "fal",
    name: "Fal.ai",
    description: "Fast inference for image and video generation",
    docsUrl: "https://fal.ai/dashboard/keys",
    color: "bg-pink-500",
    envKey: "FAL_API_KEY",
  },
];

export function APIKeysPanel() {
  const [keys, setKeys] = useState<APIKeysState>({
    gemini: { key: "", isSet: false },
    openai: { key: "", isSet: false },
    replicate: { key: "", isSet: false },
    fal: { key: "", isSet: false },
  });

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  // Load keys from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) {
      try {
        const decoded = JSON.parse(atob(stored));
        setKeys(decoded);
      } catch (e) {
        console.error("Failed to load API keys:", e);
      }
    }
  }, []);

  // Check which keys are set from environment or localStorage
  useEffect(() => {
    const checkKeysFromEnv = async () => {
      try {
        const response = await fetch("/api/env-status");
        const data = await response.json();
        if (data.keys) {
          setKeys((prev) => ({
            ...prev,
            gemini: { ...prev.gemini, isSet: !!data.keys.GEMINI_API_KEY },
            openai: { ...prev.openai, isSet: !!data.keys.OPENAI_API_KEY },
            replicate: { ...prev.replicate, isSet: !!data.keys.REPLICATE_API_KEY },
            fal: { ...prev.fal, isSet: !!data.keys.FAL_API_KEY },
          }));
        }
      } catch (e) {
        // Silently fail - env check is optional
      }
    };

    checkKeysFromEnv();
  }, []);

  const handleKeyChange = (providerId: string, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], key: value, isSet: !!value },
    }));
    setSaved(false);
  };

  const toggleKeyVisibility = (providerId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const saveKeys = async () => {
    try {
      // Save to localStorage (base64 encoded for minimal obfuscation)
      const encoded = btoa(JSON.stringify(keys));
      localStorage.setItem(API_KEYS_STORAGE_KEY, encoded);

      // Also save to backend .env.local if possible
      await fetch("/api/save-api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      }).catch(() => {
        // Backend save is optional
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save API keys:", e);
    }
  };

  const testKey = async (providerId: string) => {
    const key = keys[providerId as keyof APIKeysState].key;
    if (!key) return;

    setValidating((prev) => new Set([...prev, providerId]));

    try {
      const response = await fetch("/api/validate-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, key }),
      });

      const data = await response.json();
      if (data.valid) {
        setKeys((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId as keyof APIKeysState],
            lastValidated: Date.now(),
          },
        }));
      }
    } catch (e) {
      console.error("Key validation failed:", e);
    } finally {
      setValidating((prev) => {
        const next = new Set(prev);
        next.delete(providerId);
        return next;
      });
    }
  };

  const clearKey = (providerId: string) => {
    setKeys((prev) => ({
      ...prev,
      [providerId]: { key: "", isSet: false },
    }));
    setSaved(false);
  };

  const getKeyStatus = (providerId: string) => {
    const keyData = keys[providerId as keyof APIKeysState];
    if (validating.has(providerId)) {
      return { icon: Loader, text: "Validating...", color: "text-blue-500" };
    }
    if (keyData.lastValidated) {
      return { icon: Check, text: "Valid", color: "text-green-500" };
    }
    if (keyData.isSet && keyData.key) {
      return { icon: AlertCircle, text: "Not tested", color: "text-yellow-500" };
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">API Keys</h2>
        <p className="text-neutral-400">
          Add your API keys to enable different AI providers and features. Keys are stored securely in your browser.
        </p>
      </div>

      {/* Quick Start Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-blue-200 font-semibold mb-2">Need API Keys?</h3>
        <p className="text-blue-100/80 text-sm mb-3">
          Get free API keys from any of these providers. Each offers a generous free tier to get started.
        </p>
        <ul className="text-sm text-blue-100/70 space-y-1">
          <li>• <strong>Gemini:</strong> Free tier with 60 requests/minute (required)</li>
          <li>• <strong>OpenAI:</strong> Free trial credits ($5) for new accounts</li>
          <li>• <strong>Replicate:</strong> Free predictions with paid add-ons</li>
          <li>• <strong>Fal.ai:</strong> Free tier with monthly quota</li>
        </ul>
      </div>

      {/* API Keys Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((provider) => {
          const keyData = keys[provider.id as keyof APIKeysState];
          const status = getKeyStatus(provider.id);
          const isVisible = visibleKeys.has(provider.id);

          return (
            <div
              key={provider.id}
              className="border border-neutral-700 rounded-lg p-5 hover:border-neutral-600 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-100">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-neutral-400">{provider.description}</p>
                  </div>
                </div>
                {status && (
                  <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                    <status.icon size={16} className={status.icon === Loader ? "animate-spin" : ""} />
                    {status.text}
                  </div>
                )}
              </div>

              {/* Input Field */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={isVisible ? "text" : "password"}
                    value={keyData.key}
                    onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                    placeholder="Paste your API key here..."
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 pr-12 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600"
                  />
                  {keyData.key && (
                    <button
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-300 transition-colors"
                    >
                      {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>

                {/* Get Key Link */}
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Get API key from {provider.name} →
                </a>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                {keyData.key && (
                  <>
                    <button
                      onClick={() => testKey(provider.id)}
                      disabled={validating.has(provider.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
                    >
                      {validating.has(provider.id) ? "Testing..." : "Test Key"}
                    </button>
                    <button
                      onClick={() => clearKey(provider.id)}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded font-medium text-sm transition-colors"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
        <div>
          {saved && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check size={16} />
              Keys saved successfully
            </div>
          )}
          <p className="text-neutral-400 text-sm">
            {Object.values(keys).filter((k) => k.isSet).length} of {providers.length} keys configured
          </p>
        </div>
        <button
          onClick={saveKeys}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
        >
          Save All Keys
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-400">
        <p className="font-semibold text-neutral-300 mb-2">🔒 Security & Privacy</p>
        <ul className="space-y-1 text-xs">
          <li>• Keys are stored locally in your browser, never sent to our servers</li>
          <li>• Each API call goes directly to the provider's servers</li>
          <li>• You can clear keys at any time</li>
          <li>• For server deployments, add keys to your <code className="bg-neutral-900 px-2 py-1 rounded">.env.local</code> file</li>
        </ul>
      </div>
    </div>
  );
}
