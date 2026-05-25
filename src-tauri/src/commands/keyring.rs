// OS keychain bridge. Secret values NEVER touch the SQLite DB.
// macOS: Keychain Services. Windows: Credential Manager. Linux: Secret Service.

use keyring::Entry;

const SERVICE: &str = "com.shaykh.axisai";

#[tauri::command]
pub fn keyring_set(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn keyring_get(key: String) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(p) => Ok(Some(p)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn keyring_delete(key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        // Idempotent: deleting a non-existent entry is not an error.
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}