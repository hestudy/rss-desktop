use keyring::Entry;
use log::warn;

const SERVICE_NAME: &str = "rss-desktop";
const AI_API_KEY_USER: &str = "ai-api-key";

fn get_entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, AI_API_KEY_USER)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))
}

/// 将 API Key 存入系统密钥管理服务
pub fn store_api_key(key: &str) -> Result<(), String> {
    if key.trim().is_empty() {
        // 空 key 时删除已有凭据
        return delete_api_key();
    }
    let entry = get_entry()?;
    entry
        .set_password(key)
        .map_err(|e| format!("Failed to store API key in keyring: {}", e))
}

/// 从系统密钥管理服务读取 API Key
pub fn load_api_key() -> Option<String> {
    match get_entry() {
        Ok(entry) => match entry.get_password() {
            Ok(key) if !key.trim().is_empty() => Some(key),
            Ok(_) => None,
            Err(keyring::Error::NoEntry) => None,
            Err(e) => {
                warn!("Failed to load API key from keyring: {}", e);
                None
            }
        },
        Err(e) => {
            warn!("Failed to create keyring entry: {}", e);
            None
        }
    }
}

/// 删除系统密钥管理服务中的 API Key
pub fn delete_api_key() -> Result<(), String> {
    let entry = get_entry()?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete API key: {}", e)),
    }
}
