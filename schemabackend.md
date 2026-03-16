# Informe Técnico del Backend

## Sistema de Finanzas – Backend en Supabase

---

# 1. Información General

**Tipo de backend:** Backend-as-a-Service
**Plataforma:** Supabase
**Base de datos:** PostgreSQL

El backend implementa un sistema de gestión financiera multiusuario basado en cuentas compartidas, billeteras, transacciones y presupuestos.

La arquitectura se organiza alrededor de una entidad central denominada **account**, que actúa como contenedor de los recursos financieros.

---

# 2. Arquitectura General del Sistema

El sistema está estructurado en los siguientes dominios funcionales:

1. **Autenticación de usuarios**
2. **Gestión de cuentas financieras**
3. **Gestión de miembros de cuentas**
4. **Gestión de billeteras**
5. **Registro de transacciones**
6. **Sistema de presupuestos**
7. **Asignación de fondos a presupuestos**

Las relaciones entre entidades se organizan mediante claves foráneas y UUID como identificadores primarios.

---

# 3. Esquemas Utilizados

El backend utiliza los siguientes esquemas de base de datos:

| Esquema | Descripción                         |
| ------- | ----------------------------------- |
| auth    | Gestión de autenticación y usuarios |
| public  | Entidades del dominio de negocio    |

---

# 4. Gestión de Usuarios

## 4.1 Tabla: auth.users

Tabla gestionada por el sistema de autenticación de Supabase.

### Función

Almacena la información principal de autenticación del usuario.

### Campos relevantes

| Campo              | Tipo      |
| ------------------ | --------- |
| id                 | uuid      |
| email              | text      |
| encrypted_password | text      |
| created_at         | timestamp |

---

## 4.2 Tabla: public.users

Tabla de usuarios del dominio de negocio.

| Campo         | Tipo      |
| ------------- | --------- |
| id            | uuid      |
| email         | text      |
| password_hash | text      |
| created_at    | timestamp |

### Restricciones

* **Primary Key:** id
* **Unique:** email

---

## 4.3 Tabla: public.profiles

Extensión del perfil del usuario.

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| name       | text      |
| created_at | timestamp |

### Restricciones

| Tipo | Relación             |
| ---- | -------------------- |
| PK   | id                   |
| FK   | id → auth.users.id   |
| FK   | id → public.users.id |

---

# 5. Gestión de Cuentas

## Tabla: public.accounts

Entidad principal del sistema.

Representa un espacio financiero independiente que puede contener múltiples usuarios, billeteras y presupuestos.

### Campos

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| name       | text      |
| owner_id   | uuid      |
| created_at | timestamp |

### Restricciones

| Tipo | Relación                 |
| ---- | ------------------------ |
| PK   | id                       |
| FK   | owner_id → auth.users.id |

---

# 6. Gestión de Miembros de Cuenta

## Tabla: public.account_members

Relaciona usuarios con cuentas financieras.

Permite la participación de múltiples usuarios dentro de una misma cuenta.

### Campos

| Campo      | Tipo      |
| ---------- | --------- |
| account_id | uuid      |
| user_id    | uuid      |
| role       | text      |
| created_at | timestamp |

### Restricciones

| Tipo | Relación                 |
| ---- | ------------------------ |
| PK   | (account_id, user_id)    |
| FK   | account_id → accounts.id |
| FK   | user_id → auth.users.id  |

### Valores por defecto

| Campo | Valor  |
| ----- | ------ |
| role  | member |

---

# 7. Gestión de Billeteras

## Tabla: public.wallets

Representa contenedores de dinero dentro de una cuenta.

### Campos

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| account_id | uuid      |
| name       | text      |
| icon       | text      |
| balance    | numeric   |
| created_at | timestamp |

### Restricciones

| Tipo | Relación                 |
| ---- | ------------------------ |
| PK   | id                       |
| FK   | account_id → accounts.id |

### Valores por defecto

| Campo   | Valor |
| ------- | ----- |
| balance | 0     |

---

# 8. Gestión de Transacciones

## Tabla: public.transactions

Registra los movimientos financieros dentro del sistema.

### Campos

| Campo       | Tipo      |
| ----------- | --------- |
| id          | uuid      |
| account_id  | uuid      |
| from_wallet | uuid      |
| to_wallet   | uuid      |
| amount      | numeric   |
| type        | text      |
| created_by  | uuid      |
| created_at  | timestamp |

### Restricciones

| Tipo | Relación                   |
| ---- | -------------------------- |
| PK   | id                         |
| FK   | account_id → accounts.id   |
| FK   | from_wallet → wallets.id   |
| FK   | to_wallet → wallets.id     |
| FK   | created_by → auth.users.id |

---

# 9. Gestión de Presupuestos

