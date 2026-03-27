# Foremoz Passport Whitepaper v0.1 - Interaction Network

## Purpose

Menjelaskan interaction network dari sudut pandang member/passport sebagai owner relasi dan owner data personal.

## Core Network

Relasi inti:

`coach <-> member/passport <-> studio`

Member dapat aktif di banyak relasi sekaligus:
- beberapa coach,
- beberapa studio/fitness,
- beberapa subscription aktif sesuai kebutuhan latihan.

## Join and Subscription Model

Flow minimum:

`discover coach/fitness -> subscribe/join -> booking class/PT -> attendance`

Satu passport dapat menyimpan histori dari seluruh relasi tanpa kehilangan jejak saat berpindah program.

## Personal Performance Model

Member mencatat performa pribadi secara berkala:
- diet/nutrisi.
- berat badan.
- muscle/body composition.
- workout notes.
- milestones.

Data ini dianggap milik member dan default bersifat private.

## Consent-based Coach Sharing

Data performa hanya dibagikan ke coach jika member mengizinkan.

Rule:
- member grant consent per coach.
- member dapat memilih category data yang dibagikan.
- member dapat revoke kapan saja.
- semua grant/revoke direkam sebagai event immutable.

## Event and Projection Impact

Event penting:
- `subscription.created`
- `performance.weight.logged`
- `performance.muscle.logged`
- `consent.granted`
- `consent.revoked`

Projection output:
- unified member progress timeline.
- consent state matrix per coach.
- coach shared view yang sesuai izin.
