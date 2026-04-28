# AGENTS.md

Panduan untuk agen yang bekerja di repository Foremoz.

## Prinsip Utama

Foremoz adalah sistem yang digerakkan oleh konfigurasi.

Jangan pernah hardcode:

- label
- struktur UI
- workflow
- status
- permission
- menu atau navigasi

Semua nilai tersebut harus berasal dari JSON config. Jika config yang dibutuhkan belum ada, tambahkan atau perluas JSON config terlebih dahulu, lalu buat kode generic yang membaca config itu.

## Aturan Implementasi

- Kode harus reusable, generic, dan config-driven.
- Komponen UI tidak boleh menyimpan struktur menu, daftar tab, label status, flow step, role, permission key, atau action list sebagai array/object hardcoded.
- API/backend tidak boleh menyimpan definisi workflow, status transition, permission matrix, atau menu sebagai konstanta hardcoded.
- Gunakan config sebagai sumber kebenaran. Kode hanya bertugas memvalidasi, memetakan, dan merender config.
- Saat menambah fitur baru, desain bentuk config-nya dulu sebelum menulis komponen atau route.
- Jika ada data default untuk development/demo, simpan sebagai JSON config atau fixture yang jelas, bukan tersebar di komponen.
- Hindari logic khusus modul yang membuat komponen tidak reusable. Prefer adapter/renderer generic berbasis schema config.

## Pola Config

Gunakan JSON config untuk mendefinisikan hal seperti:

- app/module metadata
- menu/sidebar/topbar
- page layout dan section
- form fields dan validation rule
- table columns, filters, sorting, dan actions
- status list, warna badge, dan label display
- workflow step, transition, guard, dan action
- permission matrix, role, dan visibility rule
- empty state, notification, dan copy text

Kode boleh memiliki helper generic seperti:

- `renderPage(config)`
- `buildNavigation(config, context)`
- `canAccess(permissionConfig, sessionContext)`
- `resolveStatus(statusConfig, value)`
- `runWorkflowTransition(workflowConfig, currentState, action)`

Kode tidak boleh memiliki variasi spesifik bisnis yang dikunci langsung di JSX/JS, misalnya `if (status === "Approved")`, `const navLinks = [...]`, atau `role === "owner"` kecuali nilai tersebut berasal dari config dan helper generic.

## Checklist Sebelum Mengubah Kode

Sebelum membuat perubahan, periksa:

- Apakah repo/subproject sudah punya folder `config`, `data`, fixture JSON, atau schema terkait?
- Apakah fitur ini bisa diselesaikan dengan memperluas JSON config yang sudah ada?
- Apakah label/menu/status/permission baru muncul di kode? Jika ya, pindahkan ke config.
- Apakah komponen yang dibuat bisa menerima config dan context, bukan mengandung aturan bisnis internal?
- Apakah perubahan menjaga pola monorepo dan style subproject yang sedang disentuh?

## Frontend

- Render UI dari config: navigasi, halaman, card, form, tabel, badge, action, dan empty state.
- Komponen harus menerima data/config melalui props atau loader generic.
- Label display, helper text, CTA text, opsi dropdown, dan badge style harus berasal dari config.
- Visibility/disabled state harus dihitung dari permission/workflow config dan session context.
- Jangan menambah menu hardcoded di `App.jsx`, layout, navbar, sidebar, atau page component.

## Backend/API

- Endpoint boleh generic, tetapi aturan bisnis harus datang dari config atau data store.
- Workflow transition, status, permission, role, dan module availability harus dapat dikonfigurasi.
- Validasi request boleh memakai schema, tetapi schema harus merepresentasikan config/domain model yang eksplisit.
- Jangan menyebar string status, role, atau permission di route handler.

## Database dan Seed

