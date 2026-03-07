# Foremoz Active Whitepaper v0.3 - Interaction Network

## Purpose

Menetapkan Foremoz Active sebagai interaction network, bukan hanya sistem operasi internal gym.
Bab ini mendefinisikan actor utama, pola interaksi, dan implikasi arsitekturalnya.

## Actor Model

### Primary Actors

Primary actors adalah entitas yang menghasilkan nilai ekonomi utama dalam ekosistem:

- `coach`
- `studio` (place)
- `member` (passport)

Model relasi inti:

`coach <-> member <-> studio`

### Supporting Roles

Supporting roles (`sales`, `customer service`, `receptionist`, `admin`) berfungsi sebagai operator operasional.
Mereka bukan node utama jaringan ekonomi.
Jika diperlukan, individu supporting role dapat mengaktifkan role actor utama melalui passport yang sama.

## Actor Responsibilities

### Coach

Coach adalah creator aktivitas olahraga.

Kemampuan utama:
- membuat kelas
- membuka sesi personal training
- membuat program latihan
- mengelola komunitas klien

Coach dapat bekerja dengan lebih dari satu studio.

### Studio (Place)

Studio menyediakan infrastruktur fisik.

Contoh:
- gym
- yoga studio
- martial arts dojo
- tennis court
- sports facility

Kemampuan utama:
- menerima kelas dari coach
- mengelola membership
- menyediakan slot waktu dan ruang

### Member (Passport)

Member direpresentasikan oleh Foremoz Passport.
Passport menyimpan identitas olahraga individu yang portable lintas coach dan studio.

Conten minimum passport:
- riwayat kelas
- aktivitas latihan
- hubungan dengan coach
- hubungan dengan studio
- performance milestones

## Interaction Model

### Coach -> Studio

Coach memilih studio tempat kelas diselenggarakan.
Jika studio belum terdaftar, coach dapat mengirim invitation.

Flow minimum:

`coach create class -> select studio -> studio approval -> class published`

### Coach -> Member

Coach dapat:
- mengundang klien
- membuka kelas terbuka
- menjual paket personal training

Member dapat mengikuti kelas melalui sistem booking.

### Member -> Studio

Member dapat:
- bergabung membership
- check-in ke studio
- mengikuti kelas di studio

## Invitation and Network Growth

Pertumbuhan jaringan menggunakan invitation network.
Actor dapat mengundang actor lain:

- `coach invite member`
- `coach invite studio`
- `studio invite coach`
- `member invite friend`

Pendekatan ini menurunkan ketergantungan pertumbuhan pada tim sales terpusat.

## Identity Subdomain Implication

Agar invitation network berjalan konsisten, setiap actor memerlukan identity surface berbasis subdomain.
Minimum requirement:

- `coach.foremoz.com` untuk actor coach.
- `passport.foremoz.com` untuk actor member.

Implikasi operasional:
- invitation link diarahkan ke subdomain actor yang relevan.
- acceptance flow dan actor profile diselesaikan pada identity surface masing-masing.
- relasi actor yang aktif tetap dicatat sebagai event dan diproyeksikan ke read model network.

## Event Representation

Setiap interaksi actor direpresentasikan sebagai event dalam EventDB.

Contoh event:
- `class.scheduled`
- `class.booking.created`
- `class.attendance.confirmed`
- `pt.session.booked`
- `checkin.logged`
- `invitation.sent`
- `invitation.accepted`
- `coach.studio.linked`

Event diproyeksikan ke read model untuk:
- member portal
- PT workspace
- admin dashboard
- tenant performance metrics
- actor network graph

## Multi-sport Expansion

Struktur actor ini dapat digeneralisasi lintas olahraga dengan pola:

`coach -> venue -> player`

Contoh vertical:
- yoga
- crossfit
- tennis
- badminton
- martial arts
- swimming

Passport identity layer dipertahankan agar ekspansi multi-sport tidak memerlukan perubahan struktur identitas pengguna.