## Tabla: public.budgets

Define categorías financieras con objetivos monetarios.

### Campos

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| account_id | uuid      |
| name       | text      |
| target     | numeric   |
| icon       | text      |
| created_at | timestamp |

### Restricciones

| Tipo | Relación                 |
| ---- | ------------------------ |
| PK   | id                       |
| FK   | account_id → accounts.id |

---

# 10. Asignación de Fondos a Presupuestos

## Tabla: public.allocations

Relaciona billeteras con presupuestos para asignar montos específicos.

### Campos

| Campo      | Tipo      |
| ---------- | --------- |
| id         | uuid      |
| wallet_id  | uuid      |
| budget_id  | uuid      |
| amount     | numeric   |
| created_at | timestamp |

### Restricciones

| Tipo | Relación               |
| ---- | ---------------------- |
| PK   | id                     |
| FK   | wallet_id → wallets.id |
| FK   | budget_id → budgets.id |

---

# 11. Identificadores

Todas las entidades del dominio utilizan:

| Tipo | Uso                       |
| ---- | ------------------------- |
| uuid | identificadores primarios |

La generación de identificadores se realiza mediante:

```sql
gen_random_uuid()
```

---

# 12. Relaciones Principales del Modelo

Relaciones entre entidades del dominio.

```
auth.users
   │
   ├── profiles
   │
   ├── account_members
   │
   └── transactions (created_by)

accounts
   │
   ├── wallets
   │
   ├── budgets
   │
   ├── transactions
   │
   └── account_members

wallets
   │
   ├── transactions
   │
   └── allocations

budgets
   │
   └── allocations
```

---

# 13. Dominio de Datos

## Entidades principales

| Entidad         | Función                           |
| --------------- | --------------------------------- |
| users           | usuarios del sistema              |
| profiles        | información adicional del usuario |
| accounts        | contenedor financiero             |
| account_members | relación usuario-cuenta           |
| wallets         | contenedores de dinero            |
| transactions    | movimientos financieros           |
| budgets         | categorías presupuestarias        |
| allocations     | asignaciones de dinero            |

---

# 14. Campos Temporales

Las tablas incluyen campos de auditoría basados en timestamp.

| Campo      | Descripción                    |
| ---------- | ------------------------------ |
| created_at | fecha de creación del registro |

Valor por defecto:

```sql
now()
```

---

# 15. Tipos de Datos Utilizados

| Tipo                     | Uso                  |
| ------------------------ | -------------------- |
| uuid                     | identificadores      |
| text                     | campos descriptivos  |
| numeric                  | montos monetarios    |
| timestamp with time zone | registros temporales |

---

# 16. Restricciones de Integridad

El modelo utiliza:

| Tipo           | Uso                                |
| -------------- | ---------------------------------- |
| Primary Key    | identificación única de registros  |
| Foreign Key    | integridad referencial             |
| Unique         | restricción de unicidad en correos |
| Default values | valores automáticos                |

---

# 17. Entidades del Dominio Financiero

El sistema maneja las siguientes estructuras financieras:

| Concepto                     | Representación  |
| ---------------------------- | --------------- |
| Cuenta financiera            | accounts        |
| Miembros de cuenta           | account_members |
| Billeteras                   | wallets         |
| Movimientos financieros      | transactions    |
| Categorías de presupuesto    | budgets         |
| Asignaciones presupuestarias | allocations     |

---

# 18. Resumen de Tablas

| Tabla           | Descripción            |
| --------------- | ---------------------- |
| auth.users      | usuarios autenticados  |
| public.users    | usuarios del dominio   |
| profiles        | perfiles de usuario    |
| accounts        | cuentas financieras    |
| account_members | miembros de cuentas    |
| wallets         | billeteras             |
| transactions    | transacciones          |
| budgets         | presupuestos           |
| allocations     | asignaciones de fondos |

---

**Fin del informe técnico del backend.**




# sql schema

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.account_members (
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_members_pkey PRIMARY KEY (account_id, user_id),
  CONSTRAINT account_members_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT account_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_id uuid,
  budget_id uuid,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT allocations_pkey PRIMARY KEY (id),
  CONSTRAINT allocations_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id),
  CONSTRAINT allocations_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id)
);
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid,
  name text NOT NULL,
  target numeric NOT NULL,
  icon text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_user_fk FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid,
  from_wallet uuid,
  to_wallet uuid,
  amount numeric NOT NULL,
  type text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_from_wallet_fkey FOREIGN KEY (from_wallet) REFERENCES public.wallets(id),
  CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT transactions_to_wallet_fkey FOREIGN KEY (to_wallet) REFERENCES public.wallets(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid,
  name text NOT NULL,
  icon text,
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);