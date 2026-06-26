"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, Lock, User } from "lucide-react";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Enter the shared username and password to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { token } = await api.post<{ token: string }>("/auth/login", {
        username,
        password,
      });
      setToken(token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Plane size={22} color="#fff" />
          </div>
          <h1 className="text-[20px] font-medium">Sasta Holiday CRM</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
            Sign in with the shared team account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-6"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5">Username</label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)" }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="team username"
                  className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-[14px] outline-none focus:border-[var(--primary-light)]"
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)" }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="team password"
                  className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-[14px] outline-none focus:border-[var(--primary-light)]"
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                />
              </div>
            </div>

            {error && (
              <p className="text-[13px]" style={{ color: "var(--accent)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-[14px] font-medium text-white mt-2 disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <p className="text-center text-[12px] mt-5" style={{ color: "var(--muted)" }}>
          You will select your name when adding or updating a lead.
        </p>
      </div>
    </div>
  );
}
