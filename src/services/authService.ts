// src/services/authService.ts
import { supabase } from "../../supabase";
import { API_BASE_URL, handleApiError } from "./apiClient";

export const authService = {
  async signUp(
    email: string,
    password: string,
    displayName: string,
    location: string,
  ) {
    // 1. Securely sign up via Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Signup failed, no user returned.");

    const userId = authData.user.id;

    // 2. Call FastAPI backend to create the public profile
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userId,
        display_name: displayName,
        location: location,
      }),
    });

    await handleApiError(response);

    return { userId, displayName };
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
  },
};
