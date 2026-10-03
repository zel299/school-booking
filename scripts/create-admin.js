
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminAccount() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "Password123!";

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { data: existingAdmin, error: checkError } = await supabase
      .from("admins")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingAdmin) {
      console.log(`Admin user "${username}" already exists.`);
      return;
    }

    const { data, error } = await supabase
      .from("admins")
      .insert([{ username, password_hash }])
      .select();

    if (error) {
      throw error;
    }

    console.log(`Admin created successfully! Username: ${username}`);
  } catch (err) {
    console.error("Error creating admin account:", err.message);
  }
}

createAdminAccount();