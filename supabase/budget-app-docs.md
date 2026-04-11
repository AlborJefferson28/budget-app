# Budget-App — Documentación del Proyecto Supabase

> **Proyecto:** Budget-app  
> **ID:** `cmiveuhetyvxjccoatqv`  
> **Región:** `us-east-1`  
> **Estado:** `ACTIVE_HEALTHY`  
> **Motor de base de datos:** PostgreSQL 17.6.1  
> **Fecha de creación:** 2026-03-14  
> **Host:** `db.cmiveuhetyvxjccoatqv.supabase.co`

---

## Índice

1. [Descripción general](#descripción-general)
2. [Esquema de base de datos](#esquema-de-base-de-datos)
   - [users](#tabla-users)
   - [profiles](#tabla-profiles)
   - [accounts](#tabla-accounts)
   - [account_members](#tabla-account_members)
   - [wallets](#tabla-wallets)
   - [budgets](#tabla-budgets)
   - [allocations](#tabla-allocations)
   - [transactions](#tabla-transactions)
   - [account_transfers](#tabla-account_transfers)
   - [budget_events](#tabla-budget_events)
3. [Relaciones entre tablas](#relaciones-entre-tablas)
4. [Seguridad (RLS)](#seguridad-rls)
5. [Extensiones instaladas](#extensiones-instaladas)
6. [Edge Functions](#edge-functions)
7. [Estadísticas de datos](#estadísticas-de-datos)

---

## Descripción general

**Budget-app** es una aplicación de gestión de presupuestos personales y compartidos. Permite a los usuarios crear cuentas (personales o compartidas), administrar billeteras (wallets), definir presupuestos con metas, registrar transacciones y asignar fondos de billeteras a presupuestos. También soporta la colaboración entre usuarios mediante el sistema de miembros de cuenta (`account_members`).

---

## Esquema de base de datos

### Tabla `users`

Tabla personalizada de usuarios de la aplicación (complementa `auth.users` de Supabase).

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único del usuario |
| `email` | `text` | UNIQUE, NOT NULL | — | Correo electrónico del usuario |
| `password_hash` | `text` | NOT NULL | — | Hash de la contraseña |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de creación del registro |

**RLS:** ✅ Habilitado  
**Registros actuales:** 8

---

### Tabla `profiles`

Información de perfil extendida, vinculada a `auth.users` y a la tabla `users`.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | — | FK hacia `auth.users.id` y `public.users.id` |
| `name` | `text` | NULLABLE | — | Nombre visible del usuario |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de creación del perfil |

**RLS:** ✅ Habilitado  
**Registros actuales:** 8

**Claves foráneas recibidas:**
- `account_members.user_id` → `profiles.id`

---

### Tabla `accounts`

Representa cuentas de presupuesto, que pueden ser personales o compartidas entre varios usuarios.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único de la cuenta |
| `name` | `text` | NOT NULL | — | Nombre de la cuenta |
| `owner_id` | `uuid` | NULLABLE | — | FK hacia `auth.users.id` (propietario) |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de creación |
| `kind` | `text` | NOT NULL | `'personal'` | Tipo de cuenta: `personal` o `shared` |

**Check constraint:** `kind IN ('personal', 'shared')`

**RLS:** ✅ Habilitado  
**Registros actuales:** 9

**Claves foráneas recibidas:**
- `wallets.account_id`, `budgets.account_id`, `transactions.account_id`
- `account_members.account_id`, `account_transfers.from_account_id / to_account_id`
- `budget_events.account_id`

---

### Tabla `account_members`

Tabla de unión que gestiona qué usuarios son miembros de qué cuentas y su rol dentro de ellas.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `account_id` | `uuid` | PK (compuesta) | — | FK hacia `accounts.id` |
| `user_id` | `uuid` | PK (compuesta) | — | FK hacia `auth.users.id` y `profiles.id` |
| `role` | `text` | NULLABLE | `'member'` | Rol del miembro en la cuenta |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de incorporación |

**Clave primaria compuesta:** (`account_id`, `user_id`)

**RLS:** ✅ Habilitado  
**Registros actuales:** 7

---

### Tabla `wallets`

Billeteras o fondos de dinero asociados a una cuenta. Llevan seguimiento del saldo disponible.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único de la billetera |
| `account_id` | `uuid` | NULLABLE | — | FK hacia `accounts.id` |
| `name` | `text` | NOT NULL | — | Nombre de la billetera |
| `icon` | `text` | NULLABLE | — | Ícono representativo |
| `balance` | `numeric` | NULLABLE | `0` | Saldo actual de la billetera |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de creación |

**RLS:** ✅ Habilitado  
**Registros actuales:** 11

**Claves foráneas recibidas:**
- `transactions.from_wallet / to_wallet`
- `account_transfers.from_wallet_id / to_wallet_id`
- `allocations.wallet_id`

---

### Tabla `budgets`

Define los presupuestos con una meta de gasto/ahorro, asociados a una cuenta.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único del presupuesto |
| `account_id` | `uuid` | NULLABLE | — | FK hacia `accounts.id` |
| `name` | `text` | NOT NULL | — | Nombre del presupuesto |
| `target` | `numeric` | NOT NULL | — | Meta de monto del presupuesto |
| `icon` | `text` | NULLABLE | — | Ícono representativo |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de creación |

**RLS:** ✅ Habilitado  
**Registros actuales:** 16

**Claves foráneas recibidas:**
- `allocations.budget_id`
- `budget_events.budget_id`

---

### Tabla `allocations`

Registra la asignación de fondos desde una billetera hacia un presupuesto específico.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único de la asignación |
| `wallet_id` | `uuid` | NULLABLE | — | FK hacia `wallets.id` |
| `budget_id` | `uuid` | NULLABLE | — | FK hacia `budgets.id` |
| `amount` | `numeric` | NOT NULL | — | Monto asignado |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de la asignación |

**RLS:** ✅ Habilitado  
**Registros actuales:** 10

---

### Tabla `transactions`

Registra movimientos de fondos entre billeteras dentro de una cuenta.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único de la transacción |
| `account_id` | `uuid` | NULLABLE | — | FK hacia `accounts.id` |
| `from_wallet` | `uuid` | NULLABLE | — | FK hacia `wallets.id` (origen) |
| `to_wallet` | `uuid` | NULLABLE | — | FK hacia `wallets.id` (destino) |
| `amount` | `numeric` | NOT NULL | — | Monto de la transacción |
| `type` | `text` | NOT NULL | — | Tipo de transacción |
| `created_by` | `uuid` | NULLABLE | — | FK hacia `auth.users.id` |
| `created_at` | `timestamptz` | NULLABLE | `now()` | Fecha de la transacción |
| `transfer_group_id` | `uuid` | NULLABLE | — | Agrupa transacciones relacionadas |

**RLS:** ✅ Habilitado  
**Registros actuales:** 1

---

### Tabla `account_transfers`

Registra transferencias de fondos entre dos cuentas distintas (de billetera a billetera entre cuentas).

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único de la transferencia |
| `from_account_id` | `uuid` | NOT NULL | — | FK hacia `accounts.id` (cuenta origen) |
| `to_account_id` | `uuid` | NOT NULL | — | FK hacia `accounts.id` (cuenta destino) |
| `from_wallet_id` | `uuid` | NOT NULL | — | FK hacia `wallets.id` (billetera origen) |
| `to_wallet_id` | `uuid` | NOT NULL | — | FK hacia `wallets.id` (billetera destino) |
| `amount` | `numeric` | NOT NULL | — | Monto transferido |
| `note` | `text` | NULLABLE | — | Nota o descripción de la transferencia |
| `created_by` | `uuid` | NULLABLE | — | FK hacia `auth.users.id` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Fecha de la transferencia |

**Check constraint:** `amount > 0`

**RLS:** ✅ Habilitado  
**Registros actuales:** 0

---

### Tabla `budget_events`

Auditoría de cambios sobre los presupuestos. Registra qué campos cambiaron, los datos anteriores y los nuevos.

| Columna | Tipo | Opciones | Valor por defecto | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | Identificador único del evento |
| `budget_id` | `uuid` | NOT NULL | — | FK hacia `budgets.id` |
| `account_id` | `uuid` | NOT NULL | — | FK hacia `accounts.id` |
| `event_type` | `text` | NOT NULL | `'updated'` | Tipo de evento (solo `'updated'`) |
| `changed_by` | `uuid` | NULLABLE | — | FK hacia `auth.users.id` |
| `changed_at` | `timestamptz` | NOT NULL | `now()` | Momento del cambio |
| `changed_fields` | `text[]` | NOT NULL | `'{}'` | Lista de campos que cambiaron |
| `old_data` | `jsonb` | NOT NULL | — | Snapshot anterior del presupuesto |
| `new_data` | `jsonb` | NOT NULL | — | Snapshot nuevo del presupuesto |

**Check constraint:** `event_type = 'updated'`

**RLS:** ✅ Habilitado  
**Registros actuales:** 2

---

## Relaciones entre tablas

```
auth.users
    ├── profiles.id  (1:1)
    ├── accounts.owner_id  (1:N)
    ├── account_members.user_id  (1:N)
    ├── transactions.created_by  (1:N)
    ├── account_transfers.created_by  (1:N)
    └── budget_events.changed_by  (1:N)

public.users
    └── profiles.id  (1:1)

profiles
    └── account_members.user_id  (1:N)

accounts
    ├── wallets.account_id  (1:N)
    ├── budgets.account_id  (1:N)
    ├── transactions.account_id  (1:N)
    ├── account_members.account_id  (1:N)
    ├── account_transfers.from_account_id  (1:N)
    ├── account_transfers.to_account_id  (1:N)
    └── budget_events.account_id  (1:N)

wallets
    ├── transactions.from_wallet  (1:N)
    ├── transactions.to_wallet  (1:N)
    ├── account_transfers.from_wallet_id  (1:N)
    ├── account_transfers.to_wallet_id  (1:N)
    └── allocations.wallet_id  (1:N)

budgets
    ├── allocations.budget_id  (1:N)
    └── budget_events.budget_id  (1:N)
```

---

## Seguridad (RLS)

Row Level Security está **habilitado en todas las tablas** del esquema `public`:

| Tabla | RLS habilitado |
|---|---|
| `users` | ✅ |
| `profiles` | ✅ |
| `accounts` | ✅ |
| `account_members` | ✅ |
| `wallets` | ✅ |
| `budgets` | ✅ |
| `allocations` | ✅ |
| `transactions` | ✅ |
| `account_transfers` | ✅ |
| `budget_events` | ✅ |

> ⚠️ Asegúrate de tener políticas RLS definidas para cada tabla. Sin políticas explícitas, RLS habilitado bloquea **todas** las operaciones por defecto.

---

## Extensiones instaladas

Las siguientes extensiones están **activamente instaladas** en el proyecto:

| Extensión | Schema | Versión | Descripción |
|---|---|---|---|
| `plpgsql` | `pg_catalog` | 1.0 | Lenguaje procedural PL/pgSQL |
| `pg_stat_statements` | `extensions` | 1.11 | Estadísticas de ejecución de SQL |
| `uuid-ossp` | `extensions` | 1.1 | Generación de UUIDs |
| `pgcrypto` | `extensions` | 1.3 | Funciones criptográficas |
| `supabase_vault` | `vault` | 0.3.1 | Gestión segura de secretos |
| `pg_graphql` | `graphql` | 1.5.11 | Soporte de GraphQL en PostgreSQL |

---

## Edge Functions

No hay Edge Functions desplegadas actualmente en este proyecto.

---

## Estadísticas de datos

| Tabla | Registros |
|---|---|
| `users` | 8 |
| `profiles` | 8 |
| `accounts` | 9 |
| `account_members` | 7 |
| `wallets` | 11 |
| `budgets` | 16 |
| `allocations` | 10 |
| `transactions` | 1 |
| `account_transfers` | 0 |
| `budget_events` | 2 |
| **Total** | **72** |

---

*Documentación generada automáticamente el 2026-03-24.*
