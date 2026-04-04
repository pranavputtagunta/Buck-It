import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://bsrmddwsevwcclxcofpa.supabase.co";
const supabaseAnonKey = "sb_publishable__uPKdXuHP7Nsu-W-U5UyDw_hQHY9Ba4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
