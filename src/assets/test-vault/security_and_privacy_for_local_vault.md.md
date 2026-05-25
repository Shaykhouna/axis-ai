# Security and Privacy in a Local AI Vault

While local storage is inherently more private than cloud solutions, there are still risks: leaked files, unauthorised access, model telemetry, and prompt injection. This document details how to harden your local vault for sensitive information (e.g., personal notes, API keys, medical records).

## Threat Model

Assume:

- Your device may be physically accessed by others (shared computer, stolen laptop).
- Malware or other processes on the same machine might read files.
- The LLM (even local) may inadvertently memorise or leak data from context.
- You might accidentally include sensitive information in a chunk.

Goals:

- **Confidentiality**: Only authorised users (the OS user running the assistant) can read vault contents.
- **Integrity**: Chunks cannot be tampered without detection.
- **Isolation**: The assistant’s logs and temporary files do not contain plaintext chunks.

## Disk Encryption

Full disk encryption (BitLocker, LUKS, FileVault) is the first line of defence. It protects against physical theft. However, when the machine is running and unlocked, the vault is accessible.

For additional protection, encrypt individual document files inside the vault using **age** or **gpg** with a passphrase not stored on disk. The assistant prompts for the passphrase at startup and caches it in memory.

## Encryption at Rest (Per‑Document)

Implementation sketch (Rust with `age` crate):

```rust
use age::Encryptor;
use std::fs;

fn encrypt_document(plaintext: &[u8], passphrase: &str) -> Vec<u8> {
    let encryptor = Encryptor::with_user_passphrase(passphrase);
    let mut encrypted = vec![];
    encryptor.encrypt(plaintext, &mut encrypted).unwrap();
    encrypted
}