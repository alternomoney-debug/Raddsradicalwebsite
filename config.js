/*
  LOGIN SETTINGS.
  SUPABASE_KEY is the "publishable" key. It is MEANT to be public.
  NEVER paste a "secret" or "service_role" key here. Anyone can read this file.
*/
window.RAD_CONFIG = {
  SUPABASE_URL: "https://zwisbtcxbquhlshbgtqq.supabase.co",
  SUPABASE_KEY: "sb_publishable_-LxB8ui-n1L4snqxqGl3Fw_1V4VU6SQ",
  // Email sign-in links only work for real once you set up custom SMTP in Supabase
  // (the built-in sender is limited to 2 emails an hour). Leave false to use Discord only.
  EMAIL_LOGIN: false
};
