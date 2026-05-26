// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    // Must be set before WebKitGTK initializes its GPU stack.
    // nouveau rejects the DMA-BUF pushbufs that hardware compositing generates.
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    // Migrations are versioned and run automatically by the SQL plugin on startup.
    // Each future module adds its own migration with the next sequential version.
    let migrations = vec![
        Migration {
            version: 1,
            description: "core_init",
            sql: include_str!("../migrations/001_core_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "settings_init",
            sql: include_str!("../migrations/002_settings_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "router_init",
            sql: include_str!("../migrations/003_router_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "vault_init",
            sql: include_str!("../migrations/004_vault_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "agents_init",
            sql: include_str!("../migrations/005_agents_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "lab_init",
            sql: include_str!("../migrations/006_lab_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "services_init",
            sql: include_str!("../migrations/007_services_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "chat_init",
            sql: include_str!("../migrations/008_chat_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "onboarding",
            sql: include_str!("../migrations/009_onboarding.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:axisai.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::keyring::keyring_set,
            commands::keyring::keyring_get,
            commands::keyring::keyring_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