- Seed/demo data harus mudah diganti dan tidak menjadi aturan permanen.
- Jika status, role, permission, menu, atau workflow disimpan di database, pastikan ada definisi config yang jelas untuk bootstrap/migrasi.
- Jangan membuat migration yang mengunci UI atau workflow tanpa jalur konfigurasi.
- Submodule foremoz/apps/eventdb jangan diubah, pakai sebagai pattern untuk project.

## Testing dan Verifikasi

Saat memungkinkan, jalankan command test/build dari subproject yang disentuh, misalnya:

- `npm run build`
- `npm run lint`
- script validasi schema/config yang tersedia

Tambahkan test atau fixture ketika perubahan menyentuh renderer generic, permission, workflow, atau config parser.

Setiap selesai melakukan perubahan:

- jalankan build untuk subproject yang disentuh;
- restart service/app yang relevan agar perubahan aktif;
- commit perubahan ke git dengan pesan yang jelas.

Jika build, restart, atau commit tidak bisa dilakukan, jelaskan alasan dan kondisi terakhirnya.

## Cara Bekerja di Monorepo

- Batasi perubahan pada subproject yang relevan.
- Jangan merapikan atau revert perubahan yang tidak terkait.
- Baca `package.json`, `TODO.md`, `SPEC.md`, atau dokumen `paper/` di subproject sebelum mengambil keputusan besar.
- Ikuti pola lokal lebih dulu. Jika pola lokal masih hardcoded, refactor bagian yang disentuh menuju config-driven tanpa memperluas hardcode.

## TODO Project

- Setiap project/subproject harus memiliki `TODO.md`.
- Jika project yang disentuh belum punya `TODO.md`, buat file tersebut sebelum atau saat melakukan perubahan.
- Catat pekerjaan yang perlu dilakukan, keputusan lanjutan, dan gap yang ditemukan di `TODO.md` project terkait.
- Revisi `TODO.md` setiap ada perubahan scope, temuan baru, atau pekerjaan tambahan.
- Centang item yang sudah selesai dengan format checklist Markdown, misalnya `- [x]`.
- Jangan biarkan `TODO.md` berisi status yang menyesatkan. Jika pekerjaan batal, berubah arah, atau dipindahkan, tulis kondisi terbarunya.

## Definition of Done

Perubahan dianggap selesai jika:

- semua label, UI structure, workflow, status, permissions, dan menu yang baru berada di JSON config;
- kode yang membaca config bersifat generic dan reusable;
- tidak ada string/array/object bisnis baru yang hardcoded di komponen atau route;
- config memiliki struktur yang jelas dan mudah diperluas;
- `TODO.md` project terkait sudah dibuat/diperbarui dan item selesai sudah dicentang;
- build/test relevan sudah dijalankan atau alasan tidak menjalankannya dijelaskan;
- service/app relevan sudah direstart atau alasan tidak merestart dijelaskan;
- perubahan sudah dicommit atau alasan tidak commit dijelaskan.

## Anti-Hardcode Enforcement

If a requested change requires adding a new label, menu, status, workflow, permission, field, table column, action, or copy text:

1. First locate the relevant JSON config.
2. If no config exists, create one.
3. Then update the generic renderer/engine to consume it.
4. Do not implement the feature directly in JSX, route handlers, or service logic.

If forced to choose between:
- faster hardcoded implementation
- slower config-driven implementation

Always choose config-driven implementation.

## Wording and UI Copy

All user-facing wording must come from config.

This includes:
- page title
- section title
- button text
- helper text
- placeholder
- tooltip
- empty state
- error message
- success message
- confirmation dialog
- notification text

Do not hardcode user-facing text in components.

## Design System and Styling

Do not hardcode arbitrary colors, spacing, radius, or visual variants in components.

Use design tokens, CSS variables, Tailwind utility presets, or theme config.

Allowed:
- semantic variants such as `primary`, `secondary`, `danger`, `success`, `warning`
- token names such as `surface`, `muted`, `border`, `accent`

Avoid:
- raw hex colors in components
- repeated custom class combinations
- module-specific styling that should be reusable
