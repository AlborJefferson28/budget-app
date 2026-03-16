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
